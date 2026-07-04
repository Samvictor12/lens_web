import { apiClient } from "./apiClient";

const BASE = "/customer-payments";

export const getOutstandingInvoices = (params = {}) =>
  apiClient("get", `${BASE}/outstanding`, { params });
export const getCustomerPayments = (params = {}) => apiClient("get", BASE, { params });
export const getCustomerPaymentById = (id) => apiClient("get", `${BASE}/${id}`);
export const createCustomerPayment = (data) => apiClient("post", BASE, { data });
export const closeCustomerPayment = (id) => apiClient("patch", `${BASE}/${id}/close`);
