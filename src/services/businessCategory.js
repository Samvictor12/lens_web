import { apiClient } from "./apiClient";

/**
 * Get paginated list of business categories
 * @param {number} page - Page number (1-indexed)
 * @param {number} limit - Items per page
 * @param {string} search - Search term
 * @param {Object} filters - Additional filters
 * @param {string} sortBy - Sort field
 * @param {string} sortOrder - Sort direction (asc/desc)
 * @returns {Promise<Object>} Response with data and pagination info
 */
export async function getBusinessCategories(
  page = 1,
  limit = 10,
  search = "",
  filters = {},
  sortBy = "createdAt",
  sortOrder = "desc"
) {
  const params = {
    page,
    limit,
    sortBy,
    sortOrder,
  };

  // Add search term
  if (search && search.trim()) {
    params.name = search.trim();
  }

  // Add filters
  if (filters) {
    if (filters.active_status !== "all" && filters.active_status !== undefined) {
      params.active_status = filters.active_status;
    }
  }

  const response = await apiClient("get", "/business-category", {
    params,
  });

  return {
    success: response.success,
    data: response.data,
    pagination: response.pagination,
  };
}

/**
 * Get single business category by ID
 * @param {number} id - Category ID
 * @returns {Promise<Object>} Category data
 */
export async function getBusinessCategoryById(id) {
  const response = await apiClient("get", `/business-category/${id}`);

  return {
    success: response.success,
    data: response.data,
  };
}

/**
 * Create a new business category
 * @param {Object} categoryData - Category data
 * @returns {Promise<Object>} Created category data
 */
export async function createBusinessCategory(categoryData) {
  const response = await apiClient("post", "/business-category", {
    data: {
      name: categoryData.name,
      active_status: categoryData.activeStatus !== undefined ? categoryData.activeStatus : true,
    },
  });

  return {
    success: response.success,
    data: response.data,
  };
}

/**
 * Update existing business category
 * @param {number} id - Category ID
 * @param {Object} categoryData - Updated category data
 * @returns {Promise<Object>} Updated category data
 */
export async function updateBusinessCategory(id, categoryData) {
  const response = await apiClient("put", `/business-category/${id}`, {
    data: {
      name: categoryData.name,
      active_status: categoryData.activeStatus,
    },
  });

  return {
    success: response.success,
    data: response.data,
  };
}

/**
 * Delete business category (soft delete)
 * @param {number} id - Category ID
 * @returns {Promise<Object>} Success response
 */
export async function deleteBusinessCategory(id) {
  return await apiClient("delete", `/business-category/${id}`);
}

/**
 * Get business category dropdown list (for use in other forms)
 * @returns {Promise<Object>} List of categories for dropdown
 */
export async function getBusinessCategoryDropdown() {
  const response = await apiClient("get", "/business-category/dropdown");

  return {
    success: response.success,
    data: response.data,
  };
}
