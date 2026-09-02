import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add API key from localStorage
apiClient.interceptors.request.use(
  (config) => {
    const apiKey = localStorage.getItem('rm_api_key');
    if (apiKey) {
      config.headers['X-API-Key'] = apiKey;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('rm_api_key');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
