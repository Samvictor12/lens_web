import { apiClient } from "./apiClient";

const BASE = "/dashboard";

/** Get today's sales summary: todaySales, top5Sales, topProduct */
export const getDashboardSummary = () =>
  apiClient("get", `${BASE}/summary`);
