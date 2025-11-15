import { apiClient } from "./apiClient";

/**
 * Field mapping utilities
 * Maps frontend field names to backend field names
 */
const mapToBackend = (frontendData) => {
  return {
    name: frontendData.name,
    description: frontendData.description || null,
    activeStatus:
      frontendData.activeStatus !== undefined
        ? frontendData.activeStatus
        : true,
    // createdBy and updatedBy will be set by the backend controller from req.user.id
  };
};

const mapFromBackend = (backendData) => {
  return {
    id: backendData.id,
    name: backendData.name,
    description: backendData.description || "",
    activeStatus:
      backendData.activeStatus !== undefined ? backendData.activeStatus : true,
    productCount: backendData._count?.lensProductMasters || 0,
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

  // Add search term (backend uses 'search' field for name/description search)
  if (search && search.trim()) {
    params.search = search.trim();
  }

  // Map frontend filters to backend query params
  if (filters) {
    // Active status filter
    if (
      filters.activeStatus !== "all" &&
      filters.activeStatus !== undefined
    ) {
      params.activeStatus = filters.activeStatus;
    }
  }

  return params;
};

/**
 * Get paginated list of lens brands with filtering
 * @param {number} page - Page number (1-indexed for backend)
 * @param {number} limit - Items per page
 * @param {string} search - Search term
 * @param {Object} filters - Additional filters
 * @param {string} sortBy - Sort field
 * @param {string} sortOrder - Sort direction (asc/desc)
 * @returns {Promise<Object>} Response with data and pagination info
 */
export async function getLensBrands(
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

  const response = await apiClient("get", "/v1/lens-brands", {
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
 * Get single lens brand by ID
 * @param {number} id - Brand ID
 * @returns {Promise<Object>} Brand data
 */
export async function getLensBrandById(id) {
  const response = await apiClient("get", `/v1/lens-brands/${id}`);

  return {
    success: response.success,
    data: mapFromBackend(response.data),
  };
}

/**
 * Create new lens brand
 * @param {Object} brandData - Brand data
 * @returns {Promise<Object>} Created brand
 */
export async function createLensBrand(brandData) {
  const backendData = mapToBackend(brandData);
  const response = await apiClient("post", "/v1/lens-brands", {
    data: backendData,
  });

  return {
    success: response.success,
    data: mapFromBackend(response.data),
    message: response.message,
  };
}

/**
 * Update lens brand
 * @param {number} id - Brand ID
 * @param {Object} brandData - Updated brand data
 * @returns {Promise<Object>} Updated brand
 */
export async function updateLensBrand(id, brandData) {
  const backendData = mapToBackend(brandData);
  const response = await apiClient("put", `/v1/lens-brands/${id}`, {
    data: backendData,
  });

  return {
    success: response.success,
    data: mapFromBackend(response.data),
    message: response.message,
  };
}

/**
 * Delete lens brand (soft delete)
 * @param {number} id - Brand ID
 * @returns {Promise<Object>} Success response
 */
export async function deleteLensBrand(id) {
  const response = await apiClient("delete", `/v1/lens-brands/${id}`);

  return {
    success: response.success,
    message: response.message,
  };
}

/**
 * Get lens brands dropdown list
 * @returns {Promise<Object>} Dropdown data
 */
export async function getLensBrandDropdown() {
  const response = await apiClient("get", "/v1/lens-brands/dropdown");

  return {
    success: response.success,
    data: response.data,
  };
}

/**
 * Get lens brand statistics
 * @returns {Promise<Object>} Statistics data
 */
export async function getLensBrandStatistics() {
  const response = await apiClient("get", "/v1/lens-brands/statistics");

  return {
    success: response.success,
    data: response.data,
  };
}
