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
  /**
   * Validate and normalize rejectedEyes payload for QC reject/scrap.
   * @returns {{ rightEye: boolean, leftEye: boolean, sides: ('RIGHT'|'LEFT')[] }}
   */
  normalizeRejectedEyes(order, rejectedEyes) {
    const soRight = Boolean(order.rightEye);
    const soLeft = Boolean(order.leftEye);

    let rightEye = false;
    let leftEye = false;

    if (rejectedEyes && typeof rejectedEyes === 'object') {
      rightEye = Boolean(rejectedEyes.rightEye);
      leftEye = Boolean(rejectedEyes.leftEye);
    } else {
      // Legacy callers: treat as full reject of all SO eyes
      rightEye = soRight;
      leftEye = soLeft;
    }

    if (!rightEye && !leftEye) {
      throw new APIError(
        'At least one eye must be rejected',
        400,
        'REJECTED_EYES_REQUIRED'
      );
    }
    if (rightEye && !soRight) {
      throw new APIError(
        'Right eye is not on this sale order',
        400,
        'INVALID_REJECTED_EYE'
      );
    }
    if (leftEye && !soLeft) {
      throw new APIError(
        'Left eye is not on this sale order',
        400,
        'INVALID_REJECTED_EYE'
      );
    }

    const sides = [];
    if (rightEye) sides.push('RIGHT');
    if (leftEye) sides.push('LEFT');
    return { rightEye, leftEye, sides };
  }

  /**
   * Resolve which eye a rejected inventory row represents.
   * Mutates `remainingSides` so dual-eye rejects get distinct RIGHT/LEFT
   * even when items were stamped with both SO eye flags / null issuedEye.
   */
  resolveRejectedEyeSide(item, rejectedSides, remainingSides) {
    let eyeSide = null;
    if (item.issuedEye && rejectedSides.includes(item.issuedEye)) {
      eyeSide = item.issuedEye;
    } else if (rejectedSides.length === 1) {
      eyeSide = rejectedSides[0];
    } else if (item.rightEye && !item.leftEye && rejectedSides.includes('RIGHT')) {
      eyeSide = 'RIGHT';
    } else if (item.leftEye && !item.rightEye && rejectedSides.includes('LEFT')) {
      eyeSide = 'LEFT';
    } else if (remainingSides.length > 0) {
      eyeSide = remainingSides[0];
    } else {
      eyeSide = rejectedSides[0] || null;
    }

    if (eyeSide) {
      const idx = remainingSides.indexOf(eyeSide);
      if (idx >= 0) remainingSides.splice(idx, 1);
    }
    return eyeSide;
  }

  /**
   * Pick reserved/in-fitting/QC items whose issuedEye is in rejectedSides.
   * Legacy null issuedEye: include when rejecting all SO eyes, or when SO has
   * a single eye. Do NOT treat a single unstamped dual-eye row as rejectable
   * on a one-eye reject (would drop the accepted eye).
   */
  filterItemsForRejectedEyes(items, rejectedSides, order) {
    const soEyeCount = (order.rightEye ? 1 : 0) + (order.leftEye ? 1 : 0);
    const rejectingAll =
      (!order.rightEye || rejectedSides.includes('RIGHT')) &&
      (!order.leftEye || rejectedSides.includes('LEFT'));

    return items.filter((item) => {
      if (item.issuedEye) {
        return rejectedSides.includes(item.issuedEye);
      }
      // Legacy unstamped rows — both-eye reject or single-eye SO only
      if (rejectingAll) return true;
      if (soEyeCount === 1) return true;
      return false;
    });
  }

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
    rejectedEyes,
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

      // QC reject (reusable) / scrap (immediate write-off) — per-eye aware
      const qcRejectStatuses = ['PRE_QC_REJECTED', 'POST_QC_REJECTED'];
      const qcScrapStatuses = ['PRE_QC_SCRAPPED', 'POST_QC_SCRAPPED'];
      const isQcReject = qcRejectStatuses.includes(toStatus);
      const isQcScrap = qcScrapStatuses.includes(toStatus);

      if (isQcReject || isQcScrap) {
        const { sides: rejectedSides } = this.normalizeRejectedEyes(
          existing,
          rejectedEyes
        );

        const linkedItems = await tx.inventoryItem.findMany({
          where: {
            saleOrderId,
            status: { in: ['RESERVED', 'IN_FITTING', 'QUALITY_CHECK'] },
            deleteStatus: false,
          },
        });

        const toProcess = this.filterItemsForRejectedEyes(
          linkedItems,
          rejectedSides,
          existing
        );

        // Fail closed: one-eye reject on dual-eye SO must not release an
        // unstamped pair or create orphan QcReturn (inventoryItemId: null).
        const soEyeCount =
          (existing.rightEye ? 1 : 0) + (existing.leftEye ? 1 : 0);
        const isOneEyeReject = soEyeCount >= 2 && rejectedSides.length === 1;
        if (isOneEyeReject && toProcess.length === 0) {
          const hasUnstampedLinked = linkedItems.some((item) => !item.issuedEye);
          if (hasUnstampedLinked) {
            throw new APIError(
              'Cannot reject one eye while reserved stock has no per-eye stamp (issuedEye). Re-issue stock per eye, or reject both eyes.',
              400,
              'PARTIAL_REJECT_UNSTAMPED_PAIR'
            );
          }
        }

        const processedItemIds = [];
        // Ensure each rejected physical lens gets a distinct eyeSide when both
        // eyes are rejected (items often copy both SO rightEye/leftEye flags).
        const remainingSides = [...rejectedSides];

        for (const item of toProcess) {
          const qty = item.quantity || 1;
          const eyeSide = this.resolveRejectedEyeSide(
            item,
            rejectedSides,
            remainingSides
          );

          await inventoryService.updateInventoryStock(
            item,
            qty,
            'RELEASE_RESERVED_HOLD',
            tx
          );

          if (isQcScrap) {
            // Immediate write-off — no Inward Queue row
            await tx.inventoryItem.update({
              where: { id: item.id },
              data: {
                status: 'DAMAGED',
                saleOrderId: null,
                reservedDate: null,
                issuedEye: null,
                notes: [
                  item.notes,
                  remark ? `QC scrap tag: ${remark}` : null,
                  `Scrapped from ${toStatus}`,
                ]
                  .filter(Boolean)
                  .join(' | '),
                updatedBy: userId ?? null,
                updatedAt: new Date(),
              },
            });
            await inventoryService.updateInventoryStock(
              item,
              qty,
              'WRITE_OFF_HOLD',
              tx
            );
          } else {
            await tx.inventoryItem.update({
              where: { id: item.id },
              data: {
                status: 'RETURNED',
                saleOrderId: null,
                reservedDate: null,
                // Keep/stamp issuedEye so Inward Queue can label one eye per row
                issuedEye: eyeSide || item.issuedEye || null,
                notes: [
                  item.notes,
                  remark ? `QC reject tag: ${remark}` : null,
                  eyeSide ? `Return ${eyeSide} from ${toStatus}` : `Return from ${toStatus}`,
                ]
                  .filter(Boolean)
                  .join(' | '),
                updatedBy: userId ?? null,
                updatedAt: new Date(),
              },
            });

            await tx.inventoryQcReturn.create({
              data: {
                saleOrderId,
                inventoryItemId: item.id,
                eyeSide: eyeSide || null,
                sourceStatus: toStatus,
                rejectRemark: remark || null,
                status: 'PENDING',
                createdBy: userId ?? null,
              },
            });
          }

          processedItemIds.push(item.id);
        }

        // Legacy SO-level null-item QcReturn only when rejectable and nothing processed
        if (isQcReject && toProcess.length === 0) {
          for (const side of rejectedSides) {
            await tx.inventoryQcReturn.create({
              data: {
                saleOrderId,
                inventoryItemId: null,
                eyeSide: side,
                sourceStatus: toStatus,
                rejectRemark: remark || null,
                status: 'PENDING',
                createdBy: userId ?? null,
              },
            });
          }
        }

        // Soft-delete OUTWARD_SALE only for released/scrapped eyes
        if (processedItemIds.length > 0) {
          await tx.inventoryTransaction.deleteMany({
            where: {
              saleOrderId,
              type: 'OUTWARD_SALE',
              inventoryItemId: { in: processedItemIds },
            },
          });
        }
      }

      // Confirm Reset → DRAFT: keep accepted retained eyes reserved on the SO.
      // Do not unreserve SO-linked items; do not wipe their OUTWARD_SALE txns.
      if (toStatus === 'DRAFT') {
        // Intentional no-op for retained accepted-eye stock after partial reject.
        // Safety: only unreserve orphaned RESERVED rows that lack issuedEye AND
        // are somehow still linked when no reject path ran (should be rare).
        // Contract: do not release accepted retained eyes.
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
