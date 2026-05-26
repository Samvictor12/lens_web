import { apiClient } from "./apiClient";

const BASE = "/vendor-payments";

export const getVendorPayments = (params = {}) => apiClient("get", BASE, { params });
export const getVendorPaymentById = (id) => apiClient("get", `${BASE}/${id}`);
export const getOutstandingPOs = (vendorId) => apiClient("get", `${BASE}/outstanding`, { params: { vendorId } });
export const createVendorPayment = (data) => apiClient("post", BASE, { data });
