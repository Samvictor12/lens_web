import { apiClient } from "./apiClient";

const BASE = "/ledgers";

export const getLedgers = (params = {}) => apiClient("get", BASE, { params });
export const getLedgerById = (id) => apiClient("get", `${BASE}/${id}`);
export const getCashBankLedgers = () => apiClient("get", `${BASE}/cash-bank`).then((res) => res.data ?? []);
/** Cash / Bank / Capital posting ledgers for Income From/To pickers. */
export const getCashBankCapitalLedgers = () =>
  apiClient("get", `${BASE}/cash-bank-capital`).then((res) => res.data ?? []);
/** Income From: active Capital posting ledgers. */
export const getCapitalPostingLedgers = () =>
  apiClient("get", `${BASE}/capital-posting`).then((res) => res.data ?? []);
/** Loan From: active Loans posting ledgers. */
export const getLoansPostingLedgers = () =>
  apiClient("get", `${BASE}/loans-posting`).then((res) => res.data ?? []);
/** Active LIABILITY posting ledgers for indirect expense "Expense for" picker. */
export const getLiabilityPostingLedgers = () =>
  apiClient("get", `${BASE}/liability-posting`).then((res) => res.data ?? []);
export const createLedger = (data) => apiClient("post", BASE, { data });
export const updateLedger = (id, data) => apiClient("put", `${BASE}/${id}`, { data });
export const deleteLedger = (id) => apiClient("delete", `${BASE}/${id}`);
