import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FacebookMessagingService } from './facebook-messaging.service';
import {
  CreateMessageDto,
  UpdateConversationDto,
  UpdateCustomerDto,
  AssignConversationDto,
  GetConversationsQuery,
} from '../dto/facebook-messaging.dto';

@Controller('facebook-messaging')
@UseGuards(JwtAuthGuard)
export class FacebookMessagingController {
  private readonly logger = new Logger(FacebookMessagingController.name);

  constructor(private readonly messagingService: FacebookMessagingService) {}

  // ===== CUSTOMER ENDPOINTS =====

  @Get('customers')
  async getCustomers(@Request() req, @Query() query: any) {
    try {
      const companyId = req.user.company_id;
      const customers = await this.messagingService.getCustomers(companyId, query);
      
      return {
        success: true,
        data: customers,
      };
    } catch (error) {
      this.logger.error('Failed to get customers:', error);
      throw new HttpException(
        'Failed to get customers',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('customers/:customerId')
  async updateCustomer(
    @Request() req,
    @Param('customerId') customerId: string,
    @Body() updateData: UpdateCustomerDto,
  ) {
    try {
      const companyId = req.user.company_id;
      const customer = await this.messagingService.updateCustomer(
        customerId,
        companyId,
        updateData,
      );
      
      return {
        success: true,
        data: customer,
      };
    } catch (error) {
      this.logger.error('Failed to update customer:', error);
      throw new HttpException(
        error.message || 'Failed to update customer',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ===== CONVERSATION ENDPOINTS =====

  @Get('conversations')
  async getConversations(@Request() req, @Query() query: GetConversationsQuery) {
    try {
      const companyId = req.user.company_id;
      const result = await this.messagingService.getConversations(companyId, query);
      
      return {
        success: true,
        data: result.conversations,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          pages: Math.ceil(result.total / result.limit),
        },
      };
    } catch (error) {
      this.logger.error('Failed to get conversations:', error);
      throw new HttpException(
        'Failed to get conversations',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('conversations/:conversationId')
  async getConversation(
    @Request() req,
    @Param('conversationId') conversationId: string,
  ) {
    try {
      const companyId = req.user.company_id;
      const conversation = await this.messagingService.getConversation(
        conversationId,
        companyId,
      );
      
      return {
        success: true,
        data: conversation,
      };
    } catch (error) {
      this.logger.error('Failed to get conversation:', error);
      throw new HttpException(
        error.message || 'Failed to get conversation',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('conversations/:conversationId')
  async updateConversation(
    @Request() req,
    @Param('conversationId') conversationId: string,
    @Body() updateData: UpdateConversationDto,
  ) {
    try {
      const companyId = req.user.company_id;
      const conversation = await this.messagingService.updateConversation(
        conversationId,
        companyId,
        updateData,
      );
      
      return {
        success: true,
        data: conversation,
      };
    } catch (error) {
      this.logger.error('Failed to update conversation:', error);
      throw new HttpException(
        error.message || 'Failed to update conversation',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ===== MESSAGE ENDPOINTS =====

  @Get('conversations/:conversationId/messages')
  async getMessages(
    @Request() req,
    @Param('conversationId') conversationId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    try {
      const companyId = req.user.company_id;
      const result = await this.messagingService.getMessages(
        conversationId,
        companyId,
        +page,
        +limit,
      );
      
      return {
        success: true,
        data: result.messages,
        pagination: {
          total: result.total,
          page: +page,
          limit: +limit,
          pages: Math.ceil(result.total / +limit),
        },
      };
    } catch (error) {
      this.logger.error('Failed to get messages:', error);
      throw new HttpException(
        error.message || 'Failed to get messages',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('conversations/:conversationId/messages')
  async createMessage(
    @Request() req,
    @Param('conversationId') conversationId: string,
    @Body() messageData: CreateMessageDto,
  ) {
    try {
      const companyId = req.user.company_id;
      const userId = req.user.user_id;
      
      // For manual message creation (không gửi qua Facebook)
      const conversation = await this.messagingService.getConversation(
        conversationId,
        companyId,
      );
      
      const message = await this.messagingService.createMessage(
        companyId,
        conversation.page_id,
        conversation.customer_id,
        conversationId,
        {
          messageType: messageData.messageType || 'text',
          text: messageData.text,
          attachments: messageData.attachments,
          quickReply: messageData.quickReply,
          senderType: 'staff',
          senderId: userId,
        },
      );
      
      return {
        success: true,
        data: message,
      };
    } catch (error) {
      this.logger.error('Failed to create message:', error);
      throw new HttpException(
        error.message || 'Failed to create message',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('conversations/:conversationId/reply')
  async replyToConversation(
    @Request() req,
    @Param('conversationId') conversationId: string,
    @Body() messageData: CreateMessageDto,
  ) {
    try {
      const companyId = req.user.company_id;
      const userId = req.user.user_id;
      
      const message = await this.messagingService.replyToConversation(
        conversationId,
        companyId,
        userId,
        messageData,
      );
      
      return {
        success: true,
        data: message,
        message: 'Message sent successfully',
      };
    } catch (error) {
      this.logger.error('Failed to reply to conversation:', error);
      throw new HttpException(
        error.message || 'Failed to send message',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ===== CONVERSATION ACTIONS =====

  @Post('conversations/:conversationId/assign')
  async assignConversation(
    @Request() req,
    @Param('conversationId') conversationId: string,
    @Body() assignData: AssignConversationDto,
  ) {
    try {
      const companyId = req.user.company_id;
      
      const conversation = await this.messagingService.assignConversation(
        conversationId,
        companyId,
        assignData.assignedTo,
      );
      
      return {
        success: true,
        data: conversation,
        message: 'Conversation assigned successfully',
      };
    } catch (error) {
      this.logger.error('Failed to assign conversation:', error);
      throw new HttpException(
        error.message || 'Failed to assign conversation',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('conversations/:conversationId/return-to-bot')
  async returnToBot(
    @Request() req,
    @Param('conversationId') conversationId: string,
  ) {
    try {
      const companyId = req.user.company_id;
      const userId = req.user.user_id;
      
      const conversation = await this.messagingService.returnToBot(
        conversationId,
        companyId,
        userId,
      );
      
      return {
        success: true,
        data: conversation,
        message: 'Conversation returned to bot successfully',
      };
    } catch (error) {
      this.logger.error('Failed to return conversation to bot:', error);
      throw new HttpException(
        error.message || 'Failed to return to bot',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('conversations/:conversationId/mark-read')
  async markAsRead(
    @Request() req,
    @Param('conversationId') conversationId: string,
    @Body() body?: { user_id?: string; user_name?: string },
  ) {
    try {
      const companyId = req.user.company_id;
      
      // Ưu tiên lấy từ body (frontend gửi lên), fallback về req.user
      const userId = body?.user_id || req.user.user_id;
      const userName = body?.user_name || req.user.full_name || req.user.name || req.user.email;
      
      await this.messagingService.markAsRead(conversationId, companyId, userId, userName);
      
      return {
        success: true,
        message: 'Conversation marked as read',
      };
    } catch (error) {
      this.logger.error('Failed to mark conversation as read:', error);
      throw new HttpException(
        error.message || 'Failed to mark as read',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('conversations/:conversationId/mark-unread')
  async markAsUnread(
    @Request() req,
    @Param('conversationId') conversationId: string,
    @Body() body?: { user_id?: string; user_name?: string },
  ) {
    try {
      const companyId = req.user.company_id;
      
      // Lấy user info để ghi nhận người mark unread
      const userId = body?.user_id || req.user.user_id;
      const userName = body?.user_name || req.user.full_name || req.user.name || req.user.email;
      
      await this.messagingService.markAsUnread(conversationId, companyId, userId, userName);
      
      return {
        success: true,
        message: 'Conversation marked as unread',
      };
    } catch (error) {
      this.logger.error('Failed to mark conversation as unread:', error);
      throw new HttpException(
        error.message || 'Failed to mark as unread',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('conversations/:conversationId/close')
  async closeConversation(
    @Request() req,
    @Param('conversationId') conversationId: string,
  ) {
    try {
      const companyId = req.user.company_id;
      
      const conversation = await this.messagingService.updateConversation(
        conversationId,
        companyId,
        { status: 'closed' },
      );
      
      return {
        success: true,
        data: conversation,
        message: 'Conversation closed successfully',
      };
    } catch (error) {
      this.logger.error('Failed to close conversation:', error);
      throw new HttpException(
        error.message || 'Failed to close conversation',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ===== DASHBOARD STATS =====

  @Get('dashboard/stats')
  async getDashboardStats(@Request() req) {
    try {
      const companyId = req.user.company_id;
      
      // Có thể implement các stats như:
      // - Tổng số conversations
      // - Conversations cần attention
      // - Conversations đang assign
      // - Response time trung bình
      
      return {
        success: true,
        data: {
          total_conversations: 0,
          needs_attention: 0,
          assigned_conversations: 0,
          avg_response_time: 0,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get dashboard stats:', error);
      throw new HttpException(
        'Failed to get dashboard stats',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ===== QUICK REPLIES =====

  @Get('quick-replies')
  async getQuickReplies(@Request() req) {
    try {
      // Placeholder cho quick replies
      const quickReplies = [
        { id: 1, text: 'Xin chào! Cảm ơn bạn đã liên hệ với chúng tôi.' },
        { id: 2, text: 'Chúng tôi sẽ phản hồi trong thời gian sớm nhất.' },
        { id: 3, text: 'Bạn có thể cung cấp thêm thông tin chi tiết không?' },
        { id: 4, text: 'Cảm ơn bạn. Chúc bạn một ngày tốt lành!' },
      ];
      
      return {
        success: true,
        data: quickReplies,
      };
    } catch (error) {
      this.logger.error('Failed to get quick replies:', error);
      throw new HttpException(
        'Failed to get quick replies',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}