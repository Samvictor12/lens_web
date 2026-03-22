/**
 * Lens Offers Service
 * Handles API calls for lens offer management
 */

import { apiClient } from "./apiClient";

/**
 * Map frontend data to backend format
 */
const mapToBackend = (data) => ({
  offerName: data.offerName,
  description: data.description || null,
  offerType: data.offerType,
  discountValue: data.offerType === "VALUE" && data.discountValue !== ""
    ? parseFloat(data.discountValue)
    : null,
  discountPercentage: data.offerType === "PERCENTAGE" && data.discountPercentage !== ""
    ? parseFloat(data.discountPercentage)
    : null,
  offerPrice: data.offerType === "EXCHANGE_PRODUCT" && data.offerPrice !== ""
    ? parseFloat(data.offerPrice)
    : null,
  lens_id: data.lens_id ? parseInt(data.lens_id) : null,
  coating_id: data.coating_id ? parseInt(data.coating_id) : null,
  startDate: data.startDate,
  endDate: data.endDate,
  activeStatus: data.activeStatus ?? true,
});

/**
 * Map backend data to frontend format
 */
const mapFromBackend = (data) => {
  if (!data) return null;
  return {
    id: data.id,
    offerName: data.offerName || "",
    description: data.description || "",
    offerType: data.offerType || "VALUE",
    discountValue: data.discountValue ?? "",
    discountPercentage: data.discountPercentage ?? "",
    offerPrice: data.offerPrice ?? "",
    lens_id: data.lens_id ?? null,
    coating_id: data.coating_id ?? null,
    startDate: data.startDate ? data.startDate.split("T")[0] : "",
    endDate: data.endDate ? data.endDate.split("T")[0] : "",
    activeStatus: data.activeStatus ?? true,
    lensProduct: data.lensProduct || null,
    coating: data.coating || null,
    orderCount: data._count?.saleOrders || 0,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    createdByUser: data.createdByUser,
    updatedByUser: data.updatedByUser,
  };
};

/**
 * Get paginated list of lens offers
 */
export const getLensOffers = async (params = {}) => {
  const response = await apiClient("get", "/v1/lens-offers", { params });
  return {
    success: response.success,
    data: (response.data || []).map(mapFromBackend),
    pagination: response.pagination || { page: 1, limit: 10, total: 0, pages: 0 },
  };
};

/**
 * Get single lens offer by ID
 */
export const getLensOfferById = async (id) => {
  const response = await apiClient("get", `/v1/lens-offers/${id}`);
  return mapFromBackend(response.data);
};

/**
 * Create new lens offer
 */
export const createLensOffer = async (offerData) => {
  const response = await apiClient("post", "/v1/lens-offers", {
    data: mapToBackend(offerData),
  });
  return mapFromBackend(response.data);
};

/**
 * Update existing lens offer
 */
export const updateLensOffer = async (id, offerData) => {
  const response = await apiClient("put", `/v1/lens-offers/${id}`, {
    data: mapToBackend(offerData),
  });
  return mapFromBackend(response.data);
};

/**
 * Delete lens offer
 */
export const deleteLensOffer = async (id) => {
  const response = await apiClient("delete", `/v1/lens-offers/${id}`);
  return response;
};

/**
 * Get currently active offers (within date range)
 */
export const getActiveOffers = async () => {
  const response = await apiClient("get", "/v1/lens-offers/active/list");
  return (response.data || []).map(mapFromBackend);
};

/**
 * Get applicable offers based on lens and coating
 */
export const getApplicableOffers = async (lens_id, coating_id) => {
  const response = await apiClient("get", "/v1/lens-offers/applicable", {
    params: { lens_id, coating_id },
  });
  return (response.data || []).map(mapFromBackend);
};

/**
 * Get offers dropdown
 */
export const getLensOffersDropdown = async () => {
  const response = await apiClient("get", "/v1/lens-offers/dropdown");
  return response.data || [];
};

/**
 * Get offer statistics
 */
export const getLensOfferStats = async () => {
  const response = await apiClient("get", "/v1/lens-offers/stats");
  return response.data;
};
