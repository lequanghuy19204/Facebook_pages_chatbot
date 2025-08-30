'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import '@/styles/Dashboard.css';

interface DashboardProps {
  onLogout?: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const { user, company, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    if (onLogout) {
      onLogout();
    }
  };

  // Mock data for Facebook pages
  const facebookPages = [
    {
      id: 1,
      name: "Hoàng Tuấn Luxury",
      pageId: "117079658090304",
      avatar: "/src/components/assets/44047b85-c493-4f56-aef4-6d0648c18015.png"
    },
    {
      id: 2,
      name: "Tuấn Ferrari - Hàng Hiệu …",
      pageId: "hangxuatdu.authe...",
      avatar: "/src/components/assets/60a13617-0d99-4278-8be3-8874f3786302.png"
    },
    {
      id: 3,
      name: "Kingsman Luxury",
      pageId: "120619157706429",
      avatar: "/src/components/assets/a642f571-155e-419e-9f42-4fbcdfd78914.png"
    },
    {
      id: 4,
      name: "Hoàng Dũng - Luxury",
      pageId: "hela24.cp",
      avatar: "/src/components/assets/721eaec3-82de-479d-a676-e630e5d2b2ee.png"
    },
    {
      id: 5,
      name: "LUCAO ADEI.",
      pageId: "111707742013923",
      avatar: "/src/components/assets/4ab34e4f-67b9-43b2-92cb-d9a30596c078.png"
    },
    {
      id: 6,
      name: "B Luxury Boutique",
      pageId: "116648388186890",
      avatar: "/src/components/assets/bf5b921f-2c96-4d9a-aa4b-8931dbcdf8d9.png"
    },
    {
      id: 7,
      name: "TT Hàng Hiệu Authentic",
      pageId: "tthanghieutauthe...",
      avatar: "/src/components/assets/503bb78e-7d4b-4321-9f19-6694191d4c95.png"
    },
    {
      id: 8,
      name: "Linh Remy",
      pageId: "linhremy.au",
      avatar: "/src/components/assets/b8d28a42-78fa-4d76-8a02-16b9e231a5f4.png"
    },
    {
      id: 9,
      name: "LO NA",
      pageId: "115327137849007",
      avatar: "/src/components/assets/6be95db9-7a53-4f3f-83f8-d122d4ef3765.png"
    },
    {
      id: 10,
      name: "Tuấn Docle - Hàng VN Ca…",
      pageId: "khohangauthentic...",
      avatar: "/src/components/assets/615e004c-6623-4738-a9a5-c045356e1b28.png"
    }
  ];

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="user-info">
            <div className="user-details">
              <img 
                src="/src/components/assets/4c28cb16-18df-4f17-8cc7-4c74fa3296e0.png" 
                alt="User Avatar" 
                className="user-avatar"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo.svg';
                }}
              />
              <div className="user-name">{user?.full_name || 'Lê Quang Huy'}</div>
            </div>
            <button className="logout-button" onClick={handleLogout}>
              <img src="/src/components/assets/1b87e5c8-ea65-4dbb-9cf6-8efdb1282da1.png" alt="Logout" className="logout-icon" />
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
                <div className="search-box">
                  <img src="/search.svg" alt="Search" className="search-icon" />
                  <div className="search-input">
                    <span className="search-placeholder">Tìm kiếm</span>
                  </div>
                </div>
                
                <button className="action-button">
                  <img src="/load.svg" alt="Notifications" className="action-icon" />
                </button>
                
                <button className="connect-facebook-button">
                  <img src="/plus.svg" alt="Facebook" className="facebook-icon" />
                  <span>Kết nối Facebook</span>
                </button>
                
                <button className="merge-pages-button">
                  <img src="/megre_page.svg" alt="Merge" className="merge-icon" />
                  <span>Gộp trang</span>
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="filter-tabs">
              <div className="tab-container">
                <div className="tab active">
                  <img src="/all.svg" alt="All" className="tab-icon" />
                  <span className="tab-text">Tất cả</span>
                  <div className="tab-badge">10</div>
                </div>
                <div className="tab">
                  <img src="/facebook.svg" alt="Facebook" className="tab-icon" />
                  <span className="tab-text">Facebook</span>
                  <div className="tab-badge inactive">10</div>
                </div>
              </div>
            </div>

            {/* Pages Grid */}
            <div className="pages-container">
              <div className="pages-grid">
                {facebookPages.map((page, index) => (
                  <div key={page.id} className="page-card">
                    <img 
                      src={page.avatar} 
                      alt={page.name} 
                      className="page-avatar"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/logo.svg';
                      }}
                    />
                    <div className="page-info">
                      <div className="page-name">{page.name}</div>
                      <div className="page-id-container">
                        <img src="/src/components/assets/c27e5581-3934-4841-9207-3e7c6f822f6c.png" alt="Link" className="link-icon" />
                        <div className="page-id">{page.pageId}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
