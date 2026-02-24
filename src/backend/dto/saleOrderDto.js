/**
 * Sale Order DTO Validation Functions
 * Manual validation for Sale Order API operations
 */

/**
 * Validate string length
 */
const isValidLength = (str, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  if (!str && min > 0) return false; // Required field
  if (!str) return true; // Optional field
  return str.length >= min && str.length <= max;
};

/**
 * Validate date format
 */
const isValidDate = (dateStr) => {
  if (!dateStr) return true; // Optional field
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
};

/**
 * Validate positive number
 */
const isValidPositiveNumber = (num) => {
  if (num === undefined || num === null) return true; // Optional field
  const parsed = typeof num === 'string' ? parseFloat(num) : num;
  return !isNaN(parsed) && parsed >= 0;
};

/**
 * Validate sale order status
 */
const isValidStatus = (status) => {
  const validStatuses = ['DRAFT', 'CONFIRMED', 'IN_PRODUCTION', 'READY_FOR_DISPATCH', 'DELIVERED'];
  return validStatuses.includes(status);
};

/**
 * Validate dispatch status
 */
const isValidDispatchStatus = (status) => {
  if (!status) return true; // Optional field
  const validStatuses = ['Pending', 'Assigned', 'In Transit', 'Delivered'];
  return validStatuses.includes(status);
};

/**
 * Validate create sale order data
 */
export const validateCreateSaleOrder = (data) => {
  const errors = [];

  // Required fields validation
  if (!data.customerId) {
    errors.push({ field: 'customerId', message: 'Customer ID is required' });
  } else {
    const customerId = parseInt(data.customerId);
    if (isNaN(customerId) || customerId <= 0) {
      errors.push({ field: 'customerId', message: 'Customer ID must be a valid positive number' });
    }
  }

  if (!data.createdBy) {
    errors.push({ field: 'createdBy', message: 'Created by user ID is required' });
  } else {
    const createdBy = parseInt(data.createdBy);
    if (isNaN(createdBy) || createdBy <= 0) {
      errors.push({ field: 'createdBy', message: 'Created by must be a valid user ID' });
    }
  }

  // Optional field validations
  if (data.customerRefNo && !isValidLength(data.customerRefNo, 0, 100)) {
    errors.push({ field: 'customerRefNo', message: 'Customer reference number must not exceed 100 characters' });
  }

  if (data.orderDate && !isValidDate(data.orderDate)) {
    errors.push({ field: 'orderDate', message: 'Invalid order date format' });
  }

  if (data.type && !isValidLength(data.type, 0, 100)) {
    errors.push({ field: 'type', message: 'Order type must not exceed 100 characters' });
  }

  if (data.deliverySchedule && !isValidDate(data.deliverySchedule)) {
    errors.push({ field: 'deliverySchedule', message: 'Invalid delivery schedule date format' });
  }

  if (data.remark && !isValidLength(data.remark, 0, 500)) {
    errors.push({ field: 'remark', message: 'Remark must not exceed 500 characters' });
  }

  if (data.itemRefNo && !isValidLength(data.itemRefNo, 0, 100)) {
    errors.push({ field: 'itemRefNo', message: 'Item reference number must not exceed 100 characters' });
  }

  if (data.freeLens !== undefined && typeof data.freeLens !== 'boolean') {
    errors.push({ field: 'freeLens', message: 'Free lens must be a boolean value' });
  }

  if (data.urgentOrder !== undefined && typeof data.urgentOrder !== 'boolean') {
    errors.push({ field: 'urgentOrder', message: 'Urgent order must be a boolean value' });
  }

  if (data.freeFitting !== undefined && typeof data.freeFitting !== 'boolean') {
    errors.push({ field: 'freeFitting', message: 'Free fitting must be a boolean value' });
  }

  // Lens details validation
  if (data.lens_id !== undefined && data.lens_id !== null && data.lens_id !== '') {
    const lensId = parseInt(data.lens_id);
    if (isNaN(lensId) || lensId <= 0) {
      errors.push({ field: 'lens_id', message: 'Lens product ID must be a valid positive number' });
    }
  }

  if (data.category_id !== undefined && data.category_id !== null && data.category_id !== '') {
    const categoryId = parseInt(data.category_id);
    if (isNaN(categoryId) || categoryId <= 0) {
      errors.push({ field: 'category_id', message: 'Category ID must be a valid positive number' });
    }
  }

  if (data.Type_id !== undefined && data.Type_id !== null && data.Type_id !== '') {
    const typeId = parseInt(data.Type_id);
    if (isNaN(typeId) || typeId <= 0) {
      errors.push({ field: 'Type_id', message: 'Type ID must be a valid positive number' });
    }
  }

  if (data.dia_id !== undefined && data.dia_id !== null && data.dia_id !== '') {
    const diaId = parseInt(data.dia_id);
    if (isNaN(diaId) || diaId <= 0) {
      errors.push({ field: 'dia_id', message: 'Diameter ID must be a valid positive number' });
    }
  }

  if (data.fitting_id !== undefined && data.fitting_id !== null && data.fitting_id !== '') {
    const fittingId = parseInt(data.fitting_id);
    if (isNaN(fittingId) || fittingId <= 0) {
      errors.push({ field: 'fitting_id', message: 'Fitting ID must be a valid positive number' });
    }
  }

  if (data.coating_id !== undefined && data.coating_id !== null && data.coating_id !== '') {
    const coatingId = parseInt(data.coating_id);
    if (isNaN(coatingId) || coatingId <= 0) {
      errors.push({ field: 'coating_id', message: 'Coating ID must be a valid positive number' });
    }
  }

  if (data.tinting_id !== undefined && data.tinting_id !== null && data.tinting_id !== '') {
    const tintingId = parseInt(data.tinting_id);
    if (isNaN(tintingId) || tintingId <= 0) {
      errors.push({ field: 'tinting_id', message: 'Tinting ID must be a valid positive number' });
    }
  }

  if (data.material_id !== undefined && data.material_id !== null && data.material_id !== '') {
    const materialId = parseInt(data.material_id);
    if (isNaN(materialId) || materialId <= 0) {
      errors.push({ field: 'material_id', message: 'Material ID must be a valid positive number' });
    }
  }

  // Eye selection validation
  if (data.rightEye !== undefined && typeof data.rightEye !== 'boolean') {
    errors.push({ field: 'rightEye', message: 'Right eye must be a boolean value' });
  }

  if (data.leftEye !== undefined && typeof data.leftEye !== 'boolean') {
    errors.push({ field: 'leftEye', message: 'Left eye must be a boolean value' });
  }

  // Eye specifications validation (right)
  ['rightSpherical', 'rightCylindrical', 'rightAxis', 'rightAdd', 'rightDia'].forEach(field => {
    if (data[field] && !isValidLength(data[field], 0, 50)) {
      errors.push({ field, message: `${field} must not exceed 50 characters` });
    }
  });

  // Eye specifications validation (left)
  ['leftSpherical', 'leftCylindrical', 'leftAxis', 'leftAdd', 'leftDia'].forEach(field => {
    if (data[field] && !isValidLength(data[field], 0, 50)) {
      errors.push({ field, message: `${field} must not exceed 50 characters` });
    }
  });

  // Dispatch information validation
  if (data.dispatchStatus && !isValidDispatchStatus(data.dispatchStatus)) {
    errors.push({ field: 'dispatchStatus', message: 'Invalid dispatch status. Must be one of: Pending, Assigned, In Transit, Delivered' });
  }

  if (data.assignedPerson_id !== undefined && data.assignedPerson_id !== null && data.assignedPerson_id !== '') {
    const assignedPersonId = parseInt(data.assignedPerson_id);
    if (isNaN(assignedPersonId) || assignedPersonId <= 0) {
      errors.push({ field: 'assignedPerson_id', message: 'Assigned person ID must be a valid positive number' });
    }
  }

  if (data.dispatchId && !isValidLength(data.dispatchId, 0, 100)) {
    errors.push({ field: 'dispatchId', message: 'Dispatch ID must not exceed 100 characters' });
  }

  if (data.estimatedDate && !isValidDate(data.estimatedDate)) {
    errors.push({ field: 'estimatedDate', message: 'Invalid estimated date format' });
  }

  if (data.estimatedTime && !isValidLength(data.estimatedTime, 0, 20)) {
    errors.push({ field: 'estimatedTime', message: 'Estimated time must not exceed 20 characters' });
  }

  if (data.actualDate && !isValidDate(data.actualDate)) {
    errors.push({ field: 'actualDate', message: 'Invalid actual date format' });
  }

  if (data.actualTime && !isValidLength(data.actualTime, 0, 20)) {
    errors.push({ field: 'actualTime', message: 'Actual time must not exceed 20 characters' });
  }

  if (data.dispatchNotes && !isValidLength(data.dispatchNotes, 0, 500)) {
    errors.push({ field: 'dispatchNotes', message: 'Dispatch notes must not exceed 500 characters' });
  }

  // Billing information validation
  if (data.lensPrice !== undefined && data.lensPrice !== null && data.lensPrice !== '' && !isValidPositiveNumber(data.lensPrice)) {
    errors.push({ field: 'lensPrice', message: 'Lens price must be a valid positive number' });
  }

  if (data.fittingPrice !== undefined && data.fittingPrice !== null && data.fittingPrice !== '' && !isValidPositiveNumber(data.fittingPrice)) {
    errors.push({ field: 'fittingPrice', message: 'Fitting price must be a valid positive number' });
  }

  if (data.tintingPrice !== undefined && data.tintingPrice !== null && data.tintingPrice !== '' && !isValidPositiveNumber(data.tintingPrice)) {
    errors.push({ field: 'tintingPrice', message: 'Tinting price must be a valid positive number' });
  }

  if (data.discount !== undefined && data.discount !== null && data.discount !== '') {
    const discount = parseFloat(data.discount);
    if (isNaN(discount) || discount < 0 || discount > 100) {
      errors.push({ field: 'discount', message: 'Discount must be a number between 0 and 100' });
    }
  }

  if (data.additionalPrice !== undefined && data.additionalPrice !== null) {
    if (!Array.isArray(data.additionalPrice)) {
      errors.push({ field: 'additionalPrice', message: 'Additional price must be an array' });
    } else {
      data.additionalPrice.forEach((item, index) => {
        if (!item.name || typeof item.name !== 'string') {
          errors.push({ field: `additionalPrice[${index}].name`, message: 'Additional price name is required and must be a string' });
        }
        if (item.value !== undefined && !isValidPositiveNumber(item.value)) {
          errors.push({ field: `additionalPrice[${index}].value`, message: 'Additional price value must be a valid positive number' });
        }
      });
    }
  }

  // Status validation
  if (data.status && !isValidStatus(data.status)) {
    errors.push({ field: 'status', message: 'Invalid status. Must be one of: DRAFT, CONFIRMED, IN_PRODUCTION, READY_FOR_DISPATCH, DELIVERED' });
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? {
      customerId: parseInt(data.customerId),
      status: data.status || 'DRAFT',
      customerRefNo: data.customerRefNo?.trim() || null,
      orderDate: data.orderDate || null,
      type: data.type?.trim() || null,
      deliverySchedule: data.deliverySchedule || null,
      remark: data.remark?.trim() || null,
      itemRefNo: data.itemRefNo?.trim() || null,
      freeLens: data.freeLens || false,
      urgentOrder: data.urgentOrder || false,
      freeFitting: data.freeFitting || false,
      lens_id: data.lens_id ? parseInt(data.lens_id) : null,
      category_id: data.category_id ? parseInt(data.category_id) : null,
      Type_id: data.Type_id ? parseInt(data.Type_id) : null,
      dia_id: data.dia_id ? parseInt(data.dia_id) : null,
      fitting_id: data.fitting_id ? parseInt(data.fitting_id) : null,
      coating_id: data.coating_id ? parseInt(data.coating_id) : null,
      tinting_id: data.tinting_id ? parseInt(data.tinting_id) : null,
      rightEye: data.rightEye || false,
      leftEye: data.leftEye || false,
  rightSpherical: data.rightSpherical?.trim() || null,
  rightCylindrical: data.rightCylindrical?.trim() || null,
  rightAxis: data.rightAxis?.trim() || null,
  rightAdd: data.rightAdd?.trim() || null,
  rightDia: data.rightDia?.trim() || null,
  leftSpherical: data.leftSpherical?.trim() || null,
  leftCylindrical: data.leftCylindrical?.trim() || null,
  leftAxis: data.leftAxis?.trim() || null,
  leftAdd: data.leftAdd?.trim() || null,
  leftDia: data.leftDia?.trim() || null,
      dispatchStatus: data.dispatchStatus || 'Pending',
      assignedPerson_id: data.assignedPerson_id ? parseInt(data.assignedPerson_id) : null,
      dispatchId: data.dispatchId?.trim() || null,
      estimatedDate: data.estimatedDate || null,
      estimatedTime: data.estimatedTime?.trim() || null,
      actualDate: data.actualDate || null,
      actualTime: data.actualTime?.trim() || null,
      dispatchNotes: data.dispatchNotes?.trim() || null,
      lensPrice: data.lensPrice ? parseFloat(data.lensPrice) : 0,
      rightEyeExtra: data.rightEyeExtra ? parseFloat(data.rightEyeExtra) : 0,
      leftEyeExtra: data.leftEyeExtra ? parseFloat(data.leftEyeExtra) : 0,
      fittingPrice: data.fittingPrice ? parseFloat(data.fittingPrice) : 0,
      tintingPrice: data.tintingPrice ? parseFloat(data.tintingPrice) : 0,
      discount: data.discount ? parseFloat(data.discount) : 0,
      additionalPrice: data.additionalPrice || null,
      createdBy: parseInt(data.createdBy),
      updatedBy: parseInt(data.createdBy)
    } : null
  };
};

/**
 * Validate update sale order data
 */
export const validateUpdateSaleOrder = (data) => {
  const errors = [];

  // updatedBy is required for updates
  if (!data.updatedBy) {
    errors.push({ field: 'updatedBy', message: 'Updated by user ID is required' });
  } else {
    const updatedBy = parseInt(data.updatedBy);
    if (isNaN(updatedBy) || updatedBy <= 0) {
      errors.push({ field: 'updatedBy', message: 'Updated by must be a valid user ID' });
    }
  }

  // All other fields are optional for update, but if provided, must be valid
  if (data.customerId !== undefined) {
    const customerId = parseInt(data.customerId);
    if (isNaN(customerId) || customerId <= 0) {
      errors.push({ field: 'customerId', message: 'Customer ID must be a valid positive number' });
    }
  }

  if (data.customerRefNo !== undefined && data.customerRefNo && !isValidLength(data.customerRefNo, 0, 100)) {
    errors.push({ field: 'customerRefNo', message: 'Customer reference number must not exceed 100 characters' });
  }

  if (data.orderDate !== undefined && data.orderDate && !isValidDate(data.orderDate)) {
    errors.push({ field: 'orderDate', message: 'Invalid order date format' });
  }

  if (data.type !== undefined && data.type && !isValidLength(data.type, 0, 100)) {
    errors.push({ field: 'type', message: 'Order type must not exceed 100 characters' });
  }

  if (data.deliverySchedule !== undefined && data.deliverySchedule && !isValidDate(data.deliverySchedule)) {
    errors.push({ field: 'deliverySchedule', message: 'Invalid delivery schedule date format' });
  }

  if (data.remark !== undefined && data.remark && !isValidLength(data.remark, 0, 500)) {
    errors.push({ field: 'remark', message: 'Remark must not exceed 500 characters' });
  }

  if (data.status !== undefined && data.status && !isValidStatus(data.status)) {
    errors.push({ field: 'status', message: 'Invalid status' });
  }

  if (data.lensPrice !== undefined && data.lensPrice !== null && data.lensPrice !== '' && !isValidPositiveNumber(data.lensPrice)) {
    errors.push({ field: 'lensPrice', message: 'Lens price must be a valid positive number' });
  }

  if (data.fittingPrice !== undefined && data.fittingPrice !== null && data.fittingPrice !== '' && !isValidPositiveNumber(data.fittingPrice)) {
    errors.push({ field: 'fittingPrice', message: 'Fitting price must be a valid positive number' });
  }

  if (data.tintingPrice !== undefined && data.tintingPrice !== null && data.tintingPrice !== '' && !isValidPositiveNumber(data.tintingPrice)) {
    errors.push({ field: 'tintingPrice', message: 'Tinting price must be a valid positive number' });
  }

  if (data.discount !== undefined && data.discount !== null && data.discount !== '') {
    const discount = parseFloat(data.discount);
    if (isNaN(discount) || discount < 0 || discount > 100) {
      errors.push({ field: 'discount', message: 'Discount must be a number between 0 and 100' });
    }
  }

  if (data.additionalPrice !== undefined && data.additionalPrice !== null) {
    if (!Array.isArray(data.additionalPrice)) {
      errors.push({ field: 'additionalPrice', message: 'Additional price must be an array' });
    }
  }

  if (data.material_id !== undefined && data.material_id !== null && data.material_id !== '') {
    const materialId = parseInt(data.material_id);
    if (isNaN(materialId) || materialId <= 0) {
      errors.push({ field: 'material_id', message: 'Material ID must be a valid positive number' });
    }
  }

  const updateData = {
    updatedBy: parseInt(data.updatedBy)
  };

  // Add fields that are being updated
  if (data.customerId !== undefined) updateData.customerId = parseInt(data.customerId);
  if (data.status !== undefined) updateData.status = data.status;
  if (data.customerRefNo !== undefined) updateData.customerRefNo = data.customerRefNo?.trim() || null;
  if (data.orderDate !== undefined) updateData.orderDate = data.orderDate;
  if (data.type !== undefined) updateData.type = data.type?.trim() || null;
  if (data.deliverySchedule !== undefined) updateData.deliverySchedule = data.deliverySchedule;
  if (data.remark !== undefined) updateData.remark = data.remark?.trim() || null;
  if (data.itemRefNo !== undefined) updateData.itemRefNo = data.itemRefNo?.trim() || null;
  if (data.freeLens !== undefined) updateData.freeLens = data.freeLens;
  if (data.urgentOrder !== undefined) updateData.urgentOrder = data.urgentOrder;
  if (data.freeFitting !== undefined) updateData.freeFitting = data.freeFitting;
  if (data.lens_id !== undefined) updateData.lens_id = data.lens_id ? parseInt(data.lens_id) : null;
  if (data.category_id !== undefined) updateData.category_id = data.category_id ? parseInt(data.category_id) : null;
  if (data.Type_id !== undefined) updateData.Type_id = data.Type_id ? parseInt(data.Type_id) : null;
  if (data.dia_id !== undefined) updateData.dia_id = data.dia_id ? parseInt(data.dia_id) : null;
  if (data.fitting_id !== undefined) updateData.fitting_id = data.fitting_id ? parseInt(data.fitting_id) : null;
  if (data.coating_id !== undefined) updateData.coating_id = data.coating_id ? parseInt(data.coating_id) : null;
  if (data.tinting_id !== undefined) updateData.tinting_id = data.tinting_id ? parseInt(data.tinting_id) : null;
  if (data.material_id !== undefined) updateData.material_id = data.material_id ? parseInt(data.material_id) : null;
  if (data.rightEye !== undefined) updateData.rightEye = data.rightEye;
  if (data.leftEye !== undefined) updateData.leftEye = data.leftEye;
  if (data.rightSpherical !== undefined) updateData.rightSpherical = data.rightSpherical?.trim() || null;
  if (data.rightCylindrical !== undefined) updateData.rightCylindrical = data.rightCylindrical?.trim() || null;
  if (data.rightAxis !== undefined) updateData.rightAxis = data.rightAxis?.trim() || null;
  if (data.rightAdd !== undefined) updateData.rightAdd = data.rightAdd?.trim() || null;
  if (data.rightDia !== undefined) updateData.rightDia = data.rightDia?.trim() || null;
  if (data.leftSpherical !== undefined) updateData.leftSpherical = data.leftSpherical?.trim() || null;
  if (data.leftCylindrical !== undefined) updateData.leftCylindrical = data.leftCylindrical?.trim() || null;
  if (data.leftAxis !== undefined) updateData.leftAxis = data.leftAxis?.trim() || null;
  if (data.leftAdd !== undefined) updateData.leftAdd = data.leftAdd?.trim() || null;
  if (data.leftDia !== undefined) updateData.leftDia = data.leftDia?.trim() || null;
  if (data.dispatchStatus !== undefined) updateData.dispatchStatus = data.dispatchStatus?.trim() || null;
  if (data.assignedPerson_id !== undefined) updateData.assignedPerson_id = data.assignedPerson_id ? parseInt(data.assignedPerson_id) : null;
  if (data.dispatchId !== undefined) updateData.dispatchId = data.dispatchId?.trim() || null;
  if (data.estimatedDate !== undefined) updateData.estimatedDate = data.estimatedDate;
  if (data.estimatedTime !== undefined) updateData.estimatedTime = data.estimatedTime?.trim() || null;
  if (data.actualDate !== undefined) updateData.actualDate = data.actualDate;
  if (data.actualTime !== undefined) updateData.actualTime = data.actualTime?.trim() || null;
  if (data.dispatchNotes !== undefined) updateData.dispatchNotes = data.dispatchNotes?.trim() || null;
  if (data.lensPrice !== undefined) updateData.lensPrice = data.lensPrice ? parseFloat(data.lensPrice) : 0;
  if (data.rightEyeExtra !== undefined) updateData.rightEyeExtra = data.rightEyeExtra ? parseFloat(data.rightEyeExtra) : 0;
  if (data.leftEyeExtra !== undefined) updateData.leftEyeExtra = data.leftEyeExtra ? parseFloat(data.leftEyeExtra) : 0;
  if (data.fittingPrice !== undefined) updateData.fittingPrice = data.fittingPrice ? parseFloat(data.fittingPrice) : 0;
  if (data.tintingPrice !== undefined) updateData.tintingPrice = data.tintingPrice ? parseFloat(data.tintingPrice) : 0;
  if (data.discount !== undefined) updateData.discount = data.discount ? parseFloat(data.discount) : 0;
  if (data.additionalPrice !== undefined) updateData.additionalPrice = data.additionalPrice || null;

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? updateData : null
  };
};

/**
 * Validate update status data
 */
export const validateUpdateStatus = (data) => {
  const errors = [];

  if (!data.status) {
    errors.push({ field: 'status', message: 'Status is required' });
  } else if (!isValidStatus(data.status)) {
    errors.push({ field: 'status', message: 'Invalid status. Must be one of: DRAFT, CONFIRMED, IN_PRODUCTION, READY_FOR_DISPATCH, DELIVERED' });
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? {
      status: data.status
    } : null
  };
};

/**
 * Validate update dispatch info data
 */
export const validateUpdateDispatchInfo = (data) => {
  const errors = [];

  if (data.dispatchStatus && !isValidDispatchStatus(data.dispatchStatus)) {
    errors.push({ field: 'dispatchStatus', message: 'Invalid dispatch status' });
  }

  if (data.assignedPerson_id !== undefined && data.assignedPerson_id !== null && data.assignedPerson_id !== '') {
    const assignedPersonId = parseInt(data.assignedPerson_id);
    if (isNaN(assignedPersonId) || assignedPersonId <= 0) {
      errors.push({ field: 'assignedPerson_id', message: 'Assigned person ID must be a valid positive number' });
    }
  }

  if (data.estimatedDate && !isValidDate(data.estimatedDate)) {
    errors.push({ field: 'estimatedDate', message: 'Invalid estimated date format' });
  }

  if (data.actualDate && !isValidDate(data.actualDate)) {
    errors.push({ field: 'actualDate', message: 'Invalid actual date format' });
  }

  const dispatchData = {};
  if (data.dispatchStatus !== undefined) dispatchData.dispatchStatus = data.dispatchStatus;
  if (data.assignedPerson_id !== undefined) dispatchData.assignedPerson_id = data.assignedPerson_id ? parseInt(data.assignedPerson_id) : null;
  if (data.dispatchId !== undefined) dispatchData.dispatchId = data.dispatchId?.trim() || null;
  if (data.estimatedDate !== undefined) dispatchData.estimatedDate = data.estimatedDate;
  if (data.estimatedTime !== undefined) dispatchData.estimatedTime = data.estimatedTime?.trim() || null;
  if (data.actualDate !== undefined) dispatchData.actualDate = data.actualDate;
  if (data.actualTime !== undefined) dispatchData.actualTime = data.actualTime?.trim() || null;
  if (data.dispatchNotes !== undefined) dispatchData.dispatchNotes = data.dispatchNotes?.trim() || null;

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? dispatchData : null
  };
};

/**
 * Validate query parameters for list
 */
export const validateQueryParams = (query) => {
  const errors = [];
  const params = {};

  // Allowed sort fields
  const allowedSortFields = [
    'id', 'orderNo', 'orderDate', 'status', 'type', 
    'createdAt', 'updatedAt', 'customerRefNo', 'itemRefNo',
    'dispatchStatus', 'lensPrice', 'fittingPrice', 'discount',
    'customer', 'customerName'
  ];

  if (query.page) {
    const page = parseInt(query.page);
    if (isNaN(page) || page < 1) {
      errors.push({ field: 'page', message: 'Page must be a positive number' });
    } else {
      params.page = page;
    }
  }

  if (query.limit) {
    const limit = parseInt(query.limit);
    if (isNaN(limit) || limit < 1 || limit > 100) {
      errors.push({ field: 'limit', message: 'Limit must be between 1 and 100' });
    } else {
      params.limit = limit;
    }
  }

  if (query.status && !isValidStatus(query.status)) {
    errors.push({ field: 'status', message: 'Invalid status filter' });
  } else if (query.status) {
    params.status = query.status;
  }

  if (query.dispatchStatus && !isValidDispatchStatus(query.dispatchStatus)) {
    errors.push({ field: 'dispatchStatus', message: 'Invalid dispatch status filter' });
  } else if (query.dispatchStatus) {
    params.dispatchStatus = query.dispatchStatus;
  }

  if (query.customerId) {
    const customerId = parseInt(query.customerId);
    if (isNaN(customerId) || customerId < 1) {
      errors.push({ field: 'customerId', message: 'Customer ID must be a positive number' });
    } else {
      params.customerId = customerId;
    }
  }

  if (query.search) {
    params.search = query.search.trim();
  }

  if (query.startDate && !isValidDate(query.startDate)) {
    errors.push({ field: 'startDate', message: 'Invalid start date format' });
  } else if (query.startDate) {
    params.startDate = query.startDate;
  }

  if (query.endDate && !isValidDate(query.endDate)) {
    errors.push({ field: 'endDate', message: 'Invalid end date format' });
  } else if (query.endDate) {
    params.endDate = query.endDate;
  }

  if (query.sortBy) {
    if (!allowedSortFields.includes(query.sortBy)) {
      errors.push({ 
        field: 'sortBy', 
        message: `Sort field must be one of: ${allowedSortFields.join(', ')}` 
      });
    } else {
      params.sortBy = query.sortBy;
    }
  }

  if (query.sortOrder && !['asc', 'desc'].includes(query.sortOrder)) {
    errors.push({ field: 'sortOrder', message: 'Sort order must be "asc" or "desc"' });
  } else if (query.sortOrder) {
    params.sortOrder = query.sortOrder;
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? params : null
  };
};

/**
 * Validate ID parameter
 */
export const validateIdParam = (id) => {
  const errors = [];
  const parsedId = parseInt(id);

  if (isNaN(parsedId) || parsedId < 1) {
    errors.push({ field: 'id', message: 'ID must be a valid positive number' });
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? parsedId : null
  };
};
