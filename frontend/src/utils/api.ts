import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically append token to request headers if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      config.headers['Authorization'] = `Bearer ${token}`;
      if (config.headers.set) {
        config.headers.set('Authorization', `Bearer ${token}`);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercept unauthorized responses to trigger login redirect
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthRoute =
      error.config?.url?.includes('/auth/login') ||
      error.config?.url?.includes('/auth/status') ||
      error.config?.url?.includes('/health');

    if (error.response && error.response.status === 401 && !isAuthRoute) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // If we are in React Router context, router redirects. 
      // If not, we can force-dispatch a logout event.
      window.dispatchEvent(new Event('auth-logout'));
    }
    return Promise.reject(error);
  }
);

export default api;
