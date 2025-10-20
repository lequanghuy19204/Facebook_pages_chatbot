'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ChatbotManagement from '@/components/chatbot/ChatbotManagement';

export default function ChatbotPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#6b7280'
      }}>
        Đang tải...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Check if user has permission to access chatbot management
  const canAccessChatbot = user.roles.includes('admin') || user.roles.includes('manage_chatbot');

  if (!canAccessChatbot) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        gap: '16px'
      }}>
        <div style={{ fontSize: '48px' }}>🚫</div>
        <div style={{ fontSize: '18px', color: '#6b7280' }}>
          Bạn không có quyền truy cập trang này
        </div>
        <button 
          onClick={() => router.push('/dashboard')}
          style={{
            padding: '10px 20px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          Quay lại Dashboard
        </button>
      </div>
    );
  }

  return <ChatbotManagement onLogout={() => router.push('/')} />;
}

