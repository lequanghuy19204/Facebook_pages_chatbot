'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ApiService, { FacebookMessage, FacebookConversation } from '@/services/api';
import socketService from '@/services/socket';
import ChatHeader from './ChatHeader';
import ChatMessages from './ChatMessages';
import CommentMessages from './CommentMessages';
import ChatInput from './ChatInput';
import '@/styles/chat/ChatArea.css';

interface ChatAreaProps {
  conversationId: string | null;
  onToggleRightPanel: () => void;
  showRightPanel: boolean;
}

export default function ChatArea({ conversationId, onToggleRightPanel, showRightPanel }: ChatAreaProps) {
  const [messages, setMessages] = useState<FacebookMessage[]>([]);
  const [conversation, setConversation] = useState<FacebookConversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [skipAutoMarkRead, setSkipAutoMarkRead] = useState(false);
  
  const [hasMore, setHasMore] = useState(true);
  const [oldestCursor, setOldestCursor] = useState<string | null>(null);
  const [showNewMessageBadge, setShowNewMessageBadge] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [needsInitialScroll, setNeedsInitialScroll] = useState(false);
  
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const isScrollingProgrammaticallyRef = useRef(false);

  const deduplicateMessages = (messages: FacebookMessage[]): FacebookMessage[] => {
    const seen = new Set<string>();
    return messages.filter(msg => {
      if (seen.has(msg.message_id)) {
        return false;
      }
      seen.add(msg.message_id);
      return true;
    });
  };

  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'auto') => {
    if (messagesContainerRef.current) {
      isScrollingProgrammaticallyRef.current = true;
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      setTimeout(() => {
        isScrollingProgrammaticallyRef.current = false;
      }, 100);
    }
  };

  const isNearBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return false;
    
    const threshold = 150;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    return distanceFromBottom < threshold;
  }, []);

  const scrollToBottomAfterImagesLoad = (behavior: 'smooth' | 'auto' = 'auto') => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const images = container.querySelectorAll('img');
    if (images.length === 0) {
      setTimeout(() => scrollToBottom(behavior), 50);
      return;
    }

    let loadedCount = 0;
    const totalImages = images.length;

    const checkAllLoaded = () => {
      loadedCount++;
      if (loadedCount === totalImages) {
        setTimeout(() => scrollToBottom(behavior), 50);
      }
    };

    images.forEach((img) => {
      if (img.complete) {
        checkAllLoaded();
      } else {
        img.addEventListener('load', checkAllLoaded, { once: true });
        img.addEventListener('error', checkAllLoaded, { once: true });
      }
    });
  };

  const fetchInitialMessages = async (shouldMarkAsRead: boolean = true) => {
    if (!conversationId) return;

    try {
      setLoading(true);
      setError(null);
      setIsInitialLoad(true);

      if (typeof window === 'undefined') return;

      const token = localStorage.getItem('auth_token');
      if (!token) {
        setError('Vui lòng đăng nhập');
        return;
      }

      const [conversationData, messagesData] = await Promise.all([
        ApiService.messaging.getConversation(token, conversationId),
        ApiService.messaging.getMessages(token, conversationId, 1, 30)
      ]);

      setConversation(conversationData);
      
      const uniqueMessages = deduplicateMessages(messagesData.messages || []);
      setMessages(uniqueMessages);
      
      const hasMoreMessages = uniqueMessages.length === 30;
      setHasMore(hasMoreMessages);
      
      if (uniqueMessages.length > 0) {
        const oldestMessage = uniqueMessages[0];
        setOldestCursor(oldestMessage.sent_at.toString());
      }

      setNeedsInitialScroll(true);

      if (shouldMarkAsRead && !skipAutoMarkRead) {
        const userStr = localStorage.getItem('auth_user');
        if (userStr) {
          const user = JSON.parse(userStr);
          await ApiService.messaging.markAsRead(token, conversationId, user.user_id, user.full_name);
        } else {
          await ApiService.messaging.markAsRead(token, conversationId);
        }
      }
      
      if (skipAutoMarkRead) {
        setSkipAutoMarkRead(false);
      }
    } catch (err: any) {
      console.error('Failed to fetch conversation:', err);
      setError(err.message || 'Failed to load conversation');
    } finally {
      setLoading(false);
    }
  };

  const loadMoreMessages = async () => {
    if (!conversationId || !hasMore || loadingMore || !oldestCursor) return;

    try {
      setLoadingMore(true);
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const container = messagesContainerRef.current;
      if (!container) return;

      const oldScrollHeight = container.scrollHeight;
      const oldScrollTop = container.scrollTop;

      const messagesData = await ApiService.messaging.getMessagesBefore(
        token, 
        conversationId, 
        oldestCursor,
        30
      );

      if (messagesData.messages.length > 0) {
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.message_id));
          const newMessages = messagesData.messages.filter(m => !existingIds.has(m.message_id));
          
          if (newMessages.length === 0) {
            return prev;
          }
          
          const merged = [...newMessages, ...prev];
          return deduplicateMessages(merged);
        });
        
        const newOldestMessage = messagesData.messages[0];
        setOldestCursor(newOldestMessage.sent_at.toString());
        
        const hasMoreMessages = messagesData.messages.length === 30;
        setHasMore(hasMoreMessages);

        requestAnimationFrame(() => {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop = oldScrollTop + (newScrollHeight - oldScrollHeight);
        });
      } else {
        setHasMore(false);
      }
    } catch (err: any) {
      console.error('Failed to load more messages:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleScroll = useCallback(() => {
    if (isScrollingProgrammaticallyRef.current) return;
    
    const container = messagesContainerRef.current;
    if (!container) return;

    if (container.scrollTop < 100 && hasMore && !loadingMore && !loading) {
      loadMoreMessages();
    }

    if (isNearBottom()) {
      setShowNewMessageBadge(false);
    }
  }, [hasMore, loadingMore, loading, isNearBottom]);

  useEffect(() => {
    if (conversationId) {
      setMessages([]);
      setHasMore(true);
      setOldestCursor(null);
      setShowNewMessageBadge(false);
      setNeedsInitialScroll(false);
      setIsInitialLoad(true);
      fetchInitialMessages();
    } else {
      setMessages([]);
      setConversation(null);
    }
  }, [conversationId]);

  useEffect(() => {
    if (needsInitialScroll && messages.length > 0 && !loading) {
      requestAnimationFrame(() => {
        scrollToBottom('auto');
        setNeedsInitialScroll(false);
        setIsInitialLoad(false);
      });
    }
  }, [needsInitialScroll, messages.length, loading]);

  useEffect(() => {
    if (!conversationId || typeof window === 'undefined') return;

    const token = localStorage.getItem('auth_token');
    if (!token) return;

    if (!socketService.isConnected()) {
      socketService.connect(token);
    }

    const handleNewMessage = (message: any) => {
      if (message.conversation_id === conversationId) {
        setMessages(prev => {
          const exists = prev.some(m => m.message_id === message.message_id);
          if (exists) {
            return prev;
          }
          return [...prev, message];
        });
        
        if (message.conversation) {
          setConversation(prev => prev ? { ...prev, ...message.conversation } : message.conversation);
        }
        
        setTimeout(() => {
          if (isNearBottom() || isInitialLoad) {
            scrollToBottom('auto');
          } else {
            setShowNewMessageBadge(true);
          }
        }, 50);
      }
    };

    socketService.onNewMessage(handleNewMessage);

    return () => {
      socketService.off('new_message', handleNewMessage);
    };
  }, [conversationId, isNearBottom, isInitialLoad]);

  const handleSendMessage = async (attachedFiles?: any[]) => {
    if ((!inputMessage.trim() && !attachedFiles?.length) || !conversationId || sending) return;

    try {
      setSending(true);
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setError('Vui lòng đăng nhập');
        return;
      }

      let attachments: any[] = [];

      if (attachedFiles && attachedFiles.length > 0) {
        const uploadPromises = attachedFiles.map(async (fileData) => {
          try {
            const uploadResult = await ApiService.messaging.uploadMessageFile(token, fileData.file);
            return {
              type: fileData.type,
              facebook_url: uploadResult.minio_url || '',
              minio_url: uploadResult.minio_url,
              minio_key: uploadResult.minio_key,
              filename: fileData.file.name,
            };
          } catch (uploadErr) {
            console.error('Failed to upload file:', fileData.file.name, uploadErr);
            throw new Error(`Không thể tải lên file: ${fileData.file.name}`);
          }
        });

        attachments = await Promise.all(uploadPromises);
      }

      await ApiService.messaging.replyToConversation(token, conversationId, {
        text: inputMessage || '',
        messageType: attachments.length > 0 ? 'file' : 'text',
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      setInputMessage('');
      
      setTimeout(() => scrollToBottom('auto'), 50);
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const handleInputChange = useCallback((value: string) => {
    setInputMessage(value);
  }, []);

  // Mark conversation as unread
  const handleMarkUnread = async () => {
    if (!conversationId || actionLoading) return;

    try {
      setActionLoading(true);
      const token = localStorage.getItem('auth_token');
      const userStr = localStorage.getItem('auth_user');
      
      if (!token || !userStr) {
        setError('Vui lòng đăng nhập');
        return;
      }

      const user = JSON.parse(userStr);
      await ApiService.messaging.markAsUnread(token, conversationId, user.user_id, user.full_name);
      
      setSkipAutoMarkRead(true);
      
      const conversationData = await ApiService.messaging.getConversation(token, conversationId);
      setConversation(conversationData);
    } catch (err: any) {
      console.error('Failed to mark as unread:', err);
      setError(err.message || 'Failed to mark as unread');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle handler between chatbot and human
  const handleToggleHandler = async () => {
    if (!conversationId || !conversation || actionLoading) return;

    try {
      setActionLoading(true);
      const token = localStorage.getItem('auth_token');
      const userStr = localStorage.getItem('auth_user');
      
      if (!token || !userStr) {
        setError('Vui lòng đăng nhập');
        return;
      }

      const user = JSON.parse(userStr);
      const newHandler = conversation.current_handler === 'chatbot' ? 'human' : 'chatbot';

      if (newHandler === 'chatbot') {
        await ApiService.messaging.returnToBot(token, conversationId);
        const conversationData = await ApiService.messaging.getConversation(token, conversationId);
        setConversation(conversationData);
      } else {
        await ApiService.messaging.updateConversation(token, conversationId, {
          currentHandler: 'human',
          needsAttention: false,
          assignedTo: user.user_id,
        });
        
        await ApiService.messaging.markAsRead(token, conversationId, user.user_id, user.full_name);
        const conversationData = await ApiService.messaging.getConversation(token, conversationId);
        setConversation(conversationData);
      }
    } catch (err: any) {
      console.error('Failed to toggle handler:', err);
      setError(err.message || 'Failed to toggle handler');
    } finally {
      setActionLoading(false);
    }
  };

  const handleScrollToBottom = () => {
    setShowNewMessageBadge(false);
    scrollToBottom('auto');
  };

  if (!conversationId) {
    return (
      <div className="chat-area-empty">
        <p>Chọn một cuộc hội thoại để bắt đầu</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="chat-area-container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <p>Đang tải...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chat-area-container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'red' }}>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const isCommentConversation = conversation?.source === 'comment';

  return (
    <div className="chat-area-container">
      <ChatHeader 
        conversation={conversation}
        actionLoading={actionLoading}
        onToggleHandler={handleToggleHandler}
        onMarkUnread={handleMarkUnread}
        onToggleRightPanel={onToggleRightPanel}
      />
      
      {isCommentConversation ? (
        <CommentMessages 
          messages={messages}
          conversation={conversation}
          messagesContainerRef={messagesContainerRef}
          messagesEndRef={messagesEndRef}
          onScroll={handleScroll}
          loadingMore={loadingMore}
          hasMore={hasMore}
          showNewMessageBadge={showNewMessageBadge}
          onScrollToBottom={handleScrollToBottom}
        />
      ) : (
        <ChatMessages 
          messages={messages}
          conversation={conversation}
          messagesContainerRef={messagesContainerRef}
          messagesEndRef={messagesEndRef}
          onScroll={handleScroll}
          loadingMore={loadingMore}
          hasMore={hasMore}
          showNewMessageBadge={showNewMessageBadge}
          onScrollToBottom={handleScrollToBottom}
        />
      )}
      
      <ChatInput 
        conversation={conversation}
        inputMessage={inputMessage}
        sending={sending}
        onInputChange={handleInputChange}
        onSendMessage={handleSendMessage}
        onKeyPress={handleKeyPress}
      />
    </div>
  );
}
