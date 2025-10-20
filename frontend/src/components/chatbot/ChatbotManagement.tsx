'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFacebook } from '@/contexts/FacebookContext';
import Header from '../shared/Header';
import AISettingsTab from './AISettingsTab';
import TrainingDocumentsTab from './TrainingDocumentsTab';
import '@/styles/chatbot/ChatbotManagement.css';

interface ChatbotManagementProps {
  onLogout?: () => void;
}

export default function ChatbotManagement({ onLogout }: ChatbotManagementProps) {
  const { user, token } = useAuth();
  const { pages } = useFacebook();
  const [activeTab, setActiveTab] = useState<'ai-settings' | 'training-documents'>('ai-settings');
  const [loading, setLoading] = useState(false);

  return (
    <div className="chatbot-management-container">
      <Header onLogout={onLogout} />
      
      <div className="chatbot-management-main">
        <div className="chatbot-management-content">
          <div className="chatbot-content-wrapper">
            {/* Header Section */}
            <div className="chatbot-management-header">
              <div className="breadcrumb">
                <span className="breadcrumb-item">Trang chủ</span>
                <span className="breadcrumb-separator">/</span>
                <span className="breadcrumb-item active">Chatbot</span>
              </div>
              
              <h1 className="chatbot-page-title">Quản lý Chatbot AI</h1>
              
              <p className="chatbot-page-description">
                Cấu hình AI chatbot và quản lý tài liệu huấn luyện để cải thiện khả năng trả lời tự động
              </p>
            </div>

            {/* Tabs Navigation */}
            <div className="chatbot-tabs">
              <button
                className={`chatbot-tab ${activeTab === 'ai-settings' ? 'active' : ''}`}
                onClick={() => setActiveTab('ai-settings')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                Cài đặt AI
              </button>
              
              <button
                className={`chatbot-tab ${activeTab === 'training-documents' ? 'active' : ''}`}
                onClick={() => setActiveTab('training-documents')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                Tài liệu AI
              </button>
            </div>

            {/* Tab Content */}
            <div className="chatbot-tab-content">
              {activeTab === 'ai-settings' && (
                <AISettingsTab />
              )}
              
              {activeTab === 'training-documents' && (
                <TrainingDocumentsTab />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
