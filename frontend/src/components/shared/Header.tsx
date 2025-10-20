'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useFacebook } from '@/contexts/FacebookContext';
import '@/styles/shared/Header.css';

interface HeaderProps {
  className?: string;
  onLogout?: () => void;
}

export default function Header({ className = '', onLogout }: HeaderProps) {
  const { user, logout } = useAuth();
  const { pages } = useFacebook();
  const router = useRouter();
  const pathname = usePathname();
  const [showMergedPagesDropdown, setShowMergedPagesDropdown] = useState(false);
  
  const handleLogout = async () => {
    await logout();
    if (onLogout) {
      onLogout();
    }
  };

  const navigateTo = (path: string) => {
    
    router.push(path);
  };

  const isActive = (path: string) => {
    return pathname === path;
  };


  const canAccessManagement = user?.roles.includes('admin') || user?.roles.includes('manage_user');


  const canAccessProducts = user?.roles.includes('admin') || user?.roles.includes('manage_products');


  const canAccessChatbot = user?.roles.includes('admin') || user?.roles.includes('manage_chatbot');

  // Lấy danh sách pages đang được gộp
  const mergedPages = user?.merged_pages_filter && user.merged_pages_filter.length > 0
    ? pages.filter(page => user.merged_pages_filter!.includes(page.facebook_page_id))
    : [];
  
  const isMergedPagesActive = mergedPages.length > 0;
  
  return (
    <div className="header-container">
      <div className="header-content">
        {/* Navigation Menu */}
        <div className="nav-menu">
          <div 
            className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}
            onClick={() => navigateTo('/dashboard')}
          >
            {/* <div className="notification-badge">
              <div className="notification-count">9</div>
            </div> */}
            <div className="nav-text">Bảng điều khiển</div>
          </div>
          <div 
            className={`nav-item ${isActive('/chat') ? 'active' : ''}`}
            onClick={() => navigateTo('/chat')}
          >
            <div className="nav-text">Hội thoại</div>
          </div>
          {canAccessManagement && (
            <div 
              className={`nav-item ${isActive('/management') ? 'active' : ''}`}
              onClick={() => navigateTo('/management')}
            >
              <div className="nav-text">Quản lý</div>
            </div>
          )}
          {canAccessProducts && (
            <div
              className={`nav-item ${isActive('/products') ? 'active' : ''}`}
              onClick={() => navigateTo('/products')}
            >
              <div className="nav-text">Sản phẩm</div>
            </div>
          )}
          {canAccessChatbot && (
            <div
              className={`nav-item ${isActive('/chatbot') ? 'active' : ''}`}
              onClick={() => navigateTo('/chatbot')}
            >
              <div className="nav-text">Chatbot</div>
            </div>
          )}
          <div
            className={`nav-item ${isActive('/settings') ? 'active' : ''}`}
            onClick={() => navigateTo('/settings')}
          >
            <div className="nav-text">Cài đặt</div>
          </div>
        </div>
        
        {/* User Profile */}
        <div className="user-profile">
          {/* Merged Pages Indicator */}
          {isMergedPagesActive && (
            <div 
              className="merged-pages-indicator"
              onMouseEnter={() => setShowMergedPagesDropdown(true)}
              onMouseLeave={() => setShowMergedPagesDropdown(false)}
              onClick={() => navigateTo('/dashboard')}
            >
              <div className="merged-pages-icon">
                <img src="/megre_page.svg" alt="Merged Pages" />
              </div>
              <div className="merged-pages-count">{mergedPages.length}</div>
              
              {/* Dropdown hiển thị danh sách pages */}
              {showMergedPagesDropdown && (
                <div className="merged-pages-dropdown">
                  <div className="dropdown-header">
                    <span className="dropdown-title">Pages đang gộp</span>
                    <span className="dropdown-count">({mergedPages.length})</span>
                  </div>
                  <div className="dropdown-list">
                    {mergedPages.map((page) => (
                      <div key={page.facebook_page_id} className="dropdown-page-item">
                        <div className="dropdown-page-avatar">
                          {page.picture_url ? (
                            <img 
                              src={page.picture_url}
                              alt={page.name}
                              className="dropdown-avatar-img"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = `<div class="dropdown-avatar-placeholder">${page.name.charAt(0).toUpperCase()}</div>`;
                                }
                              }}
                            />
                          ) : (
                            <div className="dropdown-avatar-placeholder">
                              {page.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="dropdown-page-info">
                          <div className="dropdown-page-name">{page.name}</div>
                          <div className="dropdown-page-id">{page.facebook_page_id}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="dropdown-footer">
                    <button 
                      className="dropdown-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateTo('/dashboard');
                      }}
                    >
                      Quản lý gộp trang
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="user-pages" onClick={() => navigateTo('/settings')}>
            {user?.avatar_cloudflare_url ? (
              <img 
                src={user.avatar_cloudflare_url}
                alt={user.full_name || 'User'} 
                className="user-avatar-circle" 
              />
            ) : (
              <div className="user-avatar-placeholder-circle">
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <div className="username">
              {user?.full_name?.split(' ').pop() || 'User'}
            </div>
          </div>
          
          <button className="header-logout-button" onClick={handleLogout} title="Đăng xuất">
            <img className="logout-text" src="/logout.svg"></img>
          </button>
        </div>
      </div>
    </div>
  );
}
