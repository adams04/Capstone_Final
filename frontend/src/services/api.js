import axios from 'axios';

const API = axios.create({
  baseURL: process.env.NODE_ENV === 'development' 
    ? 'http://localhost:5001/api' 
    : '/api', 
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor
API.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor
API.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API Groups
export const authAPI = {

  login: async (credentials) => {
    const { data } = await API.post('/auth/login', credentials);
    localStorage.setItem('token', data.token);
    return data;
  },
  register: async (userData) => {
    const { data } = await API.post('/auth/register', userData);
    localStorage.setItem('token', data.token);
    return data;
  },
  logout: () => {
    localStorage.removeItem('token');
  },

  getUserProfile: async () => {
    const response = await API.get('/auth/user-profile');
    return response.data; 
  },

  getMembers: async (boardId) => {
    try {
      const { data } = await API.get(`/boards/${boardId}/members`);
      return data;
    } catch (error) {
      console.error('Error fetching board members:', error);
      throw error;
    }
  },

  getUserBasicInfoById: async (userID) => {
    try {
      const response = await API.get(`/auth/user/${userID}/basic-info`);
      return response.data;
    } catch (error) {
      console.error("Error fetching basic user info:", error);
      throw error;
    }
  },

};
  
export const boardAPI = {
  create: async (boardData) => {
    const { data } = await API.post('/auth/create-board', boardData);
    return data;
  },
  getAll: async () => {
    const { data } = await API.get('/auth/boards');
    return data;
  },
  getByUser: async (email) => {
    const { data } = await API.get(`/auth/users/${email}/boards`);
    return data;
  },
  updateBoard: async (boardId, updateData) => {
    const { data } = await API.put(`/auth/${boardId}`, updateData);
    return data;
  },
  // MODIFIED: Fix the delete endpoint to match your backend route
  delete: async (boardId) => {
    const { data } = await API.delete(`/auth/delete-board/${boardId}`);
    return data;
  },

  removeMembers: async (boardId, emails) => {
    try {
      const { data } = await API.put(`/auth/${boardId}`, {
        removeMembers: emails 
      });
      return data;
    } catch (error) {
      console.error('Error removing members:', error);
      throw error;
    }
  }
};

export default API;