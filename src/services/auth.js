import { apiClient } from './apiClient';

/**
 * Login with username and password
 * @param {string} username - User's username
 * @param {string} password - User's password
 * @returns {Promise<Object>} Login response with tokens and user data
 */
export async function login(username, password) {
  const response = await apiClient('post', '/auth/login', {
    data: {
      username,
      password,
    },
  });

  if (response.success && response.data) {
    // Store tokens and user data
    localStorage.setItem('lens_management_token', response.data.accessToken);
    localStorage.setItem('lens_management_refresh_token', response.data.refreshToken);
    localStorage.setItem('lens_management_user', JSON.stringify(response.data.user));
  }

  return response;
}

/**
 * Logout current user
 * Clears all auth data from localStorage
 */
export function logout() {
  localStorage.removeItem('lens_management_token');
  localStorage.removeItem('lens_management_refresh_token');
  localStorage.removeItem('lens_management_user');
}

/**
 * Get current user from localStorage
 * @returns {Object|null} Current user object or null if not logged in
 */
export function getCurrentUser() {
  const userStr = localStorage.getItem('lens_management_user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Failed to parse user data:', error);
    return null;
  }
}

/**
 * Check if user is authenticated
 * @returns {boolean} True if user has valid token
 */
export function isAuthenticated() {
  const token = localStorage.getItem('lens_management_token');
  const user = getCurrentUser();
  return !!(token && user);
}

/**
 * Refresh access token using refresh token
 * @returns {Promise<Object>} New tokens
 */
export async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('lens_management_refresh_token');
  
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await apiClient('post', '/auth/refresh', {
    data: {
      refreshToken,
    },
  });

  if (response.success && response.data) {
    // Update tokens
    localStorage.setItem('lens_management_token', response.data.accessToken);
    localStorage.setItem('lens_management_refresh_token', response.data.refreshToken);
  }

  return response;
}
