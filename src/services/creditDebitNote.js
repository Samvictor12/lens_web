import { apiClient } from "./apiClient";

const BASE = "/accounting/customer-notes";

/**
 * Customer Credit Note / Debit Note API client (M4).
 */
export const getCreditDebitNotes = (params = {}) => apiClient("get", BASE, { params });
export const getCreditDebitNoteById = (id, type = "credit") =>
  apiClient("get", `${BASE}/${id}`, { params: { type } });
export const createCreditNote = (data) => apiClient("post", `${BASE}/credit`, { data });
export const createDebitNote = (data) => apiClient("post", `${BASE}/debit`, { data });
export const cancelCreditDebitNote = (id, type = "credit") =>
  apiClient("patch", `${BASE}/${id}/cancel`, { params: { type } });
