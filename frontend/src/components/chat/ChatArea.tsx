'use client';

import React, { useState, useRef } from 'react';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import TagManagement from './TagManagement';
import MessageInput from './MessageInput';
import '@/styles/chat/ChatArea.css';

interface ChatAreaProps {
  conversationId: string | null;
  onToggleRightPanel: () => void;
  showRightPanel: boolean;
}

export default function ChatArea({ conversationId, onToggleRightPanel, showRightPanel }: ChatAreaProps) {
  const [message, setMessage] = useState<string>('');
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  const handleSendMessage = (messageText: string) => {
    if (!messageText.trim() || !conversationId) return;
    
    // TODO: Implement send message logic
    console.log('Sending message:', messageText);
    setMessage('');
  };

  const handleTagSelect = (tag: string) => {
    // TODO: Implement tag assignment logic
    console.log('Selected tag:', tag);
  };

  if (!conversationId) {
    return (
      <div className="chat-area-component">
        <div className="chat-area-no-conversation">
          <div className="chat-area-empty-state">
            <div className="chat-area-empty-icon">💬</div>
            <h3>Chọn một cuộc hội thoại</h3>
            <p>Chọn một cuộc hội thoại từ danh sách bên trái để bắt đầu nhắn tin</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-area-component">
      {/* Chat Header */}
      <ChatHeader 
        conversationId={conversationId}
        onToggleRightPanel={onToggleRightPanel}
        showRightPanel={showRightPanel}
      />

      {/* Messages Area */}
      <div className="chat-area-messages">
        <MessageList conversationId={conversationId} />
      </div>

      {/* Tag Management */}
      <TagManagement 
        conversationId={conversationId}
        onTagSelect={handleTagSelect}
      />

      {/* Message Input */}
      <MessageInput 
        value={message}
        onChange={setMessage}
        onSend={handleSendMessage}
        ref={messageInputRef}
      />
    </div>
  );
}
