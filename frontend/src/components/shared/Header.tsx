'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import '@/styles/shared/Header.css';

interface HeaderProps {
  className?: string;
  onLogout?: () => void;
}

export default function Header({ className = '', onLogout }: HeaderProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  const handleLogout = async () => {
    await logout();
    if (onLogout) {
      onLogout();
    }
  };

  const navigateTo = (path: string) => {
    window.location.href = path;
  };

  const isActive = (path: string) => {
    return pathname === path;
  };

  // Check if user can access management page
  const canAccessManagement = user?.roles.includes('admin') || user?.roles.includes('manage_user');
  
  return (
    <div className="header-container">
      <div className="header-content">
        {/* Navigation Menu */}
        <div className="nav-menu">
          <div 
            className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}
            onClick={() => navigateTo('/dashboard')}
          >
            <div className="notification-badge">
              <div className="notification-count">9</div>
            </div>
            <div className="nav-text">Bảng điều khiển</div>
          </div>
          <div className="nav-item">
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
          <div className="nav-item">
            <div className="nav-text">Sản phẩm</div>
          </div>
          <div 
            className={`nav-item ${isActive('/settings') ? 'active' : ''}`}
            onClick={() => navigateTo('/settings')}
          >
            <div className="nav-text">Cài đặt</div>
          </div>
        </div>
        
        {/* User Profile */}
        <div className="user-profile">
          <div className="user-pages" onClick={() => navigateTo('/settings')}>
            {user?.avatar_url ? (
              <img 
                src={user.avatar_url} 
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
