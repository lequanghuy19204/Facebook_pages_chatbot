import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

import { AIChatbotSettings, AIChatbotSettingsDocument } from '../schemas/ai-chatbot-settings.schema';
import { FacebookConversation, FacebookConversationDocument } from '../schemas/facebook-conversation.schema';
import { FacebookCustomer, FacebookCustomerDocument } from '../schemas/facebook-customer.schema';
import { FacebookMessagingService } from './facebook-messaging.service';

interface PendingWebhook {
  companyId: string;
  conversationId: string;
  facebookPageId: string;
  customerId: string;
  timeout: NodeJS.Timeout;
}

interface N8nChatbotResponse {
  success: boolean;
  conversation_id: string;
  customer_id: string;
  response: {
    answer: string;
    images?: string[];
    has_images: boolean;
    extracted_customer_info?: {
      purchased_products?: Array<{
        product_id: string | null;
        product_name: string;
        quantity: number;
        purchase_date: string;
        notes: string | null;
        images: string[];
      }>;
      address?: string | null;
      customer_notes?: string | null;
      height?: number | null;
      phone?: string | null;
      weight?: number | null;
    };
  }[];
  timestamp: string;
}

@Injectable()
export class ChatbotWebhookHandlerService {
  private readonly logger = new Logger(ChatbotWebhookHandlerService.name);
  private readonly pendingWebhooks = new Map<string, PendingWebhook>();

  constructor(
    @InjectModel(AIChatbotSettings.name)
    private readonly aiSettingsModel: Model<AIChatbotSettingsDocument>,
    
    @InjectModel(FacebookConversation.name)
    private readonly conversationModel: Model<FacebookConversationDocument>,
    
    @InjectModel(FacebookCustomer.name)
    private readonly customerModel: Model<FacebookCustomerDocument>,
    
    @Inject(forwardRef(() => FacebookMessagingService))
    private readonly messagingService: FacebookMessagingService,
    
    private readonly configService: ConfigService,
  ) {}

  /**
   * Schedule webhook call với debounce mechanism
   * Nếu có tin nhắn mới trong khoảng response_delay → reset lại timer
   */
  async scheduleWebhookCall(
    companyId: string,
    conversationId: string,
    facebookPageId: string,
    customerId: string,
  ): Promise<void> {
    try {
      // Kiểm tra conversation có được phép chatbot xử lý không
      const conversation = await this.conversationModel.findOne({
        conversation_id: conversationId,
        company_id: companyId,
      });

      if (!conversation) {
        this.logger.warn(`Conversation not found: ${conversationId}`);
        return;
      }

      // CHỈ xử lý khi current_handler = "chatbot" và status = "open"
      if (conversation.current_handler !== 'chatbot' || conversation.status !== 'open') {
        this.logger.log(
          `Skipping webhook for conversation ${conversationId}: handler=${conversation.current_handler}, status=${conversation.status}`
        );
        return;
      }

      // Lấy AI settings
      const aiSettings = await this.aiSettingsModel.findOne({
        company_id: companyId,
      });

      if (!aiSettings) {
        this.logger.warn(`AI settings not found for company: ${companyId}`);
        return;
      }

      // Kiểm tra chatbot có active không
      if (!aiSettings.is_active) {
        this.logger.log(`Chatbot is inactive for company: ${companyId}`);
        return;
      }

      // Kiểm tra page có trong enabled_facebook_page_ids không
      if (!aiSettings.enabled_facebook_page_ids.includes(facebookPageId)) {
        this.logger.log(
          `Page ${facebookPageId} is not enabled for chatbot in company ${companyId}`
        );
        return;
      }

      // Lấy response_delay (giây) - mặc định 2 giây
      const delaySeconds = aiSettings.response_delay || 2;
      const delayMs = delaySeconds * 1000;

      // Key để track pending webhook
      const webhookKey = conversationId;

      // Nếu đã có pending webhook → hủy bỏ và tạo mới (debounce)
      if (this.pendingWebhooks.has(webhookKey)) {
        const existingWebhook = this.pendingWebhooks.get(webhookKey)!;
        clearTimeout(existingWebhook.timeout);
        this.logger.log(
          `Reset timer for conversation ${conversationId} (debounce active)`
        );
      }

      // Tạo timeout mới
      const timeout = setTimeout(async () => {
        await this.executeWebhookCall(
          companyId,
          conversationId,
          facebookPageId,
          customerId
        );
        
        // Xóa khỏi map sau khi thực hiện
        this.pendingWebhooks.delete(webhookKey);
      }, delayMs);

      // Lưu vào map
      this.pendingWebhooks.set(webhookKey, {
        companyId,
        conversationId,
        facebookPageId,
        customerId,
        timeout,
      });

      this.logger.log(
        `Scheduled webhook for conversation ${conversationId} in ${delaySeconds}s`
      );
    } catch (error) {
      this.logger.error('Error scheduling webhook call:', error);
    }
  }

  /**
   * Thực hiện gọi webhook n8n
   */
  private async executeWebhookCall(
    companyId: string,
    conversationId: string,
    facebookPageId: string,
    customerId: string,
  ): Promise<void> {
    try {
      const n8nWebhookUrl = this.configService.get<string>('N8N_CHATBOT_WEBHOOK_URL') || 
        'https://n8n.ipasearchimage.id.vn/webhook-test/chatbot-handle';

      this.logger.log(`Calling n8n webhook for conversation: ${conversationId}`);

      const payload = {
        company_id: companyId,
        conversation_id: conversationId,
        facebook_page_id: facebookPageId,
        customer_id: customerId,
      };

      const response = await axios.post<N8nChatbotResponse>(n8nWebhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 seconds timeout
      });

      this.logger.log(
        `Webhook call successful for conversation ${conversationId}: ${response.status}`
      );

      // Log response data để debug
      this.logger.log(
        `N8N Response data for conversation ${conversationId}:`,
        JSON.stringify(response.data, null, 2)
      );

      // Xử lý response từ n8n và gửi tin nhắn lại cho khách hàng
      if (response.data && response.data.success) {
        this.logger.log(
          `Processing n8n response for conversation ${conversationId}`
        );
        
        await this.processN8nResponse(
          response.data,
          companyId,
          conversationId,
          facebookPageId,
          customerId
        );
      } else {
        this.logger.warn(
          `No valid response from n8n for conversation ${conversationId}. Response: ${JSON.stringify(response.data)}`
        );
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error(
          `Webhook call failed for conversation ${conversationId}: ${error.message}`,
          error.response?.data
        );
      } else {
        this.logger.error(
          `Webhook call error for conversation ${conversationId}:`,
          error
        );
      }
    }
  }

  /**
   * Xử lý response từ n8n và gửi tin nhắn cho khách hàng
   */
  private async processN8nResponse(
    n8nResponse: N8nChatbotResponse,
    companyId: string,
    conversationId: string,
    facebookPageId: string,
    customerId: string,
  ): Promise<void> {
    try {
      this.logger.log(
        `[processN8nResponse] Starting to process n8n response for conversation: ${conversationId}`
      );
      this.logger.log(
        `[processN8nResponse] Response structure: success=${n8nResponse.success}, response.length=${n8nResponse.response?.length}`
      );

      if (!n8nResponse.success || !n8nResponse.response || n8nResponse.response.length === 0) {
        this.logger.warn(`No response from n8n for conversation: ${conversationId}`);
        return;
      }

      // Lấy thông tin customer để có facebook_user_id
      const customer = await this.customerModel.findOne({
        customer_id: customerId,
        company_id: companyId,
      });

      if (!customer) {
        this.logger.error(`Customer not found: ${customerId}`);
        return;
      }

      this.logger.log(
        `[processN8nResponse] Found customer: ${customer.name} (${customer.facebook_user_id})`
      );

      // Xử lý từng response (thường chỉ có 1)
      for (const responseItem of n8nResponse.response) {
        const { answer, images, has_images, extracted_customer_info } = responseItem;

        this.logger.log(
          `[processN8nResponse] Processing response item: answer_length=${answer?.length}, has_images=${has_images}, images_count=${images?.length || 0}`
        );

        // Import FacebookMessagingService để gửi tin nhắn
        // Đã được inject trong constructor

        // Chuẩn bị attachments nếu có images
        const attachments = has_images && images && images.length > 0
          ? images.map(imageUrl => ({
              type: 'image',
              facebook_url: imageUrl,
              minio_url: imageUrl, // Đã là URL từ MinIO
              minio_key: this.extractMinioKeyFromUrl(imageUrl),
              filename: this.extractFilenameFromUrl(imageUrl),
            }))
          : undefined;

        // Gửi tin nhắn qua Facebook
        const message = {
          text: answer,
          attachments: attachments,
          senderType: 'chatbot' as const,
          senderId: 'chatbot',
          senderName: 'AI Chatbot',
        };

        this.logger.log(
          `Sending chatbot response to customer ${customerId}: text=${answer.substring(0, 50)}..., images=${images?.length || 0}`
        );

        this.logger.log(
          `[processN8nResponse] About to call sendMessageToFacebook with pageId=${facebookPageId}, userId=${customer.facebook_user_id}`
        );

        await this.messagingService.sendMessageToFacebook(
          facebookPageId,
          customer.facebook_user_id,
          message
        );

        this.logger.log(
          `[processN8nResponse] Message sent to Facebook successfully`
        );

        // Lưu tin nhắn vào DB
        this.logger.log(
          `[processN8nResponse] Saving chatbot message to database...`
        );

        await this.messagingService.createMessage(
          companyId,
          facebookPageId,
          customerId,
          conversationId,
          {
            messageType: attachments ? 'image' : 'text',
            text: answer,
            attachments: attachments,
            senderType: 'chatbot',
            senderId: 'chatbot',
            senderName: 'AI Chatbot',
            sentAt: new Date(),
          }
        );

        this.logger.log(
          `[processN8nResponse] Message saved to database successfully`
        );

        // Cập nhật thông tin customer nếu có extracted_customer_info
        if (extracted_customer_info) {
          await this.updateCustomerInfo(customerId, companyId, extracted_customer_info);
        }

        this.logger.log(`✅ Chatbot response sent successfully for conversation: ${conversationId}`);
      }
    } catch (error) {
      this.logger.error(
        `[processN8nResponse] Failed to process n8n response for conversation ${conversationId}:`,
        error.stack || error
      );
    }
  }

  /**
   * Cập nhật thông tin customer từ extracted info
   */
  private async updateCustomerInfo(
    customerId: string,
    companyId: string,
    extractedInfo: N8nChatbotResponse['response'][0]['extracted_customer_info'],
  ): Promise<void> {
    if (!extractedInfo) return;

    try {
      const updateData: any = {};

      if (extractedInfo.phone) {
        updateData.phone = extractedInfo.phone;
      }

      if (extractedInfo.address) {
        updateData.address = extractedInfo.address;
      }

      if (extractedInfo.height) {
        updateData.height = extractedInfo.height;
      }

      if (extractedInfo.weight) {
        updateData.weight = extractedInfo.weight;
      }

      if (extractedInfo.customer_notes) {
        updateData.customer_notes = extractedInfo.customer_notes;
      }

      if (extractedInfo.purchased_products && extractedInfo.purchased_products.length > 0) {
        // Merge với purchased_products hiện tại
        const customer = await this.customerModel.findOne({
          customer_id: customerId,
          company_id: companyId,
        });

        if (customer) {
          const existingProducts = customer.purchased_products || [];
          const newProducts = extractedInfo.purchased_products.map(p => ({
            product_id: p.product_id || undefined,
            product_name: p.product_name,
            quantity: p.quantity,
            purchase_date: new Date(p.purchase_date),
            notes: p.notes || undefined,
            images: p.images || [],
          }));

          updateData.purchased_products = [...existingProducts, ...newProducts];
        }
      }

      if (Object.keys(updateData).length > 0) {
        updateData.updated_at = new Date();

        await this.customerModel.updateOne(
          { customer_id: customerId, company_id: companyId },
          { $set: updateData }
        );

        this.logger.log(`Updated customer info for ${customerId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to update customer info for ${customerId}:`, error);
    }
  }

  /**
   * Helper: Extract MinIO key from URL
   */
  private extractMinioKeyFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathSegments = urlObj.pathname.split('/');
      // Remove bucket name and get the rest
      return pathSegments.slice(2).join('/');
    } catch {
      return url;
    }
  }

  /**
   * Helper: Extract filename from URL
   */
  private extractFilenameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathSegments = urlObj.pathname.split('/');
      return pathSegments[pathSegments.length - 1];
    } catch {
      return 'image.jpg';
    }
  }

  /**
   * Hủy bỏ pending webhook (nếu cần)
   */
  cancelPendingWebhook(conversationId: string): void {
    if (this.pendingWebhooks.has(conversationId)) {
      const webhook = this.pendingWebhooks.get(conversationId)!;
      clearTimeout(webhook.timeout);
      this.pendingWebhooks.delete(conversationId);
      this.logger.log(`Cancelled pending webhook for conversation: ${conversationId}`);
    }
  }

  /**
   * Lấy thông tin về pending webhook (for debugging)
   */
  getPendingWebhookInfo(conversationId: string): PendingWebhook | undefined {
    return this.pendingWebhooks.get(conversationId);
  }

  /**
   * Clear tất cả pending webhooks (khi shutdown)
   */
  clearAllPendingWebhooks(): void {
    this.pendingWebhooks.forEach((webhook) => {
      clearTimeout(webhook.timeout);
    });
    this.pendingWebhooks.clear();
    this.logger.log('Cleared all pending webhooks');
  }
}
