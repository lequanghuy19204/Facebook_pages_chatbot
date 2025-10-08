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
    is_echo?: boolean;
    app_id?: number;
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
      const timestamp = new Date(event.timestamp);
      
      // Phân biệt tin nhắn từ page (echo) vs tin nhắn từ customer
      const isEcho = event.message?.is_echo === true;
      
      // Nếu là echo (page gửi), thì recipient là customer thực
      // Nếu không phải echo (customer gửi), thì sender là customer
      const facebookUserId = isEcho ? event.recipient.id : event.sender.id;
      
      this.logger.log(
        `[processMessagingEvent] Page: ${facebookPageId}, User: ${facebookUserId}, Type: ${
          event.message ? 'message' : event.postback ? 'postback' : 'other'
        }, IsEcho: ${isEcho}`,
      );
      this.logger.log(`[processMessagingEvent] Processing messenger event for customer: ${facebookUserId}`);

      // Tìm page trong database để lấy thông tin công ty
      const page = await this.messagingService.findPageByFacebookId(facebookPageId);
      if (!page) {
        this.logger.warn(`[processMessagingEvent] Page not found: ${facebookPageId}`);
        return;
      }

      // Tìm hoặc tạo customer (luôn dùng customer ID thực, không phải page ID)
      const customer = await this.messagingService.findOrCreateCustomer(
        page.company_id,
        page.page_id,
        facebookUserId,
        facebookPageId,
      );

      // Tìm hoặc tạo conversation cho messenger
      // Thread ID dựa trên customer ID thực để đảm bảo cùng 1 conversation
      const threadId = `messenger_${facebookPageId}_${facebookUserId}`;
      const conversation = await this.messagingService.findOrCreateConversation(
        page.company_id,
        page.page_id,
        customer.customer_id,
        threadId, // thread_id riêng cho messenger
        'messenger', // source = messenger
      );
      
      this.logger.log(`[processMessagingEvent] Using conversation: ${conversation.conversation_id} for messenger (echo: ${isEcho})`);

      // Process message
      if (event.message) {
        await this.processMessage(page, customer, conversation, event.message, timestamp, isEcho);
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
    isEcho: boolean = false,
  ): Promise<void> {
    try {
      this.logger.log(`[processMessage] Message: ${message.text || 'No text'}, IsEcho: ${isEcho}`);

      // Xác định sender type và sender info
      let senderType: 'customer' | 'chatbot' | 'staff';
      let senderId: string;
      let senderName: string;
      
      if (isEcho) {
        // Tin nhắn từ page - có thể là staff hoặc chatbot gửi từ Facebook web
        // Hiện tại xác định là staff (sau này có thể phân biệt bằng app_id)
        senderType = 'staff';
        senderId = 'facebook_web_staff'; // ID tạm cho staff gửi từ FB web
        senderName = page.name || 'Page Staff';
        this.logger.log(`[processMessage] Echo message from page staff via Facebook web`);
      } else {
        // Tin nhắn từ customer
        senderType = 'customer';
        senderId = customer.customer_id;
        senderName = customer.name;
      }

      // Chuẩn hóa attachments format từ Facebook Messenger
      let normalizedAttachments: any[] | undefined = undefined;
      if (message.attachments && message.attachments.length > 0) {
        normalizedAttachments = message.attachments.map((att: any) => ({
          type: att.type || 'file',
          facebook_url: att.payload?.url || att.url || '',
          filename: att.payload?.url?.split('/').pop() || 'attachment'
        }));
      }

      // Tạo message record
      await this.messagingService.createMessage(
        page.company_id,
        page.page_id,
        customer.customer_id,
        conversation.conversation_id,
        {
          facebookMessageId: message.mid,
          messageType: message.attachments ? 'image' : message.quick_reply ? 'quick_reply' : 'text',
          text: message.text || '🖼️ Ảnh',
          attachments: normalizedAttachments,
          quickReply: message.quick_reply,
          senderType: senderType,
          senderId: senderId,
          senderName: senderName,
          sentAt: timestamp,
        },
      );

      // Logic xử lý theo thiết kế:
      if (!isEcho) {
        // Tin nhắn từ customer
        if (conversation.current_handler === 'chatbot') {
          // TODO: Xử lý chatbot logic ở đây
          this.logger.log('[processMessage] Customer message saved, chatbot should handle');
        } else {
          // current_handler = "human" -> needs_attention sẽ được set = true trong updateConversationLastMessage
          this.logger.log('[processMessage] Customer message saved, staff should handle');
        }
      } else {
        // Echo message từ staff -> conversation đã được chuyển sang "human" handler trong updateConversationLastMessage
        this.logger.log('[processMessage] Staff echo message saved, conversation switched to human handler');
      }
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
          facebook_url: commentPhoto,
          filename: 'comment_image.jpg'
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

      // GỌI FACEBOOK API để lấy thông tin bài đăng đầy đủ
      this.logger.log(`[processComment] Fetching full post info from Facebook API for: ${postId}`);
      const fullPostInfo = await this.messagingService.getFacebookPostInfo(postId, pageId);
      
      // Kết hợp thông tin từ webhook và API
      // Ưu tiên thông tin từ API (đầy đủ hơn)
      const postData: any = {};
      
      if (fullPostInfo) {
        postData.content = fullPostInfo.message || undefined;
        postData.photos = fullPostInfo.photos && fullPostInfo.photos.length > 0 ? fullPostInfo.photos : undefined;
        postData.permalink_url = fullPostInfo.permalink_url || postInfo?.permalink_url || undefined;
        postData.status_type = fullPostInfo.status_type || postInfo?.status_type || undefined;
        postData.created_time = fullPostInfo.created_time || (postInfo?.created_time ? new Date(postInfo.created_time * 1000) : undefined);
        postData.updated_time = fullPostInfo.updated_time || (postInfo?.updated_time ? new Date(postInfo.updated_time) : undefined);
      } else if (postInfo) {
        // Fallback về webhook data nếu API call thất bại
        postData.content = postInfo.message || undefined;
        postData.permalink_url = postInfo.permalink_url || undefined;
        postData.photos = postInfo.photos && postInfo.photos.length > 0 ? postInfo.photos : undefined;
        postData.status_type = postInfo.status_type || undefined;
        postData.created_time = postInfo.created_time ? new Date(postInfo.created_time * 1000) : undefined;
        postData.updated_time = postInfo.updated_time ? new Date(postInfo.updated_time) : undefined;
      }

      this.logger.log(`[processComment] Post data (from API + webhook):`, {
        content_length: postData.content?.length || 0,
        photos_count: postData.photos?.length || 0,
        has_permalink: !!postData.permalink_url,
        permalink_url: postData.permalink_url || 'not-available',
        status_type: postData.status_type || 'none',
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
          text: message || '🖼️ Ảnh',
          attachments: attachments, // Thêm ảnh comment nếu có
          senderType: 'customer',
          senderId: customer.customer_id,
          senderName: fromUser.name,
          sentAt: createdTime,
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