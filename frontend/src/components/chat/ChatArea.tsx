'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ApiService, { FacebookMessage, FacebookConversation } from '@/services/api';
import socketService from '@/services/socket';
import ChatHeader from './ChatHeader';
import ChatMessages from './ChatMessages';
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
  const [error, setError] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [skipAutoMarkRead, setSkipAutoMarkRead] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
    }
  };

  // Scroll sau khi ảnh load xong
  const scrollToBottomAfterImagesLoad = () => {
    const images = document.querySelectorAll('.chat-area-messages img');
    if (images.length === 0) {
      // Không có ảnh, scroll ngay
      setTimeout(() => scrollToBottom('auto'), 50);
      return;
    }

    let loadedCount = 0;
    const totalImages = images.length;

    const checkAllLoaded = () => {
      loadedCount++;
      if (loadedCount === totalImages) {
        // Tất cả ảnh đã load xong, scroll xuống cuối
        setTimeout(() => scrollToBottom('auto'), 100);
      }
    };

    images.forEach((img) => {
      if ((img as HTMLImageElement).complete) {
        // Ảnh đã load sẵn (cached)
        checkAllLoaded();
      } else {
        // Đợi ảnh load
        img.addEventListener('load', checkAllLoaded);
        img.addEventListener('error', checkAllLoaded); // Cả khi lỗi cũng scroll
      }
    });
  };

  // Fetch conversation details and messages
  const fetchConversationData = async (shouldMarkAsRead: boolean = true) => {
    if (!conversationId) return;

    try {
      setLoading(true);
      setError(null);

      if (typeof window === 'undefined') return;

      const token = localStorage.getItem('auth_token');
      if (!token) {
        setError('Vui lòng đăng nhập');
        return;
      }

      console.log('Fetching conversation data for:', conversationId);

      // Fetch conversation details and messages in parallel
      const [conversationData, messagesData] = await Promise.all([
        ApiService.messaging.getConversation(token, conversationId),
        ApiService.messaging.getMessages(token, conversationId, 1, 100)
      ]);

      console.log('Conversation data:', conversationData);
      console.log('Messages data:', messagesData);
      console.log('Messages array:', messagesData.messages);
      console.log('Messages count:', messagesData.messages?.length || 0);

      setConversation(conversationData);
      setMessages(messagesData.messages || []);

      // Scroll xuống cuối SAU KHI ẢNH LOAD XONG
      setTimeout(() => scrollToBottomAfterImagesLoad(), 100);

      // Chỉ mark as read nếu không bị skip (ví dụ: sau khi mark unread)
      if (shouldMarkAsRead && !skipAutoMarkRead) {
        const userStr = localStorage.getItem('auth_user');
        if (userStr) {
          const user = JSON.parse(userStr);
          await ApiService.messaging.markAsRead(token, conversationId, user.user_id, user.full_name);
        } else {
          await ApiService.messaging.markAsRead(token, conversationId);
        }
      }
      
      // Reset skip flag
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

  // Load conversation data when conversationId changes
  useEffect(() => {
    if (conversationId) {
      fetchConversationData();
    } else {
      setMessages([]);
      setConversation(null);
    }
  }, [conversationId]);

  // Scroll to bottom NGAY KHI messages thay đổi
  useEffect(() => {
    if (messages.length > 0 && !loading) {
      // Đợi ảnh load xong rồi mới scroll
      requestAnimationFrame(() => {
        scrollToBottomAfterImagesLoad();
      });
    }
  }, [messages, loading]);

  // Setup Socket.IO listeners for real-time updates
  useEffect(() => {
    if (!conversationId || typeof window === 'undefined') return;

    const token = localStorage.getItem('auth_token');
    if (!token) return;

    // Connect socket if not already connected
    if (!socketService.isConnected()) {
      socketService.connect(token);
    }

    // Listen for new messages in this conversation
    const handleNewMessage = (message: any) => {
      console.log('WebSocket new_message received:', message);
      if (message.conversation_id === conversationId) {
        setMessages(prev => [...prev, message]);
        
        // Cập nhật conversation info nếu có (để cập nhật avatar, name realtime)
        if (message.conversation) {
          setConversation(prev => prev ? { ...prev, ...message.conversation } : message.conversation);
        }
        
        // Scroll xuống cuối SAU KHI ẢNH LOAD XONG
        setTimeout(() => scrollToBottomAfterImagesLoad(), 200);
      }
    };

    socketService.onNewMessage(handleNewMessage);

    // Cleanup
    return () => {
      socketService.off('new_message', handleNewMessage);
    };
  }, [conversationId]);

  // Send message
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

      // Upload TẤT CẢ files SONG SONG để tăng tốc
      if (attachedFiles && attachedFiles.length > 0) {
        console.log(`⚡ Uploading ${attachedFiles.length} files in parallel...`);
        const startTime = Date.now();
        
        // Tạo promises cho tất cả uploads
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

        // Đợi TẤT CẢ uploads hoàn thành SONG SONG
        attachments = await Promise.all(uploadPromises);
        
        const uploadTime = Date.now() - startTime;
        console.log(`✅ Uploaded ${attachments.length} files in ${uploadTime}ms`);
      }

      // Gửi tin nhắn với attachments
      const sendStartTime = Date.now();
      await ApiService.messaging.replyToConversation(token, conversationId, {
        text: inputMessage || '',
        messageType: attachments.length > 0 ? 'file' : 'text',
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      
      const sendTime = Date.now() - sendStartTime;
      console.log(`✅ Sent message in ${sendTime}ms`);

      setInputMessage('');
      
      // Scroll xuống cuối SAU KHI ẢNH LOAD XONG
      setTimeout(() => scrollToBottomAfterImagesLoad(), 200);
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
      
      // Set flag để KHÔNG tự động mark as read khi refresh
      setSkipAutoMarkRead(true);
      
      // Refresh conversation data nhưng KHÔNG mark as read
      await fetchConversationData(false);
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
        // Chuyển về chatbot: return to bot
        await ApiService.messaging.returnToBot(token, conversationId);
        
        // Refresh để lấy dữ liệu mới nhất, KHÔNG tự động mark as read (vì chatbot xử lý)
        await fetchConversationData(false);
      } else {
        // Chuyển sang human: update conversation + mark as read trong 1 request
        await ApiService.messaging.updateConversation(token, conversationId, {
          currentHandler: 'human',
          needsAttention: false,
          assignedTo: user.user_id,
        });
        
        // Mark as read khi chuyển sang human
        await ApiService.messaging.markAsRead(token, conversationId, user.user_id, user.full_name);
        
        // Refresh để lấy dữ liệu mới nhất, KHÔNG tự động mark as read nữa (đã mark rồi)
        await fetchConversationData(false);
      }
    } catch (err: any) {
      console.error('Failed to toggle handler:', err);
      setError(err.message || 'Failed to toggle handler');
    } finally {
      setActionLoading(false);
    }
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

  return (
    <div className="chat-area-container">
      <ChatHeader 
        conversation={conversation}
        actionLoading={actionLoading}
        onToggleHandler={handleToggleHandler}
        onMarkUnread={handleMarkUnread}
        onToggleRightPanel={onToggleRightPanel}
      />
      
      <ChatMessages 
        messages={messages}
        conversation={conversation}
        messagesEndRef={messagesEndRef}
      />
      
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
