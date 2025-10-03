import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Headers,
  HttpException,
  HttpStatus,
  Logger,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import type { RawBodyRequest } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { FacebookMessagingService } from './facebook-messaging.service';

interface FacebookWebhookEntry {
  id: string;
  time: number;
  messaging?: FacebookMessagingEvent[];
  changes?: any[];
}

interface FacebookMessagingEvent {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: {
    mid: string;
    text?: string;
    attachments?: any[];
    quick_reply?: { payload: string };
  };
  postback?: {
    payload: string;
    title: string;
  };
  delivery?: {
    mids: string[];
    watermark: number;
  };
  read?: {
    watermark: number;
  };
}

interface FacebookWebhookPayload {
  object: string;
  entry: FacebookWebhookEntry[];
}

@Controller('webhook/facebook')
export class FacebookWebhookController {
  private readonly logger = new Logger(FacebookWebhookController.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly messagingService: FacebookMessagingService,
  ) {}

  @Get()
  verifyWebhook(@Query() query: any) {
    try {
      const mode = query['hub.mode'];
      const token = query['hub.verify_token'];
      const challenge = query['hub.challenge'];

      const verifyToken = this.configService.get('FACEBOOK_WEBHOOK_VERIFY_TOKEN');

      this.logger.log(`[Webhook Verification] Mode: ${mode}, Token: ${token}`);

      if (mode && token) {
        if (mode === 'subscribe' && token === verifyToken) {
          this.logger.log('[Webhook Verification] Verification successful');
          return challenge;
        } else {
          this.logger.error('[Webhook Verification] Token mismatch');
          throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
        }
      }

      throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
    } catch (error) {
      this.logger.error('[Webhook Verification] Error:', error);
      throw error;
    }
  }

  @Post()
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: any,
    @Body() body: any, // Can be raw buffer or parsed JSON
  ) {
    try {
      // Handle raw body from express.raw() middleware
      let parsedBody: FacebookWebhookPayload;
      let rawBuffer: Buffer;
      
      if (Buffer.isBuffer(body)) {
        // Request processed by express.raw() middleware
        rawBuffer = body;
        parsedBody = JSON.parse(body.toString('utf8'));
      } else {
        // Request processed by normal JSON middleware (fallback)
        parsedBody = body;
        rawBuffer = Buffer.from(JSON.stringify(body), 'utf8');
      }
      
      // Log thông tin request
      this.logger.log(`[Webhook] Received request from IP: ${req.ip}`);
      this.logger.log(`[Webhook] Body type: ${Buffer.isBuffer(body) ? 'Buffer' : 'Object'}`);
      this.logger.log(`[Webhook] Raw buffer length: ${rawBuffer.length}`);
      this.logger.log(`[Webhook] Headers:`);
      this.logger.log(JSON.stringify(headers, null, 2));
      this.logger.log(`[Webhook] Parsed Body:`);
      this.logger.log(JSON.stringify(parsedBody, null, 2));

      // Signature verification - có thể enable/disable qua env
      const skipSignatureVerification = this.configService.get('FACEBOOK_WEBHOOK_SKIP_SIGNATURE_VERIFICATION', 'false') === 'true';
      
      if (skipSignatureVerification) {
        this.logger.log('[Webhook] Signature verification skipped via configuration');
      } else {
        try {
          this.verifySignature(rawBuffer, headers);
          this.logger.log('[Webhook] Signature verified successfully');
        } catch (error) {
          this.logger.warn('[Webhook] Signature verification failed, but continuing processing:', error.message);
          // Có thể log để debug nhưng không block request
          // throw error; // Uncomment để strict verification
        }
      }

      // Process webhook
      if (parsedBody.object === 'page') {
        for (const entry of parsedBody.entry) {
          this.logger.log(`[Webhook] Processing entry: pageId=${entry.id}, messaging=${entry.messaging?.length || 0}, changes=${entry.changes?.length || 0}`);
          await this.processEntry(entry);
        }
      } else {
        this.logger.warn(`[Webhook] Unhandled object type: ${parsedBody.object}`);
      }

      return { success: true };
    } catch (error) {
      this.logger.error('[Webhook] Processing error:', error.message);
      this.logger.error(error);
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  private verifySignature(payload: Buffer, headers: any): void {
    const signature = headers['x-hub-signature-256'];
    if (!signature) {
      throw new Error('Missing signature header');
    }

    this.logger.log(`[verifySignature] Signature header: ${signature}`);

    const appSecret = this.configService.get('FACEBOOK_APP_SECRET');
    if (!appSecret) {
      throw new Error('Facebook app secret not configured');
    }

    this.logger.log(`[verifySignature] App secret exists: ${!!appSecret}`);

    const expectedSignature = crypto
      .createHmac('sha256', appSecret)
      .update(payload)
      .digest('hex');

    this.logger.log(`[verifySignature] Expected: ${expectedSignature}`);
    this.logger.log(`[verifySignature] Actual: ${signature.replace('sha256=', '')}`);

    if (`sha256=${expectedSignature}` !== signature) {
      this.logger.error('[verifySignature] Signature mismatch');
      throw new Error('Invalid signature');
    }

    this.logger.log('[verifySignature] Signature verified successfully');
  }

  private async processEntry(entry: FacebookWebhookEntry): Promise<void> {
    try {
      this.logger.log(`[processEntry] Processing entry for page: ${entry.id}`);

      // Process messaging events
      if (entry.messaging) {
        for (const event of entry.messaging) {
          await this.processMessagingEvent(entry.id, event);
        }
      }

      // Process page changes (comments, posts, etc.)
      if (entry.changes) {
        for (const change of entry.changes) {
          await this.processPageChange(entry.id, change);
        }
      }
    } catch (error) {
      this.logger.error(`[processEntry] Error processing entry ${entry.id}:`, error);
    }
  }

  private async processMessagingEvent(
    facebookPageId: string,
    event: FacebookMessagingEvent,
  ): Promise<void> {
    try {
      const facebookUserId = event.sender.id;
      const timestamp = new Date(event.timestamp);

      this.logger.log(
        `[processMessagingEvent] Page: ${facebookPageId}, User: ${facebookUserId}, Type: ${
          event.message ? 'message' : event.postback ? 'postback' : 'other'
        }`,
      );
      this.logger.log(`[processMessagingEvent] Processing messenger event for customer: ${facebookUserId}`);

      // Tìm page trong database để lấy thông tin công ty
      const page = await this.messagingService.findPageByFacebookId(facebookPageId);
      if (!page) {
        this.logger.warn(`[processMessagingEvent] Page not found: ${facebookPageId}`);
        return;
      }

      // Tìm hoặc tạo customer
      const customer = await this.messagingService.findOrCreateCustomer(
        page.company_id,
        page.page_id,
        facebookUserId,
        facebookPageId,
      );

      // Tìm hoặc tạo conversation cho messenger
      // Thread ID riêng biệt để phân biệt với comment
      const threadId = `messenger_${facebookPageId}_${facebookUserId}`;
      const conversation = await this.messagingService.findOrCreateConversation(
        page.company_id,
        page.page_id,
        customer.customer_id,
        threadId, // thread_id riêng cho messenger
        'messenger', // source = messenger
      );
      
      this.logger.log(`[processMessagingEvent] Using conversation: ${conversation.conversation_id} for messenger`);

      // Process message
      if (event.message) {
        await this.processMessage(page, customer, conversation, event.message, timestamp);
      }

      // Process postback
      if (event.postback) {
        await this.processPostback(page, customer, conversation, event.postback, timestamp);
      }

      // Process delivery confirmation
      if (event.delivery) {
        await this.processDelivery(conversation, event.delivery);
      }

      // Process read confirmation
      if (event.read) {
        await this.processRead(conversation, event.read);
      }
    } catch (error) {
      this.logger.error('[processMessagingEvent] Error:', error);
    }
  }

  private async processMessage(
    page: any,
    customer: any,
    conversation: any,
    message: any,
    timestamp: Date,
  ): Promise<void> {
    try {
      this.logger.log(`[processMessage] Message: ${message.text || 'No text'}`);

      // Tạo message record
      await this.messagingService.createMessage(
        page.company_id,
        page.page_id,
        customer.customer_id,
        conversation.conversation_id,
        {
          facebookMessageId: message.mid,
          messageType: message.attachments ? 'image' : message.quick_reply ? 'quick_reply' : 'text',
          text: message.text || '[No text content]',
          attachments: message.attachments,
          quickReply: message.quick_reply,
          senderType: 'customer',
          senderId: customer.customer_id,
          senderName: customer.name,
          sentAt: timestamp,
        },
      );

      // TODO: Ở đây sẽ xử lý chatbot logic
      // Hiện tại chỉ đánh dấu cần attention để staff xử lý
      this.logger.log('[processMessage] Message saved, marked for staff attention');
    } catch (error) {
      this.logger.error('[processMessage] Error:', error);
    }
  }

  private async processPostback(
    page: any,
    customer: any,
    conversation: any,
    postback: any,
    timestamp: Date,
  ): Promise<void> {
    try {
      this.logger.log(`[processPostback] Payload: ${postback.payload}`);

      // Tạo message record cho postback
      await this.messagingService.createMessage(
        page.company_id,
        page.page_id,
        customer.customer_id,
        conversation.conversation_id,
        {
          messageType: 'postback',
          text: postback.title || postback.payload,
          postback: postback,
          senderType: 'customer',
          senderId: customer.customer_id,
          senderName: customer.name,
          sentAt: timestamp,
        },
      );

      // TODO: Xử lý postback logic
      this.logger.log('[processPostback] Postback saved');
    } catch (error) {
      this.logger.error('[processPostback] Error:', error);
    }
  }

  private async processDelivery(conversation: any, delivery: any): Promise<void> {
    try {
      this.logger.log(`[processDelivery] Messages delivered: ${delivery.mids?.length || 0}`);

      // Update delivery status for messages
      if (delivery.mids) {
        // TODO: Update message delivery status
      }
    } catch (error) {
      this.logger.error('[processDelivery] Error:', error);
    }
  }

  private async processRead(conversation: any, read: any): Promise<void> {
    try {
      this.logger.log(`[processRead] Read watermark: ${read.watermark}`);

      // TODO: Mark messages as read up to watermark
    } catch (error) {
      this.logger.error('[processRead] Error:', error);
    }
  }

  private async processPageChange(pageId: string, change: any): Promise<void> {
    try {
      this.logger.log(`[processPageChange] Change type: ${change.field}`);
      this.logger.log(`[processPageChange] Change data:`, JSON.stringify(change, null, 2));

      if (change.field === 'feed') {
        await this.processFeedChange(pageId, change);
      } else if (change.field === 'ratings') {
        await this.processRatingChange(pageId, change);
      } else {
        this.logger.log(`[processPageChange] Unhandled field: ${change.field}`);
      }
    } catch (error) {
      this.logger.error('[processPageChange] Error:', error);
    }
  }

  private async processFeedChange(pageId: string, change: any): Promise<void> {
    try {
      const value = change.value;
      
      if (value.item === 'comment') {
        await this.processComment(pageId, value);
      } else if (value.item === 'post') {
        await this.processPost(pageId, value);
      } else if (value.item === 'status') {
        await this.processPostStatus(pageId, value); // Xử lý cập nhật bài đăng
      } else if (value.item === 'reaction') {
        await this.processReaction(pageId, value);
      } else if (value.item === 'share') {
        await this.processShare(pageId, value);
      } else {
        this.logger.log(`[processFeedChange] Unhandled item type: ${value.item}`);
      }
    } catch (error) {
      this.logger.error('[processFeedChange] Error:', error);
    }
  }

  private async processComment(pageId: string, commentData: any): Promise<void> {
    try {
      const commentId = commentData.comment_id;
      const postId = commentData.post_id;
      const parentId = commentData.parent_id; // null for top-level comments
      const fromUser = commentData.from;
      const message = commentData.message;
      const createdTime = new Date(commentData.created_time * 1000);
      
      // Xử lý ảnh trong comment (trường 'photo')
      const commentPhoto = commentData.photo;
      let attachments: any[] | undefined = undefined;
      
      if (commentPhoto) {
        attachments = [{
          type: 'image',
          url: commentPhoto,
          payload: {
            url: commentPhoto
          }
        }];
        this.logger.log(`[processComment] Comment has photo: ${commentPhoto}`);
      }
      
      // Lấy thông tin bài đăng từ webhook
      const postInfo = commentData.post;

      this.logger.log(`[processComment] New comment from ${fromUser.name} (${fromUser.id})`);
      this.logger.log(`[processComment] Post: ${postId}, Comment: ${commentId}`);
      this.logger.log(`[processComment] Message: ${message}`);

      // Tìm page trong database
      const page = await this.messagingService.findPageByFacebookId(pageId);
      if (!page) {
        this.logger.warn(`[processComment] Page not found: ${pageId}`);
        return;
      }

      // Tìm hoặc tạo customer từ comment author
      const customer = await this.messagingService.findOrCreateCustomer(
        page.company_id,
        page.page_id,
        fromUser.id,
        pageId,
      );

      // Chuẩn bị thông tin bài đăng từ comment event
      // Lưu ý: Comment event có permalink_url, Status event có message + photos
      // CHỈ cập nhật khi có dữ liệu, không ghi đè với giá trị rỗng
      const postData = postInfo ? {
        content: postInfo.message || undefined, // Giữ nguyên undefined nếu không có
        permalink_url: postInfo.permalink_url || undefined, // CHỈ CÓ TRONG COMMENT EVENT
        photos: postInfo.photos && postInfo.photos.length > 0 ? postInfo.photos : undefined,
        status_type: postInfo.status_type || undefined,
        created_time: postInfo.created_time ? new Date(postInfo.created_time * 1000) : undefined,
        updated_time: postInfo.updated_time ? new Date(postInfo.updated_time) : undefined,
      } : undefined; // KHÔNG tạo object rỗng

      this.logger.log(`[processComment] Post data (from comment event):`, {
        hasPostInfo: !!postInfo,
        content_length: postData?.content?.length || 0,
        photos_count: postData?.photos?.length || 0,
        has_permalink: !!postData?.permalink_url,
        permalink_url: postData?.permalink_url || 'not-in-comment-event',
        status_type: postData?.status_type || 'none',
        post_id: postId
      });

      // Tạo/cập nhật conversation cho comment - GỘP VÀO CONVERSATION CŨ NẾu CÙNG CUSTOMER
      const threadId = `comment_${pageId}_${customer.customer_id}`; // Thread theo customer, không theo comment riêng
      const conversation = await this.messagingService.findOrCreateConversation(
        page.company_id,
        page.page_id,
        customer.customer_id,
        threadId,
        'comment',
        postId,
        commentId,
        postData,
      );
      
      this.logger.log(`[processComment] Using conversation: ${conversation.conversation_id} for customer: ${customer.customer_id}`);

      // Tạo message record cho comment
      await this.messagingService.createMessage(
        page.company_id,
        page.page_id,
        customer.customer_id,
        conversation.conversation_id,
        {
          facebookMessageId: commentId,
          messageType: 'comment',
          text: message || '[No text content]',
          attachments: attachments, // Thêm ảnh comment nếu có
          senderType: 'customer',
          senderId: customer.customer_id,
          senderName: fromUser.name,
          sentAt: createdTime,
          // KHÔNG lưu metadata cho comment - thông tin bài đăng đã lưu vào conversation
          metadata: null,
        },
      );

      this.logger.log('[processComment] Comment saved successfully');
    } catch (error) {
      this.logger.error('[processComment] Error:', error);
    }
  }

  private async processPost(pageId: string, postData: any): Promise<void> {
    try {
      this.logger.log(`[processPost] New post: ${postData.post_id}`);
      // TODO: Implement post processing if needed
    } catch (error) {
      this.logger.error('[processPost] Error:', error);
    }
  }

  private async processPostStatus(pageId: string, statusData: any): Promise<void> {
    try {
      const postId = statusData.post_id;
      this.logger.log(`[processPostStatus] Post status updated: ${postId}`);
      this.logger.log(`[processPostStatus] Status data:`, JSON.stringify(statusData, null, 2));
      
      // Tìm page trong database
      const page = await this.messagingService.findPageByFacebookId(pageId);
      if (!page) {
        this.logger.warn(`[processPostStatus] Page not found: ${pageId}`);
        return;
      }

      // Cập nhật thông tin bài đăng vào các conversation comment liên quan
      await this.messagingService.updateConversationsWithPostData(
        page.company_id,
        postId,
        {
          content: statusData.message || '',
          permalink_url: statusData.permalink_url || '',
          photos: statusData.photos || [],
          status_type: statusData.status_type || '',
          created_time: statusData.created_time ? new Date(statusData.created_time * 1000) : undefined,
          updated_time: statusData.updated_time ? new Date(statusData.updated_time) : undefined,
        }
      );
      
      this.logger.log(`[processPostStatus] Updated conversations with post data for: ${postId}`);
    } catch (error) {
      this.logger.error('[processPostStatus] Error:', error);
    }
  }

  private async processReaction(pageId: string, reactionData: any): Promise<void> {
    try {
      this.logger.log(`[processReaction] New reaction: ${reactionData.reaction_type}`);
      // TODO: Implement reaction processing if needed
    } catch (error) {
      this.logger.error('[processReaction] Error:', error);
    }
  }

  private async processShare(pageId: string, shareData: any): Promise<void> {
    try {
      this.logger.log(`[processShare] New share: ${shareData.share_id}`);
      // TODO: Implement share processing if needed
    } catch (error) {
      this.logger.error('[processShare] Error:', error);
    }
  }

  private async processRatingChange(pageId: string, change: any): Promise<void> {
    try {
      this.logger.log(`[processRatingChange] New rating change`);
      // TODO: Implement rating processing if needed
    } catch (error) {
      this.logger.error('[processRatingChange] Error:', error);
    }
  }
}