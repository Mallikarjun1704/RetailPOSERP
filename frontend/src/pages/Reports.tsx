import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Invoice } from '../types';
import { 
  BarChart3, 
  Calendar, 
  Download, 
  Upload, 
  Database,
  Printer, 
  FileSpreadsheet,
  Award,
  Sparkles,
  TrendingUp
} from 'lucide-react';

const Reports: React.FC = () => {
  const { user } = useAuth();
  
  // Date states (default: last 30 days)
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Report results
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<any>({
    invoiceCount: 0,
    totalSales: 0,
    totalTaxable: 0,
    totalGst: 0,
    totalProfit: 0
  });
  const [loading, setLoading] = useState(true);

  // System actions state
  const [restoring, setRestoring] = useState(false);

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

  const fetchSalesReport = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/reports/sales-report', { startDate, endDate });
      if (data.success) {
        setInvoices(data.data.invoices);
        setSummary(data.data.summary);
      }
    } catch (err) {
      console.error('Error compiling reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesReport();
  }, [startDate, endDate]);

  const handleExportExcel = async () => {
    try {
      const response = await api.post('/reports/export-excel', { startDate, endDate }, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `Sales_GST_Report_${startDate}_to_${endDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      showSuccess('Excel sales sheet compiled successfully!');
    } catch (err) {
      showError('Excel compile failed.');
    }
  };

  const handleBackupDatabase = async () => {
    try {
      const response = await api.get('/system/backup', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/json' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `RetailPOS_Backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      showSuccess('Database structural JSON backup downloaded!');
    } catch (err) {
      showError('System backup compilation failed.');
    }
  };

  const handleRestoreDatabase = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('WARNING: Restoring the database will completely overwrite all existing inventories, products, users, and invoices. This action is irreversible. Proceed?')) {
      e.target.value = ''; // Reset input
      return;
    }

    setRestoring(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backupData = JSON.parse(event.target?.result as string);
        const { data } = await api.post('/system/restore', { backupData });
        if (data.success) {
          showSuccess('Database restored successfully! Restarting session...');
          setTimeout(() => window.location.reload(), 2000);
        }
      } catch (err: any) {
        showError(err.response?.data?.message || 'Restore failed. Make sure it is a valid RetailPOS backup JSON file.');
      } finally {
        setRestoring(false);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex-1 p-8 bg-slate-50 dark:bg-slate-950 overflow-y-auto h-screen transition-colors duration-200">
      
      {/* Header controls */}
      <header className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-sans">Reports & Systems</h2>
          <p className="text-slate-500 text-sm">Download accounting reports, review tax schedules, and manage offline data backups.</p>
        </div>
      </header>

      {/* Inputs selectors & actions row */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 mb-8 text-slate-800 dark:text-slate-200">
        
        {/* Date Filters shelf */}
        <div className="xl:col-span-3 p-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl shadow-sm flex flex-wrap gap-6 items-center justify-between">
          <div className="flex gap-4 items-center">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none cursor-pointer"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none cursor-pointer"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={fetchSalesReport}
              className="px-4 py-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold rounded-2xl text-xs uppercase transition-all flex items-center gap-2"
            >
              Recalculate
            </button>
            <button
              onClick={handleExportExcel}
              className="px-5 py-3 bg-brand-500 hover:bg-brand-600 font-extrabold rounded-2xl text-xs uppercase text-white shadow-lg shadow-brand-500/20 active:scale-[0.98] transition-all flex items-center gap-2"
            >
              <FileSpreadsheet size={14} />
              <span>Export GST Excel</span>
            </button>
          </div>
        </div>

        {/* System administrative block */}
        {user?.role === 'admin' && (
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl shadow-sm flex flex-col justify-center gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5"><Database size={13} /> Maintenance Tools</h3>
            
            <div className="grid grid-cols-2 gap-2 text-center">
              <button
                onClick={handleBackupDatabase}
                className="py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl text-[10px] font-extrabold uppercase text-slate-700 dark:text-slate-200 transition-colors flex flex-col items-center justify-center gap-1"
              >
                <Download size={14} />
                <span>Backup DB</span>
              </button>
              
              <label className="py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl text-[10px] font-extrabold uppercase text-slate-700 dark:text-slate-200 transition-colors flex flex-col items-center justify-center gap-1 cursor-pointer">
                <Upload size={14} />
                <span>{restoring ? 'Restoring...' : 'Restore DB'}</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreDatabase}
                  disabled={restoring}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

      </div>

      {/* KPI statistics cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-6 mb-8 text-slate-800 dark:text-slate-200">
        {[
          { title: "Billed Revenue", value: `₹${summary.totalSales.toLocaleString('en-IN')}`, desc: "Gross total collected including GST", col: "text-brand-500" },
          { title: "Taxable Subtotal", value: `₹${summary.totalTaxable.toLocaleString('en-IN')}`, desc: "Invoice subtotal before tax additions", col: "text-slate-800 dark:text-slate-200" },
          { title: "CGST Aggregate", value: `₹${Math.round(summary.totalGst / 2).toLocaleString('en-IN')}`, desc: "Central GST portion (50% value)", col: "text-cyan-500" },
          { title: "SGST Aggregate", value: `₹${Math.round(summary.totalGst / 2).toLocaleString('en-IN')}`, desc: "State GST portion (50% value)", col: "text-cyan-500" },
          { title: "Net Net Profit", value: `₹${summary.totalProfit.toLocaleString('en-IN')}`, desc: "Store profit margins on items sold", col: "text-emerald-500" }
        ].map((k, idx) => (
          <div key={idx} className="p-5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl flex flex-col gap-1 shadow-sm">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">{k.title}</span>
            <span className={`text-xl font-black font-sans ${k.col}`}>{k.value}</span>
            <span className="text-[9px] text-slate-400 mt-1 leading-tight">{k.desc}</span>
          </div>
        ))}
      </section>

      {/* Table grid listing matching invoices */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Transaction ledger</h3>
            <span className="text-xs text-slate-400">Ledger details for {summary.invoiceCount} invoices cleared.</span>
          </div>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="pos-grid-header">Invoice Number</th>
              <th className="pos-grid-header">Billed Customer</th>
              <th className="pos-grid-header">Cleared Date</th>
              <th className="pos-grid-header text-right">Taxable Subtotal</th>
              <th className="pos-grid-header text-right">GST Total</th>
              <th className="pos-grid-header text-right">Net Value Billed</th>
              <th className="pos-grid-header text-center">Print Preview</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length > 0 ? (
              invoices.map(inv => (
                <tr key={inv._id} className="pos-grid-row">
                  <td className="px-4 py-4 text-xs font-bold text-slate-850 dark:text-slate-200">
                    {inv.invoiceNumber}
                  </td>
                  <td className="px-4 py-4 text-xs">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900 dark:text-white">{inv.customer.name}</span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase">{inv.customer.mobile}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-500">
                    {new Date(inv.createdAt).toLocaleDateString('en-IN')} {new Date(inv.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-4 text-right text-xs">
                    ₹{inv.subtotal.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-4 text-right text-xs">
                    ₹{inv.totalGst.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-4 text-right font-black text-sm text-slate-900 dark:text-white">
                    ₹{inv.finalAmount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <button
                      onClick={() => window.open(`http://127.0.0.1:5000/api/billing/invoices/${inv._id}/pdf?token=${localStorage.getItem('token')}`, '_blank')}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition-colors"
                      title="Open Invoice PDF"
                    >
                      <Printer size={13} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="text-center py-20 text-slate-400 dark:text-slate-600">
                  No invoices matched for selected date parameters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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

export default Reports;
