import prisma from '../config/prisma.js';
import { APIError } from '../middleware/errorHandler.js';
import {
  canTransition,
  RESET_ELIGIBLE_STATUSES,
  SALE_ORDER_STATUSES,
} from '../constants/saleOrderStatus.js';

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
  }) {
    return tx.saleOrderStatusLog.create({
      data: {
        saleOrderId,
        fromStatus: fromStatus ?? null,
        toStatus,
        remark: remark ?? null,
        source,
        referenceType: referenceType ?? null,
        referenceId: referenceId ?? null,
        createdBy: userId ?? null,
      },
    });
  }

  async getStatusLog(saleOrderId) {
    const order = await prisma.saleOrder.findUnique({
      where: { id: saleOrderId, deleteStatus: false },
      select: { id: true, orderNo: true, status: true },
    });
    if (!order) throw new APIError('Sale order not found', 404, 'ORDER_NOT_FOUND');

    const logs = await prisma.saleOrderStatusLog.findMany({
      where: { saleOrderId },
      orderBy: { createdAt: 'asc' },
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
      if (fromStatus === toStatus) return existing;

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

      await this.appendLog(tx, {
        saleOrderId,
        fromStatus,
        toStatus,
        remark,
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
