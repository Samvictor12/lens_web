import api from "./api";
import { apiClient } from "./apiClient";

const BASE = "/accounting/vendor-invoices";

/**
 * Vendor Invoice API client (M5). Invoice-first workflow: register a VendorInvoice
 * against PO(s) before any payment is made; payments then allocate against these.
 */
export const getVendorInvoices = (params = {}) => apiClient("get", BASE, { params });
export const getVendorInvoiceById = (id) => apiClient("get", `${BASE}/${id}`);
export const getOutstandingVendorInvoicesFor = (vendorId) =>
  vendorId
    ? apiClient("get", `${BASE}/outstanding`, { params: { vendorId } })
    : apiClient("get", `${BASE}/outstanding`);
export const cancelVendorInvoice = (id) => apiClient("patch", `${BASE}/${id}/cancel`);

export async function createVendorInvoice(payload, invoiceFile) {
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
