'use client';

import React, { useState } from 'react';
import { FacebookConversation } from '@/services/api';
import '@/styles/chat/PostDisplay.css';

interface PostDisplayProps {
  conversation: FacebookConversation;
}

const PostDisplay = React.memo(({ conversation }: PostDisplayProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!conversation || conversation.source !== 'comment') {
    return null;
  }

  const hasPhotos = conversation.post_photos && conversation.post_photos.length > 0;
  const hasMultiplePhotos = hasPhotos && conversation.post_photos!.length > 1;

  const handlePrevImage = () => {
    if (conversation.post_photos) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? conversation.post_photos!.length - 1 : prev - 1
      );
    }
  };

  const handleNextImage = () => {
    if (conversation.post_photos) {
      setCurrentImageIndex((prev) => 
        prev === conversation.post_photos!.length - 1 ? 0 : prev + 1
      );
    }
  };

  const formatDate = (date?: Date | string) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('vi-VN', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="post-display-container">
      <div className="post-display-header">
        <div className="post-display-header-icon">
          <img src="/comment.png" alt="comment" />
        </div>
        <div className="post-display-header-text">
          <span className="post-display-title">Bài đăng gốc</span>
          {conversation.post_created_time && (
            <span className="post-display-date">{formatDate(conversation.post_created_time)}</span>
          )}
        </div>
        {conversation.post_permalink_url && (
          <a 
            href={conversation.post_permalink_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="post-display-link-button"
            title="Xem bài đăng trên Facebook"
          >
            <img src="/link_facebook.svg" alt="view on facebook" />
          </a>
        )}
      </div>

      {/* Post Images */}
      {hasPhotos && (
        <div className="post-display-images">
          <div className="post-display-image-container">
            <img 
              src={conversation.post_photos![currentImageIndex]} 
              alt={`Post image ${currentImageIndex + 1}`}
              className="post-display-image"
            />
            
            {hasMultiplePhotos && (
              <>
                <button 
                  className="post-display-nav-button post-display-nav-prev"
                  onClick={handlePrevImage}
                  aria-label="Previous image"
                >
                  ‹
                </button>
                <button 
                  className="post-display-nav-button post-display-nav-next"
                  onClick={handleNextImage}
                  aria-label="Next image"
                >
                  ›
                </button>
                <div className="post-display-image-counter">
                  {currentImageIndex + 1} / {conversation.post_photos!.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Post Content */}
      {conversation.post_content && (
        <div className="post-display-content">
          <div className="post-display-content-text">
            {conversation.post_content}
          </div>
        </div>
      )}
    </div>
  );
});

PostDisplay.displayName = 'PostDisplay';

export default PostDisplay;

