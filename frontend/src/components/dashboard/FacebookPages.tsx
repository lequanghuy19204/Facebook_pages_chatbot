'use client';

import React, { useState } from 'react';
import { useFacebook } from '@/contexts/FacebookContext';
import { useAuth } from '@/contexts/AuthContext';
import '@/styles/FacebookPages.css';

interface FacebookPagesProps {
  className?: string;
}

export default function FacebookPages({ className = '' }: FacebookPagesProps) {
  const { user } = useAuth();
  const {
    isConnected,
    pages,
    pagesLoading,
    syncing,
    error,
    syncPages,
    clearError
  } = useFacebook();

  const [syncResult, setSyncResult] = useState<any>(null);
  const [showSyncResult, setShowSyncResult] = useState(false);

  // Check if user is admin
  const isAdmin = user?.roles.includes('admin');

  // Handle sync pages
  const handleSync = async () => {
    if (error) clearError();
    
    try {
      const result = await syncPages();
      setSyncResult(result);
      setShowSyncResult(true);
      
      // Auto hide sync result after 5 seconds
      setTimeout(() => {
        setShowSyncResult(false);
        setSyncResult(null);
      }, 5000);
    } catch (err) {
      console.error('Sync failed:', err);
    }
  };

  // Format sync status
  const getSyncStatusColor = (status: string) => {
    switch (status) {
      case 'success': return '#28a745';
      case 'error': return '#dc3545';
      case 'pending': return '#ffc107';
      default: return '#6c757d';
    }
  };

  // Render sync result
  const renderSyncResult = () => {
    if (!showSyncResult || !syncResult) return null;

    return (
      <div className="sync-result">
        <div className="sync-info">
          <span className="sync-status" style={{ color: getSyncStatusColor(syncResult.sync_status) }}>
            {syncResult.sync_status === 'success' && '✅ Đồng bộ thành công'}
            {syncResult.sync_status === 'error' && '❌ Đồng bộ thất bại'}
            {syncResult.sync_status === 'partial' && '⚠️ Đồng bộ một phần'}
          </span>
          <span className="sync-count">
            {syncResult.pages_synced}/{syncResult.pages_total} pages
          </span>
        </div>
        
        {syncResult.error_message && (
          <div className="sync-error">
            {syncResult.error_message}
          </div>
        )}
        
        <button 
          className="close-result"
          onClick={() => setShowSyncResult(false)}
          title="Đóng"
        >
          ✕
        </button>
      </div>
    );
  };

  // Render empty state
  const renderEmptyState = () => {
    if (!isConnected) {
      return (
        <div className="empty-state">
          <div className="empty-icon">📱</div>
          <div className="empty-title">Chưa kết nối Facebook</div>
          <div className="empty-description">
            {isAdmin 
              ? 'Vui lòng kết nối Facebook để xem danh sách Pages'
              : 'Admin cần kết nối Facebook trước để xem Pages'
            }
          </div>
        </div>
      );
    }

    if (pages.length === 0 && !pagesLoading) {
      return (
        <div className="empty-state">
          <div className="empty-icon">📄</div>
          <div className="empty-title">Không có Pages nào</div>
          <div className="empty-description">
            Tài khoản Facebook chưa có Pages nào hoặc chưa được cấp quyền truy cập
          </div>
        </div>
      );
    }

    return null;
  };

  // Render page card
  const renderPageCard = (page: any) => {
    return (
    <div key={page.page_id} className="page-card">
      <div className="page-avatar">
        {page.picture_cloudflare_key ? (
          <img 
            src={`https://pub-29571d63ff4741baa4c864245169a1ba.r2.dev/${page.picture_cloudflare_key}`} 
            alt={`${page.name} logo`}
            className="avatar-image"
            onError={(e) => {
              // Fallback to placeholder if image fails to load
              const target = e.target as HTMLImageElement;
              target.onerror = null; // Prevent infinite loop
              target.parentElement!.innerHTML = `<div class="avatar-placeholder">${page.name.charAt(0).toUpperCase()}</div>`;
            }}
          />
        ) : (
          <div className="avatar-placeholder">
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
              style={{ color: getSyncStatusColor(page.sync_status) }}
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
  );
  }

  return (
    <div className={`facebook-pages ${className}`}>
      {/* Header */}
      <div className="pages-header">
        <div className="header-info">
          <span className="pages-title">Facebook Pages</span>
          <span className="pages-count">({pages.length})</span>
        </div>
        
        {isConnected && isAdmin && (
          <button
            className="sync-button"
            onClick={handleSync}
            disabled={syncing || pagesLoading}
            title="Đồng bộ Pages từ Facebook"
          >
            {syncing ? (
              <>
                <div className="loading-spinner"></div>
                <span>Đang đồng bộ...</span>
              </>
            ) : (
              <>
                <img src="/load.svg" alt="Sync" className="sync-icon" />
                <span>Đồng bộ</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Sync Result */}
      {renderSyncResult()}

      {/* Content */}
      <div className="pages-content">
        {pagesLoading ? (
          <div className="loading-state">
            <div className="loading-spinner large"></div>
            <span>Đang tải Pages...</span>
          </div>
        ) : pages.length > 0 ? (
          <div className="pages-grid">
            {pages.map(renderPageCard)}
          </div>
        ) : (
          renderEmptyState()
        )}
      </div>
    </div>
  );
}
