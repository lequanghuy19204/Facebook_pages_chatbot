'use client';

import React, { useState, useEffect } from 'react';
import '@/styles/chat/RightPanel.css';
import api from '@/services/api';
import { toast } from 'react-toastify';

interface RightPanelProps {
  conversationId: string | null;
}

interface CustomerInfo {
  customer_id: string;
  name: string;
  phone?: string;
  address?: string;
  height?: number;
  weight?: number;
  purchased_products?: {
    product_id: string;
    product_name: string;
    quantity: number;
    purchase_date: string;
    notes?: string;
  }[];
  customer_notes?: string;
}

interface ConversationInfo {
  conversation_id: string;
  customer_id: string;
  customer_name: string;
}

export default function RightPanel({ conversationId }: RightPanelProps) {
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedCustomer, setEditedCustomer] = useState<Partial<CustomerInfo>>({});

  useEffect(() => {
    if (conversationId) {
      fetchCustomerInfo();
    } else {
      setCustomer(null);
    }
  }, [conversationId]);

  const fetchCustomerInfo = async () => {
    if (!conversationId) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token');
      }

      const convResponse = await api.messaging.getConversation(token, conversationId);
      const conversation: ConversationInfo = convResponse;
      
      const customerResponse = await api.messaging.getCustomer(token, conversation.customer_id);
      setCustomer(customerResponse);
      setEditedCustomer(customerResponse);
    } catch (error) {
      console.error('Failed to fetch customer info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Đã copy ${label}`, { autoClose: 2000 });
  };

  const handleEdit = () => {
    setEditMode(true);
    setEditedCustomer(customer || {});
  };

  const handleCancel = () => {
    setEditMode(false);
    setEditedCustomer(customer || {});
  };

  const handleSave = async () => {
    if (!customer) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token');
      }

      await api.messaging.updateCustomer(token, customer.customer_id, editedCustomer);
      setCustomer({ ...customer, ...editedCustomer });
      setEditMode(false);
      toast.success('Đã cập nhật thông tin khách hàng');
    } catch (error) {
      console.error('Failed to update customer:', error);
      toast.error('Lỗi khi cập nhật thông tin');
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setEditedCustomer(prev => ({ ...prev, [field]: value }));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };

  if (!conversationId) {
    return null;
  }

  return (
    <div className="right-panel-container">
      <div className="right-panel-header">
        <h2 className="right-panel-title">Thông tin khách hàng</h2>
      </div>

      <div className="right-panel-content">
        {loading ? (
          <div className="right-panel-loading">Đang tải...</div>
        ) : customer ? (
          <>
                <div className="customer-info-section">
                  <div className="customer-info-header">
                    {!editMode ? (
                      <button className="customer-info-edit-btn" onClick={handleEdit}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Chỉnh sửa
                      </button>
                    ) : (
                      <div className="customer-info-actions">
                        <button className="customer-info-cancel-btn" onClick={handleCancel}>
                          Hủy
                        </button>
                        <button className="customer-info-save-btn" onClick={handleSave}>
                          Lưu
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="customer-info-item">
                    <label className="customer-info-label">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                      Số điện thoại
                    </label>
                    <div className="customer-info-value-group">
                      {!editMode ? (
                        <>
                          <span className="customer-info-value">{customer.phone || 'Chưa có'}</span>
                          {customer.phone && (
                            <button 
                              className="customer-info-copy-btn"
                              onClick={() => handleCopy(customer.phone!, 'số điện thoại')}
                              title="Copy số điện thoại"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                              </svg>
                            </button>
                          )}
                        </>
                      ) : (
                        <input
                          type="text"
                          className="customer-info-input"
                          value={editedCustomer.phone || ''}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          placeholder="Nhập số điện thoại"
                        />
                      )}
                    </div>
                  </div>

                  <div className="customer-info-item">
                    <label className="customer-info-label">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                      Địa chỉ
                    </label>
                    <div className="customer-info-value-group">
                      {!editMode ? (
                        <>
                          <span className="customer-info-value">{customer.address || 'Chưa có'}</span>
                          {customer.address && (
                            <button 
                              className="customer-info-copy-btn"
                              onClick={() => handleCopy(customer.address!, 'địa chỉ')}
                              title="Copy địa chỉ"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                              </svg>
                            </button>
                          )}
                        </>
                      ) : (
                        <textarea
                          className="customer-info-textarea"
                          value={editedCustomer.address || ''}
                          onChange={(e) => handleInputChange('address', e.target.value)}
                          placeholder="Nhập địa chỉ"
                          rows={2}
                        />
                      )}
                    </div>
                  </div>

                  <div className="customer-info-row">
                    <div className="customer-info-item customer-info-item-half">
                      <label className="customer-info-label">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 20v-6M6 20V10M18 20V4"/>
                        </svg>
                        Chiều cao
                      </label>
                      {!editMode ? (
                        <span className="customer-info-value">{customer.height ? `${customer.height} cm` : 'Chưa có'}</span>
                      ) : (
                        <input
                          type="number"
                          className="customer-info-input"
                          value={editedCustomer.height || ''}
                          onChange={(e) => handleInputChange('height', e.target.value ? Number(e.target.value) : undefined)}
                          placeholder="cm"
                        />
                      )}
                    </div>

                    <div className="customer-info-item customer-info-item-half">
                      <label className="customer-info-label">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                        </svg>
                        Cân nặng
                      </label>
                      {!editMode ? (
                        <span className="customer-info-value">{customer.weight ? `${customer.weight} kg` : 'Chưa có'}</span>
                      ) : (
                        <input
                          type="number"
                          className="customer-info-input"
                          value={editedCustomer.weight || ''}
                          onChange={(e) => handleInputChange('weight', e.target.value ? Number(e.target.value) : undefined)}
                          placeholder="kg"
                        />
                      )}
                    </div>
                  </div>

                  <div className="customer-info-item">
                    <label className="customer-info-label">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      Ghi chú
                    </label>
                    {!editMode ? (
                      <span className="customer-info-value customer-info-notes">{customer.customer_notes || 'Chưa có ghi chú'}</span>
                    ) : (
                      <textarea
                        className="customer-info-textarea"
                        value={editedCustomer.customer_notes || ''}
                        onChange={(e) => handleInputChange('customer_notes', e.target.value)}
                        placeholder="Nhập ghi chú về khách hàng"
                        rows={3}
                      />
                    )}
                  </div>
                </div>

                <div className="right-panel-section-divider">
                  <div className="right-panel-divider-line"></div>
                  <div className="right-panel-divider-label">Sản phẩm đã mua</div>
                  <div className="right-panel-divider-line"></div>
                </div>

                <div className="purchased-products-section">
                  {customer.purchased_products && customer.purchased_products.length > 0 ? (
                    <div className="purchased-products-list">
                      {customer.purchased_products.map((product, index) => (
                        <div key={index} className="purchased-product-item">
                          <div className="purchased-product-header">
                            <span className="purchased-product-name">{product.product_name}</span>
                            <span className="purchased-product-quantity">x{product.quantity}</span>
                          </div>
                          <div className="purchased-product-meta">
                            <span className="purchased-product-date">{formatDate(product.purchase_date)}</span>
                          </div>
                          {product.notes && (
                            <div className="purchased-product-notes">{product.notes}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="purchased-products-empty">
                      <p>Chưa có lịch sử mua hàng</p>
                    </div>
                  )}
                </div>

              </>
        ) : (
          <div className="right-panel-no-data">
            <p>Chọn một cuộc hội thoại để xem thông tin khách hàng</p>
          </div>
        )}
      </div>
    </div>
  );
}
