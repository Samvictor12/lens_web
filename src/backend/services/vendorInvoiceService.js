import prisma from '../config/prisma.js';
import { APIError } from '../middleware/errorHandler.js';
import {
  round2,
  computePayableAmount,
  PO_PAYABLE_SELECT,
  PO_VENDOR_INVOICE_ELIGIBLE_STATUSES,
  hasSupplierInvoiceNo,
  poStatusAfterBillRemoval,
} from '../utils/poPayable.js';
import { UPLOADS_PUBLIC_PREFIX } from '../middleware/upload.js';

const ELIGIBLE_PO_STATUSES = PO_VENDOR_INVOICE_ELIGIBLE_STATUSES;

function istDayStart(dateStr) {
  return new Date(`${dateStr}T00:00:00+05:30`);
}

function istDayEnd(dateStr) {
  return new Date(`${dateStr}T23:59:59.999+05:30`);
}

function receiptReceiveDateWhere(startDate, endDate) {
  if (!startDate && !endDate) return {};
  const range = {};
  if (startDate) range.gte = istDayStart(startDate);
  if (endDate) range.lte = istDayEnd(endDate);
  return {
    OR: [
      { actualDeliveryDate: range },
      { AND: [{ actualDeliveryDate: null }, { receivedDate: range }] },
    ],
  };
}

function latestReceiptInstant(receipts) {
  return (receipts || []).reduce((best, r) => {
    const t = r.actualDeliveryDate || r.receivedDate;
    if (!t) return best;
    if (!best || t > best) return t;
    return best;
  }, null);
}

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

  async summary({ vendorId, from, to } = {}) {
    const where = {
      deleteStatus: false,
      status: { not: 'CANCELLED' },
      ...(vendorId && { vendorId: parseInt(vendorId, 10) }),
      ...((from || to) && {
        invoiceDate: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) }),
        },
      }),
    };
    const agg = await prisma.vendorInvoice.aggregate({
      where,
      _count: { id: true },
      _sum: { totalAmount: true, paidAmount: true, taxAmount: true, subtotalAmount: true },
    });
    const totalBilled = round2(parseFloat(agg._sum.totalAmount) || 0);
    const paidAmount = round2(parseFloat(agg._sum.paidAmount) || 0);
    return {
      billCount: agg._count.id || 0,
      totalBilled,
      taxAmount: round2(parseFloat(agg._sum.taxAmount) || 0),
      subtotalAmount: round2(parseFloat(agg._sum.subtotalAmount) || 0),
      outstanding: round2(totalBilled - paidAmount),
    };
  }

  async getById(id) {
    const inv = await prisma.vendorInvoice.findFirst({
      where: { id: parseInt(id, 10), deleteStatus: false },
      include: {
        vendor: true,
        items: {
          include: {
            purchaseOrder: {
              select: {
                ...PO_PAYABLE_SELECT,
                receipts: {
                  where: { deleteStatus: false },
                  select: { actualDeliveryDate: true, receivedDate: true },
                  orderBy: { receivedDate: 'desc' },
                },
              },
            },
          },
        },
        createdByUser: { select: { id: true, name: true } },
      },
    });
    if (!inv) throw new APIError('Vendor invoice not found', 404, 'NOT_FOUND');
    const paidAmount = round2(parseFloat(inv.paidAmount) || 0);
    const editable = inv.status === 'OUTSTANDING' && paidAmount <= 0.001;
    return {
      ...inv,
      paidAmount,
      outstanding: round2(parseFloat(inv.totalAmount) - paidAmount),
      editable,
      items: inv.items.map((item) => ({
        ...item,
        purchaseOrder: item.purchaseOrder
          ? {
              ...item.purchaseOrder,
              receivedDate: latestReceiptInstant(item.purchaseOrder.receipts),
            }
          : item.purchaseOrder,
      })),
    };
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
   * POs eligible for Vendor Invoice create:
   * - status ∈ PO_VENDOR_INVOICE_ELIGIBLE_STATUSES (PO_PARTIAL_RECEIVED, RECEIVED)
   * - not linked via VendorInvoiceItem to a non-cancelled VendorInvoice
   * - supplierInvoiceNo null/empty (legacy/Excel mark excluded)
   * - optional receive_start_date / receive_end_date on receipt receive date (IST)
   */
  async listEligiblePOs(vendorId, queryParams = {}) {
    if (!vendorId) throw new APIError('vendorId is required', 400, 'VALIDATION_ERROR');
    const vid = parseInt(vendorId, 10);
    const receiveStart =
      queryParams.receive_start_date || queryParams.receiveStartDate || null;
    const receiveEnd =
      queryParams.receive_end_date || queryParams.receiveEndDate || null;

    const vendor = await prisma.vendor.findFirst({
      where: { id: vid },
      select: { id: true, name: true, code: true },
    });
    if (!vendor) throw new APIError('Vendor not found', 404, 'VENDOR_NOT_FOUND');

    const invoicedLinks = await prisma.vendorInvoiceItem.findMany({
      where: {
        vendorInvoice: { deleteStatus: false, status: { not: 'CANCELLED' }, vendorId: vid },
      },
      select: { purchaseOrderId: true },
    });
    const invoicedPoIds = [...new Set(invoicedLinks.map((l) => l.purchaseOrderId))];

    const where = {
      vendorId: vid,
      deleteStatus: false,
      status: { in: ELIGIBLE_PO_STATUSES },
      AND: [
        { OR: [{ supplierInvoiceNo: null }, { supplierInvoiceNo: '' }] },
      ],
      ...(invoicedPoIds.length ? { id: { notIn: invoicedPoIds } } : {}),
    };

    if (receiveStart || receiveEnd) {
      where.receipts = {
        some: {
          deleteStatus: false,
          ...receiptReceiveDateWhere(receiveStart, receiveEnd),
        },
      };
    }

    const pos = await prisma.purchaseOrder.findMany({
      where,
      select: {
        ...PO_PAYABLE_SELECT,
        receipts: {
          where: { deleteStatus: false },
          select: { actualDeliveryDate: true, receivedDate: true },
          orderBy: { receivedDate: 'desc' },
        },
      },
      orderBy: [{ orderDate: 'desc' }, { poNumber: 'asc' }],
    });

    return {
      vendorId: vendor.id,
      vendorName: vendor.name,
      vendorCode: vendor.code,
      purchaseOrders: pos.map((po) => ({
        purchaseOrderId: po.id,
        poNumber: po.poNumber,
        status: po.status,
        orderDate: po.orderDate,
        expectedDeliveryDate: po.expectedDeliveryDate,
        receivedDate: latestReceiptInstant(po.receipts),
        subtotal: round2(parseFloat(po.subtotal) || 0),
        taxAmount: round2(parseFloat(po.taxAmount) || 0),
        totalValue: computePayableAmount(po),
        receivedQty: parseFloat(po.receivedQty) || 0,
      })),
    };
  }

  /**
   * Register a vendor invoice against one or more PO(s). Locks in the actual supplier
   * invoice amounts on the PO rows (mirrors legacy vendorPaymentService.create behavior)
   * and creates an OUTSTANDING VendorInvoice for later payment allocation.
   */
  async create(payload, userId, invoiceFile) {
    const { vendorId, supplierInvoiceNo, invoiceDate, notes, items, courierCharges: courierRaw } = payload;

    if (!vendorId) throw new APIError('vendorId is required', 400, 'VALIDATION_ERROR');
    if (!supplierInvoiceNo?.trim()) throw new APIError('Vendor invoice number is required', 400, 'VALIDATION_ERROR');
    if (!invoiceFile) throw new APIError('Vendor invoice copy (PDF or image) is required', 400, 'INVOICE_COPY_REQUIRED');
    if (!items?.length) throw new APIError('At least one PO line is required', 400, 'VALIDATION_ERROR');

    const courierCharges = round2(courierRaw || 0);
    if (courierCharges < 0) {
      throw new APIError('Courier charges cannot be negative', 400, 'VALIDATION_ERROR');
    }

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
      if (hasSupplierInvoiceNo(po)) {
        throw new APIError(
          `PO ${po.poNumber} already has a supplier invoice number and cannot be re-invoiced`,
          400,
          'PO_ALREADY_INVOICED'
        );
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

    totalAmount = round2(totalAmount + courierCharges);

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
          courierCharges,
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

  /**
   * Update an outstanding, unpaid vendor invoice: header fields, PO lines (add/remove/edit),
   * optional new invoice copy. Removed POs revert to RECEIVED / PO_PARTIAL_RECEIVED.
   */
  async update(id, payload, userId, invoiceFile) {
    const invoiceId = parseInt(id, 10);
    const invoice = await prisma.vendorInvoice.findFirst({
      where: { id: invoiceId, deleteStatus: false },
      include: {
        items: { include: { purchaseOrder: { select: PO_PAYABLE_SELECT } } },
      },
    });
    if (!invoice) throw new APIError('Vendor invoice not found', 404, 'NOT_FOUND');
    if (invoice.status !== 'OUTSTANDING') {
      throw new APIError('Only outstanding invoices can be edited', 400, 'NOT_EDITABLE');
    }
    if (parseFloat(invoice.paidAmount) > 0.01) {
      throw new APIError('Cannot edit an invoice with recorded payments', 400, 'HAS_PAYMENTS');
    }

    const { supplierInvoiceNo, invoiceDate, notes, items, courierCharges: courierRaw } = payload;
    if (!supplierInvoiceNo?.trim()) {
      throw new APIError('Vendor invoice number is required', 400, 'VALIDATION_ERROR');
    }
    if (!items?.length) throw new APIError('At least one PO line is required', 400, 'VALIDATION_ERROR');
    if (!invoiceFile && !invoice.invoiceCopyPath) {
      throw new APIError('Vendor invoice copy (PDF or image) is required', 400, 'INVOICE_COPY_REQUIRED');
    }

    const courierCharges = round2(courierRaw || 0);
    if (courierCharges < 0) {
      throw new APIError('Courier charges cannot be negative', 400, 'VALIDATION_ERROR');
    }

    const existingPoIds = new Set(invoice.items.map((i) => i.purchaseOrderId));
    const poIdsResolved = items.map((i) => parseInt(i.purchaseOrderId, 10));
    const newPoIdSet = new Set(poIdsResolved);

    const pos = await prisma.purchaseOrder.findMany({
      where: {
        id: { in: poIdsResolved },
        vendorId: invoice.vendorId,
        deleteStatus: false,
      },
      select: PO_PAYABLE_SELECT,
    });
    if (pos.length !== poIdsResolved.length) {
      throw new APIError('One or more POs do not belong to this vendor', 400, 'INVALID_PO');
    }

    const addedPoIds = poIdsResolved.filter((pid) => !existingPoIds.has(pid));
    const removedPoIds = [...existingPoIds].filter((pid) => !newPoIdSet.has(pid));

    for (const poId of addedPoIds) {
      const po = pos.find((p) => p.id === poId);
      if (!ELIGIBLE_PO_STATUSES.includes(po?.status)) {
        throw new APIError(`PO ${po?.poNumber || poId} is not eligible for invoicing`, 400, 'PO_NOT_ELIGIBLE');
      }
      if (hasSupplierInvoiceNo(po)) {
        throw new APIError(
          `PO ${po.poNumber} already has a supplier invoice number and cannot be re-invoiced`,
          400,
          'PO_ALREADY_INVOICED'
        );
      }
    }

    if (addedPoIds.length) {
      const existingLinks = await prisma.vendorInvoiceItem.findMany({
        where: {
          purchaseOrderId: { in: addedPoIds },
          vendorInvoice: { deleteStatus: false, status: { not: 'CANCELLED' }, id: { not: invoiceId } },
        },
        include: { purchaseOrder: { select: { poNumber: true } } },
      });
      if (existingLinks.length > 0) {
        const names = existingLinks.map((l) => l.purchaseOrder?.poNumber).join(', ');
        throw new APIError(`PO(s) already invoiced: ${names}`, 400, 'PO_ALREADY_INVOICED');
      }
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

    totalAmount = round2(totalAmount + courierCharges);
    if (totalAmount <= 0) throw new APIError('Total invoice amount must be greater than zero', 400, 'VALIDATION_ERROR');

    const supplierNo = supplierInvoiceNo.trim();
    const invoiceCopyPath = invoiceFile
      ? `${UPLOADS_PUBLIC_PREFIX}/${invoiceFile.filename}`
      : invoice.invoiceCopyPath;

    const removedPos = invoice.items
      .filter((i) => removedPoIds.includes(i.purchaseOrderId))
      .map((i) => i.purchaseOrder);

    return prisma.$transaction(async (tx) => {
      for (const po of removedPos) {
        if (!po) continue;
        await tx.vendorInvoiceItem.deleteMany({
          where: { vendorInvoiceId: invoiceId, purchaseOrderId: po.id },
        });
        await tx.purchaseOrder.update({
          where: { id: po.id },
          data: {
            supplierInvoiceNo: null,
            status: poStatusAfterBillRemoval(po),
            updatedBy: userId,
          },
        });
      }

      for (const item of normalizedItems) {
        const po = pos.find((p) => p.id === item.purchaseOrderId);
        const existingItem = invoice.items.find((i) => i.purchaseOrderId === item.purchaseOrderId);

        await tx.purchaseOrder.update({
          where: { id: item.purchaseOrderId },
          data: {
            subtotal: item.subtotalAmount,
            taxAmount: item.taxAmount,
            totalValue: item.amount,
            supplierInvoiceNo: supplierNo,
            status: po?.status === 'PAID' ? 'PAID' : 'INVOICE_RECEIVED',
            updatedBy: userId,
          },
        });

        if (existingItem) {
          await tx.vendorInvoiceItem.update({
            where: { id: existingItem.id },
            data: {
              subtotalAmount: item.subtotalAmount,
              taxAmount: item.taxAmount,
              amount: item.amount,
            },
          });
        } else {
          await tx.vendorInvoiceItem.create({
            data: {
              vendorInvoiceId: invoiceId,
              purchaseOrderId: item.purchaseOrderId,
              subtotalAmount: item.subtotalAmount,
              taxAmount: item.taxAmount,
              amount: item.amount,
            },
          });
        }
      }

      return tx.vendorInvoice.update({
        where: { id: invoiceId },
        data: {
          supplierInvoiceNo: supplierNo,
          invoiceDate: invoiceDate ? new Date(invoiceDate) : invoice.invoiceDate,
          subtotalAmount,
          taxAmount,
          totalAmount,
          courierCharges,
          invoiceCopyPath,
          notes: notes ?? invoice.notes,
          updatedBy: userId,
        },
        include: {
          vendor: { select: { id: true, code: true, name: true } },
          items: { include: { purchaseOrder: { select: { id: true, poNumber: true } } } },
        },
      });
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
