import { apiClient } from "./apiClient";

export async function getUsers(
  page = 1,
  limit = 10,
  search,
  filters = {},
  sort_by,
  sort_order
) {
  return await apiClient("get", "/users/list", {
    params: { page, limit, search, ...filters, sort_by, sort_order }, // backend can support search filter if implemented
  });
}
export async function createUser(payload) {
  return await apiClient("post", "/users/register", {
    data: {
      full_name: payload.full_name,
      email: payload.email,
      phone_number: payload.phone_number,
      department_id: payload.department_id,
      active_status: payload.active_status,
    },
  });
}
export async function updateUser(payload) {
  return await apiClient("put", `/users/update/${payload.id}`, {
    data: {
      full_name: payload.full_name,
      email: payload.email,
      phone_number: payload.phone_number,
      department_id: payload.department_id,
      active_status: payload.active_status,
    },
  });
}
export async function getUserById(id) {
  return await apiClient("get", `/users/${id}`);
}
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
