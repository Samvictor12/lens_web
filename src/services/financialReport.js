import { apiClient } from "./apiClient";

const BASE = "/financial-reports";

export const getSummary = (params = {}) => apiClient("get", `${BASE}/summary`, { params });
export const getProfitLoss = (params = {}) => apiClient("get", `${BASE}/profit-loss`, { params });
export const getLedgerStatement = (params = {}) => apiClient("get", `${BASE}/ledger-statement`, { params });
export const getTrialBalance = (params = {}) => apiClient("get", `${BASE}/trial-balance`, { params });
export const getDayBook = (params = {}) => apiClient("get", `${BASE}/day-book`, { params });
export const getCashBankBook = (params = {}) => apiClient("get", `${BASE}/cash-bank-book`, { params });
export const getGroupSummary = (params = {}) => apiClient("get", `${BASE}/group-summary`, { params });
export const getBalanceSheet = (params = {}) => apiClient("get", `${BASE}/balance-sheet`, { params });
export const getDashboard = (params = {}) => apiClient("get", `${BASE}/dashboard`, { params });

/** apiClient already returns axios body { success, data }. Bind KPIs to data, not the envelope. */
export function unwrapDashboardPayload(res) {
  if (!res || typeof res !== "object") return null;
  if (Object.prototype.hasOwnProperty.call(res, "success")) {
    return res.success ? res.data ?? null : null;
  }
  if (res.today != null || res.position != null) return res;
  return res.data ?? null;
}

/** Same bind as FinanceDashboardKpis: envelope as dashboard zeros every card. */
export function financeKpiSlice(dashboard) {
  return {
    today: dashboard?.today || {},
    position: dashboard?.position || {},
  };
}
export const getTrialBalanceGrouped = (params = {}) => apiClient("get", `${BASE}/trial-balance-grouped`, { params });
