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

  // Ưu tiên dùng post_photos_minio, fallback về post_photos
  const photos = conversation.post_photos_minio || conversation.post_photos;
  const hasPhotos = photos && photos.length > 0;
  const hasMultiplePhotos = hasPhotos && photos!.length > 1;

  const handlePrevImage = () => {
    if (photos) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? photos!.length - 1 : prev - 1
      );
    }
  };

  const handleNextImage = () => {
    if (photos) {
      setCurrentImageIndex((prev) => 
        prev === photos!.length - 1 ? 0 : prev + 1
      );
    }
  };

  const getCurrentPhotoUrl = () => {
    if (!photos || photos.length === 0) return '';
    const photo = photos[currentImageIndex];
    // Nếu là object thì lấy minio_url, không thì là string URL trực tiếp
    return typeof photo === 'object' ? photo.minio_url : photo;
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
              src={getCurrentPhotoUrl()} 
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
                  {currentImageIndex + 1} / {photos!.length}
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

