import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Supplier, Product, PurchaseRecord, Category, Brand } from '../types';
import { 
  Plus, 
  Truck, 
  Search, 
  Edit, 
  Receipt, 
  CreditCard,
  ArrowLeft,
  Barcode, 
  Calculator,
  CornerDownRight,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  PackagePlus,
  Trash2,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  Layers,
  Tag
} from 'lucide-react';

const Suppliers: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Navigation View States: 'directory' | 'profile' | 'create-bill'
  const [viewState, setViewState] = useState<'directory' | 'profile' | 'create-bill'>('directory');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  
  // Data States
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierData, setSelectedSupplierData] = useState<Supplier | null>(null);
  const [supplierPurchases, setSupplierPurchases] = useState<PurchaseRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');

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

  // Modals
  const [supplierModal, setSupplierModal] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [categoryModal, setCategoryModal] = useState(false);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [brandModal, setBrandModal] = useState(false);
  const [brandName, setBrandName] = useState('');
  const [brandDesc, setBrandDesc] = useState('');
  const [newItemModal, setNewItemModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [selectedBillForPayment, setSelectedBillForPayment] = useState<PurchaseRecord | null>(null);
  const [selectedPurchaseDetail, setSelectedPurchaseDetail] = useState<PurchaseRecord | null>(null);

  // Supplier Form Fields
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');

  // Payment Form State
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');

  // Dynamic New Item Popup Form Fields (Only Purchase Price required/visible)
  const [newItemName, setNewItemName] = useState('');
  const [newItemModelNumber, setNewItemModelNumber] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [newItemBrand, setNewItemBrand] = useState('');
  const [newItemPurchasePrice, setNewItemPurchasePrice] = useState<number | ''>('');
  const [newItemSellingPrice, setNewItemSellingPrice] = useState<number | ''>('');
  const [newItemGstRate, setNewItemGstRate] = useState<number>(18);
  const [newItemHasIMEI, setNewItemHasIMEI] = useState(false);

  // SUPPLIER BILL CREATION BUILDER STATE
  const [billSupplierId, setBillSupplierId] = useState('');
  const [restockInvoiceNumber, setRestockInvoiceNumber] = useState('');
  const [restockDate, setRestockDate] = useState(new Date().toISOString().split('T')[0]);
  const [restockItems, setRestockItems] = useState<{
    product: string;
    productName: string;
    modelNumber?: string;
    quantity: number;
    purchasePrice: number;
    sellingPrice: number;
    gstRate: number;
    hasIMEI: boolean;
    imeiString: string;
  }[]>([]);
  const [amountPaid, setAmountPaid] = useState<number>(0);

  // Product Autocomplete for Bill Builder
  const [prodSearch, setProdSearch] = useState('');
  const [prodResults, setProdResults] = useState<Product[]>([]);

  // Fetch initial suppliers & catalogues
  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const supRes = await api.get(`/suppliers?keyword=${keyword}`);
      if (supRes.data.success) setSuppliers(supRes.data.data);

      const catRes = await api.get('/categories');
      if (catRes.data.success) setCategories(catRes.data.data);

      const brandRes = await api.get('/brands');
      if (brandRes.data.success) setBrands(brandRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch specific supplier details & bills history
  const fetchSupplierProfile = async (id: string) => {
    try {
      const { data } = await api.get(`/suppliers/${id}`);
      if (data.success) {
        setSelectedSupplierData(data.data.supplier);
        setSupplierPurchases(data.data.purchases);
      }
    } catch (err) {
      console.error(err);
      showError('Failed to load supplier profile.');
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [keyword]);

  useEffect(() => {
    if (selectedSupplierId && viewState === 'profile') {
      fetchSupplierProfile(selectedSupplierId);
    }
  }, [selectedSupplierId, viewState]);

  // Debounced product search for bill page
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (prodSearch.trim().length > 1) {
        try {
          const { data } = await api.get(`/products/pos/search?q=${prodSearch}&includeOutOfStock=true`);
          if (data.success) setProdResults(data.data);
        } catch (err) {
          console.error(err);
        }
      } else {
        setProdResults([]);
      }
    }, 200);
    return () => clearTimeout(delayDebounce);
  }, [prodSearch]);

  // Open Supplier Form Modal (Add or Edit)
  const openSupplierModal = (sup: Supplier | null = null) => {
    setEditSupplier(sup);
    if (sup) {
      setName(sup.name);
      setContactPerson(sup.contactPerson || '');
      setMobile(sup.mobile);
      setEmail(sup.email || '');
      setAddress(sup.address || '');
      setGstin(sup.gstin || '');
    } else {
      setName('');
      setContactPerson('');
      setMobile('');
      setEmail('');
      setAddress('');
      setGstin('');
    }
    setSupplierModal(true);
  };

  // Handle Add/Edit Supplier Submission
  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name, contactPerson, mobile, email, address, gstin };
    try {
      if (editSupplier) {
        await api.put(`/suppliers/${editSupplier._id}`, payload);
        showSuccess('Supplier details updated successfully!');
      } else {
        await api.post('/suppliers', payload);
        showSuccess('New supplier registered successfully!');
      }
      setSupplierModal(false);
      fetchSuppliers();
      if (selectedSupplierId) fetchSupplierProfile(selectedSupplierId);
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to save supplier details.');
    }
  };

  // SUPPLIER BILL CREATION / EDIT STATE
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);

  // Open Bill Creation Page
  const startCreateBill = (supplierId?: string) => {
    setEditingPurchaseId(null);
    const targetSup = supplierId || selectedSupplierId || (suppliers[0]?._id || '');
    setBillSupplierId(targetSup);
    setRestockInvoiceNumber(`BILL-${Date.now().toString().slice(-6)}`);
    setRestockDate(new Date().toISOString().split('T')[0]);
    setRestockItems([]);
    setAmountPaid(0);
    setViewState('create-bill');
  };

  // Start Editing an existing Supplier Bill
  const startEditBill = (bill: PurchaseRecord) => {
    setEditingPurchaseId(bill._id);
    const targetSup = typeof bill.supplier === 'object' ? (bill.supplier as any)._id : bill.supplier;
    setBillSupplierId(targetSup || selectedSupplierId || '');
    setRestockInvoiceNumber(bill.invoiceNumber);
    setRestockDate(new Date(bill.purchaseDate).toISOString().split('T')[0]);
    setAmountPaid(bill.amountPaid || 0);

    const mappedItems = bill.items.map(it => {
      const prod = typeof it.product === 'object' ? (it.product as any) : null;
      const prodId: string = prod ? prod._id : (typeof it.product === 'string' ? it.product : (it.product as any)?._id || '');
      const prodName = prod ? prod.name : 'Product';
      const modelNumber = prod ? prod.modelNumber : '';
      const imeiString = it.imeiList ? it.imeiList.join(', ') : '';

      const itemSellingPrice = (it as any).sellingPrice;
      const productSellingPrice = prod?.sellingPrice;
      const effectiveSellingPrice = (itemSellingPrice !== undefined && itemSellingPrice !== null && Number(itemSellingPrice) > 0)
        ? Number(itemSellingPrice)
        : (productSellingPrice !== undefined && productSellingPrice !== null && Number(productSellingPrice) > 0)
          ? Number(productSellingPrice)
          : Number(it.purchasePrice || 0);

      return {
        product: prodId,
        productName: prodName,
        modelNumber,
        quantity: it.quantity,
        purchasePrice: it.purchasePrice,
        sellingPrice: effectiveSellingPrice,
        gstRate: it.gstRate || 18,
        hasIMEI: Boolean(it.imeiList && it.imeiList.length > 0),
        imeiString
      };
    });

    setRestockItems(mappedItems);
    setViewState('create-bill');
  };

  // Add Item to Bill Sheet
  const addRestockItem = (product: Product) => {
    const exists = restockItems.some(i => i.product === product._id);
    if (exists) return; // avoid duplicates in list

    const sPrice = (product.sellingPrice !== undefined && product.sellingPrice !== null && Number(product.sellingPrice) > 0)
      ? Number(product.sellingPrice)
      : (product.mrp && Number(product.mrp) > 0)
        ? Number(product.mrp)
        : Number(product.purchasePrice || 0);

    setRestockItems([...restockItems, {
      product: product._id,
      productName: product.name,
      modelNumber: product.modelNumber,
      quantity: 1,
      purchasePrice: product.purchasePrice || 0,
      sellingPrice: sPrice,
      gstRate: product.gstRate,
      hasIMEI: product.hasIMEI,
      imeiString: ''
    }]);
    setProdSearch('');
    setProdResults([]);
  };

  const removeRestockItem = (idx: number) => {
    const updated = [...restockItems];
    updated.splice(idx, 1);
    setRestockItems(updated);
  };

  const updateRestockItemField = (idx: number, field: string, val: any) => {
    const updated = [...restockItems];
    updated[idx] = { ...updated[idx], [field]: val };
    setRestockItems(updated);
  };

  // Open "Add New Item" Popup Modal inside Supplier Bill page
  const openNewItemModal = () => {
    setNewItemName('');
    setNewItemModelNumber('');
    setNewItemCategory(categories[0]?._id || '');
    setNewItemBrand(brands[0]?._id || '');
    setNewItemPurchasePrice('');
    setNewItemSellingPrice('');
    setNewItemGstRate(18);
    setNewItemHasIMEI(false);
    setNewItemModal(true);
  };

  // Create New Product from Supplier Bill Popup
  const handleCreateNewItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemCategory || !newItemBrand || newItemPurchasePrice === '' || newItemSellingPrice === '') {
      showError('Please fill out all required item fields.');
      return;
    }

    const purchasePrice = Number(newItemPurchasePrice);
    const sellingPrice = Number(newItemSellingPrice);
    const payload = {
      name: newItemName,
      modelNumber: newItemModelNumber,
      category: newItemCategory,
      brand: newItemBrand,
      purchasePrice,
      sellingPrice,
      mrp: sellingPrice,
      gstRate: newItemGstRate,
      hasIMEI: newItemHasIMEI,
      stock: 0
    };

    try {
      const { data } = await api.post('/products', payload);
      if (data.success) {
        showSuccess(`Product "${data.data.name}" created! Automatically added to bill.`);
        addRestockItem(data.data);
        setNewItemModal(false);
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to create new item.');
    }
  };

  // Create Category from Supplier section
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      showError('Please enter a category name.');
      return;
    }
    try {
      await api.post('/categories', { name: catName, description: catDesc });
      showSuccess(`Category "${catName}" created successfully!`);
      setCategoryModal(false);
      setCatName('');
      setCatDesc('');
      fetchSuppliers();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Category creation failed.');
    }
  };

  // Create Brand from Supplier section
  const handleBrandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) {
      showError('Please enter a brand name.');
      return;
    }
    try {
      await api.post('/brands', { name: brandName, description: brandDesc });
      showSuccess(`Brand "${brandName}" created successfully!`);
      setBrandModal(false);
      setBrandName('');
      setBrandDesc('');
      fetchSuppliers();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Brand creation failed.');
    }
  };

  // Calculate Bill Totals (Purchase Price is GST Inclusive)
  const calculateRestockTotals = () => {
    let subtotal = 0;
    let totalGst = 0;

    restockItems.forEach(item => {
      const qty = Math.max(1, Number(item.quantity || 1));
      const price = Number(item.purchasePrice || 0);
      const gstRate = Number(item.gstRate || 0);

      const lineTotal = price * qty;
      const lineTaxable = gstRate > 0 ? lineTotal / (1 + (gstRate / 100)) : lineTotal;
      const lineGst = lineTotal - lineTaxable;

      subtotal += lineTaxable;
      totalGst += lineGst;
    });

    const total = subtotal + totalGst;
    return { subtotal, gst: totalGst, total };
  };

  const restockTotals = calculateRestockTotals();

  // Submit Supplier Bill Transaction
  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billSupplierId) {
      showError('Select a supplier for this bill.');
      return;
    }
    if (!restockInvoiceNumber) {
      showError('Enter supplier bill invoice number.');
      return;
    }
    if (restockItems.length === 0) {
      showError('Add at least one item to the supplier bill.');
      return;
    }

    const restockPayload = {
      supplierId: billSupplierId,
      invoiceNumber: restockInvoiceNumber,
      purchaseDate: restockDate,
      amountPaid: Number(amountPaid || 0),
      items: restockItems.map(item => {
        const imeiList = item.hasIMEI && item.imeiString
          ? item.imeiString.split(',').map(i => i.trim()).filter(i => i.length > 0)
          : [];
        return {
          product: item.product,
          quantity: Math.max(1, Number(item.quantity || 1)),
          purchasePrice: Number(item.purchasePrice || 0),
          sellingPrice: (item.sellingPrice !== undefined && item.sellingPrice !== null && Number(item.sellingPrice) > 0) ? Number(item.sellingPrice) : (Number(item.purchasePrice) || 0),
          gstRate: Number(item.gstRate || 0),
          imeiList
        };
      })
    };

    try {
      if (editingPurchaseId) {
        const { data } = await api.put(`/suppliers/purchases/${editingPurchaseId}`, restockPayload);
        if (data.success) {
          showSuccess('Supplier Bill updated! Stock & ledger re-calculated.');
          setEditingPurchaseId(null);
          if (selectedSupplierId) {
            fetchSupplierProfile(selectedSupplierId);
            setViewState('profile');
          } else {
            fetchSuppliers();
            setViewState('directory');
          }
        }
      } else {
        const { data } = await api.post('/suppliers/purchases', restockPayload);
        if (data.success) {
          showSuccess('Supplier Bill saved! Inventory stock & supplier ledger updated.');
          if (selectedSupplierId) {
            fetchSupplierProfile(selectedSupplierId);
            setViewState('profile');
          } else {
            fetchSuppliers();
            setViewState('directory');
          }
        }
      }
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to submit supplier bill.');
    }
  };

  // Open Record Payment Modal for a Supplier Bill
  const openPaymentModal = (bill: PurchaseRecord) => {
    setSelectedBillForPayment(bill);
    setPaymentAmount(bill.balanceDue);
    setPaymentModal(true);
  };

  // Submit Partial / Full Payment
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBillForPayment) return;

    const payVal = Number(paymentAmount);
    if (!payVal || payVal <= 0) {
      showError('Enter a valid payment amount.');
      return;
    }

    try {
      const { data } = await api.post(`/suppliers/purchases/${selectedBillForPayment._id}/payment`, {
        paymentAmount: payVal
      });

      if (data.success) {
        showSuccess(data.message || 'Payment recorded successfully!');
        setPaymentModal(false);
        if (selectedSupplierId) fetchSupplierProfile(selectedSupplierId);
        fetchSuppliers();
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Payment recording failed.');
    }
  };

  return (
    <div className="flex-1 p-8 bg-slate-50 dark:bg-slate-950 overflow-y-auto h-screen transition-colors duration-200">
      
      {/* Toast Notifications */}
      {errorMsg && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3.5 bg-rose-500 text-white rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-bounce">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3.5 bg-emerald-500 text-white rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-pulse">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* TOP HEADER CONTROLS */}
      <header className="flex justify-between items-center mb-8">
        <div>
          <div className="flex items-center gap-3">
            {viewState !== 'directory' && (
              <button
                onClick={() => setViewState('directory')}
                className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                title="Back to Supplier Directory"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-sans">
              {viewState === 'directory' ? 'Suppliers Directory' : viewState === 'profile' ? selectedSupplierData?.name || 'Supplier Profile' : 'Create Supplier Bill'}
            </h2>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            {viewState === 'directory' 
              ? 'Wholesale suppliers directory, credit accounts, and supplier bills.' 
              : viewState === 'profile'
                ? 'Supplier ledger, total outstanding balance, and purchase bills.'
                : 'Direct purchase price entry and dynamic item stock creation.'}
          </p>
        </div>

        {/* TOP-RIGHT BUTTONS */}
        <div className="flex gap-3 items-center">
          {isAdmin && (
            <>
              <button
                onClick={() => {
                  setCatName('');
                  setCatDesc('');
                  setCategoryModal(true);
                }}
                className="px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl text-xs font-bold uppercase text-slate-700 dark:text-slate-200 shadow-sm active:scale-[0.98] transition-all flex items-center gap-2"
              >
                <Plus size={14} className="text-teal-500" />
                <span>Add Category</span>
              </button>

              <button
                onClick={() => {
                  setBrandName('');
                  setBrandDesc('');
                  setBrandModal(true);
                }}
                className="px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl text-xs font-bold uppercase text-slate-700 dark:text-slate-200 shadow-sm active:scale-[0.98] transition-all flex items-center gap-2"
              >
                <Plus size={14} className="text-indigo-500" />
                <span>Add Brand</span>
              </button>
            </>
          )}

          {viewState === 'directory' && isAdmin && (
            <button
              onClick={() => openSupplierModal()}
              className="px-5 py-3.5 bg-brand-500 hover:bg-brand-600 rounded-2xl text-xs font-extrabold uppercase text-white shadow-lg shadow-brand-500/20 active:scale-[0.98] transition-all flex items-center gap-2"
            >
              <Plus size={16} />
              <span>Add Supplier</span>
            </button>
          )}

          {viewState === 'profile' && isAdmin && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => selectedSupplierData && openSupplierModal(selectedSupplierData)}
                className="px-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-xs font-extrabold uppercase text-slate-700 dark:text-slate-200 shadow-sm active:scale-[0.98] transition-all flex items-center gap-2"
              >
                <Edit size={14} className="text-brand-500" />
                <span>Edit Supplier</span>
              </button>
              <button
                onClick={() => startCreateBill(selectedSupplierId || undefined)}
                className="px-5 py-3.5 bg-brand-500 hover:bg-brand-600 rounded-2xl text-xs font-extrabold uppercase text-white shadow-lg shadow-brand-500/20 active:scale-[0.98] transition-all flex items-center gap-2"
              >
                <Receipt size={16} />
                <span>+ Create Supplier Bill</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ============================================================ */}
      {/* 1. SUPPLIER DIRECTORY VIEW */}
      {/* ============================================================ */}
      {viewState === 'directory' && (
        <div className="flex flex-col gap-6">
          <div className="relative max-w-md">
            <input
              type="text"
              placeholder="Search suppliers by name, contact, mobile..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs outline-none focus:border-brand-500 text-slate-900 dark:text-white shadow-sm"
            />
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {suppliers.map(sup => (
              <div 
                key={sup._id} 
                className="p-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group"
                onClick={() => {
                  setSelectedSupplierId(sup._id);
                  setViewState('profile');
                }}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="p-3.5 bg-brand-500/10 text-brand-500 rounded-2xl shrink-0 group-hover:scale-105 transition-transform">
                      <Building2 size={22} />
                    </div>
                    
                    {sup.outstandingBalance > 0 ? (
                      <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-[10px] font-bold text-amber-600 dark:text-amber-400">
                        Outstanding: ₹{sup.outstandingBalance.toLocaleString('en-IN')}
                      </div>
                    ) : (
                      <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-bold text-emerald-500">
                        Cleared Account
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="font-extrabold text-lg text-slate-900 dark:text-white leading-tight group-hover:text-brand-500 transition-colors">{sup.name}</h3>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Contact: {sup.contactPerson || 'N/A'}</span>
                  </div>

                  <div className="text-xs text-slate-500 leading-relaxed flex flex-col gap-1 mt-1">
                    <span className="flex items-center gap-2"><Phone size={12} className="text-slate-400" /> {sup.mobile}</span>
                    {sup.email && <span className="flex items-center gap-2 truncate"><Mail size={12} className="text-slate-400" /> {sup.email}</span>}
                    <span className="flex items-center gap-2"><FileText size={12} className="text-slate-400" /> GSTIN: {sup.gstin || 'Unregistered'}</span>
                    {sup.address && <span className="flex items-center gap-2 truncate"><MapPin size={12} className="text-slate-400" /> {sup.address}</span>}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 mt-6 border-t border-slate-100 dark:border-slate-800/80">
                  <span className="text-xs font-bold text-brand-500 group-hover:underline flex items-center gap-1">
                    View Profile & Bills →
                  </span>
                  
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openSupplierModal(sup);
                      }}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition-colors"
                      title="Edit Supplier Info"
                    >
                      <Edit size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. SUPPLIER PROFILE & LEDGER VIEW */}
      {/* ============================================================ */}
      {viewState === 'profile' && selectedSupplierData && (
        <div className="flex flex-col gap-8">
          
          {/* Supplier Header Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Account Details */}
            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Supplier Info</span>
                  {isAdmin && (
                    <button
                      onClick={() => openSupplierModal(selectedSupplierData)}
                      className="text-xs font-bold text-brand-500 hover:text-brand-600 flex items-center gap-1 transition-colors"
                      title="Edit Supplier"
                    >
                      <Edit size={12} />
                      <span>Edit</span>
                    </button>
                  )}
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">{selectedSupplierData.name}</h3>
                <p className="text-xs text-slate-500 mt-1">Contact: {selectedSupplierData.contactPerson || 'N/A'}</p>
                <div className="flex flex-col gap-1 mt-3 text-xs text-slate-600 dark:text-slate-400">
                  <span>Phone: {selectedSupplierData.mobile}</span>
                  <span>GSTIN: {selectedSupplierData.gstin || 'N/A'}</span>
                  <span>Address: {selectedSupplierData.address || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Total Bills Metric */}
            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl shadow-sm flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Supplier Invoices</span>
                <span className="text-3xl font-black text-slate-950 dark:text-white">{supplierPurchases.length}</span>
                <span className="text-[10px] text-slate-400">Bills recorded to date</span>
              </div>
              <div className="p-4 bg-blue-500/10 text-blue-500 rounded-2xl">
                <Receipt size={24} />
              </div>
            </div>

            {/* Outstanding Balance Ledger Metric */}
            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl shadow-sm flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Outstanding Balance</span>
                <span className={`text-3xl font-black ${selectedSupplierData.outstandingBalance > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  ₹{selectedSupplierData.outstandingBalance.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-slate-400">
                  {selectedSupplierData.outstandingBalance > 0 ? 'Amount pending clear' : 'All supplier dues cleared'}
                </span>
              </div>
              <div className={`p-4 rounded-2xl ${selectedSupplierData.outstandingBalance > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                <CreditCard size={24} />
              </div>
            </div>
          </div>

          {/* Supplier Bills History Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Supplier Bills & Ledger</h3>
                <p className="text-xs text-slate-400">Inward inventory invoices and partial payment logs</p>
              </div>

              <button
                onClick={() => startCreateBill(selectedSupplierData._id)}
                className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold uppercase flex items-center gap-2"
              >
                <Plus size={14} />
                <span>New Supplier Bill</span>
              </button>
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="pos-grid-header">Purchase Date</th>
                  <th className="pos-grid-header">Invoice #</th>
                  <th className="pos-grid-header">Items & Qty</th>
                  <th className="pos-grid-header text-right">Each Qty Price</th>
                  <th className="pos-grid-header text-right">Total Bill (INR)</th>
                  <th className="pos-grid-header text-right">Amount Paid</th>
                  <th className="pos-grid-header text-right">Balance Due</th>
                  <th className="pos-grid-header text-center">Status</th>
                  <th className="pos-grid-header text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {supplierPurchases.length > 0 ? (
                  supplierPurchases.map(bill => (
                    <tr key={bill._id} className="pos-grid-row">
                      <td className="px-4 py-4 text-xs font-bold text-slate-800 dark:text-slate-200">
                        {new Date(bill.purchaseDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-4 text-xs font-bold text-slate-500">
                        {bill.invoiceNumber}
                      </td>
                      <td className="px-4 py-4 text-xs">
                        <div className="flex flex-col gap-1 max-w-[220px]">
                          {bill.items.map((it, idx) => (
                            <div key={idx} className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                              <span className="font-semibold truncate mr-2">
                                {typeof it.product === 'object' && it.product?.name ? it.product.name : 'Product'}
                              </span>
                              <span className="font-bold text-slate-500 dark:text-slate-400 shrink-0 text-[11px]">
                                {it.quantity} {it.quantity === 1 ? 'unit' : 'units'}
                              </span>
                            </div>
                          ))}
                          <span className="text-[10px] text-slate-400 font-bold border-t border-slate-100 dark:border-slate-800 pt-0.5">
                            Total: {bill.items.reduce((sum, i) => sum + i.quantity, 0)} units
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right text-xs">
                        <div className="flex flex-col gap-1 items-end">
                          {bill.items.map((it, idx) => (
                            <span key={idx} className="font-bold text-slate-800 dark:text-slate-200">
                              ₹{it.purchasePrice.toLocaleString('en-IN')} <span className="text-[10px] text-slate-400 font-normal">/ unit</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-black text-xs text-slate-900 dark:text-white">
                        ₹{Math.round(bill.totalAmount).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-4 text-right text-xs font-bold text-emerald-500">
                        ₹{Math.round(bill.amountPaid).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-4 text-right text-xs font-bold text-rose-500">
                        ₹{Math.round(bill.balanceDue).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${
                          bill.status === 'Paid' 
                            ? 'bg-emerald-500/10 text-emerald-500' 
                            : bill.status === 'Partial' 
                              ? 'bg-amber-500/10 text-amber-500' 
                              : 'bg-rose-500/10 text-rose-500'
                        }`}>
                          {bill.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => startEditBill(bill)}
                            className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-brand-500 hover:text-white rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 transition-all flex items-center gap-1"
                            title="Edit Supplier Bill"
                          >
                            <Edit size={12} />
                            <span>Edit</span>
                          </button>
                          {bill.balanceDue > 0 ? (
                            <button
                              onClick={() => openPaymentModal(bill)}
                              className="px-2.5 py-1.5 bg-brand-500/10 hover:bg-brand-500 text-brand-500 hover:text-white rounded-xl text-xs font-bold transition-all"
                            >
                              Payment
                            </button>
                          ) : (
                            <span className="text-[10px] text-emerald-500 font-bold px-1.5">✓ Settled</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center py-20 text-slate-400 dark:text-slate-600">
                      No purchase bills logged for this supplier yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. SUPPLIER BILL CREATION PAGE (Requirement 1: Bill & Price Restriction) */}
      {/* ============================================================ */}
      {viewState === 'create-bill' && (
        <form onSubmit={handleRestockSubmit} className="grid grid-cols-1 xl:grid-cols-3 gap-8 text-slate-800 dark:text-slate-200">
          
          {/* Bill Info & Items Sheet */}
          <div className="xl:col-span-2 flex flex-col gap-6">
            
            {/* Header Bill Fields */}
            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-extrabold text-base">
                  {editingPurchaseId ? `Edit Supplier Bill: ${restockInvoiceNumber}` : 'Supplier Bill Information'}
                </h3>
                {editingPurchaseId && (
                  <span className="px-3 py-1 bg-brand-500/10 text-brand-500 rounded-full text-[10px] font-bold uppercase">
                    Editing Bill
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Supplier Account*</label>
                  <select
                    value={billSupplierId}
                    onChange={(e) => setBillSupplierId(e.target.value)}
                    className="px-3.5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none cursor-pointer"
                    required
                  >
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Supplier Bill Invoice No*</label>
                  <input
                    type="text"
                    placeholder="e.g. BILL-94820"
                    value={restockInvoiceNumber}
                    onChange={(e) => setRestockInvoiceNumber(e.target.value)}
                    className="px-3.5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-brand-500"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Purchase Date*</label>
                  <input
                    type="date"
                    value={restockDate}
                    onChange={(e) => setRestockDate(e.target.value)}
                    className="px-3.5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none cursor-pointer"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Inward Items Sheet with Dynamic Item Creation option */}
            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-extrabold text-base">Bill Line Items & Inventory Entry</h3>
                  <p className="text-xs text-slate-400">Select existing items or create new products dynamically</p>
                </div>

                {/* Requirement 1: Dynamic Item Creation option button */}
                <button
                  type="button"
                  onClick={openNewItemModal}
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase shadow-md flex items-center gap-1.5"
                >
                  <PackagePlus size={14} />
                  <span>+ Add New Item</span>
                </button>
              </div>
              
              {/* Product Search Box */}
              <div className="relative mt-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search existing product catalog to add to bill..."
                    value={prodSearch}
                    onChange={(e) => setProdSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none"
                  />
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>

                {prodResults.length > 0 && (
                  <div className="absolute top-full left-0 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mt-1 rounded-xl shadow-xl z-20 overflow-y-auto max-h-48">
                    {prodResults.map(p => (
                      <button
                        key={p._id}
                        type="button"
                        onClick={() => addRestockItem(p)}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs font-semibold border-b border-slate-100 dark:border-slate-800 flex justify-between"
                      >
                        <span>{p.name} {p.modelNumber ? `(${p.modelNumber})` : ''}</span>
                        <span className="text-brand-500 font-bold">Purchase Price: ₹{p.purchasePrice}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Bill Items Grid (Price Restriction: ONLY Purchase Price displayed) */}
              <div className="flex flex-col gap-4 mt-2">
                {restockItems.length > 0 ? (
                  restockItems.map((item, idx) => (
                    <div key={item.product} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 rounded-2xl flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <CornerDownRight size={12} className="text-slate-400" /> {item.productName} {item.modelNumber ? `[${item.modelNumber}]` : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeRestockItem(idx)}
                          className="text-[10px] font-bold text-rose-500 uppercase hover:underline"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Direct Inventory Entry (Qty) */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Direct Inventory Qty*</label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateRestockItemField(idx, 'quantity', Math.max(1, Number(e.target.value)))}
                            min={1}
                            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none font-bold text-slate-900 dark:text-white"
                            required
                          />
                        </div>

                        {/* Purchase Price (GST Inclusive) */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Purchase Price (GST Incl.)*</label>
                          <input
                            type="number"
                            value={item.purchasePrice}
                            onChange={(e) => updateRestockItemField(idx, 'purchasePrice', Number(e.target.value))}
                            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none font-bold"
                            required
                            min={0}
                          />
                        </div>

                        {/* Selling Price */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-bold text-brand-500 uppercase">Selling Price (₹)*</label>
                          <input
                            type="number"
                            value={item.sellingPrice}
                            onChange={(e) => updateRestockItemField(idx, 'sellingPrice', Number(e.target.value))}
                            className="px-3 py-2 bg-white dark:bg-slate-900 border border-brand-200 dark:border-brand-800/60 rounded-xl text-xs outline-none font-bold text-brand-600 dark:text-brand-400"
                            required
                            min={0}
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">GST Rate (%)</label>
                          <input
                            type="number"
                            value={item.gstRate}
                            onChange={(e) => updateRestockItemField(idx, 'gstRate', Number(e.target.value))}
                            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none"
                            required
                          />
                        </div>

                        {item.hasIMEI && (
                          <div className="col-span-2 md:col-span-4 mt-1 flex flex-col gap-1">
                            <label className="text-[9px] font-bold text-cyan-500 uppercase flex items-center gap-1">
                              <Barcode size={10} /> Incoming Serial / IMEI Numbers (Comma Separated - Optional)
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. 86904501, 86904502 (optional)"
                              value={item.imeiString}
                              onChange={(e) => updateRestockItemField(idx, 'imeiString', e.target.value)}
                              className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-bold outline-none"
                            />
                            <span className="text-[9px] text-cyan-600 dark:text-cyan-400 font-bold">
                              Parsed {item.imeiString.split(',').map(i => i.trim()).filter(i => i.length > 0).length} IMEIs.
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center text-slate-400">
                    <span className="text-xs font-semibold">Bill item list is empty. Click "+ Add New Item" or search catalog above.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Checkout & Summary Column */}
          <div className="flex flex-col gap-6">
            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl shadow-sm">
              <h3 className="font-extrabold text-base mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                <Calculator size={16} /> Bill Summary
              </h3>
              
              <div className="flex flex-col gap-3 text-xs text-slate-500 mb-6">
                <div className="flex justify-between">
                  <span>Taxable Subtotal:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">₹{restockTotals.subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST Amount (Included):</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">₹{restockTotals.gst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
                  <span className="font-bold text-slate-900 dark:text-white">Total Bill Amount:</span>
                  <span className="font-extrabold text-sm text-brand-500">₹{Math.round(restockTotals.total).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl mb-6">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Upfront Amount Paid (INR)</label>
                <input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(Number(e.target.value))}
                  className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none font-bold"
                />
                
                {amountPaid < Math.round(restockTotals.total) && (
                  <div className="mt-1 flex flex-col text-[10px] font-bold text-amber-600 dark:text-amber-400 gap-0.5">
                    <span>Balance Due Owed: ₹{Math.max(0, Math.round(restockTotals.total) - amountPaid).toLocaleString('en-IN')}</span>
                    <span className="text-[8px] text-slate-400">(Adds to supplier outstanding ledger)</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={restockItems.length === 0}
                className="w-full py-4 bg-brand-500 hover:bg-brand-600 disabled:bg-slate-200 disabled:dark:bg-slate-800 font-bold text-white text-xs uppercase rounded-2xl shadow-xl shadow-brand-500/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Receipt size={16} />
                <span>{editingPurchaseId ? 'Update Supplier Bill & Sync Stock' : 'Save Supplier Bill & Sync Stock'}</span>
              </button>
            </div>
          </div>

        </form>
      )}

      {/* ============================================================ */}
      {/* 4. MODALS */}
      {/* ============================================================ */}

      {/* A. ADD / EDIT SUPPLIER MODAL */}
      {supplierModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleSupplierSubmit}
            className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 flex flex-col gap-4 text-slate-800 dark:text-slate-200 animate-scaleUp"
          >
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              {editSupplier ? 'Edit Supplier Profile' : 'Register New Supplier'}
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-[10px] font-bold uppercase text-slate-400">Supplier / Company Name*</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-brand-500"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Contact Person</label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Mobile Number*</label>
                <input
                  type="text"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-brand-500"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">GSTIN Number</label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-[10px] font-bold uppercase text-slate-400">Physical Address</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none h-16"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-4 justify-end">
              <button
                type="button"
                onClick={() => setSupplierModal(false)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs uppercase"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold text-xs uppercase"
              >
                Save Supplier
              </button>
            </div>
          </form>
        </div>
      )}

      {/* B. DYNAMIC NEW ITEM POPUP MODAL (Requirement 1: Purchase Price Only) */}
      {newItemModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleCreateNewItemSubmit}
            className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 flex flex-col gap-4 text-slate-800 dark:text-slate-200 animate-scaleUp"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <PackagePlus size={20} className="text-emerald-500" />
                Add New Item / Model
              </h3>
              <button 
                type="button" 
                onClick={() => setNewItemModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">Dynamically add mobile phones, models, or accessories directly into inventory.</p>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Item Name / Phone Name*</label>
                <input
                  type="text"
                  placeholder="e.g. Galaxy S24 Ultra"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-brand-500"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Model Name / Number</label>
                <input
                  type="text"
                  placeholder="e.g. SM-S928B"
                  value={newItemModelNumber}
                  onChange={(e) => setNewItemModelNumber(e.target.value)}
                  className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Category*</label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none cursor-pointer"
                    required
                  >
                    {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Brand / Company*</label>
                  <select
                    value={newItemBrand}
                    onChange={(e) => setNewItemBrand(e.target.value)}
                    className="px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none cursor-pointer"
                    required
                  >
                    {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-brand-500">Purchase Price (₹)*</label>
                  <input
                    type="number"
                    placeholder="e.g. 75000"
                    value={newItemPurchasePrice}
                    onChange={(e) => setNewItemPurchasePrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none font-bold"
                    required
                    min={0}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-brand-500">Selling Price (₹)*</label>
                  <input
                    type="number"
                    placeholder="e.g. 84999"
                    value={newItemSellingPrice}
                    onChange={(e) => setNewItemSellingPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none font-bold"
                    required
                    min={0}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">GST Rate (%)</label>
                  <input
                    type="number"
                    value={newItemGstRate}
                    onChange={(e) => setNewItemGstRate(Number(e.target.value))}
                    className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none"
                    required
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer mt-2">
                <input
                  type="checkbox"
                  checked={newItemHasIMEI}
                  onChange={(e) => setNewItemHasIMEI(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Requires Serial / IMEI Tracking</span>
              </label>
            </div>

            <div className="flex gap-4 mt-4 justify-end">
              <button
                type="button"
                onClick={() => setNewItemModal(false)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs uppercase"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase shadow-md"
              >
                Add Item to Bill
              </button>
            </div>
          </form>
        </div>
      )}

      {/* C. RECORD PAYMENT MODAL (Requirement 1: Outstanding Payments & Partial Payment) */}
      {paymentModal && selectedBillForPayment && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handlePaymentSubmit}
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 flex flex-col gap-4 text-slate-800 dark:text-slate-200 animate-scaleUp"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard size={20} className="text-brand-500" />
                Record Supplier Payment
              </h3>
              <button 
                type="button"
                onClick={() => setPaymentModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850 flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Bill Invoice #:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedBillForPayment.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Bill Amount:</span>
                <span className="font-bold">₹{Math.round(selectedBillForPayment.totalAmount).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Already Paid:</span>
                <span className="font-bold text-emerald-500">₹{Math.round(selectedBillForPayment.amountPaid).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-1.5 font-bold">
                <span className="text-rose-500">Current Balance Due:</span>
                <span className="text-rose-500">₹{Math.round(selectedBillForPayment.balanceDue).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-400">Payment Amount Owed (INR)*</label>
              <input
                type="number"
                placeholder="Enter amount to pay"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))}
                max={selectedBillForPayment.balanceDue}
                className="px-3.5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none font-bold text-brand-500"
                required
              />
              <span className="text-[9px] text-slate-400">
                Support partial payments. Enter full or partial amount to update supplier ledger balance.
              </span>
            </div>

            <div className="flex gap-4 mt-4 justify-end">
              <button
                type="button"
                onClick={() => setPaymentModal(false)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs uppercase"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold text-xs uppercase shadow-md"
              >
                Confirm Payment
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
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Layers size={20} className="text-teal-500" />
                Create New Category
              </h3>
              <button 
                type="button"
                onClick={() => setCategoryModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Category Name*</label>
              <input
                type="text"
                placeholder="e.g. Smart Phones, Accessories, Chargers"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-brand-500"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Description</label>
              <textarea
                placeholder="Optional description"
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-brand-500 h-20"
              />
            </div>

            <div className="flex gap-3 justify-end mt-4">
              <button
                type="button"
                onClick={() => setCategoryModal(false)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs uppercase"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-bold text-xs uppercase shadow-md shadow-teal-500/20"
              >
                Save Category
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
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Tag size={20} className="text-indigo-500" />
                Create New Brand
              </h3>
              <button 
                type="button"
                onClick={() => setBrandModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Brand Name*</label>
              <input
                type="text"
                placeholder="e.g. Apple, Samsung, OnePlus, Boat"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-brand-500"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Description</label>
              <textarea
                placeholder="Optional description"
                value={brandDesc}
                onChange={(e) => setBrandDesc(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-brand-500 h-20"
              />
            </div>

            <div className="flex gap-3 justify-end mt-4">
              <button
                type="button"
                onClick={() => setBrandModal(false)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs uppercase"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase shadow-md shadow-indigo-500/20"
              >
                Save Brand
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default Suppliers;
