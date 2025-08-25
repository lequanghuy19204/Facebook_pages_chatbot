"use client";

import { useState } from 'react';
import LoginPage from '@/components/LoginPage';
import RegisterPage from '@/components/RegisterPage';

export default function Home() {
  const [currentPage, setCurrentPage] = useState<'login' | 'register'>('login');

  const handleLogin = (email: string, password: string) => {
    console.log('Login attempt:', { email, password });
    // TODO: Implement actual login logic
  };

  const handleRegister = (email: string, password: string, confirmPassword: string, fullName: string, accountType: 'admin' | 'staff', companyName?: string, companyCode?: string) => {
    console.log('Register attempt:', { 
      email, 
      password, 
      confirmPassword, 
      fullName, 
      accountType, 
      companyName, 
      companyCode 
    });
    // TODO: Implement actual register logic
    
    if (accountType === 'admin') {
      console.log('Creating new company:', companyName, 'with code:', companyCode);
    } else {
      console.log('Joining existing company with code:', companyCode);
    }
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
