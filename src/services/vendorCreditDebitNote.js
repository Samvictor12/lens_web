import { apiClient } from "./apiClient";

const BASE = "/accounting/vendor-notes";

/**
 * Vendor Credit Note / Debit Note API client (M5).
 */
export const getVendorCreditDebitNotes = (params = {}) => apiClient("get", BASE, { params });
export const getVendorCreditDebitNoteById = (id, type = "credit") =>
  apiClient("get", `${BASE}/${id}`, { params: { type } });
export const createVendorCreditNote = (data) => apiClient("post", `${BASE}/credit`, { data });
export const createVendorDebitNote = (data) => apiClient("post", `${BASE}/debit`, { data });
export const cancelVendorCreditDebitNote = (id, type = "credit") =>
  apiClient("patch", `${BASE}/${id}/cancel`, { params: { type } });
