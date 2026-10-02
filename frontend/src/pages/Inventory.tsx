import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Product, Category, Brand } from '../types';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Tags, 
  Tag, 
  Layers, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Barcode,
  Sparkles,
  RefreshCw,
  Package,
  X
} from 'lucide-react';

const Inventory: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Navigation tabs: 'products' | 'categories' | 'brands'
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'brands'>('products');

  // Products states
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [productsTotal, setProductsTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Lists
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  // Modal controls
  const [productModal, setProductModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  const [categoryModal, setCategoryModal] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);

  const [brandModal, setBrandModal] = useState(false);
  const [editBrand, setEditBrand] = useState<Brand | null>(null);

  // Toast States
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 4000);
  };
  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Form Fields: Product
  const [name, setName] = useState('');
  const [modelNumber, setModelNumber] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [description, setDescription] = useState('');
  const [mrp, setMrp] = useState(0);
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [gstRate, setGstRate] = useState(18);
  const [stock, setStock] = useState(0);
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [hasIMEI, setHasIMEI] = useState(false);
  const [imeiString, setImeiString] = useState('');
  const [warrantyMonths, setWarrantyMonths] = useState(12);

  // Form Fields: Category & Brand
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [brandName, setBrandName] = useState('');
  const [brandDesc, setBrandDesc] = useState('');

  // Fetch collections
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(
        `/products?pageNumber=${page}&keyword=${keyword}&category=${categoryFilter}&brand=${brandFilter}&lowStock=${lowStockFilter}`
      );
      if (data.success) {
        setProducts(data.data.products);
        setPages(data.data.pages);
        setProductsTotal(data.data.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLists = async () => {
    try {
      const catRes = await api.get('/categories');
      if (catRes.data.success) setCategories(catRes.data.data);

      const brandRes = await api.get('/brands');
      if (brandRes.data.success) setBrands(brandRes.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, categoryFilter, brandFilter, lowStockFilter]);

  // Debounced search
  useEffect(() => {
    const delay = setTimeout(() => {
      setPage(1);
      fetchProducts();
    }, 300);
    return () => clearTimeout(delay);
  }, [keyword]);

  useEffect(() => {
    fetchLists();
  }, []);

  // Handle product modal launch
  const openProductModal = (prod: Product | null = null) => {
    setEditProduct(prod);
    if (prod) {
      setName(prod.name);
      setModelNumber(prod.modelNumber || '');
      setSku(prod.sku);
      setBarcode(prod.barcode || '');
      setCategory(typeof prod.category === 'object' ? prod.category._id : prod.category);
      setBrand(typeof prod.brand === 'object' ? prod.brand._id : prod.brand);
      setDescription(prod.description || '');
      setMrp(prod.mrp || 0);
      setPurchasePrice(prod.purchasePrice || 0);
      setSellingPrice(prod.sellingPrice || prod.mrp || 0);
      setGstRate(prod.gstRate || 18);
      setStock(prod.stock || 0);
      setLowStockThreshold(prod.lowStockThreshold || 5);
      setHasIMEI(prod.hasIMEI || false);
      setImeiString(prod.imeiList ? prod.imeiList.join(', ') : '');
      setWarrantyMonths(prod.warrantyMonths || 12);
    } else {
      setName('');
      setModelNumber('');
      setSku('');
      setBarcode('');
      setCategory(categories[0]?._id || '');
      setBrand(brands[0]?._id || '');
      setDescription('');
      setMrp(0);
      setPurchasePrice(0);
      setSellingPrice(0);
      setGstRate(18);
      setStock(0);
      setLowStockThreshold(5);
      setHasIMEI(false);
      setImeiString('');
      setWarrantyMonths(12);
    }
    setProductModal(true);
  };

  // Submit product create/edit
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return showError('Product name is required');
    if (!category) return showError('Please select a category');
    if (!brand) return showError('Please select a brand');

    const imeiList = hasIMEI 
      ? imeiString.split(',').map(i => i.trim()).filter(i => i.length > 0) 
      : [];

    const payload = {
      name: name.trim(),
      modelNumber: modelNumber.trim(),
      sku: sku.trim() || `SKU-${Date.now()}${Math.floor(Math.random() * 1000)}`,
      barcode: barcode.trim() || undefined,
      category,
      brand,
      description: description.trim(),
      mrp: Number(mrp) || 0,
      purchasePrice: Number(purchasePrice) || 0,
      sellingPrice: Number(sellingPrice) || Number(mrp) || 0,
      gstRate: Number(gstRate) || 18,
      stock: hasIMEI ? imeiList.length : Number(stock) || 0,
      lowStockThreshold: Number(lowStockThreshold) || 5,
      hasIMEI,
      imeiList,
      warrantyMonths: Number(warrantyMonths) || 12
    };

    try {
      if (editProduct) {
        await api.put(`/products/${editProduct._id}`, payload);
        showSuccess('Product updated successfully!');
      } else {
        await api.post('/products', payload);
        showSuccess('Product created successfully!');
      }
      setProductModal(false);
      fetchProducts();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Product save failed.');
    }
  };

  const handleProductDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.delete(`/products/${id}`);
      showSuccess('Product deleted successfully!');
      fetchProducts();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Product deletion failed.');
    }
  };

  // Category Modal & Handlers
  const openCategoryModal = (cat: Category | null = null) => {
    setEditCategory(cat);
    if (cat) {
      setCatName(cat.name);
      setCatDesc(cat.description || '');
    } else {
      setCatName('');
      setCatDesc('');
    }
    setCategoryModal(true);
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return showError('Category name is required');
    try {
      if (editCategory) {
        await api.put(`/categories/${editCategory._id}`, { name: catName.trim(), description: catDesc.trim() });
        showSuccess('Category updated successfully!');
      } else {
        await api.post('/categories', { name: catName.trim(), description: catDesc.trim() });
        showSuccess('Category created successfully!');
      }
      setCategoryModal(false);
      setCatName('');
      setCatDesc('');
      setEditCategory(null);
      fetchLists();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Category save failed');
    }
  };

  const handleCategoryDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await api.delete(`/categories/${id}`);
      showSuccess('Category deleted successfully!');
      fetchLists();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Category deletion failed');
    }
  };

  // Brand Modal & Handlers
  const openBrandModal = (br: Brand | null = null) => {
    setEditBrand(br);
    if (br) {
      setBrandName(br.name);
      setBrandDesc(br.description || '');
    } else {
      setBrandName('');
      setBrandDesc('');
    }
    setBrandModal(true);
  };

  const handleBrandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) return showError('Brand name is required');
    try {
      if (editBrand) {
        await api.put(`/brands/${editBrand._id}`, { name: brandName.trim(), description: brandDesc.trim() });
        showSuccess('Brand updated successfully!');
      } else {
        await api.post('/brands', { name: brandName.trim(), description: brandDesc.trim() });
        showSuccess('Brand created successfully!');
      }
      setBrandModal(false);
      setBrandName('');
      setBrandDesc('');
      setEditBrand(null);
      fetchLists();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Brand save failed');
    }
  };

  const handleBrandDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this brand?')) return;
    try {
      await api.delete(`/brands/${id}`);
      showSuccess('Brand deleted successfully!');
      fetchLists();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Brand deletion failed');
    }
  };

  return (
    <div className="flex-1 p-8 bg-slate-50 dark:bg-slate-950 overflow-y-auto h-screen transition-colors duration-200">
      
      {/* Toast Notifications */}
      {errorMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3.5 bg-rose-500 text-white rounded-2xl shadow-2xl shadow-rose-500/30 text-sm font-bold flex items-center gap-3 animate-scaleUp">
          <span>⚠</span>
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="ml-2 text-white/80 hover:text-white font-black text-xs">✕</button>
        </div>
      )}
      {successMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3.5 bg-emerald-500 text-white rounded-2xl shadow-2xl shadow-emerald-500/30 text-sm font-bold flex items-center gap-3 animate-scaleUp">
          <span>✓</span>
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="ml-2 text-white/80 hover:text-white font-black text-xs">✕</button>
        </div>
      )}

      {/* Header controls */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-sans">Inventory & Catalog</h2>
          <p className="text-slate-500 text-sm">Manage products, pricing, stock levels, categories, and brand catalogs.</p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'products' && (
            <button
              onClick={() => openProductModal(null)}
              className="px-5 py-3 bg-brand-500 hover:bg-brand-600 rounded-2xl text-xs font-extrabold uppercase text-white shadow-lg shadow-brand-500/20 active:scale-[0.98] transition-all flex items-center gap-2"
            >
              <Plus size={14} />
              <span>Add Product</span>
            </button>
          )}
          {activeTab === 'categories' && (
            <button
              onClick={() => openCategoryModal(null)}
              className="px-5 py-3 bg-brand-500 hover:bg-brand-600 rounded-2xl text-xs font-extrabold uppercase text-white shadow-lg shadow-brand-500/20 active:scale-[0.98] transition-all flex items-center gap-2"
            >
              <Plus size={14} />
              <span>New Category</span>
            </button>
          )}
          {activeTab === 'brands' && (
            <button
              onClick={() => openBrandModal(null)}
              className="px-5 py-3 bg-brand-500 hover:bg-brand-600 rounded-2xl text-xs font-extrabold uppercase text-white shadow-lg shadow-brand-500/20 active:scale-[0.98] transition-all flex items-center gap-2"
            >
              <Plus size={14} />
              <span>New Brand</span>
            </button>
          )}
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'products'
              ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
          }`}
        >
          <Package size={14} />
          <span>Products ({productsTotal})</span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'categories'
              ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
          }`}
        >
          <Layers size={14} />
          <span>Categories ({categories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('brands')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'brands'
              ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
          }`}
        >
          <Tag size={14} />
          <span>Brands ({brands.length})</span>
        </button>
      </div>

      {/* 1. PRODUCTS TAB CONTENT */}
      {activeTab === 'products' && (
        <div className="flex flex-col gap-6">
          {/* Filters shelf */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-3xl flex flex-wrap gap-4 items-center justify-between shadow-sm">
            <div className="flex gap-4 items-center flex-1 max-w-xl">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search products by SKU / name / barcode..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                />
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>

              {/* Category selector */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-600 dark:text-slate-400 outline-none cursor-pointer"
              >
                <option value="">All Categories</option>
                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>

              {/* Brand selector */}
              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="px-3 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-600 dark:text-slate-400 outline-none cursor-pointer"
              >
                <option value="">All Brands</option>
                {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>

            {/* Low stock toggler */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={lowStockFilter}
                onChange={(e) => setLowStockFilter(e.target.checked)}
                className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500 border-slate-300"
              />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-rose-500" /> Low Stock Warnings
              </span>
            </label>
          </div>

          {/* Table Container */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="pos-grid-header">SKU / Model</th>
                  <th className="pos-grid-header">Product Details</th>
                  <th className="pos-grid-header">Category</th>
                  <th className="pos-grid-header">Brand</th>
                  <th className="pos-grid-header text-right">Purchase Price</th>
                  <th className="pos-grid-header text-center">Stock</th>
                  <th className="pos-grid-header text-center">Status</th>
                  <th className="pos-grid-header text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-20 text-slate-400">
                      Loading inventory items...
                    </td>
                  </tr>
                ) : products.length > 0 ? (
                  products.map(prod => (
                    <tr key={prod._id} className="pos-grid-row">
                      <td className="px-4 py-4 text-xs font-bold text-slate-800 dark:text-slate-200">
                        <div className="flex flex-col">
                          <span>{prod.sku}</span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase">{prod.modelNumber || 'No Model'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">{prod.name}</span>
                          {prod.barcode && <span className="text-[9px] text-slate-400 flex items-center gap-1"><Barcode size={10} />{prod.barcode}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-600 dark:text-slate-400">
                        {typeof prod.category === 'object' ? prod.category.name : ''}
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-600 dark:text-slate-400">
                        {typeof prod.brand === 'object' ? prod.brand.name : ''}
                      </td>
                      <td className="px-4 py-4 text-right text-xs font-bold text-slate-900 dark:text-white">
                        ₹{(prod.purchasePrice || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className={`px-3 py-1 text-xs font-bold rounded-full ${prod.stock === 0 ? 'bg-rose-500/10 text-rose-500' : prod.stock <= prod.lowStockThreshold ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                            {prod.stock} Units
                          </span>
                          {prod.stock <= prod.lowStockThreshold && (
                            <span className="stock-pulse"><span className="stock-pulse-dot"></span><span className="stock-pulse-core"></span></span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full ${
                          prod.stock === 0 
                            ? 'bg-rose-500/10 text-rose-500' 
                            : prod.stock <= prod.lowStockThreshold 
                              ? 'bg-amber-500/10 text-amber-500' 
                              : 'bg-emerald-500/10 text-emerald-500'
                        }`}>
                          {prod.stock === 0 ? 'Out of Stock' : prod.stock <= prod.lowStockThreshold ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openProductModal(prod)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 hover:text-brand-500 transition-colors"
                            title="Edit Product"
                          >
                            <Edit size={14} />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleProductDelete(prod._id)}
                              className="p-2 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl text-slate-400 hover:text-rose-500 transition-colors"
                              title="Delete Product"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-20 text-slate-400 dark:text-slate-600">
                      No inventory records found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          {pages > 1 && (
            <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-3xl shadow-sm">
              <span className="text-xs text-slate-500">Showing {products.length} of {productsTotal} products.</span>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="p-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 rounded-xl text-slate-500 transition-all cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Page {page} of {pages}</span>
                <button
                  onClick={() => setPage(prev => Math.min(pages, prev + 1))}
                  disabled={page === pages}
                  className="p-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 rounded-xl text-slate-500 transition-all cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. CATEGORIES TAB CONTENT */}
      {activeTab === 'categories' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl shadow-sm overflow-hidden max-w-4xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="pos-grid-header">Category Name</th>
                <th className="pos-grid-header">Description</th>
                <th className="pos-grid-header text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.length > 0 ? (
                categories.map(c => (
                  <tr key={c._id} className="pos-grid-row">
                    <td className="px-4 py-4 text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <Layers size={15} className="text-brand-500" />
                      <span>{c.name}</span>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-500">
                      {c.description || 'No description logged'}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openCategoryModal(c)}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 hover:text-brand-500 transition-colors"
                          title="Edit Category"
                        >
                          <Edit size={14} />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleCategoryDelete(c._id)}
                            className="p-2 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl text-slate-400 hover:text-rose-500 transition-colors"
                            title="Delete Category"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="text-center py-20 text-slate-400">
                    No categories logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. BRANDS TAB CONTENT */}
      {activeTab === 'brands' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl shadow-sm overflow-hidden max-w-4xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="pos-grid-header">Brand Name</th>
                <th className="pos-grid-header">Description</th>
                <th className="pos-grid-header text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {brands.length > 0 ? (
                brands.map(b => (
                  <tr key={b._id} className="pos-grid-row">
                    <td className="px-4 py-4 text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <Tag size={15} className="text-brand-500" />
                      <span>{b.name}</span>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-500">
                      {b.description || 'No description logged'}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openBrandModal(b)}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 hover:text-brand-500 transition-colors"
                          title="Edit Brand"
                        >
                          <Edit size={14} />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleBrandDelete(b._id)}
                            className="p-2 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl text-slate-400 hover:text-rose-500 transition-colors"
                            title="Delete Brand"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="text-center py-20 text-slate-400">
                    No brands logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* PRODUCT CREATE / EDIT MODAL */}
      {productModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleProductSubmit}
            className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 flex flex-col gap-4 overflow-y-auto max-h-[90vh] animate-scaleUp text-slate-800 dark:text-slate-200"
          >
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Package size={20} className="text-brand-500" />
                <span>{editProduct ? 'Edit Catalog Entry' : 'Create New Product'}</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setProductModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Inputs grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Product Name*</label>
                <input
                  type="text"
                  placeholder="e.g. Samsung Galaxy S24 Ultra"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Model Number</label>
                <input
                  type="text"
                  placeholder="e.g. SM-S928B"
                  value={modelNumber}
                  onChange={(e) => setModelNumber(e.target.value)}
                  className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SKU / Item Code</label>
                <input
                  type="text"
                  placeholder="Auto-generated if empty"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Barcode</label>
                <input
                  type="text"
                  placeholder="Scan or enter barcode"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Category*</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none cursor-pointer focus:border-brand-500 text-slate-900 dark:text-white"
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Brand*</label>
                <select
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none cursor-pointer focus:border-brand-500 text-slate-900 dark:text-white"
                  required
                >
                  <option value="">Select Brand</option>
                  {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
              </div>

              {/* Price Calculations */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl grid grid-cols-3 gap-3 col-span-2 border border-slate-200/40 dark:border-slate-800">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">MRP (₹)*</label>
                  <input
                    type="number"
                    value={mrp}
                    onChange={(e) => setMrp(Number(e.target.value))}
                    className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                    required
                    min={0}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Selling Price (₹)*</label>
                  <input
                    type="number"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(Number(e.target.value))}
                    className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                    min={0}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Purchase Cost (₹)</label>
                  <input
                    type="number"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(Number(e.target.value))}
                    className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                    min={0}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 col-span-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">GST Rate (%)*</label>
                  <select
                    value={gstRate}
                    onChange={(e) => setGstRate(Number(e.target.value))}
                    className="px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none cursor-pointer focus:border-brand-500 text-slate-900 dark:text-white"
                  >
                    <option value={18}>18% GST (Standard)</option>
                    <option value={28}>28% GST (Luxury TVs/ACs)</option>
                    <option value={12}>12% GST</option>
                    <option value={5}>5% GST</option>
                    <option value={0}>Exempt (0%)</option>
                  </select>
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Stock Count*</label>
                  <input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(Number(e.target.value))}
                    disabled={hasIMEI}
                    className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 disabled:bg-slate-200/50 disabled:dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                    required
                    min={0}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Low Stock Alert</label>
                  <input
                    type="number"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                    className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                    min={1}
                  />
                </div>
              </div>

              {/* IMEI/Serial Toggle Block */}
              <div className="col-span-2 p-4 bg-cyan-500/5 border border-cyan-500/10 rounded-2xl flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5"><Barcode size={14} /> Serial / IMEI Tracking System</span>
                    <span className="text-[10px] text-slate-400">Activate for smartphones, laptops, and tablets</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasIMEI}
                      onChange={(e) => setHasIMEI(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-cyan-500"></div>
                  </label>
                </div>

                {hasIMEI && (
                  <div className="flex flex-col gap-1 animate-scaleUp">
                    <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">IMEI Codes (Comma Separated)*</label>
                    <textarea
                      placeholder="e.g. 869032123456789, 869032123456788"
                      value={imeiString}
                      onChange={(e) => setImeiString(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-cyan-500 h-20 placeholder-slate-400 text-slate-900 dark:text-white"
                    />
                    <span className="text-[9px] text-cyan-600 dark:text-cyan-400 font-bold">
                      {imeiString.split(',').map(i => i.trim()).filter(i => i.length > 0).length} IMEIs parsed. This count overrides the Stock Input.
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Product Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-brand-500 h-16 text-slate-900 dark:text-white"
                  placeholder="Optional product description or warranty notes"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-6 justify-end">
              <button
                type="button"
                onClick={() => setProductModal(false)}
                className="px-5 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-bold text-xs uppercase transition-colors"
              >
                Discard
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-brand-500 hover:bg-brand-600 rounded-2xl text-xs font-bold uppercase text-white shadow-lg shadow-brand-500/10 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CATEGORY CREATE / EDIT MODAL */}
      {categoryModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleCategorySubmit}
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 flex flex-col gap-4 animate-scaleUp text-slate-800 dark:text-slate-200"
          >
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Layers size={18} className="text-brand-500" />
                <span>{editCategory ? 'Edit Category' : 'Create Category'}</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setCategoryModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Category Name*</label>
              <input
                type="text"
                placeholder="e.g. Smartphones, Televisions"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Description</label>
              <textarea
                placeholder="Optional category description"
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                rows={2}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-brand-500 text-slate-900 dark:text-white resize-none"
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setCategoryModal(false)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs uppercase transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold text-xs uppercase transition-colors"
              >
                {editCategory ? 'Save Changes' : 'Create Category'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* BRAND CREATE / EDIT MODAL */}
      {brandModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleBrandSubmit}
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 flex flex-col gap-4 animate-scaleUp text-slate-800 dark:text-slate-200"
          >
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Tag size={18} className="text-brand-500" />
                <span>{editBrand ? 'Edit Brand' : 'Create Brand'}</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setBrandModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Brand Name*</label>
              <input
                type="text"
                placeholder="e.g. Samsung, Apple, Sony"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Description</label>
              <textarea
                placeholder="Optional brand description"
                value={brandDesc}
                onChange={(e) => setBrandDesc(e.target.value)}
                rows={2}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-brand-500 text-slate-900 dark:text-white resize-none"
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setBrandModal(false)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs uppercase transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold text-xs uppercase transition-colors"
              >
                {editBrand ? 'Save Changes' : 'Create Brand'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default Inventory;
