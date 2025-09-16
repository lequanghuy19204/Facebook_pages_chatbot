'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ApiService, { 
  Product, 
  ProductStats, 
  ProductQueryDto, 
  CreateProductDto, 
  UpdateProductDto 
} from '@/services/api';
import Header from '../shared/Header';
import ProductTable from './ProductTable';
import ProductForm from './ProductForm';
import '@/styles/products/Products.css';
import '@/styles/products/ProductForm.css';
import { toast } from 'react-toastify';

interface ProductsProps {
  onLogout?: () => void;
}

export default function Products({ onLogout }: ProductsProps) {
  const { user, company, logout, token } = useAuth();
  
  
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [brands, setBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 20;

  
  const handleLogout = async () => {
    await logout();
    if (onLogout) {
      onLogout();
    }
  };

  
  const fetchProducts = async (resetPage: boolean = false) => {
    if (!token) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const page = resetPage ? 1 : currentPage;
      
      const query: ProductQueryDto = {
        page,
        limit,
        search: searchQuery || undefined,
        brand: selectedBrand || undefined,
        is_active: statusFilter === 'all' ? undefined : statusFilter === 'active',
        sort_by: sortBy,
        sort_order: sortOrder
      };

      const response = await ApiService.products.getProducts(token, query);
      
      setProducts(response.products);
      setStats(response.stats);
      setCurrentPage(page);
      setTotalPages(response.pagination.pages);
      setTotalItems(response.pagination.total);
      
      if (resetPage) {
        setCurrentPage(1);
      }
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách sản phẩm');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  
  const fetchBrands = async () => {
    if (!token) return;
    
    try {
      const brandsData = await ApiService.products.getBrands(token);
      setBrands(brandsData);
    } catch (err: any) {
      console.error('Error fetching brands:', err);
    }
  };

  
  useEffect(() => {
    if (token) {
      fetchProducts(true);
      fetchBrands();
    }
  }, [token]);

  
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (token) {
        fetchProducts(true);
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, selectedBrand, statusFilter, sortBy, sortOrder]);

  
  useEffect(() => {
    if (token && currentPage > 1) {
      fetchProducts(false);
    }
  }, [currentPage]);


  
  const handleCreateProduct = async (productData: CreateProductDto) => {
    if (!token) return;
    
    try {
      setModalLoading(true);
      const newProduct = await ApiService.products.createProduct(token, productData);
      
      toast.success('Thêm sản phẩm thành công!');
      
      
      setIsModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Không thể thêm sản phẩm');
      throw error;
    } finally {
      setModalLoading(false);
    }
  };

  
  const handleProductCreated = async () => {
    try {
      await fetchProducts(true);
      await fetchBrands();
    } catch (error) {
      console.error('Error refreshing data after product creation:', error);
    }
  };

  
  const handleUpdateProduct = async (productData: UpdateProductDto) => {
    if (!token || !editingProduct) return;
    
    try {
      setModalLoading(true);
      const updatedProduct = await ApiService.products.updateProduct(
        token, 
        editingProduct.product_id, 
        productData
      );
      
      toast.success('Cập nhật sản phẩm thành công!');
      await fetchProducts(false);
      await fetchBrands(); 
      setIsModalOpen(false);
      setEditingProduct(null);
    } catch (error: any) {
      toast.error(error.message || 'Không thể cập nhật sản phẩm');
      throw error;
    } finally {
      setModalLoading(false);
    }
  };

  
  const handleDeleteProduct = async (productId: string) => {
    if (!token) return;
    
    try {
      await ApiService.products.deleteProduct(token, productId);
      toast.success('Xóa sản phẩm thành công!');
      await fetchProducts(false);
    } catch (error: any) {
      toast.error(error.message || 'Không thể xóa sản phẩm');
    }
  };


  
  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  
  const handleModalSubmit = async (data: CreateProductDto | UpdateProductDto) => {
    if (editingProduct) {
      await handleUpdateProduct(data as UpdateProductDto);
    } else {
      await handleCreateProduct(data as CreateProductDto);
    }
  };

  
  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedBrand('');
    setStatusFilter('all');
    setSortBy('created_at');
    setSortOrder('desc');
  };

  return (
    <div className="products-container">
      {/* Header */}
      <Header onLogout={onLogout} />

      {/* Main Content */}
      <div className="products-main">
        <div className="products-content">
          <div className="products-content-wrapper">
            
            {/* Breadcrumb & Title */}
            <div className="products-header">
              <div className="breadcrumb">
                <span className="breadcrumb-item">Dashboard</span>
                <span className="breadcrumb-separator"></span>
                <span className="breadcrumb-item active">Quản lý sản phẩm</span>
              </div>
              <div className="page-title">
                Quản lý sản phẩm ({stats?.total_products ?? 0} sản phẩm)
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="products-error-message">
                ❌ {error}
                <button onClick={() => fetchProducts(true)}>Thử lại</button>
              </div>
            )}


            {/* Control Panel */}
            <div className="products-control-panel">
              <div className="products-panel-header">
                <div className="products-panel-title">Danh sách sản phẩm</div>
                <div className="products-panel-actions">
                  <button 
                    className="add-product-btn"
                    onClick={() => setIsModalOpen(true)}
                  >
                    ➕ Thêm sản phẩm
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="filters-section">
                <div className="filters-row">
                  <div className="products-search-box">
                    <input
                      type="text"
                      className="search-input"
                      placeholder="🔍 Tìm kiếm sản phẩm..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="filter-selects">
                    <select
                      className="filter-select"
                      value={selectedBrand}
                      onChange={(e) => setSelectedBrand(e.target.value)}
                    >
                      <option value="">Tất cả thương hiệu</option>
                      {brands.map((brand) => (
                        <option key={brand} value={brand}>{brand}</option>
                      ))}
                    </select>

                    <select
                      className="filter-select"
                      value={`${sortBy}-${sortOrder}`}
                      onChange={(e) => {
                        const [field, order] = e.target.value.split('-');
                        setSortBy(field);
                        setSortOrder(order as 'asc' | 'desc');
                      }}
                    >
                      <option value="created_at-desc">Mới nhất</option>
                      <option value="created_at-asc">Cũ nhất</option>
                      <option value="name-asc">Tên A-Z</option>
                      <option value="name-desc">Tên Z-A</option>
                      <option value="price-asc">Giá thấp đến cao</option>
                      <option value="price-desc">Giá cao đến thấp</option>
                    </select>
                  </div>

                  {(searchQuery || selectedBrand || statusFilter !== 'all') && (
                    <button 
                      className="clear-filters-btn"
                      onClick={clearFilters}
                    >
                      🗑️ Xóa bộ lọc
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Products Table */}
            <ProductTable
              products={products}
              loading={loading}
              onEdit={handleEditProduct}
              onDelete={handleDeleteProduct}
              onRefresh={() => fetchProducts(false)}
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination-section">
                <div className="pagination-info">
                  Hiển thị {((currentPage - 1) * limit) + 1} - {Math.min(currentPage * limit, totalItems)} 
                  trong tổng số {totalItems} sản phẩm
                </div>
                <div className="pagination-controls">
                  <button
                    className="pagination-btn"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(1)}
                  >
                    ⏮️
                  </button>
                  <button
                    className="pagination-btn"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                  >
                    ⬅️
                  </button>
                  <span className="pagination-current">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    className="pagination-btn"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                  >
                    ➡️
                  </button>
                  <button
                    className="pagination-btn"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                  >
                    ⏭️
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Product Form */}
      {isModalOpen && (
        <div className="product-form-overlay-productform">
          <ProductForm
            product={editingProduct}
            onSubmit={handleModalSubmit}
            onCancel={handleModalClose}
            loading={modalLoading}
            brands={brands}
            onProductCreated={handleProductCreated}
          />
        </div>
      )}
    </div>
  );
}
