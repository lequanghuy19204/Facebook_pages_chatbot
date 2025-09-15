'use client';

import { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Products from '@/components/products/Products';

function ProductsContent() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    
    if (!isAuthenticated && typeof window !== 'undefined' && !localStorage.getItem('auth_token')) {
      router.push('/');
      return;
    }

    
    if (user && !user.roles.includes('admin') && !user.roles.includes('manage_products')) {
      router.push('/dashboard');
      return;
    }
  }, [isAuthenticated, user, router]);

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

  if (user && !user.roles.includes('admin') && !user.roles.includes('manage_products')) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2>Không có quyền truy cập</h2>
          <p>Bạn không có quyền truy cập trang quản lý sản phẩm.</p>
          <button onClick={() => router.push('/dashboard')}>
            Quay về Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <Products onLogout={handleLogout} />;
}

export default function ProductsPage() {
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
      <ProductsContent />
    </Suspense>
  );
}
