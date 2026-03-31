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
 * Validate bulk lens selection item
 */
const validateBulkLensItem = (item, index) => {
  const itemErrors = [];
  
  if (!item.lens_id || !isValidInteger(item.lens_id)) {
    itemErrors.push({ 
      field: `lensBulkSelection[${index}].lens_id`, 
      message: 'Valid lens ID is required' 
    });
  }
  
  if (!item.quantity || !isValidFloat(item.quantity) || parseFloat(item.quantity) <= 0) {
    itemErrors.push({ 
      field: `lensBulkSelection[${index}].quantity`, 
      message: 'Quantity must be greater than 0' 
    });
  }
  
  if (!item.unitPrice || !isValidFloat(item.unitPrice) || parseFloat(item.unitPrice) < 0) {
    itemErrors.push({ 
      field: `lensBulkSelection[${index}].unitPrice`, 
      message: 'Unit price must be 0 or greater' 
    });
  }

  // Optional fields validation
  if (item.category_id && !isValidInteger(item.category_id)) {
    itemErrors.push({ 
      field: `lensBulkSelection[${index}].category_id`, 
      message: 'Invalid category ID' 
    });
  }

  if (item.coating_id && !isValidInteger(item.coating_id)) {
    itemErrors.push({ 
      field: `lensBulkSelection[${index}].coating_id`, 
      message: 'Invalid coating ID' 
    });
  }

  if (item.Type_id && !isValidInteger(item.Type_id)) {
    itemErrors.push({ 
      field: `lensBulkSelection[${index}].Type_id`, 
      message: 'Invalid type ID' 
    });
  }

  if (item.fitting_id && !isValidInteger(item.fitting_id)) {
    itemErrors.push({ 
      field: `lensBulkSelection[${index}].fitting_id`, 
      message: 'Invalid fitting ID' 
    });
  }

  if (item.dia_id && !isValidInteger(item.dia_id)) {
    itemErrors.push({ 
      field: `lensBulkSelection[${index}].dia_id`, 
      message: 'Invalid dia ID' 
    });
  }

  if (item.tinting_id && !isValidInteger(item.tinting_id)) {
    itemErrors.push({ 
      field: `lensBulkSelection[${index}].tinting_id`, 
      message: 'Invalid tinting ID' 
    });
  }
  
  return itemErrors;
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

  // orderType validation
  if (data.orderType && !['Single', 'Bulk'].includes(data.orderType)) {
    errors.push({ field: 'orderType', message: 'Order type must be either "Single" or "Bulk"' });
  }

  // lensBulkSelection validation for Bulk orders
  if (data.orderType === 'Bulk') {
    if (!data.lensBulkSelection) {
      errors.push({ field: 'lensBulkSelection', message: 'Bulk lens selection is required for bulk orders' });
    } else {
      try {
        const bulkData = typeof data.lensBulkSelection === 'string' 
          ? JSON.parse(data.lensBulkSelection) 
          : data.lensBulkSelection;
        
        if (!Array.isArray(bulkData) || bulkData.length === 0) {
          errors.push({ field: 'lensBulkSelection', message: 'Bulk lens selection must be a non-empty array' });
        } else {
          // Validate each bulk item
          bulkData.forEach((item, index) => {
            // Validate spherical and cylindrical values
            if (item.spherical === undefined || item.spherical === null) {
              errors.push({ field: `lensBulkSelection[${index}].spherical`, message: 'Spherical value is required for bulk item' });
            }
            if (item.cylindrical === undefined || item.cylindrical === null) {
              errors.push({ field: `lensBulkSelection[${index}].cylindrical`, message: 'Cylindrical value is required for bulk item' });
            }
            if (!item.quantity || parseFloat(item.quantity) <= 0) {
              errors.push({ field: `lensBulkSelection[${index}].quantity`, message: 'Valid quantity is required for bulk item' });
            }
            if (item.unitPrice !== undefined && parseFloat(item.unitPrice) < 0) {
              errors.push({ field: `lensBulkSelection[${index}].unitPrice`, message: 'Unit price cannot be negative' });
            }
          });
        }
      } catch (parseError) {
        errors.push({ field: 'lensBulkSelection', message: 'Invalid JSON format for bulk lens selection' });
      }
    }
  }

  // For Single orders, ensure individual lens fields are provided
  if (data.orderType === 'Single' || !data.orderType) {
    // Individual lens validation logic can be added here if needed
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
      orderType: data.orderType || 'Single',
      lensBulkSelection: data.orderType === 'Bulk' && data.lensBulkSelection 
        ? (typeof data.lensBulkSelection === 'string' 
           ? JSON.parse(data.lensBulkSelection) 
           : data.lensBulkSelection) 
        : null,
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

  // orderType validation
  if (data.orderType !== undefined && !['Single', 'Bulk'].includes(data.orderType)) {
    errors.push({ field: 'orderType', message: 'Order type must be either "Single" or "Bulk"' });
  }

  // lensBulkSelection validation for Bulk orders
  if (data.orderType === 'Bulk') {
    if (!data.lensBulkSelection) {
      errors.push({ field: 'lensBulkSelection', message: 'Bulk lens selection is required for bulk orders' });
    } else {
      try {
        const bulkData = typeof data.lensBulkSelection === 'string' 
          ? JSON.parse(data.lensBulkSelection) 
          : data.lensBulkSelection;
        
        if (!Array.isArray(bulkData) || bulkData.length === 0) {
          errors.push({ field: 'lensBulkSelection', message: 'Bulk lens selection must be a non-empty array' });
        } else {
          // Validate each bulk item
          bulkData.forEach((item, index) => {
            // Validate spherical and cylindrical values
            if (item.spherical === undefined || item.spherical === null) {
              errors.push({ field: `lensBulkSelection[${index}].spherical`, message: 'Spherical value is required for bulk item' });
            }
            if (item.cylindrical === undefined || item.cylindrical === null) {
              errors.push({ field: `lensBulkSelection[${index}].cylindrical`, message: 'Cylindrical value is required for bulk item' });
            }
            if (!item.quantity || parseFloat(item.quantity) <= 0) {
              errors.push({ field: `lensBulkSelection[${index}].quantity`, message: 'Valid quantity is required for bulk item' });
            }
            if (item.unitPrice !== undefined && parseFloat(item.unitPrice) < 0) {
              errors.push({ field: `lensBulkSelection[${index}].unitPrice`, message: 'Unit price cannot be negative' });
            }
          });
        }
      } catch (parseError) {
        errors.push({ field: 'lensBulkSelection', message: 'Invalid JSON format for bulk lens selection' });
      }
    }
  }

  let parsedBulkSelection;
  if (data.lensBulkSelection !== undefined && data.lensBulkSelection !== null) {
    try {
      parsedBulkSelection = typeof data.lensBulkSelection === 'string'
        ? JSON.parse(data.lensBulkSelection)
        : data.lensBulkSelection;
    } catch (parseError) {
      parsedBulkSelection = undefined;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? {
      ...(data.poNumber !== undefined ? { poNumber: data.poNumber?.trim() || null } : {}),
      ...(data.reference_id !== undefined ? { reference_id: data.reference_id?.trim() || null } : {}),
      ...(data.vendorId !== undefined ? { vendorId: parseInt(data.vendorId) } : {}),
      ...(data.saleOrderId !== undefined ? { saleOrderId: data.saleOrderId ? parseInt(data.saleOrderId) : null } : {}),
      ...(data.lens_id !== undefined ? { lens_id: data.lens_id ? parseInt(data.lens_id) : null } : {}),
      ...(data.category_id !== undefined ? { category_id: data.category_id ? parseInt(data.category_id) : null } : {}),
      ...(data.Type_id !== undefined ? { Type_id: data.Type_id ? parseInt(data.Type_id) : null } : {}),
      ...(data.dia_id !== undefined ? { dia_id: data.dia_id ? parseInt(data.dia_id) : null } : {}),
      ...(data.fitting_id !== undefined ? { fitting_id: data.fitting_id ? parseInt(data.fitting_id) : null } : {}),
      ...(data.coating_id !== undefined ? { coating_id: data.coating_id ? parseInt(data.coating_id) : null } : {}),
      ...(data.tinting_id !== undefined ? { tinting_id: data.tinting_id ? parseInt(data.tinting_id) : null } : {}),
      ...(data.rightEye !== undefined ? { rightEye: Boolean(data.rightEye) } : {}),
      ...(data.leftEye !== undefined ? { leftEye: Boolean(data.leftEye) } : {}),
      ...(data.rightSpherical !== undefined ? { rightSpherical: data.rightSpherical?.trim() || null } : {}),
      ...(data.rightCylindrical !== undefined ? { rightCylindrical: data.rightCylindrical?.trim() || null } : {}),
      ...(data.rightAxis !== undefined ? { rightAxis: data.rightAxis?.trim() || null } : {}),
      ...(data.rightAdd !== undefined ? { rightAdd: data.rightAdd?.trim() || null } : {}),
      ...(data.rightDia !== undefined ? { rightDia: data.rightDia?.trim() || null } : {}),
      ...(data.rightBase !== undefined ? { rightBase: data.rightBase?.trim() || null } : {}),
      ...(data.rightBaseSize !== undefined ? { rightBaseSize: data.rightBaseSize?.trim() || null } : {}),
      ...(data.rightBled !== undefined ? { rightBled: data.rightBled?.trim() || null } : {}),
      ...(data.leftSpherical !== undefined ? { leftSpherical: data.leftSpherical?.trim() || null } : {}),
      ...(data.leftCylindrical !== undefined ? { leftCylindrical: data.leftCylindrical?.trim() || null } : {}),
      ...(data.leftAxis !== undefined ? { leftAxis: data.leftAxis?.trim() || null } : {}),
      ...(data.leftAdd !== undefined ? { leftAdd: data.leftAdd?.trim() || null } : {}),
      ...(data.leftDia !== undefined ? { leftDia: data.leftDia?.trim() || null } : {}),
      ...(data.leftBase !== undefined ? { leftBase: data.leftBase?.trim() || null } : {}),
      ...(data.leftBaseSize !== undefined ? { leftBaseSize: data.leftBaseSize?.trim() || null } : {}),
      ...(data.leftBled !== undefined ? { leftBled: data.leftBled?.trim() || null } : {}),
      ...(data.quantity !== undefined ? { quantity: parseFloat(data.quantity) } : {}),
      ...(data.unitPrice !== undefined ? { unitPrice: parseFloat(data.unitPrice) } : {}),
      ...(data.subtotal !== undefined ? { subtotal: parseFloat(data.subtotal) } : {}),
      ...(data.discountPercentage !== undefined ? { discountPercentage: parseFloat(data.discountPercentage) || 0 } : {}),
      ...(data.taxAmount !== undefined ? { taxAmount: parseFloat(data.taxAmount) || 0 } : {}),
      ...(data.roundOff !== undefined ? { roundOff: parseFloat(data.roundOff) || 0 } : {}),
      ...(data.totalValue !== undefined ? { totalValue: parseFloat(data.totalValue) } : {}),
      ...(data.supplierInvoiceNo !== undefined ? { supplierInvoiceNo: data.supplierInvoiceNo?.trim() || null } : {}),
      ...(data.purchaseType !== undefined ? { purchaseType: data.purchaseType?.trim() || null } : {}),
      ...(data.placeOfSupply !== undefined ? { placeOfSupply: data.placeOfSupply?.trim() || null } : {}),
      ...(data.itemDescription !== undefined ? { itemDescription: data.itemDescription?.trim() || null } : {}),
      ...(data.taxAccount !== undefined ? { taxAccount: data.taxAccount?.trim() || null } : {}),
      ...(data.orderDate !== undefined ? { orderDate: data.orderDate ? new Date(data.orderDate) : null } : {}),
      ...(data.expectedDeliveryDate !== undefined ? { expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null } : {}),
      ...(data.actualDeliveryDate !== undefined ? { actualDeliveryDate: data.actualDeliveryDate ? new Date(data.actualDeliveryDate) : null } : {}),
      ...(data.orderType !== undefined ? { orderType: data.orderType || 'Single' } : {}),
      ...(data.lensBulkSelection !== undefined ? { lensBulkSelection: parsedBulkSelection ?? null } : {}),
      ...(data.status !== undefined ? { status: data.status || 'DRAFT' } : {}),
      ...(data.notes !== undefined ? { notes: data.notes?.trim() || null } : {}),
      ...(data.narration !== undefined ? { narration: data.narration?.trim() || null } : {}),
      ...(data.activeStatus !== undefined ? { activeStatus: Boolean(data.activeStatus) } : {}),
      updatedBy: parseInt(data.updatedBy),
    } : null
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
