/**
 * User Master DTO Validation Functions
 * Manual validation for User Master API operations
 */

/**
 * Validate email format
 */
const isValidEmail = (email) => {
    if (!email) return false; // Required field for users
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
 * Validate blood group
 */
const isValidBloodGroup = (bloodGroup) => {
    const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    return validBloodGroups.includes(bloodGroup);
};

/**
 * Validate create user master data
 */
export const validateCreateUserMaster = (data) => {
    const errors = [];

    // Required fields validation
    if (!data.name || data.name.trim() === '') {
        errors.push({ field: 'name', message: 'Name is required' });
    } else if (!isValidLength(data.name, 1, 200)) {
        errors.push({ field: 'name', message: 'Name must be between 1 and 200 characters' });
    }

    if (!data.usercode || data.usercode.trim() === '') {
        errors.push({ field: 'usercode', message: 'User code is required' });
    } else if (!isValidLength(data.usercode, 1, 50)) {
        errors.push({ field: 'usercode', message: 'User code must be between 1 and 50 characters' });
    }

    if (!data.email || data.email.trim() === '') {
        errors.push({ field: 'email', message: 'Email is required' });
    } else if (!isValidEmail(data.email)) {
        errors.push({ field: 'email', message: 'Invalid email format' });
    }

    if (!data.password || data.password.trim() === '') {
        errors.push({ field: 'password', message: 'Password is required' });
    } else if (!isValidLength(data.password, 6, 100)) {
        errors.push({ field: 'password', message: 'Password must be between 6 and 100 characters' });
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
    if (data.phonenumber && !isValidPhone(data.phonenumber)) {
        errors.push({ field: 'phonenumber', message: 'Phone number must be between 10 and 15 digits' });
    }

    if (data.alternatenumber && !isValidPhone(data.alternatenumber)) {
        errors.push({ field: 'alternatenumber', message: 'Alternate number must be between 10 and 15 digits' });
    }

    if (data.bloodgroup && !isValidBloodGroup(data.bloodgroup)) {
        errors.push({ field: 'bloodgroup', message: 'Invalid blood group. Must be one of: A+, A-, B+, B-, AB+, AB-, O+, O-' });
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

    if (data.roleId !== undefined && data.roleId !== null && data.roleId !== '') {
        const roleId = parseInt(data.roleId);
        if (isNaN(roleId) || roleId <= 0) {
            errors.push({ field: 'roleId', message: 'Role ID must be a valid positive number' });
        }
    }

    if (data.department_id !== undefined && data.department_id !== null && data.department_id !== '') {
        const deptId = parseInt(data.department_id);
        if (isNaN(deptId) || deptId <= 0) {
            errors.push({ field: 'department_id', message: 'Department ID must be a valid positive number' });
        }
    }

    if (data.salary !== undefined && data.salary !== null && data.salary !== '') {
        const salary = parseFloat(data.salary);
        if (isNaN(salary) || salary < 0) {
            errors.push({ field: 'salary', message: 'Salary must be a valid positive number' });
        }
    }

    if (data.active_status !== undefined && typeof data.active_status !== 'boolean') {
        errors.push({ field: 'active_status', message: 'Active status must be a boolean value' });
    }

    return {
        isValid: errors.length === 0,
        errors,
        data: errors.length === 0 ? {
            name: data.name?.trim(),
            usercode: data.usercode?.trim(),
            email: data.email?.trim(),
            password: data.password?.trim(), // Will be hashed in service
            phonenumber: data.phonenumber?.trim() || null,
            alternatenumber: data.alternatenumber?.trim() || null,
            bloodgroup: data.bloodgroup?.trim() || null,
            address: data.address?.trim() || null,
            city: data.city?.trim() || null,
            state: data.state?.trim() || null,
            pincode: data.pincode?.trim() || null,
            roleId: data.roleId ? parseInt(data.roleId) : null,
            department_id: data.department_id ? parseInt(data.department_id) : null,
            salary: data.salary ? parseFloat(data.salary) : null,
            active_status: data.active_status !== undefined ? data.active_status : true,
            delete_status: false, // Default to false for new records
            createdBy: parseInt(data.createdBy),
            updatedBy: parseInt(data.createdBy) // For create, updatedBy is same as createdBy
        } : null
    };
};

/**
 * Validate update user master data
 */
export const validateUpdateUserMaster = (data) => {
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

    if (data.email !== undefined) {
        if (!data.email || data.email.trim() === '') {
            errors.push({ field: 'email', message: 'Email cannot be empty' });
        } else if (!isValidEmail(data.email)) {
            errors.push({ field: 'email', message: 'Invalid email format' });
        }
    }

    if (data.password !== undefined && data.password !== '') {
        if (!isValidLength(data.password, 6, 100)) {
            errors.push({ field: 'password', message: 'Password must be between 6 and 100 characters' });
        }
    }

    if (data.phonenumber !== undefined && data.phonenumber && !isValidPhone(data.phonenumber)) {
        errors.push({ field: 'phonenumber', message: 'Phone number must be between 10 and 15 digits' });
    }

    if (data.alternatenumber !== undefined && data.alternatenumber && !isValidPhone(data.alternatenumber)) {
        errors.push({ field: 'alternatenumber', message: 'Alternate number must be between 10 and 15 digits' });
    }

    if (data.bloodgroup !== undefined && data.bloodgroup && !isValidBloodGroup(data.bloodgroup)) {
        errors.push({ field: 'bloodgroup', message: 'Invalid blood group. Must be one of: A+, A-, B+, B-, AB+, AB-, O+, O-' });
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

    if (data.roleId !== undefined && data.roleId !== null && data.roleId !== '') {
        const roleId = parseInt(data.roleId);
        if (isNaN(roleId) || roleId <= 0) {
            errors.push({ field: 'roleId', message: 'Role ID must be a valid positive number' });
        }
    }

    if (data.department_id !== undefined && data.department_id !== null && data.department_id !== '') {
        const deptId = parseInt(data.department_id);
        if (isNaN(deptId) || deptId <= 0) {
            errors.push({ field: 'department_id', message: 'Department ID must be a valid positive number' });
        }
    }

    if (data.salary !== undefined && data.salary !== null && data.salary !== '') {
        const salary = parseFloat(data.salary);
        if (isNaN(salary) || salary < 0) {
            errors.push({ field: 'salary', message: 'Salary must be a valid positive number' });
        }
    }

    if (data.active_status !== undefined && typeof data.active_status !== 'boolean') {
        errors.push({ field: 'active_status', message: 'Active status must be a boolean value' });
    }

    const cleanedData = {};
    Object.keys(data).forEach(key => {
        if (data[key] !== undefined) {
            if (key === 'updatedBy') {
                cleanedData[key] = parseInt(data[key]);
            } else if (key === 'roleId' || key === 'department_id') {
                cleanedData[key] = (data[key] ? parseInt(data[key]) : null);
            } else if (key === 'salary') {
                cleanedData[key] = (data[key] ? parseFloat(data[key]) : null);
            } else if (typeof data[key] === 'string') {
                cleanedData[key] = data[key].trim();
                // Set null for empty strings on optional fields
                if ((key === 'phonenumber' || key === 'alternatenumber' || key === 'bloodgroup' || key === 'address' || key === 'city' || key === 'state' || key === 'pincode') && !cleanedData[key]) {
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

    const validSortFields = ['name', 'usercode', 'email', 'city', 'active_status', 'createdAt'];
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
            usercode: query.usercode,
            email: query.email,
            phonenumber: query.phonenumber,
            city: query.city,
            roleId: query.roleId ? parseInt(query.roleId) : undefined,
            department_id: query.department_id ? parseInt(query.department_id) : undefined,
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
 * Validate user email check request
 */
export const validateCheckUserEmail = (data) => {
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

/**
 * Validate user code check request
 */
export const validateCheckUserCode = (data) => {
    const errors = [];

    if (!data.usercode || data.usercode.trim() === '') {
        errors.push({ field: 'usercode', message: 'User code is required' });
    } else if (!isValidLength(data.usercode, 1, 50)) {
        errors.push({ field: 'usercode', message: 'User code must be between 1 and 50 characters' });
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
            usercode: data.usercode.trim(),
            excludeId: data.excludeId ? parseInt(data.excludeId) : null
        } : null
    };
};

export default {
    validateCreateUserMaster,
    validateUpdateUserMaster,
    validateQueryParams,
    validateIdParam,
    validateCheckUserEmail,
    validateCheckUserCode
};