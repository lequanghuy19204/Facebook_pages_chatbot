'use client';

import React, { useState } from 'react';
import '@/styles/chat/ChatList.css';

interface Conversation {
  id: string;
  customerName: string;
  lastMessage: string;
  timestamp: string;
  avatar?: string;
  unreadCount?: number;
  isOnline?: boolean;
}

interface ChatListProps {
  onConversationSelect: (conversationId: string) => void;
  selectedConversation: string | null;
}

// Mock data - sẽ thay thế bằng API call thực tế
const mockConversations: Conversation[] = [
  {
    id: '1',
    customerName: 'Hồng Lê',
    lastMessage: 'Ship cod đến tỉnh thành nào?',
    timestamp: '08:18',
    unreadCount: 2,
    isOnline: true
  },
  {
    id: '2',
    customerName: 'Trâm Anh',
    lastMessage: 'Cho em xem thêm mẫu khác được không ạ?',
    timestamp: '07:45',
    unreadCount: 0,
    isOnline: false
  },
  {
    id: '3',
    customerName: 'Minh Tú',
    lastMessage: 'Cảm ơn shop nhiều ạ!',
    timestamp: 'Hôm qua',
    unreadCount: 0,
    isOnline: true
  }
];

export default function ChatList({ onConversationSelect, selectedConversation }: ChatListProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showFilter, setShowFilter] = useState<boolean>(false);
  const [conversations] = useState<Conversation[]>(mockConversations);

  const filteredConversations = conversations.filter(conv =>
    conv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConversationClick = (conversationId: string) => {
    onConversationSelect(conversationId);
  };

  return (
    <div className="chat-list-component">
      {/* Search Header */}
      <div className="chat-list-header">
        <div className="chat-list-search-container">
          <div className="chat-list-search-wrapper">
            <div className="chat-list-search-icon">
              <img src="/search.svg" alt="Tìm kiếm" />
            </div>
            <input
              type="text"
              placeholder="Tìm kiếm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="chat-list-search-input"
            />
          </div>
          <div 
            className="chat-list-filter-button"
            onClick={() => setShowFilter(!showFilter)}
          >
            <div className="chat-list-filter-icon">
              <img src="/list-filter.svg" alt="Lọc theo" />
            </div>
            <span className="chat-list-filter-text">Lọc theo</span>
          </div>
        </div>
      </div>

      {/* Conversations List */}
      <div className="chat-list-conversations">
        {filteredConversations.length > 0 ? (
          filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`chat-list-conversation-item ${selectedConversation === conversation.id ? 'selected' : ''}`}
              onClick={() => handleConversationClick(conversation.id)}
            >
              <div className="chat-list-conversation-avatar">
                {conversation.avatar ? (
                  <img src={conversation.avatar} alt={conversation.customerName} />
                ) : (
                  <div className="chat-list-avatar-placeholder">
                    {conversation.customerName.charAt(0).toUpperCase()}
                  </div>
                )}
                {conversation.isOnline && <div className="chat-list-online-indicator"></div>}
              </div>
              
              <div className="chat-list-conversation-content">
                <div className="chat-list-conversation-header">
                  <h4 className="chat-list-customer-name">{conversation.customerName}</h4>
                  <span className="chat-list-timestamp">{conversation.timestamp}</span>
                </div>
                <div className="chat-list-conversation-footer">
                  <p className="chat-list-last-message">{conversation.lastMessage}</p>
                  {conversation.unreadCount && conversation.unreadCount > 0 && (
                    <div className="chat-list-unread-badge">
                      {conversation.unreadCount}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="chat-list-empty-state">
            <p>Không tìm thấy cuộc hội thoại nào</p>
          </div>
        )}
      </div>

      {/* Filter Panel */}
      {showFilter && (
        <div className="chat-list-filter-panel">
          <div className="chat-list-filter-options">
            <div className="chat-list-filter-option">
              <input type="checkbox" id="unread" />
              <label htmlFor="unread">Chưa đọc</label>
            </div>
            <div className="chat-list-filter-option">
              <input type="checkbox" id="online" />
              <label htmlFor="online">Đang online</label>
            </div>
            <div className="chat-list-filter-option">
              <input type="checkbox" id="today" />
              <label htmlFor="today">Hôm nay</label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
