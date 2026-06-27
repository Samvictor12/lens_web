import prisma from '../config/prisma.js';
import { APIError } from '../middleware/errorHandler.js';
import saleOrderStatusService from './saleOrderStatusService.js';
import { INVENTORY_QUEUE_STATUSES } from '../constants/saleOrderStatus.js';
import InventoryService from './inventory.service.js';

const inventoryService = new InventoryService();

const ACTIVE_PO_STATUSES = ['DRAFT', 'PO_PARTIAL_RECEIVED', 'RECEIVED'];

function specsMatch(so, po) {
  const fields = [
    'lens_id',
    'category_id',
    'Type_id',
    'rightEye',
    'leftEye',
    'rightSpherical',
    'rightCylindrical',
    'rightAxis',
    'rightAdd',
    'rightDia',
    'leftSpherical',
    'leftCylindrical',
    'leftAxis',
    'leftAdd',
    'leftDia',
  ];
  for (const f of fields) {
    const a = so[f] ?? null;
    const b = po[f] ?? null;
    if (String(a ?? '') !== String(b ?? '')) return false;
  }
  return true;
}

function requiredPoQty(order) {
  let qty = 0;
  if (order.rightEye) qty += 1;
  if (order.leftEye) qty += 1;
  return qty || 1;
}

export class SaleOrderWorkflowService {
  async getInventoryQueue({ page = 1, limit = 50, search, customerId, lensProductId, customerRefNo, orderNo } = {}) {
    const parsedPage = parseInt(page, 10) || 1;
    const parsedLimit = parseInt(limit, 10) || 50;
    const skip = (parsedPage - 1) * parsedLimit;
    const where = {
      deleteStatus: false,
      status: { in: INVENTORY_QUEUE_STATUSES },
    };

    if (customerId) {
      where.customerId = parseInt(customerId, 10);
    }

    if (lensProductId) {
      where.lens_id = parseInt(lensProductId, 10);
    }

    if (customerRefNo?.trim()) {
      where.customerRefNo = { contains: customerRefNo.trim(), mode: 'insensitive' };
    }

    if (orderNo?.trim()) {
      where.orderNo = { contains: orderNo.trim(), mode: 'insensitive' };
    }

    if (search?.trim()) {
      where.OR = [
        { orderNo: { contains: search.trim(), mode: 'insensitive' } },
        { customerRefNo: { contains: search.trim(), mode: 'insensitive' } },
        { customer: { name: { contains: search.trim(), mode: 'insensitive' } } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.saleOrder.findMany({
        where,
        skip,
        take: parsedLimit,
        orderBy: { updatedAt: 'desc' },
        include: {
          customer: { select: { id: true, code: true, name: true } },
          lensProduct: { select: { id: true, lens_name: true, product_code: true } },
          purchaseOrders: {
            where: { deleteStatus: false },
            select: { id: true, poNumber: true, status: true, receivedQty: true, quantity: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      prisma.saleOrder.count({ where }),
    ]);

    return { data: orders, total, page: parsedPage, limit: parsedLimit };
  }

  async raisePoFromSo(saleOrderId, userId, source = 'USER') {
    return prisma.$transaction(async (tx) => {
      const so = await tx.saleOrder.findUnique({
        where: { id: saleOrderId, deleteStatus: false },
        include: {
          purchaseOrders: { where: { deleteStatus: false, status: { not: 'CANCELLED' } } },
        },
      });
      if (!so) throw new APIError('Sale order not found', 404, 'ORDER_NOT_FOUND');

      const allowedFrom = ['DRAFT', 'PO_CANCELLED'];
      if (!allowedFrom.includes(so.status)) {
        throw new APIError(`Cannot raise PO from status ${so.status}`, 400, 'INVALID_STATUS');
      }
      if (so.purchaseOrders.some((p) => ACTIVE_PO_STATUSES.includes(p.status))) {
        throw new APIError('An active purchase order already exists for this sale order', 400, 'PO_EXISTS');
      }

      const year = new Date().getFullYear();
      const prefix = `PO-${year}-`;
      const last = await tx.purchaseOrder.findFirst({
        where: { poNumber: { startsWith: prefix } },
        orderBy: { poNumber: 'desc' },
      });
      const next = last ? parseInt(last.poNumber.split('-')[2], 10) + 1 : 1;
      const poNumber = `${prefix}${String(next).padStart(3, '0')}`;

      const qty = (so.rightEye ? 0.5 : 0) + (so.leftEye ? 0.5 : 0) || 1;
      const po = await tx.purchaseOrder.create({
        data: {
          poNumber,
          saleOrderId: so.id,
          orderType: 'Single',
          status: 'DRAFT',
          lens_id: so.lens_id,
          category_id: so.category_id,
          Type_id: so.Type_id,
          fitting_id: so.fitting_id,
          coating_id: so.coating_id,
          tinting_id: so.tinting_id,
          rightEye: so.rightEye,
          leftEye: so.leftEye,
          rightSpherical: so.rightSpherical,
          rightCylindrical: so.rightCylindrical,
          rightAxis: so.rightAxis,
          rightAdd: so.rightAdd,
          rightDia: so.rightDia,
          leftSpherical: so.leftSpherical,
          leftCylindrical: so.leftCylindrical,
          leftAxis: so.leftAxis,
          leftAdd: so.leftAdd,
          leftDia: so.leftDia,
          quantity: qty,
          unitPrice: 0,
          subtotal: 0,
          totalValue: 0,
          itemDescription: so.orderNo,
          notes: so.remark,
          createdBy: userId,
        },
      });

      await tx.saleOrder.update({
        where: { id: so.id },
        data: { hasLinkedPoEver: true, updatedBy: userId },
      });

      await saleOrderStatusService.transition({
        tx,
        saleOrderId: so.id,
        toStatus: 'PO_RAISED',
        userId,
        remark: `PO ${po.poNumber} raised`,
        source: source === 'INVENTORY' ? 'INVENTORY' : 'PO',
        referenceType: 'PurchaseOrder',
        referenceId: po.id,
      });

      return po;
    });
  }

  async linkPoToSo(saleOrderId, poId, userId) {
    return prisma.$transaction(async (tx) => {
      const so = await tx.saleOrder.findUnique({
        where: { id: saleOrderId, deleteStatus: false },
        include: { purchaseOrders: { where: { deleteStatus: false, status: { not: 'CANCELLED' } } } },
      });
      const po = await tx.purchaseOrder.findUnique({ where: { id: poId, deleteStatus: false } });
      if (!so || !po) throw new APIError('Sale order or PO not found', 404, 'NOT_FOUND');
      if (po.saleOrderId) throw new APIError('PO is already linked to a sale order', 400, 'PO_LINKED');
      if (po.orderType !== 'Single') throw new APIError('Only Single PO can be linked', 400, 'INVALID_PO_TYPE');
      if (po.status !== 'DRAFT') throw new APIError('Only DRAFT PO can be linked', 400, 'INVALID_PO_STATUS');
      if (!['DRAFT', 'PO_CANCELLED'].includes(so.status)) {
        throw new APIError(`Cannot link PO when SO status is ${so.status}`, 400, 'INVALID_SO_STATUS');
      }
      if (so.purchaseOrders.some((p) => ACTIVE_PO_STATUSES.includes(p.status))) {
        throw new APIError('Active PO already exists', 400, 'PO_EXISTS');
      }
      if (!specsMatch(so, po)) {
        throw new APIError('PO lens/specifications do not match sale order', 400, 'SPEC_MISMATCH');
      }

      await tx.purchaseOrder.update({
        where: { id: poId },
        data: { saleOrderId: so.id, updatedBy: userId },
      });
      await tx.saleOrder.update({
        where: { id: so.id },
        data: { hasLinkedPoEver: true, updatedBy: userId },
      });

      await saleOrderStatusService.transition({
        tx,
        saleOrderId: so.id,
        toStatus: 'PO_RAISED',
        userId,
        remark: `Linked PO ${po.poNumber}`,
        source: 'PO',
        referenceType: 'PurchaseOrder',
        referenceId: po.id,
      });

      return tx.purchaseOrder.findUnique({ where: { id: poId } });
    });
  }

  async cancelLinkedPo(poId, userId, remark) {
    return prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({
        where: { id: poId, deleteStatus: false },
        include: { saleOrder: true },
      });
      if (!po) throw new APIError('PO not found', 404, 'PO_NOT_FOUND');
      if (!po.saleOrderId) throw new APIError('PO is not linked to a sale order', 400, 'NOT_LINKED');
      if ((po.receivedQty || 0) > 0) {
        throw new APIError('Cannot cancel PO after any quantity has been received', 400, 'PO_RECEIVED');
      }
      if (po.status === 'CANCELLED') throw new APIError('PO already cancelled', 400, 'ALREADY_CANCELLED');

      await tx.purchaseOrder.update({
        where: { id: poId },
        data: { status: 'CANCELLED', updatedBy: userId },
      });

      await saleOrderStatusService.transition({
        tx,
        saleOrderId: po.saleOrderId,
        toStatus: 'PO_CANCELLED',
        userId,
        remark: remark || `PO ${po.poNumber} cancelled`,
        source: 'PO',
        referenceType: 'PurchaseOrder',
        referenceId: po.id,
      });

      return po;
    });
  }

  /** Issue stock and move SO to PRE_QC (log STOCK_ISSUED + PRE_QC) */
  async issueToPreQc(saleOrderId, userId, { inventoryItemIds = [] } = {}) {
    return prisma.$transaction(async (tx) => {
      const so = await tx.saleOrder.findUnique({
        where: { id: saleOrderId, deleteStatus: false },
        include: {
          purchaseOrders: {
            where: { deleteStatus: false, status: { not: 'CANCELLED' } },
          },
        },
      });
      if (!so) throw new APIError('Sale order not found', 404, 'ORDER_NOT_FOUND');

      const allowedFrom = ['DRAFT', 'PO_RECEIVED', 'PO_CANCELLED', 'PRE_QC_REJECTED', 'POST_QC_REJECTED', 'PRE_QC_SCRAPPED', 'POST_QC_SCRAPPED'];
      if (!allowedFrom.includes(so.status)) {
        throw new APIError(`Cannot issue from status ${so.status}`, 400, 'INVALID_STATUS');
      }

      const openPo = so.purchaseOrders.find((p) => ['DRAFT', 'PO_PARTIAL_RECEIVED'].includes(p.status));
      if (openPo && so.status !== 'PO_RECEIVED') {
        throw new APIError('Open PO blocks shelf issue until PO is fully received or cancelled', 400, 'OPEN_PO');
      }

      const requiredEyes = (so.rightEye ? 1 : 0) + (so.leftEye ? 1 : 0);
      if (requiredEyes === 2 && inventoryItemIds.length > 0 && inventoryItemIds.length < 2) {
        throw new APIError('Both RE and LE inventory items required', 400, 'BOTH_EYES_REQUIRED');
      }

      // Reserve each selected inventory item (1 unit per eye) via the shared,
      // quantity-aware reservation path. Runs inside this same transaction
      // (tx passed through as dbClient) so a failure on any item (e.g.
      // INSUFFICIENT_STOCK/ITEM_NOT_AVAILABLE) rolls back all earlier
      // reservations made in this call.
      for (const itemId of inventoryItemIds) {
        try {
          if (typeof itemId === 'string' && itemId.startsWith('rec_')) {
            const receiptId = parseInt(itemId.replace('rec_', ''), 10);
            
            // 1. Fetch the PurchaseOrderReceipt and its purchaseOrder
            const receipt = await tx.purchaseOrderReceipt.findUnique({
              where: { id: receiptId },
              include: { purchaseOrder: true },
            });
            if (!receipt) throw new APIError('Purchase order receipt not found', 404, 'RECEIPT_NOT_FOUND');
            if (receipt.inwardedQty >= receipt.totalReceivedQty) {
              throw new APIError('Receipt has no pending inward quantity', 400, 'NO_PENDING_QTY');
            }

            // 2. Find a location and tray to auto-inward into
            const location = await tx.locationMaster.findFirst({ where: { deleteStatus: false } });
            if (!location) throw new APIError('No location found for auto-inward', 400, 'NO_LOCATION_FOUND');
            const tray = await tx.trayMaster.findFirst({ where: { location_id: location.id, deleteStatus: false } });
            if (!tray) throw new APIError('No tray found for auto-inward', 400, 'NO_TRAY_FOUND');

            // 3. Create the InventoryItem on the fly
            const itemData = {
              lens_id: so.lens_id,
              category_id: so.category_id,
              Type_id: so.Type_id,
              coating_id: so.coating_id,
              dia_id: so.dia_id,
              fitting_id: so.fitting_id,
              tinting_id: so.tinting_id,
              location_id: location.id,
              tray_id: tray.id,
              quantity: 1, // we only issue 1 unit per eye
              costPrice: receipt.unitPrice || 0,
              batchNo: receipt.receiptNumber,
              purchaseOrderId: receipt.purchaseOrderId,
              purchaseReceiptId: receipt.id,
              vendorId: receipt.purchaseOrder?.vendorId,
              rightEye: so.rightEye,
              leftEye: so.leftEye,
              rightSpherical: so.rightSpherical,
              rightCylindrical: so.rightCylindrical,
              rightAdd: so.rightAdd,
              leftSpherical: so.leftSpherical,
              leftCylindrical: so.leftCylindrical,
              leftAdd: so.leftAdd,
              status: 'AVAILABLE',
              createdBy: userId,
            };
            const item = await tx.inventoryItem.create({ data: itemData });

            // 4. Record the inward transaction and update the stock summary
            // bucket, mirroring InventoryService.createInventoryItem — without
            // this, reserveInventoryForSale's RESERVE step below finds no
            // matching stock bucket and silently no-ops the stock update.
            const transactionNo = await inventoryService.generateTransactionNumber(tx);
            await tx.inventoryTransaction.create({
              data: {
                transactionNo,
                type: 'INWARD_PO',
                inventoryItemId: item.id,
                quantity: itemData.quantity,
                balanceAfter: itemData.quantity,
                unitPrice: itemData.costPrice,
                totalValue: itemData.quantity * itemData.costPrice,
                toLocationId: itemData.location_id,
                toTrayId: itemData.tray_id,
                purchaseOrderId: itemData.purchaseOrderId,
                vendorId: itemData.vendorId,
                batchNo: itemData.batchNo,
                reason: 'Auto-inward from Inward Queue for Pre-QC issue',
                createdBy: userId,
              },
            });
            await inventoryService.updateInventoryStock(item, itemData.quantity, 'ADD', tx);

            // 5. Update the receipt's inwardedQty
            await tx.purchaseOrderReceipt.update({
              where: { id: receipt.id },
              data: {
                inwardedQty: { increment: 1 },
                updatedBy: userId,
              },
            });

            // 6. Reserve this item for the sale order
            await inventoryService.reserveInventoryForSale(item.id, 1, so.id, userId, tx);
          } else {
            // It's a standard inventory item
            const inventoryItemId = typeof itemId === 'string' && itemId.startsWith('inv_')
              ? parseInt(itemId.replace('inv_', ''), 10)
              : parseInt(itemId, 10);
            await inventoryService.reserveInventoryForSale(inventoryItemId, 1, so.id, userId, tx);
          }
        } catch (err) {
          const reason = err?.message || 'Failed to reserve inventory item';
          throw new APIError(
            `Could not reserve inventory item ${itemId}: ${reason}`,
            err?.statusCode || 400,
            err?.code || 'RESERVE_FAILED'
          );
        }
      }

      return saleOrderStatusService.transition({
        tx,
        saleOrderId,
        toStatus: 'PRE_QC',
        userId,
        remark: 'Stock issued to Pre-QC station',
        source: 'INVENTORY',
      });
    });
  }

  async onPoReceiveUpdateSo(poId, cumulativeReceivedQty, userId, tx) {
    const po = await tx.purchaseOrder.findUnique({
      where: { id: poId },
      include: { saleOrder: true },
    });
    if (!po?.saleOrderId || !po.saleOrder) return null;

    const requiredQty = requiredPoQty(po.saleOrder);
    const isFull = cumulativeReceivedQty >= requiredQty;

    if (isFull) {
      await saleOrderStatusService.transition({
        tx,
        saleOrderId: po.saleOrderId,
        toStatus: 'PO_RECEIVED',
        userId,
        remark: `PO ${po.poNumber} fully received`,
        source: 'PO',
        referenceType: 'PurchaseOrder',
        referenceId: po.id,
      });
    } else if (po.saleOrder.status === 'PO_RAISED') {
      // partial — SO unchanged; PO status handled in PO service
    }
    return po.saleOrder;
  }

  requiredPoQty(order) {
    return requiredPoQty(order);
  }
}

export default new SaleOrderWorkflowService();
