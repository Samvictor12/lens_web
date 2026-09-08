import prisma from '../config/prisma.js';
import { APIError } from '../middleware/errorHandler.js';
import { AccountGroupService } from './accountGroupService.js';
import { DashboardService } from './dashboardService.js';
import { InvoiceService } from './invoiceService.js';
import vendorPaymentService from './vendorPaymentService.js';
import { LedgerService } from './ledgerService.js';
import InventoryService from './inventory.service.js';

const accountGroupService = new AccountGroupService();
const dashboardService = new DashboardService();
const invoiceService = new InvoiceService();
const ledgerService = new LedgerService();
const inventoryService = new InventoryService();

const EXPAND_TRIAL_BALANCE_GROUPS = new Set(['GRP-SUNDRY-DEBTORS', 'GRP-SUNDRY-CREDITORS']);

function findSummaryGroupByCode(childGroups, code) {
  for (const child of childGroups || []) {
    if (child.group?.groupCode === code) return child;
    const nested = findSummaryGroupByCode(child.childGroups, code);
    if (nested) return nested;
  }
  return null;
}

function toIsoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseAsOf(asOf) {
  if (asOf) {
    const d = new Date(asOf);
    if (Number.isNaN(d.getTime())) throw new APIError('Invalid asOf date', 400, 'VALIDATION_ERROR');
    return d;
  }
  return new Date();
}

function dayBounds(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function monthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function financialYearBounds(asOfDate) {
  const y = asOfDate.getFullYear();
  const m = asOfDate.getMonth();
  const startYear = m >= 3 ? y : y - 1;
  const start = new Date(startYear, 3, 1);
  const end = new Date(startYear + 1, 2, 31, 23, 59, 59, 999);
  return {
    start,
    end,
    label: `FY ${startYear}-${String(startYear + 1).slice(-2)}`,
    startYear,
  };
}

function fyMonthsThrough(asOfDate) {
  const fy = financialYearBounds(asOfDate);
  const months = [];
  let cursor = new Date(fy.start);
  const cap = new Date(asOfDate.getFullYear(), asOfDate.getMonth(), 1);
  while (cursor <= cap) {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const from = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0);
    const to = lastDay > asOfDate ? asOfDate : lastDay;
    months.push({
      month: `${y}-${String(m + 1).padStart(2, '0')}`,
      monthLabel: from.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
      from: toIsoDate(from),
      to: toIsoDate(to),
    });
    cursor = new Date(y, m + 1, 1);
  }
  return months;
}

function round2(n) {
  return Math.round((parseFloat(n) || 0) * 100) / 100;
}

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
      where: { delete_status: false, ledgerType: { in: ['INCOME', 'EXPENSE'] }, isGroupLedger: false },
      select: {
        id: true, ledgerCode: true, ledgerName: true, ledgerType: true, accountGroupId: true,
        accountGroup: { select: { pnlClassification: true } },
      },
    });
    // Ledger → expenseType map, to partition EXPENSE ledgers into Direct (COGS) vs Indirect (Opex)
    const expenseCategoryLedgers = await prisma.expenseCategory.findMany({
      where: { ledger_id: { not: null } },
      select: { ledger_id: true, expenseType: true },
    });
    const directLedgerIds = new Set(
      expenseCategoryLedgers.filter(c => c.expenseType === 'DIRECT').map(c => c.ledger_id)
    );

    const isDirectExpense = (l) => {
      const cls = l.accountGroup?.pnlClassification;
      if (cls === 'DIRECT_EXPENSE') return true;
      if (cls === 'INDIRECT_EXPENSE') return false;
      return directLedgerIds.has(l.id);
    };
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
    const directLedgers = expenseLedgers.filter(isDirectExpense);
    const cogsAmount = directLedgers.reduce((s, l) => s + parseFloat(expenseNet[l.id] || 0), 0);
    const grossProfit = netRevenue - cogsAmount;

    const operatingExpenses = expenseLedgers
      .filter(l => !isDirectExpense(l))
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
          select: {
            id: true,
            transactionNumber: true,
            transactionDate: true,
            description: true,
            referenceNumber: true,
            referenceType: true,
            referenceId: true,
            transactionType: true,
            isReconciled: true,
          },
        },
      },
      orderBy: { transaction: { transactionDate: 'asc' } },
    });

    const receiptVoucherIds = new Set();
    const paymentVoucherIds = new Set();
    for (const e of entries) {
      const txn = e.transaction;
      if (txn.transactionType === 'RECEIPT' && txn.referenceType === 'RECEIPT' && txn.referenceId) {
        receiptVoucherIds.add(txn.referenceId);
      } else if (txn.transactionType === 'PAYMENT' && txn.referenceId) {
        paymentVoucherIds.add(txn.referenceId);
      }
    }

    const [customerItems, vendorItems] = await Promise.all([
      receiptVoucherIds.size
        ? prisma.customerPaymentVoucherItem.findMany({
            where: { voucherId: { in: [...receiptVoucherIds] } },
            include: { invoice: { select: { id: true, invoiceNo: true, dueDate: true } } },
          })
        : [],
      paymentVoucherIds.size
        ? prisma.vendorPaymentVoucherItem.findMany({
            where: { voucherId: { in: [...paymentVoucherIds] } },
            include: { purchaseOrder: { select: { id: true, poNumber: true, orderDate: true } } },
          })
        : [],
    ]);

    const receiptItemsByVoucher = {};
    for (const item of customerItems) {
      if (!receiptItemsByVoucher[item.voucherId]) receiptItemsByVoucher[item.voucherId] = [];
      receiptItemsByVoucher[item.voucherId].push({
        id: item.id,
        invoiceId: item.invoiceId,
        allocatedAmount: item.allocatedAmount,
        invoice: item.invoice,
      });
    }

    const paymentItemsByVoucher = {};
    for (const item of vendorItems) {
      if (!paymentItemsByVoucher[item.voucherId]) paymentItemsByVoucher[item.voucherId] = [];
      paymentItemsByVoucher[item.voucherId].push({
        id: item.id,
        purchaseOrderId: item.purchaseOrderId,
        allocatedAmount: item.allocatedAmount,
        purchaseOrder: item.purchaseOrder,
      });
    }

    const advanceByVoucher = {};
    if (receiptVoucherIds.size) {
      const vouchers = await prisma.customerPaymentVoucher.findMany({
        where: { id: { in: [...receiptVoucherIds] } },
        select: { id: true, receiptNumber: true, advanceAmount: true },
      });
      for (const v of vouchers) {
        advanceByVoucher[v.id] = { receiptNumber: v.receiptNumber, advanceAmount: v.advanceAmount };
      }
    }

    const isDebitNormal = ['ASSET', 'EXPENSE'].includes(ledger.ledgerType);
    let running = parseFloat(ledger.openingBalance);

    const rows = entries.map(e => {
      const txn = e.transaction;
      const amt = parseFloat(e.amount);
      if (e.entryType === 'DEBIT') running = isDebitNormal ? running + amt : running - amt;
      else running = isDebitNormal ? running - amt : running + amt;

      let breakdown = null;
      if (txn.transactionType === 'RECEIPT' && txn.referenceType === 'RECEIPT' && txn.referenceId) {
        const advance = advanceByVoucher[txn.referenceId];
        breakdown = {
          type: 'customer',
          documentNumber: txn.referenceNumber || advance?.receiptNumber,
          totalAmount: amt,
          advanceAmount: advance?.advanceAmount || 0,
          items: receiptItemsByVoucher[txn.referenceId] || [],
        };
      } else if (txn.transactionType === 'PAYMENT' && txn.referenceId) {
        breakdown = {
          type: 'vendor',
          documentNumber: txn.referenceNumber,
          totalAmount: amt,
          items: paymentItemsByVoucher[txn.referenceId] || [],
        };
      } else if (txn.transactionType === 'RECEIPT' && txn.referenceType === 'INVOICE' && txn.referenceId) {
        breakdown = {
          type: 'customer',
          documentNumber: txn.referenceNumber,
          totalAmount: amt,
          items: [{
            id: `legacy-${txn.referenceId}`,
            invoiceId: txn.referenceId,
            allocatedAmount: amt,
            invoice: { id: txn.referenceId, invoiceNo: txn.referenceNumber },
          }],
        };
      }

      return {
        date: txn.transactionDate,
        transactionNumber: txn.transactionNumber,
        referenceNumber: txn.referenceNumber,
        narration: txn.description,
        debit: e.entryType === 'DEBIT' ? amt.toFixed(2) : '0.00',
        credit: e.entryType === 'CREDIT' ? amt.toFixed(2) : '0.00',
        balance: running.toFixed(2),
        isReconciled: txn.isReconciled,
        breakdown,
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
    return this.getLedgerStatement({ ledgerId, from, to });
  }

  // ── Group Summary ────────────────────────────────────────────

  async getGroupSummary({ groupId, asOf }) {
    return accountGroupService.getSummary({ groupId, asOf });
  }

  // ── Balance Sheet (grouped) ──────────────────────────────────

  async getBalanceSheet({ asOf }) {
    const rootCodes = ['GRP-ASSETS', 'GRP-LIABILITIES'];
    const roots = await prisma.accountGroup.findMany({
      where: { groupCode: { in: rootCodes }, delete_status: false },
      orderBy: { sortOrder: 'asc' },
    });

    const sections = [];
    let totalAssets = 0;
    let totalLiabilities = 0;

    for (const root of roots) {
      const summary = await accountGroupService.getSummary({ groupId: root.id, asOf });
      const total = parseFloat(summary.totalBalance || 0);
      sections.push({
        groupCode: root.groupCode,
        groupName: root.groupName,
        nature: root.nature,
        totalBalance: summary.totalBalance,
        childGroups: summary.childGroups,
        ledgers: summary.ledgers,
      });
      if (root.groupCode === 'GRP-ASSETS') totalAssets = total;
      else if (root.groupCode === 'GRP-LIABILITIES') totalLiabilities = total;
    }

    const liabSection = sections.find((s) => s.groupCode === 'GRP-LIABILITIES');
    const capitalSummary = findSummaryGroupByCode(liabSection?.childGroups, 'GRP-CAPITAL');
    const totalCapital = capitalSummary ? parseFloat(capitalSummary.totalBalance || 0) : 0;

    return {
      asOf: asOf || null,
      sections,
      totalAssets: totalAssets.toFixed(2),
      totalLiabilities: totalLiabilities.toFixed(2),
      totalCapital: totalCapital.toFixed(2),
      totalLiabilitiesAndCapital: totalLiabilities.toFixed(2),
      isBalanced: Math.abs(totalAssets - totalLiabilities) < 0.02,
    };
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

  // ── Finance Dashboard ────────────────────────────────────────

  async getDashboard({ asOf } = {}) {
    const asOfDate = parseAsOf(asOf);
    const asOfStr = toIsoDate(asOfDate);
    const { start: dayStart, end: dayEnd } = dayBounds(asOfDate);
    const monthFrom = toIsoDate(monthStart(asOfDate));
    const fy = financialYearBounds(asOfDate);

    const isActualToday = toIsoDate(new Date()) === asOfStr;

    const [
      todaySummary,
      dayPurchasesAgg,
      dayExpensesAgg,
      dayCollectionAgg,
      dayPnl,
      invoiceStats,
      vendorStats,
      cashBankLedgers,
      inventoryDash,
      fyTrendMonths,
    ] = await Promise.all([
      isActualToday
        ? dashboardService.getTodaySummary()
        : prisma.invoice.aggregate({
            where: {
              deleteStatus: false,
              status: { not: 'CANCELLED' },
              createdAt: { gte: dayStart, lte: dayEnd },
            },
            _sum: { totalAmount: true },
          }).then((r) => ({ todaySales: parseFloat(r._sum.totalAmount || 0) })),
      prisma.vendorInvoice.aggregate({
        where: {
          deleteStatus: false,
          status: { not: 'CANCELLED' },
          invoiceDate: { gte: dayStart, lte: dayEnd },
        },
        _sum: { totalAmount: true },
      }),
      prisma.transactionEntry.aggregate({
        where: {
          entryType: 'DEBIT',
          ledger: { ledgerType: 'EXPENSE', delete_status: false },
          transaction: { transactionDate: { gte: dayStart, lte: dayEnd }, isPosted: true },
        },
        _sum: { amount: true },
      }),
      prisma.customerPaymentVoucher.aggregate({
        where: {
          delete_status: false,
          cancelledStatus: false,
          paymentDate: { gte: dayStart, lte: dayEnd },
        },
        _sum: { totalAmount: true },
      }),
      this.getProfitLoss({ from: asOfStr, to: asOfStr }),
      invoiceService.getStats({ startDate: monthFrom, endDate: asOfStr }),
      vendorPaymentService.getStats({ startDate: monthFrom, endDate: asOfStr }),
      ledgerService.getCashBankLedgers(),
      inventoryService.getInventoryDashboardEnhanced({}),
      Promise.resolve(fyMonthsThrough(asOfDate)),
    ]);

    const cashBankTotal = cashBankLedgers.reduce(
      (s, l) => s + parseFloat(l.currentBalance || 0),
      0
    );

    const [receivablesRisk, expenseBreakup, profitLossSnapshot, fyTrend] = await Promise.all([
      this._getReceivablesRisk(asOfDate),
      this._getExpenseBreakup(asOfDate, monthFrom, asOfStr),
      this._getProfitLossSnapshot(asOfStr, inventoryDash),
      this._getFyTrend(fyTrendMonths),
    ]);

    return {
      asOf: asOfStr,
      financialYear: { label: fy.label, start: toIsoDate(fy.start), end: toIsoDate(fy.end) },
      today: {
        todaySales: round2(todaySummary.todaySales),
        todayCollection: round2(dayCollectionAgg._sum.totalAmount || 0),
        todayPurchases: round2(dayPurchasesAgg._sum.totalAmount || 0),
        todayExpenses: round2(dayExpensesAgg._sum.amount || 0),
        grossProfit: round2(dayPnl.grossProfit),
        netProfit: round2(dayPnl.netProfit),
      },
      position: {
        cashBankTotal: round2(cashBankTotal),
        collectionTarget: round2(invoiceStats.targetCollection),
        receivableOutstanding: round2(invoiceStats.outstanding),
        payablesPending: round2(vendorStats.outstanding),
        inventoryValue: round2(inventoryDash.totalValue || 0),
      },
      fyTrend,
      receivablesRisk,
      expenseBreakup,
      profitLossSnapshot,
    };
  }

  async _getReceivablesRisk(asOfDate) {
    const cutoff = new Date(asOfDate);
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - 90);

    const invoices = await prisma.invoice.findMany({
      where: {
        deleteStatus: false,
        status: { in: ['ISSUED', 'PARTIALLY_PAID'] },
        dueDate: { lt: cutoff },
      },
      select: {
        id: true,
        invoiceNo: true,
        dueDate: true,
        totalAmount: true,
        paidAmount: true,
        customerId: true,
        customer: { select: { name: true } },
      },
    });

    const asOfMs = new Date(asOfDate).setHours(0, 0, 0, 0);

    return invoices
      .map((inv) => {
        const balance = Math.max(0, (inv.totalAmount || 0) - (inv.paidAmount || 0));
        const dueMs = new Date(inv.dueDate).setHours(0, 0, 0, 0);
        const daysPastDue = Math.max(0, Math.floor((asOfMs - dueMs) / 86400000));
        return {
          customerId: inv.customerId,
          customerName: inv.customer?.name || '—',
          invoiceId: inv.id,
          invoiceNo: inv.invoiceNo,
          dueDate: inv.dueDate ? toIsoDate(new Date(inv.dueDate)) : null,
          daysPastDue,
          balance: round2(balance),
        };
      })
      .filter((r) => r.balance > 0)
      .sort((a, b) => b.balance - a.balance);
  }

  async _getExpenseBreakup(asOfDate, monthFrom, asOfStr) {
    const pnl = await this.getProfitLoss({ from: monthFrom, to: asOfStr });
    const rows = [
      ...(pnl.costOfGoodsSold?.breakdown || []).map((r) => ({
        ledgerCode: r.ledgerCode,
        ledgerName: r.ledgerName,
        amount: round2(r.amount),
        category: 'direct',
      })),
      ...(pnl.operatingExpenses?.breakdown || []).map((r) => ({
        ledgerCode: r.ledgerCode,
        ledgerName: r.ledgerName,
        amount: round2(r.amount),
        category: 'indirect',
      })),
    ]
      .filter((r) => r.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    return {
      from: monthFrom,
      to: asOfStr,
      total: round2(rows.reduce((s, r) => s + r.amount, 0)),
      items: rows,
    };
  }

  async _getProfitLossSnapshot(asOfStr, inventoryDash) {
    const monthFrom = toIsoDate(monthStart(parseAsOf(asOfStr)));
    const [pnl, bs] = await Promise.all([
      this.getProfitLoss({ from: monthFrom, to: asOfStr }),
      this.getBalanceSheet({ asOf: asOfStr }),
    ]);

    return {
      period: { from: monthFrom, to: asOfStr },
      income: pnl.income?.total,
      costOfGoodsSold: pnl.costOfGoodsSold?.total,
      grossProfit: pnl.grossProfit,
      operatingExpenses: pnl.operatingExpenses?.total,
      netProfit: pnl.netProfit,
      isProfit: pnl.isProfit,
      inventoryValue: round2(inventoryDash.totalValue || 0).toFixed(2),
      totalAssets: bs.totalAssets,
      totalLiabilities: bs.totalLiabilities,
      totalCapital: bs.totalCapital,
      totalLiabilitiesAndCapital: bs.totalLiabilitiesAndCapital,
    };
  }

  async _getFyTrend(months) {
    const points = await Promise.all(
      months.map(async (m) => {
        const pnl = await this.getProfitLoss({ from: m.from, to: m.to });
        const income = parseFloat(pnl.income?.total || 0);
        const expenses =
          parseFloat(pnl.costOfGoodsSold?.total || 0) +
          parseFloat(pnl.operatingExpenses?.total || 0);
        return {
          month: m.month,
          monthLabel: m.monthLabel,
          income: round2(income),
          expenses: round2(expenses),
        };
      })
    );
    return points;
  }

  // ── Trial Balance (grouped) ──────────────────────────────────

  async getTrialBalanceGrouped({ asOf }) {
    const flat = await this.getTrialBalance({ asOf });
    const ledgerCodes = flat.ledgers.map((l) => l.ledgerCode);

    const dbLedgers = await prisma.ledger.findMany({
      where: { ledgerCode: { in: ledgerCodes }, delete_status: false },
      select: {
        id: true,
        ledgerCode: true,
        ledgerName: true,
        ledgerType: true,
        accountGroupId: true,
        accountGroup: { select: { id: true, groupCode: true, groupName: true, sortOrder: true } },
      },
    });

    const ledgerByCode = Object.fromEntries(dbLedgers.map((l) => [l.ledgerCode, l]));
    const groupMap = new Map();

    for (const row of flat.ledgers) {
      const ledger = ledgerByCode[row.ledgerCode];
      const group = ledger?.accountGroup;
      if (!group) continue;

      if (!groupMap.has(group.id)) {
        groupMap.set(group.id, {
          groupCode: group.groupCode,
          groupName: group.groupName,
          sortOrder: group.sortOrder,
          totalDebit: 0,
          totalCredit: 0,
          netBalance: 0,
          ledgers: [],
        });
      }

      const g = groupMap.get(group.id);
      const dr = parseFloat(row.totalDebit) || 0;
      const cr = parseFloat(row.totalCredit) || 0;
      const net = parseFloat(row.netBalance) || 0;
      g.totalDebit += dr;
      g.totalCredit += cr;
      g.netBalance += net;

      if (EXPAND_TRIAL_BALANCE_GROUPS.has(group.groupCode)) {
        g.ledgers.push({
          ledgerCode: row.ledgerCode,
          ledgerName: row.ledgerName,
          ledgerType: row.ledgerType,
          totalDebit: row.totalDebit,
          totalCredit: row.totalCredit,
          netBalance: row.netBalance,
        });
      }
    }

    const groups = [...groupMap.values()]
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((g) => ({
        groupCode: g.groupCode,
        groupName: g.groupName,
        totalDebit: g.totalDebit.toFixed(2),
        totalCredit: g.totalCredit.toFixed(2),
        netBalance: g.netBalance.toFixed(2),
        ledgers: g.ledgers.sort((a, b) => a.ledgerCode.localeCompare(b.ledgerCode)),
      }));

    return {
      asOf: flat.asOf,
      isBalanced: flat.isBalanced,
      totalDebit: flat.totalDebit,
      totalCredit: flat.totalCredit,
      groups,
    };
  }
}
