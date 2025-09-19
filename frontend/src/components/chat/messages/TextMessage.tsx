'use client';

import React from 'react';
import '@/styles/chat/messages/TextMessage.css';

interface Message {
  id: string;
  content: string;
  sender: 'customer' | 'admin' | 'system';
  timestamp: string;
  isRead?: boolean;
}

interface TextMessageProps {
  message: Message;
}

export default function TextMessage({ message }: TextMessageProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const isFromCustomer = message.sender === 'customer';

  return (
    <div className={`text-message-component ${isFromCustomer ? 'customer' : 'admin'}`}>
      <div className="text-message-row">
        {!isFromCustomer && (
          <div className="text-message-admin-avatar">
            <div className="text-message-avatar-placeholder">CS</div>
          </div>
        )}
        
        <div className="text-message-content">
          <div className={`text-message-bubble ${isFromCustomer ? 'customer-bubble' : 'admin-bubble'}`}>
            <div className="text-message-text">
              {message.content.split('\n').map((line, index) => (
                <div key={index}>
                  {line}
                  {index < message.content.split('\n').length - 1 && <br />}
                </div>
              ))}
            </div>
          </div>
          
          <div className="text-message-info">
            <span className="text-message-time">{formatTime(message.timestamp)}</span>
            {!isFromCustomer && message.isRead !== undefined && (
              <div className={`text-message-read-status ${message.isRead ? 'read' : 'unread'}`}>
                {message.isRead ? '✓✓' : '✓'}
              </div>
            )}
          </div>
        </div>

        {isFromCustomer && (
          <div className="text-message-customer-avatar">
            <div className="text-message-avatar-placeholder">
              {message.content.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
