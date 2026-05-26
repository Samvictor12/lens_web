import { apiClient } from "./apiClient";

const BASE = "/ledgers";

export const getLedgers = (params = {}) => apiClient("get", BASE, { params });
export const getLedgerById = (id) => apiClient("get", `${BASE}/${id}`);
export const getCashBankLedgers = () => apiClient("get", `${BASE}/cash-bank`);
export const createLedger = (data) => apiClient("post", BASE, { data });
export const updateLedger = (id, data) => apiClient("put", `${BASE}/${id}`, { data });
export const deleteLedger = (id) => apiClient("delete", `${BASE}/${id}`);
