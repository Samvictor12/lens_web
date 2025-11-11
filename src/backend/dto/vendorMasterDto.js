/**
 * Vendor Master DTO Validation Functions
 * Manual validation for Vendor Master API operations
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
 * Validate create vendor master data
 */
export const validateCreateVendorMaster = (data) => {
    const errors = [];

    // Required fields validation
    if (!data.name || data.name.trim() === '') {
        errors.push({ field: 'name', message: 'Name is required' });
    } else if (!isValidLength(data.name, 1, 200)) {
        errors.push({ field: 'name', message: 'Name must be between 1 and 200 characters' });
    }

    if (!data.code || data.code.trim() === '') {
        errors.push({ field: 'code', message: 'Vendor code is required' });
    } else if (!isValidLength(data.code, 1, 50)) {
        errors.push({ field: 'code', message: 'Vendor code must be between 1 and 50 characters' });
    }

    if (!data.email || data.email.trim() === '') {
        errors.push({ field: 'email', message: 'Email is required' });
    } else if (!isValidEmail(data.email)) {
        errors.push({ field: 'email', message: 'Invalid email format' });
    }

    if (!data.createdBy) {
        errors.push({ field: 'createdBy', message: 'Created by user ID is required' });
    } else {
        const createdBy = parseInt(data.createdBy);
        if (isNaN(createdBy) || createdBy <= 0) {
            errors.push({ field: 'createdBy', message: 'Created by must be a valid user ID' });
        }
    }

    // Optional fields validation
    if (data.shopname && !isValidLength(data.shopname, 0, 200)) {
        errors.push({ field: 'shopname', message: 'Shop name must not exceed 200 characters' });
    }

    if (data.phone && !isValidPhone(data.phone)) {
        errors.push({ field: 'phone', message: 'Phone number must be between 10 and 15 digits' });
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

    if (data.category && !isValidLength(data.category, 0, 100)) {
        errors.push({ field: 'category', message: 'Category must not exceed 100 characters' });
    }

    if (data.gstin && !isValidLength(data.gstin, 0, 15)) {
        errors.push({ field: 'gstin', message: 'GSTIN must not exceed 15 characters' });
    }

    if (data.active_status !== undefined && typeof data.active_status !== 'boolean') {
        errors.push({ field: 'active_status', message: 'Active status must be a boolean value' });
    }

    if (data.notes && !isValidLength(data.notes, 0, 1000)) {
        errors.push({ field: 'notes', message: 'Notes must not exceed 1000 characters' });
    }

    return {
        isValid: errors.length === 0,
        errors,
        data: errors.length === 0 ? {
            name: data.name?.trim(),
            code: data.code?.trim(),
            shopname: data.shopname?.trim() || null,
            phone: data.phone?.trim() || null,
            email: data.email?.trim(),
            address: data.address?.trim() || null,
            city: data.city?.trim() || null,
            state: data.state?.trim() || null,
            pincode: data.pincode?.trim() || null,
            category: data.category?.trim() || null,
            gstin: data.gstin?.trim() || null,
            active_status: data.active_status !== undefined ? data.active_status : true, // Default to true
            delete_status: false, // Default to false for new records
            notes: data.notes?.trim() || null,
            createdBy: parseInt(data.createdBy)
        } : null
    };
};

/**
 * Validate update vendor master data
 */
export const validateUpdateVendorMaster = (data) => {
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
    if (data.name !== undefined) {
        if (!data.name || data.name.trim() === '') {
            errors.push({ field: 'name', message: 'Name cannot be empty' });
        } else if (!isValidLength(data.name, 1, 200)) {
            errors.push({ field: 'name', message: 'Name must be between 1 and 200 characters' });
        }
    }

    if (data.shopname !== undefined && data.shopname && !isValidLength(data.shopname, 0, 200)) {
        errors.push({ field: 'shopname', message: 'Shop name must not exceed 200 characters' });
    }

    if (data.phone !== undefined && data.phone && !isValidPhone(data.phone)) {
        errors.push({ field: 'phone', message: 'Phone number must be between 10 and 15 digits' });
    }

    if (data.email !== undefined) {
        if (!data.email || data.email.trim() === '') {
            errors.push({ field: 'email', message: 'Email cannot be empty' });
        } else if (!isValidEmail(data.email)) {
            errors.push({ field: 'email', message: 'Invalid email format' });
        }
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

    if (data.category !== undefined && data.category && !isValidLength(data.category, 0, 100)) {
        errors.push({ field: 'category', message: 'Category must not exceed 100 characters' });
    }

    if (data.gstin !== undefined && data.gstin && !isValidLength(data.gstin, 0, 15)) {
        errors.push({ field: 'gstin', message: 'GSTIN must not exceed 15 characters' });
    }

    if (data.active_status !== undefined && typeof data.active_status !== 'boolean') {
        errors.push({ field: 'active_status', message: 'Active status must be a boolean value' });
    }

    if (data.notes !== undefined && data.notes && !isValidLength(data.notes, 0, 1000)) {
        errors.push({ field: 'notes', message: 'Notes must not exceed 1000 characters' });
    }

    const cleanedData = {};
    Object.keys(data).forEach(key => {
        if (data[key] !== undefined) {
            if (key === 'updatedBy') {
                cleanedData[key] = parseInt(data[key]);
            } else if (typeof data[key] === 'string') {
                cleanedData[key] = data[key].trim();
                // Set null for empty strings on optional fields
                if ((key === 'shopname' || key === 'phone' || key === 'address' || key === 'city' || key === 'state' || key === 'pincode' || key === 'category' || key === 'gstin' || key === 'notes') && !cleanedData[key]) {
                    cleanedData[key] = null;
                }
            } else if (key === 'active_status' || key === 'delete_status') {
                cleanedData[key] = Boolean(data[key]);
            } else {
                cleanedData[key] = data[key];
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

    const validSortFields = ['name', 'code', 'email', 'city', 'category', 'active_status', 'createdAt'];
    const sortBy = query.sortBy || 'createdAt';
    if (!validSortFields.includes(sortBy)) {
        errors.push({ field: 'sortBy', message: 'sort field must be one of ' + validSortFields.join(', ') });
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
            code: query.code,
            email: query.email,
            phone: query.phone,
            city: query.city,
            category: query.category,
            active_status: query.active_status === 'true' ? true : query.active_status === 'false' ? false : undefined,
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
 * Validate vendor email check request
 */
export const validateCheckVendorEmail = (data) => {
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
    validateCreateVendorMaster,
    validateUpdateVendorMaster,
    validateQueryParams,
    validateIdParam,
    validateCheckVendorEmail
};