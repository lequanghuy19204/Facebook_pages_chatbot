"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoginPage from '@/components/LoginPage';
import RegisterPage from '@/components/RegisterPage';
import Dashboard from '@/components/Dashboard';

export default function Home() {
  const [currentPage, setCurrentPage] = useState<'login' | 'register'>('login');
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  
  const { 
    isAuthenticated, 
    isLoading, 
    login, 
    register, 
    error, 
    clearError,
    user,
    company 
  } = useAuth();

  // Clear message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage('');
        setMessageType('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Clear auth error when switching pages
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [currentPage, clearError, error]);

  const handleLogin = async (email: string, password: string) => {
    const success = await login(email, password);
    
    if (success) {
      setMessage('Đăng nhập thành công!');
      setMessageType('success');
    } else {
      setMessage(error || 'Đăng nhập thất bại');
      setMessageType('error');
    }
  };

  const handleRegister = async (
    email: string, 
    password: string, 
    confirmPassword: string, 
    fullName: string, 
    accountType: 'admin' | 'staff', 
    companyName?: string, 
    companyCode?: string
  ) => {
    const result = await register(
      email, 
      password, 
      confirmPassword, 
      fullName, 
      accountType, 
      companyName, 
      companyCode
    );
    
    setMessage(result.message);
    setMessageType(result.success ? 'success' : 'error');
    
    if (result.success) {
      if (accountType === 'admin') {
        // Admin registration with immediate login - will be redirected to dashboard
      } else {
        // Staff registration - show success message and switch to login
        setTimeout(() => {
          setCurrentPage('login');
        }, 2000);
      }
    }
  };

  const handleForgotPassword = () => {
    setMessage('Tính năng quên mật khẩu sẽ được cập nhật sớm.');
    setMessageType('');
  };

  const switchToRegister = () => {
    setCurrentPage('register');
    setMessage('');
    setMessageType('');
  };

  const switchToLogin = () => {
    setCurrentPage('login');
    setMessage('');
    setMessageType('');
  };

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  // Show dashboard if authenticated
  if (isAuthenticated && user && company) {
    return <Dashboard user={user} company={company} />;
  }

  // Show registration page
  if (currentPage === 'register') {
    return (
      <>
        {message && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg ${
            messageType === 'success' 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : messageType === 'error'
              ? 'bg-red-100 text-red-800 border border-red-200'
              : 'bg-blue-100 text-blue-800 border border-blue-200'
          }`}>
            {message}
          </div>
        )}
        <RegisterPage
          onRegister={handleRegister}
          onBackToLogin={switchToLogin}
        />
      </>
    );
  }

  // Show login page (default)
  return (
    <>
      {message && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg ${
          messageType === 'success' 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : messageType === 'error'
            ? 'bg-red-100 text-red-800 border border-red-200'
            : 'bg-blue-100 text-blue-800 border border-blue-200'
        }`}>
          {message}
        </div>
      )}
      <LoginPage
        onLogin={handleLogin}
        onForgotPassword={handleForgotPassword}
        onSignUp={switchToRegister}
      />
    </>
  );
}
