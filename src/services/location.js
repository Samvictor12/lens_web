import { apiClient } from "./apiClient";

/**
 * Field mapping utilities
 * Maps frontend field names to backend field names
 */
const mapToBackend = (frontendData) => {
  return {
    name: frontendData.name,
    location_code: frontendData.locationCode || frontendData.location_code,
    description: frontendData.description || null,
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
    locationCode: backendData.location_code,
    location_code: backendData.location_code,
    description: backendData.description || "",
    activeStatus:
      backendData.activeStatus !== undefined ? backendData.activeStatus : true,
    trayCount: backendData._count?.trays || 0,
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
  }

  return params;
};

/**
 * Get paginated list of locations
 */
export async function getLocations(
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

  const response = await apiClient("get", "/v1/location-master", {
    params,
  });

  return {
    success: response.success,
    data: response.data.map(mapFromBackend),
    pagination: response.pagination,
  };
}

/**
 * Get location by ID
 */
export async function getLocationById(id) {
  const response = await apiClient("get", `/v1/location-master/${id}`);

  return {
    success: response.success,
    data: mapFromBackend(response.data),
  };
}

/**
 * Create new location
 */
export async function createLocation(locationData) {
  const backendData = mapToBackend(locationData);
  const response = await apiClient("post", "/v1/location-master", {
    data: backendData,
  });

  return {
    success: response.success,
    data: mapFromBackend(response.data),
    message: response.message,
  };
}

/**
 * Update location
 */
export async function updateLocation(id, locationData) {
  const backendData = mapToBackend(locationData);
  const response = await apiClient("put", `/v1/location-master/${id}`, {
    data: backendData,
  });

  return {
    success: response.success,
    data: mapFromBackend(response.data),
    message: response.message,
  };
}

/**
 * Delete location (soft delete)
 */
export async function deleteLocation(id) {
  const response = await apiClient("delete", `/v1/location-master/${id}`);

  return {
    success: response.success,
    message: response.message,
  };
}

/**
 * Get locations dropdown list
 */
export async function getLocationDropdown() {
  const response = await apiClient("get", "/v1/location-master/dropdown");

  return {
    success: response.success,
    data: response.data,
  };
}
