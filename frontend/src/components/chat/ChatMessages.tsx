'use client';

import React from 'react';
import { FacebookMessage, FacebookConversation } from '@/services/api';
import PostDisplay from './PostDisplay';
import '@/styles/chat/ChatArea.css';

interface ChatMessagesProps {
  messages: FacebookMessage[];
  conversation: FacebookConversation | null;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

const ChatMessages = React.memo(({ messages, conversation, messagesEndRef }: ChatMessagesProps) => {
  console.log('ChatMessages rendering with:', {
    messagesCount: messages.length,
    conversationId: conversation?.conversation_id,
    messages: messages
  });

  const formatTime = (date?: Date | string) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const getCustomerName = () => {
    if (!conversation) return 'Khách hàng';
    return conversation.customer_name || 'Khách hàng';
  };

  const getCustomerAvatar = () => {
    if (!conversation) return 'https://ui-avatars.com/api/?name=User&background=random&size=200';
    return conversation.customer_profile_pic || 
      `https://ui-avatars.com/api/?name=${encodeURIComponent(getCustomerName())}&background=random&size=200`;
  };

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

  // Check if this is the last message in a consecutive sender group
  const isLastInGroup = (currentIndex: number, messagesInDate: FacebookMessage[]) => {
    // Last message in array is always last in group
    if (currentIndex === messagesInDate.length - 1) return true;
    
    const currentMsg = messagesInDate[currentIndex];
    const nextMsg = messagesInDate[currentIndex + 1];
    
    // If next message is from different sender, current is last in group
    return currentMsg.sender_type !== nextMsg.sender_type;
  };

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="chat-area-messages">
      {/* Hiển thị Post nếu source là comment */}
      {conversation && conversation.source === 'comment' && (
        <PostDisplay conversation={conversation} />
      )}
      
      {messages.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
          Chưa có tin nhắn nào
        </div>
      ) : (
        <>
          {Object.keys(messageGroups).map(dateKey => (
            <React.Fragment key={dateKey}>
              <div className="chat-area-messages-date-badge">
                <span>{dateKey}</span>
              </div>
              
              {messageGroups[dateKey].map((message, msgIndex) => {
                const isCustomer = message.sender_type === 'customer';
                const isChatbot = message.sender_type === 'chatbot';
                const hasAttachment = message.attachments && message.attachments.length > 0;
                const showAvatar = isLastInGroup(msgIndex, messageGroups[dateKey]);
                
                console.log('Rendering message:', message.message_id, message.sender_type, message.text);
                
                return (
                  <div key={message.message_id} className={`message-wrapper ${isCustomer ? 'received' : 'sent'}`}>
                    {/* Customer messages (received) */}
                    {isCustomer && (
                      <div className="chat-area-message-row received">
                        {/* Avatar chỉ hiển thị ở tin nhắn cuối cùng trong nhóm */}
                        {showAvatar ? (
                          <img 
                            src={getCustomerAvatar()} 
                            alt="avatar" 
                            className="chat-area-message-avatar"
                            onError={(e) => {
                              const img = e.target as HTMLImageElement;
                              img.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(getCustomerName())}&background=random&size=200`;
                            }}
                          />
                        ) : (
                          <div className="chat-area-message-avatar" style={{ visibility: 'hidden' }} />
                        )}
                        <div className="chat-area-message-bubble received" style={{ whiteSpace: 'pre-wrap' }}>
                          {message.text}
                          {hasAttachment && message.attachments && (
                            <div className="chat-area-images-grid-received" style={{ marginTop: message.text ? '8px' : '0' }}>
                              {message.attachments.map((att, idx) => (
                                <div key={idx} className="chat-area-image-item-received">
                                  {att.type === 'image' && (
                                    <img src={att.facebook_url} alt="attachment" />
                                  )}
                                  {att.type === 'video' && (
                                    <video src={att.facebook_url} controls style={{ width: '100%', borderRadius: '8px' }} />
                                  )}
                                  {att.type === 'file' && (
                                    <a href={att.facebook_url} target="_blank" rel="noopener noreferrer">📎 {att.filename}</a>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* Thời gian hiển thị bên cạnh bubble */}
                        <div style={{ 
                          fontSize: '11px', 
                          color: '#65676b', 
                          alignSelf: 'flex-end',
                          marginLeft: '6px',
                          marginBottom: '4px',
                          whiteSpace: 'nowrap'
                        }}>
                          {formatTime(message.sent_at)}
                        </div>
                      </div>
                    )}
                    
                    {/* Staff/Chatbot messages (sent) */}
                    {!isCustomer && !hasAttachment && (
                      <div className="chat-area-message-row sent">
                        {/* Tên người gửi và thời gian bên trái */}
                        <div style={{ 
                          fontSize: '11px', 
                          color: '#65676b',
                          display: 'flex',
                          gap: '6px',
                          alignItems: 'flex-end',
                          marginRight: '8px',
                          marginBottom: '4px',
                          whiteSpace: 'nowrap'
                        }}>
                          <span>{isChatbot ? '🤖 Chatbot' : message.sender_name}</span>
                          <span>•</span>
                          <span>{formatTime(message.sent_at)}</span>
                        </div>
                        {/* Bubble tin nhắn */}
                        <div className="chat-area-message-bubble sent" style={{ whiteSpace: 'pre-wrap' }}>
                          {message.text}
                        </div>
                      </div>
                    )}
                    
                    {/* Staff/Chatbot messages with images */}
                    {!isCustomer && hasAttachment && (
                      <div className="chat-area-message-row sent">
                        {/* Tên người gửi và thời gian bên trái */}
                        <div style={{ 
                          fontSize: '11px', 
                          color: '#65676b',
                          display: 'flex',
                          gap: '6px',
                          alignItems: 'flex-end',
                          marginRight: '8px',
                          marginBottom: '4px',
                          whiteSpace: 'nowrap'
                        }}>
                          <span>{isChatbot ? '🤖 Chatbot' : message.sender_name || 'Staff'}</span>
                          <span>•</span>
                          <span>{formatTime(message.sent_at)}</span>
                        </div>
                        {/* Bubble ảnh/video */}
                        <div className="chat-area-message-bubble-image">
                          <div className="chat-area-images-grid">
                            {message.attachments && message.attachments.map((att, idx) => (
                              <div key={idx} className="chat-area-image-item">
                                {att.type === 'image' && (
                                  <>
                                    <img src={att.facebook_url} alt="attachment" />
                                    <button className="chat-area-image-download">
                                      <img src="/assets/4cf588a1-b66c-4acb-ac99-6fe6db0ec42c.png" alt="download" />
                                    </button>
                                  </>
                                )}
                                {att.type === 'video' && (
                                  <video src={att.facebook_url} controls style={{ width: '100%', borderRadius: '8px' }} />
                                )}
                              </div>
                            ))}
                          </div>
                          {message.text && (
                            <p className="chat-area-image-caption" style={{ whiteSpace: 'pre-wrap' }}>{message.text}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
});

ChatMessages.displayName = 'ChatMessages';

export default ChatMessages;

