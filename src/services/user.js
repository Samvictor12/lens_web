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
    department_id: frontendData.departmentId || null,
    salary: frontendData.salary ? parseFloat(frontendData.salary) : null,
    active_status:
      frontendData.activeStatus !== undefined ? frontendData.activeStatus : true,
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
      backendData.active_status !== undefined ? backendData.active_status : true,
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
    if (filters.active_status !== "all" && filters.active_status !== undefined) {
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
 * Update user login settings (user_name, password, is_login)
 * @param {number} id - User ID
 * @param {Object} loginData - Login credentials data
 * @returns {Promise<Object>} Updated user data
 */
export async function updateUserLoginSettings(id, loginData) {
  const response = await apiClient("put", `/user-master/${id}/login-settings`, {
    data: {
      user_name: loginData.user_name,
      password: loginData.password || undefined, // Only send if provided
      is_login: loginData.is_login,
    },
  });

  return {
    success: response.success,
    data: mapFromBackend(response.data),
  };
}

/**
 * Check if email exists
 * @param {string} email - Email to check
 * @param {number} excludeId - User ID to exclude from check (for updates)
 * @returns {Promise<Object>} Exists status
 */
export async function checkEmailExists(email, excludeId = null) {
  const data = { email };
  if (excludeId) {
    data.excludeId = excludeId;
  }

  const response = await apiClient("post", "/user-master/check-email", {
    data,
  });

  return {
    success: response.success,
    exists: response.data.exists,
  };
}

/**
 * Check if usercode exists
 * @param {string} usercode - Usercode to check
 * @param {number} excludeId - User ID to exclude from check (for updates)
 * @returns {Promise<Object>} Exists status
 */
export async function checkUsercodeExists(usercode, excludeId = null) {
  const data = { usercode };
  if (excludeId) {
    data.excludeId = excludeId;
  }

  const response = await apiClient("post", "/user-master/check-usercode", {
    data,
  });

  return {
    success: response.success,
    exists: response.data.exists,
  };
}

// Old functions kept for backward compatibility (if needed elsewhere)
export async function deleteDealers(ids) {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    throw new Error("No dealer IDs provided for deletion");
  }

  return await apiClient("delete", "/users/delete", {
    data: { ids },
  });
}
export async function bulkUploadusers(file) {
  const formData = new FormData();
  formData.append("file", file);

  return await apiClient("post", "/users/bulk-upload", {
    data: formData,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
}
export async function bulkUpdateStatus(ids, active_status, updated_by = null) {
  return await apiClient("put", "/users/bulk-update-status", {
    data: { ids, active_status, updated_by },
  });
}
// export async function exportUsersExcel(ids) {
//   if (!ids || ids.length === 0) {
//     throw new Error("No dealer IDs provided for Excel export");
//   }

//   const response = await apiClient("post", "/users/export/excel", {
//     data: { ids },
//     responseType: "blob", //  ensure browser downloads file
//   });

//   // Trigger browser download
//   const url = window.URL.createObjectURL(new Blob([response]));
//   const link = document.createElement("a");
//   link.href = url;
//   link.setAttribute("download", "users.xlsx");
//   document.body.appendChild(link);
//   link.click();
//   link.remove();
// }

export async function exportUsersExcel(
  ids = [],
  filter = {},
  columns = [],
  sort_by = "created_date",
  sort_order = "desc",
  logoBase64
) {
  if (!ids || ids.length === 0) {
    throw new Error("No user IDs provided for Excel export");
  }

  const response = await apiClient("post", "/users/export/excel", {
    data: { ids, filter, columns, sort_by, sort_order, logoBase64 },
    responseType: "blob", // ensure browser downloads file
  });

  // Trigger browser download
  const url = window.URL.createObjectURL(new Blob([response]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "users.xlsx");
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url); // cleanup
}

export async function exportUsersPdf(
  ids,
  filter = {},
  columns = [],
  sort_by = "created_date",
  sort_order = "desc",
  base64Logo
) {
  if (!ids || ids.length === 0) {
    throw new Error("No user IDs provided for PDF export");
  }

  const response = await apiClient("post", "/users/export/pdf", {
    data: { ids, filter, columns, sort_by, sort_order, base64Logo },
    responseType: "blob", // binary download
  });

  // Trigger browser download
  const url = window.URL.createObjectURL(new Blob([response]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "users.pdf");
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url); // cleanup
}

// export async function exportUsersPdf(ids) {
//   if (!ids || ids.length === 0) {
//     throw new Error("No dealer IDs provided for PDF export");
//   }

//   const response = await apiClient("post", "/users/export/pdf", {
//     data: { ids },
//     responseType: "blob", //  binary download
//   });

//   // Trigger browser download
//   const url = window.URL.createObjectURL(new Blob([response]));
//   const link = document.createElement("a");
//   link.href = url;
//   link.setAttribute("download", "users.pdf");
//   document.body.appendChild(link);
//   link.click();
//   link.remove();
// }
export async function getUserLoginInfoById(id) {
  return await apiClient("get", `/users/${id}/login-info`);
}
export async function createUserLogin(id, payload) {
  return await apiClient("post", `/users/${id}/enable-login`, {
    data: payload,
  });
}
export async function updateUserLogin(id, payload) {
  return await apiClient("put", `/users/${id}/update-login`, {
    data: payload,
  });
}

export async function changePassword(id, oldPassword, newPassword) {
  return await apiClient("put", "/users/change-password", {
    data: {
      id,
      oldPassword,
      newPassword,
    },
  });
}

export async function forgotPassword(email) {
  return await apiClient("put", "/users/forget-password", {
    data: { email },
  });
}
export async function resetPassword(email, otp, newPassword) {
  return await apiClient("put", "/users/reset-password", {
    data: { email, otp, newPassword },
  });
}
