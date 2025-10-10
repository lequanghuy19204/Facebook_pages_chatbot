import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import axios from 'axios';

import { FacebookCustomer, FacebookCustomerDocument } from '../schemas/facebook-customer.schema';
import { FacebookConversation, FacebookConversationDocument } from '../schemas/facebook-conversation.schema';
import { FacebookMessage, FacebookMessageDocument } from '../schemas/facebook-message.schema';
import { FacebookPage, FacebookPageDocument } from '../schemas/facebook-page.schema';
import { CreateMessageDto, ReplyMessageDto, UpdateConversationDto, UpdateCustomerDto, GetConversationsQuery } from '../dto/facebook-messaging.dto';
import { MessagingGateway } from '../websocket/messaging.gateway';

@Injectable()
export class FacebookMessagingService {
  private readonly logger = new Logger(FacebookMessagingService.name);

  constructor(
    @InjectModel(FacebookCustomer.name)
    private readonly customerModel: Model<FacebookCustomerDocument>,
    
    @InjectModel(FacebookConversation.name)
    private readonly conversationModel: Model<FacebookConversationDocument>,
    
    @InjectModel(FacebookMessage.name)
    private readonly messageModel: Model<FacebookMessageDocument>,
    
    @InjectModel(FacebookPage.name)
    private readonly pageModel: Model<FacebookPageDocument>,
    
    private readonly configService: ConfigService,
    private readonly messagingGateway: MessagingGateway,
  ) {}

  // ===== CUSTOMER MANAGEMENT =====

  async findOrCreateCustomer(
    companyId: string,
    facebookPageId: string,
    facebookUserId: string,
  ): Promise<FacebookCustomerDocument> {
    // Tìm customer đã tồn tại - PHẢI PHÂN BIỆT GIỮA CÁC PAGE
    let customer = await this.customerModel.findOne({
      company_id: companyId,
      facebook_page_id: facebookPageId,
      facebook_user_id: facebookUserId,
    });

    if (customer) {
      const facebookUserInfo = await this.getFacebookUserInfo(facebookUserId, facebookPageId);
      let needsUpdate = false;
      
      if (facebookUserInfo.name && customer.name !== facebookUserInfo.name) {
        customer.name = facebookUserInfo.name;
        needsUpdate = true;
      }
      if (facebookUserInfo.first_name && customer.first_name !== facebookUserInfo.first_name) {
        customer.first_name = facebookUserInfo.first_name;
        needsUpdate = true;
      }
      if (facebookUserInfo.profile_pic && customer.profile_pic !== facebookUserInfo.profile_pic) {
        customer.profile_pic = facebookUserInfo.profile_pic;
        needsUpdate = true;
      }
      
      customer.last_interaction_at = new Date();
      await customer.save();
      
      if (needsUpdate) {
        await this.syncCustomerInfoToConversations(customer.customer_id, companyId, customer);
        this.logger.log(`Updated and synced customer info: ${customer.customer_id}`);
      }
      
      return customer;
    }

    const facebookUserInfo = await this.getFacebookUserInfo(facebookUserId, facebookPageId);
    
    const customerId = this.generateCustomerId();
    
    customer = new this.customerModel({
      customer_id: customerId,
      company_id: companyId,
      facebook_page_id: facebookPageId,
      facebook_user_id: facebookUserId,
      name: facebookUserInfo.name || 'Unknown User',
      first_name: facebookUserInfo.first_name,
      last_name: facebookUserInfo.last_name,
      profile_pic: facebookUserInfo.profile_pic,
      locale: facebookUserInfo.locale,
      timezone: facebookUserInfo.timezone,
      first_contact_at: new Date(),
      last_interaction_at: new Date(),
    });

    await customer.save();
    this.logger.log(`Created new customer: ${customerId} for user: ${facebookUserId}`);
    
    return customer;
  }

  async updateCustomer(customerId: string, companyId: string, updateData: UpdateCustomerDto): Promise<FacebookCustomerDocument> {
    const customer = await this.customerModel.findOneAndUpdate(
      { customer_id: customerId, company_id: companyId },
      { ...updateData, updated_at: new Date() },
      { new: true }
    );

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    await this.syncCustomerInfoToConversations(customerId, companyId, customer);

    return customer;
  }

  private async syncCustomerInfoToConversations(
    customerId: string,
    companyId: string,
    customer: FacebookCustomerDocument,
  ): Promise<void> {
    try {
      const updateFields: any = {
        customer_name: customer.name,
        customer_first_name: customer.first_name,
        customer_profile_pic: customer.profile_pic,
        customer_phone: customer.phone,
        updated_at: new Date(),
      };

      const updateResult = await this.conversationModel.updateMany(
        {
          company_id: companyId,
          customer_id: customerId,
        },
        { $set: updateFields }
      );

      this.logger.log(
        `Synced customer info to ${updateResult.modifiedCount} conversations for customer: ${customerId}`
      );
    } catch (error) {
      this.logger.error('Failed to sync customer info to conversations:', error);
    }
  }

  async getCustomers(companyId: string, query: any = {}): Promise<FacebookCustomerDocument[]> {
    const filter = { company_id: companyId, ...query };
    return await this.customerModel.find(filter)
      .sort({ last_interaction_at: -1 })
      .limit(50);
  }

  // ===== CONVERSATION MANAGEMENT =====

  async findOrCreateConversation(
    companyId: string,
    facebookPageId: string,
    customerId: string,
    facebookThreadId?: string,
    source: 'messenger' | 'comment' = 'messenger',
    postId?: string,
    commentId?: string,
    postData?: {
      content?: string;
      permalink_url?: string;
      photos?: string[];
      status_type?: string;
      created_time?: Date;
      updated_time?: Date;
    },
  ): Promise<FacebookConversationDocument> {
    let conversation: FacebookConversationDocument | null = null;

    // Tìm conversation dựa trên facebook_thread_id hoặc customer_id
    if (facebookThreadId) {
      conversation = await this.conversationModel.findOne({
        facebook_thread_id: facebookThreadId,
      });
    }

    // Logic tìm conversation cũ:
    if (!conversation) {
      if (source === 'messenger' && facebookThreadId) {
        // Messenger: Tìm theo facebook_thread_id
        conversation = await this.conversationModel.findOne({
          company_id: companyId,
          customer_id: customerId,
          facebook_thread_id: facebookThreadId,
          source: 'messenger',
          status: 'open',
        }).sort({ created_at: -1 });
      } else if (source === 'comment') {
        // Comment: Gộp vào conversation comment cũ của cùng customer
        conversation = await this.conversationModel.findOne({
          company_id: companyId,
          customer_id: customerId,
          source: 'comment',
          status: 'open',
        }).sort({ created_at: -1 });
      }
    }

    if (!conversation) {
      // Lấy thông tin customer để denormalize vào conversation
      const customer = await this.customerModel.findOne({ customer_id: customerId });
      
      // Tạo conversation mới
      const conversationId = this.generateConversationId();
      
      const conversationData: any = {
        conversation_id: conversationId,
        company_id: companyId,
        facebook_page_id: facebookPageId,
        customer_id: customerId,
        customer_name: customer?.name,
        customer_first_name: customer?.first_name,
        customer_profile_pic: customer?.profile_pic,
        customer_phone: customer?.phone,
        facebook_thread_id: facebookThreadId,
        source: source,
        status: 'open',
        current_handler: 'chatbot', // Mặc định chatbot xử lý
        needs_attention: false,     // Mặc định false, sẽ được set = true trong updateConversationLastMessage nếu current_handler = 'human'
        priority: 'normal',
        is_read: false,             // Mặc định chưa đọc
      };
      
      conversation = new this.conversationModel(conversationData);
      await conversation.save();
      this.logger.log(`Created new conversation: ${conversationId} (source: ${source})`);
      
      // Emit WebSocket event for new conversation
      this.messagingGateway.emitNewConversation(companyId, {
        conversation_id: conversationId,
        customer_id: customerId,
        facebook_page_id: facebookPageId,
        source: source,
        status: 'open',
        created_at: conversation.created_at,
      });
    }
    
    // Cập nhật thông tin bài đăng cho comment (CHỈ cập nhật trường có dữ liệu)
    if (source === 'comment' && postData) {
      let hasUpdates = false;
      
      // Cập nhật các ID luôn
      if (postId) {
        conversation.post_id = postId;
        hasUpdates = true;
      }
      if (commentId) {
        conversation.comment_id = commentId;
        hasUpdates = true;
      }
      
      // Chỉ cập nhật nếu có dữ liệu mới
      if (postData.content !== undefined) {
        conversation.post_content = postData.content;
        hasUpdates = true;
      }
      if (postData.permalink_url !== undefined) {
        conversation.post_permalink_url = postData.permalink_url;
        hasUpdates = true;
      }
      if (postData.photos !== undefined) {
        conversation.post_photos = postData.photos;
        hasUpdates = true;
      }
      if (postData.status_type !== undefined) {
        conversation.post_status_type = postData.status_type;
        hasUpdates = true;
      }
      if (postData.created_time !== undefined) {
        conversation.post_created_time = postData.created_time;
        hasUpdates = true;
      }
      if (postData.updated_time !== undefined) {
        conversation.post_updated_time = postData.updated_time;
        hasUpdates = true;
      }
      
      if (hasUpdates) {
        conversation.updated_at = new Date();
        await conversation.save();
        this.logger.log(`Updated post data for conversation: ${conversation.conversation_id} (comment event)`);
      }
    }

    return conversation;
  }

  async updateConversation(
    conversationId: string, 
    companyId: string, 
    updateData: UpdateConversationDto
  ): Promise<FacebookConversationDocument> {
    // Map camelCase fields từ DTO sang snake_case cho MongoDB
    const mongoUpdateData: any = {
      updated_at: new Date(),
    };
    
    if (updateData.status !== undefined) mongoUpdateData.status = updateData.status;
    if (updateData.currentHandler !== undefined) mongoUpdateData.current_handler = updateData.currentHandler;
    if (updateData.assignedTo !== undefined) mongoUpdateData.assigned_to = updateData.assignedTo;
    if (updateData.needsAttention !== undefined) mongoUpdateData.needs_attention = updateData.needsAttention;
    if (updateData.priority !== undefined) mongoUpdateData.priority = updateData.priority;

    const conversation = await this.conversationModel.findOneAndUpdate(
      { conversation_id: conversationId, company_id: companyId },
      { $set: mongoUpdateData },
      { new: true }
    );

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Emit WebSocket event với snake_case để frontend nhận đúng
    this.messagingGateway.emitConversationUpdate(companyId, {
      conversation_id: conversationId,
      status: conversation.status,
      current_handler: conversation.current_handler,
      assigned_to: conversation.assigned_to,
      needs_attention: conversation.needs_attention,
      priority: conversation.priority,
      updated_at: conversation.updated_at,
    });

    return conversation;
  }

  async getConversations(
    companyId: string, 
    userId: string,
    query: GetConversationsQuery
  ): Promise<{
    conversations: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const filter: any = { company_id: companyId };
    
    if (query.status) filter.status = query.status;
    if (query.handler) filter.current_handler = query.handler;
    if (query.assignedTo) filter.assigned_to = query.assignedTo;
    if (query.needsAttention !== undefined) filter.needs_attention = query.needsAttention;
    if (query.source) filter.source = query.source;
    if (query.facebookPageId) filter.facebook_page_id = query.facebookPageId;

    // FILTER THEO MERGED_PAGES_FILTER của user
    if (query.facebookPageIds && query.facebookPageIds.length > 0) {
      filter.facebook_page_id = { $in: query.facebookPageIds };
      this.logger.log(`Filtering conversations by merged_pages_filter: ${query.facebookPageIds.join(', ')}`);
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const conversations = await this.conversationModel.find(filter)
      .sort({ needs_attention: -1, last_message_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    const total = await this.conversationModel.countDocuments(filter);

    this.logger.log(`Retrieved ${conversations.length} conversations (total: ${total}) for company: ${companyId}`);

    return {
      conversations,
      total,
      page,
      limit,
    };
  }

  async getConversation(conversationId: string, companyId: string): Promise<FacebookConversationDocument> {
    const conversation = await this.conversationModel.findOne({
      conversation_id: conversationId,
      company_id: companyId,
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async assignConversation(conversationId: string, companyId: string, assignedTo: string): Promise<FacebookConversationDocument> {
    return await this.updateConversation(conversationId, companyId, {
      assignedTo,
      currentHandler: 'human',
      needsAttention: false,
    });
  }

  async returnToBot(conversationId: string, companyId: string, userId?: string): Promise<FacebookConversationDocument> {
    // Khi chuyển về chatbot:
    // - Set current_handler = 'chatbot'
    // - Set needs_attention = false (chatbot tự xử lý)
    // - Set is_read = false (không cần quan tâm read status với chatbot)
    // - GIỮ NGUYÊN read_by_user_id, read_by_user_name, read_at (không xóa)
    // - Set unread_customer_messages = 0
    
    const updateData: any = {
      current_handler: 'chatbot',
      needs_attention: false,
      is_read: false,
      unread_customer_messages: 0,
      updated_at: new Date(),
    };

    if (userId) {
      updateData.last_returned_by = userId;
    }

    const conversation = await this.conversationModel.findOneAndUpdate(
      { conversation_id: conversationId, company_id: companyId },
      {
        $set: updateData,
        $inc: { returned_to_bot_count: 1 },
        $currentDate: { last_returned_to_bot_at: true },
      },
      { new: true }
    );

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Emit WebSocket event
    this.messagingGateway.emitConversationUpdate(companyId, {
      conversation_id: conversationId,
      current_handler: 'chatbot',
      needs_attention: false,
      is_read: false,
      unread_customer_messages: 0,
      returned_to_bot_count: conversation.returned_to_bot_count,
      updated_at: conversation.updated_at,
    });

    this.logger.log(`Conversation ${conversationId} returned to bot by user ${userId}`);

    return conversation;
  }

  // ===== MESSAGE MANAGEMENT =====

  async createMessage(
    companyId: string,
    facebookPageId: string,
    customerId: string,
    conversationId: string,
    messageData: {
      facebookMessageId?: string;
      messageType: string;
      text: string;
      attachments?: any[];
      quickReply?: any;
      postback?: any;
      senderType: 'customer' | 'chatbot' | 'staff';
      senderId: string;
      senderName?: string;
      sentAt?: Date;
    },
  ): Promise<FacebookMessageDocument> {
    const messageId = this.generateMessageId();
    
    const message = new this.messageModel({
      message_id: messageId,
      company_id: companyId,
      facebook_page_id: facebookPageId,
      customer_id: customerId,
      conversation_id: conversationId,
      facebook_message_id: messageData.facebookMessageId,
      message_type: messageData.messageType,
      text: messageData.text,
      attachments: messageData.attachments,
      quick_reply: messageData.quickReply,
      postback: messageData.postback,
      sender_type: messageData.senderType,
      sender_id: messageData.senderId,
      sender_name: messageData.senderName,
      sent_at: messageData.sentAt || new Date(),
      delivery_status: 'sent', // Webhook messages đã được gửi
    });

    await message.save();

    // Cập nhật conversation với tin nhắn cuối
    await this.updateConversationLastMessage(conversationId, message);
    
    this.logger.log(`Created message: ${messageId} in conversation: ${conversationId} from ${messageData.senderType}`);
    
    // Lấy conversation đã được cập nhật để emit WebSocket với đầy đủ thông tin
    const updatedConversation = await this.conversationModel.findOne({ conversation_id: conversationId }).lean();
    
    // Convert message document to plain object để emit
    const messageObject = message.toObject();
    
    this.logger.log(`Emitting new_message via WebSocket: ${messageId}, sender_name: ${messageObject.sender_name}`);
    
    // Emit WebSocket event for new message với TOÀN BỘ thông tin message
    this.messagingGateway.emitNewMessage(companyId, {
      ...messageObject,
      // Thêm thông tin conversation để cập nhật ChatList
      conversation: updatedConversation,
    });
    
    return message;
  }

  async getMessages(conversationId: string, companyId: string, page = 1, limit = 50): Promise<{
    messages: FacebookMessageDocument[];
    total: number;
  }> {
    // Verify conversation exists và thuộc company
    const conversation = await this.getConversation(conversationId, companyId);
    
    const skip = (page - 1) * limit;
    
    const messages = await this.messageModel.find({
      conversation_id: conversationId,
      company_id: companyId,
    })
    .sort({ sent_at: 1 }) // Sắp xếp theo thời gian gửi tăng dần
    .skip(skip)
    .limit(limit);

    const total = await this.messageModel.countDocuments({
      conversation_id: conversationId,
      company_id: companyId,
    });

    return { messages, total };
  }

  async findMessageByFacebookId(facebookMessageId: string): Promise<FacebookMessageDocument | null> {
    return await this.messageModel.findOne({ facebook_message_id: facebookMessageId });
  }

  async sendMessageToFacebook(
    facebookPageId: string,
    facebookUserId: string,
    message: { text: string; attachments?: any[] },
  ): Promise<any> {
    try {
      // Lấy page access token
      const page = await this.pageModel.findOne({ facebook_page_id: facebookPageId });
      if (!page || !page.access_token) {
        throw new Error('Page access token not found');
      }

      const apiVersion = this.configService.get('FACEBOOK_API_VERSION') || 'v23.0';
      const url = `https://graph.facebook.com/${apiVersion}/${page.facebook_page_id}/messages`;

      // Nếu có attachments, gửi từng attachment riêng
      if (message.attachments && message.attachments.length > 0) {
        const results: any[] = [];
        
        for (const attachment of message.attachments) {
          const payload: any = {
            recipient: { id: facebookUserId },
            message: {
              attachment: {
                type: this.mapAttachmentType(attachment.type),
                payload: {
                  url: attachment.cloudflare_url,
                  is_reusable: true,
                },
              },
            },
          };

          const response = await axios.post(url, payload, {
            params: { access_token: page.access_token },
            headers: { 'Content-Type': 'application/json' },
          });

          this.logger.log(`Attachment sent to Facebook: ${response.data.message_id}`);
          results.push(response.data);
        }

        // Nếu có text, gửi text sau attachments
        if (message.text && message.text.trim()) {
          const textPayload = {
            recipient: { id: facebookUserId },
            message: { text: message.text },
          };

          const textResponse = await axios.post(url, textPayload, {
            params: { access_token: page.access_token },
            headers: { 'Content-Type': 'application/json' },
          });

          this.logger.log(`Text message sent to Facebook: ${textResponse.data.message_id}`);
          results.push(textResponse.data);
        }

        return results[results.length - 1]; // Return last message ID
      } else {
        // Gửi text message thông thường
        const payload: any = {
          recipient: { id: facebookUserId },
          message: { text: message.text },
        };

        const response = await axios.post(url, payload, {
          params: { access_token: page.access_token },
          headers: { 'Content-Type': 'application/json' },
        });

        this.logger.log(`Message sent to Facebook: ${response.data.message_id}`);
        return response.data;
      }
    } catch (error) {
      this.logger.error('Failed to send message to Facebook:', error.response?.data || error.message);
      throw error;
    }
  }

  private mapAttachmentType(type: string): string {
    // Map internal type to Facebook attachment type
    switch (type) {
      case 'image':
        return 'image';
      case 'video':
        return 'video';
      case 'file':
        return 'file';
      default:
        return 'file';
    }
  }

  async replyToConversation(
    conversationId: string,
    companyId: string,
    userId: string,
    userName: string,
    messageData: ReplyMessageDto,
  ): Promise<FacebookMessageDocument> {
    // Lấy conversation và customer info
    const conversation = await this.getConversation(conversationId, companyId);
    const customer = await this.customerModel.findOne({ customer_id: conversation.customer_id });
    
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Chuẩn bị attachments để lưu vào DB
    let dbAttachments: any[] | undefined = undefined;
    if (messageData.attachments && messageData.attachments.length > 0) {
      dbAttachments = messageData.attachments.map(att => ({
        type: att.type,
        cloudflare_url: att.cloudflare_url,
        cloudflare_key: att.cloudflare_key,
        filename: att.filename,
      }));
    }

    // Gửi message qua Facebook API
    const fbResponse = await this.sendMessageToFacebook(
      conversation.facebook_page_id,
      customer.facebook_user_id,
      { text: messageData.text, attachments: dbAttachments },
    );

    // Xác định message type
    let messageType = messageData.messageType || 'text';
    if (dbAttachments && dbAttachments.length > 0) {
      const firstAttachment = dbAttachments[0];
      if (firstAttachment.type === 'image') {
        messageType = 'image';
      } else if (firstAttachment.type === 'video') {
        messageType = 'video';
      } else {
        messageType = 'file';
      }
    }

    // Lưu message vào DB với thông tin nhân viên
    const message = await this.createMessage(
      companyId,
      conversation.facebook_page_id,
      conversation.customer_id,
      conversationId,
      {
        facebookMessageId: fbResponse.message_id,
        messageType: messageType,
        text: messageData.text,
        attachments: dbAttachments,
        senderType: 'staff',
        senderId: userId,
        senderName: userName,
        sentAt: new Date(),
      },
    );

    // Cập nhật conversation: chuyển về human handler, không cần attention
    await this.updateConversation(conversationId, companyId, {
      currentHandler: 'human',
      needsAttention: false,
      assignedTo: userId,
    });

    return message;
  }

  async markAsRead(conversationId: string, companyId: string, userId: string, userName?: string): Promise<void> {
    // Khi nhân viên MỞ XEM conversation:
    // - Set needs_attention = false (không cần ưu tiên nữa)
    // - Set is_read = true (đã xem)
    // - KHÔNG cập nhật read_by_user_id, read_by_user_name, read_at (giữ nguyên người xử lý trước đó)
    
    await this.conversationModel.updateOne(
      { conversation_id: conversationId, company_id: companyId },
      { 
        $set: { 
          unread_customer_messages: 0,
          is_read: true,
          needs_attention: false, // Nhân viên đã mở xem -> không cần attention nữa
        },
      },
    );

    // Emit WebSocket để tất cả nhân viên khác biết conversation này đã được xem
    this.messagingGateway.emitConversationUpdate(companyId, {
      conversation_id: conversationId,
      is_read: true,
      needs_attention: false, // Quan trọng: để tất cả client bỏ hiển thị đậm
      unread_customer_messages: 0,
      // KHÔNG emit read_by_user_id, read_by_user_name, read_at
    });
    
    this.logger.log(`Conversation ${conversationId} opened by ${userName} (${userId}) - needs_attention set to false`);
  }

  async markAsUnread(conversationId: string, companyId: string, userId: string, userName?: string): Promise<void> {
    // Khi nhân viên MARK UNREAD:
    // - Set current_handler = 'human' (đảm bảo human đang xử lý)
    // - Set needs_attention = true (cần nhân viên khác xử lý)
    // - Set is_read = false (chưa đọc)
    // - CẬP NHẬT read_by_user_id, read_by_user_name, read_at = nhân viên hiện tại
    // - Nếu unread_customer_messages = 0 thì set = 1
    
    const readAt = new Date();
    const conversation = await this.conversationModel.findOne({
      conversation_id: conversationId,
      company_id: companyId,
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const updateData: any = {
      current_handler: 'human',
      is_read: false,
      read_by_user_id: userId,
      read_by_user_name: userName,
      read_at: readAt,
      needs_attention: true,
      updated_at: new Date(),
    };

    // Nếu unread_customer_messages = 0 thì set = 1
    if (conversation.unread_customer_messages === 0) {
      updateData.unread_customer_messages = 1;
    }
    
    await this.conversationModel.updateOne(
      { conversation_id: conversationId, company_id: companyId },
      { $set: updateData },
    );

    // Emit WebSocket để tất cả client biết conversation cần attention lại
    this.messagingGateway.emitConversationUpdate(companyId, {
      conversation_id: conversationId,
      current_handler: 'human',
      is_read: false,
      read_by_user_id: userId,
      read_by_user_name: userName,
      read_at: readAt,
      needs_attention: true,
      unread_customer_messages: updateData.unread_customer_messages || conversation.unread_customer_messages,
    });
    
    this.logger.log(`Conversation ${conversationId} marked as unread by ${userName} (${userId})`);
  }

  // ===== HELPER METHODS =====

  private async updateConversationLastMessage(conversationId: string, message: FacebookMessageDocument): Promise<void> {
    const conversation = await this.conversationModel.findOne({ conversation_id: conversationId });
    if (!conversation) return;

    const updateData: any = {
      last_message_text: message.text.substring(0, 100),
      last_message_at: message.sent_at,
      last_message_from: message.sender_type,
      $inc: { total_messages: 1 },
      updated_at: new Date(),
    };

    // Logic theo thiết kế mới:
    if (message.sender_type === 'customer') {
      // Tin nhắn từ customer
      updateData.$inc = { 
        ...updateData.$inc,
        unread_customer_messages: 1 
      };
      
      // CHỈ set needs_attention = true nếu current_handler = "human"
      if (conversation.current_handler === 'human') {
        updateData.needs_attention = true;
        updateData.is_read = false;
        updateData.read_by_user_id = null;
        updateData.read_by_user_name = null;
        updateData.read_at = null;
      }
      // Nếu current_handler = "chatbot" -> không cần attention (bot tự xử lý)
      
    } else if (message.sender_type === 'staff') {
      // Tin nhắn từ staff -> chuyển sang human handler
      updateData.current_handler = 'human';
      updateData.needs_attention = false;
      updateData.is_read = true;
      updateData.unread_customer_messages = 0;
      // CẬP NHẬT read_by = staff đang reply
      updateData.read_by_user_id = message.sender_id;
      updateData.read_by_user_name = message.sender_name;
      updateData.read_at = new Date();
      
    } else if (message.sender_type === 'chatbot') {
      // Tin nhắn từ chatbot -> giữ nguyên chatbot handler
      updateData.needs_attention = false;
      updateData.unread_customer_messages = 0;
    }

    await this.conversationModel.updateOne(
      { conversation_id: conversationId },
      updateData,
    );
  }

  private async getFacebookUserInfo(facebookUserId: string, facebookPageId: string): Promise<any> {
    try {
      // Lấy page access token
      const page = await this.pageModel.findOne({ facebook_page_id: facebookPageId });
      if (!page || !page.access_token) {
        this.logger.warn(`No access token found for page: ${facebookPageId}`);
        return { name: 'Unknown User' };
      }

      const apiVersion = this.configService.get('FACEBOOK_API_VERSION') || 'v23.0';
      const url = `https://graph.facebook.com/${apiVersion}/${facebookUserId}`;

      const response = await axios.get(url, {
        params: {
          fields: 'name,first_name,last_name,profile_pic,locale,timezone',
          access_token: page.access_token,
        },
      });

      return response.data;
      
    } catch (error) {
      this.logger.error(`Failed to get Facebook user info for ${facebookUserId}:`, error.response?.data || error.message);
      return { name: 'Unknown User' };
    }
  }

  async getFacebookPostInfo(postId: string, facebookPageId: string): Promise<any> {
    try {
      const page = await this.pageModel.findOne({ facebook_page_id: facebookPageId });
      if (!page || !page.access_token) {
        this.logger.warn(`No access token found for page: ${facebookPageId}`);
        return null;
      }

      const apiVersion = this.configService.get('FACEBOOK_API_VERSION') || 'v23.0';
      const url = `https://graph.facebook.com/${apiVersion}/${postId}`;

      const response = await axios.get(url, {
        params: {
          fields: 'message,full_picture,attachments{media,type,subattachments},created_time,updated_time,permalink_url,status_type',
          access_token: page.access_token,
        },
      });

      const postData = response.data;
      const photosSet = new Set<string>();

      if (postData.attachments?.data) {
        for (const attachment of postData.attachments.data) {
          if (attachment.type === 'photo') {
            if (attachment.media?.image?.src) {
              photosSet.add(attachment.media.image.src);
            }
          } else if (attachment.type === 'album') {
            if (attachment.subattachments?.data) {
              for (const subAttachment of attachment.subattachments.data) {
                if (subAttachment.media?.image?.src) {
                  photosSet.add(subAttachment.media.image.src);
                }
              }
            }
          }
        }
      }

      if (photosSet.size === 0 && postData.full_picture) {
        photosSet.add(postData.full_picture);
      }

      return {
        message: postData.message || '',
        photos: Array.from(photosSet),
        permalink_url: postData.permalink_url || '',
        status_type: postData.status_type || '',
        created_time: postData.created_time ? new Date(postData.created_time) : null,
        updated_time: postData.updated_time ? new Date(postData.updated_time) : null,
      };
      
    } catch (error) {
      this.logger.error(`Failed to get Facebook post info for ${postId}:`, error.response?.data || error.message);
      return null;
    }
  }

  private generateCustomerId(): string {
    return 'cust_' + crypto.randomBytes(8).toString('hex');
  }

  private generateConversationId(): string {
    return 'conv_' + crypto.randomBytes(8).toString('hex');
  }

  private generateMessageId(): string {
    return 'msg_' + crypto.randomBytes(8).toString('hex');
  }

  async findPageByFacebookId(facebookPageId: string): Promise<FacebookPageDocument | null> {
    return await this.pageModel.findOne({ facebook_page_id: facebookPageId });
  }

  async updateConversationsWithPostData(
    companyId: string, 
    postId: string, 
    postData: {
      content?: string;
      permalink_url?: string;
      photos?: string[];
      status_type?: string;
      created_time?: Date;
      updated_time?: Date;
    }
  ): Promise<void> {
    try {
      // Xây dựng object update chỉ với các trường có dữ liệu
      const updateFields: any = {
        updated_at: new Date(),
      };
      
      // CHỈ cập nhật trường có dữ liệu thực sự (không rỗng, không ghi đè giá trị đã có)
      if (postData.content && postData.content.trim() !== '') {
        updateFields.post_content = postData.content;
      }
      // KHÔNG cập nhật permalink_url nếu rỗng (giữ lại giá trị từ comment event)
      if (postData.permalink_url && postData.permalink_url.trim() !== '') {
        updateFields.post_permalink_url = postData.permalink_url;
      }
      if (postData.photos && Array.isArray(postData.photos) && postData.photos.length > 0) {
        updateFields.post_photos = postData.photos;
      }
      if (postData.status_type && postData.status_type.trim() !== '') {
        updateFields.post_status_type = postData.status_type;
      }
      if (postData.created_time) {
        updateFields.post_created_time = postData.created_time;
      }
      if (postData.updated_time) {
        updateFields.post_updated_time = postData.updated_time;
      }
      
      // Cập nhật tất cả conversations comment liên quan đến post này
      const updateResult = await this.conversationModel.updateMany(
        {
          company_id: companyId,
          source: 'comment',
          post_id: postId,
        },
        { $set: updateFields }
      );
      
      this.logger.log(`Updated ${updateResult.modifiedCount} conversations with post data for post: ${postId} (status event)`);
      this.logger.log(`Update fields:`, Object.keys(updateFields));
    } catch (error) {
      this.logger.error('Failed to update conversations with post data:', error);
    }
  }
}