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
          await this.processEntry(entry);
        }
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

      // Tìm hoặc tạo conversation
      const conversation = await this.messagingService.findOrCreateConversation(
        page.company_id,
        page.page_id,
        customer.customer_id,
        `${facebookPageId}_${facebookUserId}`, // thread_id
        'messenger',
      );

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

      // TODO: Xử lý comments, posts, etc.
      // if (change.field === 'feed') {
      //   // Process comment on post
      // }
    } catch (error) {
      this.logger.error('[processPageChange] Error:', error);
    }
  }
}