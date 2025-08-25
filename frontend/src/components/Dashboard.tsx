"use client";

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserInfo, CompanyInfo } from '@/services/api';

interface DashboardProps {
  user: UserInfo;
  company: CompanyInfo;
}

export default function Dashboard({ user, company }: DashboardProps) {
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  const getRoleDisplayName = (role: string) => {
    const roleMap: Record<string, string> = {
      admin: 'Quản trị viên',
      staff: 'Nhân viên',
      manage_user: 'Quản lý người dùng',
      manage_products: 'Quản lý sản phẩm',
      manage_chatbot: 'Quản lý chatbot',
    };
    return roleMap[role] || role;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img 
                src="/logo.svg" 
                alt="Logo" 
                className="h-8 w-8 mr-3"
              />
              <h1 className="text-xl font-semibold text-gray-900">
                ChatBot Dashboard
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-700">
                Xin chào, <span className="font-medium">{user.fullName}</span>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Chào mừng đến với {company.companyName}!
          </h2>
          <p className="text-gray-600">
            Bạn đã đăng nhập thành công vào hệ thống quản lý ChatBot.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* User Information */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Thông tin cá nhân
              </h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Họ và tên
                </label>
                <p className="mt-1 text-sm text-gray-900">{user.fullName}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <p className="mt-1 text-sm text-gray-900">{user.email}</p>
              </div>
              
              {user.phone && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Số điện thoại
                  </label>
                  <p className="mt-1 text-sm text-gray-900">{user.phone}</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Quyền hạn
                </label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {user.roles.map((role) => (
                    <span
                      key={role}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        role === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : role.startsWith('manage_')
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {getRoleDisplayName(role)}
                    </span>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Trạng thái
                </label>
                <span className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {user.isActive ? 'Đang hoạt động' : 'Tạm ngưng'}
                </span>
              </div>
            </div>
          </div>

          {/* Company Information */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Thông tin công ty
              </h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tên công ty
                </label>
                <p className="mt-1 text-sm text-gray-900">{company.companyName}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Mã công ty
                </label>
                <p className="mt-1 text-sm text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">
                  {company.companyCode}
                </p>
              </div>
              
              {company.email && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email công ty
                  </label>
                  <p className="mt-1 text-sm text-gray-900">{company.email}</p>
                </div>
              )}
              
              {company.phone && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Số điện thoại
                  </label>
                  <p className="mt-1 text-sm text-gray-900">{company.phone}</p>
                </div>
              )}
              
              {company.address && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Địa chỉ
                  </label>
                  <p className="mt-1 text-sm text-gray-900">{company.address}</p>
                </div>
              )}
              
              {company.website && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Website
                  </label>
                  <a 
                    href={company.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    {company.website}
                  </a>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Trạng thái công ty
                </label>
                <span className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  company.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {company.isActive ? 'Đang hoạt động' : 'Tạm ngưng'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Thao tác nhanh
            </h3>
          </div>
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {user.roles.includes('admin') || user.roles.includes('manage_user') ? (
                <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="text-center">
                    <div className="text-2xl mb-2">👥</div>
                    <div className="text-sm font-medium text-gray-900">
                      Quản lý người dùng
                    </div>
                  </div>
                </button>
              ) : null}
              
              {user.roles.includes('admin') || user.roles.includes('manage_products') ? (
                <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="text-center">
                    <div className="text-2xl mb-2">📦</div>
                    <div className="text-sm font-medium text-gray-900">
                      Quản lý sản phẩm
                    </div>
                  </div>
                </button>
              ) : null}
              
              {user.roles.includes('admin') || user.roles.includes('manage_chatbot') ? (
                <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="text-center">
                    <div className="text-2xl mb-2">🤖</div>
                    <div className="text-sm font-medium text-gray-900">
                      Quản lý ChatBot
                    </div>
                  </div>
                </button>
              ) : null}
              
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="text-center">
                  <div className="text-2xl mb-2">⚙️</div>
                  <div className="text-sm font-medium text-gray-900">
                    Cài đặt
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
