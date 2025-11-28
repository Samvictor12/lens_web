import { apiClient } from "./apiClient";

const PURCHASE_ORDER_BASE_URL = "/purchase-orders";

/**
 * Generate next PO number
 */
export const generatePONumber = async () => {
  const response = await apiClient("post", `${PURCHASE_ORDER_BASE_URL}/generate-po-number`);
  return response;
};

/**
 * Get all purchase orders with pagination and filtering
 */
export const getPurchaseOrders = async (
  page = 1,
  limit = 10,
  search = "",
  filters = {},
  sortBy = "createdAt",
  sortOrder = "desc"
) => {
  const params = {
    page,
    limit,
    sortBy,
    sortOrder,
  };

  // Add search term
  if (search && search.trim()) {
    params.search = search.trim();
  }

  // Map filters to query params
  if (filters) {
    if (filters.active_status !== "all" && filters.active_status !== undefined) {
      params.active_status = filters.active_status;
    }
    if (filters.status !== null && filters.status !== undefined) {
      params.status = filters.status;
    }
    if (filters.vendor_id !== null && filters.vendor_id !== undefined) {
      params.vendor_id = filters.vendor_id;
    }
    if (filters.start_date) {
      params.start_date = filters.start_date;
    }
    if (filters.end_date) {
      params.end_date = filters.end_date;
    }
  }

  const response = await apiClient("get", PURCHASE_ORDER_BASE_URL, { params });
  return response;
};

/**
 * Get purchase order by ID
 */
export const getPurchaseOrderById = async (id) => {
  const response = await apiClient("get", `${PURCHASE_ORDER_BASE_URL}/${id}`);
  return response;
};

/**
 * Create a new purchase order
 */
export const createPurchaseOrder = async (data) => {
  const response = await apiClient("post", PURCHASE_ORDER_BASE_URL, { data });
  return response;
};

/**
 * Update purchase order
 */
export const updatePurchaseOrder = async (id, data) => {
  const response = await apiClient("put", `${PURCHASE_ORDER_BASE_URL}/${id}`, { data });
  return response;
};

/**
 * Delete purchase order (soft delete)
 */
export const deletePurchaseOrder = async (id) => {
  const response = await apiClient("delete", `${PURCHASE_ORDER_BASE_URL}/${id}`);
  return response;
};
