'use client';

import React, { useState } from 'react';
import { useFacebook } from '@/contexts/FacebookContext';
import { useAuth } from '@/contexts/AuthContext';

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
  const renderPageCard = (page: any) => (
    <div key={page.page_id} className="page-card">
      <div className="page-avatar">
        <div className="avatar-placeholder">
          {page.name.charAt(0).toUpperCase()}
        </div>
      </div>
      
      <div className="page-info">
        <div className="page-name" title={page.name}>
          {page.name}
        </div>
        <div className="page-details">
          <div className="page-id-container">
            <img 
              src="/src/components/assets/c27e5581-3934-4841-9207-3e7c6f822f6c.png" 
              alt="Link" 
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

      <style jsx>{`
        .facebook-pages {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .pages-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 4px;
        }

        .header-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .pages-title {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
        }

        .pages-count {
          font-size: 14px;
          color: #6b7280;
          background-color: #f3f4f6;
          padding: 2px 8px;
          border-radius: 12px;
        }

        .sync-button {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          color: #475569;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .sync-button:hover:not(:disabled) {
          background-color: #f1f5f9;
          border-color: #cbd5e1;
        }

        .sync-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .sync-icon {
          width: 14px;
          height: 14px;
        }

        .sync-result {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background-color: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          padding: 12px;
          font-size: 14px;
        }

        .sync-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .sync-count {
          font-size: 12px;
          color: #6c757d;
        }

        .sync-error {
          color: #dc3545;
          font-size: 12px;
          margin-top: 4px;
        }

        .close-result {
          background: none;
          border: none;
          color: #6c757d;
          cursor: pointer;
          font-size: 16px;
          padding: 4px;
          border-radius: 50%;
        }

        .close-result:hover {
          background-color: rgba(0,0,0,0.1);
        }

        .pages-content {
          min-height: 200px;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          gap: 12px;
          color: #6b7280;
        }

        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #e5e7eb;
          border-top: 2px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .loading-spinner.large {
          width: 32px;
          height: 32px;
          border-width: 3px;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          text-align: center;
          color: #6b7280;
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .empty-title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 8px;
          color: #374151;
        }

        .empty-description {
          font-size: 14px;
          max-width: 300px;
          line-height: 1.5;
        }

        .pages-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 16px;
        }

        .page-card {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          background-color: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          transition: all 0.2s;
          cursor: pointer;
        }

        .page-card:hover {
          border-color: #3b82f6;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .page-avatar {
          flex-shrink: 0;
        }

        .avatar-placeholder {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 18px;
        }

        .page-info {
          flex: 1;
          min-width: 0;
        }

        .page-name {
          font-size: 15px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 8px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .page-details {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 12px;
          color: #6b7280;
        }

        .page-id-container {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .link-icon {
          width: 12px;
          height: 12px;
          opacity: 0.7;
        }

        .page-id {
          font-family: monospace;
        }

        .page-category {
          color: #4b5563;
        }

        .page-status {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .status-indicator {
          font-size: 8px;
        }

        .last-sync {
          color: #9ca3af;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .pages-grid {
            grid-template-columns: 1fr;
          }
          
          .pages-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          
          .sync-button {
            align-self: flex-end;
          }
        }
      `}</style>
    </div>
  );
}
