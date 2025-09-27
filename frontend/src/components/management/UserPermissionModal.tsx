'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, FacebookPage, UserRole } from '@/services/api';
import '@/styles/management/UserPermissionModal.css';

interface UserPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  currentUser: any;
  facebookPages: FacebookPage[];
  onUpdateRoles: (userId: string, roles: string[]) => Promise<void>;
  onUpdateFacebookPages: (userId: string, pageIds: string[]) => Promise<void>;
  loading: boolean;
}


const ROLE_OPTIONS = [
  { value: UserRole.MANAGE_USER, label: 'Quản lý User', icon: '👥', description: 'Quản lý tài khoản người dùng' },
  { value: UserRole.MANAGE_PRODUCTS, label: 'Quản lý Sản phẩm', icon: '📦', description: 'Quản lý danh mục sản phẩm' },
  { value: UserRole.MANAGE_CHATBOT, label: 'Quản lý Chatbot', icon: '🤖', description: 'Cấu hình và quản lý chatbot' }
];

const R2_BUCKET_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET_URL || '';

export default function UserPermissionModal({
  isOpen,
  onClose,
  user,
  currentUser,
  facebookPages,
  onUpdateRoles,
  onUpdateFacebookPages,
  loading
}: UserPermissionModalProps) {
  
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  
  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);
  const lastFocusableRef = useRef<HTMLButtonElement>(null);

  
  useEffect(() => {
    if (user) {
      setSelectedRoles([...user.roles]);
      setSelectedPages([...(user.facebook_pages_access || [])]);
      setSearchQuery('');
    }
  }, [user]);

  
  const hasManageUserRole = user?.roles.includes('manage_user') || false;
  const hasAdminRole = user?.roles.includes('admin') || false;
  const hasFullPageAccess = hasAdminRole || hasManageUserRole;
  
  
  const canAssignManageUserRole = currentUser?.roles.includes('admin') || false;

  
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

  
  const filteredPages = facebookPages.filter(page =>
    page.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  
  const handleRoleChange = (role: string) => {
    setSelectedRoles(prev => {
      if (prev.includes(role)) {
        return prev.filter(r => r !== role);
      } else {
        return [...prev, role];
      }
    });
  };

  
  const handlePageChange = (pageId: string) => {
    setSelectedPages(prev => {
      if (prev.includes(pageId)) {
        return prev.filter(id => id !== pageId);
      } else {
        return [...prev, pageId];
      }
    });
  };

  
  const handleSelectAllPages = () => {
    const filteredPageIds = filteredPages.map(page => page.page_id);
    const allFilteredSelected = filteredPageIds.every(id => selectedPages.includes(id));

    if (allFilteredSelected) {
      
      setSelectedPages(prev => prev.filter(id => !filteredPageIds.includes(id)));
    } else {
      
      setSelectedPages(prev => {
        const newSelected = [...prev];
        filteredPageIds.forEach(id => {
          if (!newSelected.includes(id)) {
            newSelected.push(id);
          }
        });
        return newSelected;
      });
    }
  };

  
  const areAllFilteredPagesSelected = filteredPages.length > 0 && 
    filteredPages.every(page => selectedPages.includes(page.page_id));

  
  const handleSubmit = async () => {
    if (!user) return;

    try {
      setIsSubmitting(true);
      
      
      await onUpdateRoles(user.id, selectedRoles);
      
      
      if (!hasFullPageAccess) {
        await onUpdateFacebookPages(user.id, selectedPages);
      } else {
        
        
        await onUpdateFacebookPages(user.id, []);
      }
      
      onClose();
    } catch (error) {
      console.error('Error updating user permissions:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div 
      className="modal-backdrop" 
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <div 
        ref={modalRef}
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <h2 id="modal-title" className="modal-title">
            🔐 Chế độ phân quyền
          </h2>
          <button
            ref={firstFocusableRef}
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Đóng modal"
            disabled={isSubmitting}
          >
            ✕
          </button>
        </div>

        <div id="modal-description" className="sr-only">
          Cấu hình quyền hệ thống và quyền truy cập Facebook Pages cho {user.full_name}
        </div>

        {/* Modal Content */}
        <div className="modal-content">
          
          {/* Section 1: Account Permissions */}
          <div className="permission-section">
            <div className="section-header">
              <h3 className="section-title">
                👤 Phân quyền tài khoản
              </h3>
              <div className="section-subtitle">
                Cấu hình quyền hệ thống cho {user.full_name}
              </div>
            </div>

            <div className="roles-grid">
              {ROLE_OPTIONS.map(role => {
                
                const isManageUserRole = role.value === UserRole.MANAGE_USER;
                const isDisabled = isSubmitting || (isManageUserRole && !canAssignManageUserRole);
                
                return (
                  <label key={role.value} className={`role-checkbox ${isDisabled && isManageUserRole ? 'restricted' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(role.value)}
                      onChange={() => handleRoleChange(role.value)}
                      disabled={isDisabled}
                    />
                    <div className="role-content">
                      <div className="role-icon">{role.icon}</div>
                      <div className="role-info">
                        <div className="role-name">
                          {role.label}
                          {isManageUserRole && !canAssignManageUserRole && (
                            <span className="restricted-badge"> 🔒</span>
                          )}
                        </div>
                        <div className="role-description">
                          {isManageUserRole && !canAssignManageUserRole 
                            ? 'Chỉ Admin mới có thể phân quyền này'
                            : role.description
                          }
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Section 2: Facebook Pages Permissions */}
          <div className="permission-section">
            <div className="section-header">
              <h3 className="section-title">
                📱 Phân quyền Pages
              </h3>
              <div className="section-subtitle">
                Chọn các trang Facebook mà {user.full_name} có thể truy cập
              </div>
            </div>

            {/* Show full access notice for manage_user role */}
            {hasFullPageAccess && (
              <div className="full-access-notice">
                <div className="notice-content">
                  <span className="notice-icon">🔓</span>
                  <div className="notice-text">
                    <div className="notice-title">Quyền truy cập đầy đủ</div>
                    <div className="notice-description">
                      Tài khoản này có quyền {hasAdminRole ? 'Admin' : 'Quản lý User'} nên tự động có thể truy cập tất cả Facebook Pages của công ty.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Search and Select All */}
            <div className="pages-controls">
              <div className="search-container">
                <input
                  type="text"
                  placeholder="🔍 Tìm kiếm trang..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                  disabled={isSubmitting || hasFullPageAccess}
                />
              </div>
              
              <button
                className="select-all-btn"
                onClick={handleSelectAllPages}
                disabled={filteredPages.length === 0 || isSubmitting || hasFullPageAccess}
              >
                {hasFullPageAccess ? '✅ Tất cả đã được chọn' : 
                  (areAllFilteredPagesSelected ? '☑️ Bỏ chọn tất cả' : '☐ Chọn tất cả')}
                {filteredPages.length > 0 && ` (${filteredPages.length})`}
              </button>
            </div>

            {/* Pages Grid */}
            <div className="pages-scroll-container">
              {filteredPages.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📱</div>
                  <div className="empty-message">
                    {searchQuery ? 'Không tìm thấy trang nào phù hợp' : 'Chưa có trang Facebook nào'}
                  </div>
                </div>
              ) : (
                <div className="pages-grid">
                  {filteredPages.map(page => (
                    <label key={page.page_id} className={`mgmt-modal-page-card ${hasFullPageAccess ? 'full-access' : ''}`}>
                      <input
                        type="checkbox"
                        checked={hasFullPageAccess || selectedPages.includes(page.page_id)}
                        onChange={() => handlePageChange(page.page_id)}
                        disabled={isSubmitting || hasFullPageAccess}
                      />
                      <div className="mgmt-modal-page-content">
                        <div className="mgmt-modal-page-avatar">
                          {page.picture_cloudflare_key ? (
                            <img 
                              src={`${R2_BUCKET_URL}/${page.picture_cloudflare_key}`} 
                              alt={`${page.name} logo`}
                              className="mgmt-modal-avatar-image"
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
                        </div>
                        
                        <div className="page-info">
                          <div className="page-name" title={page.name}>
                            {page.name}
                          </div>
                          <div className="page-details">
                            <div className="page-id-container">
                              <img 
                                src="/facebook.svg" 
                                alt="Facebook" 
                                className="link-icon"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                              <span className="page-id">{page.facebook_page_id}</span>
                            </div>
                            
                            {page.category && (
                              <div className="page-category">
                                📂 {page.category}
                              </div>
                            )}
                            
                            <div className="page-status">
                              <span 
                                className="status-indicator"
                                style={{ color: page.sync_status === 'success' ? '#28a745' : page.sync_status === 'error' ? '#dc3545' : '#6c757d' }}
                              >
                                ●
                              </span>
                              <span className="status-text">
                                {page.sync_status === 'success' && 'Hoạt động'}
                                {page.sync_status === 'error' && 'Lỗi'}
                                {page.sync_status === 'pending' && 'Đang xử lý'}
                              </span>
                              
                              {page.last_sync && (
                                <span className="last-sync">
                                  • {new Date(page.last_sync).toLocaleDateString('vi-VN')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Selection Summary */}
            <div className="selection-summary">
              {hasFullPageAccess ? (
                <span className="full-access-summary">
                  ✅ Quyền truy cập đầy đủ: {facebookPages.length} / {facebookPages.length} trang
                </span>
              ) : (
                <>
                  Đã chọn: {selectedPages.length} / {facebookPages.length} trang
                  {searchQuery && filteredPages.length !== facebookPages.length && 
                    ` (${filteredPages.filter(page => selectedPages.includes(page.page_id)).length} / ${filteredPages.length} trong kết quả tìm kiếm)`
                  }
                </>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            ❌ Hủy
          </button>
          <button
            ref={lastFocusableRef}
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={isSubmitting || loading}
          >
            {isSubmitting ? '⏳ Đang lưu...' : '✅ Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  );
}
