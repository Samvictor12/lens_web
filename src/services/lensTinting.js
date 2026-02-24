/**
 * Lens Tinting Service
 * Handles API calls for lens tinting management with data mapping
 */

import { apiClient } from "./apiClient";

/**
 * Map frontend data to backend format
 */
const mapToBackend = (frontendData) => {
  return {
    name: frontendData.name,
    short_name: frontendData.short_name,
    description: frontendData.description || null,
    tinting_price: frontendData.tinting_price !== "" && frontendData.tinting_price !== null 
      ? parseFloat(frontendData.tinting_price) 
      : null,
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
    short_name: backendData.short_name || "",
    description: backendData.description || "",
    tinting_price: backendData.tinting_price !== null && backendData.tinting_price !== undefined
      ? backendData.tinting_price
      : null,
    activeStatus: backendData.activeStatus ?? true,
    orderCount: backendData._count?.saleOrders || 0,
    createdAt: backendData.createdAt,
    updatedAt: backendData.updatedAt,
    createdBy: backendData.createdBy,
    updatedBy: backendData.updatedBy,
    Usercreated: backendData.Usercreated,
    Userupdated: backendData.Userupdated,
  };
};

/**
 * Get paginated list of lens tintings with filtering
 */
export const getLensTintings = async (params = {}) => {
  try {
    const response = await apiClient("get", "/v1/lens-tintings", { params });

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
    console.error("Error fetching lens tintings:", error);
    throw error;
  }
};

/**
 * Get single lens tinting by ID
 */
export const getLensTintingById = async (id) => {
  try {
    const response = await apiClient("get", `/v1/lens-tintings/${id}`);
    return mapFromBackend(response.data);
  } catch (error) {
    console.error("Error fetching lens tinting:", error);
    throw error;
  }
};

/**
 * Create new lens tinting
 */
export const createLensTinting = async (tintingData) => {
  try {
    const backendData = mapToBackend(tintingData);
    const response = await apiClient("post", "/v1/lens-tintings", {
      data: backendData,
    });
    return mapFromBackend(response.data);
  } catch (error) {
    console.error("Error creating lens tinting:", error);
    throw error;
  }
};

/**
 * Update existing lens tinting
 */
export const updateLensTinting = async (id, tintingData) => {
  try {
    const backendData = mapToBackend(tintingData);
    const response = await apiClient("put", `/v1/lens-tintings/${id}`, {
      data: backendData,
    });
    return mapFromBackend(response.data);
  } catch (error) {
    console.error("Error updating lens tinting:", error);
    throw error;
  }
};

/**
 * Delete lens tinting (soft delete)
 */
export const deleteLensTinting = async (id) => {
  try {
    const response = await apiClient("delete", `/v1/lens-tintings/${id}`);
    return response;
  } catch (error) {
    console.error("Error deleting lens tinting:", error);
    throw error;
  }
};

/**
 * Get lens tintings for dropdown
 */
export const getLensTintingDropdown = async () => {
  try {
    const response = await apiClient("get", "/v1/lens-tintings/dropdown");
    return response.data || [];
  } catch (error) {
    console.error("Error fetching lens tinting dropdown:", error);
    throw error;
  }
};

/**
 * Get lens tinting statistics
 */
export const getLensTintingStatistics = async () => {
  try {
    const response = await apiClient("get", "/v1/lens-tintings/statistics");
    return response.data || {};
  } catch (error) {
    console.error("Error fetching lens tinting statistics:", error);
    throw error;
  }
};
