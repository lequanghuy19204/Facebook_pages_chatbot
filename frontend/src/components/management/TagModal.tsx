'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FacebookTag, FacebookPage, CreateTagDto, UpdateTagDto } from '@/services/api';
import '@/styles/management/TagModal.css';

interface TagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tagData: CreateTagDto | UpdateTagDto) => Promise<void>;
  tag?: FacebookTag | null; // null for create, FacebookTag for edit
  facebookPages: FacebookPage[];
  loading: boolean;
}

const PRESET_COLORS = [
  '#F44336', // Red
  '#E91E63', // Pink
  '#9C27B0', // Purple
  '#673AB7', // Deep Purple
  '#3F51B5', // Indigo
  '#2196F3', // Blue
  '#03A9F4', // Light Blue
  '#00BCD4', // Cyan
  '#009688', // Teal
  '#4CAF50', // Green
  '#8BC34A', // Light Green
  '#CDDC39', // Lime
  '#FFEB3B', // Yellow
  '#FFC107', // Amber
  '#FF9800', // Orange
  '#FF5722', // Deep Orange
  '#795548', // Brown
  '#9E9E9E', // Grey
  '#607D8B', // Blue Grey
  '#3B3B3B', // Dark Grey
];

const R2_BUCKET_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET_URL || '';

export default function TagModal({
  isOpen,
  onClose,
  onSave,
  tag,
  facebookPages,
  loading
}: TagModalProps) {
  const [formData, setFormData] = useState({
    tag_name: '',
    tag_color: '#2196F3',
    page_ids: [] as string[]
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (tag) {
        // Edit mode
        setFormData({
          tag_name: tag.tag_name,
          tag_color: tag.tag_color,
          page_ids: [...tag.page_ids]
        });
      } else {
        // Create mode
        setFormData({
          tag_name: '',
          tag_color: '#2196F3',
          page_ids: []
        });
      }
      setErrors({});
      setSearchQuery('');
    }
  }, [isOpen, tag]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    setTimeout(() => {
      firstFocusableRef.current?.focus();
    }, 100);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.tag_name.trim()) {
      newErrors.tag_name = 'Tên tag không được để trống';
    } else if (formData.tag_name.length > 50) {
      newErrors.tag_name = 'Tên tag không được vượt quá 50 ký tự';
    }

    if (!formData.tag_color.match(/^#[0-9A-F]{6}$/i)) {
      newErrors.tag_color = 'Mã màu không hợp lệ';
    }

    if (formData.page_ids.length === 0) {
      newErrors.page_ids = 'Vui lòng chọn ít nhất 1 trang';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Handle color selection
  const handleColorSelect = (color: string) => {
    setFormData(prev => ({ ...prev, tag_color: color }));
    if (errors.tag_color) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.tag_color;
        return newErrors;
      });
    }
  };

  // Handle page selection
  const handlePageToggle = (pageId: string) => {
    setFormData(prev => {
      const newPageIds = prev.page_ids.includes(pageId)
        ? prev.page_ids.filter(id => id !== pageId)
        : [...prev.page_ids, pageId];
      
      return { ...prev, page_ids: newPageIds };
    });
    
    if (errors.page_ids) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.page_ids;
        return newErrors;
      });
    }
  };

  // Select/Deselect all pages
  const handleSelectAllPages = () => {
    const filteredPageIds = filteredPages.map(p => p.page_id);
    const allSelected = filteredPageIds.every(id => formData.page_ids.includes(id));
    
    if (allSelected) {
      // Deselect all filtered
      setFormData(prev => ({
        ...prev,
        page_ids: prev.page_ids.filter(id => !filteredPageIds.includes(id))
      }));
    } else {
      // Select all filtered
      setFormData(prev => ({
        ...prev,
        page_ids: [...new Set([...prev.page_ids, ...filteredPageIds])]
      }));
    }
  };

  // Filter pages by search
  const filteredPages = facebookPages.filter(page =>
    page.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    page.facebook_page_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle submit
  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving tag:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="tag-modal-backdrop" 
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tag-modal-title"
    >
      <div 
        ref={modalRef}
        className="tag-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="tag-modal-header">
          <h2 id="tag-modal-title" className="tag-modal-title">
            {tag ? '✏️ Chỉnh sửa Tag' : '➕ Tạo Tag mới'}
          </h2>
          <button
            ref={firstFocusableRef}
            className="tag-modal-close-btn"
            onClick={onClose}
            aria-label="Đóng modal"
            disabled={isSubmitting}
          >
            ✕
          </button>
        </div>

        {/* Modal Content */}
        <div className="tag-modal-content">
          {/* Tag Name */}
          <div className="tag-form-group">
            <label htmlFor="tag_name" className="tag-form-label">
              Tên Tag <span className="required">*</span>
            </label>
            <input
              type="text"
              id="tag_name"
              name="tag_name"
              value={formData.tag_name}
              onChange={handleInputChange}
              className={`tag-form-input ${errors.tag_name ? 'error' : ''}`}
              placeholder="Nhập tên tag..."
              disabled={isSubmitting}
              maxLength={50}
            />
            {errors.tag_name && (
              <div className="tag-form-error">{errors.tag_name}</div>
            )}
            <div className="tag-form-hint">
              {formData.tag_name.length}/50 ký tự
            </div>
          </div>

          {/* Color Picker */}
          <div className="tag-form-group">
            <label className="tag-form-label">
              Màu Tag <span className="required">*</span>
            </label>
            
            {/* Color Preview */}
            <div className="tag-color-preview">
              <div 
                className="tag-color-box"
                style={{ backgroundColor: formData.tag_color }}
              >
                <span className="tag-preview-text">
                  {formData.tag_name || 'Preview'}
                </span>
              </div>
              <input
                type="text"
                name="tag_color"
                value={formData.tag_color}
                onChange={handleInputChange}
                className="tag-color-input"
                placeholder="#2196F3"
                pattern="^#[0-9A-F]{6}$"
                disabled={isSubmitting}
              />
            </div>

            {/* Preset Colors */}
            <div className="tag-color-presets">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  className={`tag-color-preset ${formData.tag_color === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorSelect(color)}
                  disabled={isSubmitting}
                  title={color}
                />
              ))}
            </div>
            
            {errors.tag_color && (
              <div className="tag-form-error">{errors.tag_color}</div>
            )}
          </div>

          {/* Pages Selection */}
          <div className="tag-form-group">
            <label className="tag-form-label">
              Chọn Pages <span className="required">*</span>
            </label>
            <div className="tag-pages-hint">
              Tag này sẽ hiển thị cho các pages được chọn
            </div>

            {/* Search Pages */}
            <input
              type="text"
              placeholder="🔍 Tìm kiếm trang..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="tag-search-input"
              disabled={isSubmitting}
            />

            {/* Select All Button */}
            <div className="tag-pages-controls">
              <button
                type="button"
                className="tag-select-all-btn"
                onClick={handleSelectAllPages}
                disabled={filteredPages.length === 0 || isSubmitting}
              >
                {filteredPages.every(p => formData.page_ids.includes(p.page_id))
                  ? '✓ Bỏ chọn tất cả'
                  : '☐ Chọn tất cả'}
              </button>
              <span className="tag-selection-count">
                Đã chọn: {formData.page_ids.length} / {facebookPages.length}
              </span>
            </div>

            {/* Pages List */}
            <div className="tag-pages-list">
              {filteredPages.length > 0 ? (
                filteredPages.map(page => (
                  <label 
                    key={page.page_id}
                    className={`tag-page-item ${formData.page_ids.includes(page.page_id) ? 'selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.page_ids.includes(page.page_id)}
                      onChange={() => handlePageToggle(page.page_id)}
                      disabled={isSubmitting}
                    />
                    {page.picture_cloudflare_key ? (
                        <img 
                            src={`${R2_BUCKET_URL}/${page.picture_cloudflare_key}`} 
                            alt={`${page.name} logo`}
                            className="tag-page-avatar"
                            loading="lazy"
                            onError={(e) => {
                            
                            const target = e.target as HTMLImageElement;
                            target.onerror = null; 
                            target.parentElement!.innerHTML = `<div class="mgmt-modal-avatar-placeholder">${page.name.charAt(0).toUpperCase()}</div>`;
                            }}
                        />
                        ) : (
                        <div className="mgmt-modal-avatar-placeholder">
                            {page.name.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div className="tag-page-info">
                      <div className="tag-page-name">{page.name}</div>
                      <div className="tag-page-id">{page.facebook_page_id}</div>
                    </div>
                  </label>
                ))
              ) : (
                <div className="tag-pages-empty">
                  {searchQuery 
                    ? `Không tìm thấy trang phù hợp với "${searchQuery}"`
                    : 'Không có trang nào'}
                </div>
              )}
            </div>

            {errors.page_ids && (
              <div className="tag-form-error">{errors.page_ids}</div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="tag-modal-footer">
          <button
            className="tag-btn tag-btn-secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            ❌ Hủy
          </button>
          <button
            className="tag-btn tag-btn-primary"
            onClick={handleSubmit}
            disabled={isSubmitting || loading}
          >
            {isSubmitting ? '⏳ Đang lưu...' : (tag ? '💾 Cập nhật' : '➕ Tạo Tag')}
          </button>
        </div>
      </div>
    </div>
  );
}
