import prisma from '../config/prisma.js';
import { APIError } from '../middleware/errorHandler.js';
import { generateVoucherNumber, postVendorPayment } from './accountingService.js';
import {
  round2,
  computePayableAmount,
  PO_PAYABLE_SELECT,
  PO_PAYMENT_ELIGIBLE_STATUSES,
  syncPoPaidStatus,
} from '../utils/poPayable.js';
import { UPLOADS_PUBLIC_PREFIX } from '../middleware/upload.js';

const ELIGIBLE_PO_STATUSES = PO_PAYMENT_ELIGIBLE_STATUSES;

/** Map UI aliases to Prisma PaymentMethod enum. */
function normalizePaymentMethod(method) {
  const aliases = {
    CHEQUE: 'CHECK',
    CHEQUEUE: 'CHECK',
    NEFT: 'BANK_TRANSFER',
    RTGS: 'BANK_TRANSFER',
    IMPS: 'BANK_TRANSFER',
  };
  const key = String(method || '').trim().toUpperCase();
  return aliases[key] || key;
}

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
    const allocations = await prisma.vendorPaymentVoucherItem.findMany({
      where: { purchaseOrderId: { in: poIds } },
      select: { purchaseOrderId: true, allocatedAmount: true },
    });

    const paidByPo = allocations.reduce((acc, a) => {
      acc[a.purchaseOrderId] = (acc[a.purchaseOrderId] || 0) + parseFloat(a.allocatedAmount);
      return acc;
    }, {});

    return pos
      .map((po) => {
        const paid = paidByPo[po.id] || 0;
        const payable = computePayableAmount(po);
        const needsPricing = payable <= 0.01;
        const outstanding = needsPricing ? 0 : round2(Math.max(0, payable - paid));

        return {
          purchaseOrderId: po.id,
          poNumber: po.poNumber,
          status: po.status,
          orderDate: po.orderDate,
          expectedDeliveryDate: po.expectedDeliveryDate,
          totalValue: payable,
          payableAmount: payable,
          paidAmount: round2(paid),
          outstanding,
          needsPricing,
          receivedQty: parseFloat(po.receivedQty) || 0,
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

  async create(payload, userId, invoiceFile) {
    const {
      vendorId,
      paymentDate,
      bankLedgerId,
      referenceNo,
      notes,
      totalAmount,
      subtotalAmount,
      taxAmount,
      vendorInvoiceNo,
      items,
      poIds,
    } = payload;
    const paymentMethod = normalizePaymentMethod(payload.paymentMethod);

    if (!vendorId || !paymentMethod || !bankLedgerId) {
      throw new APIError('vendorId, paymentMethod, bankLedgerId required', 400, 'VALIDATION_ERROR');
    }
    if (!invoiceFile) {
      throw new APIError('Vendor invoice copy (PDF or image) is required', 400, 'INVOICE_COPY_REQUIRED');
    }
    if (!vendorInvoiceNo?.trim()) {
      throw new APIError('Vendor invoice number is required', 400, 'VALIDATION_ERROR');
    }

    const total = round2(totalAmount);
    const subtotal = round2(subtotalAmount);
    const tax = round2(taxAmount);

    if (total <= 0) throw new APIError('Total amount must be greater than zero', 400, 'VALIDATION_ERROR');
    if (subtotal < 0 || tax < 0) {
      throw new APIError('Subtotal and GST must be zero or greater', 400, 'VALIDATION_ERROR');
    }
    if (Math.abs(subtotal + tax - total) > 0.01) {
      throw new APIError(
        `Invoice subtotal (${subtotal}) + GST (${tax}) must equal total (${total})`,
        400,
        'INVOICE_TOTAL_MISMATCH'
      );
    }

    let lineItems = items || [];
    if (!lineItems.length && poIds?.length) {
      throw new APIError('Each PO must include subtotal, GST, and payment amount', 400, 'VALIDATION_ERROR');
    }
    if (!lineItems.length) {
      throw new APIError('At least one PO line is required', 400, 'VALIDATION_ERROR');
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

    const outstandingMap = Object.fromEntries(
      (await this._buildOutstandingForPos(pos)).map((r) => [r.purchaseOrderId, r])
    );

    const normalizedItems = [];
    let itemsSubtotal = 0;
    let itemsTax = 0;
    let itemsAllocated = 0;

    for (const item of lineItems) {
      const poId = parseInt(item.purchaseOrderId);
      const po = pos.find((p) => p.id === poId);
      const lineSubtotal = round2(item.subtotalAmount);
      const lineTax = round2(item.taxAmount);
      const lineTotal = round2(lineSubtotal + lineTax);
      const allocated = round2(item.allocatedAmount ?? lineTotal);

      if (lineSubtotal < 0 || lineTax < 0) {
        throw new APIError(`Invalid amounts for PO ${po?.poNumber || poId}`, 400, 'VALIDATION_ERROR');
      }
      if (Math.abs(lineTotal - (lineSubtotal + lineTax)) > 0.01) {
        throw new APIError(`PO ${po?.poNumber || poId}: subtotal + GST must equal line total`, 400, 'PO_LINE_MISMATCH');
      }
      if (allocated > lineTotal + 0.01) {
        throw new APIError(`Payment for PO ${po?.poNumber || poId} exceeds invoice line total`, 400, 'OVER_ALLOCATION');
      }
      if (allocated <= 0) {
        throw new APIError(`Payment amount required for PO ${po?.poNumber || poId}`, 400, 'VALIDATION_ERROR');
      }

      const row = outstandingMap[poId];
      if (row?.needsPricing) {
        if (allocated > lineTotal + 0.01) {
          throw new APIError(
            `Allocation for ${po?.poNumber || poId} exceeds declared PO invoice total`,
            400,
            'OVER_ALLOCATION'
          );
        }
      } else if (allocated > (row?.outstanding ?? 0) + 0.01) {
        throw new APIError(
          `Allocation for ${po?.poNumber || poId} exceeds PO outstanding`,
          400,
          'OVER_ALLOCATION'
        );
      }

      itemsSubtotal = round2(itemsSubtotal + lineSubtotal);
      itemsTax = round2(itemsTax + lineTax);
      itemsAllocated = round2(itemsAllocated + allocated);

      normalizedItems.push({
        purchaseOrderId: poId,
        subtotalAmount: lineSubtotal,
        taxAmount: lineTax,
        allocatedAmount: allocated,
        poInvoiceTotal: lineTotal,
        notes: item.notes || null,
      });
    }

    if (Math.abs(itemsSubtotal - subtotal) > 0.01) {
      throw new APIError(
        `Sum of PO subtotals (${itemsSubtotal}) must equal invoice subtotal (${subtotal})`,
        400,
        'SUBTOTAL_MISMATCH'
      );
    }
    if (Math.abs(itemsTax - tax) > 0.01) {
      throw new APIError(
        `Sum of PO GST (${itemsTax}) must equal invoice GST (${tax})`,
        400,
        'TAX_MISMATCH'
      );
    }
    if (Math.abs(itemsAllocated - total) > 0.01) {
      throw new APIError(
        `Sum of PO payments (${itemsAllocated}) must equal total payment (${total})`,
        400,
        'ALLOCATION_MISMATCH'
      );
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: parseInt(vendorId) },
      select: { id: true, code: true, ledgerId: true },
    });
    if (!vendor) throw new APIError('Vendor not found', 404, 'VENDOR_NOT_FOUND');

    const voucherNumber = await generateVoucherNumber();
    const invoiceCopyPath = `${UPLOADS_PUBLIC_PREFIX}/${invoiceFile.filename}`;
    const now = new Date();

    return prisma.$transaction(async (tx) => {
      for (const item of normalizedItems) {
        const po = pos.find((p) => p.id === item.purchaseOrderId);
        await tx.purchaseOrder.update({
          where: { id: item.purchaseOrderId },
          data: {
            subtotal: item.subtotalAmount,
            taxAmount: item.taxAmount,
            totalValue: item.poInvoiceTotal,
            supplierInvoiceNo: vendorInvoiceNo.trim(),
            status: po?.status === 'PAID' ? 'PAID' : 'INVOICE_RECEIVED',
            updatedBy: userId,
          },
        });
      }

      const voucher = await tx.vendorPaymentVoucher.create({
        data: {
          voucherNumber,
          vendorId: parseInt(vendorId),
          paymentDate: paymentDate ? new Date(paymentDate) : now,
          totalAmount: total,
          subtotalAmount: subtotal,
          taxAmount: tax,
          vendorInvoiceNo: vendorInvoiceNo.trim(),
          invoiceCopyPath,
          paymentMethod,
          bankLedgerId: parseInt(bankLedgerId),
          referenceNo: referenceNo || null,
          notes: notes || null,
          closedStatus: true,
          closedAt: now,
          createdBy: userId,
          items: {
            create: normalizedItems.map((item) => ({
              purchaseOrderId: item.purchaseOrderId,
              subtotalAmount: item.subtotalAmount,
              taxAmount: item.taxAmount,
              allocatedAmount: item.allocatedAmount,
              notes: item.notes,
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
        normalizedItems.map((i) => i.purchaseOrderId),
        userId
      );

      return voucher;
    });
  }
}
