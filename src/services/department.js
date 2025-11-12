import { apiClient } from "./apiClient";

/**
 * Get paginated list of departments
 * @param {number} page - Page number (1-indexed)
 * @param {number} limit - Items per page
 * @param {string} search - Search term
 * @param {Object} filters - Additional filters
 * @param {string} sortBy - Sort field
 * @param {string} sortOrder - Sort direction (asc/desc)
 * @returns {Promise<Object>} Response with data and pagination info
 */
export async function getDepartments(
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
    params.department = search.trim();
  }

  // Add filters
  if (filters) {
    if (filters.active_status !== "all" && filters.active_status !== undefined) {
      params.active_status = filters.active_status;
    }
  }

  const response = await apiClient("get", "/department", {
    params,
  });

  return {
    success: response.success,
    data: response.data,
    pagination: response.pagination,
  };
}

/**
 * Get single department by ID
 * @param {number} id - Department ID
 * @returns {Promise<Object>} Department data
 */
export async function getDepartmentById(id) {
  const response = await apiClient("get", `/department/${id}`);

  return {
    success: response.success,
    data: response.data,
  };
}

/**
 * Create a new department
 * @param {Object} departmentData - Department data
 * @returns {Promise<Object>} Created department data
 */
export async function createDepartment(departmentData) {
  const response = await apiClient("post", "/department", {
    data: {
      department: departmentData.department,
      active_status: departmentData.activeStatus !== undefined ? departmentData.activeStatus : true,
    },
  });

  return {
    success: response.success,
    data: response.data,
  };
}

/**
 * Update existing department
 * @param {number} id - Department ID
 * @param {Object} departmentData - Updated department data
 * @returns {Promise<Object>} Updated department data
 */
export async function updateDepartment(id, departmentData) {
  const response = await apiClient("put", `/department/${id}`, {
    data: {
      department: departmentData.department,
      active_status: departmentData.activeStatus,
    },
  });

  return {
    success: response.success,
    data: response.data,
  };
}

/**
 * Delete department (soft delete)
 * @param {number} id - Department ID
 * @returns {Promise<Object>} Success response
 */
export async function deleteDepartment(id) {
  return await apiClient("delete", `/department/${id}`);
}

/**
 * Get department dropdown list (for use in other forms)
 * @returns {Promise<Object>} List of departments for dropdown
 */
export async function getDepartmentDropdown() {
  const response = await apiClient("get", "/department/dropdown");

  return {
    success: response.success,
    data: response.data,
  };
}
