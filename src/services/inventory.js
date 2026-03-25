import { apiClient } from "./apiClient";

const INVENTORY_BASE_URL = "/inventory";

export const getInventoryItems = async (params = {}) => {
  const response = await apiClient("get", `${INVENTORY_BASE_URL}/items`, {
    params,
  });
  return response;
};

export const getInventoryInwardQueue = async (params = {}) => {
  const response = await apiClient("get", `${INVENTORY_BASE_URL}/inward-queue`, {
    params,
  });
  return response;
};

export const getInventoryItemById = async (id) => {
  const response = await apiClient("get", `${INVENTORY_BASE_URL}/items/${id}`);
  return response;
};

export const createInventoryItem = async (itemData) => {
  const response = await apiClient("post", `${INVENTORY_BASE_URL}/items`, {
    data: itemData,
  });
  return response;
};

export const updateInventoryItem = async (id, itemData) => {
  const response = await apiClient("put", `${INVENTORY_BASE_URL}/items/${id}`, {
    data: itemData,
  });
  return response;
};

export const deleteInventoryItem = async (id) => {
  const response = await apiClient("delete", `${INVENTORY_BASE_URL}/items/${id}`);
  return response;
};

export const getInventoryTransactions = async (params = {}) => {
  const response = await apiClient("get", `${INVENTORY_BASE_URL}/transactions`, {
    params,
  });
  return response;
};

export const createInventoryTransaction = async (transactionData) => {
  const response = await apiClient("post", `${INVENTORY_BASE_URL}/transactions`, {
    data: transactionData,
  });
  return response;
};

export const getInventoryStock = async (params = {}) => {
  const response = await apiClient("get", `${INVENTORY_BASE_URL}/stock`, {
    params,
  });
  return {
    ...response,
    total: response.pagination?.total || 0,
    page: response.pagination?.currentPage || 1,
    totalPages: response.pagination?.totalPages || 1,
  };
};

export const updateInventoryStock = async (stockData) => {
  const response = await apiClient("put", `${INVENTORY_BASE_URL}/stock`, {
    data: stockData,
  });
  return response;
};

export const reserveInventoryForSale = async (reservationData) => {
  const response = await apiClient("post", `${INVENTORY_BASE_URL}/reserve`, {
    data: reservationData,
  });
  return response;
};

export const getInventoryDropdowns = async () => {
  const response = await apiClient("get", `${INVENTORY_BASE_URL}/dropdowns`);
  return response;
};

export const getInventoryDashboard = async () => {
  const response = await apiClient("get", `${INVENTORY_BASE_URL}/dashboard`);
  return response;
};

export const inventoryService = {
  getInventoryItems,
  getInventoryInwardQueue,
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