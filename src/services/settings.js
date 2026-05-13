import { apiClient } from './apiClient';

// Public \u2014 no auth required, used by customer portal
export async function getPublicCompanySettings() {
  return apiClient('get', '/settings/public/company');
}

export async function getCompanySettings() {
  return apiClient('get', '/settings/company');
}

export async function updateCompanySettings(data) {
  return apiClient('put', '/settings/company', { data });
}

export async function getMyProfile() {
  return apiClient('get', '/settings/me');
}

export async function updateMyProfile(data) {
  return apiClient('put', '/settings/me', { data });
}

export async function updateCredentials(data) {
  return apiClient('put', '/settings/credentials', { data });
}
