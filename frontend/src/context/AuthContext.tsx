import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  registerUser: (name: string, username: string, password: string, role: string) => Promise<void>;
  checkBootstrapNeeded: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCurrentUser = async () => {
    const cachedToken = localStorage.getItem('token');
    const cachedUser = localStorage.getItem('user');

    if (cachedToken && cachedUser) {
      try {
        setUser(JSON.parse(cachedUser));
        // Verify token with backend
        const { data } = await api.get('/auth/me');
        if (data.success) {
          setUser(data.data);
          localStorage.setItem('user', JSON.stringify(data.data));
        }
      } catch (error) {
        console.error('Session validation failed:', error);
        logout();
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCurrentUser();

    // Listen to global logout intercepts
    const handleLogoutEvent = () => logout();
    window.addEventListener('auth-logout', handleLogoutEvent);
    
    return () => {
      window.removeEventListener('auth-logout', handleLogoutEvent);
    };
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const { data } = await api.post('/auth/login', { username, password });
      if (data.success) {
        setUser(data.data);
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data));
      }
    } catch (error: any) {
      if (!error.response) {
        throw new Error('Local server is starting up or unreachable. Please wait 2 seconds and try again.');
      }
      throw new Error(error.response?.data?.message || 'Login failed. Please check your username and password.');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const registerUser = async (name: string, username: string, password: string, role: string) => {
    try {
      await api.post('/auth/register', { name, username, password, role });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  };

  const checkBootstrapNeeded = async (): Promise<boolean> => {
    try {
      // In this setup, we call users API to check if empty.
      // Alternatively, we can let user registration bootstrap directly.
      const { data } = await api.get('/auth/users').catch((err) => {
        // If unauthorized because no users exist, it means we can bootstrap!
        if (err.response && err.response.status === 401) {
          return { data: { success: false } };
        }
        return { data: { success: false } };
      });
      return false; // Already bootstrapped
    } catch {
      return true; // Bootstrapping might be required
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, registerUser, checkBootstrapNeeded }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
