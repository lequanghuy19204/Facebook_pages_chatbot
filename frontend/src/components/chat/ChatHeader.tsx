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
  const customer = mockCustomer; // TODO: Fetch customer data based on conversationId

  const actionButtons = [
    { icon: '📞', tooltip: 'Gọi điện', action: () => console.log('Call') },
    { icon: '📧', tooltip: 'Email', action: () => console.log('Email') },
    { icon: '🔗', tooltip: 'Liên kết', action: () => console.log('Link') },
    { icon: '⭐', tooltip: 'Đánh dấu', action: () => console.log('Star') }
  ];

  const toolButtons = [
    { icon: '📎', tooltip: 'Đính kèm', action: () => console.log('Attach') },
    { icon: '📷', tooltip: 'Camera', action: () => console.log('Camera') },
    { icon: '🎵', tooltip: 'Âm thanh', action: () => console.log('Audio') },
    { icon: '📊', tooltip: 'Thống kê', action: () => console.log('Analytics') }
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
            {customer.isOnline && <div className="chat-header-online-status">●</div>}
          </div>
          <p className="chat-header-last-seen">{customer.lastSeen}</p>
          
          <div className="chat-header-actions">
            {actionButtons.map((button, index) => (
              <button
                key={index}
                className="chat-header-action-button"
                onClick={button.action}
                title={button.tooltip}
              >
                {button.icon}
              </button>
            ))}
          </div>
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
            {button.icon}
          </button>
        ))}
        
        <button
          className={`chat-header-panel-toggle ${showRightPanel ? 'active' : ''}`}
          onClick={onToggleRightPanel}
          title={showRightPanel ? 'Ẩn panel thông tin' : 'Hiện panel thông tin'}
        >
          {showRightPanel ? '▶' : '◀'}
        </button>
      </div>
    </div>
  );
}
