import { apiClient } from './apiClient';

// ─── Master ────────────────────────────────────────────────────────────────

export async function getCheckSheets(page = 1, limit = 10, search = '', filters = {}, sortBy = 'createdAt', sortOrder = 'desc') {
  const params = { page, limit, sortBy, sortOrder };
  if (search?.trim()) params.search = search.trim();
  if (filters.activeStatus && filters.activeStatus !== 'all') params.activeStatus = filters.activeStatus;

  const res = await apiClient('get', '/check-sheets', { params });
  return {
    success: res.success,
    data: (res.data || []).map(mapFromBackend),
    pagination: res.pagination,
  };
}

export async function getCheckSheetById(id) {
  const res = await apiClient('get', `/check-sheets/${id}`);
  return { success: res.success, data: mapFromBackend(res.data) };
}

export async function createCheckSheet(data) {
  const res = await apiClient('post', '/check-sheets', { data: mapToBackend(data) });
  return { success: res.success, data: mapFromBackend(res.data) };
}

export async function updateCheckSheet(id, data) {
  const res = await apiClient('put', `/check-sheets/${id}`, { data: mapToBackend(data) });
  return { success: res.success, data: mapFromBackend(res.data) };
}

export async function deleteCheckSheet(id) {
  return apiClient('delete', `/check-sheets/${id}`);
}

// ─── Items ─────────────────────────────────────────────────────────────────

export async function saveCheckSheetItems(masterId, items) {
  const res = await apiClient('post', `/check-sheets/${masterId}/items`, { data: { items } });
  return { success: res.success, data: res.data };
}

export async function deleteCheckSheetItem(itemId) {
  return apiClient('delete', `/check-sheets/items/${itemId}`);
}

// ─── Mapping ───────────────────────────────────────────────────────────────

function mapToBackend(d) {
  return {
    name:        d.name,
    check_key:   d.check_key,
    description: d.description || null,
    activeStatus: d.activeStatus ?? true,
  };
}

function mapFromBackend(d) {
  if (!d) return d;
  return {
    id:           d.id,
    name:         d.name,
    check_key:    d.check_key,
    description:  d.description || '',
    activeStatus: d.activeStatus ?? true,
    itemCount:    d._count?.items ?? (d.items?.length ?? 0),
    items:        (d.items || []).map((item) => ({
      id:          item.id,
      item_name:   item.item_name,
      sequence:    item.sequence,
      activeStatus: item.activeStatus ?? true,
    })),
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}
