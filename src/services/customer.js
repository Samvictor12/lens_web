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
    credit_limit: frontendData.creditLimit
      ? parseInt(frontendData.creditLimit)
      : null,
    notes: frontendData.remarks || null,
    active_status:
      frontendData.activeStatus !== undefined
        ? frontendData.activeStatus
        : true,
    createdBy: 1, // TODO: Get from auth context
    updatedBy: 1, // TODO: Get from auth context
  };
};

const mapFromBackend = (backendData) => {
  return {
    id: backendData.id,
    customerCode:
      backendData.code || `CUST-${String(backendData.id).padStart(3, "0")}`,
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
    activeStatus:
      backendData.active_status !== undefined
        ? backendData.active_status
        : true,
    createdAt: backendData.createdAt,
    updatedAt: backendData.updatedAt,
  };
};

/**
 * Build query parameters from filters
 * Maps frontend filter structure to backend query params
 */
const buildQueryParams = (page, limit, search, filters, sortBy, sortOrder) => {
  const params = {
    page,
    limit,
    sortBy,
    sortOrder,
  };

  // Add search term (backend uses 'name' field for search)
  if (search && search.trim()) {
    params.name = search.trim();
  }

  // Map frontend filters to backend query params (exact backend field names)
  if (filters) {
    // Active status filter
    if (
      filters.active_status !== "all" &&
      filters.active_status !== undefined
    ) {
      params.active_status = filters.active_status;
    }

    // Business category filter (exact match)
    if (
      filters.businessCategory_id !== null &&
      filters.businessCategory_id !== undefined
    ) {
      params.businessCategory_id = filters.businessCategory_id;
    }

    // City filter (contains search, case insensitive)
    if (filters.city && filters.city.trim()) {
      params.city = filters.city.trim();
    }
  }

  return params;
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
  const params = buildQueryParams(
    page,
    limit,
    search,
    filters,
    sortBy,
    sortOrder
  );

  const response = await apiClient("get", "/customer-master", {
    params,
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
    data: {
      code: "CUST001",
      name: "Test Customer",
      shopname: "Test Shop",
      phone: "9876543210",
      email: "test@customer.com",
      address: "123 Test Street",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
      businessCategory_id: 1,
      gstin: "27AABCT1234M1Z5",
      credit_limit: 30010,
      notes: "Test customer for verification",
      active_status: true,
      createdBy: 5,
    },
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
 * Delete customer (soft delete)
 * @param {number} id - Customer ID
 * @returns {Promise<Object>} Success response
 */
export async function deleteCustomer(id) {
  return await apiClient("delete", `/customer-master/${id}`, {
    data: {
      updatedBy: 1, // TODO: Get from auth context
    },
  });
}

/**
 * Get customer dropdown list (for use in other forms)
 * @returns {Promise<Object>} List of customers for dropdown
 */
export async function getCustomerDropdown() {
  const response = await apiClient("get", "/customer-master/dropdown");

  return {
    success: response.success,
    data: response.data, // Already in the correct format from backend
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
