import { apiClient } from "./apiClient";

/**
 * Maps backend data to frontend format
 * @param {Object} data - Backend lens product data
 * @returns {Object} - Frontend formatted lens product data
 */
export const mapFromBackend = (data) => {
  if (!data) return null;

  return {
    id: data.id,
    productCode: data.product_code,
    lensName: data.lens_name,
    brandId: data.brand_id,
    brandName: data.brand?.name || "",
    categoryId: data.category_id,
    categoryName: data.category?.name || "",
    materialId: data.material_id,
    materialName: data.material?.name || "",
    typeId: data.type_id,
    typeName: data.type?.name || "",
    sphereMin: data.sphere_min,
    sphereMax: data.sphere_max,
    cylinderMin: data.cyl_min,
    cylinderMax: data.cyl_max,
    addMin: data.add_min,
    addMax: data.add_max,
    rangeText: data.range_text || "",
    prices: (data.lensPriceMasters || data.prices || []).map(price => ({
      id: price.id,
      coatingId: price.coating_id,
      coatingName: price.coating?.name || "",
      price: price.price?.toString() || ""
    })),
    activeStatus: data.activeStatus ? "active" : "inactive",
    createdBy: data.createdBy,
    updatedBy: data.updatedBy,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
};

/**
 * Maps frontend data to backend format
 * @param {Object} data - Frontend lens product data
 * @returns {Object} - Backend formatted lens product data
 */
export const mapToBackend = (data) => {
  return {
    product_code: data.productCode,
    lens_name: data.lensName,
    brand_id: data.brandId,
    category_id: data.categoryId,
    material_id: data.materialId,
    type_id: data.typeId,
    sphere_min: data.sphereMin ? parseFloat(data.sphereMin) : null,
    sphere_max: data.sphereMax ? parseFloat(data.sphereMax) : null,
    cyl_min: data.cylinderMin ? parseFloat(data.cylinderMin) : null,
    cyl_max: data.cylinderMax ? parseFloat(data.cylinderMax) : null,
    add_min: data.addMin ? parseFloat(data.addMin) : null,
    add_max: data.addMax ? parseFloat(data.addMax) : null,
    range_text: data.rangeText || "",
    prices: data.prices?.map(price => ({
      coating_id: price.coatingId,
      price: parseFloat(price.price) || 0
    })) || [],
    activeStatus: data.activeStatus === "active" ? true : false,
  };
};

/**
 * Get all lens products with pagination and filters
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} - Response with products and pagination
 */
export const getLensProducts = async (params = {}) => {
  const response = await apiClient("get", "/v1/lens-products", { params });
  return {
    data: response.data?.map(mapFromBackend) || [],
    pagination: response.pagination,
  };
};

/**
 * Get lens product by ID with prices
 * @param {string|number} id - Lens product ID
 * @returns {Promise<Object>} - Lens product data with prices
 */
export const getLensProductById = async (id) => {
  const response = await apiClient("get", `/v1/lens-products/${id}`);
  return mapFromBackend(response.data);
};

/**
 * Create new lens product with prices
 * @param {Object} data - Lens product data with prices
 * @returns {Promise<Object>} - Created lens product
 */
export const createLensProduct = async (data) => {
  const payload = mapToBackend(data);
  const response = await apiClient("post", "/v1/lens-products", { data: payload });
  return mapFromBackend(response.data);
};

/**
 * Update lens product with prices
 * @param {string|number} id - Lens product ID
 * @param {Object} data - Updated lens product data with prices
 * @returns {Promise<Object>} - Updated lens product
 */
export const updateLensProduct = async (id, data) => {
  const payload = mapToBackend(data);
  const response = await apiClient("put", `/v1/lens-products/${id}`, { data: payload });
  return mapFromBackend(response.data);
};

/**
 * Delete lens product (soft delete)
 * @param {string|number} id - Lens product ID
 * @returns {Promise<Object>} - Delete response
 */
export const deleteLensProduct = async (id) => {
  const response = await apiClient("delete", `/v1/lens-products/${id}`);
  return response;
};

/**
 * Get active lens brands for dropdown
 * @returns {Promise<Array>} - List of active brands
 */
export const getBrandDropdown = async () => {
  const response = await apiClient("get", "/v1/lens-brands", { 
    params: { activeStatus: "true", limit: 100 } 
  });
  return response.data?.map(brand => ({
    value: brand.id,
    label: brand.name,
    code: brand.code
  })) || [];
};

/**
 * Get active lens categories for dropdown
 * @returns {Promise<Array>} - List of active categories
 */
export const getCategoryDropdown = async () => {
  const response = await apiClient("get", "/v1/lens-categories", { 
    params: { activeStatus: "true", limit: 100 } 
  });
  return response.data?.map(category => ({
    value: category.id,
    label: category.name,
    code: category.code
  })) || [];
};

/**
 * Get active lens materials for dropdown
 * @returns {Promise<Array>} - List of active materials
 */
export const getMaterialDropdown = async () => {
  const response = await apiClient("get", "/v1/lens-materials", { 
    params: { activeStatus: "true", limit: 100 } 
  });
  return response.data?.map(material => ({
    value: material.id,
    label: material.name,
    code: material.code
  })) || [];
};

/**
 * Get active lens types for dropdown
 * @returns {Promise<Array>} - List of active types
 */
export const getTypeDropdown = async () => {
  const response = await apiClient("get", "/v1/lens-types", { 
    params: { activeStatus: "true", limit: 100 } 
  });
  return response.data?.map(type => ({
    value: type.id,
    label: type.name,
    code: type.code
  })) || [];
};

/**
 * Get active lens coatings for dropdown
 * @returns {Promise<Array>} - List of active coatings
 */
export const getCoatingDropdown = async () => {
  const response = await apiClient("get", "/v1/lens-coatings", { 
    params: { activeStatus: "true", limit: 100 } 
  });
  return response.data?.map(coating => ({
    value: coating.id,
    label: coating.name,
    code: coating.code
  })) || [];
};

/**
 * Check if product code is unique
 * @param {string} productCode - Product code to check
 * @param {string|number} excludeId - ID to exclude from check (for updates)
 * @returns {Promise<boolean>} - True if unique, false otherwise
 */
export const checkProductCodeUnique = async (productCode, excludeId = null) => {
  try {
    const response = await apiClient("get", "/v1/lens-products", { 
      params: { search: productCode, limit: 10 } 
    });
    
    const products = response.data || [];
    const duplicate = products.find(p => 
      p.product_code === productCode && (!excludeId || p.id !== excludeId)
    );
    
    return !duplicate;
  } catch (error) {
    console.error("Error checking product code uniqueness:", error);
    return true; // Allow on error to not block user
  }
};
