/**
 * Lens Masters DTO Validation Functions
 * Validation for all Lens Master API operations
 */

const isValidLength = (str, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  if (!str && min > 0) return false;
  if (!str) return true;
  return str.length >= min && str.length <= max;
};

const isValidNumber = (num) => {
  return typeof num === 'number' && !isNaN(num);
};

/**
 * Validate Lens Category Create
 */
export const validateCreateLensCategory = (data) => {
  const errors = [];

  if (!data.name || data.name.trim() === '') {
    errors.push({ field: 'name', message: 'Category name is required' });
  } else if (!isValidLength(data.name, 1, 200)) {
    errors.push({ field: 'name', message: 'Category name must be between 1 and 200 characters' });
  }

  if (data.description && !isValidLength(data.description, 0, 500)) {
    errors.push({ field: 'description', message: 'Description must not exceed 500 characters' });
  }

  if (!data.createdBy || !isValidNumber(data.createdBy)) {
    errors.push({ field: 'createdBy', message: 'Created by user ID is required' });
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? data : null
  };
};

/**
 * Validate Lens Category Update
 */
export const validateUpdateLensCategory = (data) => {
  const errors = [];

  if (data.name && !isValidLength(data.name, 1, 200)) {
    errors.push({ field: 'name', message: 'Category name must be between 1 and 200 characters' });
  }

  if (data.description && !isValidLength(data.description, 0, 500)) {
    errors.push({ field: 'description', message: 'Description must not exceed 500 characters' });
  }

  if (!data.updatedBy || !isValidNumber(data.updatedBy)) {
    errors.push({ field: 'updatedBy', message: 'Updated by user ID is required' });
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? data : null
  };
};

/**
 * Validate Lens Material Create
 */
export const validateCreateLensMaterial = (data) => {
  const errors = [];

  if (!data.name || data.name.trim() === '') {
    errors.push({ field: 'name', message: 'Material name is required' });
  } else if (!isValidLength(data.name, 1, 200)) {
    errors.push({ field: 'name', message: 'Material name must be between 1 and 200 characters' });
  }

  if (data.description && !isValidLength(data.description, 0, 500)) {
    errors.push({ field: 'description', message: 'Description must not exceed 500 characters' });
  }

  if (!data.createdBy || !isValidNumber(data.createdBy)) {
    errors.push({ field: 'createdBy', message: 'Created by user ID is required' });
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? data : null
  };
};

/**
 * Validate Lens Material Update
 */
export const validateUpdateLensMaterial = (data) => {
  const errors = [];

  if (data.name && !isValidLength(data.name, 1, 200)) {
    errors.push({ field: 'name', message: 'Material name must be between 1 and 200 characters' });
  }

  if (data.description && !isValidLength(data.description, 0, 500)) {
    errors.push({ field: 'description', message: 'Description must not exceed 500 characters' });
  }

  if (!data.updatedBy || !isValidNumber(data.updatedBy)) {
    errors.push({ field: 'updatedBy', message: 'Updated by user ID is required' });
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? data : null
  };
};

/**
 * Validate Lens Coating Create
 */
export const validateCreateLensCoating = (data) => {
  const errors = [];

  if (!data.name || data.name.trim() === '') {
    errors.push({ field: 'name', message: 'Coating name is required' });
  } else if (!isValidLength(data.name, 1, 200)) {
    errors.push({ field: 'name', message: 'Coating name must be between 1 and 200 characters' });
  }

  if (!data.short_name || data.short_name.trim() === '') {
    errors.push({ field: 'short_name', message: 'Short name is required' });
  } else if (!isValidLength(data.short_name, 1, 50)) {
    errors.push({ field: 'short_name', message: 'Short name must be between 1 and 50 characters' });
  }

  if (data.description && !isValidLength(data.description, 0, 500)) {
    errors.push({ field: 'description', message: 'Description must not exceed 500 characters' });
  }

  if (!data.createdBy || !isValidNumber(data.createdBy)) {
    errors.push({ field: 'createdBy', message: 'Created by user ID is required' });
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? data : null
  };
};

/**
 * Validate Lens Coating Update
 */
export const validateUpdateLensCoating = (data) => {
  const errors = [];

  if (data.name && !isValidLength(data.name, 1, 200)) {
    errors.push({ field: 'name', message: 'Coating name must be between 1 and 200 characters' });
  }

  if (data.short_name && !isValidLength(data.short_name, 1, 50)) {
    errors.push({ field: 'short_name', message: 'Short name must be between 1 and 50 characters' });
  }

  if (data.description && !isValidLength(data.description, 0, 500)) {
    errors.push({ field: 'description', message: 'Description must not exceed 500 characters' });
  }

  if (!data.updatedBy || !isValidNumber(data.updatedBy)) {
    errors.push({ field: 'updatedBy', message: 'Updated by user ID is required' });
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? data : null
  };
};

/**
 * Validate Lens Brand Create/Update - Same as Category
 */
export const validateCreateLensBrand = validateCreateLensCategory;
export const validateUpdateLensBrand = validateUpdateLensCategory;

/**
 * Validate Lens Type Create/Update - Same as Category
 */
export const validateCreateLensType = validateCreateLensCategory;
export const validateUpdateLensType = validateUpdateLensCategory;

/**
 * Validate Lens Tinting Create - Same as Coating (has short_name)
 */
export const validateCreateLensTinting = validateCreateLensCoating;
export const validateUpdateLensTinting = validateUpdateLensCoating;

/**
 * Validate Lens Product Create
 */
export const validateCreateLensProduct = (data) => {
  const errors = [];

  if (!data.brand_id || !isValidNumber(data.brand_id)) {
    errors.push({ field: 'brand_id', message: 'Brand ID is required' });
  }

  if (!data.category_id || !isValidNumber(data.category_id)) {
    errors.push({ field: 'category_id', message: 'Category ID is required' });
  }

  if (!data.material_id || !isValidNumber(data.material_id)) {
    errors.push({ field: 'material_id', message: 'Material ID is required' });
  }

  if (!data.type_id || !isValidNumber(data.type_id)) {
    errors.push({ field: 'type_id', message: 'Type ID is required' });
  }

  if (!data.product_code || data.product_code.trim() === '') {
    errors.push({ field: 'product_code', message: 'Product code is required' });
  } else if (!isValidLength(data.product_code, 1, 100)) {
    errors.push({ field: 'product_code', message: 'Product code must be between 1 and 100 characters' });
  }

  if (!data.lens_name || data.lens_name.trim() === '') {
    errors.push({ field: 'lens_name', message: 'Lens name is required' });
  } else if (!isValidLength(data.lens_name, 1, 200)) {
    errors.push({ field: 'lens_name', message: 'Lens name must be between 1 and 200 characters' });
  }

  if (data.range_text && !isValidLength(data.range_text, 0, 500)) {
    errors.push({ field: 'range_text', message: 'Range text must not exceed 500 characters' });
  }

  if (!data.createdBy || !isValidNumber(data.createdBy)) {
    errors.push({ field: 'createdBy', message: 'Created by user ID is required' });
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? data : null
  };
};

/**
 * Validate Lens Product Update
 */
export const validateUpdateLensProduct = (data) => {
  const errors = [];

  if (data.brand_id !== undefined && !isValidNumber(data.brand_id)) {
    errors.push({ field: 'brand_id', message: 'Brand ID must be a valid number' });
  }

  if (data.category_id !== undefined && !isValidNumber(data.category_id)) {
    errors.push({ field: 'category_id', message: 'Category ID must be a valid number' });
  }

  if (data.material_id !== undefined && !isValidNumber(data.material_id)) {
    errors.push({ field: 'material_id', message: 'Material ID must be a valid number' });
  }

  if (data.type_id !== undefined && !isValidNumber(data.type_id)) {
    errors.push({ field: 'type_id', message: 'Type ID must be a valid number' });
  }

  if (data.product_code && !isValidLength(data.product_code, 1, 100)) {
    errors.push({ field: 'product_code', message: 'Product code must be between 1 and 100 characters' });
  }

  if (data.lens_name && !isValidLength(data.lens_name, 1, 200)) {
    errors.push({ field: 'lens_name', message: 'Lens name must be between 1 and 200 characters' });
  }

  if (!data.updatedBy || !isValidNumber(data.updatedBy)) {
    errors.push({ field: 'updatedBy', message: 'Updated by user ID is required' });
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? data : null
  };
};

/**
 * Validate Lens Price Create
 */
export const validateCreateLensPrice = (data) => {
  const errors = [];

  if (!data.lens_id || !isValidNumber(data.lens_id)) {
    errors.push({ field: 'lens_id', message: 'Lens ID is required' });
  }

  if (!data.coating_id || !isValidNumber(data.coating_id)) {
    errors.push({ field: 'coating_id', message: 'Coating ID is required' });
  }

  if (!data.price && data.price !== 0) {
    errors.push({ field: 'price', message: 'Price is required' });
  } else if (!isValidNumber(data.price) || data.price < 0) {
    errors.push({ field: 'price', message: 'Price must be a positive number' });
  }

  if (!data.createdBy || !isValidNumber(data.createdBy)) {
    errors.push({ field: 'createdBy', message: 'Created by user ID is required' });
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? data : null
  };
};

/**
 * Validate Lens Price Update
 */
export const validateUpdateLensPrice = (data) => {
  const errors = [];

  if (data.lens_id !== undefined && !isValidNumber(data.lens_id)) {
    errors.push({ field: 'lens_id', message: 'Lens ID must be a valid number' });
  }

  if (data.coating_id !== undefined && !isValidNumber(data.coating_id)) {
    errors.push({ field: 'coating_id', message: 'Coating ID must be a valid number' });
  }

  if (data.price !== undefined && (!isValidNumber(data.price) || data.price < 0)) {
    errors.push({ field: 'price', message: 'Price must be a positive number' });
  }

  if (!data.updatedBy || !isValidNumber(data.updatedBy)) {
    errors.push({ field: 'updatedBy', message: 'Updated by user ID is required' });
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? data : null
  };
};

/**
 * Validate ID parameter
 */
export const validateIdParam = (id) => {
  const errors = [];
  const numId = parseInt(id);

  if (isNaN(numId) || numId <= 0) {
    errors.push({ field: 'id', message: 'Invalid ID parameter' });
  }

  return {
    isValid: errors.length === 0,
    errors,
    id: numId
  };
};

/**
 * Validate query parameters
 */
export const validateQueryParams = (query) => {
  const errors = [];
  const validated = { ...query };

  if (query.page) {
    const page = parseInt(query.page);
    if (isNaN(page) || page < 1) {
      errors.push({ field: 'page', message: 'Page must be a positive integer' });
    } else {
      validated.page = page;
    }
  }

  if (query.limit) {
    const limit = parseInt(query.limit);
    if (isNaN(limit) || limit < 1 || limit > 100) {
      errors.push({ field: 'limit', message: 'Limit must be between 1 and 100' });
    } else {
      validated.limit = limit;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: validated
  };
};

/**
 * Validate Lens Offer Create
 */
export const validateCreateLensOffer = (data) => {
  const errors = [];

  if (!data.offerName || data.offerName.trim() === '') {
    errors.push({ field: 'offerName', message: 'Offer name is required' });
  } else if (!isValidLength(data.offerName, 1, 200)) {
    errors.push({ field: 'offerName', message: 'Offer name must be between 1 and 200 characters' });
  }

  if (data.description && !isValidLength(data.description, 0, 500)) {
    errors.push({ field: 'description', message: 'Description must not exceed 500 characters' });
  }

  if (!data.offerType || !['VALUE', 'PERCENTAGE', 'EXCHANGE_PRODUCT'].includes(data.offerType)) {
    errors.push({ field: 'offerType', message: 'Offer type must be VALUE, PERCENTAGE, or EXCHANGE_PRODUCT' });
  }

  // Validate offer type specific fields
  if (data.offerType === 'VALUE') {
    if (!data.discountValue || !isValidNumber(data.discountValue) || data.discountValue <= 0) {
      errors.push({ field: 'discountValue', message: 'Discount value is required and must be greater than 0 for VALUE type' });
    }
  } else if (data.offerType === 'PERCENTAGE') {
    if (!data.discountPercentage || !isValidNumber(data.discountPercentage) || 
        data.discountPercentage <= 0 || data.discountPercentage > 100) {
      errors.push({ field: 'discountPercentage', message: 'Discount percentage must be between 0 and 100 for PERCENTAGE type' });
    }
  } else if (data.offerType === 'EXCHANGE_PRODUCT') {
    if (!data.offerPrice || !isValidNumber(data.offerPrice) || data.offerPrice <= 0) {
      errors.push({ field: 'offerPrice', message: 'Offer price is required and must be greater than 0 for EXCHANGE_PRODUCT type' });
    }
  }

  // Validate optional lens_id
  if (data.lens_id && !isValidNumber(data.lens_id)) {
    errors.push({ field: 'lens_id', message: 'Lens ID must be a valid number' });
  }

  // Validate optional coating_id
  if (data.coating_id && !isValidNumber(data.coating_id)) {
    errors.push({ field: 'coating_id', message: 'Coating ID must be a valid number' });
  }

  // Validate date range
  if (!data.startDate) {
    errors.push({ field: 'startDate', message: 'Start date is required' });
  }

  if (!data.endDate) {
    errors.push({ field: 'endDate', message: 'End date is required' });
  }

  if (data.startDate && data.endDate) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    
    if (isNaN(startDate.getTime())) {
      errors.push({ field: 'startDate', message: 'Start date is invalid' });
    }
    
    if (isNaN(endDate.getTime())) {
      errors.push({ field: 'endDate', message: 'End date is invalid' });
    }
    
    if (startDate >= endDate) {
      errors.push({ field: 'endDate', message: 'End date must be after start date' });
    }
  }

  if (!data.createdBy || !isValidNumber(data.createdBy)) {
    errors.push({ field: 'createdBy', message: 'Created by user ID is required' });
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? data : null
  };
};

/**
 * Validate Lens Offer Update
 */
export const validateUpdateLensOffer = (data) => {
  const errors = [];

  if (data.offerName && !isValidLength(data.offerName, 1, 200)) {
    errors.push({ field: 'offerName', message: 'Offer name must be between 1 and 200 characters' });
  }

  if (data.description && !isValidLength(data.description, 0, 500)) {
    errors.push({ field: 'description', message: 'Description must not exceed 500 characters' });
  }

  if (data.offerType && !['VALUE', 'PERCENTAGE', 'EXCHANGE_PRODUCT'].includes(data.offerType)) {
    errors.push({ field: 'offerType', message: 'Offer type must be VALUE, PERCENTAGE, or EXCHANGE_PRODUCT' });
  }

  // Validate offer type specific fields if provided
  if (data.discountValue !== undefined && (!isValidNumber(data.discountValue) || data.discountValue < 0)) {
    errors.push({ field: 'discountValue', message: 'Discount value must be a non-negative number' });
  }

  if (data.discountPercentage !== undefined && 
      (!isValidNumber(data.discountPercentage) || data.discountPercentage < 0 || data.discountPercentage > 100)) {
    errors.push({ field: 'discountPercentage', message: 'Discount percentage must be between 0 and 100' });
  }

  if (data.offerPrice !== undefined && (!isValidNumber(data.offerPrice) || data.offerPrice < 0)) {
    errors.push({ field: 'offerPrice', message: 'Offer price must be a non-negative number' });
  }

  // Validate optional lens_id
  if (data.lens_id !== undefined && data.lens_id !== null && !isValidNumber(data.lens_id)) {
    errors.push({ field: 'lens_id', message: 'Lens ID must be a valid number' });
  }

  // Validate optional coating_id
  if (data.coating_id !== undefined && data.coating_id !== null && !isValidNumber(data.coating_id)) {
    errors.push({ field: 'coating_id', message: 'Coating ID must be a valid number' });
  }

  // Validate dates if provided
  if (data.startDate) {
    const startDate = new Date(data.startDate);
    if (isNaN(startDate.getTime())) {
      errors.push({ field: 'startDate', message: 'Start date is invalid' });
    }
  }

  if (data.endDate) {
    const endDate = new Date(data.endDate);
    if (isNaN(endDate.getTime())) {
      errors.push({ field: 'endDate', message: 'End date is invalid' });
    }
  }

  if (!data.updatedBy || !isValidNumber(data.updatedBy)) {
    errors.push({ field: 'updatedBy', message: 'Updated by user ID is required' });
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? data : null
  };
};

