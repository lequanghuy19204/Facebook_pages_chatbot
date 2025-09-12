'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import ApiService, { AuthResponse } from '@/services/api';

interface User {
  user_id: string;
  email: string;
  full_name: string;
  roles: string[];
  company_id: string;
  is_active: boolean;
  avatar_cloudflare_url?: string;
  avatar_cloudflare_key?: string;
  phone?: string;
  company_name?: string;
}

interface Company {
  company_id: string;
  company_name: string;
  company_code: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  company: Company | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  registerAdmin: (data: any) => Promise<void>;
  registerStaff: (data: any) => Promise<{ message: string }>;
  logout: () => Promise<void>;
  loading: boolean;
  error: string | null;
  updateUserInfo: (updatedUser: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    const storedCompany = localStorage.getItem('auth_company');

    if (storedToken && storedUser && storedCompany) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      setCompany(JSON.parse(storedCompany));
      setIsAuthenticated(true);
    }

    setLoading(false);
  }, []);

  
  useEffect(() => {
    let heartbeatInterval: NodeJS.Timeout;

    if (isAuthenticated && token) {
      
      const sendHeartbeat = async () => {
        try {
          await ApiService.users.sendHeartbeat(token);
          console.log('Heartbeat sent successfully');
        } catch (err) {
          console.error('Failed to send heartbeat:', err);
        }
      };

      
      sendHeartbeat();

      
      heartbeatInterval = setInterval(sendHeartbeat, 60000); 
    }

    
    return () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
    };
  }, [isAuthenticated, token]);

  
  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const response: AuthResponse = await ApiService.auth.login({ email, password });
      
      
      localStorage.setItem('auth_token', response.access_token);
      localStorage.setItem('auth_user', JSON.stringify(response.user));
      localStorage.setItem('auth_company', JSON.stringify(response.company));
      
      setToken(response.access_token);
      setUser(response.user);
      setCompany(response.company);
      setIsAuthenticated(true);
    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  
  const registerAdmin = async (data: any) => {
    setLoading(true);
    setError(null);
    try {
      const response: AuthResponse = await ApiService.auth.registerAdmin(data);
      
      
      localStorage.setItem('auth_token', response.access_token);
      localStorage.setItem('auth_user', JSON.stringify(response.user));
      localStorage.setItem('auth_company', JSON.stringify(response.company));
      
      setToken(response.access_token);
      setUser(response.user);
      setCompany(response.company);
      setIsAuthenticated(true);
    } catch (err: any) {
      setError(err.message || 'Admin registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  
  const registerStaff = async (data: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await ApiService.auth.registerStaff(data);
      return response;
    } catch (err: any) {
      setError(err.message || 'Staff registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  
  const updateUserInfo = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('auth_user', JSON.stringify(updatedUser));
  };

  
  const logout = async () => {
    setLoading(true);
    try {
      if (token) {
        await ApiService.auth.logout(token);
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_company');
      
      setToken(null);
      setUser(null);
      setCompany(null);
      setIsAuthenticated(false);
      setLoading(false);
    }
  };

  const value = {
    isAuthenticated,
    user,
    company,
    token,
    login,
    registerAdmin,
    registerStaff,
    logout,
    loading,
    error,
    updateUserInfo,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
