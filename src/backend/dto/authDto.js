/**
 * Authentication Data Transfer Objects (DTOs)
 * Validation functions for authentication-related requests
 */

/**
 * Validate login request
 * @param {Object} data - Request data
 * @returns {Object} Validation result
 */
export const validateLogin = (data) => {
  const errors = [];

  // Email or usercode is required
  if (!data.emailOrUsercode) {
    errors.push('Email or usercode is required');
  } else if (typeof data.emailOrUsercode !== 'string') {
    errors.push('Email or usercode must be a string');
  } else if (data.emailOrUsercode.trim().length === 0) {
    errors.push('Email or usercode cannot be empty');
  }

  // Password is required
  if (!data.password) {
    errors.push('Password is required');
  } else if (typeof data.password !== 'string') {
    errors.push('Password must be a string');
  } else if (data.password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? {
      emailOrUsercode: data.emailOrUsercode.trim(),
      password: data.password
    } : null
  };
};

/**
 * Validate refresh token request
 * @param {Object} data - Request data
 * @returns {Object} Validation result
 */
export const validateRefreshToken = (data) => {
  const errors = [];

  // Refresh token is required
  if (!data.refreshToken) {
    errors.push('Refresh token is required');
  } else if (typeof data.refreshToken !== 'string') {
    errors.push('Refresh token must be a string');
  } else if (data.refreshToken.trim().length === 0) {
    errors.push('Refresh token cannot be empty');
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? {
      refreshToken: data.refreshToken.trim()
    } : null
  };
};

/**
 * Validate change password request
 * @param {Object} data - Request data
 * @returns {Object} Validation result
 */
export const validateChangePassword = (data) => {
  const errors = [];

  // Current password is required
  if (!data.currentPassword) {
    errors.push('Current password is required');
  } else if (typeof data.currentPassword !== 'string') {
    errors.push('Current password must be a string');
  }

  // New password is required
  if (!data.newPassword) {
    errors.push('New password is required');
  } else if (typeof data.newPassword !== 'string') {
    errors.push('New password must be a string');
  } else if (data.newPassword.length < 6) {
    errors.push('New password must be at least 6 characters long');
  } else if (data.newPassword.length > 100) {
    errors.push('New password cannot exceed 100 characters');
  }

  // Confirm password is required
  if (!data.confirmPassword) {
    errors.push('Confirm password is required');
  } else if (data.newPassword !== data.confirmPassword) {
    errors.push('New password and confirm password do not match');
  }

  // Check password strength (optional but recommended)
  if (data.newPassword && typeof data.newPassword === 'string') {
    const hasUpperCase = /[A-Z]/.test(data.newPassword);
    const hasLowerCase = /[a-z]/.test(data.newPassword);
    const hasNumbers = /\d/.test(data.newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(data.newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      errors.push('New password must contain at least one uppercase letter, one lowercase letter, and one number');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? {
      currentPassword: data.currentPassword,
      newPassword: data.newPassword
    } : null
  };
};

/**
 * Validate forgot password request
 * @param {Object} data - Request data
 * @returns {Object} Validation result
 */
export const validateForgotPassword = (data) => {
  const errors = [];

  // Email is required
  if (!data.email) {
    errors.push('Email is required');
  } else if (typeof data.email !== 'string') {
    errors.push('Email must be a string');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email.trim())) {
      errors.push('Invalid email format');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? {
      email: data.email.trim().toLowerCase()
    } : null
  };
};

/**
 * Validate reset password request
 * @param {Object} data - Request data
 * @returns {Object} Validation result
 */
export const validateResetPassword = (data) => {
  const errors = [];

  // Reset token is required
  if (!data.token) {
    errors.push('Reset token is required');
  } else if (typeof data.token !== 'string') {
    errors.push('Reset token must be a string');
  }

  // New password is required
  if (!data.password) {
    errors.push('Password is required');
  } else if (typeof data.password !== 'string') {
    errors.push('Password must be a string');
  } else if (data.password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  } else if (data.password.length > 100) {
    errors.push('Password cannot exceed 100 characters');
  }

  // Confirm password is required
  if (!data.confirmPassword) {
    errors.push('Confirm password is required');
  } else if (data.password !== data.confirmPassword) {
    errors.push('Password and confirm password do not match');
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? {
      token: data.token,
      password: data.password
    } : null
  };
};

/**
 * Validate user ID parameter
 * @param {string|number} id - User ID
 * @returns {Object} Validation result
 */
export const validateUserId = (id) => {
  const errors = [];

  if (!id) {
    errors.push('User ID is required');
  } else {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId) || numericId <= 0) {
      errors.push('User ID must be a positive integer');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? parseInt(id, 10) : null
  };
};

/**
 * Sanitize user object for response (remove sensitive data)
 * @param {Object} user - User object
 * @returns {Object} Sanitized user object
 */
export const sanitizeUserResponse = (user) => {
  if (!user) return null;

  const { password, createdBy, updatedBy, ...sanitizedUser } = user;
  return sanitizedUser;
};

/**
 * Validate token from Authorization header
 * @param {string} authHeader - Authorization header
 * @returns {Object} Validation result
 */
export const validateAuthorizationHeader = (authHeader) => {
  const errors = [];

  if (!authHeader) {
    errors.push('Authorization header is required');
  } else if (!authHeader.startsWith('Bearer ')) {
    errors.push('Authorization header must start with "Bearer "');
  } else {
    const token = authHeader.split(' ')[1];
    if (!token) {
      errors.push('Token is required in Authorization header');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? authHeader.split(' ')[1] : null
  };
};