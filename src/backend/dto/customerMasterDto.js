/**
 * Customer Master DTO Validation Functions
 * Manual validation for Customer Master API operations
 */

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  if (!email) return true; // Optional field
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number format
 */
const isValidPhone = (phone) => {
  return phone && phone.length >= 10 && phone.length <= 15;
};

/**
 * Validate string length
 */
const isValidLength = (str, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  if (!str && min > 0) return false; // Required field
  if (!str) return true; // Optional field
  return str.length >= min && str.length <= max;
};

/**
 * Validate create customer master data
 */
export const validateCreateCustomerMaster = (data) => {
  const errors = [];

  // Required fields validation
  if (!data.name || data.name.trim() === '') {
    errors.push({ field: 'name', message: 'Name is required' });
  } else if (!isValidLength(data.name, 1, 100)) {
    errors.push({ field: 'name', message: 'Name must be between 1 and 100 characters' });
  }

  // Optional fields validation
  if (data.phone && !isValidPhone(data.phone)) {
    errors.push({ field: 'phone', message: 'Phone number must be between 10 and 15 digits' });
  }

  if (data.email && !isValidEmail(data.email)) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  }

  if (data.address && !isValidLength(data.address, 0, 500)) {
    errors.push({ field: 'address', message: 'Address must not exceed 500 characters' });
  }

  if (data.city && !isValidLength(data.city, 0, 100)) {
    errors.push({ field: 'city', message: 'City must not exceed 100 characters' });
  }

  if (data.state && !isValidLength(data.state, 0, 100)) {
    errors.push({ field: 'state', message: 'State must not exceed 100 characters' });
  }

  if (data.pincode && !isValidLength(data.pincode, 0, 10)) {
    errors.push({ field: 'pincode', message: 'Pincode must not exceed 10 characters' });
  }

  if (data.catagory && !isValidLength(data.catagory, 0, 50)) {
    errors.push({ field: 'catagory', message: 'Category must not exceed 50 characters' });
  }

  if (data.gstin && !isValidLength(data.gstin, 0, 15)) {
    errors.push({ field: 'gstin', message: 'GSTIN must not exceed 15 characters' });
  }

  if (data.status && !isValidLength(data.status, 0, 20)) {
    errors.push({ field: 'status', message: 'Status must not exceed 20 characters' });
  }

  if (data.notes && !isValidLength(data.notes, 0, 1000)) {
    errors.push({ field: 'notes', message: 'Notes must not exceed 1000 characters' });
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? {
      name: data.name?.trim(),
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      address: data.address?.trim() || null,
      city: data.city?.trim() || null,
      state: data.state?.trim() || null,
      pincode: data.pincode?.trim() || null,
      catagory: data.catagory?.trim() || null,
      gstin: data.gstin?.trim() || null,
      credit_limit: data.credit_limit?.toString() || null,
      status: data.status?.trim() || null,
      notes: data.notes?.trim() || null
    } : null
  };
};

/**
 * Validate update customer master data
 */
export const validateUpdateCustomerMaster = (data) => {
  const errors = [];

  // All fields are optional for update, but if provided, must be valid
  if (data.name !== undefined) {
    if (!data.name || data.name.trim() === '') {
      errors.push({ field: 'name', message: 'Name cannot be empty' });
    } else if (!isValidLength(data.name, 1, 100)) {
      errors.push({ field: 'name', message: 'Name must be between 1 and 100 characters' });
    }
  }

  if (data.phone !== undefined && data.phone && !isValidPhone(data.phone)) {
    errors.push({ field: 'phone', message: 'Phone number must be between 10 and 15 digits' });
  }

  if (data.email !== undefined && data.email && !isValidEmail(data.email)) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  }

  if (data.address !== undefined && data.address && !isValidLength(data.address, 0, 500)) {
    errors.push({ field: 'address', message: 'Address must not exceed 500 characters' });
  }

  if (data.city !== undefined && data.city && !isValidLength(data.city, 0, 100)) {
    errors.push({ field: 'city', message: 'City must not exceed 100 characters' });
  }

  if (data.state !== undefined && data.state && !isValidLength(data.state, 0, 100)) {
    errors.push({ field: 'state', message: 'State must not exceed 100 characters' });
  }

  if (data.pincode !== undefined && data.pincode && !isValidLength(data.pincode, 0, 10)) {
    errors.push({ field: 'pincode', message: 'Pincode must not exceed 10 characters' });
  }

  if (data.catagory !== undefined && data.catagory && !isValidLength(data.catagory, 0, 50)) {
    errors.push({ field: 'catagory', message: 'Category must not exceed 50 characters' });
  }

  if (data.gstin !== undefined && data.gstin && !isValidLength(data.gstin, 0, 15)) {
    errors.push({ field: 'gstin', message: 'GSTIN must not exceed 15 characters' });
  }

  if (data.status !== undefined && data.status && !isValidLength(data.status, 0, 20)) {
    errors.push({ field: 'status', message: 'Status must not exceed 20 characters' });
  }

  if (data.notes !== undefined && data.notes && !isValidLength(data.notes, 0, 1000)) {
    errors.push({ field: 'notes', message: 'Notes must not exceed 1000 characters' });
  }

  const cleanedData = {};
  Object.keys(data).forEach(key => {
    if (data[key] !== undefined) {
      cleanedData[key] = typeof data[key] === 'string' ? data[key].trim() : data[key];
      if (key === 'credit_limit') {
        cleanedData[key] = data[key]?.toString();
      }
      if ((key === 'phone' || key === 'email' || key === 'address' || key === 'city' || key === 'state' || key === 'pincode' || key === 'catagory' || key === 'gstin' || key === 'status' || key === 'notes') && !cleanedData[key]) {
        cleanedData[key] = null;
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? cleanedData : null
  };
};

/**
 * Validate query parameters
 */
export const validateQueryParams = (query) => {
  const errors = [];
  
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  
  if (page < 1) {
    errors.push({ field: 'page', message: 'Page must be greater than 0' });
  }
  
  if (limit < 1 || limit > 100) {
    errors.push({ field: 'limit', message: 'Limit must be between 1 and 100' });
  }
  
  const validSortFields = ['name', 'city', 'catagory', 'createdAt'];
  const sortBy = query.sortBy || 'createdAt';
  if (!validSortFields.includes(sortBy)) {
    errors.push({ field: 'sortBy', message: 'Invalid sort field' });
  }
  
  const validSortOrders = ['asc', 'desc'];
  const sortOrder = query.sortOrder || 'desc';
  if (!validSortOrders.includes(sortOrder)) {
    errors.push({ field: 'sortOrder', message: 'Sort order must be asc or desc' });
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? {
      name: query.name,
      city: query.city,
      catagory: query.catagory,
      email: query.email,
      phone: query.phone,
      status: query.status,
      page,
      limit,
      sortBy,
      sortOrder
    } : null
  };
};

/**
 * Validate ID parameter
 */
export const validateIdParam = (id) => {
  const parsedId = parseInt(id);
  if (isNaN(parsedId) || parsedId <= 0) {
    return {
      isValid: false,
      errors: [{ field: 'id', message: 'Invalid ID format' }],
      data: null
    };
  }
  
  return {
    isValid: true,
    errors: [],
    data: parsedId
  };
};

/**
 * Validate customer email check request
 */
export const validateCheckCustomerEmail = (data) => {
  const errors = [];
  
  if (!data.email || data.email.trim() === '') {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!isValidEmail(data.email)) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  }
  
  if (data.excludeId !== undefined) {
    const excludeId = parseInt(data.excludeId);
    if (isNaN(excludeId) || excludeId <= 0) {
      errors.push({ field: 'excludeId', message: 'Invalid exclude ID format' });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? {
      email: data.email.trim(),
      excludeId: data.excludeId ? parseInt(data.excludeId) : null
    } : null
  };
};

export default {
  validateCreateCustomerMaster,
  validateUpdateCustomerMaster,
  validateQueryParams,
  validateIdParam,
  validateCheckCustomerEmail
};