'use client';

import React, { useState, useRef, useEffect } from 'react';
import ApiService, { FacebookMessage, FacebookConversation } from '@/services/api';
import socketService from '@/services/socket';
import '@/styles/chat/ChatArea.css';

interface ChatAreaProps {
  conversationId: string | null;
  onToggleRightPanel: () => void;
  showRightPanel: boolean;
}

export default function ChatArea({ conversationId, onToggleRightPanel, showRightPanel }: ChatAreaProps) {
  const [messages, setMessages] = useState<FacebookMessage[]>([]);
  const [conversation, setConversation] = useState<FacebookConversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch conversation details and messages
  const fetchConversationData = async () => {
    if (!conversationId) return;

    try {
      setLoading(true);
      setError(null);

      if (typeof window === 'undefined') return;

      const token = localStorage.getItem('auth_token');
      if (!token) {
        setError('Vui lòng đăng nhập');
        return;
      }

      // Fetch conversation details and messages in parallel
      const [conversationData, messagesData] = await Promise.all([
        ApiService.messaging.getConversation(token, conversationId),
        ApiService.messaging.getMessages(token, conversationId, 1, 100)
      ]);

      setConversation(conversationData);
      setMessages(messagesData.messages || []);

      // Mark as read with user info
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        await ApiService.messaging.markAsRead(token, conversationId, user.user_id, user.full_name);
      } else {
        await ApiService.messaging.markAsRead(token, conversationId);
      }
    } catch (err: any) {
      console.error('Failed to fetch conversation:', err);
      setError(err.message || 'Failed to load conversation');
    } finally {
      setLoading(false);
    }
  };

  // Load conversation data when conversationId changes
  useEffect(() => {
    if (conversationId) {
      fetchConversationData();
    } else {
      setMessages([]);
      setConversation(null);
    }
  }, [conversationId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Setup Socket.IO listeners for real-time updates
  useEffect(() => {
    if (!conversationId || typeof window === 'undefined') return;

    const token = localStorage.getItem('auth_token');
    if (!token) return;

    // Connect socket if not already connected
    if (!socketService.isConnected()) {
      socketService.connect(token);
    }

    // Listen for new messages in this conversation
    const handleNewMessage = (message: any) => {
      if (message.conversation_id === conversationId) {
        setMessages(prev => [...prev, message]);
        
        // Cập nhật conversation info nếu có (để cập nhật avatar, name realtime)
        if (message.conversation) {
          setConversation(prev => prev ? { ...prev, ...message.conversation } : message.conversation);
        }
      }
    };

    socketService.onNewMessage(handleNewMessage);

    // Cleanup
    return () => {
      socketService.off('new_message', handleNewMessage);
    };
  }, [conversationId]);

  // Send message
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !conversationId || sending) return;

    try {
      setSending(true);
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setError('Vui lòng đăng nhập');
        return;
      }

      await ApiService.messaging.replyToConversation(token, conversationId, {
        text: inputMessage,
        messageType: 'text'
      });

      setInputMessage('');
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Format time
  const formatTime = (date?: Date | string) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  // Format date badge
  const formatDateBadge = (date?: Date | string) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Group messages by date
  const groupMessagesByDate = (messages: FacebookMessage[]) => {
    const groups: { [key: string]: FacebookMessage[] } = {};
    
    messages.forEach(message => {
      const date = new Date(message.sent_at);
      const dateKey = date.toLocaleDateString('vi-VN');
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });
    
    return groups;
  };

  // Get customer info from denormalized data
  const getCustomerName = () => {
    if (!conversation) return 'Khách hàng';
    return conversation.customer_name || 'Khách hàng';
  };

  const getCustomerAvatar = () => {
    if (!conversation) return 'https://ui-avatars.com/api/?name=User&background=random&size=200';
    return conversation.customer_profile_pic || 
      `https://ui-avatars.com/api/?name=${encodeURIComponent(getCustomerName())}&background=random&size=200`;
  };

  if (!conversationId) {
    return (
      <div className="chat-area-empty">
        <p>Chọn một cuộc hội thoại để bắt đầu</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="chat-area-container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <p>Đang tải...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chat-area-container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'red' }}>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="chat-area-container">
      {/* Chat Header */}
      <div className="chat-area-header">
        <img 
          src={getCustomerAvatar()} 
          alt="avatar" 
          className="chat-area-header-avatar"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            img.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(getCustomerName())}&background=random&size=200`;
          }}
        />
        <div className="chat-area-header-info">
          <div className="chat-area-header-name-row">
            <div className="chat-area-header-name">{getCustomerName()}</div>
          </div>
          <div className="chat-area-header-status-row">
            <div className="chat-area-status-icon">
              <img src="/assets/d482b35d-4dc2-4b0c-8338-c5c6e59aa68e.png" alt="status" />
            </div>
            <div className="chat-area-status-text">
              {conversation?.unread_customer_messages === 0 ? 'Đã xem' : 'Chưa xem'}
              {conversation?.current_handler && ` bởi ${conversation.current_handler}`}
              {conversation?.last_message_at && ` - ${formatDateBadge(conversation.last_message_at)}`}
            </div>
          </div>
          <div className="chat-area-header-actions">
            <button className="chat-area-action-button">
              <img src="/assets/ee3e82e5-0279-4d86-a8c2-d979f6a038b9.png" alt="comment" />
            </button>
            <button className="chat-area-action-button">
              <img src="/assets/e85d98fe-c892-4b67-b492-b09f85dadcb7.png" alt="message" />
            </button>
            <button className="chat-area-action-button">
              <img src="/assets/63c793a1-7d01-415f-a354-ce3a3612612c.png" alt="phone" />
            </button>
            <button className="chat-area-action-button">
              <img src="/assets/867c594c-0e9e-4f78-84bb-d1441648b1a1.png" alt="info" />
            </button>
          </div>
        </div>
        <div className="chat-area-header-right-actions">
          <button className="chat-area-icon-button">
            <img src="/assets/f2224969-56ff-4977-8af1-79091ec9e69c.png" alt="archive" />
          </button>
          <button className="chat-area-icon-button">
            <img src="/assets/2e9973d9-9df2-4e64-a6b4-2d8b9d006a93.png" alt="star" />
          </button>
          <button className="chat-area-icon-button" onClick={onToggleRightPanel}>
            <img src="/assets/d771238c-e5a6-4b89-85fa-2db22a889c87.png" alt="panel" />
          </button>
          <button className="chat-area-icon-button">
            <img src="/assets/dc5ccc5a-a725-412d-ab2c-b7f1faf4fafb.png" alt="more" />
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="chat-area-messages">
        {Object.keys(messageGroups).map(dateKey => (
          <React.Fragment key={dateKey}>
            <div className="chat-area-messages-date-badge">
              <span>{dateKey}</span>
            </div>
            
            {messageGroups[dateKey].map((message) => {
              const isCustomer = message.sender_type === 'customer';
              const isChatbot = message.sender_type === 'chatbot';
              const hasAttachment = message.attachments && message.attachments.length > 0;
              
              return (
                <div key={message.message_id} className={`message-wrapper ${isCustomer ? 'received' : 'sent'}`}>
                  {/* Customer messages (received) */}
                  {isCustomer && (
                    <div className="chat-area-message-row received">
                      <img 
                        src={getCustomerAvatar()} 
                        alt="avatar" 
                        className="chat-area-message-avatar"
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          img.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(getCustomerName())}&background=random&size=200`;
                        }}
                      />
                      <div className="chat-area-message-bubble received">
                        {message.text}
                        {hasAttachment && message.attachments && message.attachments.map((att, idx) => (
                          <div key={idx} style={{ marginTop: '8px' }}>
                            {att.type === 'image' && (
                              <img src={att.url} alt="attachment" style={{ maxWidth: '100%', borderRadius: '8px' }} />
                            )}
                            {att.type === 'video' && (
                              <video src={att.url} controls style={{ maxWidth: '100%', borderRadius: '8px' }} />
                            )}
                            {att.type === 'file' && (
                              <a href={att.url} target="_blank" rel="noopener noreferrer">📎 {att.url}</a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Staff/Chatbot messages (sent) */}
                  {!isCustomer && !hasAttachment && (
                    <div className="chat-area-message-row sent">
                      <div className="chat-area-message-bubble sent">
                        {message.text}
                        {isChatbot && (
                          <div style={{ fontSize: '10px', color: '#999', marginTop: '4px' }}>🤖 Chatbot</div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Staff/Chatbot messages with images */}
                  {!isCustomer && hasAttachment && (
                    <div className="chat-area-message-row sent">
                      <div className="chat-area-message-bubble-image">
                        {message.attachments && message.attachments.map((att, idx) => (
                          <div key={idx} className="chat-area-image-container">
                            {att.type === 'image' && (
                              <>
                                <img src={att.url} alt="attachment" />
                                <button className="chat-area-image-download">
                                  <img src="/assets/4cf588a1-b66c-4acb-ac99-6fe6db0ec42c.png" alt="download" />
                                </button>
                              </>
                            )}
                            {att.type === 'video' && (
                              <video src={att.url} controls style={{ width: '100%', borderRadius: '10px' }} />
                            )}
                          </div>
                        ))}
                        {message.text && (
                          <p className="chat-area-image-caption">{message.text}</p>
                        )}
                        {isChatbot && (
                          <div style={{ fontSize: '10px', color: '#999', padding: '0 10px 5px' }}>🤖 Chatbot</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
        
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
            Chưa có tin nhắn nào
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Tag Selector */}
      {conversation?.tags && conversation.tags.length > 0 && (
        <div className="chat-area-tags">
          <div className="chat-area-tags-scroll">
            <div className="chat-area-tag-row">
              {conversation.tags.map((tag, index) => (
                <span 
                  key={index} 
                  className="chat-area-tag-item" 
                  style={{
                    backgroundColor: `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.4)`
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="chat-area-input">
        <div className="chat-area-input-container">
          <div className="chat-area-input-header">
            <span className="chat-area-input-label">
              {sending ? 'Đang gửi...' : 'Trả lời tin nhắn'}
            </span>
          </div>
          <div className="chat-area-input-row">
            <button className="chat-area-input-action-button">
              <img src="/assets/601ff258-db24-48ef-8a66-5949986974b4.png" alt="emoji" />
            </button>
            <input
              type="text"
              className="chat-area-message-input"
              placeholder="Aa"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={sending}
            />
            <button className="chat-area-input-action-button">
              <img src="/assets/610356be-7e60-430c-98f6-a1d5af448816.png" alt="attach" />
            </button>
            <button className="chat-area-input-action-button notification-badge">
              <img src="/assets/acae7721-3df5-43da-8963-8fafc8dbdfb7.png" alt="notification" />
              <span className="badge"></span>
            </button>
            <button className="chat-area-input-action-button">
              <img src="/assets/4117eeec-97d6-4b59-8d13-2c648a0300f2.png" alt="gift" />
            </button>
            <button className="chat-area-input-action-button">
              <img src="/assets/696a27a1-8972-4395-8945-fbba00f0732e.png" alt="sticker" />
            </button>
            <button className="chat-area-input-action-button">
              <img src="/assets/0ba8b068-f527-4a8f-b5e9-9e0a9c83eb17.png" alt="like" />
            </button>
            <button className="chat-area-input-action-button">
              <img src="/assets/e6cfcaa0-080c-4608-b436-9adf6067aa95.png" alt="camera" />
            </button>
            <button 
              className="chat-area-input-action-button" 
              onClick={handleSendMessage}
              disabled={sending || !inputMessage.trim()}
            >
              <img src="/assets/f8adae6b-1047-40e0-841d-3d3630fb6c01.png" alt="send" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
