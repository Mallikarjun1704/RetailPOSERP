import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { Customer, Invoice, InvoiceItem } from '../types';
import {
  Users,
  Search,
  Eye,
  Award,
  ShoppingCart,
  ShoppingBag,
  Clock,
  Printer,
  ChevronDown,
  Edit,
  Plus,
  Phone,
  Mail,
  MapPin,
  X,
  UserCheck,
  Download,
  FileSpreadsheet,
  Trash2,
  Receipt,
  Tag,
  Barcode,
  CreditCard,
  Percent
} from 'lucide-react';

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');

  // History Modal states
  const [historyModal, setHistoryModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [purchaseHistory, setPurchaseHistory] = useState<Invoice[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Edit / Add Customer Profile Modal states
  const [customerModal, setCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formName, setFormName] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formLoyaltyPoints, setFormLoyaltyPoints] = useState(0);

  // Edit Bill / Invoice Modal states
  const [editBillModal, setEditBillModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [billCustomerName, setBillCustomerName] = useState('');
  const [billCustomerMobile, setBillCustomerMobile] = useState('');
  const [billCustomerEmail, setBillCustomerEmail] = useState('');
  const [billCustomerAddress, setBillCustomerAddress] = useState('');
  const [billPaymentMethod, setBillPaymentMethod] = useState('Cash');
  const [billPaymentDetails, setBillPaymentDetails] = useState('');
  const [billGiftItem, setBillGiftItem] = useState('');
  const [billExtraDiscount, setBillExtraDiscount] = useState(0);
  const [billItems, setBillItems] = useState<InvoiceItem[]>([]);

  // CSV Export dropdown state
  const [exportDropdown, setExportDropdown] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

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

  const fetchCustomers = async () => {
    try {
      const { data } = await api.get(`/customers?keyword=${keyword}`);
      if (data.success) {
        setCustomers(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllInvoices = async () => {
    try {
      const { data } = await api.get('/billing/invoices');
      if (data.success) {
        setAllInvoices(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchAllInvoices();
  }, [keyword]);

  // Close CSV dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setExportDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const viewPurchaseHistory = async (cust: Customer) => {
    setSelectedCustomer(cust);
    setHistoryLoading(true);
    setHistoryModal(true);
    try {
      const { data } = await api.get(`/customers/${cust._id}/history`);
      if (data.success) {
        setPurchaseHistory(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openCustomerModal = (cust: Customer | null = null) => {
    setEditingCustomer(cust);
    if (cust) {
      setFormName(cust.name);
      setFormMobile(cust.mobile);
      setFormEmail(cust.email || '');
      setFormAddress(cust.address || '');
      setFormLoyaltyPoints(cust.loyaltyPoints || 0);
    } else {
      setFormName('');
      setFormMobile('');
      setFormEmail('');
      setFormAddress('');
      setFormLoyaltyPoints(0);
    }
    setCustomerModal(true);
  };

  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formMobile.trim()) {
      showError('Customer name and 10-digit mobile number are required.');
      return;
    }

    const payload = {
      name: formName.trim(),
      mobile: formMobile.trim(),
      email: formEmail.trim(),
      address: formAddress.trim(),
      loyaltyPoints: Number(formLoyaltyPoints) || 0
    };

    try {
      if (editingCustomer) {
        const { data } = await api.put(`/customers/${editingCustomer._id}`, payload);
        if (data.success) {
          showSuccess('Customer profile updated successfully!');
          setCustomerModal(false);
          fetchCustomers();
        }
      } else {
        const { data } = await api.post('/customers', payload);
        if (data.success) {
          showSuccess('New customer profile registered successfully!');
          setCustomerModal(false);
          fetchCustomers();
        }
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to save customer profile.');
    }
  };

  // -------------------------------------------------------------
  // EDIT BILL / INVOICE HANDLERS
  // -------------------------------------------------------------
  const openEditBillModal = (inv: Invoice) => {
    setEditingInvoice(inv);
    setBillCustomerName(inv.customer.name);
    setBillCustomerMobile(inv.customer.mobile);
    setBillCustomerEmail(inv.customer.email || '');
    setBillCustomerAddress(inv.customer.address || '');
    setBillPaymentMethod(inv.paymentMethod || 'Cash');
    setBillPaymentDetails(inv.paymentDetails || '');
    setBillGiftItem(inv.giftItem || '');
    setBillExtraDiscount(inv.totalDiscount || 0);
    // Deep clone items so user can edit safely
    setBillItems(JSON.parse(JSON.stringify(inv.items)));
    setEditBillModal(true);
  };

  const handleBillItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...billItems];
    const item = { ...updated[index], [field]: value };

    // Recalculate price and GST breakdown for this item
    const price = Number(item.sellingPrice) || 0;
    const discount = Number(item.discount) || 0;
    const qty = Number(item.quantity) || 1;
    const gstRate = Number(item.gstRate) || 0;

    const netUnit = Math.max(0, price - discount);
    const gstFactor = 1 + (gstRate / 100);
    const unitTaxable = gstFactor > 0 ? netUnit / gstFactor : netUnit;
    const unitGst = netUnit - unitTaxable;

    item.taxableAmount = Number((unitTaxable * qty).toFixed(2));
    item.gstAmount = Number((unitGst * qty).toFixed(2));
    item.finalPrice = Number((netUnit * qty).toFixed(2));

    updated[index] = item;
    setBillItems(updated);
  };

  const removeBillItem = (index: number) => {
    if (billItems.length === 1) {
      showError('A bill must contain at least one product.');
      return;
    }
    const updated = [...billItems];
    updated.splice(index, 1);
    setBillItems(updated);
  };

  // Compute live totals for the invoice being edited
  const computedSubtotal = billItems.reduce((sum, it) => sum + (Number(it.taxableAmount) || 0), 0);
  const computedTotalGst = billItems.reduce((sum, it) => sum + (Number(it.gstAmount) || 0), 0);
  const computedCgst = computedTotalGst / 2;
  const computedSgst = computedTotalGst / 2;
  const computedGrandTotal = Math.round(computedSubtotal + computedTotalGst - (Number(billExtraDiscount) || 0));

  const handleSaveBillEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;

    if (!billCustomerName.trim() || !billCustomerMobile.trim()) {
      showError('Customer name and mobile are required.');
      return;
    }

    const payload = {
      customer: {
        name: billCustomerName.trim(),
        mobile: billCustomerMobile.trim(),
        email: billCustomerEmail.trim(),
        address: billCustomerAddress.trim()
      },
      items: billItems.map(it => ({
        product: it.product,
        name: it.name,
        sku: it.sku,
        brandName: it.brandName,
        categoryName: it.categoryName,
        quantity: Number(it.quantity) || 1,
        mrp: Number(it.mrp) || Number(it.sellingPrice),
        sellingPrice: Number(it.sellingPrice) || 0,
        discount: Number(it.discount) || 0,
        gstRate: Number(it.gstRate) || 0,
        imei: it.imei ? it.imei.trim() : ''
      })),
      paymentMethod: billPaymentMethod,
      paymentDetails: billPaymentDetails.trim(),
      giftItem: billGiftItem.trim(),
      extraDiscount: Number(billExtraDiscount) || 0
    };

    try {
      const { data } = await api.put(`/billing/invoices/${editingInvoice._id}`, payload);
      if (data.success) {
        showSuccess('Invoice bill updated successfully!');
        setEditBillModal(false);
        setEditingInvoice(null);
        // Refresh customer list & purchase history
        fetchCustomers();
        if (selectedCustomer) {
          const histRes = await api.get(`/customers/${selectedCustomer._id}/history`);
          if (histRes.data.success) setPurchaseHistory(histRes.data.data);
        }
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to update customer invoice.');
    }
  };

  // -------------------------------------------------------------
  // CSV EXPORT LOGIC (GST, NON-GST & ALL)
  // -------------------------------------------------------------
  const exportToCSV = async (type: 'all' | 'gst' | 'nongst' | 'customers') => {
    setExportDropdown(false);
    try {
      if (type === 'customers') {
        // Export customer master list
        const headers = ['Customer Name', 'Mobile Number', 'Email Address', 'Billing Address', 'Loyalty Points Balance', 'Total Bills Cleared', 'Total CGST Paid (INR)', 'Total SGST Paid (INR)', 'Total Bill Amount (INR)'];
        const rows = customers.map(c => [
          `"${c.name.replace(/"/g, '""')}"`,
          `"${c.mobile}"`,
          `"${(c.email || '').replace(/"/g, '""')}"`,
          `"${(c.address || '').replace(/"/g, '""')}"`,
          c.loyaltyPoints || 0,
          c.purchaseCount || 0,
          (c.totalCgst || 0).toFixed(2),
          (c.totalSgst || 0).toFixed(2),
          (c.totalSpent || 0).toFixed(2)
        ]);

        downloadCSV([headers, ...rows], `TECHMART_Customers_Database_${new Date().toISOString().slice(0, 10)}.csv`);
        showSuccess('Customer profiles exported to CSV!');
        return;
      }

      // Fetch all invoices from backend for transactional export
      const { data } = await api.get('/billing/invoices');
      if (!data.success || !data.data) {
        showError('No invoices found to export.');
        return;
      }

      let invoicesList: Invoice[] = data.data;

      if (type === 'gst') {
        // Filter invoices containing GST > 0
        invoicesList = invoicesList.filter(inv => (inv.totalGst || 0) > 0 || inv.items.some(i => (i.gstRate || 0) > 0));
      } else if (type === 'nongst') {
        // Filter non-GST invoices (zero tax / exempt)
        invoicesList = invoicesList.filter(inv => (inv.totalGst || 0) === 0 && inv.items.every(i => (i.gstRate || 0) === 0));
      }

      if (invoicesList.length === 0) {
        showError(`No ${type === 'gst' ? 'GST' : 'Non-GST'} invoices found for export.`);
        return;
      }

      const headers = [
        'Invoice Number',
        'Invoice Date',
        'Customer Name',
        'Customer Mobile',
        'Customer Email',
        'Customer Address',
        'Product Name',
        'SKU',
        'Brand',
        'Category',
        'IMEI / Serial Number',
        'Quantity',
        'Selling Price (INR)',
        'Discount (INR)',
        'Taxable Amount (INR)',
        'GST Rate (%)',
        'CGST Amount (INR)',
        'SGST Amount (INR)',
        'Total GST (INR)',
        'Item Final Price (INR)',
        'Invoice Subtotal (INR)',
        'Invoice Total GST (INR)',
        'Invoice Grand Total (INR)',
        'Payment Method',
        'Payment Details',
        'Complimentary Gift',
        'GST Type'
      ];

      const rows: any[] = [];
      invoicesList.forEach(inv => {
        const invDate = new Date(inv.createdAt).toLocaleDateString('en-IN');
        const gstType = (inv.totalGst || 0) > 0 ? 'GST Tax Invoice' : 'Non-GST / Exempt';

        inv.items.forEach(item => {
          const itemGst = item.gstAmount || 0;
          const cgst = (itemGst / 2).toFixed(2);
          const sgst = (itemGst / 2).toFixed(2);

          rows.push([
            `"${inv.invoiceNumber}"`,
            `"${invDate}"`,
            `"${(inv.customer.name || '').replace(/"/g, '""')}"`,
            `"${inv.customer.mobile || ''}"`,
            `"${(inv.customer.email || '').replace(/"/g, '""')}"`,
            `"${(inv.customer.address || '').replace(/"/g, '""')}"`,
            `"${(item.name || '').replace(/"/g, '""')}"`,
            `"${item.sku || ''}"`,
            `"${item.brandName || ''}"`,
            `"${item.categoryName || ''}"`,
            `"${item.imei || ''}"`,
            item.quantity,
            item.sellingPrice.toFixed(2),
            (item.discount || 0).toFixed(2),
            item.taxableAmount.toFixed(2),
            `${item.gstRate}%`,
            cgst,
            sgst,
            itemGst.toFixed(2),
            item.finalPrice.toFixed(2),
            inv.subtotal.toFixed(2),
            inv.totalGst.toFixed(2),
            inv.finalAmount.toFixed(2),
            `"${inv.paymentMethod || 'Cash'}"`,
            `"${(inv.paymentDetails || '').replace(/"/g, '""')}"`,
            `"${(inv.giftItem || '').replace(/"/g, '""')}"`,
            `"${gstType}"`
          ]);
        });
      });

      const filename = `TECHMART_Sales_${type.toUpperCase()}_Report_${new Date().toISOString().slice(0, 10)}.csv`;
      downloadCSV([headers, ...rows], filename);
      showSuccess(`Exported ${invoicesList.length} ${type.toUpperCase()} invoices to CSV!`);
    } catch (err: any) {
      console.error(err);
      showError('Failed to generate CSV export.');
    }
  };

  const downloadCSV = (dataRows: any[][], filename: string) => {
    const csvContent = 'data:text/csv;charset=utf-8,' + dataRows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-sans">Customers Database</h2>
          <p className="text-slate-500 text-sm">Review customer profiles, edit bill items/pricing/GST/IMEI, CGST & SGST taxes, and export CSV logs.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* CSV Export Dropdown */}
          <div className="relative" ref={exportDropdownRef}>
            <button
              onClick={() => setExportDropdown(!exportDropdown)}
              className="px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-xs font-bold uppercase text-slate-700 dark:text-slate-200 shadow-sm active:scale-[0.98] transition-all flex items-center gap-2"
            >
              <FileSpreadsheet size={15} className="text-emerald-500" />
              <span>Export CSV</span>
              <ChevronDown size={14} className="text-slate-400" />
            </button>

            {exportDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 p-2 flex flex-col gap-1 animate-scaleUp text-xs font-semibold text-slate-700 dark:text-slate-200">
                <button
                  onClick={() => exportToCSV('all')}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-2.5"
                >
                  <Download size={13} className="text-brand-500" />
                  <span>All Sales Invoices (Full)</span>
                </button>
                <button
                  onClick={() => exportToCSV('gst')}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl transition-colors flex items-center gap-2.5"
                >
                  <Percent size={13} className="text-emerald-500" />
                  <span>GST Invoices (CGST/SGST)</span>
                </button>
                <button
                  onClick={() => exportToCSV('nongst')}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 rounded-xl transition-colors flex items-center gap-2.5"
                >
                  <Tag size={13} className="text-amber-500" />
                  <span>Non-GST / Exempt Invoices</span>
                </button>
                <div className="border-t border-slate-100 dark:border-slate-800 my-1"></div>
                <button
                  onClick={() => exportToCSV('customers')}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-2.5"
                >
                  <Users size={13} className="text-indigo-500" />
                  <span>Customer Master Profiles</span>
                </button>
              </div>
            )}
          </div>

          {/* New Customer Profile Button */}
          <button
            onClick={() => openCustomerModal(null)}
            className="px-5 py-3 bg-brand-500 hover:bg-brand-600 rounded-2xl text-xs font-extrabold uppercase text-white shadow-lg shadow-brand-500/20 active:scale-[0.98] transition-all flex items-center gap-2"
          >
            <Plus size={14} />
            <span>New Customer</span>
          </button>
        </div>
      </header>

      {/* Filter shelf */}
      <div className="flex flex-col gap-6">
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Search by name or 10-digit mobile number..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full pl-10 pr-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs outline-none focus:border-brand-500 text-slate-900 dark:text-white shadow-sm"
          />
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        {/* Database table with Invoice No, Date, Product Name, CGST and SGST columns */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="pos-grid-header">Invoice No</th>
                <th className="pos-grid-header">Date</th>
                <th className="pos-grid-header">Name</th>
                <th className="pos-grid-header">Mobile</th>
                <th className="pos-grid-header">Product Name</th>
                <th className="pos-grid-header text-right">CGST (₹)</th>
                <th className="pos-grid-header text-right">SGST (₹)</th>
                <th className="pos-grid-header text-right">Total Bill Amount</th>
                <th className="pos-grid-header text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-20 text-slate-400">
                    Loading customer bills...
                  </td>
                </tr>
              ) : (() => {
                // Filter invoices by keyword (customer name or mobile)
                const filteredInvoices = keyword.trim()
                  ? allInvoices.filter(inv =>
                    inv.customer.name.toLowerCase().includes(keyword.toLowerCase()) ||
                    inv.customer.mobile.includes(keyword)
                  )
                  : allInvoices;

                return filteredInvoices.length > 0 ? (
                  filteredInvoices.map(inv => {
                    const invCgst = inv.items.reduce((sum, it) => sum + ((it.gstAmount || 0) / 2), 0);
                    const invSgst = invCgst;
                    const invDate = new Date(inv.createdAt);
                    const dateStr = `${String(invDate.getDate()).padStart(2, '0')}/${String(invDate.getMonth() + 1).padStart(2, '0')}/${invDate.getFullYear()}`;
                    const productNames = inv.items.map(it => it.name).join(', ');

                    // Find matching customer from customer list for profile edit
                    const matchedCustomer = customers.find(c => c._id === inv.customer.customerId);

                    return (
                      <tr key={inv._id} className="pos-grid-row">
                        <td className="px-4 py-4 text-xs font-bold text-brand-500">
                          {inv.invoiceNumber}
                        </td>
                        <td className="px-4 py-4 text-xs font-bold text-slate-600 dark:text-slate-400">
                          {dateStr}
                        </td>
                        <td className="px-4 py-4 text-sm font-semibold text-slate-900 dark:text-white">
                          {inv.customer.name}
                        </td>
                        <td className="px-4 py-4 text-xs font-bold text-slate-700 dark:text-slate-300">
                          {inv.customer.mobile}
                        </td>
                        <td className="px-4 py-4 text-xs text-slate-700 dark:text-slate-300 max-w-[220px]">
                          <div className="flex flex-col gap-0.5">
                            {inv.items.map((it, idx) => (
                              <span key={idx} className="font-semibold truncate">
                                {it.name} {it.quantity > 1 ? `(×${it.quantity})` : ''}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right text-xs font-bold text-slate-700 dark:text-slate-300">
                          ₹{Math.round(invCgst).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-4 text-right text-xs font-bold text-slate-700 dark:text-slate-300">
                          ₹{Math.round(invSgst).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-4 text-right font-black text-sm text-slate-900 dark:text-white">
                          ₹{Math.round(inv.finalAmount).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {matchedCustomer && (
                              <button
                                onClick={() => openCustomerModal(matchedCustomer)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 hover:text-brand-500 transition-colors"
                                title="Edit Customer Profile"
                              >
                                <Edit size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => openEditBillModal(inv)}
                              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-brand-500 hover:text-white rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 transition-all flex items-center gap-1.5"
                              title="Edit Invoice Items & Pricing"
                            >
                              <Receipt size={12} />
                              <span>Edit Bill</span>
                            </button>
                            <button
                              onClick={() => window.open(`http://127.0.0.1:5000/api/billing/invoices/${inv._id}/pdf?token=${localStorage.getItem('token')}`, '_blank')}
                              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 hover:text-emerald-500 transition-colors"
                              title="Print Invoice PDF"
                            >
                              <Printer size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center py-20 text-slate-400 dark:text-slate-600">
                      No customer bills found in system.
                    </td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT / CREATE CUSTOMER PROFILE MODAL */}
      {customerModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCustomerSubmit}
            className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 flex flex-col gap-4 animate-scaleUp text-slate-800 dark:text-slate-200"
          >
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck size={18} className="text-brand-500" />
                <span>{editingCustomer ? 'Edit Customer Profile' : 'Register New Customer'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setCustomerModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Full Name*</label>
                <input
                  type="text"
                  placeholder="e.g. Anand Sharma"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Mobile Number*</label>
                <input
                  type="text"
                  placeholder="10-digit mobile number"
                  value={formMobile}
                  onChange={(e) => setFormMobile(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. customer@example.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Loyalty Points</label>
                <input
                  type="number"
                  placeholder="Points balance"
                  value={formLoyaltyPoints}
                  onChange={(e) => setFormLoyaltyPoints(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                  min={0}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Billing / Delivery Address</label>
              <textarea
                placeholder="Door No, Street, City, Pincode"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-brand-500 text-slate-900 dark:text-white resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 py-3 bg-brand-500 hover:bg-brand-600 rounded-xl text-white font-bold text-xs uppercase transition-colors"
              >
                {editingCustomer ? 'Update Profile' : 'Create Profile'}
              </button>
              <button
                type="button"
                onClick={() => setCustomerModal(false)}
                className="px-5 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-bold text-xs uppercase text-slate-600 dark:text-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PURCHASE HISTORY OVERLAY MODAL */}
      {historyModal && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 flex flex-col max-h-[90vh] animate-scaleUp text-slate-800 dark:text-slate-200">

            <header className="flex justify-between items-start mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <ShoppingBag size={18} className="text-brand-500" />
                  <span>Bills History: {selectedCustomer.name}</span>
                </h3>
                <span className="text-xs text-slate-400">Account Mob: {selectedCustomer.mobile} | Loyalty Balance: {selectedCustomer.loyaltyPoints} pts</span>
              </div>
              <button
                onClick={() => { setHistoryModal(false); setSelectedCustomer(null); setPurchaseHistory([]); }}
                className="text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 uppercase"
              >
                Close
              </button>
            </header>

            {/* List panel */}
            <div className="flex-1 overflow-y-auto">
              {historyLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs font-semibold text-slate-500">Mapping history invoices...</span>
                </div>
              ) : purchaseHistory.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {purchaseHistory.map(inv => (
                    <div key={inv._id} className="p-4 bg-slate-50 dark:bg-slate-950/50 border border-slate-200/50 dark:border-slate-850 rounded-2xl flex flex-col gap-3.5 hover:border-slate-300 dark:hover:border-slate-800 transition-colors">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-3 font-bold text-slate-900 dark:text-white">
                          <span className="text-sm font-extrabold text-brand-500">{inv.invoiceNumber}</span>
                          <span className="text-slate-400 font-semibold">•</span>
                          <span className="text-slate-500 font-semibold flex items-center gap-1"><Clock size={11} /> {new Date(inv.createdAt).toLocaleDateString('en-IN')} {new Date(inv.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 bg-brand-500/10 text-brand-500 rounded-full font-bold">{inv.paymentMethod}</span>

                          {/* EDIT BILL BUTTON */}
                          <button
                            onClick={() => openEditBillModal(inv)}
                            className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1"
                            title="Edit Bill Items / Price / IMEI / GST"
                          >
                            <Edit size={12} className="text-brand-500" />
                            <span>Edit Bill</span>
                          </button>

                          {/* PRINT BUTTON */}
                          <button
                            onClick={() => window.open(`http://127.0.0.1:5000/api/billing/invoices/${inv._id}/pdf?token=${localStorage.getItem('token')}`, '_blank')}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
                            title="Print GST Tax Invoice"
                          >
                            <Printer size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Items loop */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        {inv.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">{item.brandName ? `${item.brandName} - ` : ''}{item.name} x{item.quantity}</span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-slate-400">Price: ₹{item.sellingPrice} | GST: {item.gstRate}%</span>
                                {item.imei && <span className="text-[9px] font-bold text-cyan-500 uppercase bg-cyan-500/10 px-1.5 py-0.2 rounded">IMEI: {item.imei}</span>}
                              </div>
                            </div>
                            <span className="font-black text-slate-900 dark:text-white">₹{item.finalPrice.toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                      </div>

                      {/* Calculations subtotal */}
                      <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-200/50 dark:border-slate-800/80 font-bold">
                        <span className="text-slate-400">Cashier: {inv.cashier.name}</span>
                        <div className="flex gap-4">
                          <span className="text-slate-500">Taxable: ₹{inv.subtotal}</span>
                          <span className="text-slate-500">CGST (9%): ₹{(inv.totalGst / 2).toFixed(2)}</span>
                          <span className="text-slate-500">SGST (9%): ₹{(inv.totalGst / 2).toFixed(2)}</span>
                          <span className="text-slate-900 dark:text-white text-sm">Grand Total: ₹{inv.finalAmount}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center text-slate-400">
                  <span>No purchase invoices found for this customer.</span>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* EDIT CUSTOMER BILL / INVOICE MODAL */}
      {/* ============================================================== */}
      {editBillModal && editingInvoice && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveBillEdit}
            className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 flex flex-col gap-5 overflow-y-auto max-h-[92vh] animate-scaleUp text-slate-800 dark:text-slate-200"
          >
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Receipt size={20} className="text-brand-500" />
                  <span>Edit Invoice: {editingInvoice.invoiceNumber}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Modify selling prices, IMEI/Serial numbers, GST rates (CGST & SGST), and billed customer information.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditBillModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Customer Details Section */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200/50 dark:border-slate-800 rounded-2xl flex flex-col gap-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Customer Billed Information</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-slate-400">Customer Name*</label>
                  <input
                    type="text"
                    value={billCustomerName}
                    onChange={(e) => setBillCustomerName(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-slate-400">Mobile Number*</label>
                  <input
                    type="text"
                    value={billCustomerMobile}
                    onChange={(e) => setBillCustomerMobile(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-slate-400">Delivery Address</label>
                  <input
                    type="text"
                    value={billCustomerAddress}
                    onChange={(e) => setBillCustomerAddress(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Bill Purchased Items List */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Invoice Products & Taxation Items</span>
              <div className="flex flex-col gap-3">
                {billItems.map((item, idx) => {
                  const netPrice = (Number(item.sellingPrice) || 0) - (Number(item.discount) || 0);
                  const gstF = 1 + ((Number(item.gstRate) || 0) / 100);
                  const uTaxable = gstF > 0 ? netPrice / gstF : netPrice;
                  const itemGst = (netPrice - uTaxable) * (Number(item.quantity) || 1);
                  const itemCgst = itemGst / 2;
                  const itemSgst = itemGst / 2;

                  return (
                    <div key={idx} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col gap-3 shadow-sm">
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">{item.brandName ? `${item.brandName} - ` : ''}{item.name}</span>
                          <span className="text-[10px] text-slate-400">SKU: {item.sku}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeBillItem(idx)}
                          className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                          title="Remove item from invoice"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                        {/* Selling Price */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Unit Price (₹)*</label>
                          <input
                            type="number"
                            value={item.sellingPrice}
                            onChange={(e) => handleBillItemChange(idx, 'sellingPrice', Number(e.target.value))}
                            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-brand-500"
                            min={0}
                            required
                          />
                        </div>

                        {/* Quantity */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Quantity*</label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleBillItemChange(idx, 'quantity', Number(e.target.value))}
                            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-brand-500"
                            min={1}
                            required
                          />
                        </div>

                        {/* Discount */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Discount (₹)</label>
                          <input
                            type="number"
                            value={item.discount || 0}
                            onChange={(e) => handleBillItemChange(idx, 'discount', Number(e.target.value))}
                            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-brand-500"
                            min={0}
                          />
                        </div>

                        {/* GST Rate */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">GST Rate (%)</label>
                          <select
                            value={item.gstRate}
                            onChange={(e) => handleBillItemChange(idx, 'gstRate', Number(e.target.value))}
                            className="px-2 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none cursor-pointer focus:border-brand-500"
                          >
                            <option value={18}>18% GST</option>
                            <option value={28}>28% GST</option>
                            <option value={12}>12% GST</option>
                            <option value={5}>5% GST</option>
                            <option value={0}>0% (Exempt)</option>
                          </select>
                        </div>

                        {/* CGST & SGST Display */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">CGST / SGST</label>
                          <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 py-1.5">
                            ₹{itemCgst.toFixed(2)} + ₹{itemSgst.toFixed(2)}
                          </div>
                        </div>

                        {/* Line Total */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Line Total</label>
                          <div className="text-sm font-black text-slate-900 dark:text-white py-1">
                            ₹{item.finalPrice}
                          </div>
                        </div>
                      </div>

                      {/* IMEI / Serial Field */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <Barcode size={14} className="text-cyan-500" />
                        <span className="text-[10px] font-bold uppercase text-slate-400">IMEI / Serial Number:</span>
                        <input
                          type="text"
                          placeholder="e.g. 869032123456789 (optional)"
                          value={item.imei || ''}
                          onChange={(e) => handleBillItemChange(idx, 'imei', e.target.value)}
                          className="flex-1 px-2.5 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono text-cyan-600 dark:text-cyan-400 outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payment & Offer settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200/50 dark:border-slate-800 rounded-2xl">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Payment Method</label>
                <select
                  value={billPaymentMethod}
                  onChange={(e) => setBillPaymentMethod(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none text-slate-900 dark:text-white cursor-pointer"
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Credit / Debit Card</option>
                  <option value="UPI">UPI / QR Code</option>
                  <option value="EMI">Bajaj / HDFC EMI</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Payment Transaction Ref</label>
                <input
                  type="text"
                  placeholder="Txn ID / Card Approval Ref"
                  value={billPaymentDetails}
                  onChange={(e) => setBillPaymentDetails(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Complimentary Gift / Offer</label>
                <input
                  type="text"
                  placeholder="e.g. Free Earbuds / Cover"
                  value={billGiftItem}
                  onChange={(e) => setBillGiftItem(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Calculations Summary Panel */}
            <div className="p-4 bg-slate-950 text-white rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex flex-wrap gap-6 text-xs text-slate-400">
                <div>Taxable Subtotal: <span className="font-bold text-white">₹{computedSubtotal.toFixed(2)}</span></div>
                <div>CGST (9%): <span className="font-bold text-white">₹{computedCgst.toFixed(2)}</span></div>
                <div>SGST (9%): <span className="font-bold text-white">₹{computedSgst.toFixed(2)}</span></div>
                <div>Total GST: <span className="font-bold text-emerald-400">₹{computedTotalGst.toFixed(2)}</span></div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Grand Total (Round Off)</span>
                  <div className="text-2xl font-black text-brand-400">₹{computedGrandTotal.toLocaleString('en-IN')}.00</div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditBillModal(false)}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold uppercase transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 rounded-xl text-xs font-bold uppercase text-white shadow-lg shadow-brand-500/30 transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>

          </form>
        </div>
      )}

    </div>
  );
};

export default Customers;
