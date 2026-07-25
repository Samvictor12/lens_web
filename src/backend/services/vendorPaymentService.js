import prisma from '../config/prisma.js';
import { APIError } from '../middleware/errorHandler.js';
import { generateVoucherNumber, postVendorPayment, postReversingTransaction } from './accountingService.js';
import {
  round2,
  computePayableAmount,
  PO_PAYABLE_SELECT,
  PO_PAYMENT_ELIGIBLE_STATUSES,
} from '../utils/poPayable.js';
import vendorInvoiceService from './vendorInvoiceService.js';

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
              vendorInvoice: { select: { id: true, invoiceNumber: true } },
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
        items: {
          include: {
            purchaseOrder: { select: { id: true, poNumber: true, totalValue: true, receivedQty: true, orderDate: true } },
            vendorInvoice: { select: { id: true, invoiceNumber: true, totalAmount: true, paidAmount: true, status: true } },
          },
        },
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
      where: {
        purchaseOrderId: { in: poIds },
        voucher: { cancelledStatus: false, delete_status: false },
      },
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
          subtotal: round2(parseFloat(po.subtotal) || 0),
          taxAmount: round2(parseFloat(po.taxAmount) || 0),
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
        vendor: {
          select: {
            id: true,
            code: true,
            name: true,
            shopname: true,
            city: true,
            phone: true,
            address: true,
            state: true,
          },
        },
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
        const v = po.vendor || {};
        groupMap.set(vid, {
          vendorId: vid,
          vendorName: v.shopname || v.name || '',
          vendorCode: v.code || '',
          shopname: v.shopname || '',
          city: v.city || '',
          phone: v.phone || '',
          address: [v.address, v.city, v.state].filter(Boolean).join(', '),
          purchaseOrders: [],
        });
      }
      groupMap.get(vid).purchaseOrders.push(row);
    }

    return { groups: Array.from(groupMap.values()) };
  }

  async create(_payload, _userId, _invoiceFile) {
    // M2: PO-direct creates are deprecated — use invoice-first /from-invoices.
    throw new APIError(
      'PO-direct vendor payments are deprecated. Register a vendor invoice and pay via POST /api/vendor-payments/from-invoices.',
      400,
      'USE_INVOICE_PAYMENT'
    );
  }

  // ── M5: Invoice-first payment workflow ──────────────────────────────────
  // Payments now allocate against outstanding VendorInvoice rows (registered up-front
  // via vendorInvoiceService) rather than raw POs. Multiple invoices for the SAME
  // vendor may be paid in a single voucher. Ledger posting (bank debit / vendor AP
  // credit) reuses the existing postVendorPayment — unchanged, confirmed pattern.

  /** Outstanding vendor invoices — single vendor list, or grouped-by-vendor when omitted. */
  async listOutstandingInvoices(vendorId) {
    return vendorInvoiceService.listOutstanding(vendorId);
  }

  async createFromInvoices(payload, userId) {
    const { vendorId, paymentDate, bankLedgerId, referenceNo, notes, items } = payload;
    const paymentMethod = normalizePaymentMethod(payload.paymentMethod);

    if (!vendorId || !paymentMethod || !bankLedgerId) {
      throw new APIError('vendorId, paymentMethod, bankLedgerId required', 400, 'VALIDATION_ERROR');
    }
    if (!items?.length) {
      throw new APIError('At least one vendor invoice must be selected', 400, 'VALIDATION_ERROR');
    }

    const vid = parseInt(vendorId, 10);
    const invoiceIds = items.map((i) => parseInt(i.vendorInvoiceId, 10));

    const invoices = await prisma.vendorInvoice.findMany({
      where: { id: { in: invoiceIds }, deleteStatus: false },
    });
    if (invoices.length !== invoiceIds.length) {
      throw new APIError('One or more vendor invoices not found', 404, 'INVOICE_NOT_FOUND');
    }
    for (const inv of invoices) {
      if (inv.vendorId !== vid) {
        throw new APIError(`Invoice ${inv.invoiceNumber} does not belong to this vendor`, 400, 'INVOICE_VENDOR_MISMATCH');
      }
      if (!['OUTSTANDING', 'PARTIALLY_PAID'].includes(inv.status)) {
        throw new APIError(`Invoice ${inv.invoiceNumber} is not payable (status: ${inv.status})`, 400, 'INVOICE_NOT_PAYABLE');
      }
    }

    const normalizedItems = [];
    let total = 0;
    for (const item of items) {
      const invId = parseInt(item.vendorInvoiceId, 10);
      const invoice = invoices.find((i) => i.id === invId);
      const outstanding = round2(parseFloat(invoice.totalAmount) - parseFloat(invoice.paidAmount));
      const allocated = round2(item.allocatedAmount);

      if (allocated <= 0) {
        throw new APIError(`Payment amount required for invoice ${invoice.invoiceNumber}`, 400, 'VALIDATION_ERROR');
      }
      if (allocated > outstanding + 0.01) {
        throw new APIError(`Allocation for ${invoice.invoiceNumber} exceeds outstanding (${outstanding})`, 400, 'OVER_ALLOCATION');
      }

      total = round2(total + allocated);
      normalizedItems.push({ vendorInvoiceId: invId, allocatedAmount: allocated });
    }

    if (total <= 0) throw new APIError('Total payment amount must be greater than zero', 400, 'VALIDATION_ERROR');

    const vendor = await prisma.vendor.findUnique({
      where: { id: vid },
      select: { id: true, code: true, ledgerId: true },
    });
    if (!vendor) throw new APIError('Vendor not found', 404, 'VENDOR_NOT_FOUND');

    const voucherNumber = await generateVoucherNumber();
    const now = new Date();

    return prisma.$transaction(async (tx) => {
      const voucher = await tx.vendorPaymentVoucher.create({
        data: {
          voucherNumber,
          vendorId: vid,
          paymentDate: paymentDate ? new Date(paymentDate) : now,
          totalAmount: total,
          paymentMethod,
          bankLedgerId: parseInt(bankLedgerId, 10),
          referenceNo: referenceNo || null,
          notes: notes || null,
          closedStatus: true,
          closedAt: now,
          createdBy: userId,
          items: {
            create: normalizedItems.map((item) => ({
              vendorInvoiceId: item.vendorInvoiceId,
              allocatedAmount: item.allocatedAmount,
            })),
          },
        },
        include: { items: true },
      });

      for (const item of normalizedItems) {
        const invoice = invoices.find((i) => i.id === item.vendorInvoiceId);
        const newPaid = round2(parseFloat(invoice.paidAmount) + item.allocatedAmount);
        const newStatus = newPaid >= round2(parseFloat(invoice.totalAmount)) - 0.01 ? 'PAID' : 'PARTIALLY_PAID';
        await tx.vendorInvoice.update({
          where: { id: invoice.id },
          data: { paidAmount: newPaid, status: newStatus, updatedBy: userId },
        });
      }

      await postVendorPayment(tx, {
        voucherId: voucher.id,
        voucherNumber,
        totalAmount: total,
        bankLedgerId: parseInt(bankLedgerId, 10),
        vendor,
      }, userId);

      // PO status sync for invoice-first flow: a PO is PAID once its owning VendorInvoice
      // is fully paid (voucher items reference vendorInvoiceId, not purchaseOrderId, so the
      // legacy syncPoPaidStatus PO-allocation lookup doesn't apply here).
      const fullyPaidInvoiceIds = normalizedItems
        .map((i) => i.vendorInvoiceId)
        .filter((id) => {
          const invoice = invoices.find((i) => i.id === id);
          const newPaid = round2(parseFloat(invoice.paidAmount) + normalizedItems.find((n) => n.vendorInvoiceId === id).allocatedAmount);
          return newPaid >= round2(parseFloat(invoice.totalAmount)) - 0.01;
        });
      if (fullyPaidInvoiceIds.length > 0) {
        const paidPoIds = (
          await tx.vendorInvoiceItem.findMany({
            where: { vendorInvoiceId: { in: fullyPaidInvoiceIds } },
            select: { purchaseOrderId: true },
          })
        ).map((r) => r.purchaseOrderId);
        if (paidPoIds.length > 0) {
          await tx.purchaseOrder.updateMany({
            where: { id: { in: paidPoIds }, deleteStatus: false, status: { not: 'CANCELLED' } },
            data: { status: 'PAID', updatedBy: userId },
          });
        }
      }

      return voucher;
    });
  }

  /**
   * Cancel / reverse a vendor payment voucher (full voucher only).
   * Restores VendorInvoice paid/status and/or legacy PO payment state; reverses FT.
   */
  async cancelVoucher(id, userId) {
    const voucherId = parseInt(id, 10);
    const voucher = await prisma.vendorPaymentVoucher.findFirst({
      where: { id: voucherId, delete_status: false },
      include: {
        items: {
          include: {
            vendorInvoice: {
              select: { id: true, invoiceNumber: true, totalAmount: true, paidAmount: true, status: true },
            },
            purchaseOrder: {
              select: { id: true, poNumber: true, status: true, totalValue: true },
            },
          },
        },
      },
    });
    if (!voucher) throw new APIError('Voucher not found', 404, 'NOT_FOUND');
    if (voucher.cancelledStatus) {
      throw new APIError('Voucher already cancelled', 400, 'ALREADY_CANCELLED');
    }

    const originalTxn = await prisma.financialTransaction.findFirst({
      where: {
        transactionType: 'PAYMENT',
        referenceId: voucherId,
        isPosted: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    if (originalTxn?.isReconciled) {
      throw new APIError(
        'Payment is bank-reconciled and cannot be cancelled',
        400,
        'BANK_RECONCILED'
      );
    }

    return prisma.$transaction(async (tx) => {
      if (originalTxn) {
        await postReversingTransaction(
          tx,
          originalTxn.id,
          userId,
          `Cancel voucher ${voucher.voucherNumber}`
        );
      }

      const affectedPoIds = new Set();

      for (const item of voucher.items) {
        const alloc = round2(item.allocatedAmount);
        if (alloc <= 0) continue;

        if (item.vendorInvoiceId && item.vendorInvoice) {
          const inv = item.vendorInvoice;
          const newPaid = round2(Math.max(0, parseFloat(inv.paidAmount) - alloc));
          const total = round2(inv.totalAmount);
          let newStatus = 'OUTSTANDING';
          if (newPaid >= total - 0.01) newStatus = 'PAID';
          else if (newPaid > 0.01) newStatus = 'PARTIALLY_PAID';

          await tx.vendorInvoice.update({
            where: { id: inv.id },
            data: { paidAmount: newPaid, status: newStatus, updatedBy: userId },
          });

          // Re-open linked POs that were marked PAID when invoice was fully paid.
          if (newStatus !== 'PAID') {
            const poLinks = await tx.vendorInvoiceItem.findMany({
              where: { vendorInvoiceId: inv.id },
              select: { purchaseOrderId: true },
            });
            for (const link of poLinks) {
              affectedPoIds.add(link.purchaseOrderId);
            }
          }
        }

        if (item.purchaseOrderId) {
          affectedPoIds.add(item.purchaseOrderId);
        }
      }

      // Downgrade PAID POs back to INVOICE_RECEIVED when no longer fully paid
      // (exclude this cancelled voucher from paid sums).
      for (const poId of affectedPoIds) {
        const po = await tx.purchaseOrder.findFirst({
          where: { id: poId, deleteStatus: false },
          select: PO_PAYABLE_SELECT,
        });
        if (!po || po.status === 'CANCELLED') continue;

        const remainingAllocs = await tx.vendorPaymentVoucherItem.findMany({
          where: {
            purchaseOrderId: poId,
            voucher: { cancelledStatus: false, delete_status: false, id: { not: voucherId } },
          },
          select: { allocatedAmount: true },
        });
        // Also count invoice-first payments still active against this PO's invoices.
        const invoiceLinks = await tx.vendorInvoiceItem.findMany({
          where: { purchaseOrderId: poId },
          select: { vendorInvoiceId: true },
        });
        const invIds = invoiceLinks.map((l) => l.vendorInvoiceId);
        let invoicePaid = 0;
        if (invIds.length) {
          const invPayments = await tx.vendorPaymentVoucherItem.findMany({
            where: {
              vendorInvoiceId: { in: invIds },
              voucher: { cancelledStatus: false, delete_status: false, id: { not: voucherId } },
            },
            select: { allocatedAmount: true },
          });
          invoicePaid = invPayments.reduce((s, a) => s + parseFloat(a.allocatedAmount), 0);
        }
        const poDirectPaid = remainingAllocs.reduce((s, a) => s + parseFloat(a.allocatedAmount), 0);
        const paid = round2(poDirectPaid + invoicePaid);
        const payable = computePayableAmount(po);

        if (po.status === 'PAID' && (payable <= 0.01 || paid < payable - 0.01)) {
          await tx.purchaseOrder.update({
            where: { id: poId },
            data: { status: 'INVOICE_RECEIVED', updatedBy: userId },
          });
        }
      }

      return tx.vendorPaymentVoucher.update({
        where: { id: voucherId },
        data: {
          cancelledStatus: true,
          cancelledAt: new Date(),
          updatedBy: userId,
        },
        include: {
          vendor: { select: { id: true, code: true, name: true } },
          bankLedger: { select: { id: true, ledgerName: true } },
          items: {
            include: {
              purchaseOrder: { select: { id: true, poNumber: true } },
              vendorInvoice: { select: { id: true, invoiceNumber: true } },
            },
          },
        },
      });
    });
  }
}

export default new VendorPaymentService();

