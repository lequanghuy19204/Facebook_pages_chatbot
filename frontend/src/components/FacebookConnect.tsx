'use client';

import React from 'react';
import { useFacebook } from '@/contexts/FacebookContext';
import { useAuth } from '@/contexts/AuthContext';

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

      <style jsx>{`
        .facebook-connect {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .facebook-error {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background-color: #fee;
          color: #c33;
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid #fcc;
          font-size: 14px;
        }

        .error-close {
          background: none;
          border: none;
          color: #c33;
          cursor: pointer;
          font-size: 16px;
          padding: 0;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .error-close:hover {
          background-color: rgba(204, 51, 51, 0.1);
          border-radius: 50%;
        }

        .facebook-button {
          height: 32px;
          min-width: 160px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          padding: 0 12px;
          transition: background-color 0.3s ease;
          white-space: nowrap;
          font-size: 14px;
          font-weight: 500px;
        }

        .facebook-button.connect {
          background-color: rgba(234, 236, 240, 1);
          color: rgba(52, 64, 84, 1);
        }

        .facebook-button.connect:hover:not(:disabled) {
          background-color: rgba(224, 226, 230, 1);
        }

        .facebook-button.disconnect {
          background-color: #eaecf0;
          color: #c33;
        }

        .facebook-button.disconnect:hover:not(:disabled) {
          background-color: #fdd;
        }

        .facebook-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .facebook-icon {
          width: 16.25px;
          height: 16.25px;
          flex-shrink: 0;
        }

        .loading-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          flex-shrink: 0;
        }

        .facebook-status-message {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 32px;
          min-width: 160px;
          border-radius: 6px;
          font-size: 14px;
          padding: 0 12px;
          background-color: #f8f9fa;
          color: #6c757d;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .connection-details {
            font-size: 12px;
          }
          
          .connect-button,
          .disconnect-button {
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
}
