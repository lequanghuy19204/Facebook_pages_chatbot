'use client';

import React, { useState } from 'react';
import '@/styles/chat/RightPanel.css';

interface RightPanelProps {
  conversationId: string | null;
}

export default function RightPanel({ conversationId }: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'order'>('info');
  const [note, setNote] = useState('');

  if (!conversationId) {
    return null;
  }

  return (
    <div className="right-panel-container">
      {/* Tab Headers */}
      <div className="right-panel-tabs">
        <div
          className={`right-panel-tab-item ${activeTab === 'info' ? 'right-panel-active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          Thông tin
        </div>
        <div
          className={`right-panel-tab-item ${activeTab === 'order' ? 'right-panel-active' : ''}`}
          onClick={() => setActiveTab('order')}
        >
          Tạo đơn
        </div>
      </div>

      {/* Tab Content */}
      <div className="right-panel-content">
        {activeTab === 'info' && (
          <>
            {/* Notes Section */}
            <div className="right-panel-notes-section">
              <div className="right-panel-notes-empty">
                <div className="right-panel-notes-empty-icon">
                  <svg width="81" height="86" viewBox="0 0 81 86" fill="none">
                    <path d="M12.33 1.35C12.33 1.35 80.36 85.60 80.36 85.60" stroke="#E0E0E0" strokeWidth="2"/>
                    <circle cx="40" cy="40" r="30" fill="#F5F5F5"/>
                  </svg>
                </div>
                <p className="right-panel-notes-empty-text">Bạn chưa có ghi chú nào</p>
              </div>

              <div className="right-panel-notes-input-container">
                <div className="right-panel-notes-input-wrapper">
                  <input
                    type="text"
                    className="right-panel-notes-input"
                    placeholder="Nhập ghi chú (Enter để gửi)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && note.trim()) {
                        console.log('Adding note:', note);
                        setNote('');
                      }
                    }}
                  />
                </div>
                <button className="right-panel-notes-send-button">
                  <img src="/assets/926ec6e2-aae2-4a0a-a83d-f98ebbfbc699.png" alt="send" />
                </button>
              </div>
            </div>

            {/* Divider with Label */}
            <div className="right-panel-section-divider">
              <div className="right-panel-divider-line"></div>
              <div className="right-panel-divider-label">Đơn hàng</div>
              <div className="right-panel-divider-line"></div>
            </div>

            {/* Orders Section */}
            <div className="right-panel-orders-section">
              <div className="right-panel-orders-empty">
                <div className="right-panel-orders-empty-icon">
                  <img src="/assets/e2f7a445-b7e1-4361-addd-5ff9791acec7.png" alt="no orders" />
                </div>
                <p className="right-panel-orders-empty-text">Chưa có lịch sử đơn hàng</p>
                <button className="right-panel-create-order-button">
                  <img src="/assets/5ba6960d-f313-4787-a728-735b292ed69a.png" alt="plus" />
                  <span>Tạo đơn</span>
                </button>
              </div>

              {/* Ad Tag */}
              <div className="right-panel-ad-tag--container">
                <div className="right-panel-ad-tag-">
                  Ad 120212123260400613
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'order' && (
          <div className="right-panel-order-form">
            <p>Form tạo đơn hàng sẽ được thêm vào đây</p>
          </div>
        )}
      </div>
    </div>
  );
}
