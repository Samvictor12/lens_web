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
          lens_id: po.lens_id,
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

  /** Outstanding vendor invoices — supports groupBy, collectible, product filter. */
  async listOutstandingInvoices(query = {}) {
    const { vendorId, groupBy, collectible, productId, startDate, endDate } = query;
    if (vendorId && !groupBy && !collectible && !productId) {
      return vendorInvoiceService.listOutstanding({ vendorId, groupBy: 'flat' });
    }
    return vendorInvoiceService.listOutstanding({
      vendorId,
      groupBy: groupBy || (vendorId ? 'flat' : 'vendor'),
      collectible: collectible === true || collectible === 'true',
      productId,
      startDate,
      endDate,
    });
  }

  async getStats({ startDate, endDate, vendorId, productId, liabilityLedgerId } = {}) {
    const vid = vendorId ? parseInt(vendorId, 10) : null;
    const pid = productId ? parseInt(productId, 10) : null;
    const llid = liabilityLedgerId ? parseInt(liabilityLedgerId, 10) : null;

    const invoiceDate = {};
    if (startDate) {
      const from = new Date(startDate);
      from.setHours(0, 0, 0, 0);
      invoiceDate.gte = from;
    }
    if (endDate) {
      const to = new Date(endDate);
      to.setHours(23, 59, 59, 999);
      invoiceDate.lte = to;
    }

    const productInvFilter = pid
      ? { items: { some: { purchaseOrder: { lens_id: pid } } } }
      : {};
    const productPoFilter = pid ? { lens_id: pid } : {};

    const invoiceBase = {
      deleteStatus: false,
      ...(vid && { vendorId: vid }),
      ...productInvFilter,
    };

    const billedWhere = {
      ...invoiceBase,
      status: { not: 'CANCELLED' },
      ...(Object.keys(invoiceDate).length ? { invoiceDate } : {}),
    };

    const outstandingWhere = {
      ...invoiceBase,
      status: { in: ['OUTSTANDING', 'PARTIALLY_PAID'] },
    };

    const targetDueCap = new Date();
    targetDueCap.setHours(23, 59, 59, 999);
    if (endDate) {
      const filterEnd = new Date(endDate);
      filterEnd.setHours(23, 59, 59, 999);
      if (filterEnd < targetDueCap) targetDueCap.setTime(filterEnd.getTime());
    }

    const targetInvoiceWhere = {
      ...outstandingWhere,
      dueDate: { lte: targetDueCap },
    };

    const indirectBase = {
      delete_status: false,
      liabilityLedgerId: { not: null },
      vendorExpenseStatus: { not: null },
      ...(llid && { liabilityLedgerId: llid }),
    };

    const indirectPeriodWhere = {
      ...indirectBase,
      ...(Object.keys(invoiceDate).length ? { expenseDate: invoiceDate } : {}),
    };

    const indirectTargetWhere = {
      ...indirectBase,
      vendorExpenseStatus: { in: ['MARKED', 'PARTIALLY_PAID'] },
      dueDate: { lte: targetDueCap },
    };

    const paymentDateFilter = Object.keys(invoiceDate).length ? { paymentDate: invoiceDate } : {};
    const paymentBase = {
      delete_status: false,
      cancelledStatus: false,
      ...(vid && { vendorId: vid }),
      ...paymentDateFilter,
      ...(pid
        ? {
            items: {
              some: {
                OR: [
                  { vendorInvoice: { items: { some: { purchaseOrder: { lens_id: pid } } } } },
                  { expenseId: { not: null } },
                ],
              },
            },
          }
        : {}),
    };

    const invoicedLinks = await prisma.vendorInvoiceItem.findMany({
      where: {
        vendorInvoice: { deleteStatus: false, status: { not: 'CANCELLED' }, ...(vid && { vendorId: vid }) },
      },
      select: { purchaseOrderId: true },
    });
    const invoicedPoIds = [...new Set(invoicedLinks.map((l) => l.purchaseOrderId))];

    const awaitingWhere = {
      deleteStatus: false,
      status: { in: ELIGIBLE_PO_STATUSES },
      vendorId: { not: null },
      ...(vid && { vendorId: vid }),
      ...productPoFilter,
      AND: [{ OR: [{ supplierInvoiceNo: null }, { supplierInvoiceNo: '' }] }],
      ...(invoicedPoIds.length ? { id: { notIn: invoicedPoIds } } : {}),
      ...(Object.keys(invoiceDate).length ? { orderDate: invoiceDate } : {}),
    };

    const [
      outstandingRows,
      targetInvoiceRows,
      indirectTargetRows,
      awaitingBills,
      purchasesAgg,
      indirectAgg,
      paymentAgg,
      indirectOutstandingRows,
    ] = await Promise.all([
      prisma.vendorInvoice.findMany({
        where: outstandingWhere,
        select: { totalAmount: true, paidAmount: true },
      }),
      prisma.vendorInvoice.findMany({
        where: targetInvoiceWhere,
        select: { totalAmount: true, paidAmount: true },
      }),
      prisma.expense.findMany({
        where: indirectTargetWhere,
        select: { amount: true, paidAmount: true },
      }),
      prisma.purchaseOrder.count({ where: awaitingWhere }),
      prisma.vendorInvoice.aggregate({
        where: billedWhere,
        _sum: { totalAmount: true },
      }),
      prisma.expense.aggregate({
        where: indirectPeriodWhere,
        _sum: { amount: true },
      }),
      prisma.vendorPaymentVoucher.aggregate({
        where: paymentBase,
        _sum: { totalAmount: true },
      }),
      prisma.expense.findMany({
        where: {
          ...indirectBase,
          vendorExpenseStatus: { in: ['MARKED', 'PARTIALLY_PAID'] },
        },
        select: { amount: true, paidAmount: true },
      }),
    ]);

    const sumOutstanding = (rows) =>
      rows.reduce((s, r) => s + Math.max(0, parseFloat(r.totalAmount || r.amount || 0) - parseFloat(r.paidAmount || 0)), 0);

    const invoiceOutstanding = sumOutstanding(outstandingRows);
    const indirectOutstanding = sumOutstanding(indirectOutstandingRows);

    return {
      totalPurchases: round2(parseFloat(purchasesAgg._sum.totalAmount) || 0),
      outstanding: round2(invoiceOutstanding + indirectOutstanding),
      awaitingBills,
      totalIndirectExpenses: round2(parseFloat(indirectAgg._sum.amount) || 0),
      targetPayment: round2(sumOutstanding(targetInvoiceRows) + sumOutstanding(indirectTargetRows)),
      totalPayment: round2(parseFloat(paymentAgg._sum.totalAmount) || 0),
    };
  }

  async createFromInvoices(payload, userId) {
    const {
      vendorId,
      paymentDate,
      bankLedgerId,
      referenceNo,
      notes,
      items = [],
      indirectExpenseIds,
      indirectItems,
      advanceAmount: advanceRaw = 0,
      acceptAdvance,
      applyAdvanceAmount: applyPriorRaw = 0,
    } = payload;
    const paymentMethod = normalizePaymentMethod(payload.paymentMethod);

    if (indirectExpenseIds?.length || indirectItems?.length) {
      throw new APIError(
        'Indirect expense payments must use POST /api/vendor-indirect-expenses/pay',
        400,
        'INDIRECT_NOT_SUPPORTED'
      );
    }

    if (!vendorId || !paymentMethod) {
      throw new APIError('vendorId, paymentMethod required', 400, 'VALIDATION_ERROR');
    }

    if (!items?.length) {
      throw new APIError('At least one vendor invoice must be selected', 400, 'VALIDATION_ERROR');
    }

    const vid = parseInt(vendorId, 10);
    const cashAmount = round2(payload.totalAmount ?? payload.paymentAmount ?? 0);
    const applyPrior = round2(applyPriorRaw || 0);
    const advance = round2(advanceRaw || 0);

    if (cashAmount < 0) throw new APIError('Payment amount cannot be negative', 400, 'VALIDATION_ERROR');
    if (applyPrior < 0) throw new APIError('Apply advance amount cannot be negative', 400, 'VALIDATION_ERROR');
    if (cashAmount <= 0 && applyPrior <= 0) {
      throw new APIError('Payment amount or prior advance apply must be greater than zero', 400, 'VALIDATION_ERROR');
    }
    if (cashAmount > 0 && !bankLedgerId) {
      throw new APIError('bankLedgerId required when paying cash/bank', 400, 'VALIDATION_ERROR');
    }
    if (advance < 0) throw new APIError('Advance amount cannot be negative', 400, 'VALIDATION_ERROR');
    if (advance > 0 && !acceptAdvance) {
      throw new APIError('Excess payment requires acceptAdvance: true', 400, 'ADVANCE_NOT_ACCEPTED');
    }

    const invoiceIds = items.map((i) => parseInt(i.vendorInvoiceId, 10));

    const [invoices, vendor] = await Promise.all([
      invoiceIds.length
        ? prisma.vendorInvoice.findMany({ where: { id: { in: invoiceIds }, deleteStatus: false } })
        : [],
      prisma.vendor.findUnique({
        where: { id: vid },
        select: { id: true, code: true, ledgerId: true, advance_credit: true },
      }),
    ]);

    if (!vendor) throw new APIError('Vendor not found', 404, 'VENDOR_NOT_FOUND');

    const availableAdvance = round2(vendor.advance_credit || 0);
    if (applyPrior > availableAdvance + 0.01) {
      throw new APIError(
        `Apply advance exceeds available vendor advance credit (₹${availableAdvance.toFixed(2)})`,
        400,
        'INSUFFICIENT_ADVANCE'
      );
    }

    if (invoiceIds.length && invoices.length !== invoiceIds.length) {
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

    const normalizedInvoiceItems = [];
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
      normalizedInvoiceItems.push({ vendorInvoiceId: invId, allocatedAmount: allocated });
    }

    const allocationTotal = round2(
      normalizedInvoiceItems.reduce((s, i) => s + i.allocatedAmount, 0)
    );
    const pool = round2(cashAmount + applyPrior);

    if (allocationTotal <= 0) {
      throw new APIError('Total allocation must be greater than zero', 400, 'VALIDATION_ERROR');
    }
    if (Math.abs(allocationTotal + advance - pool) > 0.01) {
      throw new APIError(
        `Allocations (${allocationTotal}) + advance (${advance}) must equal cash+prior advance (${pool})`,
        400,
        'ALLOCATION_MISMATCH'
      );
    }
    if (pool - allocationTotal > 0.01 && advance <= 0) {
      throw new APIError('Payment exceeds selected outstanding. Accept advance or reduce amount.', 400, 'EXCESS_PAYMENT');
    }

    const voucherNumber = await generateVoucherNumber();
    const now = new Date();
    let resolvedBankLedgerId = bankLedgerId ? parseInt(bankLedgerId, 10) : null;
    if (cashAmount > 0 && !resolvedBankLedgerId) {
      throw new APIError('bankLedgerId required when paying cash/bank', 400, 'VALIDATION_ERROR');
    }
    if (!resolvedBankLedgerId) {
      const fallback = await prisma.ledger.findFirst({
        where: {
          delete_status: false,
          active_status: true,
          accountGroup: { groupCode: { in: ['GRP-CASH', 'GRP-BANK'] } },
        },
        select: { id: true },
      });
      if (!fallback) throw new APIError('No cash/bank ledger available', 400, 'LEDGER_NOT_FOUND');
      resolvedBankLedgerId = fallback.id;
    }

    return prisma.$transaction(async (tx) => {
      const voucher = await tx.vendorPaymentVoucher.create({
        data: {
          voucherNumber,
          vendorId: vid,
          paymentDate: paymentDate ? new Date(paymentDate) : now,
          totalAmount: cashAmount,
          advanceAmount: advance,
          paymentMethod,
          bankLedgerId: resolvedBankLedgerId,
          referenceNo: referenceNo || null,
          notes: [
            notes || null,
            applyPrior > 0 ? `Applied prior advance: ₹${applyPrior.toFixed(2)}` : null,
          ]
            .filter(Boolean)
            .join(' | ') || null,
          closedStatus: true,
          closedAt: now,
          createdBy: userId,
          items: {
            create: normalizedInvoiceItems.map((item) => ({
              vendorInvoiceId: item.vendorInvoiceId,
              allocatedAmount: item.allocatedAmount,
            })),
          },
        },
        include: { items: true },
      });

      for (const item of normalizedInvoiceItems) {
        const invoice = invoices.find((i) => i.id === item.vendorInvoiceId);
        const newPaid = round2(parseFloat(invoice.paidAmount) + item.allocatedAmount);
        const newStatus = newPaid >= round2(parseFloat(invoice.totalAmount)) - 0.01 ? 'PAID' : 'PARTIALLY_PAID';
        await tx.vendorInvoice.update({
          where: { id: invoice.id },
          data: { paidAmount: newPaid, status: newStatus, updatedBy: userId },
        });
      }

      if (cashAmount > 0 && resolvedBankLedgerId) {
        await postVendorPayment(
          tx,
          {
            voucherId: voucher.id,
            voucherNumber,
            totalAmount: cashAmount,
            bankLedgerId: resolvedBankLedgerId,
            vendor,
          },
          userId
        );
      }

      const advanceDelta = round2(advance - applyPrior);
      if (Math.abs(advanceDelta) > 0.001) {
        await tx.vendor.update({
          where: { id: vid },
          data: { advance_credit: round2((vendor.advance_credit || 0) + advanceDelta) },
        });
      }

      const fullyPaidInvoiceIds = normalizedInvoiceItems
        .map((i) => i.vendorInvoiceId)
        .filter((id) => {
          const invoice = invoices.find((i) => i.id === id);
          const newPaid = round2(parseFloat(invoice.paidAmount) + normalizedInvoiceItems.find((n) => n.vendorInvoiceId === id).allocatedAmount);
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

