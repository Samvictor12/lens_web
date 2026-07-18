import prisma from '../config/prisma.js';
import { APIError } from '../middleware/errorHandler.js';
import {
  round2,
  computePayableAmount,
  PO_PAYABLE_SELECT,
  PO_PAYMENT_ELIGIBLE_STATUSES,
} from '../utils/poPayable.js';
import { UPLOADS_PUBLIC_PREFIX } from '../middleware/upload.js';

const ELIGIBLE_PO_STATUSES = PO_PAYMENT_ELIGIBLE_STATUSES;

async function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const prefix = `VINV-${year}-`;
  const last = await prisma.vendorInvoice.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: 'desc' },
  });
  const next = last ? parseInt(last.invoiceNumber.split('-').pop(), 10) + 1 : 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}

/**
 * Invoice-first vendor payment workflow (M5): a VendorInvoice is registered against
 * one or more PurchaseOrder rows for a vendor BEFORE any payment is made. Payments
 * subsequently allocate against outstanding VendorInvoice rows (see vendorPaymentService).
 */
export class VendorInvoiceService {
  async list({ vendorId, status, from, to, page = 1, limit = 20 } = {}) {
    const where = {
      deleteStatus: false,
      ...(vendorId && { vendorId: parseInt(vendorId, 10) }),
      ...(status && { status }),
      ...((from || to) && {
        invoiceDate: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) }),
        },
      }),
    };
    const [data, total] = await Promise.all([
      prisma.vendorInvoice.findMany({
        where,
        include: {
          vendor: { select: { id: true, code: true, name: true } },
          items: {
            include: { purchaseOrder: { select: { id: true, poNumber: true, orderDate: true } } },
          },
        },
        orderBy: { invoiceDate: 'desc' },
        skip: (parseInt(page, 10) - 1) * parseInt(limit, 10),
        take: parseInt(limit, 10),
      }),
      prisma.vendorInvoice.count({ where }),
    ]);
    return {
      data: data.map((inv) => ({ ...inv, outstanding: round2(parseFloat(inv.totalAmount) - parseFloat(inv.paidAmount)) })),
      pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id) {
    const inv = await prisma.vendorInvoice.findFirst({
      where: { id: parseInt(id, 10), deleteStatus: false },
      include: {
        vendor: true,
        items: { include: { purchaseOrder: { select: { id: true, poNumber: true, totalValue: true, orderDate: true } } } },
        createdByUser: { select: { id: true, name: true } },
      },
    });
    if (!inv) throw new APIError('Vendor invoice not found', 404, 'NOT_FOUND');
    return { ...inv, outstanding: round2(parseFloat(inv.totalAmount) - parseFloat(inv.paidAmount)) };
  }

  /** Outstanding invoices (OUTSTANDING or PARTIALLY_PAID) — optionally scoped to one vendor. */
  async listOutstanding(vendorId) {
    const where = {
      deleteStatus: false,
      status: { in: ['OUTSTANDING', 'PARTIALLY_PAID'] },
      ...(vendorId && { vendorId: parseInt(vendorId, 10) }),
    };
    const invoices = await prisma.vendorInvoice.findMany({
      where,
      include: {
        vendor: { select: { id: true, code: true, name: true, shopname: true } },
        items: { include: { purchaseOrder: { select: { id: true, poNumber: true } } } },
      },
      orderBy: { invoiceDate: 'asc' },
    });

    const rows = invoices.map((inv) => ({
      ...inv,
      outstanding: round2(parseFloat(inv.totalAmount) - parseFloat(inv.paidAmount)),
    }));

    if (vendorId) return { invoices: rows };

    const groupMap = new Map();
    for (const inv of rows) {
      const vid = inv.vendorId;
      if (!groupMap.has(vid)) {
        groupMap.set(vid, {
          vendorId: vid,
          vendorName: inv.vendor?.shopname || inv.vendor?.name || '',
          vendorCode: inv.vendor?.code || '',
          invoices: [],
        });
      }
      groupMap.get(vid).invoices.push(inv);
    }
    return { groups: Array.from(groupMap.values()) };
  }

  /**
   * Register a vendor invoice against one or more PO(s). Locks in the actual supplier
   * invoice amounts on the PO rows (mirrors legacy vendorPaymentService.create behavior)
   * and creates an OUTSTANDING VendorInvoice for later payment allocation.
   */
  async create(payload, userId, invoiceFile) {
    const { vendorId, supplierInvoiceNo, invoiceDate, notes, items } = payload;

    if (!vendorId) throw new APIError('vendorId is required', 400, 'VALIDATION_ERROR');
    if (!supplierInvoiceNo?.trim()) throw new APIError('Vendor invoice number is required', 400, 'VALIDATION_ERROR');
    if (!invoiceFile) throw new APIError('Vendor invoice copy (PDF or image) is required', 400, 'INVOICE_COPY_REQUIRED');
    if (!items?.length) throw new APIError('At least one PO line is required', 400, 'VALIDATION_ERROR');

    const poIdsResolved = items.map((i) => parseInt(i.purchaseOrderId, 10));
    const pos = await prisma.purchaseOrder.findMany({
      where: { id: { in: poIdsResolved }, vendorId: parseInt(vendorId, 10), deleteStatus: false },
      select: { ...PO_PAYABLE_SELECT },
    });
    if (pos.length !== poIdsResolved.length) {
      throw new APIError('One or more POs do not belong to this vendor', 400, 'INVALID_PO');
    }
    for (const po of pos) {
      if (!ELIGIBLE_PO_STATUSES.includes(po.status)) {
        throw new APIError(`PO ${po.poNumber} is not eligible for invoicing`, 400, 'PO_NOT_ELIGIBLE');
      }
    }

    // A PO can only be attached to one outstanding/non-cancelled invoice at a time.
    const existingLinks = await prisma.vendorInvoiceItem.findMany({
      where: {
        purchaseOrderId: { in: poIdsResolved },
        vendorInvoice: { deleteStatus: false, status: { not: 'CANCELLED' } },
      },
      include: { purchaseOrder: { select: { poNumber: true } } },
    });
    if (existingLinks.length > 0) {
      const names = existingLinks.map((l) => l.purchaseOrder?.poNumber).join(', ');
      throw new APIError(`PO(s) already invoiced: ${names}`, 400, 'PO_ALREADY_INVOICED');
    }

    const normalizedItems = [];
    let subtotalAmount = 0;
    let taxAmount = 0;
    let totalAmount = 0;

    for (const item of items) {
      const poId = parseInt(item.purchaseOrderId, 10);
      const po = pos.find((p) => p.id === poId);
      const lineSubtotal = round2(item.subtotalAmount);
      const lineTax = round2(item.taxAmount);
      const lineTotal = round2(lineSubtotal + lineTax);

      if (lineSubtotal < 0 || lineTax < 0) {
        throw new APIError(`Invalid amounts for PO ${po?.poNumber || poId}`, 400, 'VALIDATION_ERROR');
      }

      normalizedItems.push({ purchaseOrderId: poId, subtotalAmount: lineSubtotal, taxAmount: lineTax, amount: lineTotal });
      subtotalAmount = round2(subtotalAmount + lineSubtotal);
      taxAmount = round2(taxAmount + lineTax);
      totalAmount = round2(totalAmount + lineTotal);
    }

    if (totalAmount <= 0) throw new APIError('Total invoice amount must be greater than zero', 400, 'VALIDATION_ERROR');

    const invoiceNumber = await generateInvoiceNumber();
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
            totalValue: item.amount,
            supplierInvoiceNo: supplierInvoiceNo.trim(),
            status: po?.status === 'PAID' ? 'PAID' : 'INVOICE_RECEIVED',
            updatedBy: userId,
          },
        });
      }

      const invoice = await tx.vendorInvoice.create({
        data: {
          invoiceNumber,
          vendorId: parseInt(vendorId, 10),
          supplierInvoiceNo: supplierInvoiceNo.trim(),
          invoiceDate: invoiceDate ? new Date(invoiceDate) : now,
          subtotalAmount,
          taxAmount,
          totalAmount,
          invoiceCopyPath,
          notes: notes || null,
          createdBy: userId,
          items: { create: normalizedItems },
        },
        include: {
          vendor: { select: { id: true, code: true, name: true } },
          items: { include: { purchaseOrder: { select: { id: true, poNumber: true } } } },
        },
      });

      return invoice;
    });
  }

  async cancel(id, userId) {
    const invoice = await prisma.vendorInvoice.findUnique({ where: { id: parseInt(id, 10) } });
    if (!invoice) throw new APIError('Vendor invoice not found', 404, 'NOT_FOUND');
    if (invoice.status === 'CANCELLED') throw new APIError('Invoice already cancelled', 400, 'ALREADY_CANCELLED');
    if (parseFloat(invoice.paidAmount) > 0.01) {
      throw new APIError('Cannot cancel an invoice with recorded payments', 400, 'HAS_PAYMENTS');
    }
    return prisma.vendorInvoice.update({
      where: { id: invoice.id },
      data: { status: 'CANCELLED', updatedBy: userId },
    });
  }
}

export default new VendorInvoiceService();
