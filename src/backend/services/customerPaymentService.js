import prisma from '../config/prisma.js';
import { APIError } from '../middleware/errorHandler.js';
import { generateReceiptNumber, postCustomerPaymentReceipt } from './accountingService.js';
import { distributePayment } from '../utils/paymentAllocation.js';

function round2(n) {
  return Math.round(parseFloat(n) * 100) / 100;
}

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

export class CustomerPaymentService {

  async list({ customerId, from, to, paymentMethod, page = 1, limit = 20 }) {
    const where = {
      delete_status: false,
      ...(customerId && { customerId: parseInt(customerId) }),
      ...(paymentMethod && { paymentMethod }),
      ...((from || to) && {
        paymentDate: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) }),
        },
      }),
    };
    const [data, total] = await Promise.all([
      prisma.customerPaymentVoucher.findMany({
        where,
        include: {
          customer: { select: { id: true, code: true, name: true } },
          bankLedger: { select: { id: true, ledgerName: true } },
          items: {
            include: {
              invoice: { select: { id: true, invoiceNo: true, dueDate: true } },
            },
          },
        },
        orderBy: { paymentDate: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.customerPaymentVoucher.count({ where }),
    ]);
    return { data, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id) {
    const v = await prisma.customerPaymentVoucher.findFirst({
      where: { id, delete_status: false },
      include: {
        customer: true,
        bankLedger: true,
        items: {
          include: {
            invoice: { select: { id: true, invoiceNo: true, totalAmount: true, paidAmount: true, dueDate: true } },
          },
        },
        createdByUser: { select: { id: true, name: true } },
      },
    });
    if (!v) throw new APIError('Receipt not found', 404, 'NOT_FOUND');
    return v;
  }

  async closeReceipt(id, userId) {
    const v = await prisma.customerPaymentVoucher.findFirst({
      where: { id, delete_status: false },
    });
    if (!v) throw new APIError('Receipt not found', 404, 'NOT_FOUND');
    if (v.closedStatus) throw new APIError('Receipt already closed', 400, 'ALREADY_CLOSED');

    return prisma.customerPaymentVoucher.update({
      where: { id },
      data: { closedStatus: true, closedAt: new Date(), updatedBy: userId },
      include: {
        customer: true,
        bankLedger: true,
        items: { include: { invoice: { select: { id: true, invoiceNo: true } } } },
        createdByUser: { select: { id: true, name: true } },
      },
    });
  }

  async getOutstanding({ groupBy = 'customer' } = {}) {
    const invoices = await prisma.invoice.findMany({
      where: {
        status: { in: ['ISSUED', 'PARTIALLY_PAID'] },
        deleteStatus: false,
      },
      include: {
        customer: {
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
      orderBy: [{ dueDate: 'asc' }, { invoiceNo: 'asc' }],
    });

    const rows = invoices
      .map((inv) => {
        const outstanding = round2(inv.totalAmount - inv.paidAmount);
        return {
          id: inv.id,
          invoiceNo: inv.invoiceNo,
          customerId: inv.customerId,
          customer: inv.customer,
          dueDate: inv.dueDate,
          issueDate: inv.createdAt,
          totalAmount: round2(inv.totalAmount),
          paidAmount: round2(inv.paidAmount),
          outstanding,
          status: inv.status,
        };
      })
      .filter((r) => r.outstanding > 0.01);

    if (groupBy === 'customer') {
      const groupMap = new Map();
      for (const row of rows) {
        const key = row.customerId;
        if (!groupMap.has(key)) {
          const c = row.customer || {};
          groupMap.set(key, {
            customerId: row.customerId,
            customerName: c.shopname || c.name || '',
            customerCode: c.code || '',
            shopname: c.shopname || '',
            city: c.city || '',
            phone: c.phone || '',
            address: [c.address, c.city, c.state].filter(Boolean).join(', '),
            invoices: [],
          });
        }
        groupMap.get(key).invoices.push(row);
      }
      return { groups: Array.from(groupMap.values()) };
    }

    return { invoices: rows };
  }

  async create(
    { customerId, paymentDate, paymentMethod, bankLedgerId, referenceNo, notes, totalAmount, items, advanceAmount = 0, acceptAdvance },
    userId
  ) {
    paymentMethod = normalizePaymentMethod(paymentMethod);
    if (!customerId || !paymentMethod || !bankLedgerId || !items?.length) {
      throw new APIError('customerId, paymentMethod, bankLedgerId, items[] required', 400, 'VALIDATION_ERROR');
    }

    const total = round2(totalAmount);
    if (total <= 0) throw new APIError('Total amount must be greater than zero', 400, 'VALIDATION_ERROR');

    const advance = round2(advanceAmount || 0);
    if (advance < 0) throw new APIError('Advance amount cannot be negative', 400, 'VALIDATION_ERROR');
    if (advance > 0 && !acceptAdvance) {
      throw new APIError('Excess payment requires acceptAdvance: true', 400, 'ADVANCE_NOT_ACCEPTED');
    }

    const invoiceIds = items.map((i) => parseInt(i.invoiceId));
    const invoices = await prisma.invoice.findMany({
      where: { id: { in: invoiceIds }, deleteStatus: false },
      include: {
        saleOrders: { select: { id: true } },
        customer: { select: { id: true, code: true, ledgerId: true } },
      },
    });

    if (invoices.length !== invoiceIds.length) {
      throw new APIError('One or more invoices not found', 400, 'INVALID_INVOICE');
    }

    const cid = parseInt(customerId);
    if (invoices.some((inv) => inv.customerId !== cid)) {
      throw new APIError('All invoices must belong to the same customer', 400, 'MIXED_CUSTOMER');
    }

    for (const inv of invoices) {
      if (!['ISSUED', 'PARTIALLY_PAID'].includes(inv.status)) {
        throw new APIError(`Invoice ${inv.invoiceNo} is not eligible for payment (status: ${inv.status})`, 400, 'INVOICE_NOT_ELIGIBLE');
      }
    }

    const customer = invoices[0].customer;
    if (!customer) throw new APIError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');

    const allocationItems = invoices.map((inv) => ({
      id: inv.id,
      outstanding: round2(inv.totalAmount - inv.paidAmount),
      dueDate: inv.dueDate,
      documentNo: inv.invoiceNo,
    }));

    const overrides = {};
    let hasExplicitAllocations = false;
    for (const item of items) {
      const invId = parseInt(item.invoiceId);
      if (item.allocatedAmount != null && item.allocatedAmount !== '') {
        overrides[invId] = parseFloat(item.allocatedAmount);
        hasExplicitAllocations = true;
      }
    }

    const { allocations, remaining } = distributePayment({
      items: allocationItems,
      totalAmount: total - advance,
      overrides: hasExplicitAllocations ? overrides : {},
    });

    const allocationSum = round2(allocations.reduce((s, a) => s + a.amount, 0));
    const expectedAdvance = round2(total - allocationSum);

    if (Math.abs(allocationSum + advance - total) > 0.01) {
      throw new APIError(
        `Allocations (${allocationSum}) + advance (${advance}) must equal total (${total})`,
        400,
        'ALLOCATION_MISMATCH'
      );
    }

    if (remaining > 0.01 && advance <= 0) {
      throw new APIError(
        `Payment exceeds selected invoice outstanding by ₹${remaining.toFixed(2)}. Select more invoices or accept advance.`,
        400,
        'EXCESS_PAYMENT'
      );
    }

    if (advance > 0 && Math.abs(advance - expectedAdvance) > 0.01) {
      throw new APIError('Advance amount does not match payment excess', 400, 'ADVANCE_MISMATCH');
    }

    for (const alloc of allocations) {
      const inv = invoices.find((i) => i.id === alloc.id);
      const maxOutstanding = round2(inv.totalAmount - inv.paidAmount);
      if (alloc.amount > maxOutstanding + 0.01) {
        throw new APIError(`Allocation for ${inv.invoiceNo} exceeds outstanding`, 400, 'OVER_ALLOCATION');
      }
    }

    const receiptNumber = await generateReceiptNumber();
    const arClearance = allocationSum;

    return prisma.$transaction(async (tx) => {
      const voucher = await tx.customerPaymentVoucher.create({
        data: {
          receiptNumber,
          customerId: cid,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          totalAmount: total,
          advanceAmount: advance,
          paymentMethod,
          bankLedgerId: parseInt(bankLedgerId),
          referenceNo: referenceNo || null,
          notes: notes || null,
          closedStatus: true,
          closedAt: new Date(),
          createdBy: userId,
          items: {
            create: allocations
              .filter((a) => a.amount > 0)
              .map((a) => ({
                invoiceId: a.id,
                allocatedAmount: a.amount,
              })),
          },
        },
        include: { items: true },
      });

      for (const alloc of allocations) {
        if (alloc.amount <= 0) continue;

        const inv = invoices.find((i) => i.id === alloc.id);
        const newPaidAmount = round2(inv.paidAmount + alloc.amount);
        const isFullyPaid = newPaidAmount >= inv.totalAmount - 0.01;
        const newStatus = isFullyPaid ? 'PAID' : 'PARTIALLY_PAID';

        await tx.payment.create({
          data: {
            invoiceId: inv.id,
            voucherId: voucher.id,
            amount: alloc.amount,
            method: paymentMethod,
            referenceNo: referenceNo || null,
            notes: notes || null,
          },
        });

        await tx.invoice.update({
          where: { id: inv.id },
          data: { paidAmount: newPaidAmount, status: newStatus, updatedBy: userId },
        });

        if (isFullyPaid && inv.saleOrders?.length) {
          await tx.saleOrder.updateMany({
            where: { id: { in: inv.saleOrders.map((s) => s.id) } },
            data: { status: 'COMPLETED', updatedBy: userId },
          });
        }
      }

      if (arClearance > 0) {
        await tx.customer.update({
          where: { id: cid },
          data: { outstanding_credit: { decrement: Math.round(arClearance) } },
        });
      }

      if (advance > 0) {
        await tx.customer.update({
          where: { id: cid },
          data: { advance_credit: { increment: advance } },
        });
      }

      await postCustomerPaymentReceipt(tx, {
        voucherId: voucher.id,
        receiptNumber,
        totalAmount: total,
        bankLedgerId: parseInt(bankLedgerId),
        customer,
      }, userId);

      return voucher;
    });
  }
}
