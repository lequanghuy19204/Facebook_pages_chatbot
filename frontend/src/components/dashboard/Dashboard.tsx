'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useFacebook } from '@/contexts/FacebookContext';
import FacebookConnect from './FacebookConnect';
import FacebookPages from './FacebookPages';
import Header from '../shared/Header';
import MergedPagesFilterModal from './MergedPagesFilterModal';
import ApiService from '@/services/api';
import '@/styles/dashboard/Dashboard.css';
import { toast } from 'react-toastify';

interface DashboardProps {
  onLogout?: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const router = useRouter();
  const { user, company, logout, token, updateUserInfo } = useAuth();
  const { isConnected, pages, pagesLoading, syncing, syncPages } = useFacebook();
  const [searchQuery, setSearchQuery] = useState('');
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [isSavingFilter, setIsSavingFilter] = useState(false);

  const handleLogout = async () => {
    await logout();
    if (onLogout) {
      onLogout();
    }
  };

  const R2_BUCKET_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET_URL || '';

  
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

  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  
  const clearSearch = () => {
    setSearchQuery('');
  };

  
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

  
  const getPageAvatar = (pageName: string) => {
    const colors = [
      '#667eea', '#764ba2', '#f093fb', '#f5576c',
      '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
      '#ffecd2', '#fcb69f', '#a8edea', '#fed6e3'
    ];
    const colorIndex = pageName.charCodeAt(0) % colors.length;
    return colors[colorIndex];
  };

  // Handle merge pages filter modal
  const handleOpenMergeModal = () => {
    setIsMergeModalOpen(true);
  };

  const handleCloseMergeModal = () => {
    setIsMergeModalOpen(false);
  };

  const handleSaveMergedPages = async (selectedPageIds: string[]) => {
    if (!token || !user) {
      toast.error('Phiên đăng nhập đã hết hạn');
      return;
    }

    try {
      setIsSavingFilter(true);
      const result = await ApiService.users.updateMergedPagesFilter(token, selectedPageIds);
      
      // Update user info in context
      if (user) {
        updateUserInfo({
          ...user,
          merged_pages_filter: result.merged_pages_filter
        });
      }

      toast.success(result.message || 'Đã cập nhật bộ lọc pages');
      
      // Navigate to chat page after successful save
      setTimeout(() => {
        router.push('/chat');
      }, 500); // Small delay to show toast message
    } catch (error: any) {
      console.error('Error saving merged pages filter:', error);
      toast.error(error.message || 'Không thể cập nhật bộ lọc pages');
      throw error; // Re-throw để modal xử lý
    } finally {
      setIsSavingFilter(false);
    }
  };

  // console.log('R2_BUCKET_URL:', R2_BUCKET_URL);

  return (
    <div className="dashboard-container">
      {/* Header */}
      <Header onLogout={onLogout} />

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
                      className="dashboard-search-input"
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
                      <div className="dashboard-loading-spinner"></div>
                    ) : (
                      <img src="/load.svg" alt="Sync" className="action-icon" />
                    )}
                  </button>
                  
                  <FacebookConnect className="connect-facebook-button" />
                  
                  <button 
                    className="merge-pages-button"
                    onClick={handleOpenMergeModal}
                    disabled={pages.length === 0 || pagesLoading}
                    title={pages.length === 0 ? "Chưa có pages nào" : "Gộp trang"}
                  >
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
                <div className="dashboard-loading-pages">
                  <div className="dashboard-loading-spinner"></div>
                  <span>Đang tải Facebook Pages...</span>
                </div>
              ) : pages.length > 0 ? (
                filteredPages.length > 0 ? (
                  <div className="pages-grid">
                    {filteredPages.map((page) => (
                      <div key={page.page_id} className="page-card">
                        {page.picture_cloudflare_key ? (
                          <img 
                            src={`${R2_BUCKET_URL}/${page.picture_cloudflare_key}`}
                            alt={`${page.name} logo`}
                            className="page-avatar"
                            onError={(e) => {
                              
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                const placeholder = document.createElement('div');
                                placeholder.className = 'page-avatar-placeholder';
                                placeholder.style.backgroundColor = getPageAvatar(page.name);
                                placeholder.textContent = page.name.charAt(0).toUpperCase();
                                parent.appendChild(placeholder);
                              }
                            }}
                          />
                        ) : (
                          <div 
                            className="page-avatar-placeholder"
                            style={{ backgroundColor: getPageAvatar(page.name) }}
                          >
                            {page.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="dashboard-page-info">
                          <div className="dashboard-page-name">{page.name}</div>
                          <div className="dashboard-page-id-container">
                            <span className="dashboard-link-icon">🔗</span>
                            <div className="dashboard-page-id">{page.facebook_page_id}</div>
                          </div>
                          {page.category && (
                            <div className="dashboard-page-category">
                              📂 {page.category}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="dashboard-empty-pages">
                    <div className="dashboard-empty-state">
                      <div className="dashboard-empty-icon">🔍</div>
                      <div className="dashboard-empty-title">Không tìm thấy kết quả</div>
                      <div className="dashboard-empty-description">
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
                <div className="dashboard-empty-pages">
                  {isConnected ? (
                    <div className="dashboard-empty-state">
                      <div className="dashboard-empty-icon">📄</div>
                      <div className="dashboard-empty-title">Không có Pages nào</div>
                      <div className="dashboard-empty-description">
                        Tài khoản Facebook chưa có Pages nào hoặc chưa được cấp quyền truy cập
                      </div>
                    </div>
                  ) : (
                    <div className="dashboard-empty-state">
                      <div className="dashboard-empty-icon">📱</div>
                      <div className="dashboard-empty-title">Chưa kết nối Facebook</div>
                      <div className="dashboard-empty-description">
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

      {/* Merged Pages Filter Modal */}
      <MergedPagesFilterModal
        isOpen={isMergeModalOpen}
        onClose={handleCloseMergeModal}
        facebookPages={pages}
        currentMergedPages={user?.merged_pages_filter || []}
        onSave={handleSaveMergedPages}
        loading={isSavingFilter}
      />
    </div>
  );
}
