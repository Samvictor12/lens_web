/**
 * Unit tests — accountingService.js
 * Tests double-entry GL posting engine with mocked Prisma tx.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock prisma module (used by generateTransactionNumber etc.) ───────────────
vi.mock('../../config/prisma.js', () => ({
  default: {
    financialTransaction: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    vendorPaymentVoucher: { findFirst: vi.fn() },
    expense: { findFirst: vi.fn() },
    ledger: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import prisma from '../../config/prisma.js';
import {
  generateVoucherNumber,
  generateExpenseNumber,
  postTransaction,
  postInvoice,
  reverseInvoice,
  postClientPayment,
  postVendorPayment,
  postVendorInvoice,
  postExpense,
  postIncome,
  postReversingTransaction,
  postCustomerPaymentReceipt,
} from '../../services/accountingService.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeTx(overrides = {}) {
  return {
    financialTransaction: {
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    ledger: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    saleOrder: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    inventoryTransaction: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    ...overrides,
  };
}

function makeLedger(partial) {
  return {
    id: partial.id ?? 1,
    ledgerCode: partial.ledgerCode ?? 'AC-1001',
    ledgerName: partial.ledgerName ?? 'Cash',
    ledgerType: partial.ledgerType ?? 'ASSET',
    currentBalance: partial.currentBalance ?? 0,
    isSystemLedger: false,
    isGroupLedger: false,
    allowsDirectPosting: true,
    active_status: true,
    delete_status: false,
    ...partial,
  };
}

const YEAR = new Date().getFullYear();
const USER_ID = 1;

// ── generateVoucherNumber ─────────────────────────────────────────────────────

describe('generateVoucherNumber()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns VPV-YEAR-0001 when no voucher exists', async () => {
    prisma.vendorPaymentVoucher.findFirst.mockResolvedValue(null);
    const result = await generateVoucherNumber();
    expect(result).toBe(`VPV-${YEAR}-0001`);
  });

  it('increments from last voucher number', async () => {
    prisma.vendorPaymentVoucher.findFirst.mockResolvedValue({
      voucherNumber: `VPV-${YEAR}-0004`,
    });
    const result = await generateVoucherNumber();
    expect(result).toBe(`VPV-${YEAR}-0005`);
  });
});

// ── generateExpenseNumber ─────────────────────────────────────────────────────

describe('generateExpenseNumber()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns EXP-YEAR-0001 when no expense exists', async () => {
    prisma.expense.findFirst.mockResolvedValue(null);
    const result = await generateExpenseNumber();
    expect(result).toBe(`EXP-${YEAR}-0001`);
  });

  it('increments from last expense number', async () => {
    prisma.expense.findFirst.mockResolvedValue({ expenseNumber: `EXP-${YEAR}-0012` });
    const result = await generateExpenseNumber();
    expect(result).toBe(`EXP-${YEAR}-0013`);
  });
});

// ── postTransaction ───────────────────────────────────────────────────────────

describe('postTransaction()', () => {
  let tx;
  const arLedger   = makeLedger({ id: 10, ledgerCode: 'AC-1003', ledgerType: 'ASSET',     currentBalance: 0 });
  const salesLedger= makeLedger({ id: 20, ledgerCode: 'AC-3001', ledgerType: 'INCOME',    currentBalance: 0 });

  const entries = [
    { ledgerId: 10, entryType: 'DEBIT',  amount: 5000, description: 'Dr AR' },
    { ledgerId: 20, entryType: 'CREDIT', amount: 5000, description: 'Cr Sales' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    tx = makeTx();

    // tx.financialTransaction.findFirst → null (so txn number = 00001)
    tx.financialTransaction.findFirst.mockResolvedValue(null);
    prisma.financialTransaction.findFirst.mockResolvedValue(null);

    // tx.financialTransaction.create → returns created txn with entries
    tx.financialTransaction.create.mockResolvedValue({
      id: 1,
      transactionNumber: `TXN-${YEAR}-00001`,
      totalAmount: 5000,
      entries: entries.map((e, i) => ({ ...e, id: i + 1 })),
    });

    // tx.ledger.findUnique → return correct ledger per id
    tx.ledger.findUnique.mockImplementation(({ where: { id } }) => {
      if (id === 10) return Promise.resolve(arLedger);
      if (id === 20) return Promise.resolve(salesLedger);
      return Promise.resolve(null);
    });
  });

  it('throws APIError when entries are unbalanced (Dr ≠ Cr)', async () => {
    const unbalanced = [
      { ledgerId: 10, entryType: 'DEBIT',  amount: 5000 },
      { ledgerId: 20, entryType: 'CREDIT', amount: 4000 },
    ];
    await expect(postTransaction(tx, { transactionType: 'SALE' }, unbalanced, USER_ID))
      .rejects.toThrow('Transaction not balanced');
  });

  it('creates financial transaction for balanced entries', async () => {
    await postTransaction(tx, { transactionType: 'SALE', description: 'Test' }, entries, USER_ID);
    expect(tx.financialTransaction.create).toHaveBeenCalledOnce();
    const createCall = tx.financialTransaction.create.mock.calls[0][0];
    expect(createCall.data.transactionType).toBe('SALE');
    expect(createCall.data.totalAmount).toBe(5000);
    expect(createCall.data.isPosted).toBe(true);
    expect(createCall.data.entries.create).toHaveLength(2);
  });

  it('updates ledger balances after posting (ASSET+DEBIT increases balance)', async () => {
    await postTransaction(tx, { transactionType: 'SALE' }, entries, USER_ID);
    // AR ledger (ASSET, DEBIT 5000): balance 0 + 5000 = 5000
    expect(tx.ledger.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { currentBalance: 5000 },
    });
    // Sales ledger (INCOME, CREDIT 5000): balance 0 + 5000 = 5000
    expect(tx.ledger.update).toHaveBeenCalledWith({
      where: { id: 20 },
      data: { currentBalance: 5000 },
    });
  });

  it('ASSET+CREDIT decreases balance, LIABILITY+DEBIT decreases balance', async () => {
    const cashLedger = makeLedger({ id: 30, ledgerType: 'ASSET',     currentBalance: 10000 });
    const apLedger   = makeLedger({ id: 40, ledgerType: 'LIABILITY', currentBalance: 5000 });

    const paymentEntries = [
      { ledgerId: 40, entryType: 'DEBIT',  amount: 2000 },
      { ledgerId: 30, entryType: 'CREDIT', amount: 2000 },
    ];

    tx.financialTransaction.create.mockResolvedValue({
      id: 2, transactionNumber: `TXN-${YEAR}-00001`, totalAmount: 2000,
      entries: paymentEntries.map((e, i) => ({ ...e, id: i + 10 })),
    });
    tx.ledger.findUnique.mockImplementation(({ where: { id } }) => {
      if (id === 30) return Promise.resolve(cashLedger);
      if (id === 40) return Promise.resolve(apLedger);
    });

    await postTransaction(tx, { transactionType: 'PAYMENT' }, paymentEntries, USER_ID);

    // AP (LIABILITY, DEBIT 2000): 5000 - 2000 = 3000
    expect(tx.ledger.update).toHaveBeenCalledWith({ where: { id: 40 }, data: { currentBalance: 3000 } });
    // Cash (ASSET, CREDIT 2000): 10000 - 2000 = 8000
    expect(tx.ledger.update).toHaveBeenCalledWith({ where: { id: 30 }, data: { currentBalance: 8000 } });
  });

  it('returns the created transaction object', async () => {
    const result = await postTransaction(tx, { transactionType: 'SALE' }, entries, USER_ID);
    expect(result).toHaveProperty('transactionNumber');
    expect(result).toHaveProperty('entries');
  });

  it('rolls up the parent ledger balance when the posted ledger has a parentLedgerId', async () => {
    // Child = customer's AR sub-ledger (AC-1003-C1), parent = control AR ledger (AC-1003)
    const parentArLedger = makeLedger({ id: 10, ledgerCode: 'AC-1003',   ledgerType: 'ASSET', currentBalance: 2000, parentLedgerId: null });
    const childArLedger  = makeLedger({ id: 50, ledgerCode: 'AC-1003-C1', ledgerType: 'ASSET', currentBalance: 500,  parentLedgerId: 10 });
    const salesLedger    = makeLedger({ id: 20, ledgerCode: 'AC-3001',   ledgerType: 'INCOME', currentBalance: 0,    parentLedgerId: null });

    const rollupEntries = [
      { ledgerId: 50, entryType: 'DEBIT',  amount: 5000 },
      { ledgerId: 20, entryType: 'CREDIT', amount: 5000 },
    ];

    tx.financialTransaction.create.mockResolvedValue({
      id: 3, transactionNumber: `TXN-${YEAR}-00001`, totalAmount: 5000,
      entries: rollupEntries.map((e, i) => ({ ...e, id: i + 20 })),
    });
    tx.ledger.findUnique.mockImplementation(({ where: { id } }) => {
      if (id === 50) return Promise.resolve(childArLedger);
      if (id === 20) return Promise.resolve(salesLedger);
      if (id === 10) return Promise.resolve(parentArLedger);
      return Promise.resolve(null);
    });

    await postTransaction(tx, { transactionType: 'SALE' }, rollupEntries, USER_ID);

    // Child AR (ASSET, DEBIT 5000): 500 + 5000 = 5500
    expect(tx.ledger.update).toHaveBeenCalledWith({ where: { id: 50 }, data: { currentBalance: 5500 } });
    // Parent AR (ASSET, same entryType/amount as child, per parent's own ledgerType): 2000 + 5000 = 7000
    expect(tx.ledger.update).toHaveBeenCalledWith({ where: { id: 10 }, data: { currentBalance: 7000 } });
    // Sales ledger (INCOME, CREDIT 5000) has no parentLedgerId — only one update call for it
    expect(tx.ledger.update).toHaveBeenCalledWith({ where: { id: 20 }, data: { currentBalance: 5000 } });
    // Exactly 3 ledger.update calls total: child + parent rollup + unrelated sales entry
    expect(tx.ledger.update).toHaveBeenCalledTimes(3);
  });

  it('does not attempt a parent rollup when parentLedgerId is null', async () => {
    await postTransaction(tx, { transactionType: 'SALE' }, entries, USER_ID);
    // arLedger (id 10) and salesLedger (id 20) both have no parentLedgerId in this describe block's fixtures
    expect(tx.ledger.update).toHaveBeenCalledTimes(2);
  });
});

// ── postInvoice ───────────────────────────────────────────────────────────────

describe('postInvoice()', () => {
  let tx;

  const customer = { id: 1, code: 'CUST-001', ledgerId: 10 };

  beforeEach(() => {
    vi.clearAllMocks();
    tx = makeTx();
    prisma.financialTransaction.findFirst.mockResolvedValue(null);
    tx.financialTransaction.findFirst.mockResolvedValue(null);

    tx.ledger.findFirst.mockImplementation(({ where: { ledgerCode } }) => {
      const map = {
        'AC-1003': makeLedger({ id: 10, ledgerCode: 'AC-1003', ledgerType: 'ASSET',  currentBalance: 0, ledgerName: 'Accounts Receivable' }),
        'AC-3001': makeLedger({ id: 20, ledgerCode: 'AC-3001', ledgerType: 'INCOME', currentBalance: 0, ledgerName: 'Sales Revenue' }),
        'AC-2003': makeLedger({ id: 30, ledgerCode: 'AC-2003', ledgerType: 'LIABILITY', currentBalance: 0, ledgerName: 'GST Output' }),
        'AC-1004': makeLedger({ id: 60, ledgerCode: 'AC-1004', ledgerType: 'ASSET', currentBalance: 0, ledgerName: 'Inventory/Stock' }),
        'AC-4001': makeLedger({ id: 70, ledgerCode: 'AC-4001', ledgerType: 'EXPENSE', currentBalance: 0, ledgerName: 'Purchase / COGS' }),
      };
      return Promise.resolve(map[ledgerCode] ?? null);
    });

    tx.ledger.findUnique.mockImplementation(({ where: { id } }) => {
      const map = {
        10: makeLedger({ id: 10, ledgerCode: 'AC-1003-C1', ledgerType: 'ASSET',     currentBalance: 0 }),
        20: makeLedger({ id: 20, ledgerType: 'INCOME',    currentBalance: 0 }),
        30: makeLedger({ id: 30, ledgerType: 'LIABILITY', currentBalance: 0 }),
        60: makeLedger({ id: 60, ledgerCode: 'AC-1004', ledgerType: 'ASSET', currentBalance: 0 }),
        70: makeLedger({ id: 70, ledgerCode: 'AC-4001', ledgerType: 'EXPENSE', currentBalance: 0 }),
      };
      return Promise.resolve(map[id] ?? null);
    });

    tx.financialTransaction.create.mockImplementation(({ data }) => Promise.resolve({
      id: 1, transactionNumber: `TXN-${YEAR}-00001`, totalAmount: data.totalAmount,
      entries: data.entries.create.map((e, i) => ({ ...e, id: i + 1 })),
    }));
  });

  it('creates SALE transaction with Dr AR, Cr Sales Revenue (no tax)', async () => {
    await postInvoice(tx, { invoiceId: 1, invoiceNo: 'INV-001', totalAmount: 5000, taxAmount: 0, customer }, USER_ID);
    const call = tx.financialTransaction.create.mock.calls[0][0];
    expect(call.data.transactionType).toBe('SALE');
    const entriesCreated = call.data.entries.create;
    expect(entriesCreated).toHaveLength(2);
    const drEntry = entriesCreated.find(e => e.entryType === 'DEBIT');
    const crEntry = entriesCreated.find(e => e.entryType === 'CREDIT');
    expect(drEntry.ledgerId).toBe(10); // AR
    expect(drEntry.amount).toBe(5000);
    expect(crEntry.ledgerId).toBe(20); // Sales
    expect(crEntry.amount).toBe(5000);
  });

  it('splits GST into separate CREDIT entry when taxAmount > 0', async () => {
    await postInvoice(tx, { invoiceId: 2, invoiceNo: 'INV-002', totalAmount: 5900, taxAmount: 900, customer }, USER_ID);
    const call = tx.financialTransaction.create.mock.calls[0][0];
    const entries = call.data.entries.create;
    expect(entries).toHaveLength(3);
    const gstEntry = entries.find(e => e.ledgerId === 30);
    expect(gstEntry).toBeDefined();
    expect(gstEntry.entryType).toBe('CREDIT');
    expect(gstEntry.amount).toBe(900);
    const salesEntry = entries.find(e => e.ledgerId === 20);
    expect(salesEntry.amount).toBe(5000); // net
  });

  it('TC-4 uses billDate as FT.transactionDate', async () => {
    const billDate = new Date('2026-08-20T12:00:00');
    await postInvoice(tx, {
      invoiceId: 1,
      invoiceNo: 'INV-001',
      totalAmount: 5000,
      taxAmount: 0,
      customer,
      transactionDate: billDate,
    }, USER_ID);
    const call = tx.financialTransaction.create.mock.calls[0][0];
    expect(call.data.transactionDate).toEqual(billDate);
  });

  it('TC-6 posts Dr AC-4001 and Cr AC-1004 for linked OUTWARD_SALE unit costs', async () => {
    tx.saleOrder.findMany.mockResolvedValue([{ id: 101 }, { id: 102 }]);
    tx.inventoryTransaction.findMany.mockResolvedValue([
      { unitPrice: 40 },
      { unitPrice: 60 },
      { unitPrice: null },
    ]);
    await postInvoice(tx, { invoiceId: 1, invoiceNo: 'INV-001', totalAmount: 5900, taxAmount: 900, customer }, USER_ID);
    const call = tx.financialTransaction.create.mock.calls[0][0];
    const entries = call.data.entries.create;
    expect(tx.inventoryTransaction.findMany).toHaveBeenCalledWith({
      where: { type: 'OUTWARD_SALE', saleOrderId: { in: [101, 102] } },
      select: { unitPrice: true },
    });
    const ar = entries.find((e) => e.ledgerId === 10 && e.entryType === 'DEBIT');
    const sales = entries.find((e) => e.ledgerId === 20 && e.entryType === 'CREDIT');
    const gst = entries.find((e) => e.ledgerId === 30 && e.entryType === 'CREDIT');
    const cogs = entries.find((e) => e.ledgerId === 70);
    const inventory = entries.find((e) => e.ledgerId === 60);
    expect(ar.amount).toBe(5900);
    expect(sales.amount).toBe(5000);
    expect(gst.amount).toBe(900);
    expect(cogs.entryType).toBe('DEBIT');
    expect(cogs.amount).toBe(100);
    expect(inventory.entryType).toBe('CREDIT');
    expect(inventory.amount).toBe(100);
    const totalDr = entries.filter((e) => e.entryType === 'DEBIT').reduce((s, e) => s + e.amount, 0);
    const totalCr = entries.filter((e) => e.entryType === 'CREDIT').reduce((s, e) => s + e.amount, 0);
    expect(totalDr).toBe(totalCr);
  });

  it('TC-6 skips inventory/COGS lines when outward cost is below 0.01', async () => {
    tx.saleOrder.findMany.mockResolvedValue([{ id: 101 }]);
    tx.inventoryTransaction.findMany.mockResolvedValue([{ unitPrice: null }, { unitPrice: 0 }]);
    await postInvoice(tx, { invoiceId: 1, invoiceNo: 'INV-001', totalAmount: 5000, taxAmount: 0, customer }, USER_ID);
    const entries = tx.financialTransaction.create.mock.calls[0][0].data.entries.create;
    expect(entries).toHaveLength(2);
    expect(entries.some((e) => e.ledgerId === 60 || e.ledgerId === 70)).toBe(false);
  });
});

describe('reverseInvoice()', () => {
  let tx;
  const customer = { id: 1, code: 'CUST-001', ledgerId: 10 };

  beforeEach(() => {
    vi.clearAllMocks();
    tx = makeTx();
    prisma.financialTransaction.findFirst.mockResolvedValue(null);
    tx.financialTransaction.findFirst.mockResolvedValue(null);
    tx.ledger.findFirst.mockImplementation(({ where: { ledgerCode } }) => {
      const map = {
        'AC-3001': makeLedger({ id: 20, ledgerCode: 'AC-3001', ledgerType: 'INCOME' }),
        'AC-2003': makeLedger({ id: 30, ledgerCode: 'AC-2003', ledgerType: 'LIABILITY' }),
        'AC-1004': makeLedger({ id: 60, ledgerCode: 'AC-1004', ledgerType: 'ASSET' }),
        'AC-4001': makeLedger({ id: 70, ledgerCode: 'AC-4001', ledgerType: 'EXPENSE' }),
      };
      return Promise.resolve(map[ledgerCode] ?? null);
    });
    tx.ledger.findUnique.mockImplementation(({ where: { id } }) => {
      const map = {
        10: makeLedger({ id: 10, ledgerCode: 'AC-1003-C1', ledgerType: 'ASSET' }),
        20: makeLedger({ id: 20, ledgerType: 'INCOME' }),
        30: makeLedger({ id: 30, ledgerType: 'LIABILITY' }),
        60: makeLedger({ id: 60, ledgerCode: 'AC-1004', ledgerType: 'ASSET' }),
        70: makeLedger({ id: 70, ledgerCode: 'AC-4001', ledgerType: 'EXPENSE' }),
      };
      return Promise.resolve(map[id] ?? null);
    });
    tx.financialTransaction.create.mockImplementation(({ data }) => Promise.resolve({
      id: 8, transactionNumber: `TXN-${YEAR}-00001`, totalAmount: data.totalAmount,
      entries: data.entries.create.map((e, i) => ({ ...e, id: i + 1 })),
    }));
  });

  it('reverses COGS and Inventory when outward sale cost was posted', async () => {
    tx.saleOrder.findMany.mockResolvedValue([{ id: 101 }]);
    tx.inventoryTransaction.findMany.mockResolvedValue([{ unitPrice: 75 }]);
    await reverseInvoice(tx, { invoiceId: 1, invoiceNo: 'INV-001', totalAmount: 5000, taxAmount: 0, customer }, USER_ID);
    const entries = tx.financialTransaction.create.mock.calls[0][0].data.entries.create;
    const inventory = entries.find((e) => e.ledgerId === 60);
    const cogs = entries.find((e) => e.ledgerId === 70);
    expect(inventory.entryType).toBe('DEBIT');
    expect(inventory.amount).toBe(75);
    expect(cogs.entryType).toBe('CREDIT');
    expect(cogs.amount).toBe(75);
  });

  it('does not reverse COGS/Inventory when cost is below 0.01', async () => {
    tx.saleOrder.findMany.mockResolvedValue([{ id: 101 }]);
    tx.inventoryTransaction.findMany.mockResolvedValue([{ unitPrice: null }]);
    await reverseInvoice(tx, { invoiceId: 1, invoiceNo: 'INV-001', totalAmount: 5000, taxAmount: 0, customer }, USER_ID);
    const entries = tx.financialTransaction.create.mock.calls[0][0].data.entries.create;
    expect(entries.some((e) => e.ledgerId === 60 || e.ledgerId === 70)).toBe(false);
  });
});

// ── postClientPayment ─────────────────────────────────────────────────────────

describe('postClientPayment()', () => {
  let tx;
  const bankLedger = makeLedger({ id: 5, ledgerType: 'ASSET', currentBalance: 10000, ledgerName: 'HDFC Bank' });
  const arLedger   = makeLedger({ id: 10, ledgerCode: 'AC-1003-C1', ledgerType: 'ASSET', currentBalance: 5000 });
  const customer = { id: 1, code: 'CUST-001', ledgerId: 10 };

  beforeEach(() => {
    vi.clearAllMocks();
    tx = makeTx();
    prisma.financialTransaction.findFirst.mockResolvedValue(null);
    tx.financialTransaction.findFirst.mockResolvedValue(null);

    tx.ledger.findUnique.mockImplementation(({ where: { id } }) => {
      if (id === 5) return Promise.resolve(bankLedger);
      if (id === 10) return Promise.resolve(arLedger);
      return Promise.resolve(null);
    });
    tx.ledger.findFirst.mockImplementation(({ where: { ledgerCode } }) =>
      ledgerCode === 'AC-1003' ? Promise.resolve(arLedger) : Promise.resolve(null)
    );
    tx.financialTransaction.create.mockImplementation(({ data }) => Promise.resolve({
      id: 3, transactionNumber: `TXN-${YEAR}-00001`, totalAmount: data.totalAmount,
      entries: data.entries.create.map((e, i) => ({ ...e, id: i + 1 })),
    }));
  });

  it('creates RECEIPT transaction Dr Bank, Cr AR', async () => {
    await postClientPayment(tx, { invoiceId: 1, invoiceNo: 'INV-001', amount: 3000, bankLedgerId: 5, customer }, USER_ID);
    const call = tx.financialTransaction.create.mock.calls[0][0];
    expect(call.data.transactionType).toBe('RECEIPT');
    const entries = call.data.entries.create;
    expect(entries).toHaveLength(2);
    const dr = entries.find(e => e.entryType === 'DEBIT');
    const cr = entries.find(e => e.entryType === 'CREDIT');
    expect(dr.ledgerId).toBe(5);   // Bank
    expect(cr.ledgerId).toBe(10);  // AR
    expect(dr.amount).toBe(3000);
    expect(cr.amount).toBe(3000);
  });

  it('throws if bankLedgerId not found', async () => {
    tx.ledger.findUnique.mockImplementation(({ where: { id } }) => {
      if (id === 10) return Promise.resolve(arLedger);
      return Promise.resolve(null);
    });
    await expect(postClientPayment(tx, { invoiceId: 1, invoiceNo: 'INV-001', amount: 3000, bankLedgerId: 999, customer }, USER_ID))
      .rejects.toThrow('Selected bank/cash ledger not found');
  });
});

// ── postVendorInvoice ─────────────────────────────────────────────────────────

describe('postVendorInvoice()', () => {
  let tx;
  const inventoryLedger = makeLedger({ id: 60, ledgerCode: 'AC-1004', ledgerType: 'ASSET', currentBalance: 0, ledgerName: 'Inventory' });
  const gstInputLedger  = makeLedger({ id: 61, ledgerCode: 'AC-1005', ledgerType: 'ASSET', currentBalance: 0, ledgerName: 'GST Input' });
  const apLedger        = makeLedger({ id: 40, ledgerCode: 'AC-2001-V1', ledgerType: 'LIABILITY', currentBalance: 0 });
  const vendor = { id: 1, code: 'VEND-001', ledgerId: 40 };

  beforeEach(() => {
    vi.clearAllMocks();
    tx = makeTx();
    prisma.financialTransaction.findFirst.mockResolvedValue(null);
    tx.financialTransaction.findFirst.mockResolvedValue(null);

    tx.ledger.findFirst.mockImplementation(({ where: { ledgerCode } }) => {
      const map = {
        'AC-1004': inventoryLedger,
        'AC-1005': gstInputLedger,
        'AC-2001': apLedger,
      };
      return Promise.resolve(map[ledgerCode] ?? null);
    });
    tx.ledger.findUnique.mockImplementation(({ where: { id } }) => {
      if (id === 40) return Promise.resolve(apLedger);
      if (id === 60) return Promise.resolve(inventoryLedger);
      if (id === 61) return Promise.resolve(gstInputLedger);
      return Promise.resolve(null);
    });
    tx.financialTransaction.create.mockImplementation(({ data }) => Promise.resolve({
      id: 6, transactionNumber: `TXN-${YEAR}-00001`, totalAmount: data.totalAmount,
      entries: data.entries.create.map((e, i) => ({ ...e, id: i + 1 })),
    }));
  });

  it('creates PURCHASE transaction with referenceType VENDOR_INVOICE, Dr Inventory, Cr AP (no tax)', async () => {
    await postVendorInvoice(tx, {
      vendorInvoiceId: 10,
      invoiceNumber: 'VINV-2026-0001',
      subtotal: 5000,
      taxAmount: 0,
      totalAmount: 5000,
      vendor,
    }, USER_ID);
    const call = tx.financialTransaction.create.mock.calls[0][0];
    expect(call.data.transactionType).toBe('PURCHASE');
    expect(call.data.referenceType).toBe('VENDOR_INVOICE');
    expect(call.data.referenceId).toBe(10);
    expect(call.data.referenceNumber).toBe('VINV-2026-0001');
    const entries = call.data.entries.create;
    expect(entries).toHaveLength(2);
    const dr = entries.find(e => e.entryType === 'DEBIT');
    const cr = entries.find(e => e.entryType === 'CREDIT');
    expect(dr.ledgerId).toBe(60);
    expect(dr.amount).toBe(5000);
    expect(cr.ledgerId).toBe(40);
    expect(cr.amount).toBe(5000);
  });

  it('splits GST into separate DEBIT entry when taxAmount > 0', async () => {
    await postVendorInvoice(tx, {
      vendorInvoiceId: 11,
      invoiceNumber: 'VINV-2026-0002',
      subtotal: 10000,
      taxAmount: 1800,
      totalAmount: 11800,
      vendor,
    }, USER_ID);
    const call = tx.financialTransaction.create.mock.calls[0][0];
    const entries = call.data.entries.create;
    expect(entries).toHaveLength(3);
    const inventoryEntry = entries.find(e => e.ledgerId === 60);
    const gstEntry = entries.find(e => e.ledgerId === 61);
    const apEntry = entries.find(e => e.ledgerId === 40);
    expect(inventoryEntry.entryType).toBe('DEBIT');
    expect(inventoryEntry.amount).toBe(10000);
    expect(gstEntry.entryType).toBe('DEBIT');
    expect(gstEntry.amount).toBe(1800);
    expect(apEntry.entryType).toBe('CREDIT');
    expect(apEntry.amount).toBe(11800);
    const totalDr = entries.filter(e => e.entryType === 'DEBIT').reduce((s, e) => s + e.amount, 0);
    const totalCr = entries.filter(e => e.entryType === 'CREDIT').reduce((s, e) => s + e.amount, 0);
    expect(totalDr).toBe(totalCr);
  });

  it('TC-2 sets FT.transactionDate to invoiceDate; Dr Inventory / Cr vendor unchanged', async () => {
    const invoiceDate = new Date('2026-07-15T00:00:00.000Z');
    await postVendorInvoice(tx, {
      vendorInvoiceId: 10,
      invoiceNumber: 'VINV-2026-0001',
      subtotal: 5000,
      taxAmount: 0,
      totalAmount: 5000,
      vendor,
      transactionDate: invoiceDate,
    }, USER_ID);
    const call = tx.financialTransaction.create.mock.calls[0][0];
    expect(call.data.transactionDate).toEqual(invoiceDate);
    const entries = call.data.entries.create;
    expect(entries).toHaveLength(2);
    expect(entries.find((e) => e.entryType === 'DEBIT').ledgerId).toBe(60);
    expect(entries.find((e) => e.entryType === 'CREDIT').ledgerId).toBe(40);
  });
});

// ── postVendorPayment ─────────────────────────────────────────────────────────

describe('postVendorPayment()', () => {
  let tx;
  const apLedger   = makeLedger({ id: 40, ledgerCode: 'AC-2001-V1', ledgerType: 'LIABILITY', currentBalance: 8000 });
  const bankLedger = makeLedger({ id: 5,  ledgerType: 'ASSET',   currentBalance: 10000, ledgerName: 'HDFC Bank' });
  const vendor = { id: 1, code: 'VEND-001', ledgerId: 40 };

  beforeEach(() => {
    vi.clearAllMocks();
    tx = makeTx();
    prisma.financialTransaction.findFirst.mockResolvedValue(null);
    tx.financialTransaction.findFirst.mockResolvedValue(null);

    tx.ledger.findFirst.mockImplementation(({ where: { ledgerCode } }) =>
      ledgerCode === 'AC-2001' ? Promise.resolve(apLedger) : Promise.resolve(null)
    );
    tx.ledger.findUnique.mockImplementation(({ where: { id } }) => {
      if (id === 5)  return Promise.resolve(bankLedger);
      if (id === 40) return Promise.resolve(apLedger);
      return Promise.resolve(null);
    });
    tx.financialTransaction.create.mockImplementation(({ data }) => Promise.resolve({
      id: 4, transactionNumber: `TXN-${YEAR}-00001`, totalAmount: data.totalAmount,
      entries: data.entries.create.map((e, i) => ({ ...e, id: i + 1 })),
    }));
  });

  it('creates PAYMENT transaction Dr AP, Cr Bank', async () => {
    await postVendorPayment(tx, { voucherId: 1, voucherNumber: 'VPV-001', totalAmount: 5000, bankLedgerId: 5, vendor }, USER_ID);
    const call = tx.financialTransaction.create.mock.calls[0][0];
    expect(call.data.transactionType).toBe('PAYMENT');
    const entries = call.data.entries.create;
    const dr = entries.find(e => e.entryType === 'DEBIT');
    const cr = entries.find(e => e.entryType === 'CREDIT');
    expect(dr.ledgerId).toBe(40); // AP
    expect(cr.ledgerId).toBe(5);  // Bank
  });

  it('TC-3 sets FT.transactionDate to paymentDate', async () => {
    const paymentDate = new Date('2026-07-22T00:00:00.000Z');
    await postVendorPayment(tx, {
      voucherId: 1,
      voucherNumber: 'VPV-001',
      totalAmount: 5000,
      bankLedgerId: 5,
      vendor,
      transactionDate: paymentDate,
    }, USER_ID);
    const call = tx.financialTransaction.create.mock.calls[0][0];
    expect(call.data.transactionDate).toEqual(paymentDate);
  });

  it('throws if bankLedgerId not found', async () => {
    tx.ledger.findUnique.mockImplementation(({ where: { id } }) => {
      if (id === 40) return Promise.resolve(apLedger);
      return Promise.resolve(null);
    });
    await expect(postVendorPayment(tx, { voucherId: 1, voucherNumber: 'VPV-001', totalAmount: 5000, bankLedgerId: 999, vendor }, USER_ID))
      .rejects.toThrow('Selected bank/cash ledger not found');
  });
});

// ── postCustomerPaymentReceipt ────────────────────────────────────────────────

describe('postCustomerPaymentReceipt()', () => {
  let tx;
  const bankLedger = makeLedger({ id: 5, ledgerType: 'ASSET', currentBalance: 10000, ledgerName: 'HDFC Bank' });
  const arLedger = makeLedger({ id: 10, ledgerCode: 'AC-1003-C1', ledgerType: 'ASSET', currentBalance: 5000 });
  const customer = { id: 1, code: 'CUST-001', ledgerId: 10 };

  beforeEach(() => {
    vi.clearAllMocks();
    tx = makeTx();
    prisma.financialTransaction.findFirst.mockResolvedValue(null);
    tx.financialTransaction.findFirst.mockResolvedValue(null);
    tx.ledger.findUnique.mockImplementation(({ where: { id } }) => {
      if (id === 5) return Promise.resolve(bankLedger);
      if (id === 10) return Promise.resolve(arLedger);
      return Promise.resolve(null);
    });
    tx.financialTransaction.create.mockImplementation(({ data }) => Promise.resolve({
      id: 9, transactionNumber: `TXN-${YEAR}-00001`, totalAmount: data.totalAmount,
      entries: data.entries.create.map((e, i) => ({ ...e, id: i + 1 })),
    }));
  });

  it('TC-5 sets FT.transactionDate to paymentDate', async () => {
    const paymentDate = new Date('2026-08-03T00:00:00.000Z');
    await postCustomerPaymentReceipt(tx, {
      voucherId: 1,
      receiptNumber: 'CRV-001',
      totalAmount: 2500,
      bankLedgerId: 5,
      customer,
      transactionDate: paymentDate,
    }, USER_ID);
    const call = tx.financialTransaction.create.mock.calls[0][0];
    expect(call.data.transactionDate).toEqual(paymentDate);
    expect(call.data.transactionType).toBe('RECEIPT');
  });
});

// ── postExpense ───────────────────────────────────────────────────────────────

describe('postExpense()', () => {
  let tx;
  const expLedger  = makeLedger({ id: 50, ledgerType: 'EXPENSE', currentBalance: 0, ledgerName: 'Office Rent' });
  const bankLedger = makeLedger({ id: 5,  ledgerType: 'ASSET',   currentBalance: 10000, ledgerName: 'HDFC Bank' });

  beforeEach(() => {
    vi.clearAllMocks();
    tx = makeTx();
    prisma.financialTransaction.findFirst.mockResolvedValue(null);
    tx.financialTransaction.findFirst.mockResolvedValue(null);

    tx.ledger.findUnique.mockImplementation(({ where: { id } }) => {
      if (id === 50) return Promise.resolve(expLedger);
      if (id === 5)  return Promise.resolve(bankLedger);
      return Promise.resolve(null);
    });
    tx.financialTransaction.create.mockImplementation(({ data }) => Promise.resolve({
      id: 5, transactionNumber: `TXN-${YEAR}-00001`, totalAmount: data.totalAmount,
      entries: data.entries.create.map((e, i) => ({ ...e, id: i + 1 })),
    }));
  });

  it('creates JOURNAL transaction Dr Expense, Cr Bank', async () => {
    await postExpense(tx, { expenseId: 1, expenseNumber: 'EXP-001', amount: 2000, categoryLedgerId: 50, bankLedgerId: 5, description: 'Office Rent' }, USER_ID);
    const call = tx.financialTransaction.create.mock.calls[0][0];
    expect(call.data.transactionType).toBe('JOURNAL');
    const entries = call.data.entries.create;
    const dr = entries.find(e => e.entryType === 'DEBIT');
    const cr = entries.find(e => e.entryType === 'CREDIT');
    expect(dr.ledgerId).toBe(50);
    expect(cr.ledgerId).toBe(5);
    expect(dr.amount).toBe(2000);
  });

  it('passes transactionDate through to the financial transaction', async () => {
    const when = new Date('2026-09-01T00:00:00.000Z');
    await postExpense(tx, {
      expenseId: 1,
      expenseNumber: 'EXP-001',
      amount: 2000,
      categoryLedgerId: 50,
      bankLedgerId: 5,
      description: 'Office Rent',
      transactionDate: when,
    }, USER_ID);
    const call = tx.financialTransaction.create.mock.calls[0][0];
    expect(call.data.transactionDate).toEqual(when);
  });

  it('throws if expense category ledger not found', async () => {
    tx.ledger.findUnique.mockResolvedValue(null);
    await expect(postExpense(tx, { expenseId: 1, expenseNumber: 'EXP-001', amount: 2000, categoryLedgerId: 999, bankLedgerId: 5 }, USER_ID))
      .rejects.toThrow('Expense category ledger not found');
  });
});

// ── postIncome ────────────────────────────────────────────────────────────────

describe('postIncome()', () => {
  let tx;
  const capitalLedger = makeLedger({
    id: 80,
    ledgerCode: 'AC-5001',
    ledgerType: 'LIABILITY',
    ledgerName: "Owner's Capital",
    accountGroup: { groupCode: 'GRP-CAPITAL' },
  });
  const loansLedger = makeLedger({
    id: 81,
    ledgerCode: 'AC-2004',
    ledgerType: 'LIABILITY',
    ledgerName: 'Loans Payable',
    accountGroup: { groupCode: 'GRP-LOANS' },
  });
  const bankLedger = makeLedger({
    id: 5,
    ledgerCode: 'AC-1002',
    ledgerType: 'ASSET',
    ledgerName: 'HDFC Bank',
    accountGroup: { groupCode: 'GRP-BANK' },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    tx = makeTx();
    prisma.financialTransaction.findFirst.mockResolvedValue(null);
    tx.financialTransaction.findFirst.mockResolvedValue(null);
    tx.financialTransaction.create.mockImplementation(({ data }) => Promise.resolve({
      id: 7,
      transactionNumber: `TXN-${YEAR}-00001`,
      totalAmount: data.totalAmount,
      entries: data.entries.create.map((e, i) => ({ ...e, id: i + 1 })),
    }));
    tx.ledger.findUnique.mockImplementation(({ where: { id } }) => {
      if (id === 80) return Promise.resolve(capitalLedger);
      if (id === 81) return Promise.resolve(loansLedger);
      if (id === 5) return Promise.resolve(bankLedger);
      return Promise.resolve(null);
    });
  });

  it('posts Dr To (bank) / Cr From (capital) with incomeDate as transactionDate', async () => {
    const when = new Date('2026-08-15T00:00:00.000Z');
    await postIncome(tx, {
      incomeId: 1,
      incomeNumber: 'INC-001',
      amount: 10000,
      fromLedgerId: 80,
      toLedgerId: 5,
      description: 'Owner capital in',
      transactionDate: when,
      fromKind: 'CAPITAL',
    }, USER_ID);
    const call = tx.financialTransaction.create.mock.calls[0][0];
    expect(call.data.transactionDate).toEqual(when);
    const dr = call.data.entries.create.find((e) => e.entryType === 'DEBIT');
    const cr = call.data.entries.create.find((e) => e.entryType === 'CREDIT');
    expect(dr.ledgerId).toBe(5);
    expect(cr.ledgerId).toBe(80);
  });

  it('posts loan From GRP-LOANS to Cash/Bank', async () => {
    await postIncome(tx, {
      incomeId: 2,
      incomeNumber: 'INC-002',
      amount: 5000,
      fromLedgerId: 81,
      toLedgerId: 5,
      fromKind: 'LOANS',
    }, USER_ID);
    const call = tx.financialTransaction.create.mock.calls[0][0];
    const cr = call.data.entries.create.find((e) => e.entryType === 'CREDIT');
    expect(cr.ledgerId).toBe(81);
  });

  it('rejects Capital From when recording a loan', async () => {
    await expect(postIncome(tx, {
      incomeId: 3,
      incomeNumber: 'INC-003',
      amount: 5000,
      fromLedgerId: 80,
      toLedgerId: 5,
      fromKind: 'LOANS',
    }, USER_ID)).rejects.toThrow('From ledger must be under Loans');
  });
});

// ── postReversingTransaction ──────────────────────────────────────────────────

describe('postReversingTransaction()', () => {
  let tx;

  beforeEach(() => {
    vi.clearAllMocks();
    tx = makeTx();
    prisma.financialTransaction.findFirst.mockResolvedValue(null);
    tx.financialTransaction.findFirst.mockResolvedValue(null);

    tx.ledger.findUnique.mockImplementation(({ where: { id } }) =>
      Promise.resolve(makeLedger({ id, ledgerType: 'ASSET', currentBalance: 5000 }))
    );
    tx.financialTransaction.create.mockImplementation(({ data }) => Promise.resolve({
      id: 99, transactionNumber: `TXN-${YEAR}-00002`, totalAmount: data.totalAmount,
      entries: data.entries.create.map((e, i) => ({ ...e, id: i + 100 })),
    }));
  });

  it('throws if original transaction not found', async () => {
    tx.financialTransaction.findUnique.mockResolvedValue(null);
    await expect(postReversingTransaction(tx, 999, USER_ID, 'cancel'))
      .rejects.toThrow('Original transaction not found');
  });

  it('swaps DEBIT↔CREDIT entries in the reversal', async () => {
    tx.financialTransaction.findUnique.mockResolvedValue({
      id: 1,
      transactionNumber: `TXN-${YEAR}-00001`,
      transactionType: 'SALE',
      referenceType: 'INVOICE',
      referenceId: 1,
      referenceNumber: 'INV-001',
      entries: [
        { id: 1, ledgerId: 10, entryType: 'DEBIT',  amount: 5000, description: 'Dr AR' },
        { id: 2, ledgerId: 20, entryType: 'CREDIT', amount: 5000, description: 'Cr Sales' },
      ],
    });

    await postReversingTransaction(tx, 1, USER_ID, 'Invoice cancelled');
    const call = tx.financialTransaction.create.mock.calls[0][0];
    const entries = call.data.entries.create;
    // Original DEBIT → reversal CREDIT
    expect(entries.find(e => e.ledgerId === 10).entryType).toBe('CREDIT');
    // Original CREDIT → reversal DEBIT
    expect(entries.find(e => e.ledgerId === 20).entryType).toBe('DEBIT');
  });
});
