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
 * Get paginated list of lens categories with filtering
 * @param {number} page - Page number (1-indexed for backend)
 * @param {number} limit - Items per page
 * @param {string} search - Search term
 * @param {Object} filters - Additional filters
 * @param {string} sortBy - Sort field
 * @param {string} sortOrder - Sort direction (asc/desc)
 * @returns {Promise<Object>} Response with data and pagination info
 */
export async function getLensCategories(
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

  const response = await apiClient("get", "/v1/lens-categories", {
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
 * Get single lens category by ID
 * @param {number} id - Category ID
 * @returns {Promise<Object>} Category data
 */
export async function getLensCategoryById(id) {
  const response = await apiClient("get", `/v1/lens-categories/${id}`);

  return {
    success: response.success,
    data: mapFromBackend(response.data),
  };
}

/**
 * Create new lens category
 * @param {Object} categoryData - Category data
 * @returns {Promise<Object>} Created category
 */
export async function createLensCategory(categoryData) {
  const backendData = mapToBackend(categoryData);
  const response = await apiClient("post", "/v1/lens-categories", {
    data: backendData,
  });

  return {
    success: response.success,
    data: mapFromBackend(response.data),
    message: response.message,
  };
}

/**
 * Update lens category
 * @param {number} id - Category ID
 * @param {Object} categoryData - Updated category data
 * @returns {Promise<Object>} Updated category
 */
export async function updateLensCategory(id, categoryData) {
  const backendData = mapToBackend(categoryData);
  const response = await apiClient("put", `/v1/lens-categories/${id}`, {
    data: backendData,
  });

  return {
    success: response.success,
    data: mapFromBackend(response.data),
    message: response.message,
  };
}

/**
 * Delete lens category (soft delete)
 * @param {number} id - Category ID
 * @returns {Promise<Object>} Success response
 */
export async function deleteLensCategory(id) {
  const response = await apiClient("delete", `/v1/lens-categories/${id}`);

  return {
    success: response.success,
    message: response.message,
  };
}

/**
 * Get lens categories dropdown list
 * @returns {Promise<Object>} Dropdown data
 */
export async function getLensCategoryDropdown() {
  const response = await apiClient("get", "/v1/lens-categories/dropdown");

  return {
    success: response.success,
    data: response.data,
  };
}

/**
 * Get lens category statistics
 * @returns {Promise<Object>} Statistics data
 */
export async function getLensCategoryStatistics() {
  const response = await apiClient("get", "/v1/lens-categories/statistics");

  return {
    success: response.success,
    data: response.data,
  };
}
