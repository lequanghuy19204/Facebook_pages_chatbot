'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import '@/styles/Header.css';

interface HeaderProps {
  className?: string;
  onLogout?: () => void;
}

export default function Header({ className = '', onLogout }: HeaderProps) {
  const { user, logout } = useAuth();
  
  const handleLogout = async () => {
    await logout();
    if (onLogout) {
      onLogout();
    }
  };
  
  return (
    <div className="header-container">
      <div className="header-content">
        {/* Navigation Menu */}
        <div className="nav-menu">
          <div className="nav-item active">
            <div className="notification-badge">
              <div className="notification-count">9</div>
            </div>
            <div className="nav-text">Bảng điều khiển</div>
          </div>
          <div className="nav-item">
            <div className="nav-text">Hội thoại</div>
          </div>
          <div className="nav-item">
            <div className="nav-text">Quản lý</div>
          </div>
          <div className="nav-item">
            <div className="nav-text">Sản phẩm</div>
          </div>
          <div className="nav-item">
            <div className="nav-text">Cài đặt</div>
          </div>
        </div>
        
        {/* User Profile */}
        <div className="user-profile">
          <div className="user-pages">
            <div className="pages-avatars">
              <img src="/page-avatar-1.png" className="header-page-avatar" alt="Page 1" />
              <img src="/page-avatar-2.png" className="header-page-avatar" alt="Page 2" />
              <img src="/page-avatar-3.png" className="header-page-avatar" alt="Page 3" />
              <div className="more-pages">
                <div className="more-count">+20</div>
              </div>
            </div>
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
