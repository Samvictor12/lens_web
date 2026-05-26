import { apiClient } from "./apiClient";

const BASE = "/financial-reports";

export const getSummary = (params = {}) => apiClient("get", `${BASE}/summary`, { params });
export const getProfitLoss = (params = {}) => apiClient("get", `${BASE}/profit-loss`, { params });
export const getLedgerStatement = (params = {}) => apiClient("get", `${BASE}/ledger-statement`, { params });
export const getTrialBalance = (params = {}) => apiClient("get", `${BASE}/trial-balance`, { params });
export const getDayBook = (params = {}) => apiClient("get", `${BASE}/day-book`, { params });
export const getCashBankBook = (params = {}) => apiClient("get", `${BASE}/cash-bank-book`, { params });
