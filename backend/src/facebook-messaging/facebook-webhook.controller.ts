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
import { MinioStorageService } from '../minio/minio-storage.service';

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
    private readonly minioService: MinioStorageService,
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

      // CHỈ xử lý events có nội dung thực (message/postback)
      // KHÔNG tạo conversation cho delivery/read confirmations
      if (!event.message && !event.postback) {
        this.logger.log(`[processMessagingEvent] ℹ️  Skipping non-content event (delivery/read confirmation) - no conversation needed`);
        
        // Nếu cần xử lý delivery/read, TÌM conversation hiện có (không tạo mới)
        if (event.delivery || event.read) {
          const threadId = `messenger_${facebookPageId}_${facebookUserId}`;
          const existingConversation = await this.messagingService.findConversationByThreadId(threadId);
          
          if (existingConversation) {
            if (event.delivery) {
              await this.processDelivery(existingConversation, event.delivery);
            }
            if (event.read) {
              await this.processRead(existingConversation, event.read);
            }
          } else {
            this.logger.log(`[processMessagingEvent] No existing conversation found for delivery/read confirmation`);
          }
        }
        return;
      }

      // Tìm hoặc tạo customer (CHỈ khi có message/postback thật)
      const customer = await this.messagingService.findOrCreateCustomer(
        page.company_id,
        facebookPageId,
        facebookUserId,
      );

      // Tìm hoặc tạo conversation cho messenger
      // Thread ID dựa trên customer ID thực để đảm bảo cùng 1 conversation
      const threadId = `messenger_${facebookPageId}_${facebookUserId}`;
      const conversation = await this.messagingService.findOrCreateConversation(
        page.company_id,
        facebookPageId,
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
      this.logger.log(`[processMessage] Message: ${message.text || 'No text'}, IsEcho: ${isEcho}, MID: ${message.mid}`);

      // KIỂM TRA xem message đã tồn tại chưa (theo facebook_message_id)
      const existingMessage = await this.messagingService.findMessageByFacebookId(message.mid);
      
      if (isEcho) {
        // NẾU LÀ ECHO: LƯU ĐẦY ĐỦ echo webhook từ Facebook
        this.logger.log(`[processMessage] 🔄 Processing echo message - MID: ${message.mid}, Text: "${message.text?.substring(0, 50) || 'no-text'}", Conv: ${conversation.conversation_id}`);
        
        // BƯỚC 1: Kiểm tra xem message với MID này đã tồn tại chưa (trong BẤT KỲ conversation nào)
        if (existingMessage) {
          this.logger.log(`[processMessage] ✅ Echo skipped - message with MID ${message.mid} already exists in DB (message_id: ${existingMessage.message_id})`);
          return;
        }
        
        // BƯỚC 2: Tìm message staff gần đây trong ĐÚNG conversation này để match
        const recentStaffMessage = await this.messagingService.findRecentStaffMessage(
          conversation.conversation_id,
          60000 // 60 seconds - tăng lên để bắt được messages có độ trễ cao
        );
        
        if (recentStaffMessage) {
          this.logger.log(`[processMessage] Found recent staff message in conversation: ${recentStaffMessage.message_id}, has MID: ${!!recentStaffMessage.facebook_message_id}, text: "${recentStaffMessage.text.substring(0, 50)}"`);
          
          // So sánh TEXT để match chính xác (vì MID chưa có hoặc khác)
          const echoText = (message.text || '').trim();
          const staffText = (recentStaffMessage.text || '').trim();
          
          if (!recentStaffMessage.facebook_message_id && echoText === staffText) {
            // Case 2A: Message chưa có MID VÀ text khớp → Update MID
            await this.messagingService.updateMessageFacebookId(
              recentStaffMessage.message_id,
              message.mid
            );
            this.logger.log(`[processMessage] ✅ Updated facebook_message_id for staff message (text matched): ${recentStaffMessage.message_id} -> ${message.mid}`);
            return;
          } else if (recentStaffMessage.facebook_message_id === message.mid) {
            // Case 2B: Message đã có đúng MID này → Skip
            this.logger.log(`[processMessage] ✅ Echo matched - staff message already has this facebook_message_id: ${message.mid}`);
            return;
          } else if (recentStaffMessage.facebook_message_id && recentStaffMessage.facebook_message_id !== message.mid) {
            // Case 2C: Message đã có MID KHÁC → Tạo message mới (có thể là tin nhắn khác)
            this.logger.log(`[processMessage] ⚠️  Staff message has different MID (${recentStaffMessage.facebook_message_id} vs ${message.mid}) - creating new message from echo`);
            // Tiếp tục tạo message mới
          } else {
            // Case 2D: Text không khớp → Có thể là message khác
            this.logger.log(`[processMessage] ⚠️  Text mismatch - echo: "${echoText.substring(0, 30)}", staff: "${staffText.substring(0, 30)}" - creating new message`);
            // Tiếp tục tạo message mới
          }
        } else {
          // BƯỚC 3: Không tìm thấy recent staff message → Tạo message mới từ echo
          this.logger.log(`[processMessage] 📝 No recent staff message found within 60s - creating new message from echo webhook`);
          // Tiếp tục tạo message mới bên dưới
        }
      }
      
      // KIỂM TRA duplicate cho customer messages
      if (!isEcho && existingMessage) {
        this.logger.log(`[processMessage] ✅ Customer message already exists (MID: ${message.mid}), skipping duplicate. Existing message_id: ${existingMessage.message_id}`);
        return;
      }
      
      this.logger.log(`[processMessage] Processing ${isEcho ? 'echo' : 'customer'} message - MID: ${message.mid}`);

      // Xác định sender type và sender info
      let senderType: 'customer' | 'chatbot' | 'staff';
      let senderId: string;
      let senderName: string;
      
      if (isEcho) {
        // Echo message từ page (có thể là staff, chatbot, hoặc automation tool)
        // Kiểm tra metadata để phân biệt nguồn gửi
        const metadata = message.metadata;
        
        if (metadata) {
          // Nếu có metadata từ custom integration (ví dụ: chatbot platform)
          senderType = metadata.sender_type || 'chatbot';
          senderId = metadata.sender_id || page.facebook_page_id;
          senderName = metadata.sender_name || page.name || 'Chatbot';
          this.logger.log(`[processMessage] Echo message with metadata - sender: ${senderType}`);
        } else {
          // Mặc định coi là staff nếu không có metadata
          // (messages từ replyToConversation không có metadata)
          senderType = 'staff';
          senderId = page.facebook_page_id;
          senderName = page.name || 'Page Staff';
          this.logger.log(`[processMessage] Echo message without metadata - treating as staff message`);
        }
      } else {
        // Message từ customer
        senderType = 'customer';
        senderId = customer.customer_id;
        senderName = customer.name;
      }

      // Chuẩn hóa attachments format từ Facebook Messenger và upload vào MinIO
      let normalizedAttachments: any[] | undefined = undefined;
      if (message.attachments && message.attachments.length > 0) {
        const facebookUrls = message.attachments.map((att: any) => att.payload?.url || att.url || '').filter(url => url);
        
        this.logger.log(`[processMessage] Processing ${facebookUrls.length} attachments for upload to MinIO`);
        
        const folder = this.minioService.generateChatFolder();
        const uploadedFiles = await this.minioService.downloadAndUploadMultipleFromUrls(facebookUrls, folder);
        
        this.logger.log(`[processMessage] Uploaded ${uploadedFiles.length}/${facebookUrls.length} files successfully`);
        
        // Map attachments với uploaded files theo THỨ TỰ (vì uploadedFiles trả về theo thứ tự URLs)
        normalizedAttachments = message.attachments.map((att: any, index: number) => {
          const facebookUrl = att.payload?.url || att.url || '';
          
          // Tìm uploaded file tương ứng theo index
          // uploadedFiles có thể ít hơn nếu có file upload thất bại
          const uploadedFile = uploadedFiles[index];
          
          if (!uploadedFile) {
            this.logger.warn(`[processMessage] ⚠️  No uploaded file found for attachment ${index}, facebook_url: ${facebookUrl.substring(0, 100)}`);
          }
          
          return {
            type: att.type || 'file',
            facebook_url: facebookUrl,
            minio_url: uploadedFile?.publicUrl,
            minio_key: uploadedFile?.key,
            filename: att.payload?.url?.split('/').pop() || 'attachment'
          };
        });
        
        if (normalizedAttachments) {
          this.logger.log(`[processMessage] Normalized ${normalizedAttachments.length} attachments with MinIO URLs`);
        }
      }

      // Tạo message record
      await this.messagingService.createMessage(
        page.company_id,
        page.facebook_page_id,
        customer.customer_id,
        conversation.conversation_id,
        {
          facebookMessageId: message.mid,
          messageType: message.attachments ? 'image' : message.quick_reply ? 'quick_reply' : 'text',
          text: message.text || '',
          attachments: normalizedAttachments,
          quickReply: message.quick_reply,
          senderType: senderType,
          senderId: senderId,
          senderName: senderName,
          sentAt: timestamp,
        },
      );

      // Logic xử lý theo thiết kế
      if (isEcho) {
        this.logger.log('[processMessage] ✅ Echo message (staff/bot reply) saved successfully');
      } else {
        // Customer message
        if (conversation.current_handler === 'chatbot') {
          // TODO: Xử lý chatbot logic ở đây
          this.logger.log('[processMessage] Customer message saved, chatbot should handle');
        } else {
          // current_handler = "human" -> needs_attention sẽ được set = true trong updateConversationLastMessage
          this.logger.log('[processMessage] Customer message saved, staff should handle');
        }
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
        page.facebook_page_id,
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
      
      this.logger.log(`[processComment] New comment from ${fromUser.name} (${fromUser.id})`);
      this.logger.log(`[processComment] Post: ${postId}, Comment: ${commentId}`);
      this.logger.log(`[processComment] Message: ${message}`);

      // Tìm page trong database
      const page = await this.messagingService.findPageByFacebookId(pageId);
      if (!page) {
        this.logger.warn(`[processComment] Page not found: ${pageId}`);
        return;
      }

      // KIỂM TRA: Nếu comment từ chính page (page tự reply), skip vì đã được lưu khi gửi từ replyToComment()
      if (fromUser.id === pageId) {
        this.logger.log(`[processComment] ⏭️  SKIPPING page self-reply - already saved when sending from replyToComment()`);
        return;
      }
      
      // Xử lý ảnh trong comment (trường 'photo') và upload vào MinIO
      const commentPhoto = commentData.photo;
      let attachments: any[] | undefined = undefined;
      
      if (commentPhoto) {
        const folder = this.minioService.generateChatFolder();
        const uploadedFiles = await this.minioService.downloadAndUploadMultipleFromUrls([commentPhoto], folder);
        
        attachments = [{
          type: 'image',
          facebook_url: commentPhoto,
          minio_url: uploadedFiles[0]?.publicUrl,
          minio_key: uploadedFiles[0]?.key,
          filename: 'comment_image.jpg'
        }];
        this.logger.log(`[processComment] Comment photo uploaded to MinIO: ${uploadedFiles[0]?.key}`);
      }
      
      // Lấy thông tin bài đăng từ webhook
      const postInfo = commentData.post;

      // Tìm hoặc tạo customer từ comment author (CHỈ với customer thực, không phải page)
      const customer = await this.messagingService.findOrCreateCustomer(
        page.company_id,
        pageId,
        fromUser.id,
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

      // Tạo/cập nhật conversation cho comment - MỖI BÀI ĐĂNG MỘT CONVERSATION
      const threadId = `comment_${postId}_${customer.customer_id}`; // Thread theo post_id + customer_id
      const conversation = await this.messagingService.findOrCreateConversation(
        page.company_id,
        pageId,
        customer.customer_id,
        threadId,
        'comment',
        postId,
        commentId,
        postData,
      );
      
      this.logger.log(`[processComment] Using conversation: ${conversation.conversation_id} for customer: ${customer.customer_id}`);

      let parentMessageId: string | undefined = undefined;
      if (parentId) {
        const parentMessage = await this.messagingService.findMessageByFacebookId(parentId);
        if (parentMessage) {
          parentMessageId = parentMessage.message_id;
          this.logger.log(`[processComment] Found parent message: ${parentMessageId}`);
        }
      }

      // Tạo message record cho comment
      await this.messagingService.createMessage(
        page.company_id,
        pageId,
        customer.customer_id,
        conversation.conversation_id,
        {
          facebookMessageId: commentId,
          messageType: 'comment',
          text: message || '',
          attachments: attachments,
          senderType: 'customer',
          senderId: customer.customer_id,
          senderName: fromUser.name,
          sentAt: createdTime,
          parentMessageId: parentMessageId,
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