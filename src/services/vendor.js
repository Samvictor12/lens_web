import { apiClient } from "./apiClient";

/**
 * Field mapping utilities
 * Maps frontend field names to backend field names
 */
const mapToBackend = (frontendData) => {
  return {
    code: frontendData.vendorCode || null,
    name: frontendData.name,
    shopname: frontendData.shopName || null,
    phone: frontendData.phone || null,
    email: frontendData.email,
    address: frontendData.address || null,
    city: frontendData.city || null,
    state: frontendData.state || null,
    pincode: frontendData.pincode || null,
    category: frontendData.category || null,
    gstin: frontendData.gstNumber || null,
    notes: frontendData.remarks || null,
    active_status: frontendData.activeStatus !== undefined ? frontendData.activeStatus : true,
    createdBy: 1, // TODO: Get from auth context
    updatedBy: 1, // TODO: Get from auth context
  };
};

const mapFromBackend = (backendData) => {
  return {
    id: backendData.id,
    vendorCode: backendData.code || `VEND-${String(backendData.id).padStart(3, '0')}`,
    name: backendData.name,
    shopName: backendData.shopname || "",
    phone: backendData.phone || "",
    email: backendData.email || "",
    address: backendData.address || "",
    city: backendData.city || "",
    state: backendData.state || "",
    pincode: backendData.pincode || "",
    category: backendData.category || "",
    gstNumber: backendData.gstin || "",
    remarks: backendData.notes || "",
    activeStatus: backendData.active_status !== undefined ? backendData.active_status : true,
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
    if (filters.active_status !== "all" && filters.active_status !== undefined) {
      params.active_status = filters.active_status;
    }

    // Category filter (contains search, case insensitive)
    if (filters.category && filters.category.trim()) {
      params.category = filters.category.trim();
    }

    // City filter (contains search, case insensitive)
    if (filters.city && filters.city.trim()) {
      params.city = filters.city.trim();
    }
  }

  return params;
};

/**
 * Get paginated list of vendors with filtering
 * @param {number} page - Page number (1-indexed for backend)
 * @param {number} limit - Items per page
 * @param {string} search - Search term
 * @param {Object} filters - Additional filters
 * @param {string} sortBy - Sort field
 * @param {string} sortOrder - Sort direction (asc/desc)
 * @returns {Promise<Object>} Response with data and pagination info
 */
export async function getVendors(
  page = 1,
  limit = 10,
  search = "",
  filters = {},
  sortBy = "createdAt",
  sortOrder = "desc"
) {
  const params = buildQueryParams(page, limit, search, filters, sortBy, sortOrder);
  
  const response = await apiClient("get", "/vendor-master", {
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
 * Get single vendor by ID
 * @param {number} id - Vendor ID
 * @returns {Promise<Object>} Vendor data
 */
export async function getVendorById(id) {
  const response = await apiClient("get", `/vendor-master/${id}`);
  
  return {
    success: response.success,
    data: mapFromBackend(response.data),
  };
}

/**
 * Create a new vendor
 * @param {Object} vendorData - Vendor data in frontend format
 * @returns {Promise<Object>} Created vendor data
 */
export async function createVendor(vendorData) {
  const backendData = mapToBackend(vendorData);
  
  const response = await apiClient("post", "/vendor-master", {
    data: backendData,
  });

  return {
    success: response.success,
    data: mapFromBackend(response.data),
  };
}

/**
 * Update existing vendor
 * @param {number} id - Vendor ID
 * @param {Object} vendorData - Updated vendor data in frontend format
 * @returns {Promise<Object>} Updated vendor data
 */
export async function updateVendor(id, vendorData) {
  const backendData = mapToBackend(vendorData);
  
  const response = await apiClient("put", `/vendor-master/${id}`, {
    data: backendData,
  });

  return {
    success: response.success,
    data: mapFromBackend(response.data),
  };
}

/**
 * Delete vendor (soft delete)
 * @param {number} id - Vendor ID
 * @returns {Promise<Object>} Success response
 */
export async function deleteVendor(id) {
  return await apiClient("delete", `/vendor-master/${id}`, {
    data: {
      updatedBy: 1, // TODO: Get from auth context
    },
  });
}

/**
 * Get vendor dropdown list (for use in other forms)
 * @returns {Promise<Object>} List of vendors for dropdown
 */
export async function getVendorDropdown() {
  const response = await apiClient("get", "/vendor-master/dropdown");
  
  return {
    success: response.success,
    data: response.data, // Already in the correct format from backend
  };
}

/**
 * Check if vendor email exists
 * @param {string} email - Email to check
 * @param {number} excludeId - Vendor ID to exclude from check (for updates)
 * @returns {Promise<Object>} Response with exists flag
 */
export async function checkVendorEmail(email, excludeId = null) {
  return await apiClient("post", "/vendor-master/check-email", {
    data: { email, excludeId },
  });
}
