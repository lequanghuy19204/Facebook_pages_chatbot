'use client';

import React, { useState, useEffect } from 'react';
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

export default function TrainingDocumentsTab() {
  const { token } = useAuth();
  
  const [documents, setDocuments] = useState<AITrainingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState<AITrainingDocument | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
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
      if (editingDocument) {
        // Update existing document
        const dto: UpdateTrainingDocumentDto = {
          category: formData.category,
          question: formData.question,
          answer: formData.answer,
          prompt: formData.prompt || undefined,
          images: formData.images,
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
          images: formData.images,
        };
        await ApiService.chatbot.createTrainingDocument(token!, dto);
        toast.success('Tạo tài liệu thành công');
      }
      setShowModal(false);
      loadDocuments(); // Reload list
    } catch (error: any) {
      toast.error('Lỗi khi lưu tài liệu: ' + error.message);
    }
  };

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
                    <strong>Hình ảnh đính kèm:</strong> {doc.images.length} ảnh
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
                <div className="training-doc-image-upload-area">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <p>Kéo thả hoặc click để upload ảnh</p>
                  <button className="training-doc-btn-secondary">Chọn ảnh</button>
                </div>
              </div>
            </div>

            <div className="training-doc-modal-footer">
              <button className="training-doc-btn-secondary" onClick={() => setShowModal(false)}>
                Hủy
              </button>
              <button 
                className="training-doc-btn-primary" 
                onClick={handleSave}
                disabled={!formData.question || !formData.answer}
              >
                {editingDocument ? 'Cập nhật' : 'Tạo mới'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
