import prisma from '../config/prisma.js';
import { APIError } from '../middleware/errorHandler.js';

const DISPATCH_ORDER_INCLUDE = {
  customer: {
    select: {
      id: true,
      name: true,
      shopname: true,
      city: true,
      phone: true,
      delivery_person_id: true,
    },
  },
  lensProduct: { select: { id: true, lens_name: true } },
  coating: { select: { id: true, name: true } },
  fitting: { select: { id: true, name: true } },
  assignedPerson: { select: { id: true, name: true, phonenumber: true } },
};

/**
 * Fetch all READY_FOR_DISPATCH and In-Transit orders.
 * Delivery Person role sees only orders assigned to them.
 */
export const getDispatchOrders = async (userId, roleName) => {
  const where = {
    deleteStatus: false,
    OR: [
      { status: 'READY_FOR_DISPATCH' },
      { AND: [{ status: { not: 'DELIVERED' } }, { dispatchStatus: 'In Transit' }] },
    ],
  };

  if (roleName === 'Delivery Person') {
    where.assignedPerson_id = userId;
  }

  const orders = await prisma.saleOrder.findMany({
    where,
    include: DISPATCH_ORDER_INCLUDE,
    orderBy: [{ estimatedDate: 'asc' }, { createdAt: 'desc' }],
  });

  return orders;
};

/**
 * Bulk mark orders as "In Transit" (Picked Up).
 * Validates ordering assignment for Delivery Person role.
 */
export const bulkMarkPickup = async (orderIds, userId, roleName) => {
  if (!orderIds || orderIds.length === 0) {
    throw new APIError('No order IDs provided', 400, 'INVALID_INPUT');
  }

  if (roleName === 'Delivery Person') {
    const orders = await prisma.saleOrder.findMany({
      where: { id: { in: orderIds }, deleteStatus: false },
      select: { id: true, assignedPerson_id: true },
    });
    const unauthorized = orders.filter((o) => o.assignedPerson_id !== userId);
    if (unauthorized.length > 0) {
      throw new APIError('Unauthorized: some orders are not assigned to you', 403, 'UNAUTHORIZED');
    }
  }

  const result = await prisma.saleOrder.updateMany({
    where: {
      id: { in: orderIds },
      deleteStatus: false,
      status: 'READY_FOR_DISPATCH',
    },
    data: {
      dispatchStatus: 'In Transit',
      updatedBy: userId,
    },
  });

  return result;
};

/**
 * Bulk mark orders as Delivered with customer signature.
 * Sets status = DELIVERED, records signature & actualDate.
 */
export const bulkMarkDelivered = async (orderIds, signature, userId, roleName) => {
  if (!orderIds || orderIds.length === 0) {
    throw new APIError('No order IDs provided', 400, 'INVALID_INPUT');
  }
  if (!signature) {
    throw new APIError('Signature is required for delivery confirmation', 400, 'SIGNATURE_REQUIRED');
  }

  if (roleName === 'Delivery Person') {
    const orders = await prisma.saleOrder.findMany({
      where: { id: { in: orderIds }, deleteStatus: false },
      select: { id: true, assignedPerson_id: true },
    });
    const unauthorized = orders.filter((o) => o.assignedPerson_id !== userId);
    if (unauthorized.length > 0) {
      throw new APIError('Unauthorized: some orders are not assigned to you', 403, 'UNAUTHORIZED');
    }
  }

  const result = await prisma.saleOrder.updateMany({
    where: {
      id: { in: orderIds },
      deleteStatus: false,
    },
    data: {
      status: 'DELIVERED',
      dispatchStatus: 'Delivered',
      deliverySignature: signature,
      actualDate: new Date(),
      updatedBy: userId,
    },
  });

  return result;
};
