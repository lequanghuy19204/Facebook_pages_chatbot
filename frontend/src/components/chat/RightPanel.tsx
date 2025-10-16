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
    images?: string[];
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
  const [editingProductIndex, setEditingProductIndex] = useState<number | null>(null);
  const [newProduct, setNewProduct] = useState<{
    product_id: string;
    product_name: string;
    quantity: number;
    purchase_date: string;
    notes?: string;
    images?: string[];
  } | null>(null);

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

      const allowedFields = ['name', 'phone', 'address', 'height', 'weight', 'customer_notes', 'purchased_products'];
      const updateData: any = {};
      
      Object.keys(editedCustomer).forEach(key => {
        if (allowedFields.includes(key)) {
          const value = editedCustomer[key as keyof CustomerInfo];
          if (value !== null && value !== undefined && value !== '') {
            updateData[key] = value;
          }
        }
      });

      console.log('📤 Sending update data:', updateData);
      console.log('📝 Data types:', Object.keys(updateData).map(k => `${k}: ${typeof updateData[k]}`));

      await api.messaging.updateCustomer(token, customer.customer_id, updateData);
      setCustomer({ ...customer, ...editedCustomer });
      setEditMode(false);
      setEditingProductIndex(null);
      setNewProduct(null);
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

  // === PURCHASED PRODUCTS FUNCTIONS ===
  
  const handleAddProduct = () => {
    setNewProduct({
      product_id: `prod_${Date.now()}`,
      product_name: '',
      quantity: 1,
      purchase_date: new Date().toISOString().split('T')[0],
      notes: '',
      images: [],
    });
  };

  const handleSaveNewProduct = () => {
    if (!newProduct || !newProduct.product_name) {
      toast.error('Vui lòng nhập tên sản phẩm');
      return;
    }

    const currentProducts = editedCustomer.purchased_products || [];
    setEditedCustomer({
      ...editedCustomer,
      purchased_products: [...currentProducts, newProduct],
    });
    setNewProduct(null);
    toast.success('Đã thêm sản phẩm');
  };

  const handleCancelNewProduct = () => {
    setNewProduct(null);
  };

  const handleEditProduct = (index: number) => {
    setEditingProductIndex(index);
  };

  const handleSaveEditProduct = (index: number) => {
    setEditingProductIndex(null);
    toast.success('Đã cập nhật sản phẩm');
  };

  const handleCancelEditProduct = () => {
    setEditingProductIndex(null);
    // Reset về giá trị cũ
    setEditedCustomer(customer || {});
  };

  const handleDeleteProduct = (index: number) => {
    if (!confirm('Bạn có chắc muốn xóa sản phẩm này?')) return;
    
    const currentProducts = editedCustomer.purchased_products || [];
    const updatedProducts = currentProducts.filter((_, i) => i !== index);
    setEditedCustomer({
      ...editedCustomer,
      purchased_products: updatedProducts,
    });
    toast.success('Đã xóa sản phẩm');
  };

  const handleProductFieldChange = (index: number, field: string, value: any) => {
    const currentProducts = [...(editedCustomer.purchased_products || [])];
    currentProducts[index] = {
      ...currentProducts[index],
      [field]: value,
    };
    setEditedCustomer({
      ...editedCustomer,
      purchased_products: currentProducts,
    });
  };

  const handleNewProductFieldChange = (field: string, value: any) => {
    if (!newProduct) return;
    setNewProduct({
      ...newProduct,
      [field]: value,
    });
  };

  const handleAddProductImage = (index: number, imageUrl: string) => {
    if (!imageUrl.trim()) return;
    
    const currentProducts = [...(editedCustomer.purchased_products || [])];
    const currentImages = currentProducts[index].images || [];
    currentProducts[index] = {
      ...currentProducts[index],
      images: [...currentImages, imageUrl],
    };
    setEditedCustomer({
      ...editedCustomer,
      purchased_products: currentProducts,
    });
  };

  const handleRemoveProductImage = (productIndex: number, imageIndex: number) => {
    const currentProducts = [...(editedCustomer.purchased_products || [])];
    const currentImages = currentProducts[productIndex].images || [];
    currentProducts[productIndex] = {
      ...currentProducts[productIndex],
      images: currentImages.filter((_, i) => i !== imageIndex),
    };
    setEditedCustomer({
      ...editedCustomer,
      purchased_products: currentProducts,
    });
  };

  const handleAddNewProductImage = (imageUrl: string) => {
    if (!imageUrl.trim() || !newProduct) return;
    
    setNewProduct({
      ...newProduct,
      images: [...(newProduct.images || []), imageUrl],
    });
  };

  const handleRemoveNewProductImage = (imageIndex: number) => {
    if (!newProduct) return;
    
    setNewProduct({
      ...newProduct,
      images: (newProduct.images || []).filter((_, i) => i !== imageIndex),
    });
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
                          value={editedCustomer.height ?? ''}
                          onChange={(e) => {
                            const value = e.target.value.trim();
                            handleInputChange('height', value ? Number(value) : null);
                          }}
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
                          value={editedCustomer.weight ?? ''}
                          onChange={(e) => {
                            const value = e.target.value.trim();
                            handleInputChange('weight', value ? Number(value) : null);
                          }}
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
                  {editMode && (
                    <button 
                      className="add-product-btn"
                      onClick={handleAddProduct}
                      style={{
                        width: '100%',
                        padding: '10px',
                        marginBottom: '10px',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      + Thêm sản phẩm
                    </button>
                  )}

                  {/* New Product Form */}
                  {newProduct && (
                    <div className="purchased-product-item" style={{ border: '2px solid #4CAF50', marginBottom: '10px' }}>
                      <div style={{ padding: '10px' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#4CAF50' }}>Thêm sản phẩm mới</h4>
                        
                        <div style={{ marginBottom: '8px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Tên sản phẩm *</label>
                          <input
                            type="text"
                            value={newProduct.product_name}
                            onChange={(e) => handleNewProductFieldChange('product_name', e.target.value)}
                            placeholder="VD: Áo thun nam"
                            style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #ddd', borderRadius: '4px' }}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Số lượng</label>
                            <input
                              type="number"
                              min="1"
                              value={newProduct.quantity}
                              onChange={(e) => handleNewProductFieldChange('quantity', parseInt(e.target.value) || 1)}
                              style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #ddd', borderRadius: '4px' }}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Ngày mua</label>
                            <input
                              type="date"
                              value={newProduct.purchase_date}
                              onChange={(e) => handleNewProductFieldChange('purchase_date', e.target.value)}
                              style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #ddd', borderRadius: '4px' }}
                            />
                          </div>
                        </div>

                        <div style={{ marginBottom: '8px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Ghi chú</label>
                          <textarea
                            value={newProduct.notes || ''}
                            onChange={(e) => handleNewProductFieldChange('notes', e.target.value)}
                            placeholder="VD: Size M, màu đen"
                            rows={2}
                            style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #ddd', borderRadius: '4px' }}
                          />
                        </div>

                        <div style={{ marginBottom: '8px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Ảnh sản phẩm</label>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <input
                              type="text"
                              placeholder="Nhập URL ảnh"
                              id="new-product-image-url"
                              style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                            />
                            <button
                              onClick={() => {
                                const input = document.getElementById('new-product-image-url') as HTMLInputElement;
                                handleAddNewProductImage(input.value);
                                input.value = '';
                              }}
                              style={{ padding: '8px 16px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                              Thêm
                            </button>
                          </div>
                          {newProduct.images && newProduct.images.length > 0 && (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                              {newProduct.images.map((img, imgIdx) => (
                                <div key={imgIdx} style={{ position: 'relative', width: '80px', height: '80px' }}>
                                  <img src={img} alt={`Product ${imgIdx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
                                  <button
                                    onClick={() => handleRemoveNewProductImage(imgIdx)}
                                    style={{ position: 'absolute', top: '-5px', right: '-5px', backgroundColor: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '12px' }}
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                          <button
                            onClick={handleSaveNewProduct}
                            style={{ flex: 1, padding: '8px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            Lưu
                          </button>
                          <button
                            onClick={handleCancelNewProduct}
                            style={{ flex: 1, padding: '8px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            Hủy
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Existing Products List */}
                  {(editedCustomer.purchased_products || customer.purchased_products || []).length > 0 ? (
                    <div className="purchased-products-list">
                      {(editedCustomer.purchased_products || customer.purchased_products || []).map((product, index) => (
                        <div key={index} className="purchased-product-item" style={{ position: 'relative' }}>
                          {editingProductIndex === index ? (
                            // Edit Mode
                            <div style={{ padding: '10px' }}>
                              <h4 style={{ margin: '0 0 10px 0', color: '#2196F3' }}>Chỉnh sửa sản phẩm</h4>
                              
                              <div style={{ marginBottom: '8px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Tên sản phẩm</label>
                                <input
                                  type="text"
                                  value={product.product_name}
                                  onChange={(e) => handleProductFieldChange(index, 'product_name', e.target.value)}
                                  style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #ddd', borderRadius: '4px' }}
                                />
                              </div>

                              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                <div style={{ flex: 1 }}>
                                  <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Số lượng</label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={product.quantity}
                                    onChange={(e) => handleProductFieldChange(index, 'quantity', parseInt(e.target.value) || 1)}
                                    style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #ddd', borderRadius: '4px' }}
                                  />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Ngày mua</label>
                                  <input
                                    type="date"
                                    value={product.purchase_date}
                                    onChange={(e) => handleProductFieldChange(index, 'purchase_date', e.target.value)}
                                    style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #ddd', borderRadius: '4px' }}
                                  />
                                </div>
                              </div>

                              <div style={{ marginBottom: '8px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Ghi chú</label>
                                <textarea
                                  value={product.notes || ''}
                                  onChange={(e) => handleProductFieldChange(index, 'notes', e.target.value)}
                                  rows={2}
                                  style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #ddd', borderRadius: '4px' }}
                                />
                              </div>

                              <div style={{ marginBottom: '8px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Ảnh sản phẩm</label>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                  <input
                                    type="text"
                                    placeholder="Nhập URL ảnh"
                                    id={`product-image-url-${index}`}
                                    style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                                  />
                                  <button
                                    onClick={() => {
                                      const input = document.getElementById(`product-image-url-${index}`) as HTMLInputElement;
                                      handleAddProductImage(index, input.value);
                                      input.value = '';
                                    }}
                                    style={{ padding: '8px 16px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                  >
                                    Thêm
                                  </button>
                                </div>
                                {product.images && product.images.length > 0 && (
                                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                                    {product.images.map((img, imgIdx) => (
                                      <div key={imgIdx} style={{ position: 'relative', width: '80px', height: '80px' }}>
                                        <img src={img} alt={`Product ${imgIdx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
                                        <button
                                          onClick={() => handleRemoveProductImage(index, imgIdx)}
                                          style={{ position: 'absolute', top: '-5px', right: '-5px', backgroundColor: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '12px' }}
                                        >
                                          ×
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                <button
                                  onClick={() => handleSaveEditProduct(index)}
                                  style={{ flex: 1, padding: '8px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                  Lưu
                                </button>
                                <button
                                  onClick={handleCancelEditProduct}
                                  style={{ flex: 1, padding: '8px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                  Hủy
                                </button>
                              </div>
                            </div>
                          ) : (
                            // View Mode
                            <>
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
                              {product.images && product.images.length > 0 && (
                                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                                  {product.images.map((img, imgIdx) => (
                                    <img 
                                      key={imgIdx} 
                                      src={img} 
                                      alt={`${product.product_name} ${imgIdx + 1}`} 
                                      style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer' }}
                                      onClick={() => window.open(img, '_blank')}
                                      title="Click để xem ảnh đầy đủ"
                                    />
                                  ))}
                                </div>
                              )}
                              {editMode && (
                                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                  <button
                                    onClick={() => handleEditProduct(index)}
                                    style={{ flex: 1, padding: '6px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                                  >
                                    Sửa
                                  </button>
                                  <button
                                    onClick={() => handleDeleteProduct(index)}
                                    style={{ flex: 1, padding: '6px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                                  >
                                    Xóa
                                  </button>
                                </div>
                              )}
                            </>
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
