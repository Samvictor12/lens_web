import { apiClient } from "./apiClient";

/**
 * Field mapping utilities
 * Maps frontend field names to backend field names
 */
const mapToBackend = (frontendData) => {
  return {
    name: frontendData.name,
    tray_code: frontendData.trayCode || frontendData.tray_code,
    description: frontendData.description || null,
    capacity: frontendData.capacity !== undefined ? frontendData.capacity : null,
    location_id: frontendData.locationId || frontendData.location_id || null,
    activeStatus:
      frontendData.activeStatus !== undefined
        ? frontendData.activeStatus
        : true,
  };
};

const mapFromBackend = (backendData) => {
  return {
    id: backendData.id,
    name: backendData.name,
    trayCode: backendData.tray_code,
    tray_code: backendData.tray_code,
    description: backendData.description || "",
    capacity: backendData.capacity || 0,
    locationId: backendData.location_id,
    location_id: backendData.location_id,
    location: backendData.location ? {
      id: backendData.location.id,
      name: backendData.location.name,
      locationCode: backendData.location.location_code,
    } : null,
    activeStatus:
      backendData.activeStatus !== undefined ? backendData.activeStatus : true,
    createdAt: backendData.createdAt,
    updatedAt: backendData.updatedAt,
  };
};

/**
 * Build query parameters from filters
 */
const buildQueryParams = (page, limit, search, filters, sortBy, sortOrder) => {
  const params = {
    page,
    limit,
    sortBy,
    sortOrder,
  };

  if (search && search.trim()) {
    params.search = search.trim();
  }

  if (filters) {
    if (
      filters.activeStatus !== "all" &&
      filters.activeStatus !== undefined
    ) {
      params.activeStatus = filters.activeStatus;
    }
    if (filters.location_id) {
      params.location_id = filters.location_id;
    }
  }

  return params;
};

/**
 * Get paginated list of trays
 */
export async function getTrays(
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

  const response = await apiClient("get", "/v1/tray-master", {
    params,
  });

  return {
    success: response.success,
    data: response.data.map(mapFromBackend),
    pagination: response.pagination,
  };
}

/**
 * Get tray by ID
 */
export async function getTrayById(id) {
  const response = await apiClient("get", `/v1/tray-master/${id}`);

  return {
    success: response.success,
    data: mapFromBackend(response.data),
  };
}

/**
 * Create new tray
 */
export async function createTray(trayData) {
  const backendData = mapToBackend(trayData);
  const response = await apiClient("post", "/v1/tray-master", {
    data: backendData,
  });

  return {
    success: response.success,
    data: mapFromBackend(response.data),
    message: response.message,
  };
}

/**
 * Update tray
 */
export async function updateTray(id, trayData) {
  const backendData = mapToBackend(trayData);
  const response = await apiClient("put", `/v1/tray-master/${id}`, {
    data: backendData,
  });

  return {
    success: response.success,
    data: mapFromBackend(response.data),
    message: response.message,
  };
}

/**
 * Delete tray (soft delete)
 */
export async function deleteTray(id) {
  const response = await apiClient("delete", `/v1/tray-master/${id}`);

  return {
    success: response.success,
    message: response.message,
  };
}

/**
 * Get trays dropdown list
 */
export async function getTrayDropdown(location_id = null) {
  const params = location_id ? { location_id } : {};
  const response = await apiClient("get", "/v1/tray-master/dropdown", { params });

  return {
    success: response.success,
    data: response.data,
  };
}
