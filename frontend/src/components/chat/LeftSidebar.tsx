'use client';

import React, { useState } from 'react';
import '@/styles/chat/LeftSidebar.css';

interface SidebarItem {
  id: string;
  icon: string;
  tooltip: string;
  isActive?: boolean;
}

const sidebarItems: SidebarItem[] = [
  { id: 'chat', icon: '💬', tooltip: 'Hội thoại', isActive: true },
  { id: 'messages', icon: '📨', tooltip: 'Tin nhắn' },
  { id: 'users', icon: '👥', tooltip: 'Người dùng' },
  { id: 'reports', icon: '📊', tooltip: 'Báo cáo' },
  { id: 'settings', icon: '⚙️', tooltip: 'Cài đặt' },
  { id: 'analytics', icon: '📈', tooltip: 'Thống kê' },
  { id: 'posts', icon: '📝', tooltip: 'Bài viết' },
  { id: 'management', icon: '🏢', tooltip: 'Quản lý' },
  { id: 'tools', icon: '🔧', tooltip: 'Công cụ' },
  { id: 'support', icon: '❓', tooltip: 'Hỗ trợ' }
];

export default function LeftSidebar() {
  const [activeItem, setActiveItem] = useState<string>('chat');

  const handleItemClick = (itemId: string) => {
    setActiveItem(itemId);
  };

  return (
    <div className="left-sidebar-component">
      <div className="left-sidebar-items">
        {sidebarItems.map((item) => (
          <div
            key={item.id}
            className={`left-sidebar-item ${activeItem === item.id ? 'active' : ''}`}
            onClick={() => handleItemClick(item.id)}
            title={item.tooltip}
          >
            <div className="left-sidebar-icon">
              {item.icon}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
