import api from "./api";
import { apiClient } from "./apiClient";

const BASE = "/vendor-payments";

export const getVendorPayments = (params = {}) => apiClient("get", BASE, { params });
export const getVendorPaymentById = (id) => apiClient("get", `${BASE}/${id}`);
export const getOutstandingPOs = (vendorId) =>
  vendorId
    ? apiClient("get", `${BASE}/outstanding`, { params: { vendorId } })
    : apiClient("get", `${BASE}/outstanding`);

export async function createVendorPayment(payload, invoiceFile) {
  const formData = new FormData();
  formData.append("data", JSON.stringify(payload));
  if (invoiceFile) {
    formData.append("invoiceCopy", invoiceFile);
  }
  const response = await api.post(BASE, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export const closeVendorPayment = (id) => apiClient("patch", `${BASE}/${id}/close`);

export function vendorInvoiceCopyUrl(invoiceCopyPath) {
  if (!invoiceCopyPath) return null;
  const base = (import.meta.env.VITE_WEB_API_URL || "http://localhost:5001/api").replace(/\/api\/?$/, "");
  return `${base}${invoiceCopyPath}`;
}
