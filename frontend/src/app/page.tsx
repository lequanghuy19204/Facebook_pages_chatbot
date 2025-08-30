"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoginPage from '@/components/LoginPage';
import RegisterPage from '@/components/RegisterPage';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const [currentPage, setCurrentPage] = useState<'login' | 'register'>('login');
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  
  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);
  
  // These handlers are kept for logging purposes but actual authentication 
  // is now handled in the components using the AuthContext
  const handleLogin = (email: string, password: string) => {
    console.log('Login attempt logged in Home page:', { email });
  };

  const handleRegister = (email: string, password: string, confirmPassword: string, fullName: string, accountType: 'admin' | 'staff', companyName?: string, companyCode?: string) => {
    console.log('Register attempt logged in Home page:', { 
      email, 
      fullName, 
      accountType, 
      companyName, 
      companyCode 
    });
  };

  const handleForgotPassword = () => {
    console.log('Forgot password clicked');
    // TODO: Implement forgot password logic
  };

  const switchToRegister = () => {
    setCurrentPage('register');
  };

  const switchToLogin = () => {
    setCurrentPage('login');
  };

  if (currentPage === 'register') {
    return (
      <RegisterPage
        onRegister={handleRegister}
        onBackToLogin={switchToLogin}
      />
    );
  }

  return (
    <LoginPage
      onLogin={handleLogin}
      onForgotPassword={handleForgotPassword}
      onSignUp={switchToRegister}
    />
  );
}
