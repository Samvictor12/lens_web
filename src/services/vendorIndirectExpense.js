import { apiClient } from "./apiClient";

const BASE = "/vendor-indirect-expenses";

export const getVendorIndirectExpenses = (params = {}) =>
  apiClient("get", BASE, { params });

export const createVendorIndirectExpense = (payload) =>
  apiClient("post", BASE, { data: payload });

export const payVendorIndirectExpenses = (payload) =>
  apiClient("post", `${BASE}/pay`, { data: payload });
