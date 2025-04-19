import axios from 'axios';

const API = axios.create({
  baseURL: '/api', // Proxy to backend (configured in frontend/package.json)
  timeout: 10000, // Increased timeout
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add request interceptor for auth token
API.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Enhanced API functions
export const authAPI = {
  login: async (credentials) => {
    try {
      const { data } = await API.post('/auth/login', credentials);
      localStorage.setItem('token', data.token);
      return data;
    } catch (error) {
      throw error.response?.data || { message: 'Login failed' };
    }
  },

  register: async (userData) => {
    try {
      const { data } = await API.post('/auth/register', userData);
      localStorage.setItem('token', data.token);
      return data;
    } catch (error) {
      throw error.response?.data || { message: 'Registration failed' };
    }
  },

  logout: () => {
    localStorage.removeItem('token');
  }
};

export const protectedAPI = {
  getData: async () => {
    try {
      const { data } = await API.get('/protected/data');
      return data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch protected data' };
    }
  }
};

// Global error handling
API.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login'; // Redirect if unauthorized
    }
    return Promise.reject(error);
  }
);

export default API;