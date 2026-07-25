import { apiClient } from "./apiClient";

const BASE = "/bank-accounts";

export const getBankAccounts = () => apiClient("get", BASE);
export const getBankAccountById = (id) => apiClient("get", `${BASE}/${id}`);
export const createBankAccount = (data) => apiClient("post", BASE, { data });
export const updateBankAccount = (id, data) => apiClient("put", `${BASE}/${id}`, { data });
