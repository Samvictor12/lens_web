import { apiClient } from "./apiClient";

const BASE = "/invoices";

/** List invoices with optional filters */
export const getInvoices = (params = {}) =>
  apiClient("get", BASE, { params });

/**
 * Get ALL dispatched (DELIVERED, un-billed) sale orders — for billing screen list
 */
export const getDispatchedOrders = (params = {}) =>
  apiClient("get", `${BASE}/dispatched-orders`, { params });

/** Get single invoice by ID */
export const getInvoiceById = (id) =>
  apiClient("get", `${BASE}/${id}`);

/**
 * Get delivered (un-billed) sale orders for a customer — used when building a new invoice
 */
export const getDeliveredOrdersForCustomer = (customerId) =>
  apiClient("get", `${BASE}/customers/${customerId}/delivered-orders`);

/**
 * Create invoice from delivered sale orders
 * @param {{ saleOrderIds: number[], dueDate: string, notes?: string }} data
 */
export const createInvoice = (data) =>
  apiClient("post", BASE, { data });

/** Issue invoice (DRAFT → ISSUED) */
export const issueInvoice = (id) =>
  apiClient("patch", `${BASE}/${id}/issue`);

/**
 * Record a payment against an invoice
 * When fully paid → invoice becomes PAID → sale orders become BILLED
 * @param {number} id - invoice ID
 * @param {{ amount: number, method: string, referenceNo?: string, notes?: string }} data
 */
export const recordPayment = (id, data) =>
  apiClient("post", `${BASE}/${id}/payments`, { data });

/** Cancel invoice and release sale orders back to DELIVERED */
export const cancelInvoice = (id) =>
  apiClient("patch", `${BASE}/${id}/cancel`);
