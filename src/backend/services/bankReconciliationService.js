import prisma from '../config/prisma.js';
import { APIError } from '../middleware/errorHandler.js';

export class BankReconciliationService {

  async getStatement({ ledgerId, from, to, isReconciled }) {
    if (!ledgerId) throw new APIError('ledgerId is required', 400, 'VALIDATION_ERROR');
    const lid = parseInt(ledgerId);

    const ledger = await prisma.ledger.findFirst({ where: { id: lid, delete_status: false } });
    if (!ledger) throw new APIError('Ledger not found', 404, 'LEDGER_NOT_FOUND');
    if (ledger.ledgerType !== 'ASSET') throw new APIError('Bank reconciliation only applies to ASSET ledgers', 400, 'INVALID_LEDGER_TYPE');

    const entryWhere = {
      ledgerId: lid,
      ...(isReconciled !== undefined && { transaction: { isReconciled: isReconciled === 'true' } }),
      ...((from || to) && {
        transaction: {
          transactionDate: {
            ...(from && { gte: new Date(from) }),
            ...(to && { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) }),
          },
        },
      }),
    };

    const entries = await prisma.transactionEntry.findMany({
      where: entryWhere,
      include: {
        transaction: {
          select: {
            id: true, transactionNumber: true, transactionDate: true,
            description: true, transactionType: true,
            isReconciled: true, reconciledDate: true, reconciledNote: true,
          },
        },
      },
      orderBy: { transaction: { transactionDate: 'asc' } },
    });

    // Running balance from opening
    let running = parseFloat(ledger.openingBalance);
    const rows = entries.map(e => {
      const amt = parseFloat(e.amount);
      if (e.entryType === 'DEBIT') running += amt;
      else running -= amt;
      return {
        transactionId: e.transaction.id,
        transactionNumber: e.transaction.transactionNumber,
        transactionDate: e.transaction.transactionDate,
        description: e.transaction.description,
        transactionType: e.transaction.transactionType,
        entryType: e.entryType,
        amount: amt.toFixed(2),
        balance: running.toFixed(2),
        isReconciled: e.transaction.isReconciled,
        reconciledDate: e.transaction.reconciledDate,
        reconciledNote: e.transaction.reconciledNote,
      };
    });

    const reconciledBalance = entries
      .filter(e => e.transaction.isReconciled)
      .reduce((s, e) => e.entryType === 'DEBIT' ? s + parseFloat(e.amount) : s - parseFloat(e.amount), parseFloat(ledger.openingBalance));

    return {
      ledger: { id: ledger.id, ledgerCode: ledger.ledgerCode, ledgerName: ledger.ledgerName },
      openingBalance: parseFloat(ledger.openingBalance).toFixed(2),
      currentBalance: parseFloat(ledger.currentBalance).toFixed(2),
      reconciledBalance: reconciledBalance.toFixed(2),
      unreconciledBalance: (parseFloat(ledger.currentBalance) - reconciledBalance).toFixed(2),
      transactions: rows,
    };
  }

  async markReconciled({ transactionIds, isReconciled, reconciledNote }, userId) {
    if (!transactionIds?.length) throw new APIError('transactionIds[] required', 400, 'VALIDATION_ERROR');
    const result = await prisma.financialTransaction.updateMany({
      where: { id: { in: transactionIds.map(Number) } },
      data: {
        isReconciled: Boolean(isReconciled),
        reconciledDate: isReconciled ? new Date() : null,
        reconciledBy: userId,
        reconciledNote: reconciledNote || null,
      },
    });
    return { updated: result.count };
  }
}
