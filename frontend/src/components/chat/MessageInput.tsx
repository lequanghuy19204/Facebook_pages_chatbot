'use client';

import React, { forwardRef, useState, useRef } from 'react';
import '@/styles/chat/MessageInput.css';

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (message: string) => void;
}

const MessageInput = forwardRef<HTMLTextAreaElement, MessageInputProps>(
  ({ value, onChange, onSend }, ref) => {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    };

    const handleSend = () => {
      if (value.trim()) {
        onSend(value.trim());
      }
    };

    const handleFileUpload = (type: 'image' | 'file' | 'camera') => {
      // TODO: Implement file upload logic
      console.log(`Upload ${type}`);
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    };

    const handleEmojiSelect = (emoji: string) => {
      onChange(value + emoji);
      setShowEmojiPicker(false);
    };

    const commonEmojis = ['😊', '😂', '❤️', '👍', '👎', '😢', '😮', '😡', '🎉', '🔥'];

    const inputTools = [
      { icon: '😊', tooltip: 'Emoji', action: () => setShowEmojiPicker(!showEmojiPicker) },
      { icon: '📷', tooltip: 'Camera', action: () => handleFileUpload('camera'), hasNotification: true },
      { icon: '📁', tooltip: 'File', action: () => handleFileUpload('file') },
      { icon: '🎤', tooltip: 'Voice', action: () => console.log('Voice') },
      { icon: '🖼️', tooltip: 'Image', action: () => handleFileUpload('image') },
      { icon: '🎬', tooltip: 'GIF', action: () => console.log('GIF') },
      { icon: '⋯', tooltip: 'More', action: () => console.log('More') }
    ];

    return (
      <div className="message-input-component">
        {/* Input Header */}
        <div className="message-input-header">
          <div className="message-input-header-icon">
            📎
          </div>
          <div className="message-input-header-text">
            Trả lời từ Chapel Store
          </div>
        </div>

        {/* Main Input Area */}
        <div className="message-input-main">
          <div className="message-input-tools-left">
            <button
              className="message-input-tool-button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="Emoji"
            >
              😊
            </button>
          </div>

          <div className="message-input-field-container">
            <textarea
              ref={ref}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Nhập tin nhắn..."
              className="message-input-textarea"
              rows={1}
            />
            
            {showEmojiPicker && (
              <div className="message-input-emoji-picker">
                <div className="message-input-emoji-grid">
                  {commonEmojis.map((emoji, index) => (
                    <button
                      key={index}
                      className="message-input-emoji-button"
                      onClick={() => handleEmojiSelect(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="message-input-tools-right">
            {inputTools.slice(1).map((tool, index) => (
              <button
                key={index}
                className={`message-input-tool-button ${tool.hasNotification ? 'has-notification' : ''}`}
                onClick={tool.action}
                title={tool.tooltip}
              >
                {tool.icon}
                {tool.hasNotification && <div className="message-input-notification-dot"></div>}
              </button>
            ))}
            
            <button
              className="message-input-send-button"
              onClick={handleSend}
              disabled={!value.trim()}
              title="Gửi tin nhắn"
            >
              ➤
            </button>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              // TODO: Handle file upload
              console.log('Selected file:', file);
            }
          }}
        />
      </div>
    );
  }
);

MessageInput.displayName = 'MessageInput';

export default MessageInput;
