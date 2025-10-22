import axios from 'axios';
import { Order } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Authentication API
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (userData: any) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
};

// Orders API
export const ordersAPI = {
  getAllOrders: async (filters?: any) => {
    const response = await api.get('/orders', { params: filters });
    return response.data.orders;
  },

  getOrderById: async (orderId: string) => {
    const response = await api.get(`/orders/${orderId}`);
    return response.data.order;
  },

  getUserOrders: async () => {
    const response = await api.get('/orders/my-orders');
    return response.data.orders;
  },

  getTeamOrders: async () => {
    const response = await api.get('/orders/team-orders');
    return response.data.orders;
  },

  createOrder: async (orderData: Partial<Order>) => {
    const response = await api.post('/orders', orderData);
    return response.data.order;
  },

  updateOrder: async (orderId: string, updates: Partial<Order>) => {
    const response = await api.put(`/orders/${orderId}`, updates);
    return response.data.order;
  },

  updateOrderStatus: async (orderId: string, newStatus: string, note?: string) => {
    const response = await api.patch(`/orders/${orderId}/status`, { newStatus, note });
    return response.data.order;
  },

  addComment: async (orderId: string, message: string, isInternal?: boolean) => {
    const response = await api.post(`/orders/${orderId}/comments`, { message, isInternal });
    return response.data;
  },

  addTimelineEvent: async (orderId: string, event: string, details: string, status?: string) => {
    const response = await api.post(`/orders/${orderId}/timeline`, { event, details, status });
    return response.data;
  },

  attachDocument: async (orderId: string, documentType: string, documentData: string, filename: string) => {
    const response = await api.post(`/orders/${orderId}/documents`, { 
      documentType, 
      documentData, 
      filename 
    });
    return response.data;
  },

  deleteOrder: async (orderId: string) => {
    const response = await api.delete(`/orders/${orderId}`);
    return response.data;
  },
};

export default api;

