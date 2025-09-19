'use client';

import React, { useState } from 'react';
import '@/styles/chat/messages/MediaMessage.css';

interface Message {
  id: string;
  content: string;
  sender: 'customer' | 'admin' | 'system';
  timestamp: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'file';
}

interface MediaMessageProps {
  message: Message;
}

export default function MediaMessage({ message }: MediaMessageProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showExpanded, setShowExpanded] = useState(false);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const isFromCustomer = message.sender === 'customer';

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const toggleExpanded = () => {
    setShowExpanded(!showExpanded);
  };

  const renderMediaContent = () => {
    if (!message.mediaUrl) return null;

    switch (message.mediaType) {
      case 'image':
        return (
          <div className="media-message-image-container">
            <img
              src={message.mediaUrl}
              alt="Hình ảnh"
              className={`media-message-image ${imageLoaded ? 'loaded' : 'loading'}`}
              onLoad={handleImageLoad}
              onClick={toggleExpanded}
            />
            {!imageLoaded && (
              <div className="media-message-image-placeholder">
                <div className="media-message-loading-spinner"></div>
              </div>
            )}
          </div>
        );
      case 'video':
        return (
          <div className="media-message-video-container">
            <video
              src={message.mediaUrl}
              controls
              className="media-message-video"
            />
          </div>
        );
      case 'file':
        return (
          <div className="media-message-file-container">
            <div className="media-message-file-icon">📄</div>
            <div className="media-message-file-info">
              <span className="media-message-file-name">Tệp đính kèm</span>
              <a href={message.mediaUrl} download className="media-message-file-download">
                Tải xuống
              </a>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div className={`media-message-component ${isFromCustomer ? 'customer' : 'admin'}`}>
        <div className="media-message-row">
          {!isFromCustomer && (
            <div className="media-message-admin-avatar">
              <div className="media-message-avatar-placeholder">CS</div>
            </div>
          )}
          
          <div className="media-message-content">
            <div className={`media-message-bubble ${isFromCustomer ? 'customer-bubble' : 'admin-bubble'}`}>
              {renderMediaContent()}
              
              {message.content && (
                <div className="media-message-text">
                  {message.content.split('\n').map((line, index) => (
                    <div key={index}>
                      {line}
                      {index < message.content.split('\n').length - 1 && <br />}
                    </div>
                  ))}
                  {message.content.includes('...') && (
                    <button className="media-message-expand-button" onClick={toggleExpanded}>
                      Xem thêm
                    </button>
                  )}
                </div>
              )}
            </div>
            
            <div className="media-message-info">
              <span className="media-message-time">{formatTime(message.timestamp)}</span>
            </div>
          </div>

          {isFromCustomer && (
            <div className="media-message-customer-avatar">
              <div className="media-message-avatar-placeholder">
                {message.content.charAt(0).toUpperCase() || 'U'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Image Modal */}
      {showExpanded && message.mediaType === 'image' && (
        <div className="media-message-modal-overlay" onClick={toggleExpanded}>
          <div className="media-message-modal-content">
            <img src={message.mediaUrl} alt="Hình ảnh phóng to" />
            <button className="media-message-modal-close" onClick={toggleExpanded}>
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
