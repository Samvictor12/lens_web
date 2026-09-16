import { apiClient } from "./apiClient";

const BASE = "/accounting/gst-reports";

/** GST Reports API client (M6). */
export const getMonthlySalesReport = (params = {}) => apiClient("get", `${BASE}/monthly-sales`, { params });
export const getGstCollectionReport = (params = {}) => apiClient("get", `${BASE}/gst-collection`, { params });
export const getGstInvoiceRegister = (params = {}) => apiClient("get", `${BASE}/register`, { params });
