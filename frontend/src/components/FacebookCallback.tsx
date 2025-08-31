'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFacebook } from '@/contexts/FacebookContext';

export default function FacebookCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { handleOAuthCallback } = useFacebook();
  
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState<string>('Đang xử lý kết nối Facebook...');

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Get parameters from URL
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Handle OAuth error
        if (error) {
          setStatus('error');
          setMessage(errorDescription || `Lỗi Facebook OAuth: ${error}`);
          setTimeout(() => {
            router.push('/dashboard');
          }, 3000);
          return;
        }

        // Handle missing authorization code
        if (!code) {
          setStatus('error');
          setMessage('Không nhận được mã xác thực từ Facebook');
          setTimeout(() => {
            router.push('/dashboard');
          }, 3000);
          return;
        }

        // Process the authorization code
        await handleOAuthCallback(code, state || undefined);
        
        setStatus('success');
        setMessage('Kết nối Facebook thành công! Đang chuyển hướng...');
        
        // Redirect to dashboard after success
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);

      } catch (err: any) {
        console.error('Facebook OAuth callback error:', err);
        setStatus('error');
        setMessage(err.message || 'Có lỗi xảy ra khi kết nối Facebook');
        
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
      }
    };

    processCallback();
  }, [searchParams, handleOAuthCallback, router]);

  return (
    <div className="facebook-callback">
      <div className="callback-container">
        <div className="callback-content">
          {/* Loading/Status Icon */}
          <div className={`status-icon ${status}`}>
            {status === 'processing' && (
              <div className="loading-spinner"></div>
            )}
            {status === 'success' && (
              <div className="success-icon">✅</div>
            )}
            {status === 'error' && (
              <div className="error-icon">❌</div>
            )}
          </div>

          {/* Status Message */}
          <div className="status-message">
            <h2 className="message-title">
              {status === 'processing' && 'Đang kết nối Facebook...'}
              {status === 'success' && 'Kết nối thành công!'}
              {status === 'error' && 'Kết nối thất bại'}
            </h2>
            <p className="message-text">{message}</p>
          </div>

          {/* Progress Bar */}
          <div className="progress-container">
            <div className={`progress-bar ${status}`}></div>
          </div>

          {/* Additional Actions */}
          {status === 'error' && (
            <div className="error-actions">
              <button 
                className="retry-button"
                onClick={() => router.push('/dashboard')}
              >
                Quay về Dashboard
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .facebook-callback {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .callback-container {
          width: 100%;
          max-width: 400px;
          padding: 20px;
        }

        .callback-content {
          background: white;
          border-radius: 12px;
          padding: 40px 30px;
          text-align: center;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }

        .status-icon {
          margin-bottom: 24px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f4f6;
          border-top: 4px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .success-icon,
        .error-icon {
          font-size: 48px;
          animation: scaleIn 0.5s ease-out;
        }

        .status-message {
          margin-bottom: 24px;
        }

        .message-title {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 8px;
          color: #1f2937;
        }

        .message-text {
          font-size: 14px;
          color: #6b7280;
          line-height: 1.5;
          margin: 0;
        }

        .progress-container {
          width: 100%;
          height: 4px;
          background-color: #f3f4f6;
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 24px;
        }

        .progress-bar {
          height: 100%;
          border-radius: 2px;
          transition: width 2s ease-out;
        }

        .progress-bar.processing {
          width: 60%;
          background: linear-gradient(90deg, #3b82f6, #1d4ed8);
          animation: pulse 2s ease-in-out infinite;
        }

        .progress-bar.success {
          width: 100%;
          background: linear-gradient(90deg, #10b981, #059669);
        }

        .progress-bar.error {
          width: 100%;
          background: linear-gradient(90deg, #ef4444, #dc2626);
        }

        .error-actions {
          margin-top: 16px;
        }

        .retry-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .retry-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes scaleIn {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        @media (max-width: 480px) {
          .callback-container {
            padding: 16px;
          }
          
          .callback-content {
            padding: 30px 20px;
          }
          
          .message-title {
            font-size: 18px;
          }
          
          .message-text {
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
}
