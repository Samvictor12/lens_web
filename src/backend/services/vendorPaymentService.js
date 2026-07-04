import prisma from '../config/prisma.js';
import { APIError } from '../middleware/errorHandler.js';
import { generateVoucherNumber, postVendorPayment } from './accountingService.js';
import { distributePayment } from '../utils/paymentAllocation.js';
import {
  round2,
  computePayableAmount,
  PO_PAYABLE_SELECT,
  PO_PAYMENT_ELIGIBLE_STATUSES,
  syncPoPaidStatus,
} from '../utils/poPayable.js';

const ELIGIBLE_PO_STATUSES = PO_PAYMENT_ELIGIBLE_STATUSES;

export class VendorPaymentService {

  async generateVoucherNo() {
    return generateVoucherNumber();
  }

  async list({ vendorId, from, to, paymentMethod, page = 1, limit = 20 }) {
    const where = {
      delete_status: false,
      ...(vendorId && { vendorId: parseInt(vendorId) }),
      ...(paymentMethod && { paymentMethod }),
      ...((from || to) && {
        paymentDate: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) }),
        },
      }),
    };
    const [data, total] = await Promise.all([
      prisma.vendorPaymentVoucher.findMany({
        where,
        include: {
          vendor: { select: { id: true, code: true, name: true } },
          bankLedger: { select: { id: true, ledgerName: true } },
          items: {
            include: {
              purchaseOrder: { select: { id: true, poNumber: true, orderDate: true } },
            },
          },
        },
        orderBy: { paymentDate: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.vendorPaymentVoucher.count({ where }),
    ]);
    return { data, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id) {
    const v = await prisma.vendorPaymentVoucher.findFirst({
      where: { id, delete_status: false },
      include: {
        vendor: true,
        bankLedger: true,
        items: { include: { purchaseOrder: { select: { id: true, poNumber: true, totalValue: true, receivedQty: true, orderDate: true } } } },
        createdByUser: { select: { id: true, name: true } },
      },
    });
    if (!v) throw new APIError('Voucher not found', 404, 'NOT_FOUND');
    return v;
  }

  async closeVoucher(id, userId) {
    const v = await prisma.vendorPaymentVoucher.findFirst({
      where: { id, delete_status: false },
    });
    if (!v) throw new APIError('Voucher not found', 404, 'NOT_FOUND');
    if (v.closedStatus) throw new APIError('Voucher already closed', 400, 'ALREADY_CLOSED');

    return prisma.vendorPaymentVoucher.update({
      where: { id },
      data: { closedStatus: true, closedAt: new Date(), updatedBy: userId },
      include: {
        vendor: true,
        bankLedger: true,
        items: { include: { purchaseOrder: { select: { id: true, poNumber: true, totalValue: true, receivedQty: true } } } },
        createdByUser: { select: { id: true, name: true } },
      },
    });
  }

  async _buildOutstandingForPos(pos) {
    if (!pos.length) return [];

    const poIds = pos.map((p) => p.id);
    const [allocations, receipts] = await Promise.all([
      prisma.vendorPaymentVoucherItem.findMany({
        where: { purchaseOrderId: { in: poIds } },
        select: { purchaseOrderId: true, allocatedAmount: true },
      }),
      prisma.purchaseOrderReceipt.findMany({
        where: { purchaseOrderId: { in: poIds }, deleteStatus: false },
        select: {
          purchaseOrderId: true,
          totalValue: true,
          subtotal: true,
          taxAmount: true,
          receivedItems: true,
        },
      }),
    ]);

    const paidByPo = allocations.reduce((acc, a) => {
      acc[a.purchaseOrderId] = (acc[a.purchaseOrderId] || 0) + parseFloat(a.allocatedAmount);
      return acc;
    }, {});

    const receiptsByPo = receipts.reduce((acc, r) => {
      if (!acc[r.purchaseOrderId]) acc[r.purchaseOrderId] = [];
      acc[r.purchaseOrderId].push(r);
      return acc;
    }, {});

    return pos
      .map((po) => {
        const paid = paidByPo[po.id] || 0;
        const payable = computePayableAmount(po, receiptsByPo[po.id] || []);
        const outstanding = round2(Math.max(0, payable - paid));
        const receivedQty = parseFloat(po.receivedQty) || 0;
        const needsPricing = payable <= 0.01 && receivedQty > 0.01;

        return {
          purchaseOrderId: po.id,
          poNumber: po.poNumber,
          status: po.status,
          orderDate: po.orderDate,
          expectedDeliveryDate: po.expectedDeliveryDate,
          totalValue: payable > 0.01 ? payable : round2(parseFloat(po.totalValue) || 0),
          payableAmount: payable,
          paidAmount: round2(paid),
          outstanding: needsPricing ? 0 : outstanding,
          needsPricing,
          receivedQty,
        };
      })
      .filter((p) => p.outstanding > 0.01 || p.needsPricing);
  }

  async getOutstanding(vendorId) {
    if (!vendorId) throw new APIError('vendorId is required', 400, 'VALIDATION_ERROR');
    const vid = parseInt(vendorId);

    const vendor = await prisma.vendor.findFirst({ where: { id: vid }, select: { id: true, name: true, code: true } });
    if (!vendor) throw new APIError('Vendor not found', 404, 'VENDOR_NOT_FOUND');

    const pos = await prisma.purchaseOrder.findMany({
      where: { vendorId: vid, deleteStatus: false, status: { in: ELIGIBLE_PO_STATUSES } },
      select: { ...PO_PAYABLE_SELECT },
    });

    const purchaseOrders = await this._buildOutstandingForPos(pos);
    const totalPayable = purchaseOrders.reduce((s, p) => s + p.totalValue, 0);
    const totalPaid = purchaseOrders.reduce((s, p) => s + p.paidAmount, 0);

    return {
      vendorId: vendor.id,
      vendorName: vendor.name,
      vendorCode: vendor.code,
      totalPayable: round2(totalPayable),
      totalPaid: round2(totalPaid),
      outstanding: round2(totalPayable - totalPaid),
      purchaseOrders,
    };
  }

  async listOutstandingGrouped() {
    const pos = await prisma.purchaseOrder.findMany({
      where: { deleteStatus: false, status: { in: ELIGIBLE_PO_STATUSES }, vendorId: { not: null } },
      select: {
        ...PO_PAYABLE_SELECT,
        vendor: { select: { id: true, code: true, name: true } },
      },
      orderBy: [{ expectedDeliveryDate: 'asc' }, { orderDate: 'asc' }, { poNumber: 'asc' }],
    });

    const outstandingRows = await this._buildOutstandingForPos(pos);
    const groupMap = new Map();

    for (const row of outstandingRows) {
      const po = pos.find((p) => p.id === row.purchaseOrderId);
      const vid = po?.vendorId;
      if (!vid) continue;

      if (!groupMap.has(vid)) {
        groupMap.set(vid, {
          vendorId: vid,
          vendorName: po.vendor?.name || '',
          vendorCode: po.vendor?.code || '',
          purchaseOrders: [],
        });
      }
      groupMap.get(vid).purchaseOrders.push(row);
    }

    return { groups: Array.from(groupMap.values()) };
  }

  async create({ vendorId, paymentDate, paymentMethod, bankLedgerId, referenceNo, notes, totalAmount, items, poIds }, userId) {
    if (!vendorId || !paymentMethod || !bankLedgerId) {
      throw new APIError('vendorId, paymentMethod, bankLedgerId required', 400, 'VALIDATION_ERROR');
    }

    const total = round2(totalAmount);
    if (total <= 0) throw new APIError('Total amount must be greater than zero', 400, 'VALIDATION_ERROR');

    let lineItems = items || [];
    if (!lineItems.length && poIds?.length) {
      lineItems = poIds.map((id) => ({ purchaseOrderId: parseInt(id) }));
    }
    if (!lineItems.length) {
      throw new APIError('items[] or poIds[] required', 400, 'VALIDATION_ERROR');
    }

    const poIdsResolved = lineItems.map((i) => parseInt(i.purchaseOrderId));
    const pos = await prisma.purchaseOrder.findMany({
      where: { id: { in: poIdsResolved }, vendorId: parseInt(vendorId), deleteStatus: false },
      select: { ...PO_PAYABLE_SELECT },
    });

    if (pos.length !== poIdsResolved.length) {
      throw new APIError('One or more POs do not belong to this vendor', 400, 'INVALID_PO');
    }

    for (const po of pos) {
      if (!ELIGIBLE_PO_STATUSES.includes(po.status)) {
        throw new APIError(`PO ${po.poNumber} is not eligible for payment`, 400, 'PO_NOT_ELIGIBLE');
      }
    }

    const outstandingRows = await this._buildOutstandingForPos(pos);
    const outstandingMap = Object.fromEntries(
      outstandingRows.map((r) => [r.purchaseOrderId, r.outstanding])
    );
    const needsPricingMap = Object.fromEntries(
      outstandingRows.map((r) => [r.purchaseOrderId, r.needsPricing])
    );

    const allocationItems = pos.map((po) => ({
      id: po.id,
      outstanding:
        needsPricingMap[po.id] && total > 0.01
          ? total
          : outstandingMap[po.id] || 0,
      dueDate: po.expectedDeliveryDate,
      orderDate: po.orderDate,
      documentNo: po.poNumber,
    }));

    const overrides = {};
    let hasExplicit = false;
    for (const item of lineItems) {
      const poId = parseInt(item.purchaseOrderId);
      if (item.allocatedAmount != null && item.allocatedAmount !== '') {
        overrides[poId] = parseFloat(item.allocatedAmount);
        hasExplicit = true;
      }
    }

    const { allocations, remaining } = distributePayment({
      items: allocationItems,
      totalAmount: total,
      overrides: hasExplicit ? overrides : {},
    });

    if (remaining > 0.01) {
      throw new APIError(`Payment exceeds PO outstanding by ₹${remaining.toFixed(2)}`, 400, 'EXCESS_PAYMENT');
    }

    const allocationSum = round2(allocations.reduce((s, a) => s + a.amount, 0));
    if (Math.abs(allocationSum - total) > 0.01) {
      throw new APIError(`Allocations (${allocationSum}) must equal total (${total})`, 400, 'ALLOCATION_MISMATCH');
    }

    for (const alloc of allocations) {
      const po = pos.find((p) => p.id === alloc.id);
      const recordedOutstanding = outstandingMap[alloc.id] || 0;
      const maxOutstanding =
        needsPricingMap[alloc.id] && total > 0.01
          ? total
          : recordedOutstanding;
      if (alloc.amount > maxOutstanding + 0.01) {
        throw new APIError(
          `Allocation for ${po?.poNumber || alloc.id} exceeds PO outstanding`,
          400,
          'OVER_ALLOCATION'
        );
      }
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: parseInt(vendorId) },
      select: { id: true, code: true, ledgerId: true },
    });
    if (!vendor) throw new APIError('Vendor not found', 404, 'VENDOR_NOT_FOUND');

    const voucherNumber = await generateVoucherNumber();

    return prisma.$transaction(async (tx) => {
      const voucher = await tx.vendorPaymentVoucher.create({
        data: {
          voucherNumber,
          vendorId: parseInt(vendorId),
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          totalAmount: total,
          paymentMethod,
          bankLedgerId: parseInt(bankLedgerId),
          referenceNo: referenceNo || null,
          notes: notes || null,
          createdBy: userId,
          items: {
            create: allocations
              .filter((a) => a.amount > 0)
              .map((a) => ({
                purchaseOrderId: a.id,
                allocatedAmount: a.amount,
                notes: lineItems.find((i) => parseInt(i.purchaseOrderId) === a.id)?.notes || null,
              })),
          },
        },
        include: { items: true },
      });

      await postVendorPayment(tx, {
        voucherId: voucher.id,
        voucherNumber,
        totalAmount: total,
        bankLedgerId: parseInt(bankLedgerId),
        vendor,
      }, userId);

      await syncPoPaidStatus(
        tx,
        allocations.filter((a) => a.amount > 0).map((a) => a.id),
        userId
      );

      return voucher;
    });
  }
}
