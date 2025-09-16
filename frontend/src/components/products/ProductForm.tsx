'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Product, CreateProductDto, UpdateProductDto, ProductImage } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import ApiService from '@/services/api';
import '@/styles/products/ProductForm.css';

interface ProductFormProps {
  product?: Product | null; 
  onSubmit: (data: CreateProductDto | UpdateProductDto) => Promise<void>;
  onCancel: () => void;
  brands?: string[];
  loading?: boolean;
  onProductCreated?: () => void; 
}

export default function ProductForm({
  product = null,
  onSubmit,
  onCancel,
  brands = [],
  loading = false,
  onProductCreated
}: ProductFormProps) {
  const { token } = useAuth();
  const [formData, setFormData] = useState<CreateProductDto | UpdateProductDto>({
    name: '',
    code: '',
    price: 0,
    currency: 'VND',
    colors: [],
    brand: '',
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [colorsInput, setColorsInput] = useState('');
  const [images, setImages] = useState<ProductImage[]>([]);
  const [tempImages, setTempImages] = useState<File[]>([]);
  const [imageUploading, setImageUploading] = useState(false);
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [editingAltText, setEditingAltText] = useState('');
  const [tempImagePreviews, setTempImagePreviews] = useState<{file: File, preview: string}[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  
  useEffect(() => {
    if (product) {
      
      setFormData({
        name: product.name,
        code: product.code,
        price: product.price,
        currency: product.currency,
        colors: product.colors || [],
        brand: product.brand || '',
        notes: product.notes || ''
      });
      setColorsInput(product.colors?.join(', ') || '');
      setImages(product.images || []);
      setTempImages([]);
      setTempImagePreviews([]);
    } else {
      
      setFormData({
        name: '',
        code: '',
        price: 0,
        currency: 'VND',
        colors: [],
        brand: '',
        notes: ''
      });
      setColorsInput('');
      setImages([]);
      setTempImages([]);
      setTempImagePreviews([]);
    }
    setErrors({});
    
    
    setTimeout(() => {
      firstInputRef.current?.focus();
    }, 100);
  }, [product]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    
    if (name === 'price') {
      const numValue = parseFloat(value) || 0;
      setFormData(prev => ({ ...prev, [name]: numValue }));
    } else if (name === 'colors') {
      
      setColorsInput(value);
      const colorsArray = value.split(',').map(color => color.trim()).filter(color => color.length > 0);
      setFormData(prev => ({ ...prev, colors: colorsArray }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Tên sản phẩm là bắt buộc';
    }

    if (!formData.code?.trim()) {
      newErrors.code = 'Mã sản phẩm là bắt buộc';
    }

    if (!formData.price || formData.price <= 0) {
      newErrors.price = 'Giá phải lớn hơn 0';
    }

    if (!formData.colors || formData.colors.length === 0) {
      newErrors.colors = 'Ít nhất một màu sắc là bắt buộc';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      
      
      if (!product && tempImages.length > 0) {
        
        await onSubmit(formData);
        
        
        
        
        const newProduct = await ApiService.products.getProducts(token as string, {
          search: formData.code as string,
          limit: 1
        }).then(res => res.products[0]);
        
        
        if (newProduct && newProduct.product_id && token) {
          setImageUploading(true);
          
          for (let i = 0; i < tempImages.length; i++) {
            try {
              const file = tempImages[i];
              
              
              const uploadResult = await ApiService.products.uploadImage(
                token, 
                file, 
                `products/${newProduct.product_id}`
              );
              
              
              const imageData = {
                cloudflare_url: uploadResult.publicUrl,
                cloudflare_key: uploadResult.key,
                display_order: i + 1,
                alt_text: file.name
              };
              
              await ApiService.products.addProductImage(
                token,
                newProduct.product_id,
                imageData
              );
            } catch (error: any) {
              console.error('Error uploading image:', error);
              
            }
          }
          
          setImageUploading(false);
        }
        
        
        
        if (newProduct && newProduct.product_id && token) {
          
          if (onProductCreated) {
            onProductCreated();
          }
        }
      } else {
        
        await onSubmit(formData);
      }
    } catch (error: any) {
      console.error('Submit error:', error);
      
      if (error.message.includes('code')) {
        setErrors({ code: 'Mã sản phẩm đã tồn tại' });
      } else {
        setErrors({ general: error.message || 'Có lỗi xảy ra' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const maxImages = 10;
    const totalImagesCount = product 
      ? images.length 
      : tempImages.length;
    
    
    if (product) {
      for (let i = 0; i < files.length; i++) {
        if (totalImagesCount + i >= maxImages) {
          alert(`Chỉ có thể tải lên tối đa ${maxImages} ảnh`);
          break;
        }
        
        const file = files[i];
        
        
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
          alert(`File ${file.name} không phải là định dạng hình ảnh hợp lệ`);
          continue;
        }

        
        if (file.size > 5 * 1024 * 1024) {
          alert(`File ${file.name} có kích thước quá lớn (tối đa 5MB)`);
          continue;
        }

        try {
          await handleImageUpload(file, images.length + i + 1);
        } catch (error: any) {
          alert(`Lỗi upload ${file.name}: ${error.message}`);
        }
      }
    } 
    
    else {
      for (let i = 0; i < files.length; i++) {
        if (totalImagesCount + i >= maxImages) {
          alert(`Chỉ có thể tải lên tối đa ${maxImages} ảnh`);
          break;
        }
        
        const file = files[i];
        
        
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
          alert(`File ${file.name} không phải là định dạng hình ảnh hợp lệ`);
          continue;
        }

        
        if (file.size > 5 * 1024 * 1024) {
          alert(`File ${file.name} có kích thước quá lớn (tối đa 5MB)`);
          continue;
        }

        
        setTempImages(prev => [...prev, file]);
        
        
        const reader = new FileReader();
        reader.onload = (e) => {
          const preview = e.target?.result as string;
          setTempImagePreviews(prev => [
            ...prev, 
            { file, preview }
          ]);
        };
        reader.readAsDataURL(file);
      }
    }

    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageUpload = async (file: File, displayOrder: number, altText?: string) => {
    if (!token || !product) return;
    
    try {
      setImageUploading(true);
      
      
      const uploadResult = await ApiService.products.uploadImage(
        token, 
        file, 
        `products/${product.product_id}`
      );
      
      
      const imageData = {
        cloudflare_url: uploadResult.publicUrl,
        cloudflare_key: uploadResult.key,
        display_order: displayOrder,
        alt_text: altText || file.name
      };
      
      const updatedProduct = await ApiService.products.addProductImage(
        token,
        product.product_id,
        imageData
      );
      
      setImages(updatedProduct.images);
    } catch (error: any) {
      console.error('Error uploading image:', error);
      throw error;
    } finally {
      setImageUploading(false);
    }
  };

  const handleUpdateImage = async (imageId: string, displayOrder: number, altText?: string) => {
    if (!token || !product) return;
    
    try {
      setImageUploading(true);
      
      const updatedProduct = await ApiService.products.updateProductImage(
        token,
        product.product_id,
        imageId,
        { display_order: displayOrder, alt_text: altText }
      );
      
      setImages(updatedProduct.images);
    } catch (error: any) {
      console.error('Error updating image:', error);
      throw error;
    } finally {
      setImageUploading(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!token || !product) return;
    
    if (!window.confirm('Bạn có chắc chắn muốn xóa ảnh này?')) {
      return;
    }
    
    try {
      setImageUploading(true);
      
      const updatedProduct = await ApiService.products.deleteProductImage(
        token,
        product.product_id,
        imageId
      );
      
      setImages(updatedProduct.images);
    } catch (error: any) {
      console.error('Error deleting image:', error);
      alert(`Lỗi khi xóa ảnh: ${error.message}`);
    } finally {
      setImageUploading(false);
    }
  };

  
  const handleDragStart = (e: React.DragEvent, imageId: string) => {
    setDraggedImageId(imageId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetImageId: string) => {
    e.preventDefault();
    
    if (!draggedImageId || draggedImageId === targetImageId) {
      setDraggedImageId(null);
      return;
    }

    const draggedImage = images.find(img => img.image_id === draggedImageId);
    const targetImage = images.find(img => img.image_id === targetImageId);

    if (!draggedImage || !targetImage) {
      setDraggedImageId(null);
      return;
    }

    try {
      
      await handleUpdateImage(draggedImageId, targetImage.display_order);
      await handleUpdateImage(targetImageId, draggedImage.display_order);
    } catch (error: any) {
      alert(`Lỗi khi sắp xếp ảnh: ${error.message}`);
    }

    setDraggedImageId(null);
  };

  const handleEditAltText = (image: ProductImage) => {
    setEditingImage(image.image_id);
    setEditingAltText(image.alt_text || '');
  };

  const handleSaveAltText = async (imageId: string) => {
    try {
      await handleUpdateImage(imageId, 
        images.find(img => img.image_id === imageId)?.display_order || 1,
        editingAltText
      );
      setEditingImage(null);
      setEditingAltText('');
    } catch (error: any) {
      alert(`Lỗi khi cập nhật mô tả ảnh: ${error.message}`);
    }
  };

  const handleCancelEdit = () => {
    setEditingImage(null);
    setEditingAltText('');
  };
  
  
  const handleRemoveTempImage = (index: number) => {
    setTempImages(prev => prev.filter((_, i) => i !== index));
    setTempImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const sortedImages = [...images].sort((a, b) => a.display_order - b.display_order);
  
  

  return (
    <div className="product-form-container">
      <div className="product-form-header">
        <h2 className="form-title">{product ? '✏️ Chỉnh sửa sản phẩm' : '➕ Thêm sản phẩm mới'}</h2>
        <button
          className="modal-close-btn-productform"
          onClick={onCancel}
          aria-label="Đóng modal"
          disabled={isSubmitting}
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="product-form">
        {errors.general && (
          <div className="error-message general-error">
            {errors.general}
          </div>
        )}

        <div className="form-grid">
          {/* Product Name */}
          <div className="form-group-productform">
            <label htmlFor="name" className="form-label-productform">
              Tên sản phẩm <span className="required-productform">*</span>
            </label>
            <input
              ref={firstInputRef}
              type="text"
              id="name"
              name="name"
              value={formData.name || ''}
              onChange={handleInputChange}
              className={`form-control-productform ${errors.name ? 'error' : ''}`}
              placeholder="Nhập tên sản phẩm"
              disabled={isSubmitting}
              required
            />
            {errors.name && <div className="field-error-productform">{errors.name}</div>}
          </div>

          {/* Product Code */}
          <div className="form-group-productform">
            <label htmlFor="code" className="form-label-productform">
              Mã sản phẩm <span className="required-productform">*</span>
            </label>
            <input
              type="text"
              id="code"
              name="code"
              value={formData.code || ''}
              onChange={handleInputChange}
              className={`form-control-productform ${errors.code ? 'error' : ''}`}
              placeholder="Nhập mã sản phẩm (VD: SP001)"
              disabled={isSubmitting || (product !== null)}
              required
            />
            {errors.code && <div className="field-error-productform">{errors.code}</div>}
          </div>

          {/* Price */}
          <div className="form-group-productform">
            <label htmlFor="price" className="form-label-productform">
              Giá <span className="required-productform">*</span>
            </label>
            <input
              type="number"
              id="price"
              name="price"
              value={formData.price || ''}
              onChange={handleInputChange}
              className={`form-control-productform ${errors.price ? 'error' : ''}`}
              placeholder="0"
              min="0"
              step="1000"
              disabled={isSubmitting}
              required
            />
            {errors.price && <div className="field-error-productform">{errors.price}</div>}
          </div>

          {/* Currency */}
          <div className="form-group-productform">
            <label htmlFor="currency" className="form-label-productform">
              Đơn vị tiền tệ
            </label>
            <select
              id="currency"
              name="currency"
              value={formData.currency || 'VND'}
              onChange={handleInputChange}
              className="form-control-productform"
              disabled={isSubmitting}
            >
              <option value="VND">VND</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>

          {/* Colors */}
          <div className="form-group-productform">
            <label htmlFor="colors" className="form-label-productform">
              Màu sắc <span className="required-productform">*</span>
            </label>
            <input
              type="text"
              id="colors"
              name="colors"
              value={colorsInput}
              onChange={handleInputChange}
              className={`form-control-productform ${errors.colors ? 'error' : ''}`}
              placeholder="Nhập màu sắc (cách nhau bằng dấu phẩy): Đỏ, Xanh, Vàng"
              disabled={isSubmitting}
            />
            {errors.colors && <div className="field-error-productform">{errors.colors}</div>}
            {formData.colors && formData.colors.length > 0 && (
              <div className="colors-preview-productform">
                {formData.colors.map((color, index) => (
                  <span key={index} className="color-tag-productform">{color}</span>
                ))}
              </div>
            )}
          </div>

          {/* Brand */}
          <div className="form-group-productform">
            <label htmlFor="brand" className="form-label-productform">
              Thương hiệu
            </label>
            <input
              type="text"
              id="brand"
              name="brand"
              value={formData.brand || ''}
              onChange={handleInputChange}
              className="form-control-productform"
              placeholder="Nhập thương hiệu"
              disabled={isSubmitting}
              list="brands-list"
            />
            {brands.length > 0 && (
              <datalist id="brands-list">
                {brands.map((brand, index) => (
                  <option key={index} value={brand} />
                ))}
              </datalist>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="form-group-productform full-width">
          <label htmlFor="notes" className="form-label-productform">
            Ghi chú
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes || ''}
            onChange={handleInputChange}
            className="form-control-productform"
            placeholder="Nhập ghi chú về sản phẩm..."
            rows={4}
            disabled={isSubmitting}
          />
        </div>

        {/* Image Management - Show for all products */}
        <div className="form-group-productform full-width">
          <div className="product-image-upload-productform">
              <div className="image-upload-header-productform">
              <h4>📷 Ảnh sản phẩm ({product ? images.length : tempImages.length}/10)</h4>
              <button
                type="button"
                className="upload-btn-productform"
                onClick={() => fileInputRef.current?.click()}
                disabled={imageUploading || (product ? images.length >= 10 : tempImages.length >= 10)}
              >
                📷 Thêm ảnh
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>

            {images.length === 0 && tempImagePreviews.length === 0 ? (
              <div className="no-images-productform">
                <div className="no-images-icon-productform">📷</div>
                <p>Chưa có ảnh nào</p>
                {product ? (
                  <p className="no-images-hint-productform">Nhấn "Thêm ảnh" để upload ảnh sản phẩm</p>
                ) : (
                  <p className="no-images-hint-productform">Nhấn "Thêm ảnh" để upload ảnh sản phẩm</p>
                )}
              </div>
            ) : (
              <div className="images-grid-productform">
                {/* Hiển thị ảnh tạm thời khi đang tạo sản phẩm mới */}
                {!product && tempImagePreviews.map((item, index) => (
                  <div
                    key={`temp-${index}`}
                    className="image-item-productform temp-image-productform"
                  >
                    <div className="image-wrapper-productform">
                      <img
                        src={item.preview}
                        alt={`Ảnh tạm ${index + 1}`}
                        title={item.file.name}
                        className="product-image-productform"
                      />
                      <div className="image-overlay-productform">
                        <div className="image-order-productform">{index + 1}</div>
                        <div className="image-actions-productform">
                          <button
                            type="button"
                            className="action-btn-productform delete-btn-productform"
                            onClick={() => handleRemoveTempImage(index)}
                            title="Xóa ảnh"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="image-alt-text-productform">
                      {item.file.name}
                    </div>
                  </div>
                ))}
                
                {/* Hiển thị ảnh đã lưu khi chỉnh sửa sản phẩm */}
                {product && sortedImages.map((image, index) => (
                  <div
                    key={image.image_id}
                    className={`image-item-productform ${draggedImageId === image.image_id ? 'dragging' : ''}`}
                    draggable={!imageUploading}
                    onDragStart={(e) => handleDragStart(e, image.image_id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, image.image_id)}
                  >
                    <div className="image-wrapper-productform">
                      <img
                        src={`https://pub-29571d63ff4741baa4c864245169a1ba.r2.dev/${image.cloudflare_key}`}
                        alt={image.alt_text || `Ảnh sản phẩm ${index + 1}`}
                        className="product-image-productform"
                        title={image.alt_text || `Ảnh sản phẩm ${index + 1}`}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zNSA2NUw1MCA0NUw2NSA2NUgzNVoiIGZpbGw9IiM5Q0EzQUYiLz4KPGNpcmNsZSBjeD0iNDAiIGN5PSIzNSIgcj0iNSIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K';
                        }}
                      />
                      <div className="image-overlay-productform">
                        <div className="image-order-productform">{image.display_order}</div>
                        <div className="image-actions-productform">
                          <button
                            type="button"
                            className="action-btn-productform edit-btn-productform"
                            onClick={() => handleEditAltText(image)}
                            title="Chỉnh sửa mô tả"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            className="action-btn-productform delete-btn-productform"
                            onClick={() => handleDeleteImage(image.image_id)}
                            title="Xóa ảnh"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {editingImage === image.image_id ? (
                      <div className="alt-text-editor-productform">
                        <input
                          type="text"
                          value={editingAltText}
                          onChange={(e) => setEditingAltText(e.target.value)}
                          placeholder="Nhập mô tả ảnh..."
                          className="alt-text-input-productform"
                        />
                        <div className="alt-text-actions-productform">
                          <button
                            type="button"
                            className="save-btn-productform"
                            onClick={() => handleSaveAltText(image.image_id)}
                          >
                            💾
                          </button>
                          <button
                            type="button"
                            className="cancel-btn-productform"
                            onClick={handleCancelEdit}
                          >
                            ❌
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="image-alt-text-productform">
                        {image.alt_text || 'Chưa có mô tả'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {imageUploading && (
              <div className="upload-loading-productform">
                <div className="loading-spinner-productform"></div>
                <span>Đang xử lý...</span>
              </div>
            )}
            
            {/* Hiển thị thông tin khi đang tải ảnh lên */}
            {isSubmitting && tempImages.length > 0 && !product && (
              <div className="upload-info-message-productform">
                <div className="loading-spinner-productform"></div>
                <span>Đang tải ảnh lên sau khi tạo sản phẩm...</span>
              </div>
            )}
          </div>
        </div>

      </form>
      
      {/* Modal Footer */}
      <div className="modal-footer-productform">
        <button
          type="button"
          className="btn-productform btn-secondary-productform"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          ❌ Hủy
        </button>
        <button
          type="button"
          className="btn-productform btn-primary-productform"
          onClick={handleSubmit}
          disabled={isSubmitting || loading}
        >
          {isSubmitting ? (
            <>
              <div className="btn-spinner-productform"></div>
              <span>Đang xử lý...</span>
            </>
          ) : (
            <>
              {product ? '💾 Cập nhật' : '➕ Thêm mới'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}