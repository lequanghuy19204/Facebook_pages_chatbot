'use client';

import React from 'react';
import '@/styles/chat/ChatList.css';

interface Message {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  isRead: boolean;
  tags?: string[];
  hasNotification?: boolean;
  type?: 'message' | 'comment'; // Add type field
}

interface ChatListProps {
  onConversationSelect: (conversationId: string) => void;
  selectedConversation: string | null;
}

const mockMessages: Message[] = [
  {
    id: '1',
    name: 'Nhật Anh',
    avatar: '/assets/13c59eac-8b74-41a1-b5b5-28018281634a.png',
    lastMessage: '[Botcake] Dạ Mẫu này nhà em lên dáng cực chuẩ…',
    time: '04.07',
    isRead: false,
    tags: ['P. lê', 'Huyền'],
    hasNotification: true,
    type: 'message'
  },
  {
    id: '2',
    name: 'Hoàng Phúc Hồ',
    avatar: '/assets/e80e93d7-ad99-47e7-9426-200b663b187b.png',
    lastMessage: '[Botcake] Dạ Mẫu này nhà em lên dáng cực chuẩ…',
    time: '04.07',
    isRead: false,
    tags: ['P. lê', 'KCGM', 'Huyền'],
    hasNotification: true,
    type: 'message'
  },
  {
    id: '3',
    name: 'Nguyễn Minh Tú',
    avatar: '/assets/35c419ab-d398-4f7d-a2a4-e48fc51e2de8.png',
    lastMessage: 'Anh muốn mặc vừa người hay rộng thoải mái để …',
    time: '04.07',
    isRead: true,
    hasNotification: true,
    type: 'message'
  },
  {
    id: '4',
    name: 'Hoàng Hiệp',
    avatar: '/assets/f4501a75-d6c4-45b5-8532-9e8b97409db8.png',
    lastMessage: '[Botcake] Dạ mặc em này diện đi chơi , đi tiệc ho…',
    time: '04.07',
    isRead: true,
    hasNotification: true,
    type: 'comment'
  },
  {
    id: '5',
    name: 'Ngô Văn Lợi',
    avatar: '/assets/89e383b4-0978-4cf0-94c5-14356e9ccc7f.png',
    lastMessage: 'Ngô Văn Lợi cho em xin chiều cao và cân nặng đ…',
    time: '04.07',
    isRead: true,
    hasNotification: true,
    type: 'comment'
  }
];

export default function ChatList({ onConversationSelect, selectedConversation }: ChatListProps) {
  return (
    <div className="chat-list-container">
      {/* Search and Filter Header */}
      <div className="chat-list-header">
        <div className="chat-list-search-box">
          <div className="chat-list-search-icon">
            <img src="/search.svg" alt="Search" />
          </div>
          <input type="text" placeholder="Tìm kiếm" className="chat-list-search-input" />
        </div>
        <div className="chat-list-filter-button">
          <div className="chat-list-filter-icon">
            <img src="/list-filter.svg" alt="Filter" />
          </div>
          <span>Lọc theo</span>
        </div>
      </div>

      {/* Message List */}
      <div className="chat-list-messages">
        {mockMessages.map((message) => (
          <div
            key={message.id}
            className={`chat-list-item ${selectedConversation === message.id ? 'chat-list-selected' : ''}`}
            onClick={() => onConversationSelect(message.id)}
          >
            <div className="chat-list-item-content">
              <div className="chat-list-avatar">
                <img src={message.avatar} alt={message.name} />
              </div>
              <div className="chat-list-details">
                <div className="chat-list-header-row">
                  <div className="chat-list-name-wrapper">
                    <div className="chat-list-name">{message.name}</div>
                  </div>
                  <div className="chat-list-header-right">
                    <div className="chat-list-time">{message.time}</div>
                    <div className="chat-list-message-icon">
                      <img 
                        src={message.type === 'comment' ? '/comment.png' : '/message.png'} 
                        alt={message.type === 'comment' ? 'comment' : 'message'} 
                      />
                    </div>
                  </div>
                </div>
                <div className="chat-list-message-preview">
                  <div className="chat-list-message-icon">
                    <img src="/reply.png" alt="message" />
                  </div>
                  <div className="chat-list-message-text">{message.lastMessage}</div>
                </div>
                {message.tags && message.tags.length > 0 && (
                  <div className="chat-list-tags">
                    <div className="chat-list-tags-container">
                      {message.tags.map((tag, index) => (
                        <span key={index} className={`chat-list-tag chat-list-tag-${index}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="chat-list-divider"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
