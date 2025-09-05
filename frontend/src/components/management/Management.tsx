'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Header from '../shared/Header';
import PendingUsers from './PendingUsers';
import UserTable from './UserTable';
import UserStatsCards from './UserStatsCards';
import '@/styles/Management.css';

interface ManagementProps {
  onLogout?: () => void;
}

// Mock data cho demo - sẽ thay thế bằng API calls
const mockUsers = [
  {
    id: '1',
    full_name: 'Nguyễn Văn Admin',
    email: 'admin@company.com',
    roles: ['admin'],
    is_active: true,
    facebook_pages: 3,
    last_login: new Date('2024-01-20T10:30:00') as Date | null,
    created_at: new Date('2024-01-01T00:00:00'),
    avatar: null
  },
  {
    id: '2',
    full_name: 'Trần Thị Manager',
    email: 'manager@company.com',
    roles: ['manage_user'],
    is_active: true,
    facebook_pages: 1,
    last_login: new Date('2024-01-20T09:15:00') as Date | null,
    created_at: new Date('2024-01-05T00:00:00'),
    avatar: null
  },
  {
    id: '3',
    full_name: 'Lê Văn Staff',
    email: 'staff@company.com',
    roles: ['staff'],
    is_active: true,
    facebook_pages: 0,
    last_login: new Date('2024-01-19T14:20:00') as Date | null,
    created_at: new Date('2024-01-10T00:00:00'),
    avatar: null
  }
];

const mockPendingUsers = [
  {
    id: 'p1',
    full_name: 'Nguyễn Văn A',
    email: 'a@email.com',
    company_code: 'ABC123',
    created_at: new Date('2024-01-18T00:00:00'),
    requested_role: 'staff'
  },
  {
    id: 'p2',
    full_name: 'Trần Thị B',
    email: 'b@email.com',
    company_code: 'ABC123',
    created_at: new Date('2024-01-19T00:00:00'),
    requested_role: 'staff'
  },
  {
    id: 'p3',
    full_name: 'Phạm Văn C',
    email: 'c@email.com',
    company_code: 'ABC123',
    created_at: new Date('2024-01-20T00:00:00'),
    requested_role: 'manage_products'
  }
];

export default function Management({ onLogout }: ManagementProps) {
  const { user, logout } = useAuth();
  const [users, setUsers] = useState(mockUsers);
  const [pendingUsers, setPendingUsers] = useState(mockPendingUsers);
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const handleLogout = async () => {
    await logout();
    if (onLogout) {
      onLogout();
    }
  };

  // Statistics
  const stats = {
    totalUsers: users.length,
    maxUsers: 50, // từ company settings
    activeUsers: users.filter(u => u.is_active).length,
    pendingUsers: pendingUsers.length,
    adminUsers: users.filter(u => u.roles.includes('admin')).length,
    facebookUsers: users.filter(u => u.facebook_pages > 0).length,
    inactiveUsers: users.filter(u => !u.is_active).length
  };

  // Handle approve user
  const handleApproveUser = async (userId: string) => {
    try {
      setLoading(true);
      // API call would go here
      console.log('Approving user:', userId);
      
      // Mock approval - move from pending to active users
      const pendingUser = pendingUsers.find(u => u.id === userId);
      if (pendingUser) {
        const newUser = {
          id: `user_${Date.now()}`,
          full_name: pendingUser.full_name,
          email: pendingUser.email,
          roles: [pendingUser.requested_role],
          is_active: true,
          facebook_pages: 0,
          last_login: null,
          created_at: new Date(),
          avatar: null
        };
        
        setUsers(prev => [...prev, newUser]);
        setPendingUsers(prev => prev.filter(u => u.id !== userId));
      }
    } catch (error) {
      console.error('Error approving user:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle reject user
  const handleRejectUser = async (userId: string) => {
    try {
      setLoading(true);
      // API call would go here
      console.log('Rejecting user:', userId);
      
      setPendingUsers(prev => prev.filter(u => u.id !== userId));
    } catch (error) {
      console.error('Error rejecting user:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle bulk approve
  const handleBulkApprove = async () => {
    try {
      setLoading(true);
      console.log('Bulk approving users:', selectedUsers);
      
      // Mock bulk approval
      const selectedPendingUsers = pendingUsers.filter(u => selectedUsers.includes(u.id));
      const newUsers = selectedPendingUsers.map(pendingUser => ({
        id: `user_${Date.now()}_${Math.random()}`,
        full_name: pendingUser.full_name,
        email: pendingUser.email,
        roles: [pendingUser.requested_role],
        is_active: true,
        facebook_pages: 0,
        last_login: null,
        created_at: new Date(),
        avatar: null
      }));
      
      setUsers(prev => [...prev, ...newUsers]);
      setPendingUsers(prev => prev.filter(u => !selectedUsers.includes(u.id)));
      setSelectedUsers([]);
    } catch (error) {
      console.error('Error bulk approving users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle bulk reject
  const handleBulkReject = async () => {
    try {
      setLoading(true);
      console.log('Bulk rejecting users:', selectedUsers);
      
      setPendingUsers(prev => prev.filter(u => !selectedUsers.includes(u.id)));
      setSelectedUsers([]);
    } catch (error) {
      console.error('Error bulk rejecting users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle user role update
  const handleUpdateUserRoles = async (userId: string, newRoles: string[]) => {
    try {
      setLoading(true);
      // API call would go here
      console.log('Updating user roles:', userId, newRoles);
      
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, roles: newRoles } : user
      ));
    } catch (error) {
      console.error('Error updating user roles:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle user activation toggle
  const handleToggleUserStatus = async (userId: string) => {
    try {
      setLoading(true);
      // API call would go here
      console.log('Toggling user status:', userId);
      
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, is_active: !user.is_active } : user
      ));
    } catch (error) {
      console.error('Error toggling user status:', error);
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
                  📄 Xuất danh sách
                </button>
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
            <UserStatsCards stats={stats} />

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
              loading={loading}
            />

          </div>
        </div>
      </div>
    </div>
  );
}
