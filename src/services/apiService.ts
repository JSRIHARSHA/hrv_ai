import axios from 'axios';
import { Order } from '../types';

// Ensure API_BASE_URL always ends with /api
let API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Debug: Log the API URL
console.log('🔍 DEBUG apiService - REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
console.log('🔍 DEBUG apiService - Initial API_BASE_URL:', API_BASE_URL);

// Remove trailing slash if present, then ensure /api is at the end
API_BASE_URL = API_BASE_URL.replace(/\/$/, ''); // Remove trailing slash
if (!API_BASE_URL.endsWith('/api')) {
  API_BASE_URL = API_BASE_URL + '/api';
}

console.log('🔍 DEBUG apiService - Final API_BASE_URL:', API_BASE_URL);

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
    // Don't redirect on 401 for login/register endpoints
    const isAuthEndpoint = error.config?.url?.includes('/auth/login') || 
                          error.config?.url?.includes('/auth/register');
    
    if (error.response?.status === 401 && !isAuthEndpoint) {
      // Token expired or invalid - but don't clear if we just logged in
      // Check if we have a user in localStorage (might be a race condition)
      const hasStoredUser = localStorage.getItem('user');
      
      // Only clear and redirect if:
      // 1. We're not on login page
      // 2. We don't have a stored user (to avoid clearing right after login)
      // 3. The error is not from a login attempt
      if (window.location.pathname !== '/login' && !hasStoredUser) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } else if (hasStoredUser) {
        // If we have a stored user but got 401, the token might be expired
        // But don't clear everything - let the app handle it gracefully
        console.warn('Received 401 but user exists in localStorage. Token may be expired.');
        // Don't clear localStorage - let the user continue with cached data
      }
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
    const orders = response.data.orders || [];
    // Ensure price fields have valid defaults if null
    return orders.map((order: any) => ({
      ...order,
      priceToCustomer: {
        ...(order.priceToCustomer || {}),
        amount: order.priceToCustomer?.amount ?? 0,
        currency: order.priceToCustomer?.currency || 'USD'
      },
      priceFromSupplier: {
        ...(order.priceFromSupplier || {}),
        amount: order.priceFromSupplier?.amount ?? 0,
        currency: order.priceFromSupplier?.currency || 'USD'
      }
    }));
  },

  getOrderById: async (orderId: string) => {
    const response = await api.get(`/orders/${orderId}`);
    const order = response.data.order;
    if (!order) return null;
    // Ensure price fields have valid defaults if null
    return {
      ...order,
      priceToCustomer: {
        ...(order.priceToCustomer || {}),
        amount: order.priceToCustomer?.amount ?? 0,
        currency: order.priceToCustomer?.currency || 'USD'
      },
      priceFromSupplier: {
        ...(order.priceFromSupplier || {}),
        amount: order.priceFromSupplier?.amount ?? 0,
        currency: order.priceFromSupplier?.currency || 'USD'
      }
    };
  },

  getUserOrders: async () => {
    const response = await api.get('/orders/my-orders');
    // Ensure price fields have valid defaults if null
    const orders = response.data.orders || [];
    return orders.map((order: any) => ({
      ...order,
      priceToCustomer: {
        ...(order.priceToCustomer || {}),
        amount: order.priceToCustomer?.amount ?? 0,
        currency: order.priceToCustomer?.currency || 'USD'
      },
      priceFromSupplier: {
        ...(order.priceFromSupplier || {}),
        amount: order.priceFromSupplier?.amount ?? 0,
        currency: order.priceFromSupplier?.currency || 'USD'
      }
    }));
  },

  getTeamOrders: async () => {
    const response = await api.get('/orders/team-orders');
    return response.data.orders;
  },

  createOrder: async (orderData: Partial<Order>) => {
    const response = await api.post('/orders', orderData);
    const order = response.data.order;
    if (!order) return order;
    // Ensure price fields have valid defaults if null
    return {
      ...order,
      priceToCustomer: {
        ...(order.priceToCustomer || {}),
        amount: order.priceToCustomer?.amount ?? 0,
        currency: order.priceToCustomer?.currency || 'USD'
      },
      priceFromSupplier: {
        ...(order.priceFromSupplier || {}),
        amount: order.priceFromSupplier?.amount ?? 0,
        currency: order.priceFromSupplier?.currency || 'USD'
      }
    };
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

// Suppliers API
export const suppliersAPI = {
  getAllSuppliers: async (filters?: any) => {
    const response = await api.get('/suppliers', { params: filters });
    return response.data.suppliers;
  },

  getSupplierById: async (supplierId: string) => {
    const response = await api.get(`/suppliers/${supplierId}`);
    return response.data.supplier;
  },

  searchSuppliers: async (query: string) => {
    const response = await api.get('/suppliers/search', { params: { q: query } });
    return response.data.suppliers;
  },

  createSupplier: async (supplierData: any) => {
    const response = await api.post('/suppliers', supplierData);
    return response.data.supplier;
  },

  updateSupplier: async (supplierId: string, updates: any) => {
    const response = await api.put(`/suppliers/${supplierId}`, updates);
    return response.data.supplier;
  },

  deleteSupplier: async (supplierId: string) => {
    const response = await api.delete(`/suppliers/${supplierId}`);
    return response.data;
  },

  getSupplierStats: async () => {
    const response = await api.get('/suppliers/stats');
    return response.data;
  },
};

// Materials API
export const materialsAPI = {
  getAllMaterials: async (filters?: {
    search?: string;
    supplierId?: number;
    categoryName?: string;
    status?: string;
    itemType?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get('/materials', { params: filters });
    return response.data;
  },

  getMaterialById: async (id: number) => {
    const response = await api.get(`/materials/${id}`);
    return response.data.data;
  },

  getMaterialByItemId: async (itemId: string) => {
    const response = await api.get(`/materials/item/${itemId}`);
    return response.data.data;
  },

  createMaterial: async (materialData: any) => {
    const response = await api.post('/materials', materialData);
    return response.data.data;
  },

  updateMaterial: async (id: number, updates: any) => {
    const response = await api.put(`/materials/${id}`, updates);
    return response.data.data;
  },

  deleteMaterial: async (id: number) => {
    const response = await api.delete(`/materials/${id}`);
    return response.data;
  },

  getCategories: async () => {
    const response = await api.get('/materials/categories');
    return response.data.data;
  },
};

export default api;

