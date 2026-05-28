import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Supplier, Product, PurchaseRecord } from '../types';
import { 
  Plus, 
  Truck, 
  Search, 
  Edit, 
  History, 
  Receipt, 
  Briefcase, 
  Barcode, 
  Calculator,
  CornerDownRight,
  TrendingDown
} from 'lucide-react';

const Suppliers: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [activeTab, setActiveTab] = useState<'suppliers' | 'restock' | 'history'>('suppliers');
  
  // Data States
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
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

  // Modal forms
  const [supplierModal, setSupplierModal] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseRecord | null>(null);

  // Supplier Form Fields
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [outstandingBalance, setOutstandingBalance] = useState(0);

  // RESTOCKING BUILDER STATE
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [restockInvoiceNumber, setRestockInvoiceNumber] = useState('');
  const [restockDate, setRestockDate] = useState(new Date().toISOString().split('T')[0]);
  const [restockItems, setRestockItems] = useState<{
    product: string;
    productName: string;
    quantity: number;
    purchasePrice: number;
    gstRate: number;
    hasIMEI: boolean;
    imeiString: string;
  }[]>([]);
  const [amountPaid, setAmountPaid] = useState(0);

  // Autocomplete products under restocking
  const [prodSearch, setProdSearch] = useState('');
  const [prodResults, setProdResults] = useState<Product[]>([]);

  // Fetch collections
  const fetchData = async () => {
    try {
      const supRes = await api.get(`/suppliers?keyword=${keyword}`);
      if (supRes.data.success) setSuppliers(supRes.data.data);

      const purRes = await api.get('/suppliers/purchases');
      if (purRes.data.success) setPurchases(purRes.data.data);
      
      const prodRes = await api.get('/products?pageSize=100'); // read base active items for builder dropdown
      if (prodRes.data.success) setProducts(prodRes.data.data.products);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [keyword, activeTab]);

  // Debounced autocomplete for restocking builder
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

  const openSupplierModal = (sup: Supplier | null = null) => {
    setEditSupplier(sup);
    if (sup) {
      setName(sup.name);
      setContactPerson(sup.contactPerson || '');
      setMobile(sup.mobile);
      setEmail(sup.email || '');
      setAddress(sup.address || '');
      setGstin(sup.gstin || '');
      setOutstandingBalance(sup.outstandingBalance);
    } else {
      setName('');
      setContactPerson('');
      setMobile('');
      setEmail('');
      setAddress('');
      setGstin('');
      setOutstandingBalance(0);
    }
    setSupplierModal(true);
  };

  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name, contactPerson, mobile, email, address, gstin, outstandingBalance };
    try {
      if (editSupplier) {
        await api.put(`/suppliers/${editSupplier._id}`, payload);
        showSuccess('Supplier details updated successfully!');
      } else {
        await api.post('/suppliers', payload);
        showSuccess('Supplier directory entry created!');
      }
      setSupplierModal(false);
      fetchData();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Save supplier details failed.');
    }
  };

  // Add Item to Restocking list
  const addRestockItem = (product: Product) => {
    const exists = restockItems.some(i => i.product === product._id);
    if (exists) return; // avoid duplicates in list

    setRestockItems([...restockItems, {
      product: product._id,
      productName: product.name,
      quantity: 1,
      purchasePrice: product.purchasePrice,
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

  const calculateRestockTotals = () => {
    let subtotal = 0;
    let totalGst = 0;

    restockItems.forEach(item => {
      // If IMEI tracked, quantity is determined by IMEI strings parsed!
      const parsedImeis = item.hasIMEI 
        ? item.imeiString.split(',').map(i => i.trim()).filter(i => i.length > 0)
        : [];
      
      const qty = item.hasIMEI ? parsedImeis.length : item.quantity;
      const lineTaxable = qty * item.purchasePrice;
      const lineGst = (lineTaxable * item.gstRate) / 100;

      subtotal += lineTaxable;
      totalGst += lineGst;
    });

    const total = subtotal + totalGst;
    return { subtotal, gst: totalGst, total };
  };

  const restockTotals = calculateRestockTotals();

  // Submit Restocking transaction
  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) {
      showError('Select a wholesale supplier.');
      return;
    }
    if (!restockInvoiceNumber) {
      showError('Enter supplier invoice number.');
      return;
    }
    if (restockItems.length === 0) {
      showError('Add products to restocking sheet.');
      return;
    }

    // Verify all IMEI codes are parsed for serial items
    for (const item of restockItems) {
      if (item.hasIMEI) {
        const parsed = item.imeiString.split(',').map(i => i.trim()).filter(i => i.length > 0);
        if (parsed.length === 0) {
          showError(`Specify at least one IMEI serial code for mobile item: ${item.productName}`);
          return;
        }
      }
    }

    const restockPayload = {
      supplierId: selectedSupplier,
      invoiceNumber: restockInvoiceNumber,
      purchaseDate: restockDate,
      amountPaid,
      items: restockItems.map(item => {
        const imeiList = item.hasIMEI
          ? item.imeiString.split(',').map(i => i.trim()).filter(i => i.length > 0)
          : [];
        return {
          product: item.product,
          quantity: item.hasIMEI ? imeiList.length : item.quantity,
          purchasePrice: item.purchasePrice,
          gstRate: item.gstRate,
          imeiList
        };
      })
    };

    try {
      const { data } = await api.post('/suppliers/purchases', restockPayload);
      if (data.success) {
        showSuccess('Stock received and inventory levels incremented!');
        // Reset builder state
        setRestockItems([]);
        setSelectedSupplier('');
        setRestockInvoiceNumber('');
        setAmountPaid(0);
        setActiveTab('history');
      }
    } catch (error: any) {
      showError(error.response?.data?.message || 'Failed to submit restock invoice.');
    }
  };

  return (
    <div className="flex-1 p-8 bg-slate-50 dark:bg-slate-950 overflow-y-auto h-screen transition-colors duration-200">
      
      {/* Header controls */}
      <header className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-sans">Suppliers & Stocking</h2>
          <p className="text-slate-500 text-sm">Wholesale suppliers directories, credit lines, and restocking invoices.</p>
        </div>

        <div className="flex gap-3">
          {/* Tab selectors */}
          <div className="bg-slate-200/60 dark:bg-slate-900 p-1.5 rounded-2xl flex border border-slate-300/40 dark:border-slate-800">
            <button 
              onClick={() => setActiveTab('suppliers')}
              className={`px-4 py-2 text-xs font-bold uppercase rounded-xl transition-all ${activeTab === 'suppliers' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              Supplier Directory
            </button>
            {isAdmin && (
              <button 
                onClick={() => setActiveTab('restock')}
                className={`px-4 py-2 text-xs font-bold uppercase rounded-xl transition-all ${activeTab === 'restock' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                Inward Stock Builder
              </button>
            )}
            <button 
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 text-xs font-bold uppercase rounded-xl transition-all ${activeTab === 'history' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              Restock History
            </button>
          </div>

          {activeTab === 'suppliers' && isAdmin && (
            <button
              onClick={() => openSupplierModal()}
              className="px-5 py-3 bg-brand-500 hover:bg-brand-600 rounded-2xl text-xs font-extrabold uppercase text-white shadow-lg shadow-brand-500/20 active:scale-[0.98] transition-all flex items-center gap-2"
            >
              <Plus size={14} />
              <span>Create Supplier</span>
            </button>
          )}
        </div>
      </header>

      {/* SUPPLIER DIRECTORY TAB */}
      {activeTab === 'suppliers' && (
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
              <div key={sup._id} className="p-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl shrink-0">
                      <Truck size={20} />
                    </div>
                    
                    {sup.outstandingBalance > 0 ? (
                      <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-[10px] font-bold text-amber-600 dark:text-amber-400">
                        Balance: ₹{sup.outstandingBalance.toLocaleString('en-IN')}
                      </div>
                    ) : (
                      <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-bold text-slate-500">
                        Cleared account
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-tight">{sup.name}</h3>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Contact: {sup.contactPerson || 'N/A'}</span>
                  </div>

                  <div className="text-xs text-slate-500 leading-relaxed flex flex-col gap-0.5">
                    <span>Mobile: {sup.mobile}</span>
                    <span>GSTIN: {sup.gstin || 'Unregistered'}</span>
                    <span className="truncate">Address: {sup.address || 'No Address Logged'}</span>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-4 mt-6 border-t border-slate-100 dark:border-slate-800/80">
                  {isAdmin && (
                    <button
                      onClick={() => openSupplierModal(sup)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition-colors"
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

      {/* RESTOCK BUILDER TAB */}
      {activeTab === 'restock' && (
        <form onSubmit={handleRestockSubmit} className="grid grid-cols-1 xl:grid-cols-3 gap-8 text-slate-800 dark:text-slate-200">
          
          {/* Restock details */}
          <div className="xl:col-span-2 flex flex-col gap-6">
            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl shadow-sm flex flex-col gap-4">
              <h3 className="font-extrabold text-base mb-2">Restock Invoice Information</h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Select Supplier*</label>
                  <select
                    value={selectedSupplier}
                    onChange={(e) => setSelectedSupplier(e.target.value)}
                    className="px-3.5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none cursor-pointer"
                    required
                  >
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Purchase Invoice No*</label>
                  <input
                    type="text"
                    placeholder="e.g. WH-45920"
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

            {/* Inward Items Sheet */}
            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl shadow-sm flex flex-col gap-4">
              <h3 className="font-extrabold text-base">Inward Product Sheet</h3>
              
              {/* Product search box */}
              <div className="relative">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search catalog product to inward restock..."
                    value={prodSearch}
                    onChange={(e) => setProdSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none"
                  />
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>

                {prodResults.length > 0 && (
                  <div className="absolute top-full left-0 w-full bg-white dark:bg-slate-900 border border-slate-200 mt-1 rounded-xl shadow-xl z-20 overflow-y-auto max-h-48">
                    {prodResults.map(p => (
                      <button
                        key={p._id}
                        type="button"
                        onClick={() => addRestockItem(p)}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs font-semibold border-b border-slate-100"
                      >
                        {p.name} (SKU: {p.sku} | Cost: ₹{p.purchasePrice})
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Items grid */}
              <div className="flex flex-col gap-4 mt-2">
                {restockItems.length > 0 ? (
                  restockItems.map((item, idx) => (
                    <div key={item.product} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 rounded-2xl flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5"><CornerDownRight size={12} className="text-slate-400" /> {item.productName}</span>
                        <button
                          type="button"
                          onClick={() => removeRestockItem(idx)}
                          className="text-[10px] font-bold text-rose-500 uppercase hover:underline"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-4 gap-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Unit Cost (INR)</label>
                          <input
                            type="number"
                            value={item.purchasePrice}
                            onChange={(e) => updateRestockItemField(idx, 'purchasePrice', Number(e.target.value))}
                            className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none"
                            required
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Inward Qty</label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateRestockItemField(idx, 'quantity', Number(e.target.value))}
                            disabled={item.hasIMEI}
                            className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none disabled:opacity-40"
                            required
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">GST Rate (%)</label>
                          <input
                            type="number"
                            value={item.gstRate}
                            onChange={(e) => updateRestockItemField(idx, 'gstRate', Number(e.target.value))}
                            className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none"
                            required
                          />
                        </div>

                        {item.hasIMEI && (
                          <div className="col-span-4 mt-1 flex flex-col gap-1 animate-scaleUp">
                            <label className="text-[9px] font-bold text-cyan-500 uppercase flex items-center gap-1"><Barcode size={10} /> Incoming Serial / IMEI Numbers (Comma Separated)</label>
                            <input
                              type="text"
                              placeholder="e.g. 86904501, 86904502"
                              value={item.imeiString}
                              onChange={(e) => updateRestockItemField(idx, 'imeiString', e.target.value)}
                              className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-bold outline-none"
                              required
                            />
                            <span className="text-[9px] text-cyan-600 dark:text-cyan-400 font-bold">
                              Parsed {item.imeiString.split(',').map(i => i.trim()).filter(i => i.length > 0).length} IMEIs. This count locked the Inward Qty.
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center text-slate-400">
                    <span className="text-xs font-semibold">Product list is blank. Add items above to receive stock.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Checkout & summary column */}
          <div className="flex flex-col gap-6">
            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl shadow-sm">
              <h3 className="font-extrabold text-base mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-200 uppercase tracking-wider"><Calculator size={16} /> Calculations Summary</h3>
              
              <div className="flex flex-col gap-3 text-xs text-slate-500 mb-6">
                <div className="flex justify-between">
                  <span>Gross Subtotal:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">₹{restockTotals.subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax Amount (GST):</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">₹{restockTotals.gst.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
                  <span className="font-bold text-slate-900 dark:text-white">Wholesale Total:</span>
                  <span className="font-extrabold text-sm text-brand-500">₹{Math.round(restockTotals.total).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl mb-6">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Upfront Amount Paid (INR)</label>
                <input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(Number(e.target.value))}
                  className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none"
                />
                
                {amountPaid < Math.round(restockTotals.total) && (
                  <div className="mt-1 flex flex-col text-[10px] font-bold text-amber-600 dark:text-amber-400 gap-0.5">
                    <span>Outstanding Due: ₹{Math.max(0, Math.round(restockTotals.total) - amountPaid).toLocaleString('en-IN')}</span>
                    <span className="text-[8px] text-slate-400">(This amount adds to supplier accounts outstanding balance)</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={restockItems.length === 0}
                className="w-full py-4 bg-brand-500 hover:bg-brand-600 disabled:bg-slate-200 disabled:dark:bg-slate-800 font-bold text-white text-xs uppercase rounded-2xl shadow-xl shadow-brand-500/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Receipt size={14} />
                <span>Lock Inward & Receive Stock</span>
              </button>
            </div>
          </div>

        </form>
      )}

      {/* RESTOCK INVOICES LIST (HISTORY) */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="pos-grid-header">Receive Date</th>
                <th className="pos-grid-header">Supplier</th>
                <th className="pos-grid-header">Invoice Number</th>
                <th className="pos-grid-header text-right">Items Inward</th>
                <th className="pos-grid-header text-right">Total Cost</th>
                <th className="pos-grid-header text-right">Balance Due</th>
                <th className="pos-grid-header text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {purchases.length > 0 ? (
                purchases.map(p => (
                  <tr 
                    key={p._id} 
                    className="pos-grid-row cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors"
                    onClick={() => setSelectedPurchase(p)}
                  >
                    <td className="px-4 py-4 text-xs font-bold text-slate-800 dark:text-slate-200">
                      {new Date(p.purchaseDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-4 text-xs font-semibold text-slate-900 dark:text-white">
                      {p.supplier ? p.supplier.name : 'Unknown Supplier'}
                    </td>
                    <td className="px-4 py-4 text-xs font-bold text-slate-500">
                      {p.invoiceNumber}
                    </td>
                    <td className="px-4 py-4 text-right text-xs">
                      {p.items.reduce((sum, i) => sum + i.quantity, 0)} units
                    </td>
                    <td className="px-4 py-4 text-right font-black text-xs text-slate-900 dark:text-white">
                      ₹{Math.round(p.totalAmount).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-4 text-right text-xs font-bold text-rose-500">
                      ₹{Math.round(p.balanceDue).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${p.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500' : p.status === 'Partial' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'}`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-20 text-slate-400 dark:text-slate-600">
                    No purchase history registered.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* SUPPLIER MODAL FORM */}
      {supplierModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleSupplierSubmit}
            className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 flex flex-col gap-4 animate-scaleUp text-slate-800 dark:text-slate-200"
          >
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              {editSupplier ? 'Edit Supplier Profile' : 'Create Supplier profile'}
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
                <label className="text-[10px] font-bold uppercase text-slate-400">Contact Person Name</label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Mobile number*</label>
                <input
                  type="text"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-brand-500"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">GSTIN number</label>
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

            <div className="flex gap-4 mt-6 justify-end">
              <button
                type="button"
                onClick={() => setSupplierModal(false)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs uppercase"
              >
                Discard
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold text-xs uppercase"
              >
                Save Profile
              </button>
            </div>

          </form>
        </div>
      )}

      {/* RESTOCK INVOICE DETAILS MODAL */}
      {selectedPurchase && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedPurchase(null)}>
          <div 
            className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 flex flex-col gap-5 animate-scaleUp text-slate-800 dark:text-slate-200 max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Invoice Restock Record</span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  Invoice: {selectedPurchase.invoiceNumber}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${
                  selectedPurchase.status === 'Paid' 
                    ? 'bg-emerald-500/10 text-emerald-500' 
                    : selectedPurchase.status === 'Partial' 
                      ? 'bg-amber-500/10 text-amber-500' 
                      : 'bg-rose-500/10 text-rose-500'
                }`}>
                  {selectedPurchase.status}
                </span>
                <button 
                  onClick={() => setSelectedPurchase(null)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Supplier Info */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 text-xs">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">Supplier Name</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedPurchase.supplier ? selectedPurchase.supplier.name : 'Unknown Supplier'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">Contact Person</span>
                <span className="font-semibold">{selectedPurchase.supplier?.contactPerson || 'N/A'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">Mobile Number</span>
                <span className="font-semibold">{selectedPurchase.supplier?.mobile || 'N/A'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">Purchase Date</span>
                <span className="font-semibold">{new Date(selectedPurchase.purchaseDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
            </div>

            {/* Inward Items */}
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Inward Items List</h4>
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-250 dark:border-slate-850 text-[10px] font-bold text-slate-500 uppercase">
                      <th className="px-3 py-2.5">Product</th>
                      <th className="px-3 py-2.5 text-right">Cost Price</th>
                      <th className="px-3 py-2.5 text-center">Qty</th>
                      <th className="px-3 py-2.5 text-right">Tax (GST)</th>
                      <th className="px-3 py-2.5 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-xs">
                    {selectedPurchase.items.map((item: any, idx: number) => {
                      const lineTaxable = item.quantity * item.purchasePrice;
                      const lineGst = (lineTaxable * (item.gstRate || 0)) / 100;
                      const lineTotal = lineTaxable + lineGst;
                      return (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-850/40">
                          <td className="px-3 py-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-slate-900 dark:text-white">{item.product ? item.product.name : 'Deleted Product'}</span>
                              <span className="text-[9px] text-slate-400 font-mono">SKU: {item.product?.sku || 'N/A'}</span>
                              {item.imeiList && item.imeiList.length > 0 && (
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  {item.imeiList.map((im: string) => (
                                    <span key={im} className="px-1.5 py-0.5 bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 text-[8px] font-bold rounded-md font-mono border border-cyan-500/10">
                                      {im}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right font-semibold">₹{item.purchasePrice.toLocaleString('en-IN')}</td>
                          <td className="px-3 py-3 text-center font-bold">{item.quantity}</td>
                          <td className="px-3 py-3 text-right text-slate-500">₹{Math.round(lineGst).toLocaleString('en-IN')} ({item.gstRate}%)</td>
                          <td className="px-3 py-3 text-right font-black text-slate-900 dark:text-white">₹{Math.round(lineTotal).toLocaleString('en-IN')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Calculations Summary */}
            <div className="flex justify-between items-start border-t border-slate-100 dark:border-slate-800/80 pt-4 text-xs">
              <div className="text-slate-400 space-y-1">
                <div>Subtotal: <span className="font-semibold text-slate-700 dark:text-slate-300">₹{Math.round(selectedPurchase.subtotal).toLocaleString('en-IN')}</span></div>
                <div>GST Tax: <span className="font-semibold text-slate-700 dark:text-slate-300">₹{Math.round(selectedPurchase.totalGst).toLocaleString('en-IN')}</span></div>
              </div>
              <div className="text-right space-y-1.5">
                <div>Total Cost: <span className="font-black text-sm text-slate-900 dark:text-white">₹{Math.round(selectedPurchase.totalAmount).toLocaleString('en-IN')}</span></div>
                <div>Paid Upfront: <span className="font-bold text-emerald-500">₹{Math.round(selectedPurchase.amountPaid).toLocaleString('en-IN')}</span></div>
                <div className="border-t border-slate-100 dark:border-slate-850 pt-1.5">
                  Balance Due: <span className="font-black text-rose-500">₹{Math.round(selectedPurchase.balanceDue).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedPurchase(null)}
                className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs uppercase"
              >
                Close details
              </button>
            </div>
          </div>
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

export default Suppliers;
