/**
 * Purchase Order DTO Validation Functions
 * Manual validation for Purchase Order API operations
 */

/**
 * Validate float values
 */
const isValidFloat = (value) => {
  if (value === undefined || value === null || value === '') return true;
  const num = parseFloat(value);
  return !isNaN(num) && num >= 0;
};

/**
 * Validate integer values
 */
const isValidInteger = (value) => {
  if (value === undefined || value === null || value === '') return true;
  const num = parseInt(value);
  return !isNaN(num) && num > 0;
};

/**
 * Validate date format
 */
const isValidDate = (date) => {
  if (!date) return true; // Optional field
  const parsedDate = new Date(date);
  return parsedDate instanceof Date && !isNaN(parsedDate);
};

/**
 * Validate create purchase order data
 */
export const validateCreatePurchaseOrder = (data) => {
  const errors = [];

  // Required fields validation
  if (!data.poNumber || data.poNumber.trim() === '') {
    errors.push({ field: 'poNumber', message: 'PO Number is required' });
  }

  if (!data.vendorId) {
    errors.push({ field: 'vendorId', message: 'Vendor is required' });
  } else if (!isValidInteger(data.vendorId)) {
    errors.push({ field: 'vendorId', message: 'Invalid vendor ID' });
  }

  // Quantity validation
  if (!data.quantity && data.quantity !== 0) {
    errors.push({ field: 'quantity', message: 'Quantity is required' });
  } else if (!isValidFloat(data.quantity) || parseFloat(data.quantity) <= 0) {
    errors.push({ field: 'quantity', message: 'Quantity must be greater than 0' });
  }

  // Unit Price validation
  if (!data.unitPrice && data.unitPrice !== 0) {
    errors.push({ field: 'unitPrice', message: 'Unit price is required' });
  } else if (!isValidFloat(data.unitPrice) || parseFloat(data.unitPrice) < 0) {
    errors.push({ field: 'unitPrice', message: 'Unit price must be 0 or greater' });
  }

  // Subtotal validation
  if (!data.subtotal && data.subtotal !== 0) {
    errors.push({ field: 'subtotal', message: 'Subtotal is required' });
  } else if (!isValidFloat(data.subtotal) || parseFloat(data.subtotal) < 0) {
    errors.push({ field: 'subtotal', message: 'Subtotal must be 0 or greater' });
  }

  // Total Value validation
  if (!data.totalValue && data.totalValue !== 0) {
    errors.push({ field: 'totalValue', message: 'Total value is required' });
  } else if (!isValidFloat(data.totalValue) || parseFloat(data.totalValue) < 0) {
    errors.push({ field: 'totalValue', message: 'Total value must be 0 or greater' });
  }

  // Optional numeric field validations
  if (data.discountPercentage && !isValidFloat(data.discountPercentage)) {
    errors.push({ field: 'discountPercentage', message: 'Invalid discount percentage' });
  }

  if (data.taxAmount && !isValidFloat(data.taxAmount)) {
    errors.push({ field: 'taxAmount', message: 'Invalid tax amount' });
  }

  if (data.roundOff && !isValidFloat(data.roundOff)) {
    errors.push({ field: 'roundOff', message: 'Invalid round off value' });
  }

  // Optional ID validations
  if (data.saleOrderId && !isValidInteger(data.saleOrderId)) {
    errors.push({ field: 'saleOrderId', message: 'Invalid sale order ID' });
  }

  if (data.lens_id && !isValidInteger(data.lens_id)) {
    errors.push({ field: 'lens_id', message: 'Invalid lens ID' });
  }

  if (data.category_id && !isValidInteger(data.category_id)) {
    errors.push({ field: 'category_id', message: 'Invalid category ID' });
  }

  if (data.Type_id && !isValidInteger(data.Type_id)) {
    errors.push({ field: 'Type_id', message: 'Invalid type ID' });
  }

  if (data.dia_id && !isValidInteger(data.dia_id)) {
    errors.push({ field: 'dia_id', message: 'Invalid dia ID' });
  }

  if (data.fitting_id && !isValidInteger(data.fitting_id)) {
    errors.push({ field: 'fitting_id', message: 'Invalid fitting ID' });
  }

  if (data.coating_id && !isValidInteger(data.coating_id)) {
    errors.push({ field: 'coating_id', message: 'Invalid coating ID' });
  }

  if (data.tinting_id && !isValidInteger(data.tinting_id)) {
    errors.push({ field: 'tinting_id', message: 'Invalid tinting ID' });
  }

  // Date validations
  if (data.orderDate && !isValidDate(data.orderDate)) {
    errors.push({ field: 'orderDate', message: 'Invalid order date' });
  }

  if (data.expectedDeliveryDate && !isValidDate(data.expectedDeliveryDate)) {
    errors.push({ field: 'expectedDeliveryDate', message: 'Invalid expected delivery date' });
  }

  if (data.actualDeliveryDate && !isValidDate(data.actualDeliveryDate)) {
    errors.push({ field: 'actualDeliveryDate', message: 'Invalid actual delivery date' });
  }

  // createdBy validation
  if (!data.createdBy) {
    errors.push({ field: 'createdBy', message: 'Created by user ID is required' });
  } else if (!isValidInteger(data.createdBy)) {
    errors.push({ field: 'createdBy', message: 'Invalid created by user ID' });
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? {
      poNumber: data.poNumber?.trim(),
      reference_id: data.reference_id?.trim() || null,
      vendorId: parseInt(data.vendorId),
      saleOrderId: data.saleOrderId ? parseInt(data.saleOrderId) : null,
      lens_id: data.lens_id ? parseInt(data.lens_id) : null,
      category_id: data.category_id ? parseInt(data.category_id) : null,
      Type_id: data.Type_id ? parseInt(data.Type_id) : null,
      dia_id: data.dia_id ? parseInt(data.dia_id) : null,
      fitting_id: data.fitting_id ? parseInt(data.fitting_id) : null,
      coating_id: data.coating_id ? parseInt(data.coating_id) : null,
      tinting_id: data.tinting_id ? parseInt(data.tinting_id) : null,
      rightEye: data.rightEye !== undefined ? Boolean(data.rightEye) : false,
      leftEye: data.leftEye !== undefined ? Boolean(data.leftEye) : false,
      rightSpherical: data.rightSpherical?.trim() || null,
      rightCylindrical: data.rightCylindrical?.trim() || null,
      rightAxis: data.rightAxis?.trim() || null,
      rightAdd: data.rightAdd?.trim() || null,
      rightDia: data.rightDia?.trim() || null,
      rightBase: data.rightBase?.trim() || null,
      rightBaseSize: data.rightBaseSize?.trim() || null,
      rightBled: data.rightBled?.trim() || null,
      leftSpherical: data.leftSpherical?.trim() || null,
      leftCylindrical: data.leftCylindrical?.trim() || null,
      leftAxis: data.leftAxis?.trim() || null,
      leftAdd: data.leftAdd?.trim() || null,
      leftDia: data.leftDia?.trim() || null,
      leftBase: data.leftBase?.trim() || null,
      leftBaseSize: data.leftBaseSize?.trim() || null,
      leftBled: data.leftBled?.trim() || null,
      quantity: parseFloat(data.quantity),
      unitPrice: parseFloat(data.unitPrice),
      subtotal: parseFloat(data.subtotal),
      discountPercentage: data.discountPercentage ? parseFloat(data.discountPercentage) : 0,
      taxAmount: data.taxAmount ? parseFloat(data.taxAmount) : 0,
      roundOff: data.roundOff ? parseFloat(data.roundOff) : 0,
      totalValue: parseFloat(data.totalValue),
      supplierInvoiceNo: data.supplierInvoiceNo?.trim() || null,
      purchaseType: data.purchaseType?.trim() || null,
      placeOfSupply: data.placeOfSupply?.trim() || null,
      itemDescription: data.itemDescription?.trim() || null,
      taxAccount: data.taxAccount?.trim() || null,
      orderDate: data.orderDate ? new Date(data.orderDate) : new Date(),
      expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null,
      actualDeliveryDate: data.actualDeliveryDate ? new Date(data.actualDeliveryDate) : null,
      status: data.status || 'PENDING',
      notes: data.notes?.trim() || null,
      narration: data.narration?.trim() || null,
      activeStatus: data.activeStatus !== undefined ? Boolean(data.activeStatus) : true,
      deleteStatus: false,
      createdBy: parseInt(data.createdBy),
      updatedBy: parseInt(data.createdBy),
    } : null
  };
};

/**
 * Validate update purchase order data
 */
export const validateUpdatePurchaseOrder = (data) => {
  const errors = [];

  // updatedBy is required for updates
  if (!data.updatedBy) {
    errors.push({ field: 'updatedBy', message: 'Updated by user ID is required' });
  } else if (!isValidInteger(data.updatedBy)) {
    errors.push({ field: 'updatedBy', message: 'Invalid updated by user ID' });
  }

  // Optional field validations (only if provided)
  if (data.vendorId !== undefined && !isValidInteger(data.vendorId)) {
    errors.push({ field: 'vendorId', message: 'Invalid vendor ID' });
  }

  if (data.quantity !== undefined && (!isValidFloat(data.quantity) || parseFloat(data.quantity) <= 0)) {
    errors.push({ field: 'quantity', message: 'Quantity must be greater than 0' });
  }

  if (data.unitPrice !== undefined && (!isValidFloat(data.unitPrice) || parseFloat(data.unitPrice) < 0)) {
    errors.push({ field: 'unitPrice', message: 'Unit price must be 0 or greater' });
  }

  if (data.subtotal !== undefined && (!isValidFloat(data.subtotal) || parseFloat(data.subtotal) < 0)) {
    errors.push({ field: 'subtotal', message: 'Subtotal must be 0 or greater' });
  }

  if (data.totalValue !== undefined && (!isValidFloat(data.totalValue) || parseFloat(data.totalValue) < 0)) {
    errors.push({ field: 'totalValue', message: 'Total value must be 0 or greater' });
  }

  if (data.discountPercentage !== undefined && !isValidFloat(data.discountPercentage)) {
    errors.push({ field: 'discountPercentage', message: 'Invalid discount percentage' });
  }

  if (data.taxAmount !== undefined && !isValidFloat(data.taxAmount)) {
    errors.push({ field: 'taxAmount', message: 'Invalid tax amount' });
  }

  if (data.roundOff !== undefined && !isValidFloat(data.roundOff)) {
    errors.push({ field: 'roundOff', message: 'Invalid round off value' });
  }

  if (data.orderDate !== undefined && !isValidDate(data.orderDate)) {
    errors.push({ field: 'orderDate', message: 'Invalid order date' });
  }

  if (data.expectedDeliveryDate !== undefined && !isValidDate(data.expectedDeliveryDate)) {
    errors.push({ field: 'expectedDeliveryDate', message: 'Invalid expected delivery date' });
  }

  if (data.actualDeliveryDate !== undefined && !isValidDate(data.actualDeliveryDate)) {
    errors.push({ field: 'actualDeliveryDate', message: 'Invalid actual delivery date' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate Excel upload data
 */
export const validateExcelUploadData = (data) => {
  const errors = [];

  if (!Array.isArray(data) || data.length === 0) {
    errors.push({ field: 'data', message: 'No data provided for upload' });
    return { isValid: false, errors };
  }

  const rowErrors = [];

  data.forEach((row, index) => {
    const rowNum = index + 1;

    // Check if purchase number exists
    if (!row.purchaseNumber || row.purchaseNumber.trim() === '') {
      rowErrors.push({
        row: rowNum,
        field: 'purchaseNumber',
        message: 'Purchase number is required'
      });
    }

    // Validate quantity
    if (!row.quantity || isNaN(parseFloat(row.quantity)) || parseFloat(row.quantity) <= 0) {
      rowErrors.push({
        row: rowNum,
        field: 'quantity',
        message: 'Valid quantity is required'
      });
    }

    // Validate rate
    if (!row.rate || isNaN(parseFloat(row.rate)) || parseFloat(row.rate) < 0) {
      rowErrors.push({
        row: rowNum,
        field: 'rate',
        message: 'Valid rate is required'
      });
    }

    // Validate supplier
    if (!row.supplier || row.supplier.trim() === '') {
      rowErrors.push({
        row: rowNum,
        field: 'supplier',
        message: 'Supplier is required'
      });
    }
  });

  return {
    isValid: rowErrors.length === 0,
    errors: rowErrors
  };
};
