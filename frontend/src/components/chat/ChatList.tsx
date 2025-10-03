'use client';

import React, { useState, useEffect, useCallback } from 'react';
import '@/styles/chat/ChatList.css';
import ApiService from '@/services/api';
import socketService from '@/services/socket';
import { useAuth } from '@/contexts/AuthContext';

interface Conversation {
  conversation_id: string;
  customer_id: string;
  customer_name?: string;
  customer_profile_pic?: string;
  last_message_text?: string;
  last_message_at?: string;
  last_message_from?: 'customer' | 'chatbot' | 'staff';
  unread_count?: number;
  status: 'open' | 'closed' | 'archived';
  current_handler: 'chatbot' | 'human';
  source: 'messenger' | 'comment';
  needs_attention: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  page_id: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}

interface ChatListProps {
  onConversationSelect: (conversationId: string) => void;
  selectedConversation: string | null;
}

export default function ChatList({ onConversationSelect, selectedConversation }: ChatListProps) {
  const { token } = useAuth();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showFilter, setShowFilter] = useState<boolean>(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [filterUnread, setFilterUnread] = useState<boolean>(false);
  const [filterToday, setFilterToday] = useState<boolean>(false);
  const [filterStatus, setFilterStatus] = useState<string>('open');

  // Format timestamp to display format
  const formatTimestamp = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút`;
    if (diffHours < 24) return `${diffHours} giờ`;
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 7) return `${diffDays} ngày`;
    
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  // Load conversations from API
  const loadConversations = useCallback(async () => {
    if (!token) {
      setError('No authentication token');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params: any = {
        page: 1,
        limit: 50,
        status: filterStatus,
      };

      if (filterUnread) {
        params.needsAttention = true;
      }

      if (searchQuery) {
        params.search = searchQuery;
      }

      const response = await ApiService.messaging.getConversations(token, params);
      setConversations(response.conversations);
    } catch (err: any) {
      console.error('Failed to load conversations:', err);
      setError(err.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, [token, searchQuery, filterUnread, filterStatus]);

  // Initial load
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Setup Socket.IO event listeners
  useEffect(() => {
    if (!token) return;

    // Connect to socket
    if (!socketService.isConnected()) {
      socketService.connect(token);
    }

    // Handle new conversation
    const handleNewConversation = (data: any) => {
      console.log('New conversation received:', data);
      // Reload conversations to get full data
      loadConversations();
    };

    // Handle conversation update
    const handleConversationUpdate = (data: any) => {
      console.log('Conversation updated:', data);
      
      setConversations(prev => {
        const index = prev.findIndex(c => c.conversation_id === data.conversation_id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = { ...updated[index], ...data };
          return updated;
        }
        return prev;
      });
    };

    // Handle new message
    const handleNewMessage = (data: any) => {
      console.log('New message received:', data);
      
      setConversations(prev => {
        const index = prev.findIndex(c => c.conversation_id === data.conversation_id);
        if (index >= 0) {
          const updated = [...prev];
          const conversation = { ...updated[index] };
          
          // Update last message info
          conversation.last_message_text = data.text;
          conversation.last_message_at = data.sent_at;
          conversation.last_message_from = data.sender_type;
          
          // Update unread count if message is from customer
          if (data.sender_type === 'customer') {
            conversation.unread_count = (conversation.unread_count || 0) + 1;
            conversation.needs_attention = true;
          }
          
          // Move conversation to top
          updated.splice(index, 1);
          updated.unshift(conversation);
          
          return updated;
        } else {
          // New conversation with first message - reload list
          loadConversations();
        }
        return prev;
      });
    };

    socketService.onNewConversation(handleNewConversation);
    socketService.onConversationUpdated(handleConversationUpdate);
    socketService.onNewMessage(handleNewMessage);

    // Cleanup on unmount
    return () => {
      socketService.off('new_conversation', handleNewConversation);
      socketService.off('conversation_updated', handleConversationUpdate);
      socketService.off('new_message', handleNewMessage);
    };
  }, [token, loadConversations]);

  // Filter conversations based on search and filters
  const filteredConversations = conversations.filter(conv => {
    // Search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const customerName = conv.customer_name?.toLowerCase() || '';
      const lastMessage = conv.last_message_text?.toLowerCase() || '';
      
      if (!customerName.includes(searchLower) && !lastMessage.includes(searchLower)) {
        return false;
      }
    }

    // Unread filter
    if (filterUnread && (!conv.unread_count || conv.unread_count === 0)) {
      return false;
    }

    // Today filter
    if (filterToday) {
      const messageDate = new Date(conv.last_message_at || conv.created_at);
      const today = new Date();
      if (messageDate.toDateString() !== today.toDateString()) {
        return false;
      }
    }

    return true;
  });

  const handleConversationClick = async (conversationId: string) => {
    onConversationSelect(conversationId);
    
    if (!token) return;

    // Mark as read
    try {
      await ApiService.messaging.markAsRead(token, conversationId);
      
      // Update local state
      setConversations(prev =>
        prev.map(c =>
          c.conversation_id === conversationId
            ? { ...c, unread_count: 0, needs_attention: false }
            : c
        )
      );
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
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
        {loading ? (
          <div className="chat-list-loading">
            <p>Đang tải...</p>
          </div>
        ) : error ? (
          <div className="chat-list-error">
            <p>Lỗi: {error}</p>
            <button onClick={loadConversations}>Thử lại</button>
          </div>
        ) : filteredConversations.length > 0 ? (
          filteredConversations.map((conversation) => (
            <div
              key={conversation.conversation_id}
              className={`chat-list-conversation-item ${
                selectedConversation === conversation.conversation_id ? 'selected' : ''
              } ${conversation.needs_attention ? 'needs-attention' : ''}`}
              onClick={() => handleConversationClick(conversation.conversation_id)}
            >
              <div className="chat-list-conversation-avatar">
                {conversation.customer_profile_pic ? (
                  <img src={conversation.customer_profile_pic} alt={conversation.customer_name} />
                ) : (
                  <div className="chat-list-avatar-placeholder">
                    {(conversation.customer_name || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              
              <div className="chat-list-conversation-content">
                <div className="chat-list-conversation-header">
                  <h4 className="chat-list-customer-name">
                    {conversation.customer_name || 'Unknown User'}
                    {conversation.source === 'comment' && (
                      <span className="chat-list-source-badge">Comment</span>
                    )}
                  </h4>
                  <span className="chat-list-timestamp">
                    {formatTimestamp(conversation.last_message_at || conversation.created_at)}
                  </span>
                </div>
                <div className="chat-list-conversation-footer">
                  <p className="chat-list-last-message">
                    {conversation.last_message_from === 'staff' && 'Bạn: '}
                    {conversation.last_message_from === 'chatbot' && 'Bot: '}
                    {conversation.last_message_text || 'Chưa có tin nhắn'}
                  </p>
                  {conversation.unread_count && conversation.unread_count > 0 && (
                    <div className="chat-list-unread-badge">
                      {conversation.unread_count}
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
              <input 
                type="checkbox" 
                id="unread" 
                checked={filterUnread}
                onChange={(e) => setFilterUnread(e.target.checked)}
              />
              <label htmlFor="unread">Chưa đọc</label>
            </div>
            <div className="chat-list-filter-option">
              <input 
                type="checkbox" 
                id="today"
                checked={filterToday}
                onChange={(e) => setFilterToday(e.target.checked)}
              />
              <label htmlFor="today">Hôm nay</label>
            </div>
            <div className="chat-list-filter-option">
              <label htmlFor="status">Trạng thái:</label>
              <select 
                id="status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="open">Đang mở</option>
                <option value="closed">Đã đóng</option>
                <option value="archived">Đã lưu trữ</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
