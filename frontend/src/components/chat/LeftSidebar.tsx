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
  { id: 'all-conversations', icon: '/all-conversations.svg', tooltip: 'Tất cả hội thoại', isActive: true },
  { id: 'unread-filter', icon: '/unread-filter.svg', tooltip: 'Lọc chưa đọc' },
  { id: 'comments-filter', icon: '/comments-filter.svg', tooltip: 'Lọc bình luận' },
  { id: 'messages-filter', icon: '/messages-filte.svg', tooltip: 'Lọc tin nhắn' },
  { id: 'phone-filter', icon: '/phone-filter.svg', tooltip: 'Lọc số điện thoại' },
  { id: 'no-phone-filter', icon: '/no-phone-filter.svg', tooltip: 'Lọc không có số điện thoại' },
  { id: 'time-filter', icon: '/time-filter.svg', tooltip: 'Lọc theo khoảng thời gian' },
];

export default function LeftSidebar() {
  const [activeItem, setActiveItem] = useState<string>('all-conversations');

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
              <img src={item.icon} alt={item.tooltip} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
