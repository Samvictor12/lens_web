import { apiClient } from "./apiClient";

const BASE = "/expenses";
const CAT_BASE = "/expense-categories";

export const getExpenses = (params = {}) => apiClient("get", BASE, { params });
export const getExpenseById = (id) => apiClient("get", `${BASE}/${id}`);
export const getExpenseSummary = (params = {}) => apiClient("get", `${BASE}/summary`, { params });
export const getExpenseLogs = (id) => apiClient("get", `${BASE}/${id}/logs`);
export const createExpense = (data) => apiClient("post", BASE, { data });
export const updateExpense = (id, data) => apiClient("put", `${BASE}/${id}`, { data });
export const deleteExpense = (id) => apiClient("delete", `${BASE}/${id}`);

export const getExpenseCategories = () => apiClient("get", CAT_BASE);
export const getExpenseCategoryById = (id) => apiClient("get", `${CAT_BASE}/${id}`);
export const createExpenseCategory = (data) =>
  apiClient("post", CAT_BASE, {
    data: {
      name: data.name,
      expenseType: data.expenseType || "INDIRECT",
      active_status:
        data.activeStatus !== undefined ? data.activeStatus : true,
    },
  });
export const updateExpenseCategory = (id, data) =>
  apiClient("put", `${CAT_BASE}/${id}`, {
    data: {
      name: data.name,
      expenseType: data.expenseType,
      active_status: data.activeStatus,
    },
  });
export const deleteExpenseCategory = (id) => apiClient("delete", `${CAT_BASE}/${id}`);
