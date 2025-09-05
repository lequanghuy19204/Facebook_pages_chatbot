'use client';

import React from 'react';
import { UserStats } from '@/services/api';

interface UserStatsCardsProps {
  stats: UserStats;
}

export default function UserStatsCards({ stats }: UserStatsCardsProps) {
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

        {/* Active Users */}
        <div className="stat-card success">
          <div className="stat-icon">🟢</div>
          <div className="stat-content">
            <div className="stat-title">Hoạt động</div>
            <div className="stat-value">{stats.activeUsers}</div>
          </div>
        </div>

        {/* Inactive Users */}
        <div className="stat-card danger">
          <div className="stat-icon">🔴</div>
          <div className="stat-content">
            <div className="stat-title">Ngừng hoạt động</div>
            <div className="stat-value">{stats.inactiveUsers}</div>
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
