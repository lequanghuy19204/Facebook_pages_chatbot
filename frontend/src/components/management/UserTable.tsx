'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { User, FacebookPage } from '@/services/api';
import UserPermissionModal from './UserPermissionModal';

interface UserTableProps {
  users: User[];
  currentUser: any;
  onUpdateRoles: (userId: string, newRoles: string[]) => void;
  onToggleStatus: (userId: string) => void;
  onUpdateFacebookPages?: (userId: string, pageIds: string[]) => Promise<void>;
  facebookPages: FacebookPage[];
  loading: boolean;
  onRefresh?: () => void;
}

export default function UserTable({
  users,
  currentUser,
  onUpdateRoles,
  onToggleStatus,
  onUpdateFacebookPages,
  facebookPages,
  loading,
  onRefresh
}: UserTableProps) {
  
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  
  
  const handleRefresh = useCallback(() => {
    if (onRefresh) {
      onRefresh();
    }
    setLastRefresh(new Date());
  }, [onRefresh]);
  
  
  useEffect(() => {
    const intervalId = setInterval(() => {
      handleRefresh();
    }, 60000); 
    
    return () => clearInterval(intervalId); 
  }, [handleRefresh]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [facebookFilter, setFacebookFilter] = useState('all');
  
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.roles.includes(roleFilter);
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'online' && user.is_online) ||
                         (statusFilter === 'offline' && !user.is_online);
    
    const matchesFacebook = facebookFilter === 'all' ||
                           (facebookFilter === 'has_fb' && user.facebook_pages > 0) ||
                           (facebookFilter === 'no_fb' && user.facebook_pages === 0);
    
    return matchesSearch && matchesRole && matchesStatus && matchesFacebook;
  }).sort((a, b) => {
    
    if (a.id === currentUser?.id) return -1;
    if (b.id === currentUser?.id) return 1;
    
    
    if (a.is_online && !b.is_online) return -1;
    if (!a.is_online && b.is_online) return 1;
    
    
    return a.full_name.localeCompare(b.full_name);
  });

  const getRoleDisplayName = (role: string) => {
    const roleMap: { [key: string]: string } = {
      'admin': '👑',
      'manage_user': '👥',
      'manage_products': '📦',
      'manage_chatbot': '🤖',
      'staff': '💬'
    };
    return roleMap[role] || '❓';
  };

  const getStatusIcon = (isOnline: boolean): string => {
    return isOnline ? '🟢' : '🔴';
  };

  const formatLastActivity = (lastLogin: Date | null) => {
    if (!lastLogin) return 'Chưa bao giờ';
    
    const now = new Date();
    const diff = now.getTime() - new Date(lastLogin).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (minutes < 1) return 'Vừa mới';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    return `${days} ngày trước`;
  };

  const canEditUser = (user: User) => {
    
    
    if (currentUser?.roles.includes('admin')) {
      return !user.roles.includes('admin') || user.id === currentUser.id;
    }
    if (currentUser?.roles.includes('manage_user')) {
      return !user.roles.includes('admin') && !user.roles.includes('manage_user');
    }
    return false;
  };

  return (
    <div className="user-table-section">
      
      {/* Filters */}
      <div className="table-filters">
        <div className="filter-search">
          <input
            type="text"
            placeholder="🔍 Tìm theo tên, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button 
            className="refresh-btn" 
            onClick={handleRefresh}
            title="Làm mới dữ liệu"
            disabled={loading}
          >
            🔄
          </button>
        </div>
        
        <div className="filter-selects">
          <select 
            value={roleFilter} 
            onChange={(e) => setRoleFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">📋 Tất cả quyền</option>
            <option value="admin">👑 Admin</option>
            <option value="manage_user">👥 Quản lý User</option>
            <option value="manage_products">📦 Quản lý Sản phẩm</option>
            <option value="manage_chatbot">🤖 Quản lý Chatbot</option>
            <option value="staff">💬 Nhân viên</option>
          </select>

          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">🟢 Trạng thái</option>
            <option value="online">🟢 Online</option>
            <option value="offline">🔴 Offline</option>
          </select>

          <select 
            value={facebookFilter} 
            onChange={(e) => setFacebookFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">📱 Quyền FB</option>
            <option value="has_fb">✅ Có Facebook</option>
            <option value="no_fb">❌ Không có FB</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="user-table">
          <thead>
            <tr>
              <th>Tên</th>
              <th>Email</th>
              <th>Số đt</th>
              <th>Quyền</th>
              <th>FB Pages</th>
              <th>Trạng thái</th>
              <th>Hoạt động trước</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className={user.is_active ? 'active-row' : 'inactive-row'}>
                <td className="name-cell">
                  <div className="user-info">
                    {user.avatar_cloudflare_key ? (
                      <img src={`https://pub-29571d63ff4741baa4c864245169a1ba.r2.dev/${user.avatar_cloudflare_key}`} alt={user.full_name} className="user-avatar" />
                    ) : (
                      <div className="user-avatar-placeholder">
                        {user.full_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="user-name">{user.full_name}</div>
                      {user.id === currentUser?.id && (
                        <span className="current-user-badge">Bạn</span>
                      )}
                    </div>
                  </div>
                </td>
                
                <td className="email-cell">{user.email}</td>

                <td className="phone-cell">{user.phone}</td>
                
                <td className="roles-cell">
                  <div className="roles-list">
                    {user.roles.map((role) => (
                      <span key={role} className={`role-badge ${role}`}>
                        {getRoleDisplayName(role)}
                      </span>
                    ))}
                  </div>
                </td>
                
                <td className="facebook-cell">
                  <span className={`fb-count ${user.facebook_pages > 0 ? 'has-pages' : 'no-pages'}`}>
                    {user.roles.includes('admin') || user.roles.includes('manage_user') 
                      ? `Full (${user.total_facebook_pages})` 
                      : `${user.facebook_pages}/${user.total_facebook_pages}`}
                  </span>
                </td>
                
                <td className="status-cell">
                  <span className={`status-indicator ${user.is_online ? 'online' : 'offline'}`}>
                    {getStatusIcon(user.is_online)} {user.is_online ? 'Online' : 'Offline'}
                  </span>
                </td>
                
                <td className="last-activity-cell">
                  {formatLastActivity(user.last_login)}
                </td>
                
                <td className="actions-cell">
                  {canEditUser(user) ? (
                    <div className="action-buttons">
                      <button 
                        className="action-btn edit-btn"
                        onClick={() => {
                          setSelectedUser(user);
                          setIsModalOpen(true);
                        }}
                        disabled={loading}
                        title="Chỉnh sửa quyền"
                      >
                        ⚙️
                      </button>
                      <button 
                        className={`action-btn toggle-btn ${user.is_active ? 'deactivate' : 'activate'}`}
                        onClick={() => onToggleStatus(user.id)}
                        disabled={loading}
                        title={user.is_active ? 'Vô hiệu hóa' : 'Kích hoạt'}
                      >
                        {user.is_active ? '🚫' : '✅'}
                      </button>
                    </div>
                  ) : (
                    <span className="no-permission">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="mgmt-empty-table">
            <div className="mgmt-empty-icon">👥</div>
            <div className="mgmt-empty-message">
              {users.length === 0 ? 'Chưa có người dùng nào' : 'Không tìm thấy người dùng phù hợp'}
            </div>
          </div>
        )}
      </div>

      {/* Table Info */}
      <div className="table-info">
        <span>Hiển thị {filteredUsers.length} / {users.length} người dùng</span>
        <span className="last-refresh">
          Cập nhật lần cuối: {lastRefresh.toLocaleTimeString()}
        </span>
      </div>
      
      {/* Permission Modal */}
      <UserPermissionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={selectedUser}
        currentUser={currentUser}
        facebookPages={facebookPages}
        onUpdateRoles={async (userId, roles) => {
          await onUpdateRoles(userId, roles);
          setIsModalOpen(false);
        }}
        onUpdateFacebookPages={async (userId, pageIds) => {
          if (onUpdateFacebookPages) {
            await onUpdateFacebookPages(userId, pageIds);
          }
          setIsModalOpen(false);
        }}
        loading={loading}
      />
    </div>
  );
}
