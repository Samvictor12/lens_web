import prisma from '../config/prisma.js';
import { APIError } from '../middleware/errorHandler.js';
import { generateExpenseNumber, postExpense, postReversingTransaction } from './accountingService.js';

export class ExpenseService {

  // ── ExpenseCategory ──────────────────────────────────────────

  async listCategories() {
    return prisma.expenseCategory.findMany({
      where: { delete_status: false },
      include: {
        ledger: { select: { id: true, ledgerCode: true, ledgerName: true } },
        _count: {
          select: { expenses: { where: { delete_status: false } } },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getCategoryById(id) {
    const cat = await prisma.expenseCategory.findFirst({
      where: { id, delete_status: false },
      include: {
        ledger: { select: { id: true, ledgerCode: true, ledgerName: true, currentBalance: true } },
        _count: {
          select: { expenses: { where: { delete_status: false } } },
        },
      },
    });
    if (!cat) throw new APIError('Category not found', 404, 'NOT_FOUND');
    return cat;
  }

  async createCategory({ name, ledger_id, expenseType, active_status }, userId) {
    if (!name) throw new APIError('Category name is required', 400, 'VALIDATION_ERROR');
    const exists = await prisma.expenseCategory.findFirst({ where: { name } });
    if (exists) throw new APIError('Category already exists', 409, 'DUPLICATE');
    return prisma.expenseCategory.create({
      data: {
        name,
        ledger_id: ledger_id || null,
        expenseType: expenseType || 'INDIRECT',
        active_status: active_status !== undefined ? active_status : true,
        createdBy: userId,
      },
      include: {
        ledger: { select: { id: true, ledgerCode: true, ledgerName: true } },
        _count: { select: { expenses: { where: { delete_status: false } } } },
      },
    });
  }

  async updateCategory(id, { name, ledger_id, expenseType, active_status }, userId) {
    const cat = await prisma.expenseCategory.findFirst({ where: { id, delete_status: false } });
    if (!cat) throw new APIError('Category not found', 404, 'NOT_FOUND');
    return prisma.expenseCategory.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(ledger_id !== undefined && { ledger_id: ledger_id || null }),
        ...(expenseType && { expenseType }),
        ...(active_status !== undefined && { active_status }),
        updatedBy: userId,
      },
      include: {
        ledger: { select: { id: true, ledgerCode: true, ledgerName: true } },
        _count: { select: { expenses: { where: { delete_status: false } } } },
      },
    });
  }

  async deleteCategory(id, userId) {
    const count = await prisma.expense.count({ where: { categoryId: id, delete_status: false } });
    if (count > 0) throw new APIError('Category has expenses; cannot delete', 409, 'HAS_EXPENSES');
    return prisma.expenseCategory.update({ where: { id }, data: { delete_status: true, updatedBy: userId } });
  }

  // ── Expense ──────────────────────────────────────────────────

  async list({ categoryId, from, to, paymentMethod, page = 1, limit = 20 }) {
    const where = {
      delete_status: false,
      ...(categoryId && { categoryId: parseInt(categoryId) }),
      ...(paymentMethod && { paymentMethod }),
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
          category: { select: { id: true, name: true, expenseType: true } },
          bankLedger: { select: { id: true, ledgerName: true } },
          _count: { select: { logs: true } },
        },
        orderBy: { expenseDate: 'desc' },
        skip: (page - 1) * limit,
        take: parseInt(limit),
      }),
      prisma.expense.count({ where }),
    ]);
    return { data, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / limit) } };
  }

  async getSummary({ from, to }) {
    const where = {
      delete_status: false,
      ...((from || to) && {
        expenseDate: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) }),
        },
      }),
    };
    const expenses = await prisma.expense.findMany({
      where,
      include: { category: { select: { name: true } } },
    });
    const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
    const byCategory = Object.values(
      expenses.reduce((acc, e) => {
        const k = e.category.name;
        if (!acc[k]) acc[k] = { categoryName: k, total: 0, count: 0 };
        acc[k].total += parseFloat(e.amount);
        acc[k].count++;
        return acc;
      }, {})
    );
    return { totalExpenses: totalExpenses.toFixed(2), byCategory };
  }

  async getById(id) {
    const exp = await prisma.expense.findFirst({
      where: { id, delete_status: false },
      include: {
        category: { include: { ledger: true } },
        bankLedger: true,
        logs: { include: { createdByUser: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
        createdByUser: { select: { id: true, name: true } },
      },
    });
    if (!exp) throw new APIError('Expense not found', 404, 'NOT_FOUND');
    return exp;
  }

  async create({ categoryId, amount, paymentMethod, bankLedgerId, expenseDate, description, referenceNo, paidTo, notes }, userId) {
    if (!categoryId || !amount || !paymentMethod || !bankLedgerId || !description)
      throw new APIError('categoryId, amount, paymentMethod, bankLedgerId, description are required', 400, 'VALIDATION_ERROR');

    const category = await prisma.expenseCategory.findFirst({
      where: { id: parseInt(categoryId), delete_status: false },
      include: { ledger: true },
    });
    if (!category) throw new APIError('Expense category not found', 404, 'CATEGORY_NOT_FOUND');
    if (!category.ledger_id) throw new APIError('Category has no linked ledger; please configure it first', 400, 'NO_LEDGER');

    const expenseNumber = await generateExpenseNumber();

    return prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          expenseNumber,
          categoryId: parseInt(categoryId),
          amount: parseFloat(amount),
          paymentMethod,
          bankLedgerId: parseInt(bankLedgerId),
          expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
          description,
          referenceNo: referenceNo || null,
          paidTo: paidTo || null,
          notes: notes || null,
          createdBy: userId,
        },
      });

      await postExpense(tx, {
        expenseId: expense.id,
        expenseNumber,
        amount: parseFloat(amount),
        categoryLedgerId: category.ledger_id,
        bankLedgerId: parseInt(bankLedgerId),
        description,
      }, userId);

      return expense;
    });
  }

  async update(id, body, userId) {
    const existing = await this.getById(id);

    // Find the original financial transaction for this expense
    const originalTxn = await prisma.financialTransaction.findFirst({
      where: { referenceType: 'MANUAL', referenceId: id },
      orderBy: { createdAt: 'asc' },
    });

    const newAmount = body.amount !== undefined ? parseFloat(body.amount) : parseFloat(existing.amount);
    const newBankLedgerId = body.bankLedgerId !== undefined ? parseInt(body.bankLedgerId) : existing.bankLedgerId;
    const newCategoryId = body.categoryId !== undefined ? parseInt(body.categoryId) : existing.categoryId;

    const category = await prisma.expenseCategory.findFirst({
      where: { id: newCategoryId, delete_status: false },
      include: { ledger: true },
    });
    if (!category?.ledger_id) throw new APIError('Category has no linked ledger', 400, 'NO_LEDGER');

    return prisma.$transaction(async (tx) => {
      // Save change log
      await tx.expenseLog.create({
        data: {
          expenseId: id,
          oldValues: existing,
          newValues: body,
          changeNote: body.changeNote || null,
          createdBy: userId,
        },
      });

      // Reverse original financial transaction if it exists
      if (originalTxn) {
        await postReversingTransaction(tx, originalTxn.id, userId, `Edit of ${existing.expenseNumber}`);
      }

      // Update expense record
      const updated = await tx.expense.update({
        where: { id },
        data: {
          ...(body.categoryId && { categoryId: newCategoryId }),
          ...(body.amount !== undefined && { amount: newAmount }),
          ...(body.paymentMethod && { paymentMethod: body.paymentMethod }),
          ...(body.bankLedgerId !== undefined && { bankLedgerId: newBankLedgerId }),
          ...(body.expenseDate && { expenseDate: new Date(body.expenseDate) }),
          ...(body.description && { description: body.description }),
          ...(body.referenceNo !== undefined && { referenceNo: body.referenceNo }),
          ...(body.paidTo !== undefined && { paidTo: body.paidTo }),
          ...(body.notes !== undefined && { notes: body.notes }),
          updatedBy: userId,
        },
      });

      // Post new financial transaction with updated values
      await postExpense(tx, {
        expenseId: id,
        expenseNumber: existing.expenseNumber,
        amount: newAmount,
        categoryLedgerId: category.ledger_id,
        bankLedgerId: newBankLedgerId,
        description: body.description || existing.description,
      }, userId);

      return updated;
    });
  }

  async softDelete(id, userId) {
    const exp = await prisma.expense.findFirst({ where: { id, delete_status: false } });
    if (!exp) throw new APIError('Expense not found', 404, 'NOT_FOUND');
    return prisma.expense.update({ where: { id }, data: { delete_status: true, updatedBy: userId } });
  }

  async getLogs(id) {
    return prisma.expenseLog.findMany({
      where: { expenseId: id },
      include: { createdByUser: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
