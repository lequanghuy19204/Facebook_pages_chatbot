'use client';

import React from 'react';

interface PendingUser {
  id: string;
  full_name: string;
  email: string;
  company_code: string;
  created_at: Date;
  requested_role: string;
}

interface PendingUsersProps {
  pendingUsers: PendingUser[];
  selectedUsers: string[];
  onSelectedUsersChange: (selected: string[]) => void;
  onApprove: (userId: string) => void;
  onReject: (userId: string) => void;
  onBulkApprove: () => void;
  onBulkReject: () => void;
  loading: boolean;
}

export default function PendingUsers({
  pendingUsers,
  selectedUsers,
  onSelectedUsersChange,
  onApprove,
  onReject,
  onBulkApprove,
  onBulkReject,
  loading
}: PendingUsersProps) {

  const handleSelectAll = () => {
    if (selectedUsers.length === pendingUsers.length) {
      onSelectedUsersChange([]);
    } else {
      onSelectedUsersChange(pendingUsers.map(u => u.id));
    }
  };

  const handleSelectUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      onSelectedUsersChange(selectedUsers.filter(id => id !== userId));
    } else {
      onSelectedUsersChange([...selectedUsers, userId]);
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      return hours < 1 ? 'Vừa mới' : `${hours} giờ trước`;
    }
    return `${days} ngày trước`;
  };

  const getRoleDisplayName = (role: string) => {
    const roleMap: { [key: string]: string } = {
      'admin': 'Admin',
      'manage_user': 'Quản lý User',
      'manage_products': 'Quản lý Sản phẩm',
      'manage_chatbot': 'Quản lý Chatbot',
      'staff': 'Nhân viên'
    };
    return roleMap[role] || role;
  };

  if (pendingUsers.length === 0) {
    return null;
  }

  return (
    <div className="pending-section">
      <div className="pending-alert">
        🚨 Có {pendingUsers.length} tài khoản đang chờ phê duyệt
      </div>

      <div className="pending-container">
        <div className="pending-header">
          <h3 className="pending-title">Người dùng chờ phê duyệt</h3>
          <div className="pending-actions">
            <button 
              className="bulk-action-btn approve"
              onClick={onBulkApprove}
              disabled={selectedUsers.length === 0 || loading}
            >
              ✅ Duyệt đã chọn ({selectedUsers.length})
            </button>
            <button 
              className="bulk-action-btn reject"
              onClick={onBulkReject}
              disabled={selectedUsers.length === 0 || loading}
            >
              ❌ Từ chối đã chọn ({selectedUsers.length})
            </button>
          </div>
        </div>

        <div className="pending-list">
          {pendingUsers.map((user) => (
            <div key={user.id} className="pending-item">
              <div className="pending-item-content">
                <div className="pending-user-info">
                  <div className="user-avatar-placeholder">
                    {user.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="user-details">
                    <div className="user-name">👤 {user.full_name}</div>
                    <div className="user-email">📧 {user.email}</div>
                    <div className="user-role">🎯 {getRoleDisplayName(user.requested_role)}</div>
                  </div>
                </div>
                
                <div className="pending-meta">
                  <div className="pending-date">📅 {formatTimeAgo(user.created_at)}</div>
                  <div className="company-code">🏢 {user.company_code}</div>
                </div>
              </div>

              <div className="pending-actions">
                <input
                  type="checkbox"
                  className="user-checkbox"
                  checked={selectedUsers.includes(user.id)}
                  onChange={() => handleSelectUser(user.id)}
                />
                <button 
                  className="action-btn approve-btn"
                  onClick={() => onApprove(user.id)}
                  disabled={loading}
                >
                  ✅ Duyệt
                </button>
                <button 
                  className="action-btn reject-btn"
                  onClick={() => onReject(user.id)}
                  disabled={loading}
                >
                  ❌ Từ chối
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="pending-footer">
          <label className="select-all-container">
            <input
              type="checkbox"
              checked={selectedUsers.length === pendingUsers.length && pendingUsers.length > 0}
              onChange={handleSelectAll}
            />
            <span className="select-all-text">
              ☑️ Chọn tất cả ({selectedUsers.length}/{pendingUsers.length})
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
