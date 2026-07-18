import { apiClient } from './apiClient';

const API_BASE = import.meta.env.VITE_WEB_API_URL || 'http://localhost:5001/api';
const PROACTIVE_SKEW_MS = 60 * 1000;

let proactiveTimer = null;

function clearLocalAuth() {
  localStorage.removeItem('lens_management_token');
  localStorage.removeItem('lens_management_refresh_token');
  localStorage.removeItem('lens_management_user');
}

/**
 * Best-effort server session revoke via refresh token (no axios interceptor).
 * Works even when the access token is expired or missing.
 */
async function revokeSessionBestEffort({ refreshToken, accessToken } = {}) {
  const body = {};
  if (refreshToken) body.refreshToken = refreshToken;

  // Nothing to send — skip network call
  if (!refreshToken && !accessToken) return;

  try {
    const headers = {
      'Content-Type': 'application/json',
      Device: 'Web',
    };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  } catch (_) {
    // Ignore — local clear always proceeds
  }
}

/**
 * Decode JWT payload `exp` (ms since epoch), or null if unreadable.
 */
function decodeJwtExpMs(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * Silent renew via fetch (avoids axios interceptor / refresh lock).
 */
async function silentRefreshViaFetch() {
  const refreshToken = localStorage.getItem('lens_management_refresh_token');
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Device: 'Web',
    },
    body: JSON.stringify({ refreshToken }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.success || !data.data?.accessToken) {
    throw new Error(data.message || 'Token refresh failed');
  }

  localStorage.setItem('lens_management_token', data.data.accessToken);
  if (data.data.refreshToken) {
    localStorage.setItem('lens_management_refresh_token', data.data.refreshToken);
  }

  return data;
}

function scheduleProactiveRefresh() {
  stopProactiveRefresh();

  const accessToken = localStorage.getItem('lens_management_token');
  const refreshToken = localStorage.getItem('lens_management_refresh_token');
  if (!accessToken || !refreshToken || !getCurrentUser()) return;

  const expMs = decodeJwtExpMs(accessToken);
  if (!expMs) return;

  const delay = Math.max(expMs - Date.now() - PROACTIVE_SKEW_MS, 0);

  proactiveTimer = setTimeout(async () => {
    try {
      await silentRefreshViaFetch();
      scheduleProactiveRefresh();
    } catch (_) {
      await forceLogout();
    }
  }, delay);
}

/**
 * Start proactive access-token refresh (call while authenticated).
 */
export function startProactiveRefresh() {
  scheduleProactiveRefresh();
}

/**
 * Clear the proactive refresh timer (call on logout).
 */
export function stopProactiveRefresh() {
  if (proactiveTimer != null) {
    clearTimeout(proactiveTimer);
    proactiveTimer = null;
  }
}

/**
 * Forced logout: best-effort revoke, clear local auth, fire session-expired.
 * Used when refresh is dead or silent renew fails.
 */
export async function forceLogout() {
  stopProactiveRefresh();

  const refreshToken = localStorage.getItem('lens_management_refresh_token');
  const accessToken = localStorage.getItem('lens_management_token');

  await revokeSessionBestEffort({ refreshToken, accessToken });
  clearLocalAuth();
  window.dispatchEvent(new CustomEvent('auth:session-expired'));
}

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
    startProactiveRefresh();
  }

  return response;
}

/**
 * Logout current user
 * Revokes server session via refresh token even when access is expired/missing.
 * Always clears local auth in finally.
 */
export async function logout() {
  stopProactiveRefresh();

  const refreshToken = localStorage.getItem('lens_management_refresh_token');
  const accessToken = localStorage.getItem('lens_management_token');

  try {
    await revokeSessionBestEffort({ refreshToken, accessToken });
  } finally {
    clearLocalAuth();
  }
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
    startProactiveRefresh();
  }

  return response;
}
