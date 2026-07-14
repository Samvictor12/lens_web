import prisma from '../config/prisma.js';
import { APIError } from '../middleware/errorHandler.js';
import saleOrderStatusService from './saleOrderStatusService.js';

/** Sale orders in the dispatch pipeline (not yet delivered) */
const DISPATCH_PIPELINE_STATUSES = ['READY_FOR_DISPATCH', 'READY_FOR_PICKUP', 'DISPATCHED'];

// ─── Shared includes ─────────────────────────────────────────────────────────

const SALE_ORDER_INCLUDE = {
  customer: {
    select: {
      id: true, name: true, shopname: true,
      city: true, state: true, address: true, pincode: true,
      phone: true, delivery_person_id: true,
    },
  },
  lensProduct: { select: { id: true, lens_name: true } },
  coating: { select: { id: true, name: true } },
  fitting: { select: { id: true, name: true } },
  assignedPerson: { select: { id: true, name: true, phonenumber: true, vehicleNumber: true } },
};

const DISPATCH_COPY_INCLUDE = {
  customer: {
    select: {
      id: true, name: true, shopname: true,
      city: true, state: true, address: true, pincode: true, phone: true,
    },
  },
  deliveryPerson: { select: { id: true, name: true, phonenumber: true, vehicleNumber: true } },
  createdByUser: { select: { id: true, name: true } },
  saleOrders: {
    select: {
      id: true, orderNo: true, customerRefNo: true, status: true, dispatchStatus: true,
      lensProduct: { select: { id: true, lens_name: true } },
      coating: { select: { id: true, name: true } },
    },
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isDeliveryPerson = (roleName) => roleName === 'Delivery Person';

async function generateDcNumber() {
  const year = new Date().getFullYear();
  const last = await prisma.dispatchCopy.findFirst({
    where: { dcNumber: { startsWith: `DC-${year}-` } },
    orderBy: { createdAt: 'desc' },
    select: { dcNumber: true },
  });
  let seq = 1;
  if (last) {
    const parts = last.dcNumber.split('-');
    seq = (parseInt(parts[parts.length - 1], 10) || 0) + 1;
  }
  return `DC-${year}-${String(seq).padStart(4, '0')}`;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const getDispatchDashboard = async (userId, roleName) => {
  const deliveryPersonFilter = isDeliveryPerson(roleName)
    ? { deliveryPersonId: userId }
    : {};

  const [readyCount, inTransitCount, deliveredCount, totalPending, recentDispatches] = await Promise.all([
    // Ready for dispatch (not yet assigned to a dispatch copy)
    prisma.saleOrder.count({
      where: {
        deleteStatus: false,
        status: 'READY_FOR_DISPATCH',
        ...(isDeliveryPerson(roleName) ? { assignedPerson_id: userId } : {}),
      },
    }),
    // In Transit dispatch copies
    prisma.dispatchCopy.count({
      where: { status: 'IN_TRANSIT', ...deliveryPersonFilter },
    }),
    // Delivered dispatch copies
    prisma.dispatchCopy.count({
      where: { status: 'DELIVERED', ...deliveryPersonFilter },
    }),
    // Active dispatch workload (ready for dispatch, awaiting pickup, or out for delivery)
    prisma.saleOrder.count({
      where: {
        deleteStatus: false,
        status: { in: DISPATCH_PIPELINE_STATUSES },
        ...(isDeliveryPerson(roleName) ? { assignedPerson_id: userId } : {}),
      },
    }),
    // Recent dispatch copies created (last 10)
    prisma.dispatchCopy.findMany({
      where: { ...deliveryPersonFilter },
      include: DISPATCH_COPY_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  return { readyCount, inTransitCount, deliveredCount, totalPending, recentDispatches };
};

// ─── Ready for Dispatch (Sale Orders) ────────────────────────────────────────

export const getReadyForDispatch = async (userId, roleName, filters = {}) => {
  const { customerId, assignedPersonId, dateFrom, dateTo, search } = filters;

  const where = {
    deleteStatus: false,
    status: 'READY_FOR_DISPATCH',
    dispatchCopyId: null,
  };

  // Delivery Person: default to their assigned orders; can be filtered by customer
  if (isDeliveryPerson(roleName)) {
    where.assignedPerson_id = userId;
  }

  if (customerId) where.customerId = Number(customerId);
  if (assignedPersonId) where.assignedPerson_id = Number(assignedPersonId);
  if (dateFrom || dateTo) {
    where.estimatedDate = {};
    if (dateFrom) where.estimatedDate.gte = new Date(dateFrom);
    if (dateTo) where.estimatedDate.lte = new Date(dateTo);
  }
  if (search) {
    where.OR = [
      { orderNo: { contains: search, mode: 'insensitive' } },
      { customerRefNo: { contains: search, mode: 'insensitive' } },
      { customer: { name: { contains: search, mode: 'insensitive' } } },
      { customer: { shopname: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const orders = await prisma.saleOrder.findMany({
    where,
    include: SALE_ORDER_INCLUDE,
    orderBy: [{ estimatedDate: 'asc' }, { createdAt: 'desc' }],
  });

  return orders;
};

// ─── Create Dispatch Record ───────────────────────────────────────────────────

export const createDispatch = async (payload, userId) => {
  const {
    saleOrderIds,
    customerId,
    deliveryPersonId,
    expectedDeliveryDate,
    notes,
    vehicleNumber,
    driverName,
    driverContact,
    deliveryNotes,
  } = payload;

  if (!saleOrderIds || saleOrderIds.length === 0) {
    throw new APIError('At least one sale order is required', 400, 'INVALID_INPUT');
  }
  if (!customerId) {
    throw new APIError('Customer is required', 400, 'INVALID_INPUT');
  }
  if (!deliveryPersonId) {
    throw new APIError('Delivery person is required', 400, 'INVALID_INPUT');
  }

  // Verify all sale orders exist, belong to this customer, and are READY_FOR_DISPATCH
  const saleOrders = await prisma.saleOrder.findMany({
    where: { id: { in: saleOrderIds.map(Number) }, deleteStatus: false },
    select: { id: true, status: true, customerId: true, dispatchCopyId: true },
  });

  if (saleOrders.length !== saleOrderIds.length) {
    throw new APIError('One or more sale orders not found', 404, 'NOT_FOUND');
  }
  const notReady = saleOrders.filter((o) => o.status !== 'READY_FOR_DISPATCH');
  if (notReady.length > 0) {
    throw new APIError('All selected orders must have status READY_FOR_DISPATCH', 400, 'INVALID_STATUS');
  }
  const alreadyDispatched = saleOrders.filter((o) => o.dispatchCopyId != null);
  if (alreadyDispatched.length > 0) {
    throw new APIError('One or more orders are already assigned to a dispatch', 400, 'ALREADY_DISPATCHED');
  }
  const wrongCustomer = saleOrders.filter((o) => o.customerId !== Number(customerId));
  if (wrongCustomer.length > 0) {
    throw new APIError('All selected orders must belong to the same customer', 400, 'INVALID_INPUT');
  }

  const dcNumber = await generateDcNumber();

  const dispatch = await prisma.$transaction(async (tx) => {
    const created = await tx.dispatchCopy.create({
      data: {
        dcNumber,
        customerId: Number(customerId),
        deliveryPersonId: deliveryPersonId ? Number(deliveryPersonId) : null,
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
        status: 'PENDING',
        notes: notes || null,
        vehicleNumber: vehicleNumber || null,
        driverName: driverName || null,
        driverContact: driverContact || null,
        deliveryNotes: deliveryNotes || null,
        createdBy: userId,
        updatedBy: userId,
        saleOrders: { connect: saleOrderIds.map((id) => ({ id: Number(id) })) },
      },
      include: DISPATCH_COPY_INCLUDE,
    });

    for (const id of saleOrderIds.map(Number)) {
      await saleOrderStatusService.transition({
        tx,
        saleOrderId: id,
        toStatus: 'READY_FOR_PICKUP',
        userId,
        remark: `Dispatch ${dcNumber} created; ready for pickup`,
        source: 'DISPATCH',
        referenceType: 'DispatchCopy',
        referenceId: created.id,
        extraOrderData: {
          dispatchStatus: 'Ready for Pickup',
          dispatchId: dcNumber,
          dispatchCopyId: created.id,
          assignedPerson_id: deliveryPersonId ? Number(deliveryPersonId) : undefined,
        },
      });
    }

    return created;
  });

  return dispatch;
};

// ─── List Dispatch Records ────────────────────────────────────────────────────

export const getDispatchList = async (userId, roleName, filters = {}) => {
  const { status, customerId, deliveryPersonId, dateFrom, dateTo, search, page = 1, limit = 20 } = filters;

  const where = {};

  if (isDeliveryPerson(roleName)) {
    where.deliveryPersonId = userId;
  }
  if (status) where.status = status;
  if (customerId) where.customerId = Number(customerId);
  if (deliveryPersonId && !isDeliveryPerson(roleName)) where.deliveryPersonId = Number(deliveryPersonId);
  if (dateFrom || dateTo) {
    where.expectedDeliveryDate = {};
    if (dateFrom) where.expectedDeliveryDate.gte = new Date(dateFrom);
    if (dateTo) where.expectedDeliveryDate.lte = new Date(dateTo);
  }
  if (search) {
    where.OR = [
      { dcNumber: { contains: search, mode: 'insensitive' } },
      { customer: { name: { contains: search, mode: 'insensitive' } } },
      { customer: { shopname: { contains: search, mode: 'insensitive' } } },
      {
        saleOrders: {
          some: {
            customerRefNo: { contains: search, mode: 'insensitive' },
          },
        },
      },
      {
        saleOrders: {
          some: {
            orderNo: { contains: search, mode: 'insensitive' },
          },
        },
      },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [total, dispatches] = await Promise.all([
    prisma.dispatchCopy.count({ where }),
    prisma.dispatchCopy.findMany({
      where,
      include: DISPATCH_COPY_INCLUDE,
      orderBy: [{ expectedDeliveryDate: 'asc' }, { createdAt: 'desc' }],
      skip,
      take: Number(limit),
    }),
  ]);

  return { dispatches, total, page: Number(page), limit: Number(limit) };
};

// ─── Update Dispatch Record (details) ─────────────────────────────────────────

export const updateDispatch = async (dispatchId, payload, userId, roleName) => {
  const {
    deliveryPersonId,
    expectedDeliveryDate,
    vehicleNumber,
    driverName,
    driverContact,
    deliveryNotes,
    notes,
  } = payload;

  const dispatch = await prisma.dispatchCopy.findUnique({
    where: { id: Number(dispatchId) },
    include: { saleOrders: { select: { id: true } } },
  });

  if (!dispatch) {
    throw new APIError('Dispatch record not found', 404, 'NOT_FOUND');
  }

  if (dispatch.status === 'DELIVERED') {
    throw new APIError('Delivered dispatches cannot be edited', 400, 'INVALID_STATUS');
  }

  if (isDeliveryPerson(roleName) && dispatch.deliveryPersonId !== userId) {
    throw new APIError('Unauthorized: this dispatch is not assigned to you', 403, 'UNAUTHORIZED');
  }

  if (!deliveryPersonId) {
    throw new APIError('Delivery person is required', 400, 'INVALID_INPUT');
  }

  const nextDeliveryPersonId = Number(deliveryPersonId);

  const updated = await prisma.$transaction(async (tx) => {
    const updatedDispatch = await tx.dispatchCopy.update({
      where: { id: Number(dispatchId) },
      data: {
        deliveryPersonId: nextDeliveryPersonId,
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
        vehicleNumber: vehicleNumber?.trim() || null,
        driverName: driverName?.trim() || null,
        driverContact: driverContact?.trim() || null,
        deliveryNotes: deliveryNotes?.trim() || null,
        notes: notes?.trim() || null,
        updatedBy: userId,
      },
      include: DISPATCH_COPY_INCLUDE,
    });

    // Keep linked sale orders' assigned delivery person in sync
    if (dispatch.saleOrders.length > 0) {
      await tx.saleOrder.updateMany({
        where: { id: { in: dispatch.saleOrders.map((o) => o.id) } },
        data: { assignedPerson_id: nextDeliveryPersonId },
      });
    }

    return updatedDispatch;
  });

  return updated;
};

// ─── Update Dispatch Status ───────────────────────────────────────────────────

export const updateDispatchStatus = async (dispatchId, action, signature, userId, roleName) => {
  const dispatch = await prisma.dispatchCopy.findUnique({
    where: { id: Number(dispatchId) },
    include: { saleOrders: { select: { id: true } } },
  });

  if (!dispatch) {
    throw new APIError('Dispatch record not found', 404, 'NOT_FOUND');
  }

  if (isDeliveryPerson(roleName) && dispatch.deliveryPersonId !== userId) {
    throw new APIError('Unauthorized: this dispatch is not assigned to you', 403, 'UNAUTHORIZED');
  }

  let newDispatchStatus;
  let newSaleOrderStatus;
  let newSaleOrderDispatchStatus;
  let extraDispatchData = {};
  let extraSaleOrderData = {};

  switch (action) {
    case 'PICKUP':
      newDispatchStatus = 'IN_TRANSIT';
      newSaleOrderStatus = 'DISPATCHED';
      newSaleOrderDispatchStatus = 'In Transit';
      break;
    case 'DELIVERED':
      if (!signature) {
        throw new APIError('Signature is required for delivery confirmation', 400, 'SIGNATURE_REQUIRED');
      }
      newDispatchStatus = 'DELIVERED';
      newSaleOrderStatus = 'DELIVERED';
      newSaleOrderDispatchStatus = 'Delivered';
      extraDispatchData = { deliverySignature: signature, actualDeliveryDate: new Date() };
      extraSaleOrderData = { deliverySignature: signature, actualDate: new Date() };
      break;
    case 'ON_HOLD':
      newDispatchStatus = 'ON_HOLD';
      newSaleOrderDispatchStatus = 'On Hold';
      break;
    default:
      throw new APIError(`Unknown action: ${action}`, 400, 'INVALID_ACTION');
  }

  const saleOrderIds = dispatch.saleOrders.map((o) => o.id);

  const updated = await prisma.$transaction(async (tx) => {
    const updatedDispatch = await tx.dispatchCopy.update({
      where: { id: Number(dispatchId) },
      data: {
        status: newDispatchStatus,
        updatedBy: userId,
        ...extraDispatchData,
      },
      include: DISPATCH_COPY_INCLUDE,
    });

    if (saleOrderIds.length > 0) {
      for (const saleOrderId of saleOrderIds) {
        if (newSaleOrderStatus) {
          await saleOrderStatusService.transition({
            tx,
            saleOrderId,
            toStatus: newSaleOrderStatus,
            userId,
            remark: action === 'PICKUP'
              ? `Dispatch ${dispatch.dcNumber} picked up`
              : `Dispatch ${dispatch.dcNumber} delivered`,
            source: 'DISPATCH',
            referenceType: 'DispatchCopy',
            referenceId: dispatch.id,
            extraOrderData: {
              dispatchStatus: newSaleOrderDispatchStatus,
              ...extraSaleOrderData,
            },
          });
        } else {
          await tx.saleOrder.update({
            where: { id: saleOrderId },
            data: {
              dispatchStatus: newSaleOrderDispatchStatus,
              updatedBy: userId,
              ...extraSaleOrderData,
            },
          });
        }
      }
    }

    return updatedDispatch;
  });

  return updated;
};

// ─── Legacy: kept for backward compat ────────────────────────────────────────

export const getDispatchOrders = async (userId, roleName) => {
  const where = {
    deleteStatus: false,
    OR: [
      { status: 'READY_FOR_PICKUP' },
      { AND: [{ status: { not: 'DELIVERED' } }, { dispatchStatus: 'In Transit' }] },
    ],
  };
  if (isDeliveryPerson(roleName)) where.assignedPerson_id = userId;

  return prisma.saleOrder.findMany({
    where,
    include: SALE_ORDER_INCLUDE,
    orderBy: [{ estimatedDate: 'asc' }, { createdAt: 'desc' }],
  });
};

export const bulkMarkPickup = async (orderIds, userId, roleName) => {
  if (!orderIds || orderIds.length === 0) throw new APIError('No order IDs provided', 400, 'INVALID_INPUT');

  if (isDeliveryPerson(roleName)) {
    const orders = await prisma.saleOrder.findMany({
      where: { id: { in: orderIds }, deleteStatus: false },
      select: { id: true, assignedPerson_id: true },
    });
    if (orders.some((o) => o.assignedPerson_id !== userId)) {
      throw new APIError('Unauthorized: some orders are not assigned to you', 403, 'UNAUTHORIZED');
    }
  }

  let count = 0;
  await prisma.$transaction(async (tx) => {
    for (const id of orderIds) {
      await saleOrderStatusService.transition({
        tx,
        saleOrderId: Number(id),
        toStatus: 'DISPATCHED',
        userId,
        remark: 'Order picked up for dispatch',
        source: 'DISPATCH',
        extraOrderData: { dispatchStatus: 'In Transit' },
      });
      count += 1;
    }
  });

  return { count };
};

export const bulkMarkDelivered = async (orderIds, signature, userId, roleName) => {
  if (!orderIds || orderIds.length === 0) throw new APIError('No order IDs provided', 400, 'INVALID_INPUT');
  if (!signature) throw new APIError('Signature is required', 400, 'SIGNATURE_REQUIRED');

  if (isDeliveryPerson(roleName)) {
    const orders = await prisma.saleOrder.findMany({
      where: { id: { in: orderIds }, deleteStatus: false },
      select: { id: true, assignedPerson_id: true },
    });
    if (orders.some((o) => o.assignedPerson_id !== userId)) {
      throw new APIError('Unauthorized: some orders are not assigned to you', 403, 'UNAUTHORIZED');
    }
  }

  let count = 0;
  await prisma.$transaction(async (tx) => {
    for (const id of orderIds) {
      await saleOrderStatusService.transition({
        tx,
        saleOrderId: Number(id),
        toStatus: 'DELIVERED',
        userId,
        remark: 'Order delivered',
        source: 'DISPATCH',
        extraOrderData: {
          dispatchStatus: 'Delivered',
          deliverySignature: signature,
          actualDate: new Date(),
        },
      });
      count += 1;
    }
  });

  return { count };
};
