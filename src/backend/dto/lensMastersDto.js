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
