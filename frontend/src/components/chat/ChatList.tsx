'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import '@/styles/chat/ChatList.css';
import ApiService, { FacebookConversation, FacebookTag } from '@/services/api';
import socketService from '@/services/socket';

interface ChatListProps {
  onConversationSelect: (conversationId: string) => void;
  selectedConversation: string | null;
  sidebarFilter?: {
    type: 'all' | 'unread' | 'comments' | 'messages' | 'phone' | 'no-phone' | 'time';
    startDate?: Date;
    endDate?: Date;
  };
}

export default function ChatList({ onConversationSelect, selectedConversation, sidebarFilter }: ChatListProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<FacebookConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState<'all' | 'messenger' | 'comment'>('all');
  const [tagsMap, setTagsMap] = useState<Map<string, FacebookTag>>(new Map());
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalConversations, setTotalConversations] = useState(0);
  const limit = 30;

  const CACHE_DURATION = 5 * 60 * 1000; // 5 phút

  // Helper function to deduplicate conversations by conversation_id
  const deduplicateConversations = (conversations: FacebookConversation[]): FacebookConversation[] => {
    const seen = new Set<string>();
    const unique: FacebookConversation[] = [];
    
    for (const conv of conversations) {
      if (!seen.has(conv.conversation_id)) {
        seen.add(conv.conversation_id);
        unique.push(conv);
      } else {
        console.warn(`⚠️ Duplicate conversation detected: ${conv.conversation_id}`);
      }
    }
    
    return unique;
  };

  // Get cache key for a page
  const getCacheKey = (pageId: string) => {
    return `conversation_tags_cache_${pageId}`;
  };

  // Load tags from cache for a specific page
  const loadTagsFromCache = (pageId: string): FacebookTag[] | null => {
    if (typeof window === 'undefined') return null;
    
    const cacheKey = getCacheKey(pageId);
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;
    
    try {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data;
      }
      localStorage.removeItem(cacheKey);
      return null;
    } catch {
      return null;
    }
  };

  // Save tags to cache for a specific page
  const saveTagsToCache = (pageId: string, tags: FacebookTag[]) => {
    if (typeof window === 'undefined') return;
    
    const cacheKey = getCacheKey(pageId);
    localStorage.setItem(cacheKey, JSON.stringify({
      data: tags,
      timestamp: Date.now(),
    }));
  };

  // Load tags from cache for all pages
  const loadAllTagsFromCache = () => {
    if (typeof window === 'undefined') return;
    
    const newTagsMap = new Map<string, FacebookTag>();
    const cacheKeys = Object.keys(localStorage).filter(key => key.startsWith('conversation_tags_cache_'));
    
    cacheKeys.forEach(cacheKey => {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          
          if (Date.now() - timestamp < CACHE_DURATION) {
            (data as FacebookTag[]).forEach(tag => {
              newTagsMap.set(tag.tag_id, tag);
            });
          }
        }
      } catch (error) {
        console.error('Error loading tags from cache:', error);
      }
    });
    
    setTagsMap(newTagsMap);
  };

  // Fetch and cache tags for all unique pages in conversations
  const fetchAndCacheTagsForAllPages = async (conversations: FacebookConversation[]) => {
    if (typeof window === 'undefined') return;
    
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    // Get unique page IDs from conversations
    const uniquePageIds = [...new Set(conversations.map(c => c.facebook_page_id).filter(Boolean))];
    
    console.log(`📥 Fetching tags for ${uniquePageIds.length} pages...`);

    // Fetch tags for each page that doesn't have valid cache
    const fetchPromises = uniquePageIds.map(async (pageId) => {
      const cachedTags = loadTagsFromCache(pageId);
      if (cachedTags) {
        console.log(`✅ Page ${pageId}: Loaded ${cachedTags.length} tags from cache`);
        return;
      }

      try {
        console.log(`📥 Fetching tags for page ${pageId}...`);
        const response = await ApiService.tags.getTags(token, { facebook_page_id: pageId });
        const tags = response.data || [];
        console.log(`✅ Page ${pageId}: Fetched ${tags.length} tags`);
        saveTagsToCache(pageId, tags);
      } catch (error) {
        console.error(`❌ Failed to fetch tags for page ${pageId}:`, error);
      }
    });

    await Promise.all(fetchPromises);
    
    // Reload all tags from cache to update tagsMap
    loadAllTagsFromCache();
  };

  // Fetch conversations from API (với option append để load more)
  const fetchConversations = async (isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setPage(1);
        setHasMore(true);
      }
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

      // Lấy user info từ localStorage để đảm bảo có merged_pages_filter mới nhất
      const storedUser = localStorage.getItem('auth_user');
      const currentUser = storedUser ? JSON.parse(storedUser) : user;

      const params: any = {
        page: isLoadMore ? page : 1,
        limit: limit,
      };

      if (filterSource !== 'all') {
        params.source = filterSource;
      }

      if (searchQuery) {
        params.search = searchQuery;
      }

      // THÊM FILTER THEO MERGED_PAGES_FILTER
      if (currentUser?.merged_pages_filter && currentUser.merged_pages_filter.length > 0) {
        params.facebookPageIds = currentUser.merged_pages_filter;
      } else {
        console.log('No merged_pages_filter found - showing all conversations');
      }

      // THÊM FILTER THEO SIDEBAR
      if (sidebarFilter) {
        switch (sidebarFilter.type) {
          case 'unread':
            params.handler = 'human';
            params.needsAttention = true;
            params.isRead = false;
            break;
          case 'comments':
            params.source = 'comment';
            break;
          case 'messages':
            params.source = 'messenger';
            break;
          case 'phone':
            params.hasPhone = true;
            break;
          case 'no-phone':
            params.hasPhone = false;
            break;
          case 'time':
            if (sidebarFilter.startDate && sidebarFilter.endDate) {
              params.startDate = sidebarFilter.startDate.toISOString();
              params.endDate = sidebarFilter.endDate.toISOString();
            }
            break;
        }
      }

      console.log(`📥 Fetching conversations - Page: ${params.page}, Limit: ${params.limit}`);
      const result = await ApiService.messaging.getConversations(token, params);
      
      // Sắp xếp: needs_attention = true lên đầu, sau đó theo last_message_at mới nhất
      const sortedConversations = result.conversations.sort((a, b) => {
        // Ưu tiên needs_attention
        if (a.needs_attention !== b.needs_attention) {
          return a.needs_attention ? -1 : 1;
        }
        // Sau đó theo thời gian mới nhất
        const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
        const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
        return timeB - timeA;
      });
      
      // Update conversations: append nếu load more, replace nếu load mới
      if (isLoadMore) {
        setConversations(prev => {
          const combined = [...prev, ...sortedConversations];
          return deduplicateConversations(combined);
        });
      } else {
        setConversations(deduplicateConversations(sortedConversations));
      }
      
      // Update pagination state
      setTotalConversations(result.pagination.total);
      const totalPages = result.pagination.pages;
      setHasMore(params.page < totalPages);
      
      console.log(`✅ Loaded ${sortedConversations.length} conversations. Total: ${result.pagination.total}, HasMore: ${params.page < totalPages}`);
      
      // Fetch and cache tags for all pages in conversations
      await fetchAndCacheTagsForAllPages(sortedConversations);
    } catch (err: any) {
      console.error('Failed to fetch conversations:', err);
      setError(err.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Load more conversations
  const loadMoreConversations = async () => {
    if (loadingMore || !hasMore) return;
    
    console.log('📥 Loading more conversations...');
    const nextPage = page + 1;
    setPage(nextPage);
    
    // Fetch with next page
    try {
      setLoadingMore(true);
      
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const storedUser = localStorage.getItem('auth_user');
      const currentUser = storedUser ? JSON.parse(storedUser) : user;

      const params: any = {
        page: nextPage,
        limit: limit,
      };

      if (filterSource !== 'all') {
        params.source = filterSource;
      }

      if (searchQuery) {
        params.search = searchQuery;
      }

      if (currentUser?.merged_pages_filter && currentUser.merged_pages_filter.length > 0) {
        params.facebookPageIds = currentUser.merged_pages_filter;
      }

      if (sidebarFilter) {
        switch (sidebarFilter.type) {
          case 'unread':
            params.handler = 'human';
            params.needsAttention = true;
            params.isRead = false;
            break;
          case 'comments':
            params.source = 'comment';
            break;
          case 'messages':
            params.source = 'messenger';
            break;
          case 'phone':
            params.hasPhone = true;
            break;
          case 'no-phone':
            params.hasPhone = false;
            break;
          case 'time':
            if (sidebarFilter.startDate && sidebarFilter.endDate) {
              params.startDate = sidebarFilter.startDate.toISOString();
              params.endDate = sidebarFilter.endDate.toISOString();
            }
            break;
        }
      }

      console.log(`📥 Loading page ${nextPage}...`);
      const result = await ApiService.messaging.getConversations(token, params);
      
      const sortedConversations = result.conversations.sort((a, b) => {
        if (a.needs_attention !== b.needs_attention) {
          return a.needs_attention ? -1 : 1;
        }
        const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
        const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
        return timeB - timeA;
      });
      
      // Append new conversations
      setConversations(prev => {
        const combined = [...prev, ...sortedConversations];
        return deduplicateConversations(combined);
      });
      
      // Update pagination state
      setHasMore(nextPage < result.pagination.pages);
      
      console.log(`✅ Loaded ${sortedConversations.length} more conversations. Page ${nextPage}/${result.pagination.pages}`);
      
      // Fetch and cache tags
      await fetchAndCacheTagsForAllPages(sortedConversations);
    } catch (err: any) {
      console.error('Failed to load more conversations:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Initial load - reload khi user.merged_pages_filter hoặc sidebarFilter thay đổi
  useEffect(() => {
    fetchConversations(false);
  }, [filterSource, user?.merged_pages_filter, sidebarFilter]);

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchConversations(false);
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
      return;
    }

    // Connect socket if not already connected
    if (!socketService.isConnected()) {
      socketService.connect(token);
    }

    // Listen for new messages
    const handleNewMessage = (message: any) => {
      
      if (!message || !message.conversation_id) {
        console.warn('Invalid message format:', message);
        return;
      }

      // Update conversation in list and move to top
      setConversations(prev => {
        // Nếu có thông tin conversation đầy đủ từ backend, sử dụng luôn
        if (message.conversation) {
          const existingIndex = prev.findIndex(c => c.conversation_id === message.conversation_id);
          
          if (existingIndex >= 0) {
            // Cập nhật conversation hiện có
            const updated = [...prev];
            updated[existingIndex] = {
              ...updated[existingIndex],
              ...message.conversation,
            };
            
            // Sort lại: needs_attention trước, sau đó mới đến thời gian
            return updated.sort((a, b) => {
              // Ưu tiên needs_attention
              if (a.needs_attention !== b.needs_attention) {
                return a.needs_attention ? -1 : 1;
              }
              // Sau đó theo thời gian mới nhất
              const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
              const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
              return timeB - timeA;
            });
          } else {
            // Conversation mới (chưa có trong list)
            return [message.conversation, ...prev];
          }
        }
        
        // Fallback: chỉ cập nhật message info (không có customer info)
        const updated = prev.map(conv => 
          conv.conversation_id === message.conversation_id
            ? {
                ...conv,
                last_message_text: message.text || '',
                last_message_at: new Date(message.sent_at),
                last_message_from: message.sender_type,
                unread_customer_messages: message.sender_type === 'customer' 
                  ? (conv.unread_customer_messages || 0) + 1 
                  : conv.unread_customer_messages,
                total_messages: (conv.total_messages || 0) + 1,
              }
            : conv
        );
        
        // Sort by needs_attention first, then last_message_at
        return updated.sort((a, b) => {
          // Ưu tiên needs_attention
          if (a.needs_attention !== b.needs_attention) {
            return a.needs_attention ? -1 : 1;
          }
          // Sau đó theo thời gian mới nhất
          const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
          const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
          return timeB - timeA;
        });
      });
    };

    // Listen for conversation updates
    const handleConversationUpdated = (data: any) => {
      setConversations(prev => {
        const updated = prev.map(conv =>
          conv.conversation_id === data.conversation_id
            ? { ...conv, ...data }
            : conv
        );
        
        // Re-sort sau khi update (quan trọng cho needs_attention)
        return updated.sort((a, b) => {
          // Ưu tiên needs_attention
          if (a.needs_attention !== b.needs_attention) {
            return a.needs_attention ? -1 : 1;
          }
          // Sau đó theo thời gian mới nhất
          const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
          const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
          return timeB - timeA;
        });
      });
    };

    // Listen for new conversations
    const handleNewConversation = (data: any) => {
      setConversations(prev => {
        // Check if conversation already exists
        const exists = prev.find(c => c.conversation_id === data.conversation_id);
        if (exists) {
          console.warn(`⚠️ Conversation ${data.conversation_id} already exists, skipping add`);
          return prev;
        }
        return [data, ...prev];
      });
      
      // Fetch tags for the new conversation's page if not cached
      if (data.facebook_page_id) {
        const cachedTags = loadTagsFromCache(data.facebook_page_id);
        if (!cachedTags) {
          fetchAndCacheTagsForAllPages([data]);
        }
      }
    };

    socketService.onNewMessage(handleNewMessage);
    socketService.onConversationUpdated(handleConversationUpdated);
    socketService.onNewConversation(handleNewConversation);

    // Listen for conversation escalated (chatbot → human)
    const handleConversationEscalated = (data: any) => {
      console.log('🔔 Conversation escalated to human:', data);
      // Just log, UI will update via conversation_updated event
    };

    socketService.onConversationEscalated(handleConversationEscalated);

    // Cleanup
    return () => {
      socketService.off('new_message', handleNewMessage);
      socketService.off('conversation_updated', handleConversationUpdated);
      socketService.off('new_conversation', handleNewConversation);
      socketService.off('conversation_escalated', handleConversationEscalated);
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
      return <img src="/reply.svg" alt="reply" />;
    }
    return null;
  };

  // Scroll handler for infinite scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    
    // Khi scroll đến gần cuối (còn 100px nữa là đến cuối)
    if (scrollBottom < 100 && !loadingMore && hasMore) {
      console.log('🔄 Reached bottom, loading more...');
      loadMoreConversations();
    }
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
      <div className="chat-list-messages" onScroll={handleScroll}>
        {loading && conversations.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center' }}>Đang tải...</div>
        )}
        
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

        {!loading && !error && conversations.map((conversation) => {
          const customerName = conversation.customer_name || 'Unknown User';
          const customerAvatar = conversation.customer_profile_pic_url || conversation.customer_profile_pic || 
            `https://ui-avatars.com/api/?name=${encodeURIComponent(customerName)}&background=random&size=200`;
          
          return (
            <div
              key={conversation.conversation_id}
              className={`chat-list-item ${selectedConversation === conversation.conversation_id ? 'chat-list-selected' : ''} ${conversation.needs_attention ? 'chat-list-needs-attention' : ''}`}
              onClick={() => onConversationSelect(conversation.conversation_id)}
            >
              <div className="chat-list-item-content">
                <div className="chat-list-avatar">
                  <img 
                    src={customerAvatar} 
                    alt={customerName}
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      img.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(customerName)}&background=random&size=200`;
                    }}
                  />
                </div>
                <div className="chat-list-details">
                  <div className="chat-list-header-row">
                    <div className="chat-list-name-wrapper">
                      <div className="chat-list-name">
                        {customerName}
                      </div>
                    </div>
                    <div className="chat-list-header-right">
                      <div className="chat-list-time">
                        {formatTime(conversation.last_message_at)}
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
                    {conversation.unread_customer_messages > 0 && conversation.current_handler === 'human' && (
                      <div className="chat-list-unread-badge">
                        {conversation.unread_customer_messages}
                      </div>
                    )}
                  </div>
                  <div className="chat-list-tags-row">
                    <div className="chat-list-tags-container">
                      {conversation.tags && conversation.tags.length > 0 && (
                        <>
                          {conversation.tags.slice(0, 3).map((tagId, index) => {
                            const tag = tagsMap.get(tagId);
                            if (!tag) return null;
                            return (
                              <span 
                                key={tagId} 
                                className={`chat-list-tag chat-list-tag-${index % 3}`}
                                style={{ backgroundColor: tag.tag_color }}
                              >
                                {tag.tag_name}
                              </span>
                            );
                          })}
                          {conversation.tags.length > 3 && (
                            <span className="chat-list-tag-more">
                              +{conversation.tags.length - 3}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <div className="chat-list-icons-group">
                      {/* Handler Icon (Chatbot or Human) */}
                      <div className="chat-list-handler-icon" title={conversation.current_handler === 'chatbot' ? 'Chatbot đang xử lý' : 'Nhân viên đang xử lý'}>
                        <img 
                          src={conversation.current_handler === 'chatbot' ? '/chat-bot.svg' : '/human.svg'} 
                          alt={conversation.current_handler === 'chatbot' ? 'chatbot' : 'human'} 
                        />
                      </div>
                      {conversation.page_picture_url && (
                        <div className="chat-list-page-icon">
                          <img src={conversation.page_picture_url} alt="page avatar" />
                        </div>
                      )}
                      <div className="chat-list-source-icon">
                        <img 
                          src={conversation.source === 'comment' ? '/comment.png' : '/message.png'} 
                          alt={conversation.source === 'comment' ? 'comment' : 'message'} 
                        />
                      </div>
                    </div>
                  </div>
                  
                </div>
              </div>
              <div className="chat-list-divider"></div>
            </div>
          );
        })}

        {/* Loading More Indicator */}
        {loadingMore && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            <div style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</div>
            {' '}Đang tải thêm...
          </div>
        )}

        {/* No More Data */}
        {!loading && !loadingMore && conversations.length > 0 && !hasMore && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: '14px' }}>
            Đã hiển thị tất cả {totalConversations} cuộc hội thoại
          </div>
        )}
      </div>
    </div>
  );
}
