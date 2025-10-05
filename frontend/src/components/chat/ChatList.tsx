'use client';

import React, { useState, useEffect } from 'react';
import '@/styles/chat/ChatList.css';
import ApiService, { FacebookConversation } from '@/services/api';
import socketService from '@/services/socket';

interface ChatListProps {
  onConversationSelect: (conversationId: string) => void;
  selectedConversation: string | null;
}

export default function ChatList({ onConversationSelect, selectedConversation }: ChatListProps) {
  const [conversations, setConversations] = useState<FacebookConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState<'all' | 'messenger' | 'comment'>('all');

  // Fetch conversations from API
  const fetchConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if we're in browser environment
      if (typeof window === 'undefined') {
        return;
      }

      const token = localStorage.getItem('auth_token');
      if (!token) {
        setError('Vui lòng đăng nhập để xem cuộc hội thoại');
        setLoading(false);
        return;
      }

      const params: any = {
        page: 1,
        limit: 50,
      };

      if (filterSource !== 'all') {
        params.source = filterSource;
      }

      if (searchQuery) {
        params.search = searchQuery;
      }

      const result = await ApiService.messaging.getConversations(token, params);
      setConversations(result.conversations);
    } catch (err: any) {
      console.error('Failed to fetch conversations:', err);
      setError(err.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, [filterSource]);

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchConversations();
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Setup Socket.IO listeners
  useEffect(() => {
    // Check if we're in browser environment
    if (typeof window === 'undefined') {
      return;
    }

    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.log('No token found, skipping socket connection');
      return;
    }

    // Connect socket if not already connected
    if (!socketService.isConnected()) {
      socketService.connect(token);
    }

    // Listen for new messages
    const handleNewMessage = (message: any) => {
      console.log('New message received:', message);
      
      // Socket sends message object directly, not nested in data
      if (!message || !message.conversation_id) {
        console.warn('Invalid message format:', message);
        return;
      }

      // Update conversation in list and move to top
      setConversations(prev => {
        const updated = prev.map(conv => 
          conv.conversation_id === message.conversation_id
            ? {
                ...conv,
                last_message_text: message.text || '',
                last_message_at: new Date(message.sent_at),
                last_message_from: message.sender_type,
                unread_count: message.sender_type === 'customer' 
                  ? conv.unread_count + 1 
                  : conv.unread_count,
              }
            : conv
        );
        
        // Sort by last_message_at descending (newest first)
        return updated.sort((a, b) => {
          const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
          const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
          return timeB - timeA;
        });
      });
    };

    // Listen for conversation updates
    const handleConversationUpdated = (data: any) => {
      console.log('Conversation updated:', data);
      setConversations(prev =>
        prev.map(conv =>
          conv.conversation_id === data.conversation_id
            ? { ...conv, ...data }
            : conv
        )
      );
    };

    // Listen for new conversations
    const handleNewConversation = (data: any) => {
      console.log('New conversation:', data);
      setConversations(prev => [data, ...prev]);
    };

    socketService.onNewMessage(handleNewMessage);
    socketService.onConversationUpdated(handleConversationUpdated);
    socketService.onNewConversation(handleNewConversation);

    // Cleanup
    return () => {
      socketService.off('new_message', handleNewMessage);
      socketService.off('conversation_updated', handleConversationUpdated);
      socketService.off('new_conversation', handleNewConversation);
    };
  }, []);

  // Format time
  const formatTime = (date?: Date) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } else if (days < 7) {
      return `${days} ngày trước`;
    } else {
      return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    }
  };

  // Get reply icon based on sender
  const getReplyIcon = (lastMessageFrom?: 'customer' | 'chatbot' | 'staff') => {
    // Only show icon if message is from chatbot or staff
    if (lastMessageFrom === 'chatbot' || lastMessageFrom === 'staff') {
      return <img src="/reply.png" alt="reply" />;
    }
    return null;
  };

  return (
    <div className="chat-list-container">
      {/* Search and Filter Header */}
      <div className="chat-list-header">
        <div className="chat-list-search-box">
          <div className="chat-list-search-icon">
            <img src="/search.svg" alt="Search" />
          </div>
          <input 
            type="text" 
            placeholder="Tìm kiếm" 
            className="chat-list-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="chat-list-filter-button">
          <div className="chat-list-filter-icon">
            <img src="/list-filter.svg" alt="Filter" />
          </div>
          <select 
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value as 'all' | 'messenger' | 'comment')}
            style={{ 
              border: 'none', 
              background: 'transparent', 
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">Tất cả</option>
            <option value="messenger">Messenger</option>
            <option value="comment">Comment</option>
          </select>
        </div>
      </div>

      {/* Message List */}
      <div className="chat-list-messages">
        {loading && <div style={{ padding: '20px', textAlign: 'center' }}>Đang tải...</div>}
        
        {error && (
          <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
            {error}
          </div>
        )}

        {!loading && !error && conversations.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            Không có cuộc hội thoại nào
          </div>
        )}

        {!loading && !error && conversations.map((conversation) => (
          <div
            key={conversation.conversation_id}
            className={`chat-list-item ${selectedConversation === conversation.conversation_id ? 'chat-list-selected' : ''} ${conversation.unread_count > 0 ? 'chat-list-unread' : ''}`}
            onClick={() => onConversationSelect(conversation.conversation_id)}
          >
            <div className="chat-list-item-content">
              <div className="chat-list-avatar">
                <img 
                  src={
                    (conversation as any).customer_profile_pic || 
                    conversation.customer?.profile_pic || 
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      (conversation as any).customer_name || 
                      conversation.customer?.name || 
                      'User'
                    )}&background=random&size=200`
                  } 
                  alt={
                    (conversation as any).customer_name || 
                    conversation.customer?.name || 
                    'User'
                  }
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    const name = (conversation as any).customer_name || conversation.customer?.name || 'User';
                    img.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=200`;
                  }}
                />
              </div>
              <div className="chat-list-details">
                <div className="chat-list-header-row">
                  <div className="chat-list-name-wrapper">
                    <div className="chat-list-name">
                      {(conversation as any).customer_name || 
                       conversation.customer?.name || 
                       'Unknown User'}
                    </div>
                  </div>
                  <div className="chat-list-header-right">
                    <div className="chat-list-time">
                      {formatTime(conversation.last_message_at)}
                    </div>
                    <div className="chat-list-message-icon">
                      <img 
                        src={conversation.source === 'comment' ? '/comment.png' : '/message.png'} 
                        alt={conversation.source === 'comment' ? 'comment' : 'message'} 
                      />
                    </div>
                  </div>
                </div>
                <div className="chat-list-message-preview">
                  {getReplyIcon(conversation.last_message_from) && (
                    <div className="chat-list-message-icon">
                      {getReplyIcon(conversation.last_message_from)}
                    </div>
                  )}
                  <div className="chat-list-message-text">
                    {conversation.last_message_text || 'Không có tin nhắn'}
                  </div>
                  {conversation.unread_count > 0 && (
                    <div className="chat-list-unread-badge">
                      {conversation.unread_count}
                    </div>
                  )}
                </div>
                {conversation.tags && conversation.tags.length > 0 && (
                  <div className="chat-list-tags">
                    <div className="chat-list-tags-container">
                      {conversation.tags.map((tag, index) => (
                        <span key={index} className={`chat-list-tag chat-list-tag-${index % 3}`}>
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
