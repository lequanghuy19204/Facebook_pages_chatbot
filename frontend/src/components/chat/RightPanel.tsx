'use client';

import React, { useState } from 'react';
import '@/styles/chat/RightPanel.css';

interface Order {
  id: string;
  productName: string;
  quantity: number;
  price: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  createdAt: string;
}

interface RightPanelProps {
  conversationId: string | null;
}

// Mock data
const mockOrders: Order[] = [];

export default function RightPanel({ conversationId }: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'order'>('info');
  const [note, setNote] = useState<string>('');
  const [notes, setNotes] = useState<string[]>([]);

  const handleAddNote = () => {
    if (note.trim()) {
      setNotes([...notes, note.trim()]);
      setNote('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddNote();
    }
  };

  const handleCreateOrder = () => {
    // TODO: Implement create order logic
    console.log('Creating order for conversation:', conversationId);
  };

  if (!conversationId) {
    return (
      <div className="right-panel-component">
        <div className="right-panel-empty-state">
          <p>Chọn một cuộc hội thoại để xem thông tin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="right-panel-component">
      {/* Tab Header */}
      <div className="right-panel-tabs">
        <button
          className={`right-panel-tab-button ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          Thông tin
        </button>
        <button
          className={`right-panel-tab-button ${activeTab === 'order' ? 'active' : ''}`}
          onClick={() => setActiveTab('order')}
        >
          Tạo đơn
        </button>
      </div>

      {/* Tab Content */}
      <div className="right-panel-content">
        {activeTab === 'info' && (
          <div className="right-panel-info-tab">
            {/* Notes Section */}
            <div className="right-panel-notes">
              <div className="right-panel-notes-header">
                <div className="right-panel-notes-icon">
                  📝
                </div>
                <div className="right-panel-notes-empty-text">
                  {notes.length === 0 ? 'Bạn chưa có ghi chú nào' : `${notes.length} ghi chú`}
                </div>
              </div>

              {/* Existing Notes */}
              {notes.length > 0 && (
                <div className="right-panel-notes-list">
                  {notes.map((noteText, index) => (
                    <div key={index} className="right-panel-note-item">
                      <p>{noteText}</p>
                      <button
                        className="right-panel-note-delete"
                        onClick={() => setNotes(notes.filter((_, i) => i !== index))}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Note Input */}
              <div className="right-panel-note-input-container">
                <div className="right-panel-note-input-wrapper">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Nhập ghi chú (Enter để gửi)"
                    className="right-panel-note-input"
                    rows={2}
                  />
                  <button
                    className="right-panel-note-send"
                    onClick={handleAddNote}
                    disabled={!note.trim()}
                  >
                    📤
                  </button>
                </div>
              </div>
            </div>

            {/* Orders Section */}
            <div className="right-panel-orders">
              <div className="right-panel-divider">
                <div className="right-panel-divider-line"></div>
                <div className="right-panel-divider-text">Đơn hàng</div>
                <div className="right-panel-divider-line"></div>
              </div>

              {mockOrders.length === 0 ? (
                <div className="right-panel-orders-empty">
                  <div className="right-panel-empty-icon">📦</div>
                  <p className="right-panel-empty-text">Chưa có lịch sử đơn hàng</p>
                  <button 
                    className="right-panel-create-order"
                    onClick={handleCreateOrder}
                  >
                    <span className="right-panel-button-icon">➕</span>
                    <span className="right-panel-button-text">Tạo đơn</span>
                  </button>
                </div>
              ) : (
                <div className="right-panel-orders-list">
                  {mockOrders.map((order) => (
                    <div key={order.id} className="right-panel-order-item">
                      <div className="right-panel-order-header">
                        <span className="right-panel-order-id">#{order.id}</span>
                        <span className={`right-panel-order-status ${order.status}`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="right-panel-order-details">
                        <p className="right-panel-product-name">{order.productName}</p>
                        <p className="right-panel-order-info">
                          Số lượng: {order.quantity} | Giá: {order.price.toLocaleString('vi-VN')}₫
                        </p>
                        <p className="right-panel-order-date">
                          {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ad ID Tag */}
            <div className="right-panel-ad-tag">
              <div className="right-panel-ad-text">
                Ad 120230607789120778
              </div>
            </div>
          </div>
        )}

        {activeTab === 'order' && (
          <div className="right-panel-order-tab">
            <div className="right-panel-order-form">
              <div className="right-panel-form-icon">📋</div>
              <p>Form tạo đơn hàng sẽ được implement ở đây</p>
              <button 
                className="right-panel-form-button"
                onClick={handleCreateOrder}
              >
                Tạo đơn hàng mới
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
