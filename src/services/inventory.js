import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Inventory Items API
 */

export const getInventoryItems = async (params = {}) => {
  try {
    const response = await api.get('/inventory/items', { params });
    return {
      success: true,
      data: response.data.data,
      pagination: response.data.pagination,
    };
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to fetch inventory items',
      errors: error.response?.data?.errors || [],
    };
  }
};

export const getInventoryItemById = async (id) => {
  try {
    const response = await api.get(`/inventory/items/${id}`);
    return {
      success: true,
      data: response.data.data,
    };
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to fetch inventory item',
      errors: error.response?.data?.errors || [],
    };
  }
};

export const createInventoryItem = async (itemData) => {
  try {
    const response = await api.post('/inventory/items', itemData);
    return {
      success: true,
      data: response.data.data,
      message: response.data.message,
    };
  } catch (error) {
    console.error('Error creating inventory item:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to create inventory item',
      errors: error.response?.data?.errors || [],
    };
  }
};

export const updateInventoryItem = async (id, itemData) => {
  try {
    const response = await api.put(`/inventory/items/${id}`, itemData);
    return {
      success: true,
      data: response.data.data,
      message: response.data.message,
    };
  } catch (error) {
    console.error('Error updating inventory item:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to update inventory item',
      errors: error.response?.data?.errors || [],
    };
  }
};

/**
 * Delete an inventory item
 */
export const deleteInventoryItem = async (id) => {
  try {
    const response = await api.delete(`/inventory/items/${id}`);
    return {
      success: true,
      message: response.data.message,
    };
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to delete inventory item',
      errors: error.response?.data?.errors || [],
    };
  }
};

/**
 * Inventory Transactions API
 */

export const getInventoryTransactions = async (params = {}) => {
  try {
    const response = await api.get('/inventory/transactions', { params });
    return {
      success: true,
      data: response.data.data,
      pagination: response.data.pagination,
    };
  } catch (error) {
    console.error('Error fetching inventory transactions:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to fetch inventory transactions',
      errors: error.response?.data?.errors || [],
    };
  }
};

export const createInventoryTransaction = async (transactionData) => {
  try {
    const response = await api.post('/inventory/transactions', transactionData);
    return {
      success: true,
      data: response.data.data,
      message: response.data.message,
    };
  } catch (error) {
    console.error('Error creating inventory transaction:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to create inventory transaction',
      errors: error.response?.data?.errors || [],
    };
  }
};

/**
 * Inventory Stock API
 */

export const getInventoryStock = async (params = {}) => {
  try {
    const response = await api.get('/inventory/stock', { params });
    return {
      success: true,
      data: response.data.data,
      total: response.data.total || 0,
      page: response.data.page || 1,
      totalPages: response.data.totalPages || 1,
    };
  } catch (error) {
    console.error('Error fetching inventory stock:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to fetch inventory stock',
      errors: error.response?.data?.errors || [],
    };
  }
};

/**
 * Update inventory stock levels
 */
export const updateInventoryStock = async (stockData) => {
  try {
    const response = await api.put('/inventory/stock', stockData);
    return {
      success: true,
      data: response.data.data,
      message: response.data.message,
    };
  } catch (error) {
    console.error('Error updating inventory stock:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to update inventory stock',
      errors: error.response?.data?.errors || [],
    };
  }
};

/**
 * Inventory Reservations API
 */

export const reserveInventoryForSale = async (reservationData) => {
  try {
    const response = await api.post('/inventory/reserve', reservationData);
    return {
      success: true,
      data: response.data.data,
      message: response.data.message,
    };
  } catch (error) {
    console.error('Error reserving inventory:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to reserve inventory',
      errors: error.response?.data?.errors || [],
    };
  }
};

/**
 * Inventory Dropdowns API
 */

export const getInventoryDropdowns = async () => {
  try {
    const response = await api.get('/inventory/dropdowns');
    return {
      success: true,
      data: response.data.data,
    };
  } catch (error) {
    console.error('Error fetching inventory dropdowns:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to fetch dropdown data',
      errors: error.response?.data?.errors || [],
    };
  }
};

/**
 * Inventory Dashboard API
 */

export const getInventoryDashboard = async () => {
  try {
    const response = await api.get('/inventory/dashboard');
    return {
      success: true,
      data: response.data.data,
    };
  } catch (error) {
    console.error('Error fetching inventory dashboard:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to fetch dashboard data',
      errors: error.response?.data?.errors || [],
    };
  }
};

// Create inventoryService object for compatibility
export const inventoryService = {
  getInventoryItems,
  getInventoryItemById,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getInventoryTransactions,
  createInventoryTransaction,
  getInventoryStock,
  updateInventoryStock,
  reserveInventoryForSale,
  getInventoryDropdowns,
  getInventoryDashboard,
};