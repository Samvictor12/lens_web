import { APIError } from './errors.js';

export const FREE_LENS_APPROVAL = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
};

/** Clear approval audit when Free Lens is off. */
export function clearedFreeLensApprovalFields() {
  return {
    freeLensApprovalStatus: null,
    freeLensApprovedBy: null,
    freeLensApprovedAt: null,
    freeLensRejectedBy: null,
    freeLensRejectedAt: null,
    freeLensApprovalRemark: null,
  };
}

/** Reset to pending when Free Lens is newly enabled. */
export function pendingFreeLensApprovalFields() {
  return {
    freeLensApprovalStatus: FREE_LENS_APPROVAL.PENDING,
    freeLensApprovedBy: null,
    freeLensApprovedAt: null,
    freeLensRejectedBy: null,
    freeLensRejectedAt: null,
    freeLensApprovalRemark: null,
  };
}

/**
 * Resolve approval fields for create/update based on freeLens toggle.
 * @returns {object|null} fields to merge, or null when no approval fields change
 */
export function resolveFreeLensApprovalOnWrite({ freeLens, wasFreeLens }) {
  if (!freeLens) {
    return clearedFreeLensApprovalFields();
  }
  // Newly enabled (or create with freeLens)
  if (!wasFreeLens) {
    return pendingFreeLensApprovalFields();
  }
  return null;
}

export function isFreeLensApproved(order) {
  return !order?.freeLens || order.freeLensApprovalStatus === FREE_LENS_APPROVAL.APPROVED;
}

export function assertFreeLensApprovedForFulfillment(order) {
  if (isFreeLensApproved(order)) return;
  const status = order.freeLensApprovalStatus;
  if (status === FREE_LENS_APPROVAL.REJECTED) {
    throw new APIError(
      'Free Lens was rejected. Uncheck Free Lens or get Admin approval before Raise PO / Issue.',
      400,
      'FREE_LENS_REJECTED'
    );
  }
  throw new APIError(
    'Free Lens approval is pending. Admin must approve before Raise PO / Issue.',
    400,
    'FREE_LENS_APPROVAL_REQUIRED'
  );
}

export function isAdminUser(user) {
  const roleName = user?.role?.name || user?.roleName || '';
  const roleId = user?.role_id || user?.roleId;
  return String(roleName).toLowerCase() === 'admin' || String(roleId) === '1';
}
