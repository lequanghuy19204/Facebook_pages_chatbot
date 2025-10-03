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
import { CreateMessageDto, UpdateConversationDto, UpdateCustomerDto, GetConversationsQuery } from '../dto/facebook-messaging.dto';

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
  ) {}

  // ===== CUSTOMER MANAGEMENT =====

  async findOrCreateCustomer(
    companyId: string,
    pageId: string,
    facebookUserId: string,
    facebookPageId: string,
  ): Promise<FacebookCustomerDocument> {
    // Tìm customer đã tồn tại - PHẢI PHÂN BIỆT GIỮA CÁC PAGE
    let customer = await this.customerModel.findOne({
      company_id: companyId,
      page_id: pageId, // Thêm page_id để phân biệt
      facebook_user_id: facebookUserId,
    });

    if (customer) {
      // Cập nhật last_interaction_at
      customer.last_interaction_at = new Date();
      await customer.save();
      return customer;
    }

    // Tạo customer mới - cần gọi Facebook API để lấy thông tin
    const facebookUserInfo = await this.getFacebookUserInfo(facebookUserId, facebookPageId);
    
    const customerId = this.generateCustomerId();
    
    customer = new this.customerModel({
      customer_id: customerId,
      company_id: companyId,
      page_id: pageId,
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

    return customer;
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
    pageId: string,
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
      // Tạo conversation mới
      const conversationId = this.generateConversationId();
      
      const conversationData: any = {
        conversation_id: conversationId,
        company_id: companyId,
        page_id: pageId,
        customer_id: customerId,
        facebook_thread_id: facebookThreadId,
        source: source,
        status: 'open',
        current_handler: 'chatbot',
        needs_attention: source === 'comment', // Comment luôn cần attention
        priority: 'normal',
      };
      
      conversation = new this.conversationModel(conversationData);
      await conversation.save();
      this.logger.log(`Created new conversation: ${conversationId} (source: ${source})`);
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
    const conversation = await this.conversationModel.findOneAndUpdate(
      { conversation_id: conversationId, company_id: companyId },
      { ...updateData, updated_at: new Date() },
      { new: true }
    );

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async getConversations(companyId: string, query: GetConversationsQuery): Promise<{
    conversations: FacebookConversationDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    const filter: any = { company_id: companyId };
    
    if (query.status) filter.status = query.status;
    if (query.handler) filter.current_handler = query.handler;
    if (query.assignedTo) filter.assigned_to = query.assignedTo;
    if (query.needsAttention !== undefined) filter.needs_attention = query.needsAttention;
    if (query.source) filter.source = query.source; // Filter theo source: messenger hoặc comment

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // Sắp xếp theo: needs_attention desc, last_message_at desc
    const conversations = await this.conversationModel.find(filter)
      .sort({ needs_attention: -1, last_message_at: -1 })
      .skip(skip)
      .limit(limit)
      .populate('customer_id', 'name profile_pic')
      .exec();

    const total = await this.conversationModel.countDocuments(filter);

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

  async returnToBot(conversationId: string, companyId: string): Promise<FacebookConversationDocument> {
    return await this.updateConversation(conversationId, companyId, {
      assignedTo: undefined,
      currentHandler: 'chatbot',
      needsAttention: false,
    });
  }

  // ===== MESSAGE MANAGEMENT =====

  async createMessage(
    companyId: string,
    pageId: string,
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
      metadata?: any;
    },
  ): Promise<FacebookMessageDocument> {
    const messageId = this.generateMessageId();
    
    const message = new this.messageModel({
      message_id: messageId,
      company_id: companyId,
      page_id: pageId,
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
      is_read: messageData.senderType !== 'customer', // Staff/bot messages auto-read
      metadata: messageData.metadata,
    });

    await message.save();

    // Cập nhật conversation với tin nhắn cuối
    await this.updateConversationLastMessage(conversationId, message);
    
    this.logger.log(`Created message: ${messageId} in conversation: ${conversationId}`);
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

  async sendMessageToFacebook(
    pageId: string,
    facebookUserId: string,
    message: { text: string; attachments?: any[] },
  ): Promise<any> {
    try {
      // Lấy page access token
      const page = await this.pageModel.findOne({ page_id: pageId });
      if (!page || !page.access_token) {
        throw new Error('Page access token not found');
      }

      const apiVersion = this.configService.get('FACEBOOK_API_VERSION') || 'v23.0';
      const url = `https://graph.facebook.com/${apiVersion}/${page.facebook_page_id}/messages`;

      const payload: any = {
        recipient: { id: facebookUserId },
        message: { text: message.text },
      };

      if (message.attachments && message.attachments.length > 0) {
        // Handle attachments
        payload.message.attachment = message.attachments[0];
      }

      const response = await axios.post(url, payload, {
        params: { access_token: page.access_token },
        headers: { 'Content-Type': 'application/json' },
      });

      this.logger.log(`Message sent to Facebook: ${response.data.message_id}`);
      return response.data;
      
    } catch (error) {
      this.logger.error('Failed to send message to Facebook:', error.response?.data || error.message);
      throw error;
    }
  }

  async replyToConversation(
    conversationId: string,
    companyId: string,
    userId: string,
    messageData: CreateMessageDto,
  ): Promise<FacebookMessageDocument> {
    // Lấy conversation và customer info
    const conversation = await this.getConversation(conversationId, companyId);
    const customer = await this.customerModel.findOne({ customer_id: conversation.customer_id });
    
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Gửi message qua Facebook API
    const fbResponse = await this.sendMessageToFacebook(
      conversation.page_id,
      customer.facebook_user_id,
      { text: messageData.text, attachments: messageData.attachments },
    );

    // Lưu message vào DB
    const message = await this.createMessage(
      companyId,
      conversation.page_id,
      conversation.customer_id,
      conversationId,
      {
        facebookMessageId: fbResponse.message_id,
        messageType: messageData.messageType || 'text',
        text: messageData.text,
        attachments: messageData.attachments,
        senderType: 'staff',
        senderId: userId,
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

  async markAsRead(conversationId: string, companyId: string, userId: string): Promise<void> {
    // Mark conversation messages as read
    await this.messageModel.updateMany(
      {
        conversation_id: conversationId,
        company_id: companyId,
        sender_type: 'customer',
        is_read: false,
      },
      {
        $set: { is_read: true, read_at: new Date() },
        $addToSet: { read_by: userId },
      },
    );

    // Reset unread count
    await this.conversationModel.updateOne(
      { conversation_id: conversationId, company_id: companyId },
      { $set: { unread_count: 0 } },
    );
  }

  // ===== HELPER METHODS =====

  private async updateConversationLastMessage(conversationId: string, message: FacebookMessageDocument): Promise<void> {
    const updateData: any = {
      last_message_text: message.text.substring(0, 100), // 100 ký tự đầu
      last_message_at: message.sent_at,
      last_message_from: message.sender_type,
      $inc: { total_messages: 1 },
      updated_at: new Date(),
    };

    // Nếu là tin nhắn từ customer, tăng unread_count và set needs_attention
    if (message.sender_type === 'customer') {
      updateData.$inc.unread_count = 1;
      updateData.needs_attention = true;
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