import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Truck,
  BarChart3,
  Ticket,
  UsersRound,
  LogOut,
  Sun,
  Moon,
  Laptop
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<'light' | 'dark'>(
    (localStorage.getItem('theme') as 'light' | 'dark') || 'dark'
  );

  useEffect(() => {
    // Apply initial dark theme
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['admin', 'staff'] },
    { name: 'POS Billing', path: '/pos', icon: ShoppingCart, roles: ['admin', 'staff'] },
    { name: 'Inventory', path: '/inventory', icon: Package, roles: ['admin', 'staff'] },
    { name: 'Customers', path: '/customers', icon: Users, roles: ['admin', 'staff'] },
    { name: 'Suppliers & Restocks', path: '/suppliers', icon: Truck, roles: ['admin', 'staff'] },
    { name: 'Reports & Analytics', path: '/reports', icon: BarChart3, roles: ['admin', 'staff'] },
    { name: 'Coupons & Offers', path: '/coupons', icon: Ticket, roles: ['admin', 'staff'] },
    { name: 'Staff Management', path: '/users', icon: UsersRound, roles: ['admin'] } // Admin only
  ];

  const filteredItems = navItems.filter(item => user && item.roles.includes(user.role));

  return (
    <aside className="w-64 h-screen bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col justify-between shrink-0">
      {/* Upper Brand Section */}
      <div className="flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800 bg-slate-950/40">
          <div className="p-2 bg-brand-500 rounded-lg text-white shadow-lg shadow-brand-500/30 animate-pulse">
            <Laptop size={22} />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-white font-sans">TECH MART SALES & SERVICE</h1>
            <p className="text-[10px] uppercase font-bold tracking-widest text-brand-400">RetailPOS ERP</p>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="p-4 flex flex-col gap-1.5 overflow-y-auto max-h-[calc(100vh-220px)] mt-2">
          {filteredItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-150
                ${isActive
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                  : 'hover:bg-slate-800 hover:text-white text-slate-400'
                }
              `}
            >
              <item.icon size={18} />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Lower Profile Section */}
      <div className="p-4 border-t border-slate-800 flex flex-col gap-4 bg-slate-950/20">
        {/* Theme and Profile Info */}
        <div className="flex items-center justify-between px-2">
          <div className="flex flex-col">
            <p className="text-sm font-semibold text-white truncate max-w-[130px]">{user?.name}</p>
            <span className="text-[10px] font-bold uppercase tracking-wider text-accent-400">{user?.role}</span>
          </div>

          {/* Light/Dark Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            title="Toggle color theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-rose-500/10 hover:bg-rose-600 rounded-xl text-rose-400 hover:text-white text-sm font-semibold transition-all duration-150"
        >
          <LogOut size={16} />
          <span>Exit System</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
