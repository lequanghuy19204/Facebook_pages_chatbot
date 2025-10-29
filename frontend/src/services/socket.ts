import socketIOClient from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '');

type SocketType = ReturnType<typeof socketIOClient>;

class SocketService {
  private socket: SocketType | null = null;
  private token: string | null = null;

  /**
   * Connect to Socket.IO server
   */
  connect(token: string): void {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    this.token = token;

    this.socket = socketIOClient(`${SOCKET_URL}/messaging`, {
      auth: {
        token: token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('Socket connection error:', error.message);
    });

    this.socket.on('connected', (data: any) => {
      console.log('Socket authenticated:', data);
    });
  }

  /**
   * Disconnect from Socket.IO server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('Socket disconnected');
    }
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Subscribe to new messages
   */
  onNewMessage(callback: (data: any) => void): void {
    this.socket?.on('new_message', callback);
  }

  /**
   * Subscribe to conversation updates
   */
  onConversationUpdated(callback: (data: any) => void): void {
    this.socket?.on('conversation_updated', callback);
  }

  /**
   * Subscribe to new conversations
   */
  onNewConversation(callback: (data: any) => void): void {
    this.socket?.on('new_conversation', callback);
  }

  /**
   * Subscribe to customer updates
   */
  onCustomerUpdated(callback: (data: any) => void): void {
    this.socket?.on('customer_updated', callback);
  }

  /**
   * Subscribe to typing indicators
   */
  onTypingIndicator(callback: (data: any) => void): void {
    this.socket?.on('typing_indicator', callback);
  }

  /**
   * Subscribe to message read status
   */
  onMessagesRead(callback: (data: any) => void): void {
    this.socket?.on('messages_read', callback);
  }

  /**
   * Subscribe to conversation escalated (chatbot → human)
   */
  onConversationEscalated(callback: (data: any) => void): void {
    this.socket?.on('conversation_escalated', callback);
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners(): void {
    this.socket?.removeAllListeners();
  }

  /**
   * Remove specific event listener
   */
  off(event: string, callback?: (data: any) => void): void {
    if (callback) {
      this.socket?.off(event, callback);
    } else {
      this.socket?.off(event);
    }
  }
}

// Export singleton instance
const socketService = new SocketService();
export default socketService;
