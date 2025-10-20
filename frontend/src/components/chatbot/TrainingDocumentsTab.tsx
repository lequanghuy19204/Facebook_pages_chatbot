'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ApiService, { AITrainingDocument, CreateTrainingDocumentDto, UpdateTrainingDocumentDto } from '@/services/api';
import { toast } from 'react-toastify';
import '@/styles/chatbot/TrainingDocuments.css';

const CATEGORIES = [
  'Sản phẩm',
  'Giá cả',
  'Chính sách',
  'Hướng dẫn',
  'Liên hệ',
  'Khác'
];

interface UploadedImage {
  file: File;
  preview: string;
  url?: string;
  key?: string;
}

export default function TrainingDocumentsTab() {
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [documents, setDocuments] = useState<AITrainingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState<AITrainingDocument | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [selectedImages, setSelectedImages] = useState<UploadedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  const [formData, setFormData] = useState({
    category: 'Sản phẩm',
    question: '',
    answer: '',
    prompt: '',
    images: [] as string[]
  });

  // Load documents on mount and when filters change
  useEffect(() => {
    if (token) {
      loadDocuments();
    }
  }, [token, page, selectedCategory, searchQuery]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await ApiService.chatbot.getTrainingDocuments(token!, {
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        search: searchQuery || undefined,
        page,
        limit: 20,
      });
      setDocuments(response.documents);
      setTotalPages(response.pagination.totalPages);
    } catch (error: any) {
      toast.error('Không thể tải tài liệu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setEditingDocument(null);
    setSelectedImages([]);
    setFormData({
      category: 'Sản phẩm',
      question: '',
      answer: '',
      prompt: '',
      images: []
    });
    setShowModal(true);
  };

  const handleEdit = (document: AITrainingDocument) => {
    setEditingDocument(document);
    setSelectedImages([]);
    setFormData({
      category: document.category,
      question: document.question,
      answer: document.answer,
      prompt: document.prompt || '',
      images: document.images
    });
    setShowModal(true);
  };

  const handleDelete = async (documentId: string) => {
    if (confirm('Bạn có chắc muốn xóa tài liệu này?')) {
      try {
        await ApiService.chatbot.deleteTrainingDocument(token!, documentId);
        toast.success('Xóa tài liệu thành công');
        loadDocuments(); // Reload list
      } catch (error: any) {
        toast.error('Lỗi khi xóa tài liệu: ' + error.message);
      }
    }
  };

  const handleSave = async () => {
    if (!formData.question || !formData.answer) {
      toast.error('Vui lòng điền đầy đủ câu hỏi và câu trả lời');
      return;
    }

    try {
      // Upload các ảnh mới (nếu có) - UPLOAD TẤT CẢ CÙNG LÚC
      let uploadedImageUrls: string[] = [...formData.images]; // Giữ lại ảnh cũ
      
      if (selectedImages.length > 0) {
        setUploadingImages(true);
        
        try {
          // Upload tất cả ảnh cùng lúc thay vì từng ảnh một
          const filesToUpload = selectedImages.map(img => img.file);
          const uploadResult = await ApiService.chatbot.uploadTrainingImages(token!, filesToUpload);
          
          // Thêm các ảnh upload thành công
          if (uploadResult.data.length > 0) {
            const successUrls = uploadResult.data.map(item => item.publicUrl);
            uploadedImageUrls.push(...successUrls);
            toast.success(`✅ Upload thành công ${uploadResult.data.length} ảnh!`);
          }
          
          // Hiển thị lỗi nếu có ảnh thất bại
          if (uploadResult.failed.length > 0) {
            uploadResult.failed.forEach(fail => {
              toast.error(`❌ ${fail.fileName}: ${fail.error}`, { autoClose: 3000 });
            });
          }
        } catch (error: any) {
          toast.error(`Lỗi upload ảnh: ${error.message}`);
        } finally {
          setUploadingImages(false);
        }
      }

      if (editingDocument) {
        // Update existing document
        const dto: UpdateTrainingDocumentDto = {
          category: formData.category,
          question: formData.question,
          answer: formData.answer,
          prompt: formData.prompt || undefined,
          images: uploadedImageUrls,
        };
        await ApiService.chatbot.updateTrainingDocument(
          token!,
          editingDocument.document_id,
          dto
        );
        toast.success('Cập nhật tài liệu thành công');
      } else {
        // Create new document
        const dto: CreateTrainingDocumentDto = {
          category: formData.category,
          question: formData.question,
          answer: formData.answer,
          prompt: formData.prompt || undefined,
          images: uploadedImageUrls,
        };
        await ApiService.chatbot.createTrainingDocument(token!, dto);
        toast.success('Tạo tài liệu thành công');
      }
      
      setShowModal(false);
      setSelectedImages([]);
      loadDocuments(); // Reload list
    } catch (error: any) {
      toast.error('Lỗi khi lưu tài liệu: ' + error.message);
    }
  };

  // Process files (used by both file input and drag & drop)
  const processFiles = (files: FileList | File[]) => {
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const newImages: UploadedImage[] = [];
    const errors: string[] = [];

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        errors.push(`${file.name}: Không phải file ảnh`);
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: Vượt quá 10MB`);
        return;
      }

      const preview = URL.createObjectURL(file);
      newImages.push({
        file,
        preview,
      });
    });

    if (errors.length > 0) {
      toast.error(`Một số file không hợp lệ:\n${errors.join('\n')}`, { autoClose: 4000 });
    }

    if (newImages.length > 0) {
      setSelectedImages(prev => [...prev, ...newImages]);
      toast.success(`Đã chọn ${newImages.length} ảnh`);
    }
  };

  // Handle image selection from file input
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    processFiles(files);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  // Handle drag leave
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  };

  const handleRemoveNewImage = (index: number) => {
    setSelectedImages(prev => {
      const newImages = [...prev];
      if (newImages[index].preview) {
        URL.revokeObjectURL(newImages[index].preview);
      }
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const handleRemoveExistingImage = (index: number) => {
    setFormData(prev => {
      const newImages = [...prev.images];
      newImages.splice(index, 1);
      return { ...prev, images: newImages };
    });
  };

  const handleImageUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      selectedImages.forEach(img => {
        if (img.preview) {
          URL.revokeObjectURL(img.preview);
        }
      });
    };
  }, [selectedImages]);

  // Filter documents locally (already filtered by API, this is for display)
  const displayedDocuments = documents;

  return (
    <div className="training-doc-tab">
      {/* Header Actions */}
      <div className="training-doc-header">
        <div className="training-doc-filters">
          <div className="training-doc-search-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Tìm kiếm câu hỏi hoặc câu trả lời..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <select
            className="training-doc-category-filter"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">Tất cả danh mục</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <button className="training-doc-btn-primary" onClick={handleCreateNew}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Tạo tài liệu mới
        </button>
      </div>

      {/* Documents List */}
      <div className="training-doc-list">
        {loading ? (
          <div className="training-doc-empty-state">
            <p>Đang tải tài liệu...</p>
          </div>
        ) : displayedDocuments.length === 0 ? (
          <div className="training-doc-empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <h3>Chưa có tài liệu huấn luyện</h3>
            <p>Tạo tài liệu Q&A để chatbot có thể trả lời khách hàng tốt hơn</p>
            <button className="training-doc-btn-primary" onClick={handleCreateNew}>
              Tạo tài liệu đầu tiên
            </button>
          </div>
        ) : (
          displayedDocuments.map((doc: AITrainingDocument) => (
            <div key={doc.document_id} className="training-doc-card">
              <div className="training-doc-card-header">
                <span className="training-doc-category">{doc.category}</span>
                <div className="training-doc-actions">
                  <button className="training-doc-btn-icon" onClick={() => handleEdit(doc)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button className="training-doc-btn-icon training-doc-btn-danger" onClick={() => handleDelete(doc.document_id)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="training-doc-content">
                <div className="training-doc-question">
                  <strong>Câu hỏi:</strong> {doc.question}
                </div>
                <div className="training-doc-answer">
                  <strong>Câu trả lời:</strong> {doc.answer}
                </div>
                {doc.prompt && (
                  <div className="training-doc-prompt">
                    <strong>Hướng dẫn xử lý:</strong> {doc.prompt}
                  </div>
                )}
                {doc.images.length > 0 && (
                  <div className="training-doc-images">
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Hình ảnh đính kèm ({doc.images.length}):</strong>
                    </div>
                    <div className="training-doc-images-grid">
                      {doc.images.map((imageUrl, index) => (
                        <div 
                          key={index} 
                          className="training-doc-image-preview"
                        >
                          <img 
                            src={imageUrl} 
                            alt={`image-${index}`}
                            loading="lazy"
                            onError={(e) => {
                              const img = e.target as HTMLImageElement;
                              img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23f0f0f0"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="14"%3EError%3C/text%3E%3C/svg%3E';
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="training-doc-footer">
                <span className="training-doc-date">
                  Cập nhật: {new Date(doc.updated_at).toLocaleDateString('vi-VN')}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal for Create/Edit */}
      {showModal && (
        <div className="training-doc-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="training-doc-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="training-doc-modal-header">
              <h2>{editingDocument ? 'Chỉnh sửa tài liệu' : 'Tạo tài liệu mới'}</h2>
              <button className="training-doc-modal-close" onClick={() => setShowModal(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="training-doc-modal-body">
              <div className="training-doc-form-group">
                <label className="training-doc-form-label">
                  Danh mục <span className="training-doc-required">*</span>
                </label>
                <select
                  className="training-doc-form-select"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="training-doc-form-group">
                <label className="training-doc-form-label">
                  Câu hỏi <span className="training-doc-required">*</span>
                </label>
                <input
                  type="text"
                  className="training-doc-form-input"
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  placeholder="Ví dụ: Làm sao để chọn size áo phù hợp?"
                />
              </div>

              <div className="training-doc-form-group">
                <label className="training-doc-form-label">
                  Câu trả lời <span className="training-doc-required">*</span>
                </label>
                <textarea
                  className="training-doc-form-textarea"
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  rows={4}
                  placeholder="Nhập câu trả lời chi tiết..."
                />
              </div>

              <div className="training-doc-form-group">
                <label className="training-doc-form-label">
                  Hướng dẫn xử lý cho AI
                </label>
                <textarea
                  className="training-doc-form-textarea"
                  value={formData.prompt}
                  onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                  rows={3}
                  placeholder="Hướng dẫn AI cách xử lý câu hỏi này (tùy chọn)"
                />
                <p className="training-doc-form-hint">
                  Ví dụ: "Hỏi khách về cân nặng và chiều cao để tư vấn size chính xác"
                </p>
              </div>

              <div className="training-doc-form-group">
                <label className="training-doc-form-label">Hình ảnh đính kèm</label>
                
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleImageSelect}
                />
                
                {/* Upload area */}
                <div 
                  className={`training-doc-image-upload-area ${isDragging ? 'dragging' : ''}`}
                  onClick={handleImageUploadClick}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  style={{ cursor: 'pointer' }}
                >
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <p>{isDragging ? 'Thả ảnh vào đây...' : 'Kéo thả hoặc click để upload ảnh'}</p>
                  <button 
                    type="button" 
                    className="training-doc-btn-secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleImageUploadClick();
                    }}
                  >
                    Chọn ảnh
                  </button>
                </div>

                {/* Display existing images */}
                {formData.images.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
                      Ảnh đã lưu ({formData.images.length}):
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {formData.images.map((url, index) => (
                        <div key={index} style={{ position: 'relative', width: '100px', height: '100px' }}>
                          <img 
                            src={url} 
                            alt={`existing-${index}`} 
                            style={{ 
                              width: '100%', 
                              height: '100%', 
                              objectFit: 'cover', 
                              borderRadius: '8px',
                              border: '2px solid #e0e0e0'
                            }} 
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveExistingImage(index)}
                            style={{
                              position: 'absolute',
                              top: '-8px',
                              right: '-8px',
                              background: '#ff4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '50%',
                              width: '24px',
                              height: '24px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '14px',
                              fontWeight: 'bold'
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Display newly selected images (not uploaded yet) */}
                {selectedImages.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
                      Ảnh mới chọn ({selectedImages.length}) - sẽ upload khi lưu:
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {selectedImages.map((imgObj, index) => (
                        <div key={index} style={{ position: 'relative', width: '100px', height: '100px' }}>
                          <img 
                            src={imgObj.preview} 
                            alt={`preview-${index}`} 
                            style={{ 
                              width: '100%', 
                              height: '100%', 
                              objectFit: 'cover', 
                              borderRadius: '8px',
                              border: '2px solid #4CAF50'
                            }} 
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveNewImage(index)}
                            style={{
                              position: 'absolute',
                              top: '-8px',
                              right: '-8px',
                              background: '#ff4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '50%',
                              width: '24px',
                              height: '24px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '14px',
                              fontWeight: 'bold'
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="training-doc-modal-footer">
              <button className="training-doc-btn-secondary" onClick={() => setShowModal(false)} disabled={uploadingImages}>
                Hủy
              </button>
              <button 
                className="training-doc-btn-primary" 
                onClick={handleSave}
                disabled={!formData.question || !formData.answer || uploadingImages}
              >
                {uploadingImages ? 'Đang upload ảnh...' : (editingDocument ? 'Cập nhật' : 'Tạo mới')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
