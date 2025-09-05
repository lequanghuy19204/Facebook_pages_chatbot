'use client';

import React from 'react';
import { useFacebook } from '@/contexts/FacebookContext';
import { useAuth } from '@/contexts/AuthContext';
import '@/styles/FacebookConnect.css';

interface FacebookConnectProps {
  className?: string;
}

export default function FacebookConnect({ className = '' }: FacebookConnectProps) {
  const { user } = useAuth();
  const {
    isConnected,
    connectionStatus,
    connecting,
    disconnecting,
    error,
    connectFacebook,
    disconnectFacebook,
    clearError
  } = useFacebook();

  // Check if user is admin
  const isAdmin = user?.roles.includes('admin');

  // Handle connect button click
  const handleConnect = async () => {
    if (error) clearError();
    await connectFacebook();
  };

  // Handle disconnect button click
  const handleDisconnect = async () => {
    if (error) clearError();
    
    if (window.confirm('Bạn có chắc chắn muốn hủy kết nối Facebook? Tất cả Pages sẽ bị xóa khỏi hệ thống.')) {
      await disconnectFacebook();
    }
  };

  return (
    <div className={`facebook-connect ${className}`}>
      {/* Error Display */}
      {error && (
        <div className="facebook-error">
          <span className="error-text">❌ {error}</span>
          <button 
            className="error-close"
            onClick={clearError}
            title="Đóng"
          >
            ✕
          </button>
        </div>
      )}

      {/* Facebook Button */}
      {isAdmin ? (
        <button
          className={`facebook-button ${isConnected ? 'disconnect' : 'connect'}`}
          onClick={isConnected ? handleDisconnect : handleConnect}
          disabled={connecting || disconnecting}
          title={isConnected ? "Hủy kết nối Facebook" : "Kết nối Facebook"}
        >
          {(connecting || disconnecting) ? (
            <>
              <div className="loading-spinner"></div>
              <span>{connecting ? 'Đang kết nối...' : 'Đang hủy kết nối...'}</span>
            </>
          ) : (
            <>
              {isConnected ? (
                <>
                  <span>🔌</span>
                  <span>Hủy kết nối Facebook</span>
                </>
              ) : (
                <>
                  <img src="/plus.svg" alt="Facebook" className="facebook-icon" />
                  <span>Kết nối Facebook</span>
                </>
              )}
            </>
          )}
        </button>
      ) : (
        <div className="facebook-status-message">
          <span>
            {isConnected 
              ? '✅ Facebook đã được kết nối' 
              : '🔒 Chỉ admin mới có thể kết nối Facebook'
            }
          </span>
        </div>
      )}
    </div>
  );
}
