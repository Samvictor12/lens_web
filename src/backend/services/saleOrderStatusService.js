import prisma from '../config/prisma.js';
import { APIError } from '../middleware/errorHandler.js';
import {
  ALLOWED_TRANSITIONS,
  canTransition,
  RESET_ELIGIBLE_STATUSES,
  SALE_ORDER_STATUSES,
  STATUS_LABELS,
} from '../constants/saleOrderStatus.js';
import { InventoryService } from './inventory.service.js';

const inventoryService = new InventoryService();

const defaultSourceForStatus = (status) => {
  const sourceByStatus = {
    PO_RAISED: 'PO',
    PO_RECEIVED: 'PO',
    PO_CANCELLED: 'PO',
    PRE_QC: 'INVENTORY',
    FITTING_READY: 'PRE_QC',
    PRE_QC_REJECTED: 'PRE_QC',
    PRE_QC_SCRAPPED: 'PRE_QC',
    IN_FITTING: 'FITTING',
    ON_HOLD: 'FITTING',
    AWAITING_QUALITY: 'FITTING',
    READY_FOR_DISPATCH: 'POST_QC',
    POST_QC_REJECTED: 'POST_QC',
    POST_QC_SCRAPPED: 'POST_QC',
    READY_FOR_PICKUP: 'DISPATCH',
    DISPATCHED: 'DISPATCH',
    DELIVERED: 'DISPATCH',
    INVOICED: 'BILLING',
    COMPLETED: 'BILLING',
  };
  return sourceByStatus[status] || 'SYSTEM';
};

const defaultRemarkForTransition = (fromStatus, toStatus) => {
  const remarks = {
    PO_RAISED: 'Purchase order raised',
    PO_RECEIVED: 'Purchase order received',
    PO_CANCELLED: 'Purchase order canceled',
    PRE_QC: 'Stock issued to Pre-QC station',
    FITTING_READY: 'Pre-QC passed; moved to Fitting Ready',
    IN_FITTING: 'Fitting started',
    ON_HOLD: 'Fitting put on hold',
    AWAITING_QUALITY: 'Fitting completed; moved to Post-QC',
    READY_FOR_DISPATCH: 'Post-QC approved; ready for dispatch',
    READY_FOR_PICKUP: 'Dispatch created; ready for pickup',
    DISPATCHED: 'Order picked up and dispatched',
    DELIVERED: 'Order delivered',
    INVOICED: 'Invoice generated',
    COMPLETED: 'Order completed',
    CANCELLED: 'Sale order cancelled',
  };

  if (remarks[toStatus]) return remarks[toStatus];
  const label = STATUS_LABELS[toStatus] || toStatus;
  const fromLabel = fromStatus ? (STATUS_LABELS[fromStatus] || fromStatus) : null;
  return fromLabel ? `Moved from ${fromLabel} to ${label}` : `Moved to ${label}`;
};

const findStatusPath = (fromStatus, toStatus) => {
  if (!fromStatus || fromStatus === toStatus) return [toStatus];

  const queue = [[fromStatus]];
  const visited = new Set([fromStatus]);

  while (queue.length > 0) {
    const path = queue.shift();
    const current = path[path.length - 1];
    for (const next of ALLOWED_TRANSITIONS[current] || []) {
      if (visited.has(next)) continue;
      const nextPath = [...path, next];
      if (next === toStatus) return nextPath.slice(1);
      visited.add(next);
      queue.push(nextPath);
    }
  }

  return [toStatus];
};

/**
 * Central sale order status transition + immutable status log
 */
export class SaleOrderStatusService {
  async appendLog(tx, {
    saleOrderId,
    fromStatus,
    toStatus,
    remark,
    source = 'SYSTEM',
    referenceType,
    referenceId,
    userId,
    createdAt,
  }) {
    return tx.saleOrderStatusLog.create({
      data: {
        saleOrderId,
        fromStatus: fromStatus ?? null,
        toStatus,
        remark: remark ?? defaultRemarkForTransition(fromStatus, toStatus),
        source,
        referenceType: referenceType ?? null,
        referenceId: referenceId ?? null,
        createdBy: userId ?? null,
        ...(createdAt ? { createdAt } : {}),
      },
    });
  }

  async reconcileCurrentStatusLog(tx, order) {
    const latest = await tx.saleOrderStatusLog.findFirst({
      where: { saleOrderId: order.id },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    if (latest?.toStatus === order.status) return;

    let fromStatus = latest?.toStatus ?? null;
    const missingStatuses = findStatusPath(fromStatus, order.status);

    for (const toStatus of missingStatuses) {
      await this.appendLog(tx, {
        saleOrderId: order.id,
        fromStatus,
        toStatus,
        remark: defaultRemarkForTransition(fromStatus, toStatus),
        source: defaultSourceForStatus(toStatus),
        userId: order.updatedBy ?? order.createdBy ?? null,
        createdAt: order.updatedAt || new Date(),
      });
      fromStatus = toStatus;
    }
  }

  async getStatusLog(saleOrderId) {
    const order = await prisma.saleOrder.findUnique({
      where: { id: saleOrderId, deleteStatus: false },
      select: { id: true, orderNo: true, status: true, updatedBy: true, createdBy: true, updatedAt: true },
    });
    if (!order) throw new APIError('Sale order not found', 404, 'ORDER_NOT_FOUND');

    await prisma.$transaction((tx) => this.reconcileCurrentStatusLog(tx, order));

    const logs = await prisma.saleOrderStatusLog.findMany({
      where: { saleOrderId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      include: {
        createdByUser: { select: { id: true, name: true, username: true } },
      },
    });

    return { ...order, logs };
  }

  /**
   * Transition SO status with validation and logging
   */
  async transition({
    tx: externalTx,
    saleOrderId,
    toStatus,
    userId,
    remark,
    source = 'SYSTEM',
    referenceType,
    referenceId,
    extraOrderData = {},
  }) {
    if (!SALE_ORDER_STATUSES.includes(toStatus)) {
      throw new APIError(`Invalid status: ${toStatus}`, 400, 'INVALID_STATUS');
    }

    const run = async (tx) => {
      const existing = await tx.saleOrder.findUnique({
        where: { id: saleOrderId, deleteStatus: false },
      });
      if (!existing) throw new APIError('Sale order not found', 404, 'ORDER_NOT_FOUND');

      const fromStatus = existing.status;
      if (fromStatus === toStatus) {
        let currentOrder = existing;
        if (Object.keys(extraOrderData).length > 0) {
          currentOrder = await tx.saleOrder.update({
            where: { id: saleOrderId },
            data: {
              updatedBy: userId,
              ...extraOrderData,
            },
            include: {
              customer: { select: { id: true, code: true, name: true } },
            },
          });
        }

        await this.reconcileCurrentStatusLog(tx, {
          ...currentOrder,
          updatedBy: userId ?? currentOrder.updatedBy,
          updatedAt: new Date(),
        });
        return currentOrder;
      }

      if (!canTransition(fromStatus, toStatus)) {
        throw new APIError(
          `Cannot transition from ${fromStatus} to ${toStatus}`,
          400,
          'INVALID_TRANSITION'
        );
      }

      if (toStatus === 'PRE_QC' && source === 'INVENTORY') {
        await this.appendLog(tx, {
          saleOrderId,
          fromStatus,
          toStatus: 'STOCK_ISSUED',
          remark: remark || 'Stock issued to Pre-QC station',
          source: 'INVENTORY',
          referenceType,
          referenceId,
          userId,
        });
      }

      const updated = await tx.saleOrder.update({
        where: { id: saleOrderId },
        data: {
          status: toStatus,
          updatedBy: userId,
          ...extraOrderData,
        },
        include: {
          customer: { select: { id: true, code: true, name: true } },
        },
      });

      // Consume reserved stock if transitioning to finished states
      if (['DISPATCHED', 'DELIVERED', 'INVOICED', 'COMPLETED'].includes(toStatus)) {
        const reservedItems = await tx.inventoryItem.findMany({
          where: {
            saleOrderId: saleOrderId,
            status: 'RESERVED',
            deleteStatus: false
          }
        });
        for (const item of reservedItems) {
          await inventoryService.updateInventoryStock(item, item.quantity || 1, 'CONSUME_RESERVED', tx);
          await tx.inventoryItem.update({
            where: { id: item.id },
            data: {
              deleteStatus: true,
              updatedBy: userId ?? null,
              updatedAt: new Date()
            }
          });
        }
      }

      // Revert reservation if transitioning back to DRAFT
      if (toStatus === 'DRAFT') {
        const reservedItems = await tx.inventoryItem.findMany({
          where: {
            saleOrderId: saleOrderId,
            status: 'RESERVED',
            deleteStatus: false
          }
        });
        for (const item of reservedItems) {
          await tx.inventoryItem.update({
            where: { id: item.id },
            data: {
              status: 'AVAILABLE',
              quantity: 1, // restore to 1
              saleOrderId: null,
              reservedDate: null,
              updatedBy: userId ?? null,
              updatedAt: new Date()
            }
          });
          await inventoryService.updateInventoryStock(item, 1, 'UNRESERVE', tx);
        }
        // Delete OUTWARD_SALE inventory transactions linked to this sale order
        await tx.inventoryTransaction.deleteMany({
          where: {
            saleOrderId: saleOrderId,
            type: 'OUTWARD_SALE'
          }
        });
      }

      await this.appendLog(tx, {
        saleOrderId,
        fromStatus,
        toStatus,
        remark: remark ?? defaultRemarkForTransition(fromStatus, toStatus),
        source,
        referenceType,
        referenceId,
        userId,
      });

      return updated;
    };

    if (externalTx) return run(externalTx);
    return prisma.$transaction(run);
  }

  /** Initial log when SO is created */
  async logCreation(tx, saleOrderId, userId) {
    await this.appendLog(tx, {
      saleOrderId,
      fromStatus: null,
      toStatus: 'DRAFT',
      remark: 'Sale order created',
      source: 'SYSTEM',
      userId,
    });
  }

  async confirmReset(saleOrderId, userId, remark, req = null) {
    const order = await prisma.saleOrder.findUnique({
      where: { id: saleOrderId, deleteStatus: false },
    });
    if (!order) throw new APIError('Sale order not found', 404, 'ORDER_NOT_FOUND');
    if (!RESET_ELIGIBLE_STATUSES.includes(order.status)) {
      throw new APIError('Order is not in a reset-eligible status', 400, 'INVALID_RESET');
    }
    if (!remark?.trim()) {
      throw new APIError('Remark is required for reset', 400, 'REMARK_REQUIRED');
    }

    return this.transition({
      saleOrderId,
      toStatus: 'DRAFT',
      userId,
      remark: remark.trim(),
      source: 'USER',
    });
  }
}

export default new SaleOrderStatusService();
