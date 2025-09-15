'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Product } from '@/services/api';
import Viewer from 'viewerjs';
import 'viewerjs/dist/viewer.css';

interface ProductTableProps {
  products: Product[];
  loading: boolean;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onRefresh?: () => void;
}

export default function ProductTable({
  products,
  loading,
  onEdit,
  onDelete,
  onRefresh
}: ProductTableProps) {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [viewerInstance, setViewerInstance] = useState<Viewer | null>(null);
  const galleryRef = useRef<HTMLDivElement>(null);

  const formatCurrency = (amount: number, currency: string = 'VND') => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products.map(p => p.product_id));
    }
  };

  const handleSelectProduct = (productId: string) => {
    if (selectedProducts.includes(productId)) {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
    } else {
      setSelectedProducts([...selectedProducts, productId]);
    }
  };

  const handleDeleteConfirm = (productId: string) => {
    const product = products.find(p => p.product_id === productId);
    if (window.confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${product?.name}"?`)) {
      onDelete(productId);
    }
  };

  const getProductImage = (product: Product) => {
    if (product.images && product.images.length > 0) {
      const primaryImage = product.images.sort((a, b) => a.display_order - b.display_order)[0];
      return primaryImage.cloudflare_url;
    }
    return null;
  };

  const getProductInitials = (name: string) => {
    return name.split(' ').map(word => word.charAt(0)).join('').substring(0, 2).toUpperCase();
  };
  
  
  useEffect(() => {
    if (galleryRef.current && products.length > 0) {
      
      if (viewerInstance) {
        viewerInstance.destroy();
      }
      
      
      const viewer = new Viewer(galleryRef.current, {
        inline: false,
        title: false,
        toolbar: {
          zoomIn: true,
          zoomOut: true,
          oneToOne: true,
          reset: true,
          prev: true,
          play: false,
          next: true,
          rotateLeft: true,
          rotateRight: true,
          flipHorizontal: true,
          flipVertical: true,
        },
        navbar: true,
        button: true,
        url: 'data-original',
        keyboard: true,
        backdrop: true,
        zoomRatio: 0.2,
        minZoomRatio: 0.1,
        maxZoomRatio: 10,
        zIndex: 2000,
        className: 'product-image-viewer-productTable'
      });
      
      setViewerInstance(viewer);
      
      return () => {
        if (viewer) {
          viewer.destroy();
        }
      };
    }
  }, [products]);
  
  
  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    e.stopPropagation();
  };

  if (loading) {
    return (
      <div className="products-table-section">
        <div className="table-header">
          <h3 className="table-title">Danh sách sản phẩm</h3>
        </div>
        <div className="products-loading-state">
          <div className="products-loading-spinner"></div>
          <span>Đang tải sản phẩm...</span>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="products-table-section">
        <div className="table-header">
          <h3 className="table-title">Danh sách sản phẩm</h3>
          <div className="table-actions">
            <button 
              className="refresh-btn"
              onClick={onRefresh}
              title="Làm mới"
            >
              🔄 Làm mới
            </button>
          </div>
        </div>
        <div className="products-empty-table">
          <div className="products-empty-icon">📦</div>
          <div className="products-empty-message">Chưa có sản phẩm nào</div>
        </div>
      </div>
    );
  }

  return (
    <div className="products-table-section">
      <div className="table-header">
        <h3 className="table-title">Danh sách sản phẩm ({products.length})</h3>
        <div className="table-actions">
          {selectedProducts.length > 0 && (
            <div className="bulk-actions">
              <span className="selected-count">Đã chọn: {selectedProducts.length}</span>
              <button 
                className="bulk-delete-btn"
                onClick={() => {
                  if (window.confirm(`Bạn có chắc chắn muốn xóa ${selectedProducts.length} sản phẩm đã chọn?`)) {
                    selectedProducts.forEach(id => onDelete(id));
                    setSelectedProducts([]);
                  }
                }}
              >
                🗑️ Xóa đã chọn
              </button>
            </div>
          )}
          <button 
            className="refresh-btn"
            onClick={onRefresh}
            title="Làm mới"
          >
            🔄 Làm mới
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="products-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectedProducts.length === products.length && products.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
              <th>Hình ảnh</th>
              <th>Mã SP</th>
              <th>Giá</th>
              <th>Màu sắc</th>
              <th>Thương hiệu</th>
              <th>Ghi chú</th>
              <th>Ngày tạo</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr 
                key={product.product_id}
                className={product.is_active ? 'active-row' : 'inactive-row'}
              >
                <td>
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(product.product_id)}
                    onChange={() => handleSelectProduct(product.product_id)}
                  />
                </td>
                <td className="product-images-cell">
                  <div className="product-images-container">
                    {product.images && product.images.length > 0 ? (
                      <div className="product-images-list">
                        <div ref={galleryRef} className="product-images-gallery">
                          {product.images.map((image) => (
                            <div key={image.image_id} className="product-image-thumbnail">
                              <img 
                                src={`https://pub-29571d63ff4741baa4c864245169a1ba.r2.dev/${image.cloudflare_key}`}
                                data-original={`https://pub-29571d63ff4741baa4c864245169a1ba.r2.dev/${image.cloudflare_key}`}
                                alt={image.alt_text || product.name}
                                className="product-thumbnail"
                                title={image.alt_text || product.name}
                                onClick={handleImageClick}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zNSA2NUw1MCA0NUw2NSA2NUgzNVoiIGZpbGw9IiM5Q0EzQUYiLz4KPGNpcmNsZSBjeD0iNDAiIGN5PSIzNSIgcj0iNSIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K';
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="no-product-images">Không có ảnh</div>
                    )}
                  </div>
                </td>
                <td className="code-cell">
                  <span className="product-code">{product.code}</span>
                </td>
                <td className="price-cell">
                  <span className="product-price">
                    {formatCurrency(product.price, product.currency)}
                  </span>
                </td>
                <td className="colors-cell">
                  {product.colors && product.colors.length > 0 ? (
                    <div className="colors-list">
                      {product.colors.map((color, index) => (
                        <span key={index} className="color-badge">{color}</span>
                      ))}
                    </div>
                  ) : (
                    <span className="no-colors">Chưa có</span>
                  )}
                </td>
                <td className="brand-cell">
                  {product.brand ? (
                    <span className="brand-badge">{product.brand}</span>
                  ) : (
                    <span className="no-brand">Chưa có</span>
                  )}
                </td>
                <td className="notes-cell">
                  {product.notes ? (
                    <div className="product-notes" title={product.notes}>
                      {product.notes.substring(0, 50)}
                      {product.notes.length > 50 ? '...' : ''}
                    </div>
                  ) : (
                    <span className="no-notes">Không có ghi chú</span>
                  )}
                </td>
                <td className="creator-cell">
                  <div className="creator-info">
                    <div className="creator-date">{formatDate(product.created_at)}</div>
                  </div>
                </td>
                <td className="actions-cell">
                  <div className="action-buttons">
                    <button
                      className="edit-btn"
                      onClick={() => onEdit(product)}
                      title="Chỉnh sửa"
                    >
                      ✏️
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteConfirm(product.product_id)}
                      title="Xóa"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
