/**
 * Lens Type Service
 * Handles API calls for lens type management with data mapping
 */

import { apiClient } from "./apiClient";

/**
 * Map frontend data to backend format
 */
const mapToBackend = (frontendData) => {
  return {
    name: frontendData.name,
    description: frontendData.description || null,
    activeStatus: frontendData.activeStatus ?? true,
  };
};

/**
 * Map backend data to frontend format
 */
const mapFromBackend = (backendData) => {
  if (!backendData) return null;

  return {
    id: backendData.id,
    name: backendData.name || "",
    description: backendData.description || "",
    activeStatus: backendData.activeStatus ?? true,
    productCount: backendData._count?.lensProductMasters || 0,
    createdAt: backendData.createdAt,
    updatedAt: backendData.updatedAt,
    createdBy: backendData.createdBy,
    updatedBy: backendData.updatedBy,
    Usercreated: backendData.Usercreated,
    Userupdated: backendData.Userupdated,
  };
};

/**
 * Get paginated list of lens types with filtering
 */
export const getLensTypes = async (params = {}) => {
  try {
    const response = await apiClient("get", "/v1/lens-types", { params });

    return {
      success: response.success,
      data: (response.data || []).map(mapFromBackend),
      pagination: response.pagination || {
        page: 1,
        limit: 10,
        total: 0,
        pages: 0,
      },
    };
  } catch (error) {
    console.error("Error fetching lens types:", error);
    throw error;
  }
};

/**
 * Get single lens type by ID
 */
export const getLensTypeById = async (id) => {
  try {
    const response = await apiClient("get", `/v1/lens-types/${id}`);
    return mapFromBackend(response.data);
  } catch (error) {
    console.error("Error fetching lens type:", error);
    throw error;
  }
};

/**
 * Create new lens type
 */
export const createLensType = async (typeData) => {
  try {
    const backendData = mapToBackend(typeData);
    const response = await apiClient("post", "/v1/lens-types", {
      data: backendData,
    });
    return mapFromBackend(response.data);
  } catch (error) {
    console.error("Error creating lens type:", error);
    throw error;
  }
};

/**
 * Update existing lens type
 */
export const updateLensType = async (id, typeData) => {
  try {
    const backendData = mapToBackend(typeData);
    const response = await apiClient("put", `/v1/lens-types/${id}`, {
      data: backendData,
    });
    return mapFromBackend(response.data);
  } catch (error) {
    console.error("Error updating lens type:", error);
    throw error;
  }
};

/**
 * Delete lens type (soft delete)
 */
export const deleteLensType = async (id) => {
  try {
    const response = await apiClient("delete", `/v1/lens-types/${id}`);
    return response;
  } catch (error) {
    console.error("Error deleting lens type:", error);
    throw error;
  }
};

/**
 * Get lens types for dropdown
 */
export const getLensTypeDropdown = async () => {
  try {
    const response = await apiClient("get", "/v1/lens-types/dropdown");
    return response.data || [];
  } catch (error) {
    console.error("Error fetching lens type dropdown:", error);
    throw error;
  }
};

/**
 * Get lens type statistics
 */
export const getLensTypeStatistics = async () => {
  try {
    const response = await apiClient("get", "/v1/lens-types/statistics");
    return response.data || {};
  } catch (error) {
    console.error("Error fetching lens type statistics:", error);
    throw error;
  }
};
