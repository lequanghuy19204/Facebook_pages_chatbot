'use client';

import React, { useState, useEffect } from 'react';
import { FacebookTag, FacebookPage, CreateTagDto, UpdateTagDto } from '@/services/api';
import TagModal from './TagModal';
import '@/styles/management/TagsManagement.css';

interface TagsManagementProps {
  tags: FacebookTag[];
  facebookPages: FacebookPage[];
  onCreateTag: (tagData: CreateTagDto) => Promise<void>;
  onUpdateTag: (tagId: string, tagData: UpdateTagDto) => Promise<void>;
  onDeleteTag: (tagId: string) => Promise<void>;
  loading: boolean;
  onRefresh: () => void;
}

export default function TagsManagement({
  tags,
  facebookPages,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
  loading,
  onRefresh
}: TagsManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPageFilter, setSelectedPageFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<FacebookTag | null>(null);
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);

  // Filter tags
  const filteredTags = tags.filter(tag => {
    const matchesSearch = tag.tag_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPage = selectedPageFilter === 'all' || tag.page_ids.includes(selectedPageFilter);
    return matchesSearch && matchesPage;
  });

  // Sort tags by usage count (descending)
  const sortedTags = [...filteredTags].sort((a, b) => b.usage_count - a.usage_count);

  // Handle create tag
  const handleCreateClick = () => {
    setSelectedTag(null);
    setIsModalOpen(true);
  };

  // Handle edit tag
  const handleEditClick = (tag: FacebookTag) => {
    setSelectedTag(tag);
    setIsModalOpen(true);
  };

  // Handle delete tag
  const handleDeleteClick = async (tagId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa tag này? Tag sẽ bị xóa khỏi tất cả conversations và customers.')) {
      return;
    }

    try {
      setDeletingTagId(tagId);
      await onDeleteTag(tagId);
    } catch (error) {
      console.error('Error deleting tag:', error);
    } finally {
      setDeletingTagId(null);
    }
  };

  // Handle modal save
  const handleModalSave = async (tagData: CreateTagDto | UpdateTagDto) => {
    if (selectedTag) {
      // Update existing tag
      await onUpdateTag(selectedTag.tag_id, tagData as UpdateTagDto);
    } else {
      // Create new tag
      await onCreateTag(tagData as CreateTagDto);
    }
  };

  // Get page names for a tag
  const getPageNames = (pageIds: string[]): string => {
    const names = pageIds
      .map(id => {
        const page = facebookPages.find(p => p.page_id === id);
        return page?.name;
      })
      .filter(Boolean);
    
    if (names.length === 0) return '(Không có trang)';
    if (names.length <= 2) return names.join(', ');
    return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
  };

  return (
    <div className="tags-management-container">
      <div className="tags-header">
        <div className="tags-header-left">
          <h2 className="tags-title">🏷️ Quản lý Tags</h2>
          <p className="tags-subtitle">
            Tổng: <strong>{tags.length}</strong> tags
            {filteredTags.length < tags.length && (
              <span> • Hiển thị: <strong>{filteredTags.length}</strong></span>
            )}
          </p>
        </div>
        <button
          className="tags-create-btn"
          onClick={handleCreateClick}
          disabled={loading || facebookPages.length === 0}
          title={facebookPages.length === 0 ? 'Cần có ít nhất 1 Facebook Page' : 'Tạo tag mới'}
        >
          ➕ Tạo Tag mới
        </button>
      </div>

      {/* Filters */}
      <div className="tags-filters">
        <div className="tags-search-container">
          <input
            type="text"
            placeholder="🔍 Tìm kiếm tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="tags-search-input"
          />
          {searchQuery && (
            <button
              className="tags-search-clear"
              onClick={() => setSearchQuery('')}
              title="Xóa tìm kiếm"
            >
              ✕
            </button>
          )}
        </div>

        <div className="tags-filter-container">
          <label htmlFor="page-filter" className="tags-filter-label">
            Lọc theo Page:
          </label>
          <select
            id="page-filter"
            value={selectedPageFilter}
            onChange={(e) => setSelectedPageFilter(e.target.value)}
            className="tags-filter-select"
          >
            <option value="all">Tất cả pages ({facebookPages.length})</option>
            {facebookPages.map(page => (
              <option key={page.page_id} value={page.page_id}>
                {page.name}
              </option>
            ))}
          </select>
        </div>

        <button
          className="tags-refresh-btn"
          onClick={onRefresh}
          disabled={loading}
          title="Làm mới danh sách"
        >
          🔄
        </button>
      </div>

      {/* Tags Grid */}
      <div className="tags-grid-container">
        {loading && tags.length === 0 ? (
          <div className="tags-loading">
            <div className="tags-loading-spinner"></div>
            <span>Đang tải tags...</span>
          </div>
        ) : sortedTags.length > 0 ? (
          <div className="tags-grid">
            {sortedTags.map(tag => (
              <div key={tag.tag_id} className="tag-card">
                <div className="tag-card-header">
                  <div 
                    className="tag-card-color"
                    style={{ 
                        color: 'white',
                        backgroundColor: tag.tag_color }}
                  >
                    <span className="tag-card-name" style={{
                      backgroundColor: tag.tag_color,
                    }}>

                      {tag.tag_name}
                    </span>
                  </div>
                  <div className="tag-card-actions">
                    <button
                      className="tag-card-edit-btn"
                      onClick={() => handleEditClick(tag)}
                      disabled={loading}
                      title="Chỉnh sửa tag"
                    >
                      ✏️
                    </button>
                    <button
                      className="tag-card-delete-btn"
                      onClick={() => handleDeleteClick(tag.tag_id)}
                      disabled={loading || deletingTagId === tag.tag_id}
                      title="Xóa tag"
                    >
                      {deletingTagId === tag.tag_id ? '⏳' : '🗑️'}
                    </button>
                  </div>
                </div>

                <div className="tag-card-body">
                  <div className="tag-card-info">
                    <span className="tag-card-label">Pages:</span>
                    <span className="tag-card-value">{getPageNames(tag.page_ids)}</span>
                  </div>
                  <div className="tag-card-info">
                    <span className="tag-card-label">Số lần sử dụng:</span>
                    <span className="tag-card-value">
                      <strong>{tag.usage_count}</strong>
                    </span>
                  </div>
                  <div className="tag-card-info">
                    <span className="tag-card-label">Tạo lúc:</span>
                    <span className="tag-card-value">
                      {new Date(tag.created_at).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="tags-empty">
            <div className="tags-empty-icon">🏷️</div>
            <div className="tags-empty-title">
              {searchQuery || selectedPageFilter !== 'all'
                ? 'Không tìm thấy tag nào'
                : 'Chưa có tag nào'}
            </div>
            <div className="tags-empty-description">
              {searchQuery || selectedPageFilter !== 'all'
                ? 'Thử thay đổi bộ lọc hoặc tìm kiếm'
                : 'Tạo tag mới để phân loại conversations và customers'}
            </div>
            {!searchQuery && selectedPageFilter === 'all' && facebookPages.length > 0 && (
              <button
                className="tags-empty-create-btn"
                onClick={handleCreateClick}
              >
                ➕ Tạo Tag đầu tiên
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tag Modal */}
      <TagModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTag(null);
        }}
        onSave={handleModalSave}
        tag={selectedTag}
        facebookPages={facebookPages}
        loading={loading}
      />
    </div>
  );
}
