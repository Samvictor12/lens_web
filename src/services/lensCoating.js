import { apiClient } from "./apiClient";

/**
 * Field mapping utilities
 * Maps frontend field names to backend field names
 */
const mapToBackend = (frontendData) => {
  return {
    name: frontendData.name,
    short_name: frontendData.short_name,
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
    short_name: backendData.short_name,
    description: backendData.description || "",
    activeStatus:
      backendData.activeStatus !== undefined ? backendData.activeStatus : true,
    productCount: backendData._count?.lensPriceMasters || 0,
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

  // Add search term (backend uses 'search' field for name/short_name/description search)
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
 * Get paginated list of lens coatings with filtering
 * @param {number} page - Page number (1-indexed for backend)
 * @param {number} limit - Items per page
 * @param {string} search - Search term
 * @param {Object} filters - Additional filters
 * @param {string} sortBy - Sort field
 * @param {string} sortOrder - Sort direction (asc/desc)
 * @returns {Promise<Object>} Response with data and pagination info
 */
export async function getLensCoatings(
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

  const response = await apiClient("get", "/v1/lens-coatings", {
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
 * Get single lens coating by ID
 * @param {number} id - Coating ID
 * @returns {Promise<Object>} Coating data
 */
export async function getLensCoatingById(id) {
  const response = await apiClient("get", `/v1/lens-coatings/${id}`);

  return {
    success: response.success,
    data: mapFromBackend(response.data),
  };
}

/**
 * Create new lens coating
 * @param {Object} coatingData - Coating data
 * @returns {Promise<Object>} Created coating
 */
export async function createLensCoating(coatingData) {
  const backendData = mapToBackend(coatingData);
  const response = await apiClient("post", "/v1/lens-coatings", {
    data: backendData,
  });

  return {
    success: response.success,
    data: mapFromBackend(response.data),
    message: response.message,
  };
}

/**
 * Update lens coating
 * @param {number} id - Coating ID
 * @param {Object} coatingData - Updated coating data
 * @returns {Promise<Object>} Updated coating
 */
export async function updateLensCoating(id, coatingData) {
  const backendData = mapToBackend(coatingData);
  const response = await apiClient("put", `/v1/lens-coatings/${id}`, {
    data: backendData,
  });

  return {
    success: response.success,
    data: mapFromBackend(response.data),
    message: response.message,
  };
}

/**
 * Delete lens coating (soft delete)
 * @param {number} id - Coating ID
 * @returns {Promise<Object>} Success response
 */
export async function deleteLensCoating(id) {
  const response = await apiClient("delete", `/v1/lens-coatings/${id}`);

  return {
    success: response.success,
    message: response.message,
  };
}

/**
 * Get lens coatings dropdown list
 * @returns {Promise<Object>} Dropdown data
 */
export async function getLensCoatingDropdown() {
  const response = await apiClient("get", "/v1/lens-coatings/dropdown");

  return {
    success: response.success,
    data: response.data,
  };
}

/**
 * Get lens coating statistics
 * @returns {Promise<Object>} Statistics data
 */
export async function getLensCoatingStatistics() {
  const response = await apiClient("get", "/v1/lens-coatings/statistics");

  return {
    success: response.success,
    data: response.data,
  };
}
