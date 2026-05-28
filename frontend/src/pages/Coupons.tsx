import React, { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Coupon, Brand, Category, Product } from '../types';
import {
  Ticket,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Percent,
  DollarSign,
  Calendar,
  Tag,
  ToggleLeft,
  ToggleRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Filter
} from 'lucide-react';

type StatusFilter = 'all' | 'active' | 'expired' | 'inactive';

const Coupons: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Data
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Modal
  const [modal, setModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDiscountType, setFormDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [formDiscountValue, setFormDiscountValue] = useState('');
  const [formMinPurchase, setFormMinPurchase] = useState('');
  const [formMaxDiscount, setFormMaxDiscount] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formBrandScope, setFormBrandScope] = useState('');
  const [formCategoryScope, setFormCategoryScope] = useState('');
  const [formProductScope, setFormProductScope] = useState('');

  // Toast
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

  // --- Data Fetching ---
  const fetchCoupons = async () => {
    try {
      const { data } = await api.get('/coupons');
      if (data.success) setCoupons(data.data);
    } catch (err) {
      console.error('Failed to fetch coupons', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchScopeData = async () => {
    try {
      const [brandsRes, categoriesRes, productsRes] = await Promise.all([
        api.get('/brands'),
        api.get('/categories'),
        api.get('/products?limit=1000')
      ]);
      if (brandsRes.data.success) setBrands(brandsRes.data.data);
      if (categoriesRes.data.success) setCategories(categoriesRes.data.data);
      if (productsRes.data.success) setProducts(productsRes.data.data.products || []);
    } catch (err) {
      console.error('Failed to fetch scope data', err);
    }
  };

  useEffect(() => {
    fetchCoupons();
    fetchScopeData();
  }, []);

  // --- Coupon Status Helpers ---
  const getCouponStatus = (coupon: Coupon): 'active' | 'expired' | 'inactive' | 'scheduled' => {
    if (!coupon.isActive) return 'inactive';
    const now = new Date();
    const expiry = new Date(coupon.expiryDate);
    const start = coupon.startDate ? new Date(coupon.startDate) : null;
    if (expiry < now) return 'expired';
    if (start && start > now) return 'scheduled';
    return 'active';
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      active: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', icon: <CheckCircle2 size={12} /> },
      expired: { bg: 'bg-rose-500/15', text: 'text-rose-400', icon: <XCircle size={12} /> },
      inactive: { bg: 'bg-slate-500/15', text: 'text-slate-400', icon: <ToggleLeft size={12} /> },
      scheduled: { bg: 'bg-amber-500/15', text: 'text-amber-400', icon: <Clock size={12} /> }
    };
    const s = map[status] || map.inactive;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${s.bg} ${s.text}`}>
        {s.icon} {status}
      </span>
    );
  };

  // --- Filtering ---
  const filteredCoupons = useMemo(() => {
    return coupons.filter(c => {
      const matchesSearch =
        c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.description || '').toLowerCase().includes(searchTerm.toLowerCase());

      const status = getCouponStatus(c);
      const matchesStatus = statusFilter === 'all' || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [coupons, searchTerm, statusFilter]);

  // --- Stats ---
  const stats = useMemo(() => {
    const active = coupons.filter(c => getCouponStatus(c) === 'active').length;
    const expired = coupons.filter(c => getCouponStatus(c) === 'expired').length;
    const scheduled = coupons.filter(c => getCouponStatus(c) === 'scheduled').length;
    return { total: coupons.length, active, expired, scheduled };
  }, [coupons]);

  // --- Form Handling ---
  const resetForm = () => {
    setFormCode('');
    setFormDescription('');
    setFormDiscountType('percentage');
    setFormDiscountValue('');
    setFormMinPurchase('');
    setFormMaxDiscount('');
    setFormStartDate('');
    setFormExpiryDate('');
    setFormIsActive(true);
    setFormBrandScope('');
    setFormCategoryScope('');
    setFormProductScope('');
    setEditingCoupon(null);
  };

  const openCreateModal = () => {
    resetForm();
    // Set default start date to today
    setFormStartDate(new Date().toISOString().split('T')[0]);
    setModal(true);
  };

  const openEditModal = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormCode(coupon.code);
    setFormDescription(coupon.description || '');
    setFormDiscountType(coupon.discountType);
    setFormDiscountValue(String(coupon.discountValue));
    setFormMinPurchase(coupon.minPurchaseAmount ? String(coupon.minPurchaseAmount) : '');
    setFormMaxDiscount(coupon.maxDiscountAmount ? String(coupon.maxDiscountAmount) : '');
    setFormStartDate(coupon.startDate ? new Date(coupon.startDate).toISOString().split('T')[0] : '');
    setFormExpiryDate(new Date(coupon.expiryDate).toISOString().split('T')[0]);
    setFormIsActive(coupon.isActive);
    setFormBrandScope(coupon.brandScope && typeof coupon.brandScope === 'object' ? coupon.brandScope._id : (coupon.brandScope as string) || '');
    setFormCategoryScope(coupon.categoryScope && typeof coupon.categoryScope === 'object' ? coupon.categoryScope._id : (coupon.categoryScope as string) || '');
    setFormProductScope(coupon.productScope && typeof coupon.productScope === 'object' ? coupon.productScope._id : (coupon.productScope as string) || '');
    setModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formCode.trim()) return showError('Coupon code is required');
    if (!formDiscountValue || Number(formDiscountValue) <= 0) return showError('Valid discount value is required');
    if (!formExpiryDate) return showError('Expiry date is required');
    if (formDiscountType === 'percentage' && Number(formDiscountValue) > 100) return showError('Percentage discount cannot exceed 100%');

    const payload: any = {
      code: formCode.trim().toUpperCase(),
      description: formDescription.trim(),
      discountType: formDiscountType,
      discountValue: Number(formDiscountValue),
      minPurchaseAmount: formMinPurchase ? Number(formMinPurchase) : 0,
      maxDiscountAmount: formMaxDiscount ? Number(formMaxDiscount) : null,
      startDate: formStartDate || undefined,
      expiryDate: formExpiryDate,
      isActive: formIsActive,
      brandScope: formBrandScope || null,
      categoryScope: formCategoryScope || null,
      productScope: formProductScope || null
    };

    try {
      if (editingCoupon) {
        const { data } = await api.put(`/coupons/${editingCoupon._id}`, payload);
        if (data.success) {
          showSuccess('Coupon updated successfully!');
          setModal(false);
          resetForm();
          fetchCoupons();
        }
      } else {
        const { data } = await api.post('/coupons', payload);
        if (data.success) {
          showSuccess('Coupon created successfully!');
          setModal(false);
          resetForm();
          fetchCoupons();
        }
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to save coupon');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { data } = await api.delete(`/coupons/${id}`);
      if (data.success) {
        showSuccess('Coupon deleted successfully!');
        setDeleteConfirm(null);
        fetchCoupons();
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to delete coupon');
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    try {
      const { data } = await api.put(`/coupons/${coupon._id}`, { isActive: !coupon.isActive });
      if (data.success) {
        showSuccess(`Coupon ${!coupon.isActive ? 'activated' : 'deactivated'} successfully!`);
        fetchCoupons();
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to toggle coupon');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  const getScopeName = (scope: any): string => {
    if (!scope) return '';
    if (typeof scope === 'object' && scope.name) return scope.name;
    return '';
  };

  // --- Render ---
  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Toast Notifications */}
      {errorMsg && (
        <div className="fixed top-5 right-5 z-[9999] flex items-center gap-2 bg-rose-600 text-white px-5 py-3 rounded-xl shadow-2xl shadow-rose-600/30 text-sm font-semibold animate-slide-in">
          <AlertTriangle size={16} /> {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="fixed top-5 right-5 z-[9999] flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl shadow-emerald-600/30 text-sm font-semibold animate-slide-in">
          <CheckCircle2 size={16} /> {successMsg}
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl text-white shadow-lg shadow-violet-500/25">
            <Ticket size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Coupons & Offers</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Manage discount coupons and promotional offers</p>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-violet-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-violet-500/30 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={16} /> Create Coupon
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Coupons', value: stats.total, icon: <Ticket size={18} />, gradient: 'from-violet-500 to-purple-600', shadow: 'shadow-violet-500/20' },
          { label: 'Active', value: stats.active, icon: <CheckCircle2 size={18} />, gradient: 'from-emerald-500 to-green-600', shadow: 'shadow-emerald-500/20' },
          { label: 'Expired', value: stats.expired, icon: <XCircle size={18} />, gradient: 'from-rose-500 to-red-600', shadow: 'shadow-rose-500/20' },
          { label: 'Scheduled', value: stats.scheduled, icon: <Clock size={18} />, gradient: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/20' }
        ].map(stat => (
          <div key={stat.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-4 hover:shadow-lg transition-shadow duration-200">
            <div className={`p-3 bg-gradient-to-br ${stat.gradient} rounded-xl text-white shadow-lg ${stat.shadow}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{stat.value}</p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by code or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          {(['all', 'active', 'expired', 'inactive'] as StatusFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-150 ${
                statusFilter === f
                  ? 'bg-violet-500 text-white shadow-md shadow-violet-500/25'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Coupons Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredCoupons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Ticket size={48} className="mb-3 opacity-30" />
            <p className="text-sm font-semibold">No coupons found</p>
            <p className="text-xs mt-1">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : isAdmin ? 'Create your first coupon to get started' : 'No coupons available'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                  <th className="text-left py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Code</th>
                  <th className="text-left py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Description</th>
                  <th className="text-left py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Discount</th>
                  <th className="text-left py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Min / Max</th>
                  <th className="text-left py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Scope</th>
                  <th className="text-left py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Valid Period</th>
                  <th className="text-left py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                  {isAdmin && (
                    <th className="text-right py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredCoupons.map((coupon, idx) => {
                  const status = getCouponStatus(coupon);
                  return (
                    <tr
                      key={coupon._id}
                      className={`border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${
                        idx % 2 === 0 ? '' : 'bg-slate-25 dark:bg-slate-950/20'
                      }`}
                    >
                      {/* Code */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 font-mono font-extrabold text-xs tracking-wider">
                          <Tag size={12} />
                          {coupon.code}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="py-3.5 px-4">
                        <span className="text-slate-700 dark:text-slate-300 text-sm max-w-[200px] truncate block">
                          {coupon.description || '—'}
                        </span>
                      </td>

                      {/* Discount */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          {coupon.discountType === 'percentage' ? (
                            <Percent size={13} className="text-emerald-500" />
                          ) : (
                            <span className="text-emerald-500 text-xs font-bold">₹</span>
                          )}
                          <span className="font-bold text-slate-900 dark:text-white">
                            {coupon.discountValue}
                            {coupon.discountType === 'percentage' ? '%' : ''}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium uppercase">
                            {coupon.discountType === 'percentage' ? 'off' : 'flat'}
                          </span>
                        </div>
                      </td>

                      {/* Min / Max */}
                      <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400">
                        <div className="space-y-0.5">
                          <div>Min: <span className="font-semibold text-slate-700 dark:text-slate-300">₹{coupon.minPurchaseAmount || 0}</span></div>
                          <div>Max: <span className="font-semibold text-slate-700 dark:text-slate-300">{coupon.maxDiscountAmount ? `₹${coupon.maxDiscountAmount}` : 'No limit'}</span></div>
                        </div>
                      </td>

                      {/* Scope */}
                      <td className="py-3.5 px-4">
                        {getScopeName(coupon.brandScope) || getScopeName(coupon.categoryScope) || getScopeName(coupon.productScope) ? (
                          <div className="space-y-0.5">
                            {getScopeName(coupon.brandScope) && (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-500 uppercase">Brand: {getScopeName(coupon.brandScope)}</span>
                            )}
                            {getScopeName(coupon.categoryScope) && (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 uppercase">Cat: {getScopeName(coupon.categoryScope)}</span>
                            )}
                            {getScopeName(coupon.productScope) && (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/10 text-teal-500 uppercase">Product: {getScopeName(coupon.productScope)}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-400 uppercase">Store-wide</span>
                        )}
                      </td>

                      {/* Valid Period */}
                      <td className="py-3.5 px-4">
                        <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                          <div className="flex items-center gap-1">
                            <Calendar size={10} />
                            <span>{coupon.startDate ? formatDate(coupon.startDate) : 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px]">to</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{formatDate(coupon.expiryDate)}</span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {getStatusBadge(status)}
                      </td>

                      {/* Actions (Admin Only) */}
                      {isAdmin && (
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Toggle Active */}
                            <button
                              onClick={() => handleToggleActive(coupon)}
                              title={coupon.isActive ? 'Deactivate' : 'Activate'}
                              className={`p-2 rounded-lg transition-colors ${
                                coupon.isActive
                                  ? 'text-emerald-500 hover:bg-emerald-500/10'
                                  : 'text-slate-400 hover:bg-slate-500/10'
                              }`}
                            >
                              {coupon.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                            </button>
                            {/* Edit */}
                            <button
                              onClick={() => openEditModal(coupon)}
                              className="p-2 rounded-lg text-blue-500 hover:bg-blue-500/10 transition-colors"
                              title="Edit coupon"
                            >
                              <Pencil size={14} />
                            </button>
                            {/* Delete */}
                            <button
                              onClick={() => setDeleteConfirm(coupon._id)}
                              className="p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                              title="Delete coupon"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center gap-4">
              <div className="p-3 bg-rose-500/10 rounded-full">
                <Trash2 size={24} className="text-rose-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Coupon?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">This action cannot be undone. The coupon will be permanently removed.</p>
              </div>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-rose-600/25 transition-all"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { setModal(false); resetForm(); }}>
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 rounded-t-2xl z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl text-white">
                  {editingCoupon ? <Pencil size={16} /> : <Plus size={16} />}
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
                </h2>
              </div>
              <button
                onClick={() => { setModal(false); resetForm(); }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-5">
              {/* Code & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Coupon Code *</label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={e => setFormCode(e.target.value.toUpperCase())}
                    placeholder="e.g. SUMMER25"
                    disabled={!!editingCoupon}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white font-mono font-bold tracking-wider placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 disabled:opacity-50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Description</label>
                  <input
                    type="text"
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                    placeholder="e.g. Summer sale 25% off"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all"
                  />
                </div>
              </div>

              {/* Discount Type & Value */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Discount Type *</label>
                  <select
                    value={formDiscountType}
                    onChange={e => setFormDiscountType(e.target.value as 'percentage' | 'fixed')}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Discount Value * {formDiscountType === 'percentage' ? '(%)' : '(₹)'}
                  </label>
                  <input
                    type="number"
                    value={formDiscountValue}
                    onChange={e => setFormDiscountValue(e.target.value)}
                    placeholder={formDiscountType === 'percentage' ? 'e.g. 25' : 'e.g. 500'}
                    min="0"
                    max={formDiscountType === 'percentage' ? '100' : undefined}
                    step="0.01"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all"
                  />
                </div>
              </div>

              {/* Min Purchase & Max Discount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Min Purchase Amount (₹)</label>
                  <input
                    type="number"
                    value={formMinPurchase}
                    onChange={e => setFormMinPurchase(e.target.value)}
                    placeholder="0 (no minimum)"
                    min="0"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Max Discount Cap (₹)</label>
                  <input
                    type="number"
                    value={formMaxDiscount}
                    onChange={e => setFormMaxDiscount(e.target.value)}
                    placeholder="No limit"
                    min="0"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={e => setFormStartDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Expiry Date *</label>
                  <input
                    type="date"
                    value={formExpiryDate}
                    onChange={e => setFormExpiryDate(e.target.value)}
                    min={formStartDate || undefined}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between py-3 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Active Status</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Enable or disable this coupon immediately</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormIsActive(!formIsActive)}
                  className={`p-1.5 rounded-lg transition-colors ${formIsActive ? 'text-emerald-500' : 'text-slate-400'}`}
                >
                  {formIsActive ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                </button>
              </div>

              {/* Scope Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-violet-500" />
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Scope Restrictions (Optional)</p>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 -mt-1">Leave all empty for store-wide coupon. Select one or more to restrict the discount to matching products only.</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Brand</label>
                    <select
                      value={formBrandScope}
                      onChange={e => setFormBrandScope(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all"
                    >
                      <option value="">All Brands</option>
                      {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Category</label>
                    <select
                      value={formCategoryScope}
                      onChange={e => setFormCategoryScope(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all"
                    >
                      <option value="">All Categories</option>
                      {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Product</label>
                    <select
                      value={formProductScope}
                      onChange={e => setFormProductScope(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all"
                    >
                      <option value="">All Products</option>
                      {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setModal(false); resetForm(); }}
                  className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl"
                >
                  {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Coupons;
