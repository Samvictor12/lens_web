import { apiClient } from "./apiClient";

/**
 * Field mapping utilities
 * Maps frontend field names to backend field names
 */
const mapToBackend = (frontendData) => {
  return {
    name: frontendData.name,
    usercode: frontendData.usercode,
    email: frontendData.email,
    phonenumber: frontendData.phonenumber || null,
    alternatenumber: frontendData.alternatenumber || null,
    bloodgroup: frontendData.bloodgroup || null,
    address: frontendData.address || null,
    city: frontendData.city || null,
    state: frontendData.state || null,
    pincode: frontendData.pincode || null,
    role_id: frontendData.roleId || null,
    department_id: frontendData.department_id || null,
    salary: frontendData.salary ? parseFloat(frontendData.salary) : null,
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
    name: backendData.name,
    usercode: backendData.usercode,
    email: backendData.email,
    phonenumber: backendData.phonenumber || "",
    alternatenumber: backendData.alternatenumber || "",
    bloodgroup: backendData.bloodgroup || null,
    address: backendData.address || "",
    city: backendData.city || "",
    state: backendData.state || "",
    pincode: backendData.pincode || "",
    role_id: backendData.role_id || null,
    department_id: backendData.department_id || null,
    salary: backendData.salary || 0,
    active_status:
      backendData.active_status !== undefined
        ? backendData.active_status
        : true,
    createdAt: backendData.createdAt,
    departmentDetails: backendData.departmentDetails || null,
    role: backendData.role || null,
    // Login fields (will be added to Prisma)
    user_name: backendData.user_name || "",
    is_login: backendData.is_login || false,
  };
};

/**
 * Get paginated list of users
 * @param {number} page - Page number (1-indexed)
 * @param {number} limit - Items per page
 * @param {string} search - Search term
 * @param {Object} filters - Additional filters
 * @param {string} sortBy - Sort field
 * @param {string} sortOrder - Sort direction (asc/desc)
 * @returns {Promise<Object>} Response with data and pagination info
 */
export async function getUsers(
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
    params.search = search.trim();
  }

  // Add filters
  if (filters) {
    if (
      filters.active_status !== "all" &&
      filters.active_status !== undefined
    ) {
      params.active_status = filters.active_status;
    }
    if (filters.department_id) {
      params.department_id = filters.department_id;
    }
    if (filters.role_id) {
      params.role_id = filters.role_id;
    }
  }

  const response = await apiClient("get", "/user-master", {
    params,
  });

  return {
    success: response.success,
    data: response.data.map(mapFromBackend),
    pagination: response.pagination,
  };
}

/**
 * Get single user by ID
 * @param {number} id - User ID
 * @returns {Promise<Object>} User data
 */
export async function getUserById(id) {
  const response = await apiClient("get", `/user-master/${id}`);

  return {
    success: response.success,
    data: mapFromBackend(response.data),
  };
}

/**
 * Create a new user
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Created user data
 */
export async function createUser(userData) {
  const response = await apiClient("post", "/user-master", {
    data: mapToBackend(userData),
  });

  return {
    success: response.success,
    data: mapFromBackend(response.data),
  };
}

/**
 * Update existing user
 * @param {number} id - User ID
 * @param {Object} userData - Updated user data
 * @returns {Promise<Object>} Updated user data
 */
export async function updateUser(id, userData) {
  const response = await apiClient("put", `/user-master/${id}`, {
    data: mapToBackend(userData),
  });

  return {
    success: response.success,
    data: mapFromBackend(response.data),
  };
}

/**
 * Delete user (soft delete)
 * @param {number} id - User ID
 * @returns {Promise<Object>} Success response
 */
export async function deleteUser(id) {
  return await apiClient("delete", `/user-master/${id}`);
}

/**
 * Generate unique user code
 * Generates codes in format USR001, USR002, etc.
 * @returns {Promise<Object>} Generated user code
 */
export async function generateUserCode() {
  // Get all users to find the next available code
  const response = await apiClient("get", "/user-master", {
    params: { page: 1, limit: 9999, sortBy: "usercode", sortOrder: "desc" },
  });

  if (!response.success || !response.data || response.data.length === 0) {
    return { success: true, data: { usercode: "USR001" } };
  }

  // Find the highest numeric code
  let maxNumber = 0;
  response.data.forEach((user) => {
    if (user.usercode && user.usercode.startsWith("USR")) {
      const numStr = user.usercode.substring(3);
      const num = parseInt(numStr, 10);
      if (!isNaN(num) && num > maxNumber) {
        maxNumber = num;
      }
    }
  });

  // Generate next code
  const nextNumber = maxNumber + 1;
  const usercode = `USR${String(nextNumber).padStart(3, "0")}`;

  return { success: true, data: { usercode } };
}

/**
 * Get login credentials for a user
 * @param {number} id - User ID
 * @returns {Promise<Object>} Login credentials (username, is_login)
 */
export async function getLoginCredentials(id) {
  const response = await apiClient(
    "get",
    `/user-master/${id}/login-credentials`
  );

  return {
    success: response.success,
    data: response.data,
  };
}

/**
 * Enable login for a user (First time setup)
 * @param {number} id - User ID
 * @param {Object} loginData - Login credentials data
 * @returns {Promise<Object>} Updated user data
 */
export async function enableUserLogin(id, loginData) {
  const response = await apiClient("post", `/user-master/${id}/enable-login`, {
    data: {
      username: loginData.username,
      password: loginData.password,
      is_login: loginData.is_login !== undefined ? loginData.is_login : true,
    },
  });

  return {
    success: response.success,
    message: response.message,
    data: mapFromBackend(response.data),
  };
}

/**
 * Update user login settings (username, password, is_login)
 * @param {number} id - User ID
 * @param {Object} loginData - Login credentials data
 * @returns {Promise<Object>} Updated user data
 */
// export async function updateUserLogin(id, loginData) {
//   const data = {};

//   if (loginData.username) {
//     data.username = loginData.username;
//   }

//   if (loginData.password) {
//     data.password = loginData.password;
//   }

//   if (loginData.is_login !== undefined) {
//     data.is_login = loginData.is_login;
//   }

//   const response = await apiClient("put", `/user-master/${id}/update-login`, {
//     data,
//   });

//   return {
//     success: response.success,
//     message: response.message,
//     data: mapFromBackend(response.data),
//   };
// }

// Old functions kept for backward compatibility (if needed elsewhere)
export async function deleteDealers(ids) {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    throw new Error("No dealer IDs provided for deletion");
  }

  return await apiClient("delete", "/user-master/delete", {
    data: { ids },
  });
}

export async function getUserLoginInfoById(id) {
  return await apiClient("get", `/user-master/${id}/login-info`);
}
export async function createUserLogin(id, payload) {
  return await apiClient("post", `/user-master/${id}/enable-login`, {
    data: payload,
  });
}
export async function updateUserLogin(id, payload) {
  // Only send fields that have values
  const data = {};
  
  if (payload.username && payload.username.trim() !== '') {
    data.username = payload.username.trim();
  }
  
  if (payload.password && payload.password.trim() !== '') {
    data.password = payload.password;
  }
  
  if (payload.is_login !== undefined) {
    data.is_login = payload.is_login;
  }
  
  return await apiClient("put", `/user-master/${id}/update-login`, {
    data,
  });
}

export async function changePassword(id, oldPassword, newPassword) {
  return await apiClient("put", "/user-master/change-password", {
    data: {
      id,
      oldPassword,
      newPassword,
    },
  });
}

export async function forgotPassword(email) {
  return await apiClient("put", "/user-master/forget-password", {
    data: { email },
  });
}
export async function resetPassword(email, otp, newPassword) {
  return await apiClient("put", "/user-master/reset-password", {
    data: { email, otp, newPassword },
  });
}

/**
 * Get sales persons dropdown
 * @returns {Promise<Array>} List of sales persons for dropdown
 */
export async function getSalesPersonsDropdown() {
  return await apiClient("get", "/user-master/sales-persons/dropdown");
}

/**
 * Get delivery persons dropdown
 * @returns {Promise<Array>} List of delivery persons for dropdown
 */
export async function getDeliveryPersonsDropdown() {
  return await apiClient("get", "/user-master/delivery-persons/dropdown");
}
