'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FacebookPage } from '@/services/api';
import '@/styles/dashboard/MergedPagesFilterModal.css';

interface MergedPagesFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  facebookPages: FacebookPage[];
  currentMergedPages: string[]; // merged_pages_filter hiện tại của user (chứa facebook_page_id)
  onSave: (selectedFacebookPageIds: string[]) => Promise<void>;
  loading: boolean;
}

export default function MergedPagesFilterModal({
  isOpen,
  onClose,
  facebookPages,
  currentMergedPages,
  onSave,
  loading
}: MergedPagesFilterModalProps) {
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refs for accessibility
  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);
  const lastFocusableRef = useRef<HTMLButtonElement>(null);

  // Initialize selected pages
  useEffect(() => {
    if (isOpen) {
      setSelectedPages([...currentMergedPages]);
      setSearchQuery('');
    }
  }, [isOpen, currentMergedPages]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (!focusableElements || focusableElements.length === 0) return;

        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
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

  // Lock body scroll when modal is open
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

  // Filter pages based on search
  const filteredPages = useMemo(() => {
    if (!searchQuery.trim()) {
      return facebookPages;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return facebookPages.filter(page =>
      page.name.toLowerCase().includes(query) ||
      page.facebook_page_id.toLowerCase().includes(query) ||
      (page.category && page.category.toLowerCase().includes(query))
    );
  }, [facebookPages, searchQuery]);

  // Handle page selection toggle
  const handlePageChange = (facebookPageId: string) => {
    setSelectedPages(prev => {
      if (prev.includes(facebookPageId)) {
        return prev.filter(id => id !== facebookPageId);
      } else {
        return [...prev, facebookPageId];
      }
    });
  };

  // Select/Deselect all filtered pages
  const handleSelectAllPages = () => {
    const filteredFacebookPageIds = filteredPages.map(page => page.facebook_page_id);
    const allFilteredSelected = filteredFacebookPageIds.every(id => selectedPages.includes(id));

    if (allFilteredSelected) {
      // Deselect all filtered pages
      setSelectedPages(prev => prev.filter(id => !filteredFacebookPageIds.includes(id)));
    } else {
      // Select all filtered pages
      setSelectedPages(prev => {
        const newSelected = [...prev];
        filteredFacebookPageIds.forEach(id => {
          if (!newSelected.includes(id)) {
            newSelected.push(id);
          }
        });
        return newSelected;
      });
    }
  };

  // Check if all filtered pages are selected
  const areAllFilteredPagesSelected = filteredPages.length > 0 && 
    filteredPages.every(page => selectedPages.includes(page.facebook_page_id));

  // Handle clear all selection (show all pages)
  const handleClearSelection = () => {
    setSelectedPages([]);
  };

  // Handle submit
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      await onSave(selectedPages);
      onClose();
    } catch (error) {
      console.error('Error saving merged pages filter:', error);
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

  // Generate avatar color
  const getPageAvatar = (pageName: string) => {
    const colors = [
      '#667eea', '#764ba2', '#f093fb', '#f5576c',
      '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
      '#ffecd2', '#fcb69f', '#a8edea', '#fed6e3'
    ];
    const colorIndex = pageName.charCodeAt(0) % colors.length;
    return colors[colorIndex];
  };

  if (!isOpen) return null;

  return (
    <div 
      className="merged-modal-backdrop" 
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="merged-modal-title"
      aria-describedby="merged-modal-description"
    >
      <div 
        ref={modalRef}
        className="merged-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="merged-modal-header">
          <h2 id="merged-modal-title" className="merged-modal-title">
            🔀 Gộp trang
          </h2>
          <button
            ref={firstFocusableRef}
            className="merged-modal-close-btn"
            onClick={onClose}
            aria-label="Đóng modal"
            disabled={isSubmitting}
          >
            ✕
          </button>
        </div>

        <div id="merged-modal-description" className="sr-only">
          Chọn các Facebook Pages bạn muốn hiển thị trong dashboard
        </div>

        {/* Modal Content */}
        <div className="merged-modal-content">
          <div className="merged-info-section">
            <div className="info-icon">💡</div>
            <div className="info-text">
              <div className="info-title">Gộp trang để dễ quản lý</div>
              <div className="info-description">
                Chọn các trang bạn muốn hiển thị. Nếu không chọn trang nào, tất cả các trang sẽ được hiển thị.
              </div>
            </div>
          </div>

          {/* Search and Controls */}
          <div className="merged-pages-controls">
            <div className="merged-search-container">
              <input
                type="text"
                placeholder="🔍 Tìm kiếm trang..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="merged-search-input"
                disabled={isSubmitting}
              />
            </div>
            
            <div className="merged-control-buttons">
              <button
                className="merged-select-all-btn"
                onClick={handleSelectAllPages}
                disabled={filteredPages.length === 0 || isSubmitting}
              >
                {areAllFilteredPagesSelected ? '✓ Bỏ chọn tất cả' : '☐ Chọn tất cả'}
              </button>
              
              <button
                className="merged-clear-btn"
                onClick={handleClearSelection}
                disabled={selectedPages.length === 0 || isSubmitting}
              >
                🗑️ Xóa chọn
              </button>
            </div>
          </div>

          {/* Pages Grid */}
          <div className="merged-pages-scroll-container">
            {filteredPages.length > 0 ? (
              <div className="merged-pages-grid">
                {filteredPages.map((page) => {
                  const isSelected = selectedPages.includes(page.facebook_page_id);
                  
                  return (
                    <label 
                      key={page.facebook_page_id} 
                      className={`merged-page-card ${isSelected ? 'selected' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handlePageChange(page.facebook_page_id)}
                        disabled={isSubmitting}
                      />
                      
                      <div className="merged-page-content">
                        {/* Page Avatar */}
                        <div className="merged-page-avatar">
                          {page.picture_url ? (
                            <img 
                              src={page.picture_url}
                              alt={`${page.name} logo`}
                              className="merged-avatar-image"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = `<div class="merged-avatar-placeholder" style="background-color: ${getPageAvatar(page.name)}">${page.name.charAt(0).toUpperCase()}</div>`;
                                }
                              }}
                            />
                          ) : (
                            <div 
                              className="merged-avatar-placeholder"
                              style={{ backgroundColor: getPageAvatar(page.name) }}
                            >
                              {page.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        
                        {/* Page Info */}
                        <div className="merged-page-info">
                          <div className="merged-page-name" title={page.name}>
                            {page.name}
                          </div>
                          <div className="merged-page-details">
                            <div className="merged-page-id-container">
                              <img 
                                src="/facebook.svg" 
                                alt="Facebook" 
                                className="merged-link-icon"
                              />
                              <span className="merged-page-id">{page.facebook_page_id}</span>
                            </div>
                            
                            {page.category && (
                              <div className="merged-page-category">
                                📂 {page.category}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="merged-empty-state">
                <div className="merged-empty-icon">🔍</div>
                <div className="merged-empty-message">
                  {searchQuery 
                    ? `Không tìm thấy trang phù hợp với "${searchQuery}"`
                    : 'Không có trang nào'
                  }
                </div>
              </div>
            )}
          </div>

          {/* Selection Summary */}
          <div className="merged-selection-summary">
            <div className="summary-text">
              {selectedPages.length === 0 ? (
                <>
                  <span className="summary-icon">📋</span>
                  <span>Hiển thị tất cả {facebookPages.length} trang</span>
                </>
              ) : (
                <>
                  <span className="summary-icon">✓</span>
                  <span>Đã chọn {selectedPages.length} / {facebookPages.length} trang</span>
                </>
              )}
            </div>
            
            {filteredPages.length < facebookPages.length && (
              <div className="filter-notice">
                Đang hiển thị {filteredPages.length} trang
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="merged-modal-footer">
          <button
            className="merged-btn merged-btn-secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            ❌ Hủy
          </button>
          <button
            ref={lastFocusableRef}
            className="merged-btn merged-btn-primary"
            onClick={handleSubmit}
            disabled={isSubmitting || loading}
          >
            {isSubmitting ? '⏳ Đang lưu...' : '✅ Gộp trang'}
          </button>
        </div>
      </div>
    </div>
  );
}
