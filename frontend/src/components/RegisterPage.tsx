"use client";

import React, { useState } from "react";
import "@/styles/RegisterPage.css";

export interface RegisterPageProps {
  onRegister?: (email: string, password: string, confirmPassword: string, fullName: string, accountType: 'admin' | 'staff', companyName?: string, companyCode?: string) => void;
  onBackToLogin?: () => void;
}

export default function RegisterPage(props: RegisterPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [accountType, setAccountType] = useState<'admin' | 'staff'>('staff');
  const [companyName, setCompanyName] = useState("");
  const [companyCode, setCompanyCode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Mật khẩu không khớp!");
      return;
    }
    
    // Validation cho Admin
    if (accountType === 'admin' && (!companyName.trim() || !companyCode.trim())) {
      alert("Vui lòng nhập đầy đủ tên công ty và mã công ty!");
      return;
    }
    
    // Validation cho Staff
    if (accountType === 'staff' && !companyCode.trim()) {
      alert("Vui lòng nhập mã công ty để tham gia!");
      return;
    }
    
    if (props.onRegister) {
      props.onRegister(email, password, confirmPassword, fullName, accountType, companyName, companyCode);
    }
  };

  return (
    <div className="register-container">
      <div className="register-left-panel">
        <div className="register-form-container">
          <img 
            src="/logo.svg" 
            alt="Logo" 
            className="register-logo"
          />
          <h1 className="register-title">Đăng ký Account</h1>
          <p className="register-subtitle">
            Tạo tài khoản mới để bắt đầu sử dụng ChatBot platform.
          </p>
          
          <form onSubmit={handleSubmit} className="register-form">
            {/* Chọn loại tài khoản */}
            <div className="form-group">
              <label className="form-label">Loại tài khoản</label>
              <div className="account-type-selection">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="accountType"
                    value="admin"
                    checked={accountType === 'admin'}
                    onChange={(e) => setAccountType(e.target.value as 'admin' | 'staff')}
                  />
                  <span className="radio-label">Admin (Tạo công ty mới)</span>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="accountType"
                    value="staff"
                    checked={accountType === 'staff'}
                    onChange={(e) => setAccountType(e.target.value as 'admin' | 'staff')}
                  />
                  <span className="radio-label">Nhân viên (Tham gia công ty)</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Họ và tên</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nhập họ và tên"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Nhập email"
                className="form-input"
                required
              />
            </div>

            {/* Hiển thị fields cho Admin */}
            {accountType === 'admin' && (
              <>
                <div className="form-group">
                  <label className="form-label">Tên công ty</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Nhập tên công ty"
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Mã công ty</label>
                  <input
                    type="text"
                    value={companyCode}
                    onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
                    placeholder="Nhập mã công ty (VD: ABC)"
                    className="form-input"
                    maxLength={10}
                    required
                  />
                  <small className="form-hint">Mã công ty sẽ được dùng để nhân viên tham gia</small>
                </div>
              </>
            )}

            {/* Hiển thị field cho Staff */}
            {accountType === 'staff' && (
              <div className="form-group">
                <label className="form-label">Mã công ty</label>
                <input
                  type="text"
                  value={companyCode}
                  onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
                  placeholder="Nhập mã công ty để tham gia"
                  className="form-input"
                  required
                />
                <small className="form-hint">Liên hệ admin để lấy mã công ty</small>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Mật khẩu</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Xác nhận mật khẩu</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu"
                className="form-input"
                required
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="register-button">
                Đăng ký
              </button>
            </div>
          </form>

          <div className="login-section">
            <span className="login-text">Bạn đã có tài khoản?</span>
            <button 
              className="login-button"
              onClick={props.onBackToLogin}
            >
              Đăng nhập ngay
            </button>
          </div>
        </div>
      </div>

      <div className="register-right-panel">
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