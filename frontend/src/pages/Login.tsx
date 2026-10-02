import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User as UserIcon, Sparkles, UserPlus, ShieldCheck, RefreshCw, KeyRound } from 'lucide-react';
import api from '../utils/api';
import TMLogo from '../components/TMLogo';

const Login: React.FC = () => {
  const { login, registerUser, user } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverReady, setServerReady] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Bootstrap mode states
  const [isBootstrap, setIsBootstrap] = useState(false);
  const [bootstrapName, setBootstrapName] = useState('');
  const [bootstrapUsername, setBootstrapUsername] = useState('admin');
  const [bootstrapPassword, setBootstrapPassword] = useState('');

  useEffect(() => {
    // If user is already logged in, send them straight to dashboard
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Check backend server & database status via public endpoint
  const checkBackendStatus = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/status', { timeout: 3000 });
      if (data && data.success) {
        setServerReady(true);
        if (data.dbConnected && !data.hasAdmin && data.userCount === 0) {
          setIsBootstrap(true);
        }
        return true;
      }
    } catch {
      setServerReady(false);
      return false;
    }
    return false;
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    const init = async () => {
      const ready = await checkBackendStatus();
      if (!ready) {
        // Poll every 1.5s until backend comes online
        interval = setInterval(async () => {
          const isNowReady = await checkBackendStatus();
          if (isNowReady && interval) {
            clearInterval(interval);
          }
        }, 1500);
      }
    };

    init();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [checkBackendStatus]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');
    setInfoMessage('');

    try {
      // If server is not ready yet, wait up to 3 seconds for it to start
      if (!serverReady) {
        const isUp = await checkBackendStatus();
        if (!isUp) {
          await new Promise((res) => setTimeout(res, 1200));
        }
      }

      await login(username.trim(), password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetAdmin = async () => {
    setIsResetting(true);
    setError('');
    setInfoMessage('');
    try {
      const { data } = await api.post('/auth/reset-admin');
      if (data && data.success) {
        setUsername('admin');
        setPassword('admin123');
        setInfoMessage('Admin account reset! Username: "admin", Password: "admin123". Click LOGIN to enter.');
      } else {
        setError(data?.message || 'Failed to reset admin account.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Reset failed. Make sure local database is running.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleBootstrapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bootstrapName || !bootstrapUsername || !bootstrapPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (bootstrapPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // Register first user (automatically resolves to Admin role)
      await registerUser(bootstrapName, bootstrapUsername.trim(), bootstrapPassword, 'admin');

      // Auto login immediately
      await login(bootstrapUsername.trim(), bootstrapPassword);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Initialization failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 overflow-hidden relative">
      {/* Background glowing bubbles */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse"></div>

      <div className="w-full max-w-md p-8 bg-slate-950/60 border border-slate-800/80 backdrop-blur-xl rounded-3xl shadow-2xl flex flex-col items-center">
        {/* Brand logo details */}
        <TMLogo size="xl" className="mb-4" />
        <h2 className="text-2xl font-black text-white tracking-tight">TECH MART SALES & SERVICE</h2>
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-400 mb-6">RetailPOS Offline ERP</p>

        {/* Server status indicator (only shown if still booting) */}
        {!serverReady && (
          <div className="w-full mb-4 px-3.5 py-2 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center gap-2 text-amber-400 text-xs font-medium">
            <RefreshCw size={13} className="animate-spin" />
            <span>Connecting to offline local server...</span>
          </div>
        )}

        {infoMessage && (
          <div className="w-full mb-4 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-xs text-center font-medium leading-relaxed">
            {infoMessage}
          </div>
        )}

        {error && (
          <div className="w-full mb-4 px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs text-center font-medium animate-shake leading-relaxed">
            {error}
          </div>
        )}

        {isBootstrap ? (
          /* BOOTSTRAP REGISTER FORM */
          <form onSubmit={handleBootstrapSubmit} className="w-full flex flex-col gap-4">
            <div className="px-4 py-2.5 bg-accent-500/10 border border-accent-500/20 rounded-2xl flex items-center gap-2.5 text-accent-400 mb-1">
              <Sparkles size={16} className="shrink-0" />
              <div className="text-xs text-left leading-relaxed">
                <span className="font-bold">First Run Setup</span>. Create master Administrator account to initialize your POS system.
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase ml-1">Your Full Name</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. Administrator"
                  value={bootstrapName}
                  onChange={(e) => setBootstrapName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-900 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-2xl text-sm text-white placeholder-slate-500 outline-none transition-all"
                  required
                />
                <UserIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase ml-1">Choose Username</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. admin"
                  value={bootstrapUsername}
                  onChange={(e) => setBootstrapUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-900 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-2xl text-sm text-white placeholder-slate-500 outline-none transition-all"
                  required
                />
                <UserIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase ml-1">Password</label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="At least 6 characters"
                  value={bootstrapPassword}
                  onChange={(e) => setBootstrapPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-900 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-2xl text-sm text-white placeholder-slate-500 outline-none transition-all"
                  required
                />
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-4 bg-accent-600 hover:bg-accent-500 rounded-2xl font-bold text-white shadow-xl shadow-accent-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <UserPlus size={16} />
              <span>{loading ? 'INITIALIZING...' : 'INITIALIZE ADMIN ACCOUNT'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsBootstrap(false)}
              className="text-xs text-brand-400 hover:underline font-semibold mt-1"
            >
              Back to Standard Login Screen
            </button>
          </form>
        ) : (
          /* STANDARD LOGIN FORM */
          <form onSubmit={handleLoginSubmit} className="w-full flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase ml-1">Username</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-900 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-2xl text-sm text-white placeholder-slate-500 outline-none transition-all"
                  required
                  autoFocus
                />
                <UserIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase ml-1">Password</label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-900 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-2xl text-sm text-white placeholder-slate-500 outline-none transition-all"
                  required
                />
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-3 w-full py-4 bg-brand-500 hover:bg-brand-400 rounded-2xl font-black tracking-wide text-white shadow-xl shadow-brand-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <ShieldCheck size={18} />
              <span>{loading ? 'LOGGING IN...' : 'LOGIN'}</span>
            </button>

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60">
              <button
                type="button"
                onClick={handleResetAdmin}
                disabled={isResetting}
                className="text-xs text-slate-400 hover:text-brand-400 transition-colors font-medium flex items-center gap-1.5"
                title="Reset default admin user (admin / admin123)"
              >
                <KeyRound size={13} />
                <span>{isResetting ? 'Resetting...' : 'Reset Default Admin'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsBootstrap(true)}
                className="text-xs text-slate-500 hover:text-slate-400 transition-colors font-medium"
              >
                First install?
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
};

export default Login;
