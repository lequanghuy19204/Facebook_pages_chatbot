/**
 * ===== BACKGROUND PROCESSING HELPER METHODS =====
 * 
 * Các methods này được thiết kế để chạy trong background,
 * không chặn webhook processing để đảm bảo response time nhanh.
 */

import { Logger } from '@nestjs/common';
import { Model } from 'mongoose';
import { FacebookCustomerDocument } from '../schemas/facebook-customer.schema';
import { FacebookConversationDocument } from '../schemas/facebook-conversation.schema';
import { MinioStorageService } from '../minio/minio-storage.service';

const logger = new Logger('FacebookMessagingBackgroundHelper');

/**
 * ✅ Upload customer avatar trong background (không chặn webhook)
 */
export function uploadCustomerAvatarInBackground(
  customer: FacebookCustomerDocument,
  facebookUserId: string,
  facebookPageId: string,
  companyId: string,
  customerModel: Model<FacebookCustomerDocument>,
  conversationModel: Model<FacebookConversationDocument>,
  minioService: MinioStorageService,
  getFacebookUserInfoFn: (userId: string, pageId: string) => Promise<any>,
  customerCache: Map<string, { customer: FacebookCustomerDocument; timestamp: number }>,
): void {
  setImmediate(async () => {
    try {
      const facebookUserInfo = await getFacebookUserInfoFn(facebookUserId, facebookPageId);
      
      if (facebookUserInfo.profile_pic) {
        const folder = minioService.generateChatFolder();
        const uploadResult = await minioService.downloadAndUploadFromUrl(
          facebookUserInfo.profile_pic,
          folder
        );
        
        if (uploadResult) {
          await customerModel.updateOne(
            { customer_id: customer.customer_id },
            {
              $set: {
                profile_pic: facebookUserInfo.profile_pic,
                profile_pic_url: uploadResult.publicUrl,
                profile_pic_key: uploadResult.key,
                updated_at: new Date(),
              }
            }
          );
          
          logger.log(`✅ [Background] Uploaded avatar for customer ${customer.customer_id}`);
          
          // Sync sang conversations
          await syncCustomerInfoToConversations(
            customer.customer_id,
            companyId,
            {
              ...customer.toObject(),
              profile_pic: facebookUserInfo.profile_pic,
              profile_pic_url: uploadResult.publicUrl,
              profile_pic_key: uploadResult.key,
            } as any,
            conversationModel
          );
          
          // Invalidate cache để lần sau lấy data mới
          const cacheKey = `${companyId}_${facebookPageId}_${facebookUserId}`;
          customerCache.delete(cacheKey);
        }
      } else {
        logger.log(`[Background] No profile picture available for customer ${customer.customer_id}`);
      }
    } catch (error) {
      logger.error(`❌ [Background] Failed to upload avatar for customer ${customer.customer_id}:`, error.message);
    }
  });
}

/**
 * ✅ Cập nhật thông tin customer từ Facebook API trong background
 */
export function updateCustomerInfoInBackground(
  customer: FacebookCustomerDocument,
  facebookUserId: string,
  facebookPageId: string,
  companyId: string,
  customerModel: Model<FacebookCustomerDocument>,
  conversationModel: Model<FacebookConversationDocument>,
  minioService: MinioStorageService,
  getFacebookUserInfoFn: (userId: string, pageId: string) => Promise<any>,
  customerCache: Map<string, { customer: FacebookCustomerDocument; timestamp: number }>,
): void {
  setImmediate(async () => {
    try {
      const facebookUserInfo = await getFacebookUserInfoFn(facebookUserId, facebookPageId);
      
      const updateData: any = {
        name: facebookUserInfo.name || customer.name,
        first_name: facebookUserInfo.first_name,
        last_name: facebookUserInfo.last_name,
        locale: facebookUserInfo.locale,
        timezone: facebookUserInfo.timezone,
        updated_at: new Date(),
      };
      
      // Upload avatar nếu có
      if (facebookUserInfo.profile_pic) {
        const folder = minioService.generateChatFolder();
        const uploadResult = await minioService.downloadAndUploadFromUrl(
          facebookUserInfo.profile_pic,
          folder
        );
        
        if (uploadResult) {
          updateData.profile_pic = facebookUserInfo.profile_pic;
          updateData.profile_pic_url = uploadResult.publicUrl;
          updateData.profile_pic_key = uploadResult.key;
          logger.log(`✅ [Background] Uploaded avatar while updating customer info ${customer.customer_id}`);
        }
      }
      
      await customerModel.updateOne(
        { customer_id: customer.customer_id },
        { $set: updateData }
      );
      
      logger.log(`✅ [Background] Updated info for customer ${customer.customer_id}: ${facebookUserInfo.name || 'Unknown'}`);
      
      // Sync sang conversations
      await syncCustomerInfoToConversations(
        customer.customer_id,
        companyId,
        {
          ...customer.toObject(),
          ...updateData,
        } as any,
        conversationModel
      );
      
      // Invalidate cache để lần sau lấy data mới
      const cacheKey = `${companyId}_${facebookPageId}_${facebookUserId}`;
      customerCache.delete(cacheKey);
    } catch (error) {
      logger.error(`❌ [Background] Failed to update customer info ${customer.customer_id}:`, error.message);
    }
  });
}

/**
 * ✅ Sync customer info sang tất cả conversations
 */
async function syncCustomerInfoToConversations(
  customerId: string,
  companyId: string,
  customer: any,
  conversationModel: Model<FacebookConversationDocument>,
): Promise<void> {
  try {
    const updateFields: any = {
      customer_name: customer.name,
      customer_first_name: customer.first_name,
      customer_profile_pic: customer.profile_pic,
      customer_profile_pic_url: customer.profile_pic_url,
      customer_profile_pic_key: customer.profile_pic_key,
      customer_phone: customer.phone,
      updated_at: new Date(),
    };

    const updateResult = await conversationModel.updateMany(
      {
        company_id: companyId,
        customer_id: customerId,
      },
      { $set: updateFields }
    );

    logger.log(
      `Synced customer info to ${updateResult.modifiedCount} conversations for customer: ${customerId}`
    );
  } catch (error) {
    logger.error('Failed to sync customer info to conversations:', error);
  }
}
