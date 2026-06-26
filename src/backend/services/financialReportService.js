import prisma from '../config/prisma.js';
import { APIError } from '../middleware/errorHandler.js';

function dateRange(from, to) {
  if (!from && !to) return undefined;
  return {
    ...(from && { gte: new Date(from) }),
    ...(to && { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) }),
  };
}

async function sumEntriesByLedgerType(types, entryType, txnDateFilter) {
  return prisma.transactionEntry.groupBy({
    by: ['ledgerId'],
    where: {
      entryType,
      ledger: { ledgerType: { in: types }, delete_status: false },
      ...(txnDateFilter && { transaction: { transactionDate: txnDateFilter, isPosted: true } }),
    },
    _sum: { amount: true },
  });
}

export class FinancialReportService {

  // ── P&L ─────────────────────────────────────────────────────

  async getProfitLoss({ from, to }) {
    const filter = from || to ? dateRange(from, to) : undefined;

    // Fetch all relevant ledgers
    const ledgers = await prisma.ledger.findMany({
      where: { delete_status: false, ledgerType: { in: ['INCOME', 'EXPENSE'] } },
      select: { id: true, ledgerCode: true, ledgerName: true, ledgerType: true },
    });
    // Ledger → expenseType map, to partition EXPENSE ledgers into Direct (COGS) vs Indirect (Opex)
    const expenseCategoryLedgers = await prisma.expenseCategory.findMany({
      where: { ledger_id: { not: null } },
      select: { ledger_id: true, expenseType: true },
    });
    const directLedgerIds = new Set(
      expenseCategoryLedgers.filter(c => c.expenseType === 'DIRECT').map(c => c.ledger_id)
    );
    const gstInputLedger = await prisma.ledger.findFirst({ where: { ledgerCode: 'AC-1005' } });
    const gstOutputLedger = await prisma.ledger.findFirst({ where: { ledgerCode: 'AC-2003' } });

    // Aggregate: INCOME ledgers = CREDIT entries
    const incomeCredits = await sumEntriesByLedgerType(['INCOME'], 'CREDIT', filter);
    const incomeDebits  = await sumEntriesByLedgerType(['INCOME'], 'DEBIT',  filter);
    // Aggregate: EXPENSE ledgers = DEBIT entries
    const expenseDebits  = await sumEntriesByLedgerType(['EXPENSE'], 'DEBIT',  filter);
    const expenseCredits = await sumEntriesByLedgerType(['EXPENSE'], 'CREDIT', filter);
    // GST ledger entries
    const gstOutputCredits = gstOutputLedger ? await prisma.transactionEntry.aggregate({
      where: { ledgerId: gstOutputLedger.id, entryType: 'CREDIT', ...(filter && { transaction: { transactionDate: filter, isPosted: true } }) },
      _sum: { amount: true },
    }) : { _sum: { amount: 0 } };
    const gstInputDebits = gstInputLedger ? await prisma.transactionEntry.aggregate({
      where: { ledgerId: gstInputLedger.id, entryType: 'DEBIT', ...(filter && { transaction: { transactionDate: filter, isPosted: true } }) },
      _sum: { amount: true },
    }) : { _sum: { amount: 0 } };

    // Build net per ledger maps
    function netMap(debits, credits) {
      const map = {};
      for (const r of credits) map[r.ledgerId] = (map[r.ledgerId] || 0) + parseFloat(r._sum.amount || 0);
      for (const r of debits)  map[r.ledgerId] = (map[r.ledgerId] || 0) - parseFloat(r._sum.amount || 0);
      return map;
    }

    const incomeNet   = netMap(incomeDebits, incomeCredits);
    const expenseNet  = netMap(expenseCredits, expenseDebits);

    const incomeLedgers  = ledgers.filter(l => l.ledgerType === 'INCOME');
    const expenseLedgers = ledgers.filter(l => l.ledgerType === 'EXPENSE');

    const incomeBreakdown = incomeLedgers.map(l => ({
      ledgerCode: l.ledgerCode, ledgerName: l.ledgerName,
      amount: parseFloat(incomeNet[l.id] || 0).toFixed(2),
    }));
    const totalIncome = incomeBreakdown.reduce((s, i) => s + parseFloat(i.amount), 0);

    const gstOutput = parseFloat(gstOutputCredits._sum.amount || 0);
    const gstInput  = parseFloat(gstInputDebits._sum.amount  || 0);
    // GST Input/Output are ASSET/LIABILITY ledgers — informational only, not netted into P&L totals.
    const netRevenue = totalIncome;

    // Split expenses: DIRECT (Cost of Goods Sold) vs INDIRECT (Operating Expenses), by ExpenseCategory.expenseType.
    // Ledgers with no linked category (or no category at all) fall back to INDIRECT.
    const directLedgers = expenseLedgers.filter(l => directLedgerIds.has(l.id));
    const cogsAmount = directLedgers.reduce((s, l) => s + parseFloat(expenseNet[l.id] || 0), 0);
    const grossProfit = netRevenue - cogsAmount;

    const operatingExpenses = expenseLedgers
      .filter(l => !directLedgerIds.has(l.id))
      .map(l => ({ ledgerCode: l.ledgerCode, ledgerName: l.ledgerName, amount: parseFloat(expenseNet[l.id] || 0).toFixed(2) }));
    const totalOpex = operatingExpenses.reduce((s, e) => s + parseFloat(e.amount), 0);

    const netProfit = grossProfit - totalOpex;

    return {
      period: { from: from || null, to: to || null },
      income: { total: totalIncome.toFixed(2), breakdown: incomeBreakdown },
      gstOutput: { total: gstOutput.toFixed(2), ledgerName: gstOutputLedger?.ledgerName || 'GST Output Payable' },
      netRevenue: netRevenue.toFixed(2),
      costOfGoodsSold: {
        total: cogsAmount.toFixed(2),
        breakdown: directLedgers.map(l => ({ ledgerCode: l.ledgerCode, ledgerName: l.ledgerName, amount: parseFloat(expenseNet[l.id] || 0).toFixed(2) })),
      },
      grossProfit: grossProfit.toFixed(2),
      gstInput: { total: gstInput.toFixed(2), ledgerName: gstInputLedger?.ledgerName || 'GST Input Credit' },
      operatingExpenses: { total: totalOpex.toFixed(2), breakdown: operatingExpenses },
      netProfit: netProfit.toFixed(2),
      isProfit: netProfit >= 0,
    };
  }

  // ── Ledger Statement ─────────────────────────────────────────

  async getLedgerStatement({ ledgerId, from, to }) {
    if (!ledgerId) throw new APIError('ledgerId is required', 400, 'VALIDATION_ERROR');
    const lid = parseInt(ledgerId);
    const ledger = await prisma.ledger.findFirst({ where: { id: lid, delete_status: false } });
    if (!ledger) throw new APIError('Ledger not found', 404, 'NOT_FOUND');

    const filter = dateRange(from, to);
    const entries = await prisma.transactionEntry.findMany({
      where: { ledgerId: lid, ...(filter && { transaction: { transactionDate: filter, isPosted: true } }) },
      include: {
        transaction: {
          select: { id: true, transactionNumber: true, transactionDate: true, description: true, referenceNumber: true, transactionType: true, isReconciled: true },
        },
      },
      orderBy: { transaction: { transactionDate: 'asc' } },
    });

    const isDebitNormal = ['ASSET', 'EXPENSE'].includes(ledger.ledgerType);
    let running = parseFloat(ledger.openingBalance);

    const rows = entries.map(e => {
      const amt = parseFloat(e.amount);
      if (e.entryType === 'DEBIT') running = isDebitNormal ? running + amt : running - amt;
      else running = isDebitNormal ? running - amt : running + amt;
      return {
        date: e.transaction.transactionDate,
        transactionNumber: e.transaction.transactionNumber,
        referenceNumber: e.transaction.referenceNumber,
        narration: e.transaction.description,
        debit: e.entryType === 'DEBIT' ? amt.toFixed(2) : '0.00',
        credit: e.entryType === 'CREDIT' ? amt.toFixed(2) : '0.00',
        balance: running.toFixed(2),
        isReconciled: e.transaction.isReconciled,
      };
    });

    return {
      ledger: { id: ledger.id, ledgerCode: ledger.ledgerCode, ledgerName: ledger.ledgerName, ledgerType: ledger.ledgerType },
      openingBalance: parseFloat(ledger.openingBalance).toFixed(2),
      closingBalance: running.toFixed(2),
      entries: rows,
    };
  }

  // ── Trial Balance ────────────────────────────────────────────

  async getTrialBalance({ asOf }) {
    const filter = asOf ? { lte: new Date(new Date(asOf).setHours(23, 59, 59, 999)) } : undefined;

    const ledgers = await prisma.ledger.findMany({
      where: { delete_status: false },
      orderBy: [{ ledgerType: 'asc' }, { ledgerCode: 'asc' }],
    });

    const debits  = await prisma.transactionEntry.groupBy({ by: ['ledgerId'], where: { entryType: 'DEBIT',  ...(filter && { transaction: { transactionDate: filter, isPosted: true } }) }, _sum: { amount: true } });
    const credits = await prisma.transactionEntry.groupBy({ by: ['ledgerId'], where: { entryType: 'CREDIT', ...(filter && { transaction: { transactionDate: filter, isPosted: true } }) }, _sum: { amount: true } });

    const drMap = Object.fromEntries(debits.map(r  => [r.ledgerId, parseFloat(r._sum.amount || 0)]));
    const crMap = Object.fromEntries(credits.map(r => [r.ledgerId, parseFloat(r._sum.amount || 0)]));

    let totalDr = 0, totalCr = 0;
    const rows = ledgers.map(l => {
      const dr = drMap[l.id] || 0;
      const cr = crMap[l.id] || 0;
      totalDr += dr;
      totalCr += cr;
      const isDebitNormal = ['ASSET', 'EXPENSE'].includes(l.ledgerType);
      const netBalance = isDebitNormal ? dr - cr : cr - dr;
      return {
        ledgerCode: l.ledgerCode, ledgerName: l.ledgerName, ledgerType: l.ledgerType,
        totalDebit: dr.toFixed(2), totalCredit: cr.toFixed(2),
        netBalance: netBalance.toFixed(2),
        normalBalance: isDebitNormal ? 'DEBIT' : 'CREDIT',
      };
    }).filter(r => parseFloat(r.totalDebit) > 0 || parseFloat(r.totalCredit) > 0);

    return {
      asOf: asOf || null,
      isBalanced: Math.abs(totalDr - totalCr) < 0.01,
      totalDebit: totalDr.toFixed(2),
      totalCredit: totalCr.toFixed(2),
      ledgers: rows,
    };
  }

  // ── Day Book ─────────────────────────────────────────────────

  async getDayBook({ date }) {
    const d = date ? new Date(date) : new Date();
    const start = new Date(d.setHours(0, 0, 0, 0));
    const end   = new Date(d.setHours(23, 59, 59, 999));

    const txns = await prisma.financialTransaction.findMany({
      where: { transactionDate: { gte: start, lte: end }, isPosted: true },
      include: {
        entries: { include: { ledger: { select: { ledgerCode: true, ledgerName: true } } } },
        createdByUser: { select: { id: true, name: true } },
      },
      orderBy: { transactionDate: 'asc' },
    });

    const totalAmount = txns.reduce((s, t) => s + parseFloat(t.totalAmount), 0);

    return {
      date: start.toISOString().split('T')[0],
      totalTransactions: txns.length,
      totalAmount: totalAmount.toFixed(2),
      transactions: txns.map(t => ({
        transactionNumber: t.transactionNumber,
        transactionType: t.transactionType,
        referenceNumber: t.referenceNumber,
        description: t.description,
        totalAmount: parseFloat(t.totalAmount).toFixed(2),
        createdBy: t.createdByUser?.name,
        entries: t.entries.map(e => ({
          ledgerCode: e.ledger.ledgerCode,
          ledgerName: e.ledger.ledgerName,
          entryType: e.entryType,
          amount: parseFloat(e.amount).toFixed(2),
        })),
      })),
    };
  }

  // ── Cash / Bank Book ─────────────────────────────────────────

  async getCashBankBook({ ledgerId, from, to }) {
    // Delegates to ledger statement — same structure + isReconciled per row
    return this.getLedgerStatement({ ledgerId, from, to });
  }

  // ── Dashboard Summary ────────────────────────────────────────

  async getSummary({ from, to }) {
    const filter = from || to ? dateRange(from, to) : undefined;

    const cashLedger = await prisma.ledger.findFirst({ where: { ledgerCode: 'AC-1001' } });
    const arLedger   = await prisma.ledger.findFirst({ where: { ledgerCode: 'AC-1003' } });
    const apLedger   = await prisma.ledger.findFirst({ where: { ledgerCode: 'AC-2001' } });

    const bankLedgers = await prisma.ledger.findMany({
      where: {
        ledgerType: 'ASSET',
        delete_status: false,
        parentLedgerId: null,
        ledgerCode: { not: { in: ['AC-1003', 'AC-1004', 'AC-1005'] } },
      },
      select: { id: true, ledgerName: true, currentBalance: true },
    });

    const [incomeSum, expenseSum] = await Promise.all([
      prisma.transactionEntry.aggregate({
        where: { entryType: 'CREDIT', ledger: { ledgerType: 'INCOME' }, ...(filter && { transaction: { transactionDate: filter, isPosted: true } }) },
        _sum: { amount: true },
      }),
      prisma.transactionEntry.aggregate({
        where: { entryType: 'DEBIT', ledger: { ledgerType: 'EXPENSE' }, ...(filter && { transaction: { transactionDate: filter, isPosted: true } }) },
        _sum: { amount: true },
      }),
    ]);

    const income   = parseFloat(incomeSum._sum.amount  || 0);
    const expenses = parseFloat(expenseSum._sum.amount || 0);

    return {
      cashBalance: cashLedger ? parseFloat(cashLedger.currentBalance).toFixed(2) : '0.00',
      bankBalances: bankLedgers
        .filter(l => l.id !== cashLedger?.id)
        .map(l => ({ ledgerName: l.ledgerName, balance: parseFloat(l.currentBalance).toFixed(2) })),
      totalReceivable: arLedger ? parseFloat(arLedger.currentBalance).toFixed(2) : '0.00',
      totalPayable:    apLedger ? parseFloat(apLedger.currentBalance).toFixed(2) : '0.00',
      periodIncome:    income.toFixed(2),
      periodExpenses:  expenses.toFixed(2),
      netProfit:       (income - expenses).toFixed(2),
    };
  }
}
