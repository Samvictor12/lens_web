import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  invoiceAggregate: vi.fn(),
  invoiceFindMany: vi.fn(),
  vendorInvoiceAggregate: vi.fn(),
  txnAggregate: vi.fn(),
  paymentAggregate: vi.fn(),
  paymentFindMany: vi.fn(),
  getCashBankLedgers: vi.fn(),
  getInventoryDashboardEnhanced: vi.fn(),
  vendorGetStats: vi.fn(),
}));

vi.mock('../../config/prisma.js', () => ({
  default: {
    invoice: { aggregate: mocks.invoiceAggregate, findMany: mocks.invoiceFindMany },
    vendorInvoice: { aggregate: mocks.vendorInvoiceAggregate },
    transactionEntry: { aggregate: mocks.txnAggregate, groupBy: vi.fn(), findMany: vi.fn() },
    customerPaymentVoucher: { aggregate: mocks.paymentAggregate, findMany: mocks.paymentFindMany },
    ledger: { findMany: vi.fn(), findFirst: vi.fn() },
  },
}));

vi.mock('../../services/accountGroupService.js', () => ({
  AccountGroupService: class {},
}));

vi.mock('../../services/ledgerService.js', () => ({
  LedgerService: class {
    constructor() {
      this.getCashBankLedgers = mocks.getCashBankLedgers;
    }
  },
}));

vi.mock('../../services/inventory.service.js', () => ({
  default: class {
    constructor() {
      this.getInventoryDashboardEnhanced = mocks.getInventoryDashboardEnhanced;
    }
  },
}));

vi.mock('../../services/vendorPaymentService.js', () => ({
  default: { getStats: mocks.vendorGetStats },
}));

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prisma from '../../config/prisma.js';
import { FinancialReportService, coerceNumber } from '../../services/financialReportService.js';
import {
  unwrapDashboardPayload,
  financeKpiSlice,
} from '../../../services/financialReport.js';

function decimal(n) {
  return {
    toNumber: () => n,
    toString: () => String(n),
  };
}

const service = new FinancialReportService();

describe('coerceNumber Decimal', () => {
  it('coerces Prisma-like Decimal via toNumber when parseFloat would be NaN', () => {
    const decimal = { toNumber: () => 250 };
    expect(Number.isNaN(parseFloat(decimal))).toBe(true);
    expect(coerceNumber(decimal)).toBe(250);
    expect(coerceNumber('100.5')).toBe(100.5);
  });
});

describe('getDashboard (TC-3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(service, 'getProfitLoss').mockResolvedValue({
      grossProfit: '80.00',
      netProfit: '50.00',
      costOfGoodsSold: { breakdown: [] },
      operatingExpenses: { breakdown: [] },
    });
    vi.spyOn(service, '_getReceivablesRisk').mockResolvedValue([]);
    vi.spyOn(service, '_getExpenseBreakup').mockResolvedValue({ from: '', to: '', total: 0 });
    vi.spyOn(service, '_getProfitLossSnapshot').mockResolvedValue({});
    vi.spyOn(service, '_getFyTrend').mockResolvedValue([]);
    vi.spyOn(service, '_getCollectionByCustomer').mockResolvedValue([
      { customerId: 1, customerName: 'A', target: 140, actual: 0, balance: 140 },
    ]);

    mocks.invoiceAggregate.mockResolvedValue({ _sum: { totalAmount: decimal(1500) } });
    mocks.vendorInvoiceAggregate.mockResolvedValue({ _sum: { totalAmount: 200 } });
    mocks.txnAggregate.mockResolvedValue({ _sum: { amount: 40 } });
    mocks.paymentAggregate.mockResolvedValue({ _sum: { totalAmount: 300 } });
    mocks.invoiceFindMany.mockResolvedValue([
      { totalAmount: decimal(1000), paidAmount: decimal(250) },
    ]);
    mocks.vendorGetStats.mockResolvedValue({ outstanding: 75 });
    mocks.getCashBankLedgers.mockResolvedValue([
      { currentBalance: decimal(400) },
      { currentBalance: decimal(50.5) },
    ]);
    mocks.getInventoryDashboardEnhanced.mockResolvedValue({ totalValue: 180, totalStockUnits: 6 });
  });

  it('today/position KPIs equal parsed operational totals for asOf, not 0', async () => {
    const dash = await service.getDashboard({ asOf: '2026-09-14' });

    expect(dash.today.todaySales).toBe(1500);
    expect(dash.today.todayCollection).toBe(300);
    expect(dash.today.todayPurchases).toBe(200);
    expect(dash.today.todayExpenses).toBe(40);
    expect(dash.today.grossProfit).toBe(80);
    expect(dash.today.netProfit).toBe(50);
    expect(dash.position.cashBankTotal).toBe(450.5);
    expect(dash.position.receivableOutstanding).toBe(750);
    expect(dash.position.payablesPending).toBe(75);
    expect(dash.position.inventoryValue).toBe(180);
    expect(dash.position.collectionTarget).toBe(140);

    const salesWhere = mocks.invoiceAggregate.mock.calls[0][0].where;
    expect(salesWhere.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ billDate: expect.any(Object) }),
      ])
    );
    expect(salesWhere.createdAt).toBeUndefined();
    expect(mocks.getInventoryDashboardEnhanced).toHaveBeenCalledWith({});
  });
});

describe('Finance KPI bind (TC-4)', () => {
  const inner = {
    today: { todaySales: 1500, todayCollection: 0, todayPurchases: 0, todayExpenses: 0, grossProfit: 80, netProfit: 50 },
    position: { cashBankTotal: 450.5, collectionTarget: 140, receivableOutstanding: 750, payablesPending: 75, inventoryValue: 180 },
  };
  const envelope = { success: true, data: inner };

  it('binding envelope { success, data } zeros cards via dashboard?.today', () => {
    const sliced = financeKpiSlice(envelope);
    expect(sliced.today.todaySales).toBeUndefined();
    expect(sliced.position.cashBankTotal).toBeUndefined();
  });

  it('after apiClient shape, unwrap yields non-zero cards', () => {
    const dashboard = unwrapDashboardPayload(envelope);
    const sliced = financeKpiSlice(dashboard);
    expect(sliced.today.todaySales).toBe(1500);
    expect(sliced.position.cashBankTotal).toBe(450.5);
    expect(sliced.position.inventoryValue).toBe(180);
  });
});

describe('getDashboard calendar-month period window', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(service, 'getProfitLoss').mockResolvedValue({
      grossProfit: '80.00',
      netProfit: '50.00',
      costOfGoodsSold: { breakdown: [] },
      operatingExpenses: { breakdown: [] },
    });
    vi.spyOn(service, '_getReceivablesRisk').mockResolvedValue([]);
    vi.spyOn(service, '_getExpenseBreakup').mockResolvedValue({ from: '', to: '', total: 0 });
    vi.spyOn(service, '_getProfitLossSnapshot').mockResolvedValue({});
    vi.spyOn(service, '_getFyTrend').mockResolvedValue([]);
    vi.spyOn(service, '_getCollectionByCustomer').mockResolvedValue([]);

    mocks.invoiceAggregate.mockResolvedValue({ _sum: { totalAmount: 1500 } });
    mocks.vendorInvoiceAggregate.mockResolvedValue({ _sum: { totalAmount: 200 } });
    mocks.txnAggregate.mockResolvedValue({ _sum: { amount: 40 } });
    mocks.paymentAggregate.mockResolvedValue({ _sum: { totalAmount: 300 } });
    mocks.invoiceFindMany.mockResolvedValue([]);
    mocks.vendorGetStats.mockResolvedValue({ outstanding: 75 });
    mocks.getCashBankLedgers.mockResolvedValue([]);
    mocks.getInventoryDashboardEnhanced.mockResolvedValue({ totalValue: 180, totalStockUnits: 6 });
  });

  function expectMonthWindow(range, monthStart, asOfEnd) {
    expect(range.gte.getTime()).toBe(monthStart.getTime());
    expect(range.lte.getTime()).toBe(asOfEnd.getTime());
  }

  it('asOf 2026-09-15 sales window is calendar month-start 2026-09-01 through asOf EOD, not FY 2026-04-01 (TC-2)', async () => {
    await service.getDashboard({ asOf: '2026-09-15' });

    const salesWhere = mocks.invoiceAggregate.mock.calls[0][0].where;
    const billRange = salesWhere.OR.find((clause) => clause.billDate).billDate;
    const createdAtRange = salesWhere.OR.find((clause) => clause.createdAt).createdAt;
    const monthStart = new Date(2026, 8, 1, 0, 0, 0, 0);
    const asOfEnd = new Date(2026, 8, 15, 23, 59, 59, 999);
    const fyStart = new Date(2026, 3, 1, 0, 0, 0, 0);

    expectMonthWindow(billRange, monthStart, asOfEnd);
    expectMonthWindow(createdAtRange, monthStart, asOfEnd);
    expect(billRange.gte.getTime()).not.toBe(fyStart.getTime());
    expect(salesWhere.deleteStatus).toBe(false);
    expect(salesWhere.status).toEqual({ not: 'CANCELLED' });
  });

  it('asOf 2026-02-15 sales window is 2026-02-01 through asOf EOD, not previous FY 2025-04-01 (TC-3)', async () => {
    await service.getDashboard({ asOf: '2026-02-15' });

    const salesWhere = mocks.invoiceAggregate.mock.calls[0][0].where;
    const billRange = salesWhere.OR.find((clause) => clause.billDate).billDate;
    const monthStart = new Date(2026, 1, 1, 0, 0, 0, 0);
    const asOfEnd = new Date(2026, 1, 15, 23, 59, 59, 999);
    const fyStart = new Date(2025, 3, 1, 0, 0, 0, 0);

    expectMonthWindow(billRange, monthStart, asOfEnd);
    expect(billRange.gte.getTime()).not.toBe(fyStart.getTime());
  });

  it('purchases, collection, expenses, and P&L use the same month-start→asOf window (TC-2)', async () => {
    await service.getDashboard({ asOf: '2026-09-15' });

    const monthStart = new Date(2026, 8, 1, 0, 0, 0, 0);
    const asOfEnd = new Date(2026, 8, 15, 23, 59, 59, 999);

    const purchaseWhere = mocks.vendorInvoiceAggregate.mock.calls[0][0].where;
    expect(purchaseWhere.invoiceDate).toBeUndefined();
    const invoiceDateRange = purchaseWhere.OR.find((clause) => clause.invoiceDate).invoiceDate;
    const purchaseCreated = purchaseWhere.OR.find((clause) => clause.createdAt).createdAt;
    expectMonthWindow(invoiceDateRange, monthStart, asOfEnd);
    expectMonthWindow(purchaseCreated, monthStart, asOfEnd);

    const paymentWhere = mocks.paymentAggregate.mock.calls[0][0].where;
    expectMonthWindow(paymentWhere.paymentDate, monthStart, asOfEnd);
    expect(paymentWhere.cancelledStatus).toBe(false);

    const expenseWhere = mocks.txnAggregate.mock.calls[0][0].where;
    expect(expenseWhere.entryType).toBe('DEBIT');
    expect(expenseWhere.ledger).toEqual({ ledgerType: 'EXPENSE', delete_status: false });
    expectMonthWindow(expenseWhere.transaction.transactionDate, monthStart, asOfEnd);
    expect(expenseWhere.transaction.isPosted).toBe(true);

    expect(service.getProfitLoss).toHaveBeenCalledWith({ from: '2026-09-01', to: '2026-09-15' });
  });

  it('position KPIs stay as-of snapshots; today.* keys still carry period values (TC-4)', async () => {
    const dash = await service.getDashboard({ asOf: '2026-09-15' });

    expect(dash.today).toEqual(
      expect.objectContaining({
        todaySales: 1500,
        todayCollection: 300,
        todayPurchases: 200,
        todayExpenses: 40,
        grossProfit: 80,
        netProfit: 50,
      })
    );

    expect(mocks.getInventoryDashboardEnhanced).toHaveBeenCalledWith({});
    expect(mocks.vendorGetStats).toHaveBeenCalledWith({ startDate: '2026-09-01', endDate: '2026-09-15' });

    const receivableWhere = mocks.invoiceFindMany.mock.calls.find(
      (call) => call[0]?.where?.status?.in
    )?.[0]?.where;
    expect(receivableWhere.billDate).toBeUndefined();
    expect(receivableWhere.OR).toBeUndefined();
    expect(receivableWhere.status).toEqual({ in: ['ISSUED', 'PARTIALLY_PAID'] });

    expect(dash.position.inventoryValue).toBe(180);
    expect(dash.position.payablesPending).toBe(75);

    const fyMonths = service._getFyTrend.mock.calls[0][0];
    expect(fyMonths[0].month).toBe('2026-04');
    expect(fyMonths.map((m) => m.month)).toEqual([
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
    ]);
  });

  it('todaySales/todayPurchases come from invoice and vendorInvoice aggregates, not ledger balances', async () => {
    const dash = await service.getDashboard({ asOf: '2026-09-15' });

    expect(dash.today.todaySales).toBe(1500);
    expect(dash.today.todayPurchases).toBe(200);
    expect(mocks.invoiceAggregate.mock.calls[0][0]._sum).toEqual({ totalAmount: true });
    expect(mocks.vendorInvoiceAggregate.mock.calls[0][0]._sum).toEqual({ totalAmount: true });
    expect(prisma.ledger.findFirst).not.toHaveBeenCalled();
    expect(prisma.ledger.findMany).not.toHaveBeenCalled();
  });
});

describe('FinanceDashboardKpis Row-1 labels (TC-6)', () => {
  it('period totals are Sales, Collection, Purchases, Expenses without Today prefix', () => {
    const src = readFileSync(
      path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        '../../../pages/Accounting/FinanceDashboard/FinanceDashboardKpis.jsx'
      ),
      'utf8'
    );
    expect(src).toMatch(/label:\s*"Sales"/);
    expect(src).toMatch(/label:\s*"Collection"/);
    expect(src).toMatch(/label:\s*"Purchases"/);
    expect(src).toMatch(/label:\s*"Expenses"/);
    expect(src).not.toMatch(/Today Sales/);
    expect(src).not.toMatch(/Today Collection/);
    expect(src).not.toMatch(/Today Purchases/);
    expect(src).not.toMatch(/Today Expenses/);
  });
});

describe('CreateVendorInvoiceDialog local invoiceDate (TC-5)', () => {
  it('emptyForm invoiceDate uses formatLocalDate / local today, not toISOString date-only', () => {
    const src = readFileSync(
      path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        '../../../pages/Accounting/VendorPayments/CreateVendorInvoiceDialog.jsx'
      ),
      'utf8'
    );
    expect(src).toMatch(/formatLocalDate/);
    expect(src).toMatch(/invoiceDate:\s*formatLocalDate\(new Date\(\)\)/);
    expect(src).not.toMatch(/toISOString\(\)\.split\(['"]T['"]\)\[0\]/);
  });
});
