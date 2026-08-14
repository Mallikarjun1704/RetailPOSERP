import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User as UserIcon, Laptop, Sparkles, UserPlus } from 'lucide-react';
import api from '../utils/api';
import TMLogo from '../components/TMLogo';

const Login: React.FC = () => {
  const { login, registerUser, user } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Bootstrap mode states
  const [isBootstrap, setIsBootstrap] = useState(false);
  const [bootstrapName, setBootstrapName] = useState('');
  const [bootstrapUsername, setBootstrapUsername] = useState('');
  const [bootstrapPassword, setBootstrapPassword] = useState('');

  useEffect(() => {
    // If user is already logged in, send them straight to dashboard
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    // Check if database needs an initial Admin user
    const checkDbStatus = async () => {
      try {
        const { data } = await api.get('/auth/users').catch((err) => {
          if (err.response && err.response.status === 401) {
            // Unauthorised because no tokens are set, but let's query a special endpoint or count state
          }
          return { data: { success: false } };
        });

        // Let's assume database is blank if auth/users returns failure or is empty
        // In our server route registration, we can query users count
        const firstCheck = await api.post('/auth/login', { username: 'test', password: 'pwd' })
          .catch((err) => {
            // If db is empty, a specific count trigger can be evaluated or we can just try registering.
            // We can check if any user exists by calling a health endpoint or a custom check
            return err.response?.data;
          });
      } catch {
        // Safe fallback
      }
    };
    checkDbStatus();

    // To verify bootstrap dynamically, we check if register endpoint allows public registrations.
    // Our backend route handles this automatically by looking at user counts.
    // Let's check via dynamic flag
    const evalBootstrap = async () => {
      try {
        const { data } = await api.get('/auth/users').catch(() => ({ data: { success: false, data: [] } }));
        if (data && data.success && data.data.length === 0) {
          setIsBootstrap(true);
        }
      } catch {
        setIsBootstrap(true);
      }
    };

    // We try to trigger bootstrap layout if backend doesn't have users
    evalBootstrap();
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await login(username, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Invalid username or password');
    } finally {
      setLoading(false);
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
      await registerUser(bootstrapName, bootstrapUsername, bootstrapPassword, 'admin');

      // Auto login immediately
      await login(bootstrapUsername, bootstrapPassword);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Bootstrapping failed');
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

        {error && (
          <div className="w-full mb-4 px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-sm text-center font-medium animate-shake">
            {error}
          </div>
        )}

        {isBootstrap ? (
          /* BOOTSTRAP REGISTER FORM */
          <form onSubmit={handleBootstrapSubmit} className="w-full flex flex-col gap-4">
            <div className="px-4 py-2 bg-accent-500/10 border border-accent-500/20 rounded-2xl flex items-center gap-2.5 text-accent-400 mb-2">
              <Sparkles size={16} className="shrink-0" />
              <div className="text-xs text-left leading-relaxed">
                <span className="font-bold">Database Empty</span>. Create the initial system credentials to establish the master Admin account.
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase ml-1">Your Full Name</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. Mallikarjun"
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
              <span>{loading ? 'Bootstrapping...' : 'Initialize Admin Account'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsBootstrap(false)}
              className="text-xs text-brand-400 hover:underline font-semibold mt-1"
            >
              Go to Standard Login Screen
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
              className="mt-3 w-full py-4 bg-brand-500 hover:bg-brand-400 rounded-2xl font-bold text-white shadow-xl shadow-brand-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Entering Terminal...' : 'Enter Console'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsBootstrap(true)}
              className="text-xs text-slate-500 hover:text-slate-400 transition-colors font-semibold mt-1"
            >
              First install? Initialize Database
            </button>
          </form>
        )}
      </div>
    </main>
  );
};

export default Login;
