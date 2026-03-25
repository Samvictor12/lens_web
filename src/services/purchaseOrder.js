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

/**
 * Receive a purchase order — create a GRN receipt record
 * @param {number} id - Purchase Order ID
 * @param {Object} data - { receivedDate, receivedItems, notes, createdBy }
 */
export const receivePurchaseOrder = async (id, data) => {
  const response = await apiClient("post", `${PURCHASE_ORDER_BASE_URL}/${id}/receive`, { data });
  return response;
};

/**
 * Get all receipt records for a purchase order
 * @param {number} id - Purchase Order ID
 */
export const getPOReceipts = async (id) => {
  const response = await apiClient("get", `${PURCHASE_ORDER_BASE_URL}/${id}/receipts`);
  return response;
};

/**
 * Get all receipt logs for a purchase order
 */
export const getPOReceiptLogs = async (poId) => {
  return apiClient("get", `/purchase-orders/${poId}/receipt-logs`);
};

/**
 * Update an existing receipt
 * @param {number} poId - Purchase Order ID
 * @param {number} receiptId - Receipt ID
 * @param {Object} data - Receipt data to update
 */
export const updatePOReceipt = async (poId, receiptId, data) => {
  const response = await apiClient("put", `${PURCHASE_ORDER_BASE_URL}/${poId}/receipts/${receiptId}`, { data });
  return response;
};

/**
 * Get inventory inward status for a receipt (how much has been moved to stock per row)
 * @param {number} poId - Purchase Order ID
 * @param {number} receiptId - Receipt ID
 */
export const getReceiptInwardStatus = async (poId, receiptId) => {
  const response = await apiClient("get", `${PURCHASE_ORDER_BASE_URL}/${poId}/receipts/${receiptId}/inward-status`);
  return response;
};

/**
 * Inward received items from a PO receipt into inventory stock.
 * @param {number} poId - Purchase Order ID
 * @param {number} receiptId - Receipt ID
 * @param {Array}  inwardRows - [{ key, spherical, cylindrical, splits: [{ location_id, tray_id, qty }] }]
 */
export const inwardReceiptToInventory = async (poId, receiptId, inwardRows) => {
  const response = await apiClient("post", `${PURCHASE_ORDER_BASE_URL}/${poId}/receipts/${receiptId}/inward-to-inventory`, {
    data: { inwardRows },
  });
  return response;
};
