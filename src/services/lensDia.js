import { apiClient } from "./apiClient";

const mapToBackend = (frontendData) => ({
  name: parseInt(frontendData.name, 10),
  description: frontendData.description || null,
  activeStatus:
    frontendData.activeStatus !== undefined ? frontendData.activeStatus : true,
});

const mapFromBackend = (backendData) => ({
  id: backendData.id,
  name: backendData.name,
  short_name: backendData.short_name,
  description: backendData.description || "",
  activeStatus:
    backendData.activeStatus !== undefined ? backendData.activeStatus : true,
  createdAt: backendData.createdAt,
  updatedAt: backendData.updatedAt,
});

const buildQueryParams = (page, limit, search, filters, sortBy, sortOrder) => {
  const params = { page, limit, sortBy, sortOrder };

  if (search && search.trim()) {
    params.search = search.trim();
  }

  if (filters) {
    if (filters.activeStatus !== "all" && filters.activeStatus !== undefined) {
      params.activeStatus = filters.activeStatus;
    }
  }

  return params;
};

export async function getLensDias(
  page = 1,
  limit = 10,
  search = "",
  filters = {},
  sortBy = "createdAt",
  sortOrder = "desc"
) {
  const params = buildQueryParams(page, limit, search, filters, sortBy, sortOrder);
  const response = await apiClient("get", "/lens-dias", { params });

  return {
    success: response.success,
    data: response.data.map(mapFromBackend),
    pagination: response.pagination,
  };
}

export async function getLensDiaById(id) {
  const response = await apiClient("get", `/lens-dias/${id}`);

  return {
    success: response.success,
    data: mapFromBackend(response.data),
  };
}

export async function createLensDia(diaData) {
  const response = await apiClient("post", "/lens-dias", {
    data: mapToBackend(diaData),
  });

  return {
    success: response.success,
    data: mapFromBackend(response.data),
    message: response.message,
  };
}

export async function updateLensDia(id, diaData) {
  const response = await apiClient("put", `/lens-dias/${id}`, {
    data: mapToBackend(diaData),
  });

  return {
    success: response.success,
    data: mapFromBackend(response.data),
    message: response.message,
  };
}

export async function deleteLensDia(id) {
  const response = await apiClient("delete", `/lens-dias/${id}`);

  return {
    success: response.success,
    message: response.message,
  };
}

export async function getLensDiaDropdown() {
  const response = await apiClient("get", "/lens-dias/dropdown");

  return {
    success: response.success,
    data: response.data,
  };
}
