import { apiClient } from "./apiClient";

const mapToBackend = (frontendData) => ({
  index_name: frontendData.indexName,
  description: frontendData.description || null,
  activeStatus:
    frontendData.activeStatus !== undefined ? frontendData.activeStatus : true,
});

const mapFromBackend = (backendData) => ({
  id: backendData.id,
  indexName: backendData.index_name,
  description: backendData.description || "",
  activeStatus:
    backendData.activeStatus !== undefined ? backendData.activeStatus : true,
  productCount: backendData._count?.products || 0,
  createdAt: backendData.createdAt,
  updatedAt: backendData.updatedAt,
});

const buildQueryParams = (page, limit, search, filters, sortBy, sortOrder) => {
  const params = { page, limit, sortBy, sortOrder };

  if (search && search.trim()) {
    params.search = search.trim();
  }

  if (filters?.activeStatus !== "all" && filters?.activeStatus !== undefined) {
    params.activeStatus = filters.activeStatus;
  }

  return params;
};

export async function getLensIndexes(
  page = 1,
  limit = 10,
  search = "",
  filters = {},
  sortBy = "createdAt",
  sortOrder = "desc"
) {
  const params = buildQueryParams(page, limit, search, filters, sortBy, sortOrder);
  const response = await apiClient("get", "/v1/lens-indexes", { params });

  return {
    success: response.success,
    data: response.data.map(mapFromBackend),
    pagination: response.pagination,
  };
}

export async function getLensIndexById(id) {
  const response = await apiClient("get", `/v1/lens-indexes/${id}`);
  return {
    success: response.success,
    data: mapFromBackend(response.data),
  };
}

export async function createLensIndex(indexData) {
  const backendData = mapToBackend(indexData);
  const response = await apiClient("post", "/v1/lens-indexes", {
    data: backendData,
  });

  return {
    success: response.success,
    data: mapFromBackend(response.data),
    message: response.message,
  };
}

export async function updateLensIndex(id, indexData) {
  const backendData = mapToBackend(indexData);
  const response = await apiClient("put", `/v1/lens-indexes/${id}`, {
    data: backendData,
  });

  return {
    success: response.success,
    data: mapFromBackend(response.data),
    message: response.message,
  };
}

export async function deleteLensIndex(id) {
  const response = await apiClient("delete", `/v1/lens-indexes/${id}`);
  return {
    success: response.success,
    message: response.message,
  };
}

export async function getLensIndexDropdown() {
  const response = await apiClient("get", "/v1/lens-indexes/dropdown");
  return {
    success: response.success,
    data: response.data,
  };
}

export async function getLensIndexStatistics() {
  const response = await apiClient("get", "/v1/lens-indexes/statistics");
  return {
    success: response.success,
    data: response.data,
  };
}
