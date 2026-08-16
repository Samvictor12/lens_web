import { apiClient } from "./apiClient";

const mapToBackend = (frontendData) => ({
  name: frontendData.name,
  description: frontendData.description || null,
  activeStatus:
    frontendData.activeStatus !== undefined ? frontendData.activeStatus : true,
});

const mapFromBackend = (backendData) => ({
  id: backendData.id,
  name: backendData.name,
  description: backendData.description || "",
  locationId: backendData.location_id,
  location_id: backendData.location_id,
  location: backendData.location
    ? { id: backendData.location.id, name: backendData.location.name }
    : null,
  activeStatus:
    backendData.activeStatus !== undefined ? backendData.activeStatus : true,
  createdAt: backendData.createdAt,
  updatedAt: backendData.updatedAt,
});

const buildQueryParams = (page, limit, search, filters, sortBy, sortOrder) => {
  const params = { page, limit, sortBy, sortOrder };
  if (search && search.trim()) params.search = search.trim();
  if (filters) {
    if (filters.activeStatus !== "all" && filters.activeStatus !== undefined) {
      params.activeStatus = filters.activeStatus;
    }
    if (filters.location_id) params.location_id = filters.location_id;
  }
  return params;
};

export async function getLocationTrays(
  page = 1,
  limit = 10,
  search = "",
  filters = {},
  sortBy = "createdAt",
  sortOrder = "desc"
) {
  const params = buildQueryParams(page, limit, search, filters, sortBy, sortOrder);
  const response = await apiClient("get", "/v1/location-tray-master", { params });
  return {
    success: response.success,
    data: (response.data || []).map(mapFromBackend),
    pagination: response.pagination,
  };
}

export async function getLocationTrayById(id) {
  const response = await apiClient("get", `/v1/location-tray-master/${id}`);
  return { success: response.success, data: mapFromBackend(response.data) };
}

export async function createLocationTray(data) {
  const response = await apiClient("post", "/v1/location-tray-master", {
    data: mapToBackend(data),
  });
  return {
    success: response.success,
    data: mapFromBackend(response.data),
    message: response.message,
  };
}

export async function updateLocationTray(id, data) {
  const response = await apiClient("put", `/v1/location-tray-master/${id}`, {
    data: mapToBackend(data),
  });
  return {
    success: response.success,
    data: mapFromBackend(response.data),
    message: response.message,
  };
}

export async function deleteLocationTray(id) {
  const response = await apiClient("delete", `/v1/location-tray-master/${id}`);
  return { success: response.success, message: response.message };
}

export async function getLocationTrayDropdown(location_id = null) {
  const params = location_id ? { location_id } : {};
  const response = await apiClient("get", "/v1/location-tray-master/dropdown", {
    params,
  });
  return { success: response.success, data: response.data };
}
