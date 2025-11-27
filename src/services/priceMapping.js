import { apiClient } from "./apiClient";

/**
 * Get minimal customer data for price mapping (id, code, name only)
 * @param {number} customerId - Customer ID
 * @returns {Promise<Object>} Response with customer data
 */
export async function getCustomerMinimal(customerId) {
  return await apiClient("get", `/customer-master/minimal/${customerId}`);
}

/**
 * Get all lens products with their prices and coatings for price mapping
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Response with lens products and prices
 */
export async function getLensProductsWithPrices(params = {}) {
  return await apiClient("get", "/v1/lens-products/with-prices", {
    params
  });
}

/**
 * Get price mappings for a specific customer
 * @param {number} customerId - Customer ID
 * @returns {Promise<Object>} Response with price mappings
 */
export async function getCustomerPriceMappings(customerId) {
  return await apiClient("get", `/price-mappings/customer/${customerId}`);
}

/**
 * Bulk upsert (create or update) price mappings for a customer
 * @param {number} customerId - Customer ID
 * @param {Array} mappings - Array of price mappings
 * @returns {Promise<Object>} Response with created/updated mappings
 */
export async function bulkUpsertPriceMappings(customerId, mappings) {
  return await apiClient("post", "/price-mappings/bulk/upsert", {
    data: {
      customer_id: customerId,
      mappings
    }
  });
}

/**
 * Delete all price mappings for a customer
 * @param {number} customerId - Customer ID
 * @returns {Promise<Object>} Response
 */
export async function deleteCustomerPriceMappings(customerId) {
  return await apiClient("delete", `/price-mappings/customer/${customerId}`);
}
