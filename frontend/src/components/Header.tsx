'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

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
              <img src="/page-avatar-1.png" className="page-avatar" alt="Page 1" />
              <img src="/page-avatar-2.png" className="page-avatar" alt="Page 2" />
              <img src="/page-avatar-3.png" className="page-avatar" alt="Page 3" />
              <div className="more-pages">
                <div className="more-count">+20</div>
              </div>
            </div>
            <div className="username">
              {user?.full_name?.split(' ').pop() || 'User'}
            </div>
          </div>
          
          <button className="logout-button" onClick={handleLogout} title="Đăng xuất">
            <img className="logout-text" src="/logout.svg"></img>
          </button>
        </div>
      </div>
      
      <style jsx>{`
        .header-container {
          width: 100%;
          height: 56px;
          background-color: rgba(80, 109, 173, 1);
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        .header-content {
          width: 100%;
          max-width: 1280px;
          height: 56px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 24px;
        }
        
        .nav-menu {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .nav-item {
          height: 38px;
          border-radius: 8px;
          padding: 0 11px;
          display: flex;
          align-items: center;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .nav-item:hover {
          background-color: rgba(29, 41, 57, 0.3);
        }
        
        .nav-item.active {
          background-color: rgba(29, 41, 57, 0.45);
        }
        
        .nav-text {
          font-size: 14px;
          color: rgba(255, 255, 255, 1);
          line-height: 22px;
          white-space: nowrap;
        }
        
        .notification-badge {
          width: 16px;
          height: 16px;
          overflow: hidden;
          border-radius: 10px;
          background-color: rgba(255, 77, 79, 1);
          display: flex;
          justify-content: center;
          align-items: center;
          margin-right: 8px;
        }
        
        .notification-count {
          font-size: 12px;
          color: rgba(255, 255, 255, 1);
          line-height: 16px;
        }
        
        .user-profile {
          display: flex;
          align-items: center;
          gap: 9px;
        }
        
        .user-pages {
          height: 40px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          padding: 0 12px;
          gap: 7px;
        }
        
        .pages-avatars {
          position: relative;
          width: 67px;
          height: 34px;
        }
        
        .page-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          position: absolute;
          top: 1px;
        }
        
        .page-avatar:nth-child(1) {
          left: 0;
          z-index: 3;
        }
        
        .page-avatar:nth-child(2) {
          left: 17px;
          z-index: 2;
        }
        
        .page-avatar:nth-child(3) {
          left: 34px;
          z-index: 1;
        }
        
        .more-pages {
          width: 34px;
          height: 34px;
          border-radius: 18px;
          background-color: rgba(0, 0, 0, 0.3);
          position: absolute;
          top: 0;
          left: 33px;
          z-index: 4;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        .more-count {
          font-size: 15px;
          color: rgba(242, 244, 247, 1);
        }
        
        .username {
          font-size: 14px;
          color: rgba(242, 244, 247, 1);
          white-space: nowrap;
        }
        
        .logout-button {
          width: 40px;
          height: 40px;
          border-radius: 20px;
          background-color: rgba(29, 41, 57, 0.25);
          border: none;
          cursor: pointer;
          display: flex;
          justify-content: center;
          align-items: center;
          transition: background-color 0.3s ease;
        }
        
        .logout-button:hover {
          background-color: rgba(29, 41, 57, 0.4);
        }
        
        .logout-text {
          font-size: 16px;
          color: rgba(242, 244, 247, 1);
        }
        
        @media (max-width: 768px) {
          .header-content {
            padding: 0 12px;
          }
          
          .nav-menu {
            gap: 4px;
            overflow-x: auto;
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          
          .nav-menu::-webkit-scrollbar {
            display: none;
          }
          
          .nav-item {
            padding: 0 8px;
          }
          
          .username {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
