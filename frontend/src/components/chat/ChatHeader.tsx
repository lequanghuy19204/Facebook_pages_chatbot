'use client';

import React from 'react';
import '@/styles/chat/ChatHeader.css';

interface Customer {
  id: string;
  name: string;
  avatar?: string;
  lastSeen: string;
  isOnline: boolean;
}

interface ChatHeaderProps {
  conversationId: string;
  onToggleRightPanel: () => void;
  showRightPanel: boolean;
}

// Mock data - sẽ thay thế bằng API call thực tế
const mockCustomer: Customer = {
  id: '1',
  name: 'Hồng Lê',
  lastSeen: 'Đã xem bởi Trâm Anh Phan - 08:18',
  isOnline: true
};

export default function ChatHeader({ conversationId, onToggleRightPanel, showRightPanel }: ChatHeaderProps) {
  const customer = mockCustomer;

  const toolButtons = [
    { icon: '/apps-list-detail.svg', tooltip: 'Tất cả các cuộc hội thoại của người dùng này', action: () => console.log('Tất cả các cuộc hội thoại của người dùng này') },
    { icon: '/mark-not-read.svg', tooltip: 'Đánh dấu chưa đọc', action: () => console.log('Đánh dấu chưa đọc') },
  ];

  return (
    <div className="chat-header-component">
      <div className="chat-header-customer-info">
        <div className="chat-header-avatar">
          {customer.avatar ? (
            <img src={customer.avatar} alt={customer.name} />
          ) : (
            <div className="chat-header-avatar-placeholder">
              {customer.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        
        <div className="chat-header-details">
          <div className="chat-header-name-section">
            <h3 className="chat-header-name">{customer.name}</h3>
          </div>
          <p className="chat-header-last-seen">{customer.lastSeen}</p>
        </div>
      </div>

      <div className="chat-header-tools">
        {toolButtons.map((button, index) => (
          <button
            key={index}
            className="chat-header-tool-button"
            onClick={button.action}
            title={button.tooltip}
          >
            <img src={button.icon} alt={button.tooltip} />
          </button>
        ))}
        
        <button
          className={`chat-header-panel-toggle ${showRightPanel ? 'active' : ''}`}
          onClick={onToggleRightPanel}
          title={showRightPanel ? 'Ẩn panel thông tin' : 'Hiện panel thông tin'}
        >
          <img src="/info-panel.svg" alt="Toggle Info Panel" />
        </button>
      </div>
    </div>
  );
}
