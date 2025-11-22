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
    fitting_price: frontendData.fitting_price !== undefined ? frontendData.fitting_price : 0,
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
    fitting_price: backendData.fitting_price || 0,
    activeStatus:
      backendData.activeStatus !== undefined ? backendData.activeStatus : true,
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
 * Get paginated list of lens fittings with filtering
 * @param {number} page - Page number (1-indexed for backend)
 * @param {number} limit - Items per page
 * @param {string} search - Search term
 * @param {Object} filters - Additional filters
 * @param {string} sortBy - Sort field
 * @param {string} sortOrder - Sort direction (asc/desc)
 * @returns {Promise<Object>} Response with data and pagination info
 */
export async function getLensFittings(
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

  const response = await apiClient("get", "/v1/lens-fittings", {
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
 * Get single lens fitting by ID
 * @param {number} id - Fitting ID
 * @returns {Promise<Object>} Fitting data
 */
export async function getLensFittingById(id) {
  const response = await apiClient("get", `/v1/lens-fittings/${id}`);

  return {
    success: response.success,
    data: mapFromBackend(response.data),
  };
}

/**
 * Create new lens fitting
 * @param {Object} fittingData - Fitting data
 * @returns {Promise<Object>} Created fitting
 */
export async function createLensFitting(fittingData) {
  const backendData = mapToBackend(fittingData);
  const response = await apiClient("post", "/v1/lens-fittings", {
    data: backendData,
  });

  return {
    success: response.success,
    data: mapFromBackend(response.data),
    message: response.message,
  };
}

/**
 * Update lens fitting
 * @param {number} id - Fitting ID
 * @param {Object} fittingData - Updated fitting data
 * @returns {Promise<Object>} Updated fitting
 */
export async function updateLensFitting(id, fittingData) {
  const backendData = mapToBackend(fittingData);
  const response = await apiClient("put", `/v1/lens-fittings/${id}`, {
    data: backendData,
  });

  return {
    success: response.success,
    data: mapFromBackend(response.data),
    message: response.message,
  };
}

/**
 * Delete lens fitting (soft delete)
 * @param {number} id - Fitting ID
 * @returns {Promise<Object>} Success response
 */
export async function deleteLensFitting(id) {
  const response = await apiClient("delete", `/v1/lens-fittings/${id}`);

  return {
    success: response.success,
    message: response.message,
  };
}

/**
 * Get lens fittings dropdown list
 * @returns {Promise<Object>} Dropdown data
 */
export async function getLensFittingDropdown() {
  const response = await apiClient("get", "/v1/lens-fittings/dropdown");

  return {
    success: response.success,
    data: response.data,
  };
}
