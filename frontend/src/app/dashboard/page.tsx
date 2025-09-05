'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useFacebook } from '@/contexts/FacebookContext';
import Dashboard from '@/components/dashboard/Dashboard';

function DashboardContent() {
  const { isAuthenticated } = useAuth();
  const { handleOAuthCallback } = useFacebook();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Handle Facebook OAuth callback if present
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (code && isAuthenticated) {
      // This is a Facebook OAuth callback
      handleOAuthCallback(code, state || undefined);
      // Clean up URL parameters
      router.replace('/dashboard');
      return;
    }

    if (error) {
      console.error('Facebook OAuth error:', error);
      // Clean up URL parameters
      router.replace('/dashboard');
      return;
    }

    // Check if user is authenticated
    if (!isAuthenticated && typeof window !== 'undefined' && !localStorage.getItem('auth_token')) {
      router.push('/');
    }
  }, [isAuthenticated, router, searchParams, handleOAuthCallback]);

  const handleLogout = () => {
    router.push('/');
  };

  if (!isAuthenticated && typeof window !== 'undefined' && !localStorage.getItem('auth_token')) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: 'inline-block',
            width: '32px',
            height: '32px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 2s linear infinite'
          }}></div>
          <p style={{ marginTop: '8px' }}>Đang tải...</p>
        </div>
      </div>
    );
  }

  return <Dashboard onLogout={handleLogout} />;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: 'inline-block',
            width: '32px',
            height: '32px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 2s linear infinite'
          }}></div>
          <p style={{ marginTop: '8px' }}>Đang tải...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
