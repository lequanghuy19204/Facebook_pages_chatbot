'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Dashboard from '@/components/Dashboard';

export default function DashboardPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    if (!isAuthenticated && !localStorage.getItem('auth_token')) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const handleLogout = () => {
    router.push('/');
  };

  if (!isAuthenticated && !localStorage.getItem('auth_token')) {
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
