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
 * Get paginated list of lens materials with filtering
 * @param {number} page - Page number (1-indexed for backend)
 * @param {number} limit - Items per page
 * @param {string} search - Search term
 * @param {Object} filters - Additional filters
 * @param {string} sortBy - Sort field
 * @param {string} sortOrder - Sort direction (asc/desc)
 * @returns {Promise<Object>} Response with data and pagination info
 */
export async function getLensMaterials(
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

  const response = await apiClient("get", "/v1/lens-materials", {
    params,
  });

  // Map backend data to frontend format
  return {
    success: response.success,
    data: response.data.map(mapFromBackend),
    pagination: {
      total: response.totalCount,
      page: response.page,
      limit: response.pageSize,
      pages: Math.ceil(response.totalCount / response.pageSize)
    },
  };
}

/**
 * Get single lens material by ID
 * @param {number} id - Material ID
 * @returns {Promise<Object>} Material data
 */
export async function getLensMaterial(id) {
  const response = await apiClient("get", `/v1/lens-materials/${id}`);

  return {
    success: response.success,
    data: mapFromBackend(response.data),
  };
}

/**
 * Create new lens material
 * @param {Object} materialData - Material data
 * @returns {Promise<Object>} Created material
 */
export async function createLensMaterial(materialData) {
  const backendData = mapToBackend(materialData);
  const response = await apiClient("post", "/v1/lens-materials", {
    data: backendData,
  });

  return {
    success: response.success,
    data: mapFromBackend(response.data),
    message: response.message,
  };
}

/**
 * Update lens material
 * @param {number} id - Material ID
 * @param {Object} materialData - Updated material data
 * @returns {Promise<Object>} Updated material
 */
export async function updateLensMaterial(id, materialData) {
  const backendData = mapToBackend(materialData);
  const response = await apiClient("put", `/v1/lens-materials/${id}`, {
    data: backendData,
  });

  return {
    success: response.success,
    data: mapFromBackend(response.data),
    message: response.message,
  };
}

/**
 * Delete lens material (soft delete)
 * @param {number} id - Material ID
 * @returns {Promise<Object>} Success response
 */
export async function deleteLensMaterial(id) {
  const response = await apiClient("delete", `/v1/lens-materials/${id}`);

  return {
    success: response.success,
    message: response.message,
  };
}

/**
 * Get lens materials dropdown list
 * @returns {Promise<Object>} Dropdown data
 */
export async function getLensMaterialDropdown() {
  const response = await apiClient("get", "/v1/lens-materials/dropdown");

  return {
    success: response.success,
    data: response.data,
  };
}

/**
 * Get lens material statistics
 * @returns {Promise<Object>} Statistics data
 */
export async function getLensMaterialStatistics() {
  const response = await apiClient("get", "/v1/lens-materials/statistics");

  return {
    success: response.success,
    data: response.data,
  };
}
