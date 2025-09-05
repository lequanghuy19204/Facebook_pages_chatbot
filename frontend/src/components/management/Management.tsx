'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ApiService, { User, PendingUser, UserStats, FacebookPage } from '@/services/api';
import Header from '../shared/Header';
import PendingUsers from './PendingUsers';
import UserTable from './UserTable';
import UserStatsCards from './UserStatsCards';
import '@/styles/Management.css';

interface ManagementProps {
  onLogout?: () => void;
}


export default function Management({ onLogout }: ManagementProps) {
  const { user, logout, token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [facebookPages, setFacebookPages] = useState<FacebookPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    maxUsers: 10,
    activeUsers: 0,
    pendingUsers: 0,
    adminUsers: 0,
    facebookUsers: 0,
    inactiveUsers: 0,
    onlineUsers: 0,
    offlineUsers: 0
  });
  const [error, setError] = useState<string | null>(null);
  
  // Load users, pending users, and Facebook pages on component mount
  useEffect(() => {
    if (token) {
      fetchUsers();
      fetchPendingUsers();
      fetchFacebookPages();
    }
  }, [token]);

  const handleLogout = async () => {
    await logout();
    if (onLogout) {
      onLogout();
    }
  };

  // Fetch users from API
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
  
  // Fetch pending users from API
  const fetchPendingUsers = async () => {
    if (!token) return;
    
    try {
      const pendingUsers = await ApiService.users.getPendingUsers(token);
      setPendingUsers(pendingUsers);
    } catch (err: any) {
      console.error('Error fetching pending users:', err);
    }
  };

  // Handle approve user
  const handleApproveUser = async (userId: string) => {
    if (!token) return;
    
    try {
      setLoading(true);
      await ApiService.users.approveUser(token, userId);
      
      // Refresh data
      await fetchUsers();
      await fetchPendingUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to approve user');
      console.error('Error approving user:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle reject user
  const handleRejectUser = async (userId: string) => {
    if (!token) return;
    
    try {
      setLoading(true);
      await ApiService.users.rejectUser(token, userId);
      
      // Refresh data
      await fetchPendingUsers();
      await fetchUsers(); // Also refresh users to update stats
    } catch (err: any) {
      setError(err.message || 'Failed to reject user');
      console.error('Error rejecting user:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle bulk approve
  const handleBulkApprove = async () => {
    if (!token || selectedUsers.length === 0) return;
    
    try {
      setLoading(true);
      
      // Approve each selected user sequentially
      for (const userId of selectedUsers) {
        await ApiService.users.approveUser(token, userId);
      }
      
      // Refresh data
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

  // Handle bulk reject
  const handleBulkReject = async () => {
    if (!token || selectedUsers.length === 0) return;
    
    try {
      setLoading(true);
      
      // Reject each selected user sequentially
      for (const userId of selectedUsers) {
        await ApiService.users.rejectUser(token, userId);
      }
      
      // Refresh data
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

  // Handle user role update
  const handleUpdateUserRoles = async (userId: string, newRoles: string[]) => {
    if (!token) return;
    
    try {
      setLoading(true);
      await ApiService.users.updateUserRoles(token, userId, newRoles);
      
      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, roles: newRoles } : user
      ));
    } catch (err: any) {
      setError(err.message || 'Failed to update user roles');
      console.error('Error updating user roles:', err);
      // Refresh data to ensure consistency
      await fetchUsers();
    } finally {
      setLoading(false);
    }
  };
  
  // Handle Facebook pages access update
  const handleUpdateFacebookPagesAccess = async (userId: string, pageIds: string[]) => {
    if (!token) return;
    
    try {
      setLoading(true);
      await ApiService.users.updateFacebookPagesAccess(token, userId, pageIds);
      
      // Update local state - update facebook_pages count
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, facebook_pages: pageIds.length, facebook_pages_access: pageIds } : user
      ));
    } catch (err: any) {
      setError(err.message || 'Failed to update Facebook pages access');
      console.error('Error updating Facebook pages access:', err);
      // Refresh data to ensure consistency
      await fetchUsers();
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch Facebook pages
  const fetchFacebookPages = async () => {
    if (!token) return;
    
    try {
      const pages = await ApiService.facebook.getPages(token);
      setFacebookPages(pages);
    } catch (err: any) {
      console.error('Error fetching Facebook pages:', err);
      // Don't set error state here to avoid disrupting the main UI
      setFacebookPages([]);
    }
  };

  // Handle user activation toggle
  const handleToggleUserStatus = async (userId: string) => {
    if (!token) return;
    
    try {
      setLoading(true);
      const userToUpdate = users.find(u => u.id === userId);
      
      if (!userToUpdate) return;
      
      const newStatus = !userToUpdate.is_active;
      await ApiService.users.toggleUserStatus(token, userId, newStatus);
      
      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, is_active: newStatus } : user
      ));
      
      // Update stats
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
      // Refresh data to ensure consistency
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
              <div className="header-actions">
                <button className="action-btn secondary">
                  ⚙️ Cài đặt quyền
                </button>
                <button 
                  className="action-btn primary"
                  onClick={handleBulkApprove}
                  disabled={selectedUsers.length === 0 || loading}
                >
                  ✅ Phê duyệt hàng loạt
                </button>
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
