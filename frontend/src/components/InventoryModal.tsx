import React, { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import { Product, Category } from '../types';
import { 
  X, 
  Search, 
  Filter, 
  Boxes, 
  RotateCcw, 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight, 
  Download,
  AlertTriangle,
  CheckCircle2,
  PackageX
} from 'lucide-react';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SortField = 'name' | 'stock' | 'purchasePrice';
type SortOrder = 'asc' | 'desc';

const InventoryModal: React.FC<InventoryModalProps> = ({ isOpen, onClose }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [nameSearch, setNameSearch] = useState<string>('');
  const [stockStatus, setStockStatus] = useState<'all' | 'inStock' | 'lowStock' | 'outOfStock'>('all');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Fetch products and categories when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [prodRes, catRes] = await Promise.all([
          api.get('/products?limit=1000'),
          api.get('/categories')
        ]);

        if (prodRes.data?.success) {
          setProducts(prodRes.data.data.products || []);
        }
        if (catRes.data?.success) {
          setCategories(catRes.data.data || []);
        }
      } catch (err: any) {
        console.error('Failed to load inventory details:', err);
        setError(err.response?.data?.message || 'Failed to load inventory data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset page when any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedProduct, nameSearch, stockStatus, pageSize]);

  // Products available in the product dropdown (can be filtered by selected category)
  const productDropdownList = useMemo(() => {
    if (!selectedCategory) return products;
    return products.filter((p) => {
      const catId = typeof p.category === 'object' && p.category !== null ? p.category._id : p.category;
      return catId === selectedCategory;
    });
  }, [products, selectedCategory]);

  // Filtered & Sorted products list
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // 1. Category Filter
        if (selectedCategory) {
          const catId = typeof p.category === 'object' && p.category !== null ? p.category._id : p.category;
          if (catId !== selectedCategory) return false;
        }

        // 2. Specific Product Dropdown Filter
        if (selectedProduct) {
          if (p._id !== selectedProduct) return false;
        }

        // 3. Name Search Filter (matches name, SKU, or model)
        if (nameSearch.trim()) {
          const term = nameSearch.toLowerCase().trim();
          const matchesName = p.name?.toLowerCase().includes(term);
          const matchesSku = p.sku?.toLowerCase().includes(term);
          const matchesModel = p.modelNumber?.toLowerCase().includes(term);
          if (!matchesName && !matchesSku && !matchesModel) return false;
        }

        // 4. Stock status filter
        if (stockStatus === 'outOfStock') {
          return p.stock === 0;
        } else if (stockStatus === 'lowStock') {
          return p.stock > 0 && p.stock <= (p.lowStockThreshold || 5);
        } else if (stockStatus === 'inStock') {
          return p.stock > 0;
        }

        return true;
      })
      .sort((a, b) => {
        let aVal: any = a[sortField];
        let bVal: any = b[sortField];

        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = (bVal || '').toLowerCase();
        }

        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [products, selectedCategory, selectedProduct, nameSearch, stockStatus, sortField, sortOrder]);

  // Aggregated calculations for filtered results
  const metrics = useMemo(() => {
    const totalItems = filteredProducts.length;
    const totalQuantity = filteredProducts.reduce((sum, p) => sum + (p.stock || 0), 0);
    const totalPurchaseValuation = filteredProducts.reduce(
      (sum, p) => sum + ((p.stock || 0) * (p.purchasePrice || 0)), 
      0
    );
    const lowStockCount = filteredProducts.filter(
      (p) => p.stock > 0 && p.stock <= (p.lowStockThreshold || 5)
    ).length;
    const outOfStockCount = filteredProducts.filter((p) => p.stock === 0).length;

    return {
      totalItems,
      totalQuantity,
      totalPurchaseValuation,
      lowStockCount,
      outOfStockCount
    };
  }, [filteredProducts]);

  // Paginated records
  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleResetFilters = () => {
    setSelectedCategory('');
    setSelectedProduct('');
    setNameSearch('');
    setStockStatus('all');
    setCurrentPage(1);
  };

  // Export filtered products to CSV
  const handleExportCSV = () => {
    if (filteredProducts.length === 0) return;

    const headers = ['Product Name', 'SKU', 'Category', 'Available Quantity', 'Purchase Price', 'Total Valuation'];
    const rows = filteredProducts.map((p) => {
      const catName = typeof p.category === 'object' && p.category !== null ? p.category.name : 'Uncategorized';
      return [
        `"${p.name.replace(/"/g, '""')}"`,
        `"${(p.sku || '').replace(/"/g, '""')}"`,
        `"${catName.replace(/"/g, '""')}"`,
        p.stock || 0,
        p.purchasePrice || 0,
        (p.stock || 0) * (p.purchasePrice || 0)
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `inventory_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 md:p-8 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-6xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden transition-all duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-850">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 rounded-2xl border border-brand-500/20">
              <Boxes size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-xl font-black text-slate-900 dark:text-white font-sans tracking-tight">
                  Inventory Stock Table
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
                  {filteredProducts.length} {filteredProducts.length === 1 ? 'Product' : 'Products'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Detailed inventory catalog with real-time stock quantities and purchase prices.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={filteredProducts.length === 0}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all disabled:opacity-50"
              title="Export filtered records to CSV"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              title="Close (Esc)"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Quick KPI stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-3.5 bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800/80 text-xs">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Available Stock</span>
            <span className="text-base font-extrabold text-slate-900 dark:text-white">
              {metrics.totalQuantity.toLocaleString('en-IN')} <span className="text-xs font-normal text-slate-400">units</span>
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Purchase Valuation</span>
            <span className="text-base font-extrabold text-brand-600 dark:text-brand-400">
              ₹{metrics.totalPurchaseValuation.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Low Stock Alert</span>
            <span className={`text-base font-extrabold ${metrics.lowStockCount > 0 ? 'text-amber-500' : 'text-slate-700 dark:text-slate-300'}`}>
              {metrics.lowStockCount} <span className="text-xs font-normal text-slate-400">items</span>
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Out of Stock</span>
            <span className={`text-base font-extrabold ${metrics.outOfStockCount > 0 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}`}>
              {metrics.outOfStockCount} <span className="text-xs font-normal text-slate-400">items</span>
            </span>
          </div>
        </div>

        {/* Filters Bar: Category, Product, Name */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col gap-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Filter by Category */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Filter size={12} className="text-brand-500" />
                <span>Filter by Category</span>
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedProduct(''); // reset specific product when category switches
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all cursor-pointer"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Specific Product */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Boxes size={12} className="text-indigo-500" />
                <span>Filter by Product</span>
              </label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all cursor-pointer"
              >
                <option value="">All Products ({productDropdownList.length})</option>
                {productDropdownList.map((prod) => (
                  <option key={prod._id} value={prod._id}>
                    {prod.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Name of the Product */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Search size={12} className="text-emerald-500" />
                <span>Search Product Name / SKU</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Type product name, SKU or model..."
                  value={nameSearch}
                  onChange={(e) => setNameSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                />
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                {nameSearch && (
                  <button
                    onClick={() => setNameSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Secondary filter chips & Reset */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 mr-1">Stock Status:</span>
              <button
                type="button"
                onClick={() => setStockStatus('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  stockStatus === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStockStatus('inStock')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  stockStatus === 'inStock'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                In Stock
              </button>
              <button
                type="button"
                onClick={() => setStockStatus('lowStock')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  stockStatus === 'lowStock'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                Low Stock
              </button>
              <button
                type="button"
                onClick={() => setStockStatus('outOfStock')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  stockStatus === 'outOfStock'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                Out of Stock
              </button>
            </div>

            {(selectedCategory || selectedProduct || nameSearch || stockStatus !== 'all') && (
              <button
                onClick={handleResetFilters}
                className="px-3 py-1 text-xs font-bold text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/50 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw size={12} />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Table Content Area */}
        <div className="flex-1 overflow-y-auto min-h-[300px] max-h-[50vh]">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-semibold text-slate-500">Loading inventory catalog...</p>
            </div>
          ) : error ? (
            <div className="py-16 flex flex-col items-center justify-center text-rose-500 gap-2">
              <AlertTriangle size={32} />
              <p className="text-sm font-bold">{error}</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full">
                <PackageX size={36} className="text-slate-400" />
              </div>
              <div className="text-center">
                <p className="text-base font-extrabold text-slate-700 dark:text-slate-200">No products found</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  No inventory items match the current category, product, or search filters.
                </p>
              </div>
              {(selectedCategory || selectedProduct || nameSearch || stockStatus !== 'all') && (
                <button
                  onClick={handleResetFilters}
                  className="mt-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-brand-500/20"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-100/90 dark:bg-slate-850/90 backdrop-blur-sm z-10 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th 
                    className="py-3.5 px-4 cursor-pointer hover:text-brand-600 dark:hover:text-brand-400 transition-colors select-none"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Product Name</span>
                      <ArrowUpDown size={12} className={sortField === 'name' ? 'text-brand-500' : 'text-slate-400'} />
                    </div>
                  </th>
                  <th className="py-3.5 px-4">Category</th>
                  <th 
                    className="py-3.5 px-4 text-center cursor-pointer hover:text-brand-600 dark:hover:text-brand-400 transition-colors select-none"
                    onClick={() => handleSort('stock')}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Available Quantity</span>
                      <ArrowUpDown size={12} className={sortField === 'stock' ? 'text-brand-500' : 'text-slate-400'} />
                    </div>
                  </th>
                  <th 
                    className="py-3.5 px-4 text-right cursor-pointer hover:text-brand-600 dark:hover:text-brand-400 transition-colors select-none"
                    onClick={() => handleSort('purchasePrice')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Purchase Price</span>
                      <ArrowUpDown size={12} className={sortField === 'purchasePrice' ? 'text-brand-500' : 'text-slate-400'} />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-right">Total Valuation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {paginatedProducts.map((p, idx) => {
                  const globalIdx = (currentPage - 1) * pageSize + idx + 1;
                  const categoryName = typeof p.category === 'object' && p.category !== null ? p.category.name : 'General';
                  const isOutOfStock = p.stock === 0;
                  const isLowStock = p.stock > 0 && p.stock <= (p.lowStockThreshold || 5);
                  const itemValuation = (p.stock || 0) * (p.purchasePrice || 0);

                  return (
                    <tr 
                      key={p._id} 
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors duration-150"
                    >
                      <td className="py-3.5 px-4 text-center font-bold text-slate-400 dark:text-slate-500">
                        {globalIdx}
                      </td>

                      {/* Product Name Column */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-extrabold text-slate-900 dark:text-white leading-snug">
                            {p.name}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                            {p.sku && <span>SKU: <span className="font-mono">{p.sku}</span></span>}
                            {p.modelNumber && <span>• Model: {p.modelNumber}</span>}
                            {p.hasIMEI && (
                              <span className="px-1.5 py-0.2 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold rounded text-[10px]">
                                IMEI
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category Column */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                          {categoryName}
                        </span>
                      </td>

                      {/* Available Product Quantity Column */}
                      <td className="py-3.5 px-4 text-center">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-black bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            0 Units (Out of Stock)
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-black bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            {p.stock} Units (Low Stock)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            {p.stock} Units
                          </span>
                        )}
                      </td>

                      {/* Purchase Price Column */}
                      <td className="py-3.5 px-4 text-right font-black text-slate-900 dark:text-white font-mono text-xs">
                        ₹{(p.purchasePrice || 0).toLocaleString('en-IN')}
                      </td>

                      {/* Total Valuation Column */}
                      <td className="py-3.5 px-4 text-right font-black text-brand-600 dark:text-brand-400 font-mono text-xs">
                        ₹{itemValuation.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer with Pagination and Page Size */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
            <span>
              Showing <span className="font-bold text-slate-900 dark:text-white">
                {filteredProducts.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
              </span> to <span className="font-bold text-slate-900 dark:text-white">
                {Math.min(currentPage * pageSize, filteredProducts.length)}
              </span> of <span className="font-bold text-slate-900 dark:text-white">{filteredProducts.length}</span> entries
            </span>

            <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200 dark:border-slate-700">
              <span className="text-[11px]">Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 transition-colors"
              title="Previous Page"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 py-1 font-bold text-slate-700 dark:text-slate-200">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 transition-colors"
              title="Next Page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryModal;
