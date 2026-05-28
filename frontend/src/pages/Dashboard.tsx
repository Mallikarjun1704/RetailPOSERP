import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { DashboardStats } from '../types';
import { 
  TrendingUp, 
  AlertCircle, 
  IndianRupee, 
  DollarSign, 
  PackageCheck, 
  Clock, 
  CalendarDays,
  Percent
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const statsRes = await api.get('/reports/dashboard-stats');
      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }

      const chartRes = await api.get('/reports/chart-data');
      if (chartRes.data.success) {
        setChartData(chartRes.data.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard records:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const pollInterval = setInterval(fetchDashboardData, 30000); // refresh every 30 seconds
    return () => clearInterval(pollInterval);
  }, []);

  if (loading) {
    return (
      <div className="flex-1 h-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-slate-500">Loading terminal aggregates...</p>
        </div>
      </div>
    );
  }

  const kpis = [
    {
      title: "Today's Sales",
      value: `₹${stats?.todaySales.toLocaleString('en-IN') || 0}`,
      desc: "Gross retail invoice totals today",
      icon: IndianRupee,
      color: "bg-brand-500 text-white shadow-brand-500/20"
    },
    {
      title: "Today's Net Profit",
      value: `₹${stats?.todayProfit.toLocaleString('en-IN') || 0}`,
      desc: "Gross sales value minus wholesale cost",
      icon: TrendingUp,
      color: "bg-emerald-500 text-white shadow-emerald-500/20"
    },
    {
      title: "Monthly Sales",
      value: `₹${stats?.monthlySales.toLocaleString('en-IN') || 0}`,
      desc: "Cumulative gross sales this month",
      icon: CalendarDays,
      color: "bg-blue-500 text-white shadow-blue-500/20"
    },
    {
      title: "Monthly Profit",
      value: `₹${stats?.monthlyProfit.toLocaleString('en-IN') || 0}`,
      desc: "Net accumulated earnings this month",
      icon: Percent,
      color: "bg-teal-500 text-white shadow-teal-500/20"
    }
  ];

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-50 dark:bg-slate-950 h-screen transition-colors duration-200">
      {/* Upper header controls */}
      <header className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-sans">Dashboard</h2>
          <p className="text-slate-500 text-sm">Real-time telemetry and retail performance metrics.</p>
        </div>
        
        {stats && stats.lowStockAlerts > 0 && (
          <div className="px-4 py-2.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-2 text-rose-500 animate-pulse">
            <AlertCircle size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">{stats.lowStockAlerts} Low Stock Warnings Active</span>
          </div>
        )}
      </header>

      {/* KPI Cards Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="p-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl shadow-sm hover:shadow-md transition-shadow duration-200 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{kpi.title}</span>
              <span className="text-2xl font-black text-slate-950 dark:text-white font-sans">{kpi.value}</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{kpi.desc}</span>
            </div>
            <div className={`p-4 rounded-2xl shadow-lg shrink-0 ${kpi.color}`}>
              <kpi.icon size={22} />
            </div>
          </div>
        ))}
      </section>

      {/* Charts & Warning Grid */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Sales Chart Area */}
        <div className="xl:col-span-2 p-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Revenue & Profits</h3>
              <p className="text-xs text-slate-400">Timeline comparison for the past 30 days of sales</p>
            </div>
            <div className="flex gap-4 text-xs font-bold">
              <span className="flex items-center gap-1.5 text-brand-500"><span className="w-3 h-3 rounded-full bg-brand-500 inline-block"></span>Sales</span>
              <span className="flex items-center gap-1.5 text-emerald-500"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>Net Profit</span>
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} style={{ fontSize: '10px', fill: '#64748b' }} />
                <YAxis tickLine={false} axisLine={false} style={{ fontSize: '10px', fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '16px', color: '#fff' }}
                  labelStyle={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '4px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Invoices list */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl shrink-0">
              <Clock size={16} />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Recent Purchases</h3>
              <p className="text-xs text-slate-400">Invoices cleared on the POS system</p>
            </div>
          </div>

          <div className="flex flex-col gap-4 overflow-y-auto flex-1 max-h-[300px] pr-1">
            {stats?.recentInvoices && stats.recentInvoices.length > 0 ? (
              stats.recentInvoices.map((inv) => (
                <div key={inv._id} className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between hover:border-slate-200 transition-colors">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{inv.invoiceNumber}</span>
                    <span className="text-[10px] text-slate-400">{inv.customer.name} • {new Date(inv.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-black text-slate-900 dark:text-white">₹{inv.finalAmount.toLocaleString('en-IN')}</span>
                    <span className="text-[9px] font-bold px-2 py-0.5 bg-brand-500/10 text-brand-500 rounded-full">{inv.paymentMethod}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <span className="text-sm font-semibold">No sales logged today.</span>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
