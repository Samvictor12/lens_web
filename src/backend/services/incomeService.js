import prisma from '../config/prisma.js';
import { APIError } from '../middleware/errorHandler.js';
import { generateIncomeNumber, postIncome, postReversingTransaction } from './accountingService.js';

const LEDGER_SELECT = { id: true, ledgerCode: true, ledgerName: true };

export class IncomeService {

  // ── IncomeCategory ──────────────────────────────────────────

  async listCategories() {
    return prisma.incomeCategory.findMany({
      where: { delete_status: false },
      include: {
        ledger: { select: { id: true, ledgerCode: true, ledgerName: true } },
        _count: {
          select: { incomes: { where: { delete_status: false } } },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getCategoryById(id) {
    const cat = await prisma.incomeCategory.findFirst({
      where: { id, delete_status: false },
      include: {
        ledger: { select: { id: true, ledgerCode: true, ledgerName: true, currentBalance: true } },
        _count: {
          select: { incomes: { where: { delete_status: false } } },
        },
      },
    });
    if (!cat) throw new APIError('Category not found', 404, 'NOT_FOUND');
    return cat;
  }

  async createCategory({ name, ledger_id, active_status }, userId) {
    if (!name) throw new APIError('Category name is required', 400, 'VALIDATION_ERROR');
    const exists = await prisma.incomeCategory.findFirst({ where: { name } });
    if (exists) throw new APIError('Category already exists', 409, 'DUPLICATE');
    return prisma.incomeCategory.create({
      data: {
        name,
        ledger_id: ledger_id || null,
        active_status: active_status !== undefined ? active_status : true,
        createdBy: userId,
      },
      include: {
        ledger: { select: { id: true, ledgerCode: true, ledgerName: true } },
        _count: { select: { incomes: { where: { delete_status: false } } } },
      },
    });
  }

  async updateCategory(id, { name, ledger_id, active_status }, userId) {
    const cat = await prisma.incomeCategory.findFirst({ where: { id, delete_status: false } });
    if (!cat) throw new APIError('Category not found', 404, 'NOT_FOUND');
    return prisma.incomeCategory.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(ledger_id !== undefined && { ledger_id: ledger_id || null }),
        ...(active_status !== undefined && { active_status }),
        updatedBy: userId,
      },
      include: {
        ledger: { select: { id: true, ledgerCode: true, ledgerName: true } },
        _count: { select: { incomes: { where: { delete_status: false } } } },
      },
    });
  }

  async deleteCategory(id, userId) {
    const count = await prisma.income.count({ where: { categoryId: id, delete_status: false } });
    if (count > 0) throw new APIError('Category has incomes; cannot delete', 409, 'HAS_INCOMES');
    return prisma.incomeCategory.update({ where: { id }, data: { delete_status: true, updatedBy: userId } });
  }

  // ── Income ──────────────────────────────────────────────────

  async list({ categoryId, from, to, paymentMethod, page = 1, limit = 20 }) {
    const where = {
      delete_status: false,
      ...(categoryId && { categoryId: parseInt(categoryId) }),
      ...(paymentMethod && { paymentMethod }),
      ...((from || to) && {
        incomeDate: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) }),
        },
      }),
    };
    const [data, total] = await Promise.all([
      prisma.income.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          fromLedger: { select: LEDGER_SELECT },
          toLedger: { select: LEDGER_SELECT },
          bankLedger: { select: LEDGER_SELECT },
          _count: { select: { logs: true } },
        },
        orderBy: { incomeDate: 'desc' },
        skip: (page - 1) * limit,
        take: parseInt(limit),
      }),
      prisma.income.count({ where }),
    ]);
    return { data, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / limit) } };
  }

  async getSummary({ from, to } = {}) {
    const where = {
      delete_status: false,
      ...((from || to) && {
        incomeDate: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) }),
        },
      }),
    };
    const incomes = await prisma.income.findMany({
      where,
      include: { category: { select: { name: true } } },
    });
    const totalIncome = incomes.reduce((s, e) => s + parseFloat(e.amount), 0);
    const byCategory = Object.values(
      incomes.reduce((acc, e) => {
        const k = e.category.name;
        if (!acc[k]) acc[k] = { categoryName: k, total: 0, count: 0 };
        acc[k].total += parseFloat(e.amount);
        acc[k].count++;
        return acc;
      }, {})
    );
    return { totalIncome: totalIncome.toFixed(2), byCategory };
  }

  async getById(id) {
    const row = await prisma.income.findFirst({
      where: { id, delete_status: false },
      include: {
        category: { include: { ledger: true } },
        fromLedger: true,
        toLedger: true,
        bankLedger: true,
        logs: { include: { createdByUser: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
        createdByUser: { select: { id: true, name: true } },
      },
    });
    if (!row) throw new APIError('Income not found', 404, 'NOT_FOUND');
    return row;
  }

  async create({ categoryId, amount, paymentMethod, fromLedgerId, toLedgerId, bankLedgerId, incomeDate, description, referenceNo, notes }, userId) {
    if (!categoryId || !amount || !description || !fromLedgerId || !toLedgerId) {
      throw new APIError('categoryId, amount, description, fromLedgerId, toLedgerId are required', 400, 'VALIDATION_ERROR');
    }

    const fromId = parseInt(fromLedgerId, 10);
    const toId = parseInt(toLedgerId, 10);
    if (fromId === toId) {
      throw new APIError('From and To ledgers must be different', 400, 'SAME_LEDGER');
    }

    const category = await prisma.incomeCategory.findFirst({
      where: { id: parseInt(categoryId), delete_status: false },
    });
    if (!category) throw new APIError('Income category not found', 404, 'CATEGORY_NOT_FOUND');
    // Category ledger_id is classification-only; posting uses From/To (NO_LEDGER relaxed).

    const incomeNumber = await generateIncomeNumber();
    const method = paymentMethod || 'CASH';

    return prisma.$transaction(async (tx) => {
      const income = await tx.income.create({
        data: {
          incomeNumber,
          categoryId: parseInt(categoryId),
          amount: parseFloat(amount),
          paymentMethod: method,
          fromLedgerId: fromId,
          toLedgerId: toId,
          bankLedgerId: bankLedgerId ? parseInt(bankLedgerId, 10) : toId,
          incomeDate: incomeDate ? new Date(incomeDate) : new Date(),
          description,
          referenceNo: referenceNo || null,
          notes: notes || null,
          createdBy: userId,
        },
        include: {
          category: { select: { id: true, name: true } },
          fromLedger: { select: LEDGER_SELECT },
          toLedger: { select: LEDGER_SELECT },
        },
      });

      await postIncome(tx, {
        incomeId: income.id,
        incomeNumber,
        amount: parseFloat(amount),
        fromLedgerId: fromId,
        toLedgerId: toId,
        description,
      }, userId);

      return income;
    });
  }

  async softDelete(id, userId) {
    const row = await prisma.income.findFirst({ where: { id, delete_status: false } });
    if (!row) throw new APIError('Income not found', 404, 'NOT_FOUND');

    const originalTxn = await prisma.financialTransaction.findFirst({
      where: { referenceType: 'INCOME', referenceId: id },
      orderBy: { createdAt: 'asc' },
    });

    return prisma.$transaction(async (tx) => {
      if (originalTxn) {
        await postReversingTransaction(tx, originalTxn.id, userId, `Delete of ${row.incomeNumber}`);
      }
      return tx.income.update({
        where: { id },
        data: { delete_status: true, updatedBy: userId },
      });
    });
  }

  async getLogs(id) {
    return prisma.incomeLog.findMany({
      where: { incomeId: id },
      include: { createdByUser: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export default new IncomeService();
