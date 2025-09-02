'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import ApiService, { FacebookConnectionStatus, FacebookPage, FacebookSyncResult } from '@/services/api';
import { useAuth } from './AuthContext';

interface FacebookContextType {
  // Connection Status
  isConnected: boolean;
  connectionStatus: FacebookConnectionStatus | null;
  
  // Facebook Pages
  pages: FacebookPage[];
  pagesLoading: boolean;
  
  // Loading States
  connecting: boolean;
  syncing: boolean;
  disconnecting: boolean;
  
  // Error State
  error: string | null;
  
  // Actions
  connectFacebook: () => Promise<void>;
  handleOAuthCallback: (code: string, state?: string) => Promise<void>;
  refreshStatus: () => Promise<void>;
  refreshPages: () => Promise<void>;
  syncPages: () => Promise<FacebookSyncResult>;
  disconnectFacebook: () => Promise<void>;
  clearError: () => void;
}

const FacebookContext = createContext<FacebookContextType | undefined>(undefined);

export function useFacebook() {
  const context = useContext(FacebookContext);
  if (context === undefined) {
    throw new Error('useFacebook must be used within a FacebookProvider');
  }
  return context;
}

interface FacebookProviderProps {
  children: ReactNode;
}

export function FacebookProvider({ children }: FacebookProviderProps) {
  const { token, user, loading } = useAuth();
  
  // State
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<FacebookConnectionStatus | null>(null);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [pagesLoading, setPagesLoading] = useState<boolean>(false);
  const [connecting, setConnecting] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [disconnecting, setDisconnecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load Facebook status when user is authenticated
  useEffect(() => {
    if (token && user && !loading) {
      refreshStatus();
    }
  }, [token, user, loading]);

  // Load pages when connected
  useEffect(() => {
    if (isConnected && token) {
      refreshPages();
    }
  }, [isConnected, token]);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Get Facebook connection status
  const refreshStatus = async () => {
    if (!token) return;

    try {
      const status = await ApiService.facebook.getStatus(token);
      setConnectionStatus(status);
      setIsConnected(status.is_connected);
    } catch (err: any) {
      console.error('Failed to get Facebook status:', err);
      setError(err.message || 'Không thể lấy trạng thái kết nối Facebook');
      setIsConnected(false);
      setConnectionStatus(null);
    }
  };

  // Get Facebook pages
  const refreshPages = async () => {
    if (!token || !isConnected) return;

    setPagesLoading(true);
    try {
      const facebookPages = await ApiService.facebook.getPages(token);
      setPages(facebookPages);
    } catch (err: any) {
      console.error('Failed to get Facebook pages:', err);
      setError(err.message || 'Không thể lấy danh sách Facebook Pages');
      setPages([]);
    } finally {
      setPagesLoading(false);
    }
  };

  // Start Facebook connection process
  const connectFacebook = async () => {
    if (!token) {
      setError('Vui lòng đăng nhập trước khi kết nối Facebook');
      return;
    }

    // Check if user is admin
    if (!user?.roles.includes('admin')) {
      setError('Chỉ admin mới có thể kết nối Facebook');
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      // Get OAuth URL from backend
      const oauthData = await ApiService.facebook.getOAuthUrl(token);
      
      // Store state in sessionStorage for verification
      sessionStorage.setItem('facebook_oauth_state', oauthData.state);
      
      // Redirect to Facebook OAuth
      window.location.href = oauthData.oauth_url;
    } catch (err: any) {
      console.error('Failed to start Facebook connection:', err);
      setError(err.message || 'Không thể khởi tạo kết nối Facebook');
      setConnecting(false);
    }
  };

  // Handle OAuth callback (called when user returns from Facebook)
  const handleOAuthCallback = async (code: string, state?: string) => {
    if (!token) {
      setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại');
      return;
    }

    // Verify state parameter
    const storedState = sessionStorage.getItem('facebook_oauth_state');
    if (state && storedState && state !== storedState) {
      setError('Trạng thái OAuth không hợp lệ. Vui lòng thử lại');
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      // Send authorization code to backend
      const result = await ApiService.facebook.connect(token, code, state);
      
      // Update connection status
      setConnectionStatus(result);
      setIsConnected(result.is_connected);
      
      // Clear stored state
      sessionStorage.removeItem('facebook_oauth_state');
      
      // Show success message
      console.log('Facebook connected successfully:', result);
      
    } catch (err: any) {
      console.error('Failed to connect Facebook:', err);
      setError(err.message || 'Không thể kết nối Facebook. Vui lòng thử lại');
    } finally {
      setConnecting(false);
    }
  };

  // Sync Facebook pages manually
  const syncPages = async (): Promise<FacebookSyncResult> => {
    if (!token) {
      throw new Error('Vui lòng đăng nhập trước khi đồng bộ');
    }

    if (!user?.roles.includes('admin')) {
      throw new Error('Chỉ admin mới có thể đồng bộ Facebook Pages');
    }

    setSyncing(true);
    setError(null);

    try {
      const result = await ApiService.facebook.sync(token);
      
      // Refresh pages after sync
      await refreshPages();
      await refreshStatus();
      
      return result;
    } catch (err: any) {
      console.error('Failed to sync Facebook pages:', err);
      setError(err.message || 'Không thể đồng bộ Facebook Pages');
      throw err;
    } finally {
      setSyncing(false);
    }
  };

  // Disconnect Facebook
  const disconnectFacebook = async () => {
    if (!token) {
      setError('Vui lòng đăng nhập trước khi hủy kết nối');
      return;
    }

    if (!user?.roles.includes('admin')) {
      setError('Chỉ admin mới có thể hủy kết nối Facebook');
      return;
    }

    setDisconnecting(true);
    setError(null);

    try {
      await ApiService.facebook.disconnect(token);
      
      // Reset state
      setIsConnected(false);
      setConnectionStatus(null);
      setPages([]);
      
      console.log('Facebook disconnected successfully');
      
    } catch (err: any) {
      console.error('Failed to disconnect Facebook:', err);
      setError(err.message || 'Không thể hủy kết nối Facebook');
    } finally {
      setDisconnecting(false);
    }
  };

  // Clear error
  const clearError = () => {
    setError(null);
  };

  const value = {
    // Connection Status
    isConnected,
    connectionStatus,
    
    // Facebook Pages
    pages,
    pagesLoading,
    
    // Loading States
    connecting,
    syncing,
    disconnecting,
    
    // Error State
    error,
    
    // Actions
    connectFacebook,
    handleOAuthCallback,
    refreshStatus,
    refreshPages,
    syncPages,
    disconnectFacebook,
    clearError,
  };

  return <FacebookContext.Provider value={value}>{children}</FacebookContext.Provider>;
}
