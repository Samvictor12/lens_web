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
  postClientPayment,
  postVendorPayment,
  postExpense,
  postReversingTransaction,
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
});

// ── postInvoice ───────────────────────────────────────────────────────────────

describe('postInvoice()', () => {
  let tx;

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
      };
      return Promise.resolve(map[ledgerCode] ?? null);
    });

    tx.ledger.findUnique.mockImplementation(({ where: { id } }) => {
      const map = {
        10: makeLedger({ id: 10, ledgerType: 'ASSET',     currentBalance: 0 }),
        20: makeLedger({ id: 20, ledgerType: 'INCOME',    currentBalance: 0 }),
        30: makeLedger({ id: 30, ledgerType: 'LIABILITY', currentBalance: 0 }),
      };
      return Promise.resolve(map[id] ?? null);
    });

    tx.financialTransaction.create.mockImplementation(({ data }) => Promise.resolve({
      id: 1, transactionNumber: `TXN-${YEAR}-00001`, totalAmount: data.totalAmount,
      entries: data.entries.create.map((e, i) => ({ ...e, id: i + 1 })),
    }));
  });

  it('creates SALE transaction with Dr AR, Cr Sales Revenue (no tax)', async () => {
    await postInvoice(tx, { invoiceId: 1, invoiceNo: 'INV-001', totalAmount: 5000, taxAmount: 0 }, USER_ID);
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
    await postInvoice(tx, { invoiceId: 2, invoiceNo: 'INV-002', totalAmount: 5900, taxAmount: 900 }, USER_ID);
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
});

// ── postClientPayment ─────────────────────────────────────────────────────────

describe('postClientPayment()', () => {
  let tx;
  const bankLedger = makeLedger({ id: 5, ledgerType: 'ASSET', currentBalance: 10000, ledgerName: 'HDFC Bank' });
  const arLedger   = makeLedger({ id: 10, ledgerCode: 'AC-1003', ledgerType: 'ASSET', currentBalance: 5000 });

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
    await postClientPayment(tx, { invoiceId: 1, invoiceNo: 'INV-001', amount: 3000, bankLedgerId: 5 }, USER_ID);
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
    tx.ledger.findUnique.mockResolvedValue(null);
    await expect(postClientPayment(tx, { invoiceId: 1, invoiceNo: 'INV-001', amount: 3000, bankLedgerId: 999 }, USER_ID))
      .rejects.toThrow('Selected bank/cash ledger not found');
  });
});

// ── postVendorPayment ─────────────────────────────────────────────────────────

describe('postVendorPayment()', () => {
  let tx;
  const apLedger   = makeLedger({ id: 40, ledgerCode: 'AC-2001', ledgerType: 'LIABILITY', currentBalance: 8000 });
  const bankLedger = makeLedger({ id: 5,  ledgerType: 'ASSET',   currentBalance: 10000, ledgerName: 'HDFC Bank' });

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
    await postVendorPayment(tx, { voucherId: 1, voucherNumber: 'VPV-001', totalAmount: 5000, bankLedgerId: 5 }, USER_ID);
    const call = tx.financialTransaction.create.mock.calls[0][0];
    expect(call.data.transactionType).toBe('PAYMENT');
    const entries = call.data.entries.create;
    const dr = entries.find(e => e.entryType === 'DEBIT');
    const cr = entries.find(e => e.entryType === 'CREDIT');
    expect(dr.ledgerId).toBe(40); // AP
    expect(cr.ledgerId).toBe(5);  // Bank
  });

  it('throws if bankLedgerId not found', async () => {
    tx.ledger.findUnique.mockResolvedValue(null);
    await expect(postVendorPayment(tx, { voucherId: 1, voucherNumber: 'VPV-001', totalAmount: 5000, bankLedgerId: 999 }, USER_ID))
      .rejects.toThrow('Selected bank/cash ledger not found');
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

  it('throws if expense category ledger not found', async () => {
    tx.ledger.findUnique.mockResolvedValue(null);
    await expect(postExpense(tx, { expenseId: 1, expenseNumber: 'EXP-001', amount: 2000, categoryLedgerId: 999, bankLedgerId: 5 }, USER_ID))
      .rejects.toThrow('Expense category ledger not found');
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
