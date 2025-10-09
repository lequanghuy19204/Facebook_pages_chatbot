'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ApiService from '@/services/api';
import Header from '../shared/Header';
import '@/styles/settings/Settings.css';

interface SettingsProps {
  onLogout?: () => void;
}
const R2_BUCKET_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET_URL || '';

export default function Settings({ onLogout }: SettingsProps) {
  const { user, token, updateUserInfo, company } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [userInfo, setUserInfo] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    avatar_cloudflare_url: user?.avatar_cloudflare_url || '',
    avatar_cloudflare_key: user?.avatar_cloudflare_key || '',
  });
  
  const [passwordData, setPasswordData] = useState({
    new_password: '',
    confirm_password: '',
  });
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  useEffect(() => {
    if (user) {
      setUserInfo({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        avatar_cloudflare_url: user.avatar_cloudflare_url || '',
        avatar_cloudflare_key: user.avatar_cloudflare_key || '',
      });
    }
  }, [user]);
  
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleEditProfile = () => {
    setIsEditingProfile(true);
  };
  
  const handleCancelEditProfile = () => {
    setIsEditingProfile(false);
    // Reset form
    if (user) {
      setUserInfo({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        avatar_cloudflare_url: user.avatar_cloudflare_url || '',
        avatar_cloudflare_key: user.avatar_cloudflare_key || '',
      });
    }
    setError(null);
  };
  
  const handleSaveProfile = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await ApiService.users.updateProfile(token, {
        full_name: userInfo.full_name,
        phone: userInfo.phone,
      });
      
      // Update context with new user info
      if (updateUserInfo) {
        updateUserInfo({
          ...user!,
          full_name: userInfo.full_name,
          phone: userInfo.phone,
        });
      }
      
      setSuccessMessage('Thông tin cá nhân đã được cập nhật thành công');
      setIsEditingProfile(false);
      
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Không thể cập nhật thông tin cá nhân');
      console.error('Error updating profile:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleChangePassword = () => {
    setIsChangingPassword(true);
  };
  
  const handleCancelChangePassword = () => {
    setIsChangingPassword(false);
    // Reset form
    setPasswordData({
      new_password: '',
      confirm_password: '',
    });
    setError(null);
  };
  
  const handleSavePassword = async () => {
    if (!token) return;
    
    // Validate passwords
    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('Mật khẩu mới và xác nhận mật khẩu không khớp');
      return;
    }
    
    if (passwordData.new_password.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      await ApiService.users.changePassword(token, {
        new_password: passwordData.new_password,
      });
      
      setSuccessMessage('Mật khẩu đã được thay đổi thành công');
      setIsChangingPassword(false);
      
      // Reset form
      setPasswordData({
        new_password: '',
        confirm_password: '',
      });
      
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Không thể thay đổi mật khẩu');
      console.error('Error changing password:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Chỉ chấp nhận file hình ảnh (JPEG, PNG, GIF, WEBP)');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Kích thước file không được vượt quá 5MB');
      return;
    }
    
    try {
      setIsUploading(true);
      setError(null);
      
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await ApiService.users.uploadAvatar(token, formData);
      
      // Update local state
      setUserInfo(prev => ({
        ...prev,
        avatar_cloudflare_url: response.avatar_cloudflare_url,
        avatar_cloudflare_key: response.avatar_cloudflare_key
      }));
      
      // Update context with new avatar
      if (updateUserInfo && user) {
        updateUserInfo({
          ...user,
          avatar_cloudflare_url: response.avatar_cloudflare_url,
          avatar_cloudflare_key: response.avatar_cloudflare_key
        });
      }
      
      setSuccessMessage('Ảnh đại diện đã được cập nhật thành công');
      
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Không thể tải lên ảnh đại diện');
      console.error('Error uploading avatar:', err);
    } finally {
      setIsUploading(false);
    }
  };
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="settings-container">
      {/* Header */}
      <Header onLogout={onLogout} />

      {/* Main Content */}
      <div className="settings-main">
        <div className="settings-content">
          <div className="content-wrapper">
            
            {/* Breadcrumb & Title */}
            <div className="settings-header">
              <div className="breadcrumb">
                <span className="breadcrumb-item">Dashboard</span>
                <span className="breadcrumb-separator"></span>
                <span className="breadcrumb-item active">Cài đặt tài khoản</span>
              </div>
              <div className="page-title">
                Cài đặt tài khoản
              </div>
              
              {/* Hiển thị thông báo thành công hoặc lỗi */}
              {successMessage && (
                <div className="settings-success-message">
                  ✅ {successMessage}
                </div>
              )}
              {error && (
                <div className="settings-error-message">
                  ❌ {error}
                </div>
              )}
            </div>

            {/* Avatar Section */}
            <div className="avatar-section">
              <div className="avatar-container" onClick={handleAvatarClick}>
                {userInfo.avatar_cloudflare_key ? (
                  <img 
                    src={`${R2_BUCKET_URL}/${userInfo.avatar_cloudflare_key}`} 
                    
                    alt={user?.full_name || 'User'} 
                    className="settings-user-avatar"
                  />
                ) : (
                  <div className="avatar-placeholder">
                    {user?.full_name ? getInitials(user.full_name) : 'U'}
                  </div>
                )}
                <div className="avatar-overlay">
                  <div className="avatar-edit-icon">
                    {isUploading ? (
                      <div className="settings-avatar-spinner"></div>
                    ) : (
                      <span>📷</span>
                    )}
                  </div>
                </div>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                style={{ display: 'none' }} 
              />
              <div className="avatar-info">
                <h3>
                  {user?.full_name}
                </h3>
                <div className="user-role-badges">
                  {user?.roles.map((role, index) => (
                    <span key={index} className={`settings-role-badge ${role}`}>
                      <span className="settings-role-icon">Vai trò: </span>
                      {role === 'admin' && '- 👑 Admin -'}
                      {role === 'staff' && '- 💬 Staff -'}
                      {role === 'manage_user' && '- 👥 Quản lý User -'}
                      {role === 'manage_products' && '- 📦 Quản lý Sản phẩm -'}
                      {role === 'manage_chatbot' && '- 🤖 Quản lý Chatbot -'}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Profile Information Section */}
            <div className="settings-section">
              <h3 className="section-title">Thông tin cá nhân</h3>
              
              {isEditingProfile ? (
                <div className="profile-edit-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="full_name">Họ và tên</label>
                      <input
                        type="text"
                        id="full_name"
                        name="full_name"
                        value={userInfo.full_name}
                        onChange={handleProfileChange}
                        className="form-control"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="email">Email</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={userInfo.email}
                        disabled
                        className="form-control"
                      />
                      <small className="form-text">Email không thể thay đổi</small>
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="phone">Số điện thoại</label>
                      <input
                        type="text"
                        id="phone"
                        name="phone"
                        value={userInfo.phone}
                        onChange={handleProfileChange}
                        className="form-control"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="company">Công ty</label>
                        <input
                          type="text"
                          id="company"
                          name="company"
                          value={`${company?.company_name || ''} (${company?.company_code || ''})`}
                          disabled
                          className="form-control"
                        />
                        <small className="form-text">Thông tin công ty không thể thay đổi</small>
                    </div>
                  </div>
                  
                  <div className="form-actions">
                    <button 
                      className="settings-action-btn secondary"
                      onClick={handleCancelEditProfile}
                      disabled={loading}
                    >
                      ❌ Hủy
                    </button>
                    <button 
                      className="settings-action-btn primary"
                      onClick={handleSaveProfile}
                      disabled={loading}
                    >
                      💾 Lưu thay đổi
                    </button>
                  </div>
                </div>
              ) : (
                <div className="profile-info-display">
                  <div className="info-row">
                    <div className="info-group">
                      <div className="info-label">Họ và tên:</div>
                      <div className="info-value">{userInfo.full_name}</div>
                    </div>
                    <div className="info-group">
                      <div className="info-label">Email:</div>
                      <div className="info-value">{userInfo.email}</div>
                    </div>
                  </div>
                  
                  <div className="info-row">
                    <div className="info-group">
                      <div className="info-label">Số điện thoại:</div>
                      <div className="info-value">{userInfo.phone || '(Chưa cập nhật)'}</div>
                    </div>
                      <div className="info-group">
                        <div className="info-label">Công ty:</div>
                        <div className="info-value">{company?.company_name || '(Không có thông tin)'} {company?.company_code && `(${company.company_code})`}</div>
                      </div>
                  </div>
                  
                  <div className="info-actions">
                    <button 
                      className="settings-action-btn secondary"
                      onClick={handleEditProfile}
                      disabled={loading}
                    >
                      ✏️ Chỉnh sửa thông tin
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Password Section */}
            <div className="settings-section">
              <h3 className="section-title">Thay đổi mật khẩu</h3>
              
              {isChangingPassword ? (
                <div className="password-edit-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="new_password">Mật khẩu mới</label>
                      <input
                        type="password"
                        id="new_password"
                        name="new_password"
                        value={passwordData.new_password}
                        onChange={handlePasswordChange}
                        className="form-control"
                      />
                      <small className="form-text">Mật khẩu phải có ít nhất 6 ký tự</small>
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="confirm_password">Xác nhận mật khẩu mới</label>
                      <input
                        type="password"
                        id="confirm_password"
                        name="confirm_password"
                        value={passwordData.confirm_password}
                        onChange={handlePasswordChange}
                        className="form-control"
                      />
                    </div>
                  </div>
                  
                  <div className="form-actions">
                    <button 
                      className="settings-action-btn secondary"
                      onClick={handleCancelChangePassword}
                      disabled={loading}
                    >
                      ❌ Hủy
                    </button>
                    <button 
                      className="settings-action-btn primary"
                      onClick={handleSavePassword}
                      disabled={loading || !passwordData.new_password || !passwordData.confirm_password}
                    >
                      🔒 Cập nhật mật khẩu
                    </button>
                  </div>
                </div>
              ) : (
                <div className="password-info-display">
                  <p className="password-info-text">
                    Để bảo mật tài khoản, bạn nên thay đổi mật khẩu định kỳ và không chia sẻ mật khẩu với người khác.
                  </p>
                  
                  <div className="info-actions">
                    <button 
                      className="settings-action-btn secondary"
                      onClick={handleChangePassword}
                      disabled={loading}
                    >
                      🔒 Thay đổi mật khẩu
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
