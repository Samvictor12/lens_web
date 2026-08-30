import prisma from '../config/prisma.js';
import { APIError } from '../middleware/errorHandler.js';
import { generateExpenseNumber, postVendorExpenseAccrual } from './accountingService.js';

function round2(n) {
  return Math.round(parseFloat(n || 0) * 100) / 100;
}

export class VendorIndirectExpenseService {
  async list({ vendorId, status, from, to, page = 1, limit = 100 } = {}) {
    const where = {
      delete_status: false,
      vendorId: { not: null },
      vendorExpenseStatus: { not: null },
      ...(vendorId && { vendorId: parseInt(vendorId, 10) }),
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
          vendor: { select: { id: true, code: true, name: true, shopname: true } },
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
   * Mark indirect vendor expense — Dr expense category / Cr vendor AP.
   */
  async create({ vendorId, categoryId, amount, dueDate, description, referenceNo, notes }, userId) {
    if (!vendorId || !categoryId || !amount || !description) {
      throw new APIError('vendorId, categoryId, amount, description are required', 400, 'VALIDATION_ERROR');
    }

    const vid = parseInt(vendorId, 10);
    const amt = round2(amount);
    if (amt <= 0) throw new APIError('Amount must be greater than zero', 400, 'VALIDATION_ERROR');

    const [vendor, category] = await Promise.all([
      prisma.vendor.findFirst({ where: { id: vid, delete_status: false } }),
      prisma.expenseCategory.findFirst({
        where: { id: parseInt(categoryId, 10), delete_status: false },
        include: { ledger: true },
      }),
    ]);
    if (!vendor) throw new APIError('Vendor not found', 404, 'VENDOR_NOT_FOUND');
    if (!category) throw new APIError('Expense category not found', 404, 'CATEGORY_NOT_FOUND');
    if (!category.ledger_id) {
      throw new APIError('Category has no linked ledger; please configure it first', 400, 'NO_LEDGER');
    }

    const expenseNumber = await generateExpenseNumber();
    const now = new Date();
    const resolvedDue = dueDate ? new Date(dueDate) : now;

    return prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          expenseNumber,
          categoryId: category.id,
          vendorId: vid,
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
          vendor: { select: { id: true, code: true, name: true } },
          category: { select: { id: true, name: true } },
        },
      });

      await postVendorExpenseAccrual(
        tx,
        {
          expenseId: expense.id,
          expenseNumber,
          amount: amt,
          categoryLedgerId: category.ledger_id,
          vendor,
          description: description.trim(),
        },
        userId
      );

      return { ...expense, outstanding: amt };
    });
  }
}

export default new VendorIndirectExpenseService();
