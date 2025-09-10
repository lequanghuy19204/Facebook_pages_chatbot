'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ApiService, { User, PendingUser, UserStats, FacebookPage, CompanyInfo as ApiCompanyInfo, UpdateCompanyDto } from '@/services/api';
import Header from '../shared/Header';
import PendingUsers from './PendingUsers';
import UserTable from './UserTable';
import UserStatsCards from './UserStatsCards';
import '@/styles/management/Management.css';

interface CompanyInfo {
  company_id: string;
  company_name: string;
  company_code: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  settings: {
    timezone: string;
    language: string;
    currency: string;
    max_users: number;
    current_users: number;
  };
}

interface ManagementProps {
  onLogout?: () => void;
}


export default function Management({ onLogout }: ManagementProps) {
  const { user, logout, token, company } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [facebookPages, setFacebookPages] = useState<FacebookPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    maxUsers: 0,
    activeUsers: 0,
    pendingUsers: 0,
    adminUsers: 0,
    facebookUsers: 0,
    inactiveUsers: 0,
    onlineUsers: 0,
    offlineUsers: 0
  });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [companyInfo, setCompanyInfo] = useState<ApiCompanyInfo>({
    company_id: '',
    company_name: '',
    company_code: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    settings: {
      timezone: 'Asia/Ho_Chi_Minh',
      language: 'vi',
      currency: 'VND',
      max_users: 10,
      current_users: 1
    },
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedCompanyInfo, setEditedCompanyInfo] = useState<ApiCompanyInfo | null>(null);
  
  useEffect(() => {
    if (token) {
      fetchUsers();
      fetchPendingUsers();
      fetchFacebookPages();
      fetchCompanyInfo();
    }
  }, [token]);
  
  const fetchCompanyInfo = async () => {
    if (!token || !company) return;
    
    try {
      setLoading(true);
      const response = await ApiService.company.getInfo(token);
      setCompanyInfo(response);
    } catch (err: any) {
      setError(err.message || 'Không thể lấy thông tin công ty');
      console.error('Error fetching company info:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleEditCompany = () => {
    setEditedCompanyInfo({...companyInfo});
    setIsEditing(true);
  };
  
  const handleCancelEdit = () => {
    setEditedCompanyInfo(null);
    setIsEditing(false);
  };
  
  const handleCompanyInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editedCompanyInfo) return;
    
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setEditedCompanyInfo({
        ...editedCompanyInfo,
        [parent]: {
          ...editedCompanyInfo[parent as keyof typeof editedCompanyInfo] as any,
          [child]: value
        }
      });
    } else {
      setEditedCompanyInfo({
        ...editedCompanyInfo,
        [name]: value
      });
    }
  };
  
  const handleSaveCompanyInfo = async () => {
    if (!token || !editedCompanyInfo) return;
    
    try {
      setLoading(true);
      
      const updateData: UpdateCompanyDto = {
        company_name: editedCompanyInfo.company_name,
        email: editedCompanyInfo.email,
        phone: editedCompanyInfo.phone,
        address: editedCompanyInfo.address,
        settings: {
          max_users: editedCompanyInfo.settings.max_users
        }
      };
      
      const response = await ApiService.company.update(token, updateData);
      
      setCompanyInfo({
        ...companyInfo,
        ...response.company
      });
      
      setError(null);
      setSuccessMessage('Cập nhật thông tin công ty thành công');
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
      setIsEditing(false);
      setEditedCompanyInfo(null);
    } catch (err: any) {
      setError(err.message || 'Không thể cập nhật thông tin công ty');
      console.error('Error updating company info:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    if (onLogout) {
      onLogout();
    }
  };

  const fetchUsers = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      const response = await ApiService.users.getUsers(token);
      setUsers(response.users);
      setStats(response.stats);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchPendingUsers = async () => {
    if (!token) return;
    
    try {
      const pendingUsers = await ApiService.users.getPendingUsers(token);
      setPendingUsers(pendingUsers);
    } catch (err: any) {
      console.error('Error fetching pending users:', err);
    }
  };

  const handleApproveUser = async (userId: string) => {
    if (!token) return;
    
    try {
      setLoading(true);
      await ApiService.users.approveUser(token, userId);
      
      await fetchUsers();
      await fetchPendingUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to approve user');
      console.error('Error approving user:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectUser = async (userId: string) => {
    if (!token) return;
    
    try {
      setLoading(true);
      await ApiService.users.rejectUser(token, userId);
      
      await fetchPendingUsers();
      await fetchUsers(); 
    } catch (err: any) {
      setError(err.message || 'Failed to reject user');
      console.error('Error rejecting user:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkApprove = async () => {
    if (!token || selectedUsers.length === 0) return;
    
    try {
      setLoading(true);
      
      for (const userId of selectedUsers) {
        await ApiService.users.approveUser(token, userId);
      }
      
      await fetchUsers();
      await fetchPendingUsers();
      setSelectedUsers([]);
    } catch (err: any) {
      setError(err.message || 'Failed to approve users');
      console.error('Error bulk approving users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkReject = async () => {
    if (!token || selectedUsers.length === 0) return;
    
    try {
      setLoading(true);
      
      for (const userId of selectedUsers) {
        await ApiService.users.rejectUser(token, userId);
      }
      
      await fetchUsers();
      await fetchPendingUsers();
      setSelectedUsers([]);
    } catch (err: any) {
      setError(err.message || 'Failed to reject users');
      console.error('Error bulk rejecting users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUserRoles = async (userId: string, newRoles: string[]) => {
    if (!token) return;
    
    try {
      setLoading(true);
      await ApiService.users.updateUserRoles(token, userId, newRoles);
      
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, roles: newRoles } : user
      ));
    } catch (err: any) {
      setError(err.message || 'Failed to update user roles');
      console.error('Error updating user roles:', err);
      await fetchUsers();
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpdateFacebookPagesAccess = async (userId: string, pageIds: string[]) => {
    if (!token) return;
    
    try {
      setLoading(true);
      await ApiService.users.updateFacebookPagesAccess(token, userId, pageIds);
      
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, facebook_pages: pageIds.length, facebook_pages_access: pageIds } : user
      ));
    } catch (err: any) {
      setError(err.message || 'Failed to update Facebook pages access');
      console.error('Error updating Facebook pages access:', err);
      await fetchUsers();
    } finally {
      setLoading(false);
    }
  };
  
  const fetchFacebookPages = async () => {
    if (!token) return;
    
    try {
      const pages = await ApiService.facebook.getPages(token);
      setFacebookPages(pages);
    } catch (err: any) {
      console.error('Error fetching Facebook pages:', err);
      setFacebookPages([]);
    }
  };

  const handleToggleUserStatus = async (userId: string) => {
    if (!token) return;
    
    try {
      setLoading(true);
      const userToUpdate = users.find(u => u.id === userId);
      
      if (!userToUpdate) return;
      
      const newStatus = !userToUpdate.is_active;
      await ApiService.users.toggleUserStatus(token, userId, newStatus);
      
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, is_active: newStatus } : user
      ));
      
      if (newStatus) {
        setStats(prev => ({
          ...prev,
          activeUsers: prev.activeUsers + 1,
          inactiveUsers: prev.inactiveUsers - 1
        }));
      } else {
        setStats(prev => ({
          ...prev,
          activeUsers: prev.activeUsers - 1,
          inactiveUsers: prev.inactiveUsers + 1
        }));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to toggle user status');
      console.error('Error toggling user status:', err);
      await fetchUsers();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="management-container">
      {/* Header */}
      <Header onLogout={onLogout} />

      {/* Main Content */}
      <div className="management-main">
        <div className="management-content">
          <div className="content-wrapper">
            
            {/* Breadcrumb & Title */}
            <div className="management-header">
              <div className="breadcrumb">
                <span className="breadcrumb-item">Dashboard</span>
                <span className="breadcrumb-separator"></span>
                <span className="breadcrumb-item active">Quản lý tài khoản</span>
              </div>
              <div className="page-title">
                Quản lý tài khoản ({stats.totalUsers}/{stats.maxUsers} người dùng)
              </div>
              <div className="company-info-section">
                <h3 className="company-info-title">Thông tin công ty</h3>
                
                {/* Hiển thị thông báo thành công hoặc lỗi */}
                {successMessage && (
                  <div className="success-message">
                    ✅ {successMessage}
                  </div>
                )}
                {error && (
                  <div className="error-message">
                    ❌ {error}
                  </div>
                )}
                
                {isEditing ? (
                  <div className="company-edit-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="company_name">Tên công ty</label>
                        <input
                          type="text"
                          id="company_name"
                          name="company_name"
                          value={editedCompanyInfo?.company_name || ''}
                          onChange={handleCompanyInfoChange}
                          className="form-control"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="company_code">Mã công ty</label>
                        <input
                          type="text"
                          id="company_code"
                          name="company_code"
                          value={editedCompanyInfo?.company_code || ''}
                          onChange={handleCompanyInfoChange}
                          className="form-control"
                          disabled 
                        />
                      </div>
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={editedCompanyInfo?.email || ''}
                          onChange={handleCompanyInfoChange}
                          className="form-control"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="phone">Số điện thoại</label>
                        <input
                          type="text"
                          id="phone"
                          name="phone"
                          value={editedCompanyInfo?.phone || ''}
                          onChange={handleCompanyInfoChange}
                          className="form-control"
                        />
                      </div>
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="address">Địa chỉ</label>
                        <input
                          type="text"
                          id="address"
                          name="address"
                          value={editedCompanyInfo?.address || ''}
                          onChange={handleCompanyInfoChange}
                          className="form-control"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="settings.max_users">Số người dùng tối đa</label>
                        <input
                          type="number"
                          id="settings.max_users"
                          name="settings.max_users"
                          value={editedCompanyInfo?.settings.max_users || 10}
                          onChange={handleCompanyInfoChange}
                          className="form-control"
                        />
                      </div>
                    </div>
                    
                    <div className="form-actions">
                      <button 
                        className="action-btn secondary"
                        onClick={handleCancelEdit}
                        disabled={loading}
                      >
                        ❌ Hủy
                      </button>
                      <button 
                        className="action-btn primary"
                        onClick={handleSaveCompanyInfo}
                        disabled={loading}
                      >
                        💾 Lưu thay đổi
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="company-info-display">
                    <div className="info-row">
                      <div className="info-group">
                        <div className="info-label">Tên công ty:</div>
                        <div className="info-value">{companyInfo.company_name}</div>
                      </div>
                      <div className="info-group">
                        <div className="info-label">Mã công ty:</div>
                        <div className="info-value">{companyInfo.company_code}</div>
                      </div>
                    </div>
                    
                    <div className="info-row">
                      <div className="info-group">
                        <div className="info-label">Email:</div>
                        <div className="info-value">{companyInfo.email || '(Chưa cập nhật)'}</div>
                      </div>
                      <div className="info-group">
                        <div className="info-label">Số điện thoại:</div>
                        <div className="info-value">{companyInfo.phone || '(Chưa cập nhật)'}</div>
                      </div>
                    </div>
                    
                    <div className="info-row ">
                      <div className="info-group">
                        <div className="info-label">Địa chỉ:</div>
                        <div className="info-value">{companyInfo.address || '(Chưa cập nhật)'}</div>
                      </div>
                      <div className="info-group">
                        <div className="info-label">Số người dùng tối đa:</div>
                        <div className="info-value">{companyInfo.settings.max_users}</div>
                      </div>
                    </div>
                    
                    <div className="info-actions">
                      <button 
                        className="action-btn secondary"
                        onClick={handleEditCompany}
                        disabled={loading}
                      >
                        ✏️ Chỉnh sửa thông tin
                      </button>
                      {pendingUsers.length > 0 && (
                        <button 
                          className="action-btn primary"
                          onClick={handleBulkApprove}
                          disabled={selectedUsers.length === 0 || loading}
                        >
                          ✅ Phê duyệt người dùng ({selectedUsers.length})
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Statistics Cards */}
            <UserStatsCards stats={stats} users={users} />

            {/* Pending Users Section */}
            {pendingUsers.length > 0 && (
              <PendingUsers
                pendingUsers={pendingUsers}
                selectedUsers={selectedUsers}
                onSelectedUsersChange={setSelectedUsers}
                onApprove={handleApproveUser}
                onReject={handleRejectUser}
                onBulkApprove={handleBulkApprove}
                onBulkReject={handleBulkReject}
                loading={loading}
              />
            )}

            {/* User Management Table */}
            <UserTable
              users={users}
              currentUser={user}
              onUpdateRoles={handleUpdateUserRoles}
              onToggleStatus={handleToggleUserStatus}
              onUpdateFacebookPages={handleUpdateFacebookPagesAccess}
              facebookPages={facebookPages}
              loading={loading}
              onRefresh={fetchUsers}
            />

          </div>
        </div>
      </div>
    </div>
  );
}
