import { apiClient } from "./apiClient";

const BASE = "/bank-reconciliation";

export const getBankStatement = (params = {}) => apiClient("get", BASE, { params });
export const markReconciled = (data) => apiClient("put", `${BASE}/mark`, { data });
