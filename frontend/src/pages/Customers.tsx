import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Customer, Invoice } from '../types';
import { 
  Users, 
  Search, 
  Eye, 
  Award, 
  ShoppingCart,
  ShoppingBag,
  Clock,
  Printer,
  ChevronDown
} from 'lucide-react';

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  
  // History Modal states
  const [historyModal, setHistoryModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [purchaseHistory, setPurchaseHistory] = useState<Invoice[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

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

  useEffect(() => {
    fetchCustomers();
  }, [keyword]);

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

  return (
    <div className="flex-1 p-8 bg-slate-50 dark:bg-slate-950 overflow-y-auto h-screen transition-colors duration-200">
      
      {/* Header controls */}
      <header className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-sans">Customers Database</h2>
          <p className="text-slate-500 text-sm">Review customer profiles, purchase count history, and loyalty point logs.</p>
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

        {/* Database table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="pos-grid-header">Name</th>
                <th className="pos-grid-header">Mobile</th>
                <th className="pos-grid-header">Email / Address</th>
                <th className="pos-grid-header text-center">Loyalty Balance</th>
                <th className="pos-grid-header text-right">Invoices Cleared</th>
                <th className="pos-grid-header text-right">Total Net Spent</th>
                <th className="pos-grid-header text-center">Purchase History</th>
              </tr>
            </thead>
            <tbody>
              {customers.length > 0 ? (
                customers.map(cust => (
                  <tr key={cust._id} className="pos-grid-row">
                    <td className="px-4 py-4 text-sm font-semibold text-slate-900 dark:text-white">
                      {cust.name}
                    </td>
                    <td className="px-4 py-4 text-xs font-bold text-slate-700 dark:text-slate-300">
                      {cust.mobile}
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-500 leading-relaxed max-w-[200px] truncate">
                      <div className="flex flex-col">
                        <span>{cust.email || 'No email registered'}</span>
                        <span className="text-[10px] text-slate-400">{cust.address || 'No address logged'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="px-2.5 py-1 text-xs font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-full flex items-center gap-1.5 w-fit mx-auto">
                        <Award size={12} /> {cust.loyaltyPoints} pts
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right text-xs text-slate-600 dark:text-slate-400">
                      {cust.purchaseCount} bills
                    </td>
                    <td className="px-4 py-4 text-right font-black text-sm text-slate-900 dark:text-white">
                      ₹{Math.round(cust.totalSpent).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => viewPurchaseHistory(cust)}
                        className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-brand-500 hover:text-white rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 transition-all flex items-center gap-1.5 mx-auto"
                      >
                        <Eye size={12} />
                        <span>View Bills</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-20 text-slate-400 dark:text-slate-600">
                    No customers found in system.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PURCHASE HISTORY OVERLAY MODAL */}
      {historyModal && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 flex flex-col max-h-[85vh] animate-scaleUp text-slate-800 dark:text-slate-200">
            
            <header className="flex justify-between items-start mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <ShoppingBag size={18} className="text-brand-500" />
                  <span>Bills History: {selectedCustomer.name}</span>
                </h3>
                <span className="text-xs text-slate-400">Account Mob: {selectedCustomer.mobile} | Loyalty Points Balance: {selectedCustomer.loyaltyPoints} pts</span>
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
                          <span>{inv.invoiceNumber}</span>
                          <span className="text-slate-400 font-semibold">•</span>
                          <span className="text-slate-500 font-semibold flex items-center gap-1"><Clock size={11} /> {new Date(inv.createdAt).toLocaleDateString('en-IN')} {new Date(inv.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-0.5 bg-brand-500/10 text-brand-500 rounded-full font-bold">{inv.paymentMethod}</span>
                          <button
                          onClick={() => window.open(`http://127.0.0.1:5000/api/billing/invoices/${inv._id}/pdf?token=${localStorage.getItem('token')}`, '_blank')}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
                            title="Print Invoice"
                          >
                            <Printer size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Items loop */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        {inv.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">{item.brandName} {item.name} x{item.quantity}</span>
                              {item.imei && <span className="text-[8px] font-bold text-cyan-500 uppercase">IMEI: {item.imei}</span>}
                            </div>
                            <span className="font-black text-slate-900 dark:text-white">₹{item.finalPrice.toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                      </div>

                      {/* Calculations subtotal */}
                      <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-200/50 dark:border-slate-800/80 font-bold">
                        <span className="text-slate-400">Cashier: {inv.cashier.name}</span>
                        <div className="flex gap-4">
                          <span className="text-slate-400">Subtotal: ₹{inv.subtotal}</span>
                          <span className="text-slate-400">GST: ₹{inv.totalGst}</span>
                          <span className="text-slate-900 dark:text-white">Grand Total: ₹{inv.finalAmount}</span>
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

    </div>
  );
};

export default Customers;
