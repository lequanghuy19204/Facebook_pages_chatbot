import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { Company, CompanyDocument } from '../schemas/company.schema';
import { User, UserDocument, UserRole } from '../schemas/user.schema';
import { FacebookPage, FacebookPageDocument } from '../schemas/facebook-page.schema';
import { CloudflareR2Service } from '../cloudflare/cloudflare-r2.service';
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
    private cloudflareR2Service: CloudflareR2Service,
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
        fields: 'id,name,access_token,category,category_list,fan_count,about,tasks,picture.width(512).height(512){url}',
        limit: '50'
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
      
      // Create a map of Facebook page IDs to their Cloudflare data for quick lookup
      const existingPageMap = new Map();
      existingPages.forEach(page => {
        if (page.facebook_page_id && page.picture_cloudflare_key && page.picture_url) {
          existingPageMap.set(page.facebook_page_id, {
            picture_url: page.picture_url,
            picture_cloudflare_key: page.picture_cloudflare_key,
            picture_cloudflare_url: page.picture_cloudflare_url
          });
        }
      });
      
      // Clear existing pages for this company
      await this.facebookPageModel.deleteMany({ company_id: user.company_id }).exec();
      this.logger.log(`Cleared existing pages for company: ${user.company_id}`);

      // Sync each page
      for (const page of pages) {
        try {
          const pageId = `page_${uuidv4().replace(/-/g, '').substring(0, 12)}`;
          
          // Prepare page data
          const pageData: any = {
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
            imported_at: new Date(),
            tasks: page.tasks
          };
          
          // Handle profile picture if available
          if (page.picture?.data?.url) {
            // Store original Facebook URL
            pageData.picture_url = page.picture.data.url;
            
            // Check if we already have this image in Cloudflare
            const existingPageData = existingPageMap.get(page.id);
            if (existingPageData && existingPageData.picture_url === page.picture.data.url) {
              // Reuse existing Cloudflare image
              pageData.picture_cloudflare_key = existingPageData.picture_cloudflare_key;
              pageData.picture_cloudflare_url = existingPageData.picture_cloudflare_url;
              this.logger.log(`Reusing existing profile picture for ${page.name} from Cloudflare R2`);
            } else {
              // Download and upload to Cloudflare R2
              const pictureResult = await this.downloadAndUploadPageProfilePicture(
                page.id,
                page.picture.data.url
              );
              
              if (pictureResult) {
                pageData.picture_cloudflare_key = pictureResult.cloudflareKey;
                pageData.picture_cloudflare_url = pictureResult.cloudflareUrl;
                this.logger.log(`Stored page profile picture for ${page.name} in Cloudflare R2`);
              }
            }
          }
          
          const facebookPage = new this.facebookPageModel(pageData);
          await facebookPage.save();
          syncedCount++;
          
          this.logger.log(`Synced page: ${page.name} (${page.id})`);

        } catch (pageError) {
          this.logger.error(`Failed to sync page ${page.name}:`, pageError);
          failedPages.push(page.name);
        }
      }

      const result: FacebookPageSyncResultDto = {
        pages_synced: syncedCount,
        pages_total: pages.length,
        sync_status: failedPages.length === 0 ? 'success' : (syncedCount > 0 ? 'partial' : 'error'),
        error_message: failedPages.length > 0 ? `Failed to sync: ${failedPages.join(', ')}` : undefined,
        failed_pages: failedPages.length > 0 ? failedPages : undefined
      };

      this.logger.log(`Sync completed: ${syncedCount}/${pages.length} pages synced`);
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

      // First get all pages to retrieve their Cloudflare keys
      const pages = await this.facebookPageModel.find({ company_id: user.company_id }).exec();
      
      // Delete profile pictures from Cloudflare R2
      let deletedPicturesCount = 0;
      for (const page of pages) {
        if (page.picture_cloudflare_key) {
          try {
            await this.cloudflareR2Service.deleteFile(page.picture_cloudflare_key);
            deletedPicturesCount++;
            this.logger.log(`Deleted profile picture from Cloudflare R2: ${page.picture_cloudflare_key}`);
          } catch (error) {
            this.logger.error(`Failed to delete profile picture for page ${page.name}: ${error.message}`);
          }
        }
      }
      
      this.logger.log(`Deleted ${deletedPicturesCount} profile pictures from Cloudflare R2`);

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
   * Download and upload Facebook page profile picture to Cloudflare R2
   */
  async downloadAndUploadPageProfilePicture(pageId: string, pictureUrl: string): Promise<{
    cloudflareKey: string;
    cloudflareUrl: string;
  } | null> {
    try {
      if (!pictureUrl) {
        return null;
      }

      // Check if we already have a profile picture for this page in our database
      const existingPage = await this.facebookPageModel.findOne({ 
        facebook_page_id: pageId,
        picture_cloudflare_key: { $exists: true, $ne: null }
      }).exec();

      // If we already have a profile picture and it's the same URL, reuse it
      if (existingPage?.picture_url === pictureUrl && existingPage?.picture_cloudflare_key) {
        this.logger.log(`Reusing existing profile picture for page ${pageId}: ${existingPage.picture_cloudflare_key}`);
        return {
          cloudflareKey: existingPage.picture_cloudflare_key,
          cloudflareUrl: existingPage.picture_cloudflare_url || this.cloudflareR2Service.getPublicUrl(existingPage.picture_cloudflare_key)
        };
      }

      this.logger.log(`Downloading profile picture for page ${pageId}: ${pictureUrl}`);
      
      // Download the image
      const response = await fetch(pictureUrl);
      if (!response.ok) {
        throw new Error(`Failed to download profile picture: ${response.status} ${response.statusText}`);
      }
      
      const imageBuffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      
      // Generate a unique key for Cloudflare R2
      const fileExtension = contentType.includes('png') ? '.png' : 
                           contentType.includes('gif') ? '.gif' : 
                           contentType.includes('svg') ? '.svg' : '.jpg';
      
      // Use a consistent naming scheme without timestamp to avoid duplicates
      const fileName = `fb_page_${pageId}${fileExtension}`;
      const key = `facebook/page_images/${fileName}`;
      
      // Upload to Cloudflare R2
      const uploadResult = await this.cloudflareR2Service.uploadBuffer(
        imageBuffer,
        key,
        contentType
      );
      
      this.logger.log(`Successfully uploaded profile picture to Cloudflare R2: ${key}`);
      
      return {
        cloudflareKey: uploadResult.key,
        cloudflareUrl: uploadResult.publicUrl
      };
      
    } catch (error) {
      this.logger.error(`Error downloading/uploading profile picture for page ${pageId}:`, error);
      return null;
    }
  }
}
