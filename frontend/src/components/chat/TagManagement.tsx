'use client';

import React, { useState } from 'react';
import '@/styles/chat/TagManagement.css';

interface Tag {
  id: string;
  name: string;
  color: string;
  category: 'status' | 'person' | 'action' | 'payment';
}

interface TagManagementProps {
  conversationId: string;
  onTagSelect: (tagId: string) => void;
}

// Mock tags data theo thiết kế Figma
const mockTags: Tag[] = [
  // Row 1
  { id: 'urgent', name: 'Xử lý gấp', color: '#F4383B', category: 'status' },
  { id: 'lan-anh', name: 'lan anh', color: '#717A9B', category: 'person' },
  { id: 'p-anh', name: 'P.anh', color: '#391F04', category: 'person' },
  { id: 'p-le', name: 'P.LÊ', color: '#009344', category: 'person' },
  { id: 'kcgm', name: 'KCGM', color: '#04EB95', category: 'person' },
  { id: 'huyen', name: 'Huyền', color: '#4B595E', category: 'person' },
  { id: 'm-trang', name: 'M.trang', color: '#74C0E3', category: 'person' },
  { id: 'chapel', name: 'CHAPEL', color: '#BD2727', category: 'person' },
  { id: 'ha', name: 'Hà', color: '#FF45BF', category: 'person' },
  { id: 'risky', name: 'KHÁCH RỦI RO', color: '#8C8F5A', category: 'status' },

  // Row 2
  { id: 'create-money', name: 'Tạo tiền', color: '#F626B2', category: 'payment' },
  { id: 'not-create-money', name: 'Chưa tạo tiền', color: '#ED9C04', category: 'payment' },
  { id: 'customer-ck', name: 'Khách CK', color: '#BC8DA1', category: 'payment' },
  { id: 'cancel-no-deposit', name: 'Huỷ ko cọc', color: '#141115', category: 'action' },
  { id: 'upsale', name: 'UPSALE', color: '#6E6759', category: 'action' },
  { id: 'voucher-1', name: 'Voucher 1', color: '#B1B00D', category: 'payment' },
  { id: 'voucher-2', name: 'Voucher 2', color: '#178989', category: 'payment' },
  { id: 'spam', name: 'Spam', color: '#0C0D0E', category: 'status' },
  { id: 'trang', name: 'Trang', color: '#11CE00', category: 'person' },
  { id: 'handle', name: 'Xử lý', color: '#77149E', category: 'action' },

  // Row 3
  { id: 't-anh', name: 'T.Anh', color: '#D12CA4', category: 'person' },
  { id: 'le', name: 'Lệ', color: '#AC7FA3', category: 'person' },
  { id: 'consult-again', name: 'Tư vấn lại', color: '#604444', category: 'action' },
  { id: 'not-create-order', name: 'Chưa tạo đơn', color: '#D91D4B', category: 'status' },
  { id: 'created-order', name: 'Đã tạo đơn', color: '#1550C6', category: 'status' },
  { id: 'customer-order-more', name: 'Khách đặt thêm', color: '#C1D12F', category: 'action' },
  { id: 'duong', name: 'Dương', color: '#2F4164', category: 'person' },
  { id: 'feedback', name: 'Feedback', color: '#A6ABBC', category: 'action' },
  { id: 'customer-cancel', name: 'Khách hủy đơn', color: '#3D0F0F', category: 'status' },
  { id: 'called', name: 'Đã gọi điện', color: '#3CD385', category: 'action' }
];

export default function TagManagement({ conversationId, onTagSelect }: TagManagementProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showAllTags, setShowAllTags] = useState<boolean>(false);

  const handleTagClick = (tagId: string) => {
    const isSelected = selectedTags.includes(tagId);
    let newSelectedTags;

    if (isSelected) {
      newSelectedTags = selectedTags.filter(id => id !== tagId);
    } else {
      newSelectedTags = [...selectedTags, tagId];
    }

    setSelectedTags(newSelectedTags);
    onTagSelect(tagId);
  };

  const renderTagRow = (tags: Tag[], rowIndex: number) => (
    <div key={rowIndex} className="tag-management-row">
      {tags.map(tag => (
        <div
          key={tag.id}
          className={`tag-management-item ${selectedTags.includes(tag.id) ? 'selected' : ''}`}
          style={{ 
            backgroundColor: `${tag.color}66`, // 40% opacity
            '--tag-color': tag.color
          } as React.CSSProperties}
          onClick={() => handleTagClick(tag.id)}
          title={tag.name}
        >
          {selectedTags.includes(tag.id) && (
            <div className="tag-management-indicator"></div>
          )}
          <span className="tag-management-text">{tag.name}</span>
        </div>
      ))}
    </div>
  );

  const tagRows = [
    mockTags.slice(0, 10),  // Row 1
    mockTags.slice(10, 20), // Row 2
    mockTags.slice(20, 30)  // Row 3
  ];

  return (
    <div className="tag-management-component">
      <div className="tag-management-content">
        {tagRows.map((tags, index) => renderTagRow(tags, index))}
      </div>
      
      {selectedTags.length > 0 && (
        <div className="tag-management-summary">
          <span className="tag-management-summary-text">
            Đã chọn {selectedTags.length} tag{selectedTags.length > 1 ? 's' : ''}
          </span>
          <button 
            className="tag-management-clear-button"
            onClick={() => setSelectedTags([])}
          >
            Xóa tất cả
          </button>
        </div>
      )}
    </div>
  );
}
