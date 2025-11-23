/**
 * Inventory Masters DTO Validation Functions
 * Validation for LocationMaster and TrayMaster API operations
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
 * Validate Location Master Create
 */
export const validateCreateLocation = (data) => {
  const errors = [];

  if (!data.name || data.name.trim() === '') {
    errors.push({ field: 'name', message: 'Location name is required' });
  } else if (!isValidLength(data.name, 1, 200)) {
    errors.push({ field: 'name', message: 'Location name must be between 1 and 200 characters' });
  }

  if (!data.location_code || data.location_code.trim() === '') {
    errors.push({ field: 'location_code', message: 'Location code is required' });
  } else if (!isValidLength(data.location_code, 1, 50)) {
    errors.push({ field: 'location_code', message: 'Location code must be between 1 and 50 characters' });
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
 * Validate Location Master Update
 */
export const validateUpdateLocation = (data) => {
  const errors = [];

  if (data.name && !isValidLength(data.name, 1, 200)) {
    errors.push({ field: 'name', message: 'Location name must be between 1 and 200 characters' });
  }

  if (data.location_code && !isValidLength(data.location_code, 1, 50)) {
    errors.push({ field: 'location_code', message: 'Location code must be between 1 and 50 characters' });
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
 * Validate Tray Master Create
 */
export const validateCreateTray = (data) => {
  const errors = [];

  if (!data.name || data.name.trim() === '') {
    errors.push({ field: 'name', message: 'Tray name is required' });
  } else if (!isValidLength(data.name, 1, 200)) {
    errors.push({ field: 'name', message: 'Tray name must be between 1 and 200 characters' });
  }

  if (!data.tray_code || data.tray_code.trim() === '') {
    errors.push({ field: 'tray_code', message: 'Tray code is required' });
  } else if (!isValidLength(data.tray_code, 1, 50)) {
    errors.push({ field: 'tray_code', message: 'Tray code must be between 1 and 50 characters' });
  }

  if (data.description && !isValidLength(data.description, 0, 500)) {
    errors.push({ field: 'description', message: 'Description must not exceed 500 characters' });
  }

  if (data.capacity !== undefined && data.capacity !== null) {
    if (!isValidNumber(data.capacity)) {
      errors.push({ field: 'capacity', message: 'Capacity must be a valid number' });
    } else if (data.capacity < 0) {
      errors.push({ field: 'capacity', message: 'Capacity cannot be negative' });
    }
  }

  if (data.location_id !== undefined && data.location_id !== null && !isValidNumber(data.location_id)) {
    errors.push({ field: 'location_id', message: 'Location ID must be a valid number' });
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
 * Validate Tray Master Update
 */
export const validateUpdateTray = (data) => {
  const errors = [];

  if (data.name && !isValidLength(data.name, 1, 200)) {
    errors.push({ field: 'name', message: 'Tray name must be between 1 and 200 characters' });
  }

  if (data.tray_code && !isValidLength(data.tray_code, 1, 50)) {
    errors.push({ field: 'tray_code', message: 'Tray code must be between 1 and 50 characters' });
  }

  if (data.description && !isValidLength(data.description, 0, 500)) {
    errors.push({ field: 'description', message: 'Description must not exceed 500 characters' });
  }

  if (data.capacity !== undefined && data.capacity !== null) {
    if (!isValidNumber(data.capacity)) {
      errors.push({ field: 'capacity', message: 'Capacity must be a valid number' });
    } else if (data.capacity < 0) {
      errors.push({ field: 'capacity', message: 'Capacity cannot be negative' });
    }
  }

  if (data.location_id !== undefined && data.location_id !== null && !isValidNumber(data.location_id)) {
    errors.push({ field: 'location_id', message: 'Location ID must be a valid number' });
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
