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
  RefreshCw
} from 'lucide-react';

const Inventory: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  // Navigation tabs
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
  const [imeiString, setImeiString] = useState(''); // Comma separated for bulk entry
  const [warrantyMonths, setWarrantyMonths] = useState(12);

  // Form Fields: Category & Brand
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [brandName, setBrandName] = useState('');
  const [brandDesc, setBrandDesc] = useState('');

  // Fetch collections on load
  const fetchProducts = async () => {
    try {
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

  // Debounced search keying
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
      setMrp(prod.mrp);
      setPurchasePrice(prod.purchasePrice);
      setSellingPrice(prod.sellingPrice);
      setGstRate(prod.gstRate);
      setStock(prod.stock);
      setLowStockThreshold(prod.lowStockThreshold);
      setHasIMEI(prod.hasIMEI);
      setImeiString(prod.imeiList.join(', '));
      setWarrantyMonths(prod.warrantyMonths);
    } else {
      // Clear forms
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

    // Parse IMEIs
    const imeiList = hasIMEI 
      ? imeiString.split(',').map(i => i.trim()).filter(i => i.length > 0) 
      : [];

    const payload = {
      name,
      modelNumber,
      sku,
      barcode: barcode || undefined,
      category,
      brand,
      description,
      mrp,
      purchasePrice,
      sellingPrice,
      gstRate,
      stock: hasIMEI ? imeiList.length : stock,
      lowStockThreshold,
      hasIMEI,
      imeiList,
      warrantyMonths
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

  // Category Forms Submit
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editCategory) {
        await api.put(`/categories/${editCategory._id}`, { name: catName, description: catDesc });
        showSuccess('Category updated successfully!');
      } else {
        await api.post('/categories', { name: catName, description: catDesc });
        showSuccess('Category created successfully!');
      }
      setCategoryModal(false);
      setCatName('');
      setCatDesc('');
      setEditCategory(null);
      fetchLists();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Save failed');
    }
  };

  // Brand Forms Submit
  const handleBrandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editBrand) {
        await api.put(`/brands/${editBrand._id}`, { name: brandName, description: brandDesc });
        showSuccess('Brand updated successfully!');
      } else {
        await api.post('/brands', { name: brandName, description: brandDesc });
        showSuccess('Brand created successfully!');
      }
      setBrandModal(false);
      setBrandName('');
      setBrandDesc('');
      setEditBrand(null);
      fetchLists();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Save failed');
    }
  };

  return (
    <div className="flex-1 p-8 bg-slate-50 dark:bg-slate-950 overflow-y-auto h-screen transition-colors duration-200">
      
      {/* Header controls */}
      <header className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-sans">Inventory Hub</h2>
          <p className="text-slate-500 text-sm">Organize products, brands, categories, and physical stocks.</p>
        </div>

        <div className="flex gap-3">
          {/* Tab selectors */}
          <div className="bg-slate-200/60 dark:bg-slate-900 p-1.5 rounded-2xl flex border border-slate-300/40 dark:border-slate-800">
            <button 
              onClick={() => setActiveTab('products')}
              className={`px-4 py-2 text-xs font-bold uppercase rounded-xl transition-all ${activeTab === 'products' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              Products
            </button>
            <button 
              onClick={() => setActiveTab('categories')}
              className={`px-4 py-2 text-xs font-bold uppercase rounded-xl transition-all ${activeTab === 'categories' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              Categories
            </button>
            <button 
              onClick={() => setActiveTab('brands')}
              className={`px-4 py-2 text-xs font-bold uppercase rounded-xl transition-all ${activeTab === 'brands' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              Brands
            </button>
          </div>

          {isAdmin && (
            <button
              onClick={() => activeTab === 'products' ? openProductModal() : activeTab === 'categories' ? setCategoryModal(true) : setBrandModal(true)}
              className="px-5 py-3 bg-brand-500 hover:bg-brand-600 rounded-2xl text-xs font-extrabold uppercase text-white shadow-lg shadow-brand-500/20 active:scale-[0.98] transition-all flex items-center gap-2"
            >
              <Plus size={14} />
              <span>Add {activeTab.slice(0, -1)}</span>
            </button>
          )}
        </div>
      </header>

      {/* PRODUCTS TAB CONTENT */}
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
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                />
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>

              {/* Category selector */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-600 dark:text-slate-400 outline-none cursor-pointer"
              >
                <option value="">All Categories</option>
                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>

              {/* Brand selector */}
              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="px-3 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-600 dark:text-slate-400 outline-none cursor-pointer"
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
                  <th className="pos-grid-header">Name</th>
                  <th className="pos-grid-header">Category</th>
                  <th className="pos-grid-header">Brand</th>
                  <th className="pos-grid-header text-right">Selling Price</th>
                  <th className="pos-grid-header text-center">In Stock</th>
                  <th className="pos-grid-header text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {products.length > 0 ? (
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
                      <td className="px-4 py-4 text-right font-black text-sm text-slate-900 dark:text-white">
                        ₹{prod.sellingPrice.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${prod.stock <= prod.lowStockThreshold ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'}`}>
                            {prod.stock} Units
                          </span>
                          {prod.stock <= prod.lowStockThreshold && (
                            <span className="stock-pulse"><span className="stock-pulse-dot"></span><span className="stock-pulse-core"></span></span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {isAdmin && (
                          <div className="flex items-center justify-center gap-1.5">
                            <button 
                              onClick={() => openProductModal(prod)}
                              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition-colors"
                            >
                              <Edit size={14} />
                            </button>
                            <button 
                              onClick={() => handleProductDelete(prod._id)}
                              className="p-2 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl text-rose-500 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-20 text-slate-400 dark:text-slate-600">
                      No products found. Add items to database.
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

      {/* CATEGORIES TAB CONTENT */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {categories.map(cat => (
            <div key={cat._id} className="p-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex flex-col gap-2">
                <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl w-fit">
                  <Layers size={18} />
                </div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-tight">{cat.name}</h3>
                <p className="text-xs text-slate-400 leading-relaxed truncate">{cat.description || 'No description provided.'}</p>
              </div>
              <div className="flex gap-2.5 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 justify-end">
                {isAdmin && (
                  <button
                    onClick={() => { setEditCategory(cat); setCatName(cat.name); setCatDesc(cat.description || ''); setCategoryModal(true); }}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition-all"
                  >
                    <Edit size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* BRANDS TAB CONTENT */}
      {activeTab === 'brands' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {brands.map(br => (
            <div key={br._id} className="p-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex flex-col gap-2">
                <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl w-fit">
                  <Tag size={18} />
                </div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-tight">{br.name}</h3>
                <p className="text-xs text-slate-400 leading-relaxed truncate">{br.description || 'No description provided.'}</p>
              </div>
              <div className="flex gap-2.5 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 justify-end">
                {isAdmin && (
                  <button
                    onClick={() => { setEditBrand(br); setBrandName(br.name); setBrandDesc(br.description || ''); setBrandModal(true); }}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition-all"
                  >
                    <Edit size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PRODUCT FORM MODAL */}
      {productModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleProductSubmit}
            className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 flex flex-col gap-4 overflow-y-auto max-h-[90vh] animate-scaleUp text-slate-800 dark:text-slate-200"
          >
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              {editProduct ? 'Edit Catalog Entry' : 'Create New Product'}
            </h3>

            {/* Inputs grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Product Name*</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-brand-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SKU Code*</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-brand-500"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Barcode</label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Model Number</label>
                <input
                  type="text"
                  value={modelNumber}
                  onChange={(e) => setModelNumber(e.target.value)}
                  className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Category*</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none cursor-pointer"
                    required
                  >
                    {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Brand*</label>
                  <select
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none cursor-pointer"
                    required
                  >
                    {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Price Calculations */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl grid grid-cols-3 gap-3 col-span-2 border border-slate-200/40 dark:border-slate-800">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">MRP (INR)*</label>
                  <input
                    type="number"
                    value={mrp}
                    onChange={(e) => setMrp(Number(e.target.value))}
                    className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-brand-500"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Purchase Price*</label>
                  <input
                    type="number"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(Number(e.target.value))}
                    className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-brand-500"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Selling Price*</label>
                  <input
                    type="number"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(Number(e.target.value))}
                    className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-brand-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 col-span-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">GST Rate (%)*</label>
                  <select
                    value={gstRate}
                    onChange={(e) => setGstRate(Number(e.target.value))}
                    className="px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none cursor-pointer"
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
                    disabled={hasIMEI} // Block simple count if IMEI codes are loaded
                    className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 disabled:bg-slate-200/50 disabled:dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-brand-500"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Warranty (Months)</label>
                  <input
                    type="number"
                    value={warrantyMonths}
                    onChange={(e) => setWarrantyMonths(Number(e.target.value))}
                    className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {/* IMEI/Serial Toggle Block */}
              <div className="col-span-2 p-4 bg-cyan-500/5 border border-cyan-500/10 rounded-2xl flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5"><Barcode size={14} /> Serial / IMEI Tracking System</span>
                    <span className="text-[10px] text-slate-400">Activate for mobile phones, laptops, and tablets</span>
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
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-cyan-500 h-20 placeholder-slate-400"
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
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-brand-500 h-16"
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

      {/* CATEGORY DIALOG MODAL */}
      {categoryModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleCategorySubmit}
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 flex flex-col gap-4 animate-scaleUp text-slate-800 dark:text-slate-200"
          >
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              {editCategory ? 'Edit Category' : 'Create Category'}
            </h3>
            
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Category Name*</label>
              <input
                type="text"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-brand-500"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Description</label>
              <textarea
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-brand-500 h-20"
              />
            </div>

            <div className="flex gap-3 justify-end mt-4">
              <button
                type="button"
                onClick={() => { setCategoryModal(false); setEditCategory(null); }}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs uppercase"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold text-xs uppercase"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {/* BRAND DIALOG MODAL */}
      {brandModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleBrandSubmit}
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 flex flex-col gap-4 animate-scaleUp text-slate-800 dark:text-slate-200"
          >
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              {editBrand ? 'Edit Brand' : 'Create Brand'}
            </h3>
            
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Brand Name*</label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-brand-500"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Description</label>
              <textarea
                value={brandDesc}
                onChange={(e) => setBrandDesc(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-brand-500 h-20"
              />
            </div>

            <div className="flex gap-3 justify-end mt-4">
              <button
                type="button"
                onClick={() => { setBrandModal(false); setEditBrand(null); }}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs uppercase"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold text-xs uppercase"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TOAST NOTIFICATIONS */}
      {errorMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3.5 bg-rose-500 text-white rounded-2xl shadow-2xl shadow-rose-500/30 text-sm font-bold flex items-center gap-3 animate-scaleUp">
          <span className="text-base">⚠</span>
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="ml-2 text-white/70 hover:text-white font-black text-xs">✕</button>
        </div>
      )}
      {successMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3.5 bg-emerald-500 text-white rounded-2xl shadow-2xl shadow-emerald-500/30 text-sm font-bold flex items-center gap-3 animate-scaleUp">
          <span className="text-base">✓</span>
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="ml-2 text-white/70 hover:text-white font-black text-xs">✕</button>
        </div>
      )}

    </div>
  );
};

export default Inventory;
