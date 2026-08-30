import { apiClient } from "./apiClient";

const BASE = "/customer-360";

/** Section 1–3 aggregate for a customer */
export const getCustomer360Overview = (customerId) =>
  apiClient("get", `${BASE}/${customerId}/overview`);

/**
 * Paginated 5-row card list.
 * @param {string|number} customerId
 * @param {string} cardKey ordersMonth|inProduction|inDispatch|delivered|collectionTarget|collectionActual
 * @param {{ page?: number, limit?: number }} [params]
 */
export const getCustomer360Card = (customerId, cardKey, params = {}) =>
  apiClient("get", `${BASE}/${customerId}/cards/${cardKey}`, { params });
