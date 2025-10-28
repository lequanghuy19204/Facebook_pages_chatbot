import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { Company, CompanyDocument } from '../schemas/company.schema';
import { User, UserDocument, UserRole } from '../schemas/user.schema';
import { FacebookPage, FacebookPageDocument } from '../schemas/facebook-page.schema';
import { MinioStorageService } from '../minio/minio-storage.service';
import {
  FacebookConnectDto,
  FacebookUserInfoDto,
  FacebookPageDto,
  FacebookPagesResponseDto,
  FacebookTokenExchangeDto,
  FacebookOAuthUrlDto,
  FacebookConnectionStatusDto,
  FacebookPageSyncResultDto
} from '../dto/facebook.dto';

@Injectable()
export class FacebookService {
  private readonly logger = new Logger(FacebookService.name);
  private readonly facebookApiVersion: string;
  private readonly facebookAppId: string;
  private readonly facebookAppSecret: string;
  private readonly facebookConfigId: string;
  private readonly facebookRedirectUri: string;
  private readonly facebookGraphUrl: string;
  private readonly facebookOAuthUrl: string;
  private readonly facebookTokenUrl: string;

  constructor(
    private configService: ConfigService,
    private minioStorageService: MinioStorageService,
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(FacebookPage.name) private facebookPageModel: Model<FacebookPageDocument>,
  ) {
    this.facebookApiVersion = this.configService.get<string>('FACEBOOK_API_VERSION', 'v23.0');
    this.facebookAppId = this.configService.get<string>('FACEBOOK_APP_ID') || '';
    this.facebookAppSecret = this.configService.get<string>('FACEBOOK_APP_SECRET') || '';
    this.facebookConfigId = this.configService.get<string>('FACEBOOK_CONFIG_ID') || '';
    this.facebookRedirectUri = this.configService.get<string>('FACEBOOK_REDIRECT_URI') || '';
    this.facebookGraphUrl = `https://graph.facebook.com/${this.facebookApiVersion}`;
    this.facebookOAuthUrl = `https://www.facebook.com/${this.facebookApiVersion}/dialog/oauth`;
    this.facebookTokenUrl = `${this.facebookGraphUrl}/oauth/access_token`;

    if (!this.facebookAppId || !this.facebookAppSecret || !this.facebookConfigId) {
      this.logger.error('Facebook configuration is missing. Please check environment variables.');
    }
  }

  /**
   * Generate OAuth URL for Facebook Login
   */
  generateOAuthUrl(): FacebookOAuthUrlDto {
    const state = crypto.randomBytes(32).toString('hex');
    const params = new URLSearchParams({
      client_id: this.facebookAppId,
      redirect_uri: this.facebookRedirectUri,
      config_id: this.facebookConfigId,
      response_type: 'code',
      state: state,
      scope: 'pages_show_list,pages_read_engagement,pages_messaging'
    });

    const oauthUrl = `${this.facebookOAuthUrl}?${params.toString()}`;

    this.logger.log(`Generated OAuth URL for state: ${state}`);
    
    return {
      oauth_url: oauthUrl,
      state: state
    };
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<FacebookTokenExchangeDto> {
    try {
      const params = new URLSearchParams({
        client_id: this.facebookAppId,
        client_secret: this.facebookAppSecret,
        code: code,
        redirect_uri: this.facebookRedirectUri
      });

      this.logger.log('Exchanging authorization code for access token...');

      const response = await fetch(this.facebookTokenUrl, {
        method: 'POST',
        body: params,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Token exchange failed: ${response.status} - ${errorText}`);
        throw new BadRequestException('Failed to exchange authorization code for access token');
      }

      const tokenData = await response.json();
      
      if (!tokenData.access_token) {
        this.logger.error('No access token in response:', tokenData);
        throw new BadRequestException('Invalid token response from Facebook');
      }

      this.logger.log('Successfully exchanged code for access token');
      return tokenData;

    } catch (error) {
      this.logger.error('Error exchanging code for token:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to exchange authorization code');
    }
  }

  /**
   * Get user information from Facebook
   */
  async getUserInfo(accessToken: string): Promise<FacebookUserInfoDto> {
    try {
      const params = new URLSearchParams({
        access_token: accessToken,
        fields: 'id,name,email,first_name,last_name,picture,locale'
      });

      const url = `${this.facebookGraphUrl}/me?${params.toString()}`;
      
      this.logger.log('Fetching user information from Facebook...');

      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Get user info failed: ${response.status} - ${errorText}`);
        throw new BadRequestException('Failed to get user information from Facebook');
      }

      const userInfo = await response.json();
      
      this.logger.log(`Successfully fetched user info for: ${userInfo.name} (${userInfo.id})`);
      return userInfo;

    } catch (error) {
      this.logger.error('Error getting user info:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to get user information');
    }
  }

  /**
   * Get list of Facebook pages
   */
  async getPages(accessToken: string): Promise<FacebookPagesResponseDto> {
    try {
      const params = new URLSearchParams({
        access_token: accessToken,
        fields: 'id,name,access_token,category,category_list,fan_count,about,tasks,picture.width(256).height(256){url}',
        limit: '100'
      });

      const url = `${this.facebookGraphUrl}/me/accounts?${params.toString()}`;
      
      this.logger.log('Fetching pages list from Facebook...');

      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Get pages failed: ${response.status} - ${errorText}`);
        throw new BadRequestException('Failed to get pages from Facebook');
      }

      const pagesData = await response.json();
      
      this.logger.log(`Successfully fetched ${pagesData.data?.length || 0} pages`);
      return pagesData;

    } catch (error) {
      this.logger.error('Error getting pages:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to get pages');
    }
  }

  /**
   * Debug access token
   */
  async debugToken(accessToken: string): Promise<any> {
    try {
      const appToken = `${this.facebookAppId}|${this.facebookAppSecret}`;
      const params = new URLSearchParams({
        input_token: accessToken,
        access_token: appToken
      });

      const url = `${this.facebookGraphUrl}/debug_token?${params.toString()}`;
      
      this.logger.log('Debugging access token...');

      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Debug token failed: ${response.status} - ${errorText}`);
        throw new BadRequestException('Failed to debug access token');
      }

      const debugData = await response.json();
      
      this.logger.log('Successfully debugged access token');
      return debugData;

    } catch (error) {
      this.logger.error('Error debugging token:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to debug token');
    }
  }

  /**
   * Connect Facebook account to company
   */
  async connectFacebook(userId: string, connectDto: FacebookConnectDto): Promise<FacebookConnectionStatusDto> {
    try {
      // Get user and validate admin role
      const user = await this.userModel.findOne({ user_id: userId }).exec();
      if (!user) {
        throw new BadRequestException('User not found');
      }

      if (!user.roles.includes(UserRole.ADMIN)) {
        throw new BadRequestException('Only admin can connect Facebook');
      }

      // Get company
      const company = await this.companyModel.findOne({ company_id: user.company_id }).exec();
      if (!company) {
        throw new BadRequestException('Company not found');
      }

      if (company.facebook?.is_connected) {
        throw new BadRequestException('Facebook is already connected to this company');
      }

      this.logger.log(`Connecting Facebook for company: ${company.company_name} by admin: ${user.full_name}`);

      // Exchange code for token
      const tokenData = await this.exchangeCodeForToken(connectDto.code);
      
      // Get user info
      const userInfo = await this.getUserInfo(tokenData.access_token);
      
      // Update company with Facebook connection info
      const updateData = {
        'facebook.is_connected': true,
        'facebook.connected_by': userId,
        'facebook.connected_at': new Date(),
        'facebook.access_token': tokenData.access_token,
        'facebook.token_length': tokenData.access_token.length,
        'facebook.facebook_user_id': userInfo.id,
        'facebook.facebook_user_name': userInfo.name,
        'facebook.sync_status': 'syncing',
        'facebook.error_message': null
      };

      await this.companyModel.updateOne(
        { company_id: user.company_id },
        { $set: updateData }
      ).exec();

      this.logger.log('Successfully updated company with Facebook connection info');

      // Sync Facebook pages
      const syncResult = await this.syncFacebookPages(userId, tokenData.access_token);

      // Update sync status and pages count
      await this.companyModel.updateOne(
        { company_id: user.company_id },
        { 
          $set: { 
            'facebook.sync_status': syncResult.sync_status,
            'facebook.pages_count': syncResult.pages_synced,
            'facebook.last_sync': new Date(),
            'facebook.error_message': syncResult.error_message || null
          }
        }
      ).exec();

      this.logger.log(`Facebook connection completed. Synced ${syncResult.pages_synced} pages`);

      return {
        is_connected: true,
        connected_by: userId,
        connected_at: new Date(),
        facebook_user_name: userInfo.name,
        pages_count: syncResult.pages_synced,
        last_sync: new Date(),
        sync_status: syncResult.sync_status,
        error_message: syncResult.error_message
      };

    } catch (error) {
      this.logger.error('Error connecting Facebook:', error);
      
      // Update company with error status if it exists
      try {
        const user = await this.userModel.findOne({ user_id: userId }).exec();
        if (user) {
          // Get current pages count (if any pages were successfully imported)
          const pagesCount = await this.facebookPageModel.countDocuments({ 
            company_id: user.company_id,
            is_active: true 
          });
          
          await this.companyModel.updateOne(
            { company_id: user.company_id },
            { 
              $set: { 
                'facebook.sync_status': 'error',
                'facebook.error_message': error.message,
                'facebook.last_sync': new Date(),
                'facebook.pages_count': pagesCount
              }
            }
          ).exec();
          
          this.logger.log(`Updated company with error status and pages_count: ${pagesCount}`);
        }
      } catch (updateError) {
        this.logger.error('Error updating company with error status:', updateError);
      }

      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to connect Facebook');
    }
  }

  /**
   * Sync Facebook pages to database
   */
  async syncFacebookPages(userId: string, accessToken: string): Promise<FacebookPageSyncResultDto> {
    try {
      const user = await this.userModel.findOne({ user_id: userId }).exec();
      if (!user) {
        throw new BadRequestException('User not found');
      }

      this.logger.log(`Syncing Facebook pages for company: ${user.company_id}`);

      // Get pages from Facebook
      const pagesResponse = await this.getPages(accessToken);
      const pages = pagesResponse.data || [];

      let syncedCount = 0;
      const failedPages: string[] = [];

      // Store existing page data for reuse
      const existingPages = await this.facebookPageModel
        .find({ company_id: user.company_id })
        .exec();
      
      // Create a map of Facebook page IDs to their MinIO data for quick lookup
      const existingPageMap = new Map();
      existingPages.forEach(page => {
        if (page.facebook_page_id && page.picture_key && page.picture_url) {
          existingPageMap.set(page.facebook_page_id, {
            picture: page.picture,
            picture_url: page.picture_url,
            picture_key: page.picture_key
          });
        }
      });
      
      // Track Facebook page IDs from API to identify deleted pages later
      const facebookPageIdsFromApi = pages.map(p => p.id);

      // Step 1: Prepare all page data without image processing
      const pageDataList = pages.map(page => {
        // Check if page already exists to preserve page_id
        const existingPage = existingPages.find(p => p.facebook_page_id === page.id);
        const pageId = existingPage?.page_id || `page_${uuidv4().replace(/-/g, '').substring(0, 12)}`;
        
        return {
          pageId,
          page,
          pageData: {
            page_id: pageId,
            company_id: user.company_id,
            facebook_page_id: page.id,
            name: page.name,
            category: page.category,
            category_list: page.category_list,
            access_token: page.access_token,
            is_active: true,
            last_sync: new Date(),
            sync_status: 'success',
            imported_by: userId,
            imported_at: existingPage?.imported_at || new Date(),
            tasks: page.tasks,
            picture: page.picture?.data?.url || null,
            picture_url: null as string | null,
            picture_key: null as string | null
          }
        };
      });

      // Step 2: Process images in parallel for all pages that have pictures
      // This is a major performance improvement - instead of processing images sequentially,
      // we now download and upload all images in parallel, significantly reducing total sync time
      const imageProcessingPromises = pageDataList
        .filter(item => item.page.picture?.data?.url)
        .map(async (item) => {
          try {
            const pictureUrl = item.page.picture?.data?.url;
            if (!pictureUrl) return { pageId: item.pageId, success: false, reused: false };

            // Check if we already have this image in MinIO
            const existingPageData = existingPageMap.get(item.page.id);
            if (existingPageData && existingPageData.picture === pictureUrl) {
              // Reuse existing MinIO image
              item.pageData.picture_url = existingPageData.picture_url;
              item.pageData.picture_key = existingPageData.picture_key;
              this.logger.log(`Reusing existing profile picture for ${item.page.name} from MinIO`);
              return { pageId: item.pageId, success: true, reused: true };
            } else {
              // Download and upload to MinIO in parallel
              const pictureResult = await this.downloadAndUploadPageProfilePicture(
                item.page.id,
                pictureUrl
              );
              
              if (pictureResult) {
                item.pageData.picture_url = pictureResult.minioUrl;
                item.pageData.picture_key = pictureResult.minioKey;
                this.logger.log(`Stored page profile picture for ${item.page.name} in MinIO`);
                return { pageId: item.pageId, success: true, reused: false };
              } else {
                this.logger.warn(`Failed to process profile picture for ${item.page.name}`);
                return { pageId: item.pageId, success: false, reused: false };
              }
            }
          } catch (error) {
            this.logger.error(`Error processing image for page ${item.page.name}:`, error);
            return { pageId: item.pageId, success: false, error: error.message, reused: false };
          }
        });

      // Execute image processing in parallel
      this.logger.log(`Starting parallel image processing for ${imageProcessingPromises.length} pages with pictures...`);
      const imageResults = await Promise.allSettled(imageProcessingPromises);

      // Log image processing results
      let imageSuccessCount = 0;
      let imageReusedCount = 0;
      imageResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            imageSuccessCount++;
            if (result.value.reused) imageReusedCount++;
          }
        }
      });
      this.logger.log(`Image processing completed: ${imageSuccessCount} successful (${imageReusedCount} reused), ${imageResults.length - imageSuccessCount} failed`);

      // Step 3: Upsert all pages to database in parallel (update existing or insert new)
      const dbSavePromises = pageDataList.map(async (item) => {
        try {
          await this.facebookPageModel.updateOne(
            { 
              facebook_page_id: item.page.id,
              company_id: user.company_id 
            },
            { $set: item.pageData },
            { upsert: true }
          ).exec();
          this.logger.log(`Upserted page to database: ${item.page.name} (${item.page.id})`);
          return { success: true, page: item.page.name };
        } catch (saveError) {
          this.logger.error(`Failed to upsert page ${item.page.name} to database:`, saveError);
          return { success: false, page: item.page.name, error: saveError.message };
        }
      });

      // Execute database upserts in parallel
      this.logger.log(`Starting parallel database upserts for ${pageDataList.length} pages...`);
      const dbResults = await Promise.allSettled(dbSavePromises);
      
      // Process final results
      dbResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            syncedCount++;
          } else {
            failedPages.push(result.value.page);
          }
        } else {
          // Promise was rejected
          const pageName = pageDataList[index]?.page?.name || `Unknown Page ${index}`;
          failedPages.push(pageName);
          this.logger.error(`Database upsert promise rejected for page ${pageName}:`, result.reason);
        }
      });

      // Step 4: Delete pages that no longer exist on Facebook (were removed or access revoked)
      const deletedPages = await this.facebookPageModel.updateMany(
        {
          company_id: user.company_id,
          facebook_page_id: { $nin: facebookPageIdsFromApi }
        },
        {
          $set: { 
            is_active: false,
            sync_status: 'removed',
            last_sync: new Date()
          }
        }
      ).exec();

      if (deletedPages.modifiedCount > 0) {
        this.logger.log(`Marked ${deletedPages.modifiedCount} pages as inactive (no longer exist on Facebook)`);
      }

      const result: FacebookPageSyncResultDto = {
        pages_synced: syncedCount,
        pages_total: pages.length,
        sync_status: failedPages.length === 0 ? 'success' : (syncedCount > 0 ? 'partial' : 'error'),
        error_message: failedPages.length > 0 ? `Failed to sync: ${failedPages.join(', ')}` : undefined,
        failed_pages: failedPages.length > 0 ? failedPages : undefined
      };

      this.logger.log(`Sync completed: ${syncedCount}/${pages.length} pages synced, ${deletedPages.modifiedCount} pages marked as removed`);
      return result;

    } catch (error) {
      this.logger.error('Error syncing Facebook pages:', error);
      return {
        pages_synced: 0,
        pages_total: 0,
        sync_status: 'error',
        error_message: error.message
      };
    }
  }

  /**
   * Get Facebook connection status
   */
  async getConnectionStatus(userId: string): Promise<FacebookConnectionStatusDto> {
    try {
      const user = await this.userModel.findOne({ user_id: userId }).exec();
      if (!user) {
        throw new BadRequestException('User not found');
      }

      const company = await this.companyModel.findOne({ company_id: user.company_id }).exec();
      if (!company) {
        throw new BadRequestException('Company not found');
      }

      const facebook = company.facebook || {};

      return {
        is_connected: facebook.is_connected || false,
        connected_by: facebook.connected_by || undefined,
        connected_at: facebook.connected_at || undefined,
        facebook_user_name: facebook.facebook_user_name || undefined,
        pages_count: facebook.pages_count || 0,
        last_sync: facebook.last_sync || undefined,
        sync_status: facebook.sync_status || 'idle',
        error_message: facebook.error_message || undefined
      };

    } catch (error) {
      this.logger.error('Error getting connection status:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to get connection status');
    }
  }

  /**
   * Get Facebook pages for user
   */
  async getUserPages(userId: string): Promise<FacebookPage[]> {
    try {
      const user = await this.userModel.findOne({ user_id: userId }).exec();
      if (!user) {
        throw new BadRequestException('User not found');
      }

      let query: any = { 
        company_id: user.company_id, 
        is_active: true 
      };

      // If user is not admin, filter by facebook_pages_access
      if (!user.roles.includes(UserRole.ADMIN) && !user.roles.includes(UserRole.MANAGE_USER)) {
        query.page_id = { $in: user.facebook_pages_access };
      }

      const pages = await this.facebookPageModel
        .find(query)
        .sort({ name: 1 })
        .exec();

      this.logger.log(`Retrieved ${pages.length} pages for user: ${user.full_name}`);
      return pages;

    } catch (error) {
      this.logger.error('Error getting user pages:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to get pages');
    }
  }

  /**
   * Disconnect Facebook from company
   */
  async disconnectFacebook(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await this.userModel.findOne({ user_id: userId }).exec();
      if (!user) {
        throw new BadRequestException('User not found');
      }

      if (!user.roles.includes(UserRole.ADMIN)) {
        throw new BadRequestException('Only admin can disconnect Facebook');
      }

      this.logger.log(`Disconnecting Facebook for company: ${user.company_id} by admin: ${user.full_name}`);

      // First get all pages to retrieve their MinIO keys
      const pages = await this.facebookPageModel.find({ company_id: user.company_id }).exec();
      
      // Delete profile pictures from MinIO
      let deletedPicturesCount = 0;
      for (const page of pages) {
        if (page.picture_key) {
          try {
            await this.minioStorageService.deleteFile(page.picture_key);
            deletedPicturesCount++;
            this.logger.log(`Deleted profile picture from MinIO: ${page.picture_key}`);
          } catch (error) {
            this.logger.error(`Failed to delete profile picture for page ${page.name}: ${error.message}`);
          }
        }
      }
      
      this.logger.log(`Deleted ${deletedPicturesCount} profile pictures from MinIO`);

      // Delete all Facebook pages for this company
      const deletedPages = await this.facebookPageModel.deleteMany({ 
        company_id: user.company_id 
      }).exec();

      this.logger.log(`Deleted ${deletedPages.deletedCount} Facebook pages`);

      // Reset Facebook info in company
      const resetData = {
        'facebook.is_connected': false,
        'facebook.connected_by': null,
        'facebook.connected_at': null,
        'facebook.access_token': null,
        'facebook.token_length': null,
        'facebook.facebook_user_id': null,
        'facebook.facebook_user_name': null,
        'facebook.last_sync': null,
        'facebook.sync_status': 'idle',
        'facebook.error_message': null,
        'facebook.pages_count': 0 // Explicitly reset pages count to 0
      };

      await this.companyModel.updateOne(
        { company_id: user.company_id },
        { $set: resetData }
      ).exec();

      // Clear facebook_pages_access for all users in the company
      await this.userModel.updateMany(
        { company_id: user.company_id },
        { $set: { facebook_pages_access: [] } }
      ).exec();

      this.logger.log('Successfully disconnected Facebook');

      return {
        success: true,
        message: 'Facebook has been disconnected successfully'
      };

    } catch (error) {
      this.logger.error('Error disconnecting Facebook:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to disconnect Facebook');
    }
  }

  /**
   * Manually sync Facebook pages
   */
  async manualSync(userId: string): Promise<FacebookPageSyncResultDto> {
    try {
      const user = await this.userModel.findOne({ user_id: userId }).exec();
      if (!user) {
        throw new BadRequestException('User not found');
      }

      if (!user.roles.includes(UserRole.ADMIN)) {
        throw new BadRequestException('Only admin can sync Facebook pages');
      }

      const company = await this.companyModel.findOne({ company_id: user.company_id }).exec();
      if (!company || !company.facebook?.is_connected || !company.facebook?.access_token) {
        throw new BadRequestException('Facebook is not connected or access token is missing');
      }

      this.logger.log(`Manual sync requested by admin: ${user.full_name}`);

      // Update sync status to syncing
      await this.companyModel.updateOne(
        { company_id: user.company_id },
        { $set: { 'facebook.sync_status': 'syncing' } }
      ).exec();

      // Perform sync
      const syncResult = await this.syncFacebookPages(userId, company.facebook.access_token);

      // Update sync status and results
      await this.companyModel.updateOne(
        { company_id: user.company_id },
        { 
          $set: { 
            'facebook.sync_status': syncResult.sync_status,
            'facebook.pages_count': syncResult.pages_synced,
            'facebook.last_sync': new Date(),
            'facebook.error_message': syncResult.error_message || null
          }
        }
      ).exec();

      return syncResult;

    } catch (error) {
      this.logger.error('Error in manual sync:', error);
      
      // Update error status
      try {
        const user = await this.userModel.findOne({ user_id: userId }).exec();
        if (user) {
          // Get current pages count
          const pagesCount = await this.facebookPageModel.countDocuments({ 
            company_id: user.company_id,
            is_active: true 
          });
          
          await this.companyModel.updateOne(
            { company_id: user.company_id },
            { 
              $set: { 
                'facebook.sync_status': 'error',
                'facebook.error_message': error.message,
                'facebook.last_sync': new Date(),
                'facebook.pages_count': pagesCount
              }
            }
          ).exec();
          
          this.logger.log(`Updated company with error status and pages_count: ${pagesCount}`);
        }
      } catch (updateError) {
        this.logger.error('Error updating sync error status:', updateError);
      }

      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to sync pages');
    }
  }

  /**
   * Download and upload Facebook page profile picture to MinIO with retry logic
   */
  async downloadAndUploadPageProfilePicture(pageId: string, pictureUrl: string): Promise<{
    minioKey: string;
    minioUrl: string;
  } | null> {
    const maxRetries = 3;
    const timeoutMs = 15000; // 15 seconds timeout

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!pictureUrl) {
          return null;
        }

        // Note: We don't check existing pages here anymore since it's done at the caller level
        // for better performance in parallel processing

        this.logger.log(`Downloading profile picture for page ${pageId} (attempt ${attempt}): ${pictureUrl}`);
        
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        
        try {
          // Download the image with timeout
          const response = await fetch(pictureUrl, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; FacebookPageChatbot/1.0)'
            }
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status} ${response.statusText}`);
          }
          
          const imageBuffer = Buffer.from(await response.arrayBuffer());
          const contentType = response.headers.get('content-type') || 'image/jpeg';
          
          // Validate image size (max 10MB)
          if (imageBuffer.length > 10 * 1024 * 1024) {
            throw new Error(`Image too large: ${imageBuffer.length} bytes`);
          }
          
          // Generate a unique key for MinIO
          const fileExtension = contentType.includes('png') ? '.png' : 
                               contentType.includes('gif') ? '.gif' : 
                               contentType.includes('svg') ? '.svg' : '.jpg';
          
          // Use a consistent naming scheme without timestamp to avoid duplicates
          const fileName = `fb_page_${pageId}${fileExtension}`;
          const key = `facebook/page_images/${fileName}`;
          
          // Upload to MinIO
          const uploadResult = await this.minioStorageService.uploadBuffer(
            imageBuffer,
            key,
            contentType
          );
          
          this.logger.log(`Successfully uploaded profile picture to MinIO: ${key} (${imageBuffer.length} bytes)`);
          
          return {
            minioKey: uploadResult.key,
            minioUrl: uploadResult.publicUrl
          };
          
        } finally {
          clearTimeout(timeoutId);
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        if (attempt === maxRetries) {
          this.logger.error(`Failed to download/upload profile picture for page ${pageId} after ${maxRetries} attempts: ${errorMessage}`);
          return null;
        } else {
          this.logger.warn(`Attempt ${attempt} failed for page ${pageId}: ${errorMessage}. Retrying...`);
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        }
      }
    }
    
    return null;
  }

  /**
   * Execute promises with controlled concurrency
   * This helps prevent overwhelming the server or external APIs with too many parallel requests
   */
  private async executeWithConcurrencyLimit<T>(
    tasks: (() => Promise<T>)[],
    limit: number = 5
  ): Promise<PromiseSettledResult<T>[]> {
    const results: PromiseSettledResult<T>[] = [];
    
    for (let i = 0; i < tasks.length; i += limit) {
      const batch = tasks.slice(i, i + limit);
      const batchPromises = batch.map(task => task());
      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults);
      
      // Log progress
      const completed = Math.min(i + limit, tasks.length);
      this.logger.log(`Completed ${completed}/${tasks.length} parallel operations`);
    }
    
    return results;
  }
}
