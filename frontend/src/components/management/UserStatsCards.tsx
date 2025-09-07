'use client';

import React from 'react';
import { UserStats, User } from '@/services/api';

interface UserStatsCardsProps {
  stats: UserStats;
  users?: User[];
}

export default function UserStatsCards({ stats, users = [] }: UserStatsCardsProps) {
  // Count online/offline users based on is_online field
  const onlineUsers = users.filter(user => user.is_online).length;
  const offlineUsers = users.filter(user => user.is_active && !user.is_online).length;
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
            <div className="stat-value">{onlineUsers}</div>
          </div>
        </div>

        {/* Offline Users */}
        <div className="stat-card danger">
          <div className="stat-icon">🔴</div>
          <div className="stat-content">
            <div className="stat-title">Offline</div>
            <div className="stat-value">{offlineUsers}</div>
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
