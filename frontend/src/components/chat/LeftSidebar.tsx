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

export interface LeftSidebarFilterLeftSidebar {
  type: 'all' | 'unread' | 'comments' | 'messages' | 'phone' | 'no-phone' | 'time';
  startDate?: Date;
  endDate?: Date;
}

interface LeftSidebarProps {
  onFilterChange: (filter: LeftSidebarFilterLeftSidebar) => void;
}

export default function LeftSidebar({ onFilterChange }: LeftSidebarProps) {
  const [activeItem, setActiveItem] = useState<string>('all-conversations');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleItemClick = (itemId: string) => {
    setActiveItem(itemId);

    if (itemId === 'time-filter') {
      setShowDatePicker(true);
      return;
    }

    setShowDatePicker(false);

    const filterMap: Record<string, LeftSidebarFilterLeftSidebar> = {
      'all-conversations': { type: 'all' },
      'unread-filter': { type: 'unread' },
      'comments-filter': { type: 'comments' },
      'messages-filter': { type: 'messages' },
      'phone-filter': { type: 'phone' },
      'no-phone-filter': { type: 'no-phone' },
    };

    if (filterMap[itemId]) {
      onFilterChange(filterMap[itemId]);
    }
  };

  const handleApplyTimeFilter = () => {
    if (startDate && endDate) {
      onFilterChange({
        type: 'time',
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });
      setShowDatePicker(false);
    }
  };

  const handleClearTimeFilter = () => {
    setStartDate('');
    setEndDate('');
    setShowDatePicker(false);
    setActiveItem('all-conversations');
    onFilterChange({ type: 'all' });
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

      {showDatePicker && (
        <div className="left-sidebar-date-picker">
          <div className="left-sidebar-date-picker-content">
            <h4>Lọc theo thời gian</h4>
            <div className="left-sidebar-date-input-group">
              <label>Từ ngày:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="left-sidebar-date-input"
              />
            </div>
            <div className="left-sidebar-date-input-group">
              <label>Đến ngày:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="left-sidebar-date-input"
              />
            </div>
            <div className="left-sidebar-date-actions">
              <button
                onClick={handleApplyTimeFilter}
                disabled={!startDate || !endDate}
                className="left-sidebar-date-apply"
              >
                Áp dụng
              </button>
              <button
                onClick={handleClearTimeFilter}
                className="left-sidebar-date-clear"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
