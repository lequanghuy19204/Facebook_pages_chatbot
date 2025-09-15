'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFacebook } from '@/contexts/FacebookContext';
import '@/styles/dashboard/FacebookCallback.css';

export default function FacebookCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { handleOAuthCallback } = useFacebook();
  
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState<string>('Đang xử lý kết nối Facebook...');

  useEffect(() => {
    const processCallback = async () => {
      try {
        
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        
        if (error) {
          setStatus('error');
          setMessage(errorDescription || `Lỗi Facebook OAuth: ${error}`);
          setTimeout(() => {
            router.push('/dashboard');
          }, 3000);
          return;
        }

        
        if (!code) {
          setStatus('error');
          setMessage('Không nhận được mã xác thực từ Facebook');
          setTimeout(() => {
            router.push('/dashboard');
          }, 3000);
          return;
        }

        
        await handleOAuthCallback(code, state || undefined);
        
        setStatus('success');
        setMessage('Kết nối Facebook thành công! Đang chuyển hướng...');
        
        
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
    </div>
  );
}
