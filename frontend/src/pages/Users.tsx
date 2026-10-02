import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';
import { 
  UsersRound, 
  Plus, 
  UserPlus, 
  ShieldCheck, 
  Lock, 
  User as UserIcon,
  ToggleLeft,
  ToggleRight,
  Edit,
  X,
  Key
} from 'lucide-react';

const Users: React.FC = () => {
  const { user: currentUser, registerUser } = useAuth();
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Register Modal
  const [registerModal, setRegisterModal] = useState(false);
  // Edit Modal
  const [editModal, setEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'staff'>('staff');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState('');

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

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/auth/users');
      if (data.success) {
        setUsers(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchUsers();
    }
  }, [currentUser]);

  const handleToggleActive = async (id: string) => {
    try {
      const { data } = await api.put(`/auth/users/${id}/toggle`);
      if (data.success) {
        showSuccess('Account status toggled successfully!');
        fetchUsers();
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to modify account.');
    }
  };

  const openRegisterModal = () => {
    setName('');
    setUsername('');
    setPassword('');
    setRole('staff');
    setError('');
    setRegisterModal(true);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setName(u.name);
    setUsername(u.username);
    setPassword('');
    setRole(u.role);
    setIsActive(u.isActive ?? true);
    setError('');
    setEditModal(true);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!name || !username || !password) {
      setError('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      await registerUser(name, username, password, role);
      showSuccess('New staff profile registered successfully!');
      setRegisterModal(false);
      setName('');
      setUsername('');
      setPassword('');
      setRole('staff');
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to register account.');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!editingUser) return;
    if (!name.trim() || !username.trim()) {
      setError('Name and username are required');
      return;
    }
    if (password && password.length < 6) {
      setError('Password must be at least 6 characters if updating');
      return;
    }

    const payload: any = {
      name: name.trim(),
      username: username.trim().toLowerCase(),
      role,
      isActive
    };

    if (password.trim().length > 0) {
      payload.password = password.trim();
    }

    try {
      const { data } = await api.put(`/auth/users/${editingUser._id}`, payload);
      if (data.success) {
        showSuccess('Staff account updated successfully!');
        setEditModal(false);
        setEditingUser(null);
        fetchUsers();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update staff account.');
    }
  };

  // Shield route
  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex-1 h-full flex items-center justify-center p-8 bg-slate-50 dark:bg-slate-950 text-slate-500">
        <div className="text-center max-w-sm flex flex-col items-center gap-3">
          <div className="p-3.5 bg-rose-500/10 text-rose-500 rounded-full">
            <Lock size={24} />
          </div>
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Terminal Shield Mode Active</span>
          <p className="text-xs">Access is restricted to primary store administrators only.</p>
        </div>
      </div>
    );
  }

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
      <header className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-sans">Staff Management</h2>
          <p className="text-slate-500 text-sm">Register store staff credentials, edit permissions, and manage console roles.</p>
        </div>

        <button
          onClick={openRegisterModal}
          className="px-5 py-3 bg-brand-500 hover:bg-brand-600 rounded-2xl text-xs font-extrabold uppercase text-white shadow-lg shadow-brand-500/20 active:scale-[0.98] transition-all flex items-center gap-2"
        >
          <Plus size={14} />
          <span>Register Staff</span>
        </button>
      </header>

      {/* Users table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl shadow-sm overflow-hidden max-w-5xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="pos-grid-header">Username</th>
              <th className="pos-grid-header">Full Name</th>
              <th className="pos-grid-header">Console Role</th>
              <th className="pos-grid-header text-center">Deactive / Active</th>
              <th className="pos-grid-header text-center">Status</th>
              <th className="pos-grid-header text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-20 text-slate-400">
                  Checking terminals...
                </td>
              </tr>
            ) : users.length > 0 ? (
              users.map(u => (
                <tr key={u._id} className="pos-grid-row">
                  <td className="px-4 py-4 text-xs font-bold text-slate-850 dark:text-slate-200">
                    @{u.username}
                  </td>
                  <td className="px-4 py-4 text-sm font-semibold text-slate-950 dark:text-white">
                    {u.name}
                  </td>
                  <td className="px-4 py-4 text-xs font-bold text-slate-500 flex items-center gap-1.5 mt-1.5">
                    <ShieldCheck size={13} className={u.role === 'admin' ? 'text-brand-500' : 'text-slate-400'} />
                    <span className="uppercase">{u.role}</span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    {u._id === currentUser._id ? (
                      <span className="text-[10px] text-slate-400 font-bold uppercase">(You)</span>
                    ) : (
                      <button
                        onClick={() => handleToggleActive(u._id)}
                        className={`p-1.5 rounded-lg transition-colors inline-flex cursor-pointer ${u.isActive ? 'text-emerald-500 hover:text-emerald-600' : 'text-slate-400 hover:text-slate-500'}`}
                        title="Toggle Active Status"
                      >
                        {u.isActive ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${u.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                      {u.isActive ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <button
                      onClick={() => openEditModal(u)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 hover:text-brand-500 transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                      title="Edit Staff Details"
                    >
                      <Edit size={14} />
                      <span>Edit</span>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-20 text-slate-400">
                  No staff accounts logged.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* STAFF CREATE DIALOG MODAL */}
      {registerModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleRegisterSubmit}
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 flex flex-col gap-4 animate-scaleUp text-slate-800 dark:text-slate-200"
          >
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus size={18} className="text-brand-500" />
                <span>Register Employee Account</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setRegisterModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            {error && (
              <div className="px-3.5 py-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-bold text-center">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Employee Full Name*</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                  required
                />
                <UserIcon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Console Username*</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. ramesh_sales"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                  required
                />
                <UserIcon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Default Password*</label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                  required
                />
                <Lock size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Access Role*</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none cursor-pointer focus:border-brand-500 text-slate-900 dark:text-white"
              >
                <option value="staff">Staff Counter operator (POS & Inventory CRUD)</option>
                <option value="admin">Store Admin (Reports & System backups access)</option>
              </select>
            </div>

            <div className="flex gap-3 mt-4 justify-end">
              <button
                type="button"
                onClick={() => setRegisterModal(false)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs uppercase transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold text-xs uppercase transition-colors"
              >
                Create User
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STAFF EDIT DIALOG MODAL */}
      {editModal && editingUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleEditSubmit}
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 flex flex-col gap-4 animate-scaleUp text-slate-800 dark:text-slate-200"
          >
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Edit size={18} className="text-brand-500" />
                <span>Edit Staff Account</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setEditModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            {error && (
              <div className="px-3.5 py-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-bold text-center">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Employee Full Name*</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                  required
                />
                <UserIcon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Console Username*</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                  required
                />
                <UserIcon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Reset Password (leave empty to keep current)</label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="Enter new password (optional)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                />
                <Key size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Access Role*</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none cursor-pointer focus:border-brand-500 text-slate-900 dark:text-white"
              >
                <option value="staff">Staff Counter operator (POS & Inventory CRUD)</option>
                <option value="admin">Store Admin (Reports & System backups access)</option>
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500 border-slate-300"
              />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Account is Active</span>
            </label>

            <div className="flex gap-3 mt-4 justify-end">
              <button
                type="button"
                onClick={() => setEditModal(false)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs uppercase transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold text-xs uppercase transition-colors"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default Users;
