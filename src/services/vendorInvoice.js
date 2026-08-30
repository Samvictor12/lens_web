import api from "./api";
import { apiClient } from "./apiClient";

const BASE = "/accounting/vendor-invoices";

/**
 * Vendor Invoice API client (M5). Invoice-first workflow: register a VendorInvoice
 * against PO(s) before any payment is made; payments then allocate against these.
 */
export const getVendorInvoices = (params = {}) => apiClient("get", BASE, { params });
export const getVendorInvoiceSummary = (params = {}) => apiClient("get", `${BASE}/summary`, { params });
export const getVendorInvoiceById = (id) => apiClient("get", `${BASE}/${id}`);
export const getOutstandingVendorInvoicesFor = (vendorId) =>
  vendorId
    ? apiClient("get", `${BASE}/outstanding`, { params: { vendorId } })
    : apiClient("get", `${BASE}/outstanding`);

export const getEligiblePOsForVendorInvoice = (vendorId, filters = {}) => {
  const params = { vendorId };
  if (filters.receive_start_date) {
    params.receive_start_date = filters.receive_start_date;
  }
  if (filters.receive_end_date) {
    params.receive_end_date = filters.receive_end_date;
  }
  return apiClient("get", `${BASE}/eligible-pos`, { params });
};

export const getAwaitingVendorBills = (params = {}) =>
  apiClient("get", `${BASE}/awaiting-bills`, { params });

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

export async function updateVendorInvoice(id, payload, invoiceFile) {
  const formData = new FormData();
  formData.append("data", JSON.stringify(payload));
  if (invoiceFile) {
    formData.append("invoiceCopy", invoiceFile);
  }
  const response = await api.put(`${BASE}/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}
