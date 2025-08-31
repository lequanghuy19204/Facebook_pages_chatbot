'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFacebook } from '@/contexts/FacebookContext';
import FacebookConnect from './FacebookConnect';
import FacebookPages from './FacebookPages';
import '@/styles/Dashboard.css';
import { toast } from 'react-toastify';

interface DashboardProps {
  onLogout?: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const { user, company, logout } = useAuth();
  const { isConnected, pages, pagesLoading, syncing, syncPages } = useFacebook();
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = async () => {
    await logout();
    if (onLogout) {
      onLogout();
    }
  };

  // Filter pages based on search query
  const filteredPages = useMemo(() => {
    if (!searchQuery.trim()) {
      return pages;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return pages.filter(page => 
      page.name.toLowerCase().includes(query) ||
      page.facebook_page_id.toLowerCase().includes(query) ||
      (page.category && page.category.toLowerCase().includes(query))
    );
  }, [pages, searchQuery]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
  };

  // Handle sync pages
  const handleSyncPages = async () => {
    if (!isConnected) {
      toast.warning('Vui lòng kết nối Facebook trước khi đồng bộ');
      return;
    }

    try {
      const result = await syncPages();
      
      if (result.sync_status === 'success') {
        toast.success(`Đã đồng bộ thành công ${result.pages_synced} trang`);
      } else if (result.sync_status === 'partial') {
        toast.warning(
          `Đồng bộ một phần: ${result.pages_synced}/${result.pages_total} trang. ` +
          (result.error_message ? result.error_message : '')
        );
      } else {
        toast.error(
          `Đồng bộ thất bại: ${result.error_message || 'Đã có lỗi xảy ra'}`
        );
      }
    } catch (error: any) {
      toast.error(error.message || 'Không thể đồng bộ Facebook Pages');
    }
  };

  // Generate avatar placeholder for pages
  const getPageAvatar = (pageName: string) => {
    const colors = [
      '#667eea', '#764ba2', '#f093fb', '#f5576c',
      '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
      '#ffecd2', '#fcb69f', '#a8edea', '#fed6e3'
    ];
    const colorIndex = pageName.charCodeAt(0) % colors.length;
    return colors[colorIndex];
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="user-info">
            <div className="user-details">
              <div className="user-avatar-placeholder">
                {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="user-name">{user?.full_name || 'User'}</div>
            </div>
            <button className="logout-button" onClick={handleLogout} title="Đăng xuất">
              <span className="logout-text">⏻</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="dashboard-main">
        <div className="dashboard-content">
          <div className="content-wrapper">
            {/* Control Panel Header */}
            <div className="control-panel-header">
              <div className="panel-title">Bảng điều khiển</div>
              <div className="panel-actions">
                <div className="actions-left">
                  <div className="search-box">
                    <img src="/search.svg" alt="Search" className="search-icon" />
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Tìm kiếm theo tên page..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                    />
                    {searchQuery && (
                      <button 
                        className="clear-search-button"
                        onClick={clearSearch}
                        title="Xóa tìm kiếm"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="actions-right">
                  <button 
                    className="action-button"
                    onClick={handleSyncPages}
                    disabled={syncing || !isConnected}
                    title={!isConnected ? "Vui lòng kết nối Facebook trước" : "Đồng bộ Pages từ Facebook"}
                  >
                    {syncing ? (
                      <div className="loading-spinner"></div>
                    ) : (
                      <img src="/load.svg" alt="Sync" className="action-icon" />
                    )}
                  </button>
                  
                  <FacebookConnect className="connect-facebook-button" />
                  
                  <button className="merge-pages-button">
                    <img src="/megre_page.svg" alt="Merge" className="merge-icon" />
                    <span>Gộp trang</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="filter-tabs">
              <div className="tab-container">
                <div className="tab active">
                  <img src="/all.svg" alt="All" className="tab-icon" />
                  <span className="tab-text">Tất cả</span>
                  <div className="tab-badge">
                    {searchQuery ? `${filteredPages.length}/${pages.length}` : pages.length}
                  </div>
                </div>
                <div className="tab">
                  <img src="/facebook.svg" alt="Facebook" className="tab-icon" />
                  <span className="tab-text">Facebook</span>
                  <div className={`tab-badge ${isConnected ? '' : 'inactive'}`}>
                    {isConnected 
                      ? (searchQuery ? `${filteredPages.length}/${pages.length}` : pages.length)
                      : 0
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* Pages Grid */}
            <div className="pages-container">
              {pagesLoading ? (
                <div className="loading-pages">
                  <div className="loading-spinner"></div>
                  <span>Đang tải Facebook Pages...</span>
                </div>
              ) : pages.length > 0 ? (
                filteredPages.length > 0 ? (
                  <div className="pages-grid">
                    {filteredPages.map((page) => (
                      <div key={page.page_id} className="page-card">
                        <div 
                          className="page-avatar-placeholder"
                          style={{ backgroundColor: getPageAvatar(page.name) }}
                        >
                          {page.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="page-info">
                          <div className="page-name">{page.name}</div>
                          <div className="page-id-container">
                            <span className="link-icon">🔗</span>
                            <div className="page-id">{page.facebook_page_id}</div>
                          </div>
                          {page.category && (
                            <div className="page-category">
                              📂 {page.category}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-pages">
                    <div className="empty-state">
                      <div className="empty-icon">🔍</div>
                      <div className="empty-title">Không tìm thấy kết quả</div>
                      <div className="empty-description">
                        Không có page nào phù hợp với từ khóa "{searchQuery}"
                      </div>
                      <button 
                        className="clear-search-btn"
                        onClick={clearSearch}
                      >
                        Xóa bộ lọc
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div className="empty-pages">
                  {isConnected ? (
                    <div className="empty-state">
                      <div className="empty-icon">📄</div>
                      <div className="empty-title">Không có Pages nào</div>
                      <div className="empty-description">
                        Tài khoản Facebook chưa có Pages nào hoặc chưa được cấp quyền truy cập
                      </div>
                    </div>
                  ) : (
                    <div className="empty-state">
                      <div className="empty-icon">📱</div>
                      <div className="empty-title">Chưa kết nối Facebook</div>
                      <div className="empty-description">
                        {user?.roles.includes('admin') 
                          ? 'Vui lòng kết nối Facebook để xem danh sách Pages'
                          : 'Admin cần kết nối Facebook trước để xem Pages'
                        }
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .action-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          border: none;
          background-color: rgba(234, 236, 240, 1);
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .action-button:hover:not(:disabled) {
          background-color: rgba(224, 226, 230, 1);
        }

        .action-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          background-color: rgba(234, 236, 240, 0.5);
        }

        .action-button .loading-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(52, 64, 84, 0.2);
          border-top: 2px solid rgba(52, 64, 84, 0.8);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .action-button .action-icon {
          width: 16px;
          height: 16px;
          opacity: 0.8;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
