"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import "@/styles/auth/RegisterPage.css";
import { useAuth } from "@/contexts/AuthContext";

export interface RegisterPageProps {
  onRegister?: (email: string, password: string, confirmPassword: string, fullName: string, accountType: 'admin' | 'staff', companyName?: string, companyCode?: string) => void;
  onBackToLogin?: () => void;
}

export default function RegisterPage(props: RegisterPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [accountType, setAccountType] = useState<'admin' | 'staff'>('staff');
  const [companyName, setCompanyName] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  const { registerAdmin, registerStaff } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    
    
    if (password !== confirmPassword) {
      setErrorMessage("Mật khẩu không khớp!");
      setIsLoading(false);
      return;
    }
    
    
    if (accountType === 'admin' && (!companyName.trim() || !companyCode.trim())) {
      setErrorMessage("Vui lòng nhập đầy đủ tên công ty và mã công ty!");
      setIsLoading(false);
      return;
    }
    
    
    if (accountType === 'staff' && !companyCode.trim()) {
      setErrorMessage("Vui lòng nhập mã công ty để tham gia!");
      setIsLoading(false);
      return;
    }
    
    try {
      if (accountType === 'admin') {
        
        const adminData = {
          email,
          password,
          full_name: fullName,
          company_name: companyName,
          company_code: companyCode
        };
        
        await registerAdmin(adminData);
        
        
        router.push("/dashboard");
      } else {
        
        const staffData = {
          email,
          password,
          full_name: fullName,
          company_code: companyCode,
          phone: ""
        };
        
        const response = await registerStaff(staffData);
        
        
        setSuccessMessage(response.message || "Đăng ký thành công! Vui lòng chờ admin duyệt tài khoản.");
        
        
        setTimeout(() => {
          if (props.onBackToLogin) {
            props.onBackToLogin();
          }
        }, 3000);
      }
      
      
      if (props.onRegister) {
        props.onRegister(email, password, confirmPassword, fullName, accountType, companyName, companyCode);
      }
    } catch (error: any) {
      setErrorMessage(error.message || "Đăng ký thất bại. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
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
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="form-input"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiển thị mật khẩu"}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Xác nhận mật khẩu</label>
              <div className="password-input-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  className="form-input"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiển thị mật khẩu"}
                >
                  {showConfirmPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="error-message">
                {errorMessage}
              </div>
            )}
            
            {successMessage && (
              <div className="success-message">
                {successMessage}
              </div>
            )}
            
            <div className="form-actions">
              <button 
                type="submit" 
                className="register-button"
                disabled={isLoading || !!successMessage}
              >
                {isLoading ? "Đang xử lý..." : "Đăng ký"}
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