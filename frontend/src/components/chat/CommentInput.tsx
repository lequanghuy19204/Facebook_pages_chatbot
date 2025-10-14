'use client';

import React, { useRef, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { FacebookConversation } from '@/services/api';
import { toast } from 'react-toastify';
import '@/styles/chat/CommentInput.css';

const Picker = dynamic(() => import('@emoji-mart/react'), { ssr: false });

interface CommentInputProps {
  conversation: FacebookConversation | null;
  inputMessage: string;
  sending: boolean;
  onInputChange: (value: string) => void;
  onReplyComment: (attachments?: UploadedFile[]) => void;
  onSendPrivateMessage: (attachments?: UploadedFile[]) => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
}

interface UploadedFile {
  file: File;
  preview: string;
  type: 'image' | 'video' | 'file';
  cloudflare_url?: string;
  cloudflare_key?: string;
}

const CommentInputCommentInput = React.memo(({ 
  conversation, 
  inputMessage, 
  sending, 
  onInputChange, 
  onReplyComment,
  onSendPrivateMessage,
  onKeyPress 
}: CommentInputProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiData, setEmojiData] = useState<any>(null);
  const [selectedFiles, setSelectedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const tagColors = useMemo(() => {
    if (!conversation?.tags) return [];
    return conversation.tags.map((tag) => {
      const hash = Array.from(tag).reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const hue = hash % 360;
      return `hsla(${hue}, 60%, 70%, 0.4)`;
    });
  }, [conversation?.tags]);

  React.useEffect(() => {
    const loadEmojiData = async () => {
      const data = await import('@emoji-mart/data');
      setEmojiData(data.default);
    };
    loadEmojiData();
  }, []);

  React.useEffect(() => {
    if (conversation && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [conversation?.conversation_id]);

  const handleEmojiSelect = (emoji: any) => {
    onInputChange(inputMessage + emoji.native);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const MAX_FILE_SIZE = 25 * 1024 * 1024;
    const newFiles: UploadedFile[] = [];
    const errors: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: Vượt quá 25MB (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
        continue;
      }
      
      const fileType = file.type.startsWith('image/') ? 'image' : 
                       file.type.startsWith('video/') ? 'video' : 'file';
      
      const preview = fileType === 'image' || fileType === 'video' 
        ? URL.createObjectURL(file) 
        : '';
      
      newFiles.push({
        file,
        preview,
        type: fileType,
      });
    }
    
    if (errors.length > 0) {
      toast.error(`Một số file không thể tải lên:\n${errors.join('\n')}`, { autoClose: 4000 });
    }
    
    setSelectedFiles(prev => [...prev, ...newFiles]);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => {
      const newFiles = [...prev];
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  React.useEffect(() => {
    return () => {
      selectedFiles.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, [selectedFiles]);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleReplyCommentClick = async () => {
    if (sending || uploading) return;
    if (!inputMessage.trim() && selectedFiles.length === 0) return;
    
    onReplyComment(selectedFiles.length > 0 ? selectedFiles : undefined);
    setSelectedFiles([]);
    
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  const handleSendPrivateMessageClick = async () => {
    if (sending || uploading) return;
    if (!inputMessage.trim() && selectedFiles.length === 0) return;
    
    onSendPrivateMessage(selectedFiles.length > 0 ? selectedFiles : undefined);
    setSelectedFiles([]);
    
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      handleReplyCommentClick();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onInputChange(e.target.value);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  };

  const getPageAvatar = () => {
    if (!conversation) return '';
    return conversation.page_picture_url || conversation.page_picture || 
      `https://ui-avatars.com/api/?name=${encodeURIComponent(conversation.page_name || 'Page')}&background=random&size=200`;
  };

  const getPageName = () => {
    if (!conversation) return 'Page';
    return conversation.page_name || 'Unknown Page';
  };

  return (
    <>
      {conversation?.tags && conversation.tags.length > 0 && (
        <div className="comment-input-tags">
          <div className="comment-input-tags-scroll">
            <div className="comment-input-tag-row">
              {conversation.tags.map((tag, index) => (
                <span 
                  key={index} 
                  className="comment-input-tag-item" 
                  style={{ backgroundColor: tagColors[index] }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="comment-input-area">
        <div className="comment-input-container">
          <div className="comment-input-row">
            <div className="comment-input-page-info">
              <img 
                src={getPageAvatar()} 
                alt="page avatar" 
                className="comment-input-page-avatar"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(getPageName())}&background=random&size=200`;
                }}
              />
              <span className="comment-input-page-name">{getPageName()}</span>
            </div>

            <div className="comment-input-actions">
              <div style={{ position: 'relative' }}>
                <button 
                  className="comment-input-action-button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  title="Chọn emoji"
                  type="button"
                  disabled={uploading}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                    <line x1="9" y1="9" x2="9.01" y2="9"/>
                    <line x1="15" y1="9" x2="15.01" y2="9"/>
                  </svg>
                </button>
                
                {showEmojiPicker && emojiData && (
                  <div className="comment-emoji-picker-container">
                    <Picker 
                      data={emojiData}
                      onEmojiSelect={handleEmojiSelect}
                      theme="light"
                      locale="vi"
                      previewPosition="none"
                      skinTonePosition="none"
                    />
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
              <button 
                className="comment-input-action-button"
                onClick={handleImageClick}
                title="Chọn ảnh"
                disabled={uploading}
                type="button"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </button>

              <button 
                className="comment-input-reply-button"
                onClick={handleReplyCommentClick}
                title="Trả lời bình luận công khai"
                disabled={sending || uploading || (!inputMessage.trim() && selectedFiles.length === 0)}
                type="button"
              >
                💬 Trả lời
              </button>

              <button 
                className="comment-input-send-button"
                onClick={handleSendPrivateMessageClick}
                title="Gửi tin nhắn riêng tư"
                disabled={sending || uploading || (!inputMessage.trim() && selectedFiles.length === 0)}
                type="button"
              >
                ✉️ Nhắn tin
              </button>
            </div>
          </div>

          {selectedFiles.length > 0 && (
            <div className="comment-input-file-preview">
              {selectedFiles.map((file, index) => (
                <div key={index} className="comment-file-preview-item">
                  {file.type === 'image' && (
                    <img src={file.preview} alt="preview" className="comment-file-preview-image" />
                  )}
                  {file.type === 'video' && (
                    <video src={file.preview} className="comment-file-preview-video" controls />
                  )}
                  {file.type === 'file' && (
                    <div className="comment-file-preview-file">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                        <polyline points="13 2 13 9 20 9"/>
                      </svg>
                      <span>{file.file.name}</span>
                    </div>
                  )}
                  <button
                    className="comment-file-preview-remove"
                    onClick={() => handleRemoveFile(index)}
                    type="button"
                    disabled={sending || uploading}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="comment-input-textarea-container">
            <textarea
              ref={textareaRef}
              className="comment-message-textarea"
              placeholder="Nhập bình luận hoặc tin nhắn..."
              value={inputMessage}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              disabled={uploading}
              rows={1}
            />
          </div>
        </div>
      </div>
    </>
  );
});

CommentInputCommentInput.displayName = 'CommentInputCommentInput';

export default CommentInputCommentInput;

