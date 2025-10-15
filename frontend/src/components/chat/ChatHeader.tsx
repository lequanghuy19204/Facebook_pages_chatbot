'use client';

import React from 'react';
import { FacebookConversation } from '@/services/api';
import '@/styles/chat/ChatArea.css';

interface ChatHeaderProps {
  conversation: FacebookConversation | null;
  actionLoading: boolean;
  onToggleHandler: () => void;
  onMarkUnread: () => void;
  onToggleRightPanel: () => void;
}

const ChatHeader = React.memo(({ 
  conversation, 
  actionLoading, 
  onToggleHandler, 
  onMarkUnread, 
  onToggleRightPanel 
}: ChatHeaderProps) => {
  const getCustomerName = () => {
    if (!conversation) return 'Khách hàng';
    return conversation.customer_name || 'Khách hàng';
  };

  const getCustomerAvatar = () => {
    if (!conversation) return 'https://ui-avatars.com/api/?name=User&background=random&size=200';
    return conversation.customer_profile_pic_url || conversation.customer_profile_pic || 
      `https://ui-avatars.com/api/?name=${encodeURIComponent(getCustomerName())}&background=random&size=200`;
  };

  const formatDateBadge = (date?: Date | string) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatReadTime = (date?: Date | string) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  const getStatusText = () => {
    if (!conversation) return 'Chưa ai đọc';
    
    // Nếu có người đọc (read_by_user_name có giá trị)
    if (conversation.read_by_user_name && conversation.read_at) {
      return `Đã đọc bởi ${conversation.read_by_user_name} - ${formatReadTime(conversation.read_at)}`;
    }
    
    // Nếu chưa ai đọc
    return 'Chưa ai đọc';
  };

  return (
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
            {getStatusText()}
          </div>
        </div>
      </div>
      <div className="chat-area-header-right-actions">
        <button 
          className="chat-area-icon-button" 
          onClick={onToggleHandler}
          disabled={actionLoading}
          title={conversation?.current_handler === 'chatbot' ? 'Chuyển sang xử lý thủ công' : 'Chuyển về chatbot'}
        >
          {conversation?.current_handler === 'chatbot' ? (
            <img src="/chat-bot.svg" alt="toggle-handler" className='chat-area-icon-button-img'/>
          ) : (
            <img src="/human.svg" alt="toggle-handler" className='chat-area-icon-button-img'/>
          )}
        </button>
        <button 
          className="chat-area-icon-button" 
          onClick={onMarkUnread}
          disabled={actionLoading}
          title="Đánh dấu chưa đọc"
        >
          <img src="mark-unread.svg" alt="mark-unread" />
        </button>
        <button className="chat-area-icon-button" onClick={onToggleRightPanel}>
          <img src="/assets/dc5ccc5a-a725-412d-ab2c-b7f1faf4fafb.png" alt="more" />
        </button>
      </div>
    </div>
  );
});

ChatHeader.displayName = 'ChatHeader';

export default ChatHeader;

