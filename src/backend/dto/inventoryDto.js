/**
 * Inventory DTO Validation Functions
 * Manual validation for Inventory API operations
 */

/**
 * Validate required field
 */
const isRequired = (value, fieldName) => {
  if (value === null || value === undefined || value === '') {
    return { valid: false, message: `${fieldName} is required` };
  }
  return { valid: true };
};

/**
 * Validate number field
 */
const isValidNumber = (value, fieldName, min = 0) => {
  if (typeof value !== 'number' || isNaN(value) || value < min) {
    return { valid: false, message: `${fieldName} must be a valid number >= ${min}` };
  }
  return { valid: true };
};

/**
 * Validate string length
 */
const isValidLength = (str, fieldName, min = 0, max = 255) => {
  if (!str && min > 0) {
    return { valid: false, message: `${fieldName} is required` };
  }
  if (str && (str.length < min || str.length > max)) {
    return { valid: false, message: `${fieldName} must be between ${min} and ${max} characters` };
  }
  return { valid: true };
};

/**
 * Validate inventory item creation data
 */
export const validateCreateInventoryItem = (data) => {
  const errors = [];

  // Required fields
  const requiredFields = [
    { field: 'lens_id', value: data.lens_id },
    { field: 'quantity', value: data.quantity },
    { field: 'costPrice', value: data.costPrice },
  ];

  requiredFields.forEach(({ field, value }) => {
    const validation = isRequired(value, field);
    if (!validation.valid) {
      errors.push({ field, message: validation.message });
    }
  });

  // Number validations
  if (data.lens_id !== undefined) {
    const validation = isValidNumber(data.lens_id, 'lens_id', 1);
    if (!validation.valid) {
      errors.push({ field: 'lens_id', message: validation.message });
    }
  }

  if (data.quantity !== undefined) {
    const validation = isValidNumber(data.quantity, 'quantity', 0.1);
    if (!validation.valid) {
      errors.push({ field: 'quantity', message: validation.message });
    }
  }

  if (data.costPrice !== undefined) {
    const validation = isValidNumber(data.costPrice, 'costPrice', 0);
    if (!validation.valid) {
      errors.push({ field: 'costPrice', message: validation.message });
    }
  }

  if (data.sellingPrice !== undefined && data.sellingPrice !== null) {
    const validation = isValidNumber(data.sellingPrice, 'sellingPrice', 0);
    if (!validation.valid) {
      errors.push({ field: 'sellingPrice', message: validation.message });
    }
  }

  // Optional ID validations
  const optionalIds = ['category_id', 'Type_id', 'coating_id', 'dia_id', 'fitting_id', 'tinting_id', 'location_id', 'tray_id', 'purchaseOrderId', 'vendorId'];
  optionalIds.forEach(field => {
    if (data[field] !== undefined && data[field] !== null) {
      const validation = isValidNumber(data[field], field, 1);
      if (!validation.valid) {
        errors.push({ field, message: validation.message });
      }
    }
  });

  // String validations
  const stringFields = [
    { field: 'batchNo', value: data.batchNo, required: false },
    { field: 'serialNo', value: data.serialNo, required: false },
    { field: 'rightSpherical', value: data.rightSpherical, required: false },
    { field: 'rightCylindrical', value: data.rightCylindrical, required: false },
    { field: 'rightAxis', value: data.rightAxis, required: false },
    { field: 'rightAdd', value: data.rightAdd, required: false },
    { field: 'leftSpherical', value: data.leftSpherical, required: false },
    { field: 'leftCylindrical', value: data.leftCylindrical, required: false },
    { field: 'leftAxis', value: data.leftAxis, required: false },
    { field: 'leftAdd', value: data.leftAdd, required: false },
    { field: 'qualityGrade', value: data.qualityGrade, required: false, max: 10 },
    { field: 'notes', value: data.notes, required: false, max: 500 },
  ];

  stringFields.forEach(({ field, value, required = false, max = 255 }) => {
    if (value !== undefined) {
      const validation = isValidLength(value, field, required ? 1 : 0, max);
      if (!validation.valid) {
        errors.push({ field, message: validation.message });
      }
    }
  });

  // Validate status
  const validStatuses = ['AVAILABLE', 'RESERVED', 'IN_PRODUCTION', 'DAMAGED', 'RETURNED', 'QUALITY_CHECK'];
  if (data.status && !validStatuses.includes(data.status)) {
    errors.push({ field: 'status', message: `Status must be one of: ${validStatuses.join(', ')}` });
  }

  // Validate eye selection
  if (data.rightEye === true || data.leftEye === true) {
    // Eye specifications are optional but if provided should be valid
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? {
      lens_id: parseInt(data.lens_id),
      category_id: data.category_id ? parseInt(data.category_id) : null,
      Type_id: data.Type_id ? parseInt(data.Type_id) : null,
      coating_id: data.coating_id ? parseInt(data.coating_id) : null,
      dia_id: data.dia_id ? parseInt(data.dia_id) : null,
      fitting_id: data.fitting_id ? parseInt(data.fitting_id) : null,
      tinting_id: data.tinting_id ? parseInt(data.tinting_id) : null,
      location_id: data.location_id ? parseInt(data.location_id) : null,
      tray_id: data.tray_id ? parseInt(data.tray_id) : null,
      quantity: parseFloat(data.quantity),
      costPrice: parseFloat(data.costPrice),
      sellingPrice: data.sellingPrice ? parseFloat(data.sellingPrice) : null,
      rightEye: Boolean(data.rightEye),
      leftEye: Boolean(data.leftEye),
      rightSpherical: data.rightSpherical || null,
      rightCylindrical: data.rightCylindrical || null,
      rightAxis: data.rightAxis || null,
      rightAdd: data.rightAdd || null,
      leftSpherical: data.leftSpherical || null,
      leftCylindrical: data.leftCylindrical || null,
      leftAxis: data.leftAxis || null,
      leftAdd: data.leftAdd || null,
      status: data.status || 'AVAILABLE',
      batchNo: data.batchNo || null,
      serialNo: data.serialNo || null,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      manufactureDate: data.manufactureDate ? new Date(data.manufactureDate) : null,
      purchaseOrderId: data.purchaseOrderId ? parseInt(data.purchaseOrderId) : null,
      vendorId: data.vendorId ? parseInt(data.vendorId) : null,
      qualityGrade: data.qualityGrade || null,
      notes: data.notes || null,
      createdBy: parseInt(data.createdBy)
    } : null
  };
};

/**
 * Validate inventory transaction creation data
 */
export const validateCreateInventoryTransaction = (data) => {
  const errors = [];

  // Required fields
  const requiredFields = [
    { field: 'type', value: data.type },
    { field: 'inventoryItemId', value: data.inventoryItemId },
    { field: 'quantity', value: data.quantity },
  ];

  requiredFields.forEach(({ field, value }) => {
    const validation = isRequired(value, field);
    if (!validation.valid) {
      errors.push({ field, message: validation.message });
    }
  });

  // Validate transaction type
  const validTypes = ['INWARD_PO', 'INWARD_DIRECT', 'OUTWARD_SALE', 'OUTWARD_RETURN', 'TRANSFER', 'ADJUSTMENT', 'DAMAGE'];
  if (data.type && !validTypes.includes(data.type)) {
    errors.push({ field: 'type', message: `Type must be one of: ${validTypes.join(', ')}` });
  }

  // Number validations
  if (data.inventoryItemId !== undefined) {
    const validation = isValidNumber(data.inventoryItemId, 'inventoryItemId', 1);
    if (!validation.valid) {
      errors.push({ field: 'inventoryItemId', message: validation.message });
    }
  }

  if (data.quantity !== undefined) {
    const validation = isValidNumber(Math.abs(data.quantity), 'quantity', 0.1);
    if (!validation.valid) {
      errors.push({ field: 'quantity', message: 'Quantity must be a valid number > 0' });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? {
      type: data.type,
      inventoryItemId: parseInt(data.inventoryItemId),
      quantity: parseFloat(data.quantity),
      unitPrice: data.unitPrice ? parseFloat(data.unitPrice) : null,
      totalValue: data.totalValue ? parseFloat(data.totalValue) : null,
      fromLocationId: data.fromLocationId ? parseInt(data.fromLocationId) : null,
      fromTrayId: data.fromTrayId ? parseInt(data.fromTrayId) : null,
      toLocationId: data.toLocationId ? parseInt(data.toLocationId) : null,
      toTrayId: data.toTrayId ? parseInt(data.toTrayId) : null,
      purchaseOrderId: data.purchaseOrderId ? parseInt(data.purchaseOrderId) : null,
      saleOrderId: data.saleOrderId ? parseInt(data.saleOrderId) : null,
      vendorId: data.vendorId ? parseInt(data.vendorId) : null,
      reason: data.reason || null,
      notes: data.notes || null,
      batchNo: data.batchNo || null,
      transactionDate: data.transactionDate ? new Date(data.transactionDate) : new Date(),
      createdBy: parseInt(data.createdBy)
    } : null
  };
};

/**
 * Validate query parameters
 */
export const validateQueryParams = (params) => {
  const errors = [];
  const data = {};

  // Pagination
  if (params.page) {
    const page = parseInt(params.page);
    if (isNaN(page) || page < 1) {
      errors.push({ field: 'page', message: 'Page must be a positive integer' });
    } else {
      data.page = page;
    }
  } else {
    data.page = 1;
  }

  if (params.limit) {
    const limit = parseInt(params.limit);
    if (isNaN(limit) || limit < 1 || limit > 100) {
      errors.push({ field: 'limit', message: 'Limit must be between 1 and 100' });
    } else {
      data.limit = limit;
    }
  } else {
    data.limit = 10;
  }

  // Search
  if (params.search) {
    data.search = params.search.trim();
  }

  // Filters
  if (params.status) {
    const validStatuses = ['AVAILABLE', 'RESERVED', 'IN_PRODUCTION', 'DAMAGED', 'RETURNED', 'QUALITY_CHECK'];
    if (!validStatuses.includes(params.status)) {
      errors.push({ field: 'status', message: `Status must be one of: ${validStatuses.join(', ')}` });
    } else {
      data.status = params.status;
    }
  }

  // ID filters
  const idFields = ['lens_id', 'location_id', 'tray_id', 'vendor_id', 'category_id'];
  idFields.forEach(field => {
    if (params[field]) {
      const id = parseInt(params[field]);
      if (isNaN(id) || id < 1) {
        errors.push({ field, message: `${field} must be a positive integer` });
      } else {
        data[field] = id;
      }
    }
  });

  // Date filters
  if (params.startDate) {
    const date = new Date(params.startDate);
    if (isNaN(date.getTime())) {
      errors.push({ field: 'startDate', message: 'Invalid start date format' });
    } else {
      data.startDate = params.startDate;
    }
  }

  if (params.endDate) {
    const date = new Date(params.endDate);
    if (isNaN(date.getTime())) {
      errors.push({ field: 'endDate', message: 'Invalid end date format' });
    } else {
      data.endDate = params.endDate;
    }
  }

  // Sorting
  if (params.sortBy) {
    const validSortFields = ['createdAt', 'inwardDate', 'quantity', 'costPrice', 'status'];
    if (!validSortFields.includes(params.sortBy)) {
      errors.push({ field: 'sortBy', message: `sortBy must be one of: ${validSortFields.join(', ')}` });
    } else {
      data.sortBy = params.sortBy;
    }
  }

  if (params.sortOrder) {
    if (!['asc', 'desc'].includes(params.sortOrder)) {
      errors.push({ field: 'sortOrder', message: 'sortOrder must be asc or desc' });
    } else {
      data.sortOrder = params.sortOrder;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    data
  };
};

/**
 * Validate ID parameter
 */
export const validateIdParam = (id) => {
  const parsedId = parseInt(id);
  
  if (isNaN(parsedId) || parsedId < 1) {
    return {
      isValid: false,
      errors: [{ field: 'id', message: 'ID must be a positive integer' }],
      data: null
    };
  }

  return {
    isValid: true,
    errors: [],
    data: { id: parsedId }
  };
};