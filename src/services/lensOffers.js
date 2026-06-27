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
  discountValue:
    (data.offerType === "VALUE" || data.offerType === "COATING_PROMOTION") &&
    data.discountValue !== "" &&
    data.coatingPromotionDiscountType !== "PERCENTAGE"
      ? parseFloat(data.discountValue)
      : null,
  discountPercentage:
    (data.offerType === "PERCENTAGE" ||
      (data.offerType === "COATING_PROMOTION" &&
        data.coatingPromotionDiscountType === "PERCENTAGE")) &&
    data.discountPercentage !== ""
      ? parseFloat(data.discountPercentage)
      : null,
  offerPrice: null,
  lens_id: data.lens_id ? parseInt(data.lens_id) : null,
  coating_id: data.coating_id ? parseInt(data.coating_id) : null,
  brand_id:
    data.offerType === "EXCHANGE_BRAND_PRICE" && data.brand_id
      ? parseInt(data.brand_id)
      : data.brand_id
        ? parseInt(data.brand_id)
        : null,
  exchange_brand_id:
    data.offerType === "EXCHANGE_BRAND_PRICE" && data.exchange_brand_id
      ? parseInt(data.exchange_brand_id)
      : null,
  coating_ids:
    data.offerType === "COATING_PROMOTION" && Array.isArray(data.coating_ids)
      ? data.coating_ids.map((id) => parseInt(id))
      : null,
  exchange_coating_id:
    data.offerType === "EXCHANGE_COATING_PRICE" && data.exchange_coating_id
      ? parseInt(data.exchange_coating_id)
      : null,
  exchange_lens_id:
    (data.offerType === "EXCHANGE_COATING_PRICE" || data.offerType === "EXCHANGE_PRODUCT") && data.exchange_lens_id
      ? parseInt(data.exchange_lens_id)
      : null,
  withDiscount:
    data.offerType === "EXCHANGE_COATING_PRICE" ? (data.withDiscount ?? false) : false,
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
    brand_id: data.brand_id ?? null,
    exchange_brand_id: data.exchange_brand_id ?? null,
    coating_ids: Array.isArray(data.coating_ids) ? data.coating_ids : [],
    coatingPromotionDiscountType:
      data.offerType === "COATING_PROMOTION" && data.discountPercentage
        ? "PERCENTAGE"
        : data.offerType === "COATING_PROMOTION" && data.discountValue
          ? "VALUE"
          : "VALUE",
    exchange_coating_id: data.exchange_coating_id ?? null,
    exchange_lens_id: data.exchange_lens_id ?? null,
    withDiscount: data.withDiscount ?? false,
    startDate: data.startDate ? data.startDate.split("T")[0] : "",
    endDate: data.endDate ? data.endDate.split("T")[0] : "",
    activeStatus: data.activeStatus ?? true,
    lensProduct: data.lensProduct || null,
    exchangeLensProduct: data.exchangeLensProduct || null,
    coating: data.coating || null,
    exchangeCoating: data.exchangeCoating || null,
    brand: data.brand || null,
    exchangeBrand: data.exchangeBrand || null,
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
export const getApplicableOffers = async (lens_id, coating_id, brand_id) => {
  const response = await apiClient("get", "/v1/lens-offers/applicable", {
    params: { lens_id, coating_id, brand_id },
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
