import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  },
  namespace: '/messaging',
})
export class MessagingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagingGateway.name);
  private connectedClients = new Map<string, { socket: Socket; companyId: string; userId: string }>();

  constructor(private readonly jwtService: JwtService) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      // Verify JWT token from handshake
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      // Verify and decode token
      const payload = await this.jwtService.verifyAsync(token);
      const companyId = payload.company_id;
      const userId = payload.user_id;

      // Store client info
      this.connectedClients.set(client.id, { socket: client, companyId, userId });

      // Join company room
      client.join(`company:${companyId}`);

      this.logger.log(`Client ${client.id} connected (User: ${userId}, Company: ${companyId})`);

      // Send connection confirmation
      client.emit('connected', {
        message: 'Connected to messaging server',
        companyId,
        userId,
      });
    } catch (error) {
      this.logger.error(`Authentication failed for client ${client.id}:`, error.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const clientInfo = this.connectedClients.get(client.id);
    if (clientInfo) {
      this.logger.log(`Client ${client.id} disconnected (User: ${clientInfo.userId})`);
      this.connectedClients.delete(client.id);
    }
  }

  // ===== EMIT EVENTS TO CLIENTS =====

  /**
   * Broadcast new message to all clients in the same company
   */
  emitNewMessage(companyId: string, data: any) {
    this.server.to(`company:${companyId}`).emit('new_message', data);
    this.logger.debug(`Emitted new_message to company:${companyId}`);
  }

  /**
   * Broadcast conversation update (status, assignment, etc.)
   */
  emitConversationUpdate(companyId: string, data: any) {
    this.server.to(`company:${companyId}`).emit('conversation_updated', data);
    this.logger.debug(`Emitted conversation_updated to company:${companyId}`);
  }

  /**
   * Broadcast new conversation created
   */
  emitNewConversation(companyId: string, data: any) {
    this.server.to(`company:${companyId}`).emit('new_conversation', data);
    this.logger.debug(`Emitted new_conversation to company:${companyId}`);
  }

  /**
   * Broadcast customer update (profile, tags, etc.)
   */
  emitCustomerUpdate(companyId: string, data: any) {
    this.server.to(`company:${companyId}`).emit('customer_updated', data);
    this.logger.debug(`Emitted customer_updated to company:${companyId}`);
  }

  /**
   * Broadcast typing indicator
   */
  emitTypingIndicator(companyId: string, data: { conversationId: string; userId: string; isTyping: boolean }) {
    this.server.to(`company:${companyId}`).emit('typing_indicator', data);
  }

  /**
   * Broadcast message read status
   */
  emitMessageRead(companyId: string, data: { conversationId: string; messageIds: string[]; userId: string }) {
    this.server.to(`company:${companyId}`).emit('messages_read', data);
  }

  /**
   * Broadcast conversation escalated to human (needs attention)
   */
  emitConversationEscalated(companyId: string, data: {
    conversation_id: string;
    customer_id: string;
    escalation_reason: string;
    escalated_at: Date;
  }) {
    this.server.to(`company:${companyId}`).emit('conversation_escalated', data);
    this.logger.log(`🔔 Emitted conversation_escalated to company:${companyId} - Conversation: ${data.conversation_id}`);
  }

  /**
   * Get connected clients count for a company
   */
  getConnectedClientsCount(companyId: string): number {
    const clients = Array.from(this.connectedClients.values());
    return clients.filter(c => c.companyId === companyId).length;
  }
}
