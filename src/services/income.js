import { apiClient } from "./apiClient";

const BASE = "/incomes";
const CAT_BASE = "/income-categories";

export const getIncomes = (params = {}) => apiClient("get", BASE, { params });
export const getIncomeById = (id) => apiClient("get", `${BASE}/${id}`);
export const getIncomeSummary = (params = {}) => apiClient("get", `${BASE}/summary`, { params });
export const createIncome = (data) => apiClient("post", BASE, { data });
export const deleteIncome = (id) => apiClient("delete", `${BASE}/${id}`);

export const getIncomeCategories = () => apiClient("get", CAT_BASE);
export const createIncomeCategory = (data) =>
  apiClient("post", CAT_BASE, {
    data: {
      name: data.name,
      ledger_id: data.ledger_id || data.ledgerId || null,
      active_status: data.activeStatus ?? data.active_status ?? true,
    },
  });
export const updateIncomeCategory = (id, data) =>
  apiClient("put", `${CAT_BASE}/${id}`, {
    data: {
      name: data.name,
      ledger_id: data.ledger_id || data.ledgerId || null,
      active_status: data.activeStatus ?? data.active_status,
    },
  });
export const deleteIncomeCategory = (id) => apiClient("delete", `${CAT_BASE}/${id}`);
