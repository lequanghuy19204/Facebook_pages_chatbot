'use client';

import React from 'react';
import { FacebookConversation } from '@/services/api';
import '@/styles/chat/ChatArea.css';

interface ChatInputProps {
  conversation: FacebookConversation | null;
  inputMessage: string;
  sending: boolean;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
}

const ChatInput = React.memo(({ 
  conversation, 
  inputMessage, 
  sending, 
  onInputChange, 
  onSendMessage,
  onKeyPress 
}: ChatInputProps) => {
  return (
    <>
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
              onChange={(e) => onInputChange(e.target.value)}
              onKeyPress={onKeyPress}
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
              onClick={onSendMessage}
              disabled={sending || !inputMessage.trim()}
            >
              <img src="/assets/f8adae6b-1047-40e0-841d-3d3630fb6c01.png" alt="send" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
});

ChatInput.displayName = 'ChatInput';

export default ChatInput;

