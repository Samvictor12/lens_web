import prisma from '../config/prisma.js';
import { APIError } from '../middleware/errorHandler.js';
import bcrypt from 'bcrypt';

const DEFAULT_GST_RATES = [
  { label: 'GST 0%', value: 0 },
  { label: 'GST 5%', value: 5 },
  { label: 'GST 12%', value: 12 },
  { label: 'GST 18%', value: 18 },
  { label: 'GST 28%', value: 28 },
];

function normalizeGstRates(rates) {
  if (!Array.isArray(rates)) return DEFAULT_GST_RATES;
  const normalized = rates
    .map((r) => ({
      label: String(r?.label ?? '').trim() || `GST ${r?.value}%`,
      value: parseFloat(r?.value),
    }))
    .filter((r) => !Number.isNaN(r.value));
  return normalized.length > 0 ? normalized : DEFAULT_GST_RATES;
}

const MAX_LOGO_BYTES = 600 * 1024; // ~500 KB raw, ~600KB after base64 overhead

/**
 * Settings Service
 * Handles: own profile, login credentials, company settings
 */
export class SettingsService {

  // ─────────────────────────────────────────────
  // COMPANY SETTINGS (single-row, upsert pattern)
  // ─────────────────────────────────────────────

  async getCompanySettings() {
    const settings = await prisma.companySettings.findFirst();
    return settings;
  }

  async upsertCompanySettings(data, userId) {
    // Validate logo size if provided
    if (data.logo) {
      const byteLength = Buffer.byteLength(data.logo, 'utf8');
      if (byteLength > MAX_LOGO_BYTES) {
        throw new APIError(
          'Logo is too large. Please use an image smaller than 500 KB.',
          400,
          'LOGO_TOO_LARGE'
        );
      }
      // Basic base64 image validation
      if (!data.logo.startsWith('data:image/')) {
        throw new APIError(
          'Invalid logo format. Must be a base64 encoded image.',
          400,
          'INVALID_LOGO_FORMAT'
        );
      }
    }

    const sanitized = {
      companyName: data.companyName || 'My Company',
      gstin:       data.gstin       ?? null,
      logo:        data.logo        ?? undefined, // undefined = don't touch if not provided
      address:     data.address     ?? null,
      city:        data.city        ?? null,
      state:       data.state       ?? null,
      pincode:     data.pincode     ?? null,
      phone:       data.phone       ?? null,
      email:       data.email       ?? null,
      website:     data.website     ?? null,
      tagline:     data.tagline     ?? null,
      updatedBy:   userId,
    };

    if (data.customAttributes !== undefined) {
      const existingSettings = await prisma.companySettings.findFirst();
      const existingAttrs = existingSettings?.customAttributes && typeof existingSettings.customAttributes === 'object'
        ? existingSettings.customAttributes
        : {};
      const incoming = data.customAttributes && typeof data.customAttributes === 'object'
        ? data.customAttributes
        : {};
      sanitized.customAttributes = {
        ...existingAttrs,
        ...incoming,
        ...(incoming.gstRates !== undefined
          ? { gstRates: normalizeGstRates(incoming.gstRates) }
          : {}),
      };
    }

    // Remove undefined keys so Prisma doesn't null them out accidentally
    Object.keys(sanitized).forEach(k => sanitized[k] === undefined && delete sanitized[k]);

    const existing = await prisma.companySettings.findFirst();
    if (existing) {
      return await prisma.companySettings.update({
        where: { id: existing.id },
        data: sanitized,
      });
    }

    return await prisma.companySettings.create({ data: sanitized });
  }

  // ─────────────────────────────────────────────
  // OWN PROFILE
  // ─────────────────────────────────────────────

  async getMyProfile(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id:              true,
        name:            true,
        email:           true,
        usercode:        true,
        username:        true,
        phonenumber:     true,
        alternatenumber: true,
        bloodgroup:      true,
        address:         true,
        city:            true,
        state:           true,
        pincode:         true,
        active_status:   true,
        createdAt:       true,
        role: { select: { id: true, name: true } },
        departmentDetails: { select: { id: true, department: true } },
      },
    });

    if (!user) throw new APIError('User not found', 404, 'USER_NOT_FOUND');
    return user;
  }

  async updateMyProfile(userId, data) {
    const ALLOWED = [
      'name', 'email', 'phonenumber', 'alternatenumber',
      'bloodgroup', 'address', 'city', 'state', 'pincode',
    ];

    const updateData = {};
    for (const field of ALLOWED) {
      if (data[field] !== undefined) updateData[field] = data[field];
    }

    if (Object.keys(updateData).length === 0) {
      throw new APIError('No valid fields to update', 400, 'NO_CHANGES');
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { ...updateData, updatedBy: userId },
      select: {
        id:              true,
        name:            true,
        email:           true,
        usercode:        true,
        username:        true,
        phonenumber:     true,
        alternatenumber: true,
        bloodgroup:      true,
        address:         true,
        city:            true,
        state:           true,
        pincode:         true,
        role: { select: { id: true, name: true } },
      },
    });

    return updated;
  }

  // ─────────────────────────────────────────────
  // LOGIN CREDENTIALS (username + password)
  // ─────────────────────────────────────────────

  async updateCredentials(userId, { currentPassword, newPassword, confirmPassword, newUsername }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new APIError('User not found', 404, 'USER_NOT_FOUND');

    // Always verify current password first
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new APIError('Current password is incorrect', 400, 'INVALID_CURRENT_PASSWORD');
    }

    const updateData = {};

    // Handle username change
    if (newUsername && newUsername.trim() !== user.username) {
      const conflict = await prisma.user.findFirst({
        where: { username: newUsername.trim(), id: { not: userId } },
      });
      if (conflict) {
        throw new APIError('That username is already taken', 409, 'DUPLICATE_USERNAME');
      }
      updateData.username = newUsername.trim();
    }

    // Handle password change
    if (newPassword) {
      if (newPassword !== confirmPassword) {
        throw new APIError('New passwords do not match', 400, 'PASSWORD_MISMATCH');
      }
      if (newPassword.length < 6) {
        throw new APIError('Password must be at least 6 characters', 400, 'PASSWORD_TOO_SHORT');
      }
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    if (Object.keys(updateData).length === 0) {
      throw new APIError('No changes provided', 400, 'NO_CHANGES');
    }

    await prisma.user.update({
      where: { id: userId },
      data: { ...updateData, updatedBy: userId },
    });

    // Invalidate refresh token → forces re-login on next request
    await prisma.refreshToken.deleteMany({ where: { userId } });

    return { requiresReLogin: true, message: 'Credentials updated. Please log in again.' };
  }
}

export default SettingsService;
