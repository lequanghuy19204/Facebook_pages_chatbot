"use client";

import React, { useState } from "react";
import "@/styles/LoginPage.css";

export interface LoginPageProps {
  onLogin?: (email: string, password: string) => void;
  onForgotPassword?: () => void;
  onSignUp?: () => void;
}

export default function LoginPage(props: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (props.onLogin) {
      props.onLogin(email, password);
    }
  };

  return (
    <div className="login-container">
      <div className="login-left-panel">
        <div className="login-form-container">
          <img 
            src="/logo.svg" 
            alt="Logo" 
            className="login-logo"
          />
          <h1 className="login-title">Đăng nhập Account</h1>
          <p className="login-subtitle">
            Sử dụng email và password để truy cập vào tài khoản của bạn.
          </p>
          
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label className="form-label">Email/Username</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email"
                className="form-input form-input-focused"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mật khẩu</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="form-input"
                required
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="sign-in-button">
                Đăng nhập
              </button>
              <button 
                type="button" 
                className="forgot-password-button"
                onClick={props.onForgotPassword}
              >
                Quên mật khẩu
              </button>
            </div>
          </form>

          <div className="signup-section">
            <span className="signup-text">Bạn chưa có tài khoản?</span>
            <button 
              className="signup-button"
              onClick={props.onSignUp}
            >
              Đăng ký ngay
            </button>
          </div>
        </div>
      </div>

      <div className="login-right-panel">
        <div className="showcase-container">
          <img 
            src="/Showcase.svg" 
            alt="ChatBot Showcase" 
            className="showcase-image"
          />
          <h2 className="showcase-title">
            ChatBot - Multi-channel management and sales platform
          </h2>
          <p className="showcase-subtitle">
            Comprehensive sales management on social media and e-commerce platforms
          </p>
        </div>
      </div>
    </div>
  );
} 