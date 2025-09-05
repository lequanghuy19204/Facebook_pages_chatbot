'use client';

import React from 'react';
import { UserStats, User } from '@/services/api';

interface UserStatsCardsProps {
  stats: UserStats;
  users?: User[];
}

export default function UserStatsCards({ stats, users = [] }: UserStatsCardsProps) {
  // Calculate online/offline users based on last_login time
  const isUserOnline = (lastLogin: Date | null): boolean => {
    if (!lastLogin) return false;
    
    const now = new Date();
    const diff = now.getTime() - new Date(lastLogin).getTime();
    const minutes = diff / (1000 * 60);
    
    return minutes < 2; // Online if last activity was less than 2 minutes ago
  };
  
  // Count online users from the users array
  const onlineUsers = users.filter(user => isUserOnline(user.last_login)).length;
  const offlineUsers = users.filter(user => user.is_active && !isUserOnline(user.last_login)).length;
  return (
    <div className="stats-section">
      <div className="stats-grid">
        
        {/* Total Users */}
        <div className="stat-card primary">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-title">Tổng người dùng</div>
            <div className="stat-value">{stats.totalUsers}/{stats.maxUsers}</div>
          </div>
        </div>

        {/* Online Users */}
        <div className="stat-card success">
          <div className="stat-icon">🟢</div>
          <div className="stat-content">
            <div className="stat-title">Online</div>
            <div className="stat-value">{users.length > 0 ? onlineUsers : stats.onlineUsers || 0}</div>
          </div>
        </div>

        {/* Offline Users */}
        <div className="stat-card danger">
          <div className="stat-icon">🔴</div>
          <div className="stat-content">
            <div className="stat-title">Offline</div>
            <div className="stat-value">{users.length > 0 ? offlineUsers : stats.offlineUsers || (stats.activeUsers - (stats.onlineUsers || 0))}</div>
          </div>
        </div>

        {/* Pending Users */}
        <div className="stat-card warning">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-title">Chờ duyệt</div>
            <div className="stat-value">{stats.pendingUsers}</div>
          </div>
        </div>

      </div>
    </div>
  );
}
