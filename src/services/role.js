// src/services/role.js — Real Backend API Client for Roles & Permissions
import { apiClient } from './apiClient';

/** Get list of roles (supports search, sort, filter) */
export async function getRoles(params = {}) {
  const response = await apiClient('get', '/roles/list', {
    params: {
      page: params.page || 1,
      limit: params.limit || 10,
      search: params.search || '',
      sort_by: params.sort_by || 'createdAt',
      sort_order: params.sort_order || 'desc',
      active_status: params.active_status || 'all',
    },
  });

  return response;
}

/** Get single role by ID */
export async function getRoleById(id) {
  const response = await apiClient('get', `/roles/${id}`);
  if (!response.success) {
    throw new Error(response.message || 'Failed to retrieve role details');
  }
  return response.data;
}

/** Create role */
export async function createRole(roleData) {
  const response = await apiClient('post', '/roles/create', {
    data: roleData,
  });

  if (!response.success) {
    throw new Error(response.message || 'Failed to create role');
  }

  return response;
}

/** Update role */
export async function updateRole(id, roleData) {
  const response = await apiClient('put', `/roles/update/${id}`, {
    data: roleData,
  });

  if (!response.success) {
    throw new Error(response.message || 'Failed to update role');
  }

  return response;
}

/** Delete roles */
export async function deleteRoles(ids) {
  const response = await apiClient('delete', '/roles/delete', {
    data: { ids },
  });

  if (!response.success) {
    throw new Error(response.message || 'Failed to delete role(s)');
  }

  return response;
}

/** Get permissions list for a specific role */
export async function getRolePermissionsById(id) {
  const response = await apiClient('get', `/roles/${id}/permissions`);
  if (!response.success) {
    throw new Error(response.message || 'Failed to fetch permissions');
  }
  return response.data;
}

/** Helper for dropdowns */
export async function getRolesDropdown() {
  const response = await apiClient('get', '/roles/dropdown');
  return response;
}
