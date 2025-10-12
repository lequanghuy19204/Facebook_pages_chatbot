'use client';

import React, { useEffect, useRef } from 'react';
import { FacebookMessage, FacebookConversation } from '@/services/api';
import PostDisplay from './PostDisplay';
import Viewer from 'viewerjs';
import 'viewerjs/dist/viewer.css';
import '@/styles/chat/CommentMessages.css';

interface CommentMessagesProps {
  messages: FacebookMessage[];
  conversation: FacebookConversation | null;
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  loadingMore: boolean;
  hasMore: boolean;
  showNewMessageBadge: boolean;
  onScrollToBottom: () => void;
}

const CommentMessages = React.memo(({ 
  messages, 
  conversation, 
  messagesContainerRef,
  messagesEndRef,
  onScroll,
  loadingMore,
  hasMore,
  showNewMessageBadge,
  onScrollToBottom
}: CommentMessagesProps) => {
  const viewerRef = useRef<Viewer | null>(null);

  const formatTime = (date?: Date | string) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút`;
    if (hours < 24) return `${hours} giờ`;
    if (days < 7) return `${days} ngày`;
    
    return d.toLocaleDateString('vi-VN', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric'
    });
  };

  const getCustomerName = () => {
    if (!conversation) return 'Khách hàng';
    return conversation.customer_name || 'Khách hàng';
  };

  const getCustomerAvatar = () => {
    if (!conversation) return 'https://ui-avatars.com/api/?name=User&background=random&size=200';
    return conversation.customer_profile_pic_url || conversation.customer_profile_pic || 
      `https://ui-avatars.com/api/?name=${encodeURIComponent(getCustomerName())}&background=random&size=200`;
  };

  const getPageAvatar = () => {
    if (!conversation) return 'https://ui-avatars.com/api/?name=Page&background=random&size=200';
    return conversation.page_picture_url || conversation.page_picture || 
      `https://ui-avatars.com/api/?name=${encodeURIComponent(conversation.page_name || 'Page')}&background=random&size=200`;
  };

  useEffect(() => {
    if (viewerRef.current) {
      viewerRef.current.destroy();
      viewerRef.current = null;
    }

    const timer = setTimeout(() => {
      const galleryElement = document.querySelector('.comment-messages-image-gallery');
      if (galleryElement) {
        viewerRef.current = new Viewer(galleryElement as HTMLElement, {
          inline: false,
          title: false,
          toolbar: {
            zoomIn: true,
            zoomOut: true,
            oneToOne: true,
            reset: true,
            prev: true,
            play: false,
            next: true,
            rotateLeft: true,
            rotateRight: true,
            flipHorizontal: true,
            flipVertical: true,
          },
          navbar: true,
          button: true,
          url: 'data-original',
          keyboard: true,
          backdrop: true,
          zoomRatio: 0.2,
          minZoomRatio: 0.1,
          maxZoomRatio: 10,
          zIndex: 2000,
          className: 'comment-messages-viewer'
        });
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [messages]);

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    e.stopPropagation();
  };

  return (
    <div 
      className="comment-messages-container" 
      ref={messagesContainerRef}
      onScroll={onScroll}
    >
      {conversation && <PostDisplay conversation={conversation} />}
      
      {messages.length === 0 ? (
        <div className="comment-messages-empty">
          Chưa có bình luận nào
        </div>
      ) : (
        <div className="comment-messages-thread comment-messages-image-gallery">
          {messages.map((message) => {
            const isCustomer = message.sender_type === 'customer';
            const isChatbot = message.sender_type === 'chatbot';
            const hasAttachment = message.attachments && message.attachments.length > 0;
            
            return (
              <div key={message.message_id} className="comment-item-commentMessages">
                <div className="comment-header-commentMessages">
                  <img 
                    src={isCustomer ? getCustomerAvatar() : getPageAvatar()} 
                    alt="avatar" 
                    className="comment-avatar-commentMessages"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      img.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(isCustomer ? getCustomerName() : conversation?.page_name || 'Page')}&background=random&size=200`;
                    }}
                  />
                  
                  <div className="comment-content-wrapper-commentMessages">
                    <div className="comment-bubble-commentMessages">
                      <div className="comment-author-commentMessages">
                        {isCustomer ? getCustomerName() : (isChatbot ? '🤖 Chatbot' : (message.sender_name || conversation?.page_name || 'Page'))}
                      </div>
                      
                      {message.text && (
                        <div className="comment-text-commentMessages">
                          {message.text}
                        </div>
                      )}
                      
                      {hasAttachment && (
                        <div className="comment-attachments-commentMessages">
                          {message.attachments!.map((att, idx) => (
                            <div key={idx} className="comment-attachment-item-commentMessages">
                              {att.type === 'image' && (
                                <img 
                                  src={att.minio_url || att.facebook_url} 
                                  data-original={att.minio_url || att.facebook_url}
                                  alt="attachment"
                                  onClick={handleImageClick}
                                  className="comment-attachment-image-commentMessages"
                                />
                              )}
                              {att.type === 'video' && (
                                <video 
                                  src={att.minio_url || att.facebook_url} 
                                  controls 
                                  className="comment-attachment-video-commentMessages"
                                />
                              )}
                              {att.type === 'file' && (
                                <a 
                                  href={att.minio_url || att.facebook_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="comment-attachment-file-commentMessages"
                                >
                                  📎 {att.filename}
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="comment-meta-commentMessages">
                      <span className="comment-time-commentMessages">{formatTime(message.sent_at)}</span>
                      {!isCustomer && (
                        <>
                          <span className="comment-meta-dot-commentMessages">•</span>
                          <span className="comment-sender-type-commentMessages">
                            {isChatbot ? 'Trả lời tự động' : 'Phản hồi'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      <div ref={messagesEndRef} />
      
      {showNewMessageBadge && (
        <div 
          className="comment-new-badge-commentMessages"
          onClick={onScrollToBottom}
        >
          <span>Bình luận mới ↓</span>
        </div>
      )}
    </div>
  );
});

CommentMessages.displayName = 'CommentMessages';

export default CommentMessages;

