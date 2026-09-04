import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for handling 401 errors
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      // Only force logout on auth endpoints, not on feature API calls
      const isAuthEndpoint = url.includes('/auth/');
      if (isAuthEndpoint) {
        localStorage.removeItem('rm_jwt');
        localStorage.removeItem('rm_active_api_key');
        localStorage.removeItem('rm_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default client;