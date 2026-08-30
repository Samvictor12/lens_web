import prisma from '../config/prisma.js';
import { APIError } from '../middleware/errorHandler.js';
import {
  generateExpenseNumber,
  generateIndirectExpensePaymentVoucherNumber,
  postIndirectExpenseAccrual,
  postIndirectExpensePayment,
} from './accountingService.js';
import { ensureExpenseCategoryLedger } from './expenseService.js';
import { distributePayment } from '../utils/paymentAllocation.js';

function round2(n) {
  return Math.round(parseFloat(n || 0) * 100) / 100;
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

export class VendorIndirectExpenseService {
  async list({ liabilityLedgerId, status, from, to, page = 1, limit = 100 } = {}) {
    const where = {
      delete_status: false,
      liabilityLedgerId: { not: null },
      vendorExpenseStatus: { not: null },
      ...(liabilityLedgerId && { liabilityLedgerId: parseInt(liabilityLedgerId, 10) }),
      ...(status && { vendorExpenseStatus: status }),
      ...((from || to) && {
        expenseDate: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) }),
        },
      }),
    };

    const [data, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          liabilityLedger: { select: { id: true, ledgerCode: true, ledgerName: true } },
          category: { select: { id: true, name: true, expenseType: true } },
        },
        orderBy: [{ dueDate: 'asc' }, { expenseDate: 'asc' }],
        skip: (parseInt(page, 10) - 1) * parseInt(limit, 10),
        take: parseInt(limit, 10),
      }),
      prisma.expense.count({ where }),
    ]);

    return {
      data: data.map((e) => ({
        ...e,
        outstanding: round2(parseFloat(e.amount) - parseFloat(e.paidAmount)),
      })),
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        totalPages: Math.ceil(total / parseInt(limit, 10)),
      },
    };
  }

  /**
   * Mark indirect expense — Dr expense category / Cr selected liability ledger.
   */
  async create(
    { liabilityLedgerId, categoryId, amount, dueDate, description, referenceNo, notes, vendorId },
    userId
  ) {
    if (vendorId != null && vendorId !== '') {
      throw new APIError('vendorId is not accepted for indirect expenses; use liabilityLedgerId', 400, 'VALIDATION_ERROR');
    }
    if (!liabilityLedgerId || !categoryId || !amount || !description) {
      throw new APIError(
        'liabilityLedgerId, categoryId, amount, description are required',
        400,
        'VALIDATION_ERROR'
      );
    }

    const lid = parseInt(liabilityLedgerId, 10);
    const amt = round2(amount);
    if (amt <= 0) throw new APIError('Amount must be greater than zero', 400, 'VALIDATION_ERROR');

    const [liabilityLedger, category] = await Promise.all([
      prisma.ledger.findFirst({
        where: {
          id: lid,
          delete_status: false,
          active_status: true,
          ledgerType: 'LIABILITY',
          allowsDirectPosting: true,
          isGroupLedger: false,
        },
        select: { id: true, ledgerCode: true, ledgerName: true },
      }),
      prisma.expenseCategory.findFirst({
        where: { id: parseInt(categoryId, 10), delete_status: false },
        include: { ledger: true },
      }),
    ]);
    if (!liabilityLedger) {
      throw new APIError('Liability posting ledger not found or not eligible', 404, 'LEDGER_NOT_FOUND');
    }
    if (!category) throw new APIError('Expense category not found', 404, 'CATEGORY_NOT_FOUND');

    const expenseNumber = await generateExpenseNumber();
    const now = new Date();
    const resolvedDue = dueDate ? new Date(dueDate) : now;

    return prisma.$transaction(async (tx) => {
      const categoryLedgerId = await ensureExpenseCategoryLedger(tx, category, userId);

      const expense = await tx.expense.create({
        data: {
          expenseNumber,
          categoryId: category.id,
          liabilityLedgerId: lid,
          vendorId: null,
          amount: amt,
          paidAmount: 0,
          vendorExpenseStatus: 'MARKED',
          expenseDate: now,
          dueDate: resolvedDue,
          description: description.trim(),
          referenceNo: referenceNo || null,
          notes: notes || null,
          createdBy: userId,
        },
        include: {
          liabilityLedger: { select: { id: true, ledgerCode: true, ledgerName: true } },
          category: { select: { id: true, name: true } },
        },
      });

      await postIndirectExpenseAccrual(
        tx,
        {
          expenseId: expense.id,
          expenseNumber,
          amount: amt,
          categoryLedgerId,
          liabilityLedgerId: lid,
          description: description.trim(),
        },
        userId
      );

      return { ...expense, outstanding: amt };
    });
  }

  /**
   * Pay open indirect expenses for a liability ledger (FIFO by due date).
   */
  async pay(payload, userId) {
    const {
      liabilityLedgerId,
      paymentDate,
      bankLedgerId,
      referenceNo,
      notes,
      items = [],
      totalAmount: totalRaw,
    } = payload;
    const paymentMethod = normalizePaymentMethod(payload.paymentMethod);

    if (!liabilityLedgerId || !paymentMethod) {
      throw new APIError('liabilityLedgerId, paymentMethod required', 400, 'VALIDATION_ERROR');
    }
    if (!items?.length) {
      throw new APIError('At least one expense allocation is required', 400, 'VALIDATION_ERROR');
    }

    const lid = parseInt(liabilityLedgerId, 10);
    const cashAmount = round2(totalRaw ?? payload.paymentAmount ?? 0);

    if (cashAmount <= 0) {
      throw new APIError('Payment amount must be greater than zero', 400, 'VALIDATION_ERROR');
    }
    if (!bankLedgerId) {
      throw new APIError('bankLedgerId required when paying cash/bank', 400, 'VALIDATION_ERROR');
    }

    const expenseIds = items.map((i) => parseInt(i.expenseId, 10));
    const [liabilityLedger, expenses] = await Promise.all([
      prisma.ledger.findFirst({
        where: {
          id: lid,
          delete_status: false,
          active_status: true,
          ledgerType: 'LIABILITY',
          allowsDirectPosting: true,
          isGroupLedger: false,
        },
        select: { id: true, ledgerCode: true, ledgerName: true },
      }),
      prisma.expense.findMany({
        where: {
          id: { in: expenseIds },
          delete_status: false,
          liabilityLedgerId: lid,
          vendorExpenseStatus: { in: ['MARKED', 'PARTIALLY_PAID'] },
        },
      }),
    ]);

    if (!liabilityLedger) {
      throw new APIError('Liability posting ledger not found', 404, 'LEDGER_NOT_FOUND');
    }
    if (expenseIds.length && expenses.length !== expenseIds.length) {
      throw new APIError('One or more indirect expenses not found for this liability ledger', 404, 'EXPENSE_NOT_FOUND');
    }

    const openExpenses = await prisma.expense.findMany({
      where: {
        delete_status: false,
        liabilityLedgerId: lid,
        vendorExpenseStatus: { in: ['MARKED', 'PARTIALLY_PAID'] },
      },
      orderBy: [{ dueDate: 'asc' }, { expenseDate: 'asc' }],
    });

    const overrides = {};
    for (const item of items) {
      overrides[item.expenseId] = item.allocatedAmount;
    }

    const fifoItems = openExpenses.map((e) => ({
      id: e.id,
      outstanding: round2(parseFloat(e.amount) - parseFloat(e.paidAmount)),
      dueDate: e.dueDate,
      orderDate: e.expenseDate,
      documentNo: e.expenseNumber,
    }));

    let fifoResult;
    try {
      fifoResult = distributePayment({ items: fifoItems, totalAmount: cashAmount, overrides });
    } catch (err) {
      throw new APIError(err.message, 400, 'ALLOCATION_ERROR');
    }

    const expectedMap = Object.fromEntries(
      fifoResult.allocations.map((a) => [a.id, a.amount])
    );
    const submittedMap = Object.fromEntries(
      items.map((i) => [parseInt(i.expenseId, 10), round2(i.allocatedAmount)])
    );

    for (const [expId, submitted] of Object.entries(submittedMap)) {
      const expected = expectedMap[parseInt(expId, 10)] ?? 0;
      if (Math.abs(submitted - expected) > 0.01) {
        throw new APIError(
          'Expense allocations must follow FIFO by due date (or valid manual overrides)',
          400,
          'FIFO_VIOLATION'
        );
      }
    }

    const allocationTotal = round2(
      items.reduce((s, i) => s + round2(i.allocatedAmount), 0)
    );
    if (Math.abs(allocationTotal - cashAmount) > 0.01) {
      throw new APIError(
        `Total allocations (${allocationTotal}) must equal payment amount (${cashAmount})`,
        400,
        'ALLOCATION_MISMATCH'
      );
    }

    const normalizedItems = [];
    for (const item of items) {
      const expId = parseInt(item.expenseId, 10);
      const expense = expenses.find((e) => e.id === expId);
      const outstanding = round2(parseFloat(expense.amount) - parseFloat(expense.paidAmount));
      const allocated = round2(item.allocatedAmount);
      if (allocated <= 0) {
        throw new APIError(`Payment amount required for expense ${expense.expenseNumber}`, 400, 'VALIDATION_ERROR');
      }
      if (allocated > outstanding + 0.01) {
        throw new APIError(
          `Allocation for ${expense.expenseNumber} exceeds outstanding (${outstanding})`,
          400,
          'OVER_ALLOCATION'
        );
      }
      normalizedItems.push({ expenseId: expId, allocatedAmount: allocated });
    }

    const voucherNumber = await generateIndirectExpensePaymentVoucherNumber();
    const now = new Date();
    const resolvedBankLedgerId = parseInt(bankLedgerId, 10);

    return prisma.$transaction(async (tx) => {
      const voucher = await tx.indirectExpensePaymentVoucher.create({
        data: {
          voucherNumber,
          liabilityLedgerId: lid,
          paymentDate: paymentDate ? new Date(paymentDate) : now,
          totalAmount: cashAmount,
          paymentMethod,
          bankLedgerId: resolvedBankLedgerId,
          referenceNo: referenceNo || null,
          notes: notes || null,
          createdBy: userId,
          items: {
            create: normalizedItems.map((item) => ({
              expenseId: item.expenseId,
              allocatedAmount: item.allocatedAmount,
            })),
          },
        },
        include: {
          items: true,
          liabilityLedger: { select: { id: true, ledgerCode: true, ledgerName: true } },
        },
      });

      for (const item of normalizedItems) {
        const expense = expenses.find((e) => e.id === item.expenseId);
        const newPaid = round2(parseFloat(expense.paidAmount) + item.allocatedAmount);
        const total = round2(expense.amount);
        let newStatus = 'PARTIALLY_PAID';
        if (newPaid >= total - 0.01) newStatus = 'PAID';
        await tx.expense.update({
          where: { id: expense.id },
          data: { paidAmount: newPaid, vendorExpenseStatus: newStatus, updatedBy: userId },
        });
      }

      await postIndirectExpensePayment(
        tx,
        {
          voucherId: voucher.id,
          voucherNumber,
          totalAmount: cashAmount,
          bankLedgerId: resolvedBankLedgerId,
          liabilityLedgerId: lid,
        },
        userId
      );

      return voucher;
    });
  }
}

export default new VendorIndirectExpenseService();
