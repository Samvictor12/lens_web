import { apiClient } from "./apiClient";

/**
 * Field mapping utilities
 * Maps frontend field names to backend field names
 */
const mapToBackend = (frontendData) => {
  return {
    code: frontendData.customerCode || null,
    name: frontendData.name,
    shopname: frontendData.shopName || null,
    phone: frontendData.phone || null,
    email: frontendData.email,
    address: frontendData.address || null,
    city: frontendData.city || null,
    state: frontendData.state || null,
    pincode: frontendData.pincode || null,
    businessCategory_id: frontendData.categoryId || null,
    gstin: frontendData.gstNumber || null,
    credit_limit: frontendData.creditLimit ? parseInt(frontendData.creditLimit) : null,
    notes: frontendData.remarks || null,
    active_status: frontendData.activeStatus !== undefined ? frontendData.activeStatus : true,
  };
};

const mapFromBackend = (backendData) => {
  return {
    id: backendData.id,
    customerCode: backendData.code || `CUST-${String(backendData.id).padStart(3, '0')}`,
    name: backendData.name,
    shopName: backendData.shopname || "",
    phone: backendData.phone || "",
    email: backendData.email || "",
    address: backendData.address || "",
    city: backendData.city || "",
    state: backendData.state || "",
    pincode: backendData.pincode || "",
    categoryId: backendData.businessCategory_id || null,
    gstNumber: backendData.gstin || "",
    creditLimit: backendData.credit_limit || 0,
    outstandingBalance: backendData.outstanding_credit || 0,
    remarks: backendData.notes || "",
    activeStatus: backendData.active_status !== undefined ? backendData.active_status : true,
    createdAt: backendData.createdAt,
    updatedAt: backendData.updatedAt,
  };
};

/**
 * Get paginated list of customers with filtering
 * @param {number} page - Page number (1-indexed for backend)
 * @param {number} limit - Items per page
 * @param {string} search - Search term
 * @param {Object} filters - Additional filters
 * @param {string} sortBy - Sort field
 * @param {string} sortOrder - Sort direction (asc/desc)
 * @returns {Promise<Object>} Response with data and pagination info
 */
export async function getCustomers(
  page = 1,
  limit = 10,
  search = "",
  filters = {},
  sortBy = "createdAt",
  sortOrder = "desc"
) {
  const response = await apiClient("get", "/customer-master", {
    params: {
      page,
      limit,
      name: search, // Backend uses name for search
      sortBy,
      sortOrder,
      ...filters,
    },
  });

  // Map backend data to frontend format
  return {
    success: response.success,
    data: response.data.map(mapFromBackend),
    pagination: response.pagination,
  };
}

/**
 * Get single customer by ID
 * @param {number} id - Customer ID
 * @returns {Promise<Object>} Customer data
 */
export async function getCustomerById(id) {
  const response = await apiClient("get", `/customer-master/${id}`);
  
  return {
    success: response.success,
    data: mapFromBackend(response.data),
  };
}

/**
 * Create a new customer
 * @param {Object} customerData - Customer data in frontend format
 * @returns {Promise<Object>} Created customer data
 */
export async function createCustomer(customerData) {
  const backendData = mapToBackend(customerData);
  
  const response = await apiClient("post", "/customer-master", {
    data: backendData,
  });

  return {
    success: response.success,
    data: mapFromBackend(response.data),
  };
}

/**
 * Update existing customer
 * @param {number} id - Customer ID
 * @param {Object} customerData - Updated customer data in frontend format
 * @returns {Promise<Object>} Updated customer data
 */
export async function updateCustomer(id, customerData) {
  const backendData = mapToBackend(customerData);
  
  const response = await apiClient("put", `/customer-master/${id}`, {
    data: backendData,
  });

  return {
    success: response.success,
    data: mapFromBackend(response.data),
  };
}

/**
 * Delete customer
 * @param {number} id - Customer ID
 * @returns {Promise<Object>} Success response
 */
export async function deleteCustomer(id) {
  return await apiClient("delete", `/customer-master/${id}`);
}

/**
 * Get customer dropdown list (for use in other forms)
 * @returns {Promise<Object>} List of customers for dropdown
 */
export async function getCustomerDropdown() {
  const response = await apiClient("get", "/customer-master/dropdown");
  
  return {
    success: response.success,
    data: response.data.map(mapFromBackend),
  };
}

/**
 * Check if customer email exists
 * @param {string} email - Email to check
 * @param {number} excludeId - Customer ID to exclude from check (for updates)
 * @returns {Promise<Object>} Response with exists flag
 */
export async function checkCustomerEmail(email, excludeId = null) {
  return await apiClient("post", "/customer-master/check-email", {
    data: { email, excludeId },
  });
}
