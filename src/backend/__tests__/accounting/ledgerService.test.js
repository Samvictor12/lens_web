/**
 * Unit tests — LedgerService
 * Tests ledger CRUD, code generation, and guard conditions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/prisma.js', () => ({
  default: {
    ledger: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    transactionEntry: { count: vi.fn() },
  },
}));

import prisma from '../../config/prisma.js';
import { LedgerService } from '../../services/ledgerService.js';

const svc = new LedgerService();
const USER_ID = 1;

function makeLedger(partial = {}) {
  return {
    id: 1,
    ledgerCode: 'AC-1001',
    ledgerName: 'Cash',
    ledgerType: 'ASSET',
    currentBalance: 0,
    openingBalance: 0,
    isSystemLedger: false,
    delete_status: false,
    active_status: true,
    parentLedgerId: null,
    ...partial,
  };
}

beforeEach(() => vi.clearAllMocks());

// ── generateLedgerCode ────────────────────────────────────────────────────────

describe('generateLedgerCode()', () => {
  // Algorithm: next = parseInt(prefix.slice('AC-')++'00') + 1 when no existing code
  // ASSET prefix 'AC-1' → parseInt('100')+1 = 101 → 'AC-1101'
  it('returns AC-1101 for ASSET when no ledger exists', async () => {
    prisma.ledger.findFirst.mockResolvedValue(null);
    const code = await svc.generateLedgerCode('ASSET');
    expect(code).toBe('AC-1101');
  });

  it('increments from last 3 numeric digits of existing code', async () => {
    prisma.ledger.findFirst.mockResolvedValue({ ledgerCode: 'AC-2005' });
    const code = await svc.generateLedgerCode('LIABILITY');
    // slice(-3) of '2005' = '005' → parseInt = 5 → +1 = 6 → padStart(3) = '006'
    expect(code).toBe('AC-2006');
  });

  it('returns AC-3301 for INCOME when no ledger exists', async () => {
    prisma.ledger.findFirst.mockResolvedValue(null);
    const code = await svc.generateLedgerCode('INCOME');
    expect(code).toBe('AC-3301');
  });

  it('returns AC-4401 for EXPENSE when no ledger exists', async () => {
    prisma.ledger.findFirst.mockResolvedValue(null);
    const code = await svc.generateLedgerCode('EXPENSE');
    expect(code).toBe('AC-4401');
  });

  it('returns AC-5501 for EQUITY when no ledger exists', async () => {
    prisma.ledger.findFirst.mockResolvedValue(null);
    const code = await svc.generateLedgerCode('EQUITY');
    expect(code).toBe('AC-5501');
  });
});

// ── list ──────────────────────────────────────────────────────────────────────

describe('list()', () => {
  it('returns paginated ledger list', async () => {
    const ledgers = [makeLedger({ id: 1 }), makeLedger({ id: 2 })];
    prisma.ledger.findMany.mockResolvedValue(ledgers);
    prisma.ledger.count.mockResolvedValue(2);

    const result = await svc.list({ page: 1, limit: 10 });
    expect(result.data).toHaveLength(2);
    expect(result.pagination.total).toBe(2);
    expect(result.pagination.totalPages).toBe(1);
  });

  it('filters by type when provided', async () => {
    prisma.ledger.findMany.mockResolvedValue([]);
    prisma.ledger.count.mockResolvedValue(0);

    await svc.list({ type: 'ASSET', page: 1, limit: 10 });
    const whereArg = prisma.ledger.findMany.mock.calls[0][0].where;
    expect(whereArg.ledgerType).toBe('ASSET');
  });

  it('filters by search term when provided', async () => {
    prisma.ledger.findMany.mockResolvedValue([]);
    prisma.ledger.count.mockResolvedValue(0);

    await svc.list({ search: 'Cash', page: 1, limit: 10 });
    const whereArg = prisma.ledger.findMany.mock.calls[0][0].where;
    expect(whereArg.ledgerName).toMatchObject({ contains: 'Cash' });
  });

  it('always filters out deleted ledgers', async () => {
    prisma.ledger.findMany.mockResolvedValue([]);
    prisma.ledger.count.mockResolvedValue(0);

    await svc.list({ page: 1, limit: 10 });
    const whereArg = prisma.ledger.findMany.mock.calls[0][0].where;
    expect(whereArg.delete_status).toBe(false);
  });
});

// ── getById ───────────────────────────────────────────────────────────────────

describe('getById()', () => {
  it('returns ledger when found', async () => {
    const ledger = makeLedger({ id: 5 });
    prisma.ledger.findFirst.mockResolvedValue(ledger);
    const result = await svc.getById(5);
    expect(result.id).toBe(5);
  });

  it('throws APIError 404 when ledger not found', async () => {
    prisma.ledger.findFirst.mockResolvedValue(null);
    await expect(svc.getById(999)).rejects.toThrow('Ledger not found');
  });
});

// ── create ────────────────────────────────────────────────────────────────────

describe('create()', () => {
  it('throws when ledgerName is missing', async () => {
    await expect(svc.create({ ledgerType: 'ASSET' }, USER_ID))
      .rejects.toThrow('ledgerName and ledgerType are required');
  });

  it('throws when ledgerType is missing', async () => {
    await expect(svc.create({ ledgerName: 'Cash' }, USER_ID))
      .rejects.toThrow('ledgerName and ledgerType are required');
  });

  it('auto-generates ledger code when not provided', async () => {
    // findFirst(1) = generateLedgerCode → null → AC-1101
    // findFirst(2) = duplicate check → null (no duplicate)
    prisma.ledger.findFirst
      .mockResolvedValueOnce(null)  // generateLedgerCode: no existing
      .mockResolvedValueOnce(null); // duplicate check: no conflict
    const created = makeLedger({ id: 10, ledgerCode: 'AC-1101' });
    prisma.ledger.create.mockResolvedValue(created);

    await svc.create({ ledgerName: 'Petty Cash', ledgerType: 'ASSET' }, USER_ID);
    const createData = prisma.ledger.create.mock.calls[0][0].data;
    expect(createData.ledgerCode).toBe('AC-1101');
    expect(createData.isSystemLedger).toBe(false);
  });

  it('uses provided ledger code when given', async () => {
    prisma.ledger.findFirst.mockResolvedValue(null); // no duplicate
    prisma.ledger.create.mockResolvedValue(makeLedger({ ledgerCode: 'CUSTOM-001' }));

    await svc.create({ ledgerName: 'Custom', ledgerType: 'ASSET', ledgerCode: 'CUSTOM-001' }, USER_ID);
    expect(prisma.ledger.create.mock.calls[0][0].data.ledgerCode).toBe('CUSTOM-001');
  });

  it('throws 409 when ledger code already exists', async () => {
    // When ledgerCode is provided explicitly, generateLedgerCode() is skipped.
    // Only one findFirst call for the duplicate check.
    prisma.ledger.findFirst.mockResolvedValueOnce(makeLedger()); // duplicate found

    await expect(svc.create({ ledgerName: 'Cash 2', ledgerType: 'ASSET', ledgerCode: 'AC-1101' }, USER_ID))
      .rejects.toThrow('already exists');
  });

  it('sets opening balance = current balance on create', async () => {
    prisma.ledger.findFirst
      .mockResolvedValueOnce(null)  // generateLedgerCode
      .mockResolvedValueOnce(null); // duplicate check
    prisma.ledger.create.mockResolvedValue(makeLedger());

    await svc.create({ ledgerName: 'Bank', ledgerType: 'ASSET', openingBalance: 5000 }, USER_ID);
    const data = prisma.ledger.create.mock.calls[0][0].data;
    expect(data.openingBalance).toBe(5000);
    expect(data.currentBalance).toBe(5000);
  });
});

// ── update ────────────────────────────────────────────────────────────────────

describe('update()', () => {
  it('throws 404 when ledger not found', async () => {
    prisma.ledger.findFirst.mockResolvedValue(null);
    await expect(svc.update(999, { ledgerName: 'New Name' }, USER_ID)).rejects.toThrow('Ledger not found');
  });

  it('updates ledger name', async () => {
    prisma.ledger.findFirst.mockResolvedValue(makeLedger({ id: 1 }));
    prisma.ledger.update.mockResolvedValue(makeLedger({ id: 1, ledgerName: 'Updated Cash' }));

    await svc.update(1, { ledgerName: 'Updated Cash' }, USER_ID);
    const updateData = prisma.ledger.update.mock.calls[0][0].data;
    expect(updateData.ledgerName).toBe('Updated Cash');
    expect(updateData.updatedBy).toBe(USER_ID);
  });

  it('does not include undefined fields in update', async () => {
    prisma.ledger.findFirst.mockResolvedValue(makeLedger({ id: 1 }));
    prisma.ledger.update.mockResolvedValue(makeLedger({ id: 1 }));

    await svc.update(1, { ledgerName: 'Cash Only' }, USER_ID);
    const updateData = prisma.ledger.update.mock.calls[0][0].data;
    expect(updateData).not.toHaveProperty('parentLedgerId');
    expect(updateData).not.toHaveProperty('description');
  });
});

// ── softDelete ────────────────────────────────────────────────────────────────

describe('softDelete()', () => {
  it('throws 404 when ledger not found', async () => {
    prisma.ledger.findFirst.mockResolvedValue(null);
    await expect(svc.softDelete(999, USER_ID)).rejects.toThrow('Ledger not found');
  });

  it('blocks deletion of system ledgers', async () => {
    prisma.ledger.findFirst.mockResolvedValue(makeLedger({ isSystemLedger: true }));
    await expect(svc.softDelete(1, USER_ID)).rejects.toThrow('System ledgers cannot be deleted');
  });

  it('blocks deletion when ledger has transaction entries', async () => {
    prisma.ledger.findFirst.mockResolvedValue(makeLedger({ isSystemLedger: false }));
    prisma.transactionEntry.count.mockResolvedValue(5);
    await expect(svc.softDelete(1, USER_ID)).rejects.toThrow('has transactions');
  });

  it('soft-deletes (sets delete_status = true) when safe', async () => {
    prisma.ledger.findFirst.mockResolvedValue(makeLedger({ id: 1, isSystemLedger: false }));
    prisma.transactionEntry.count.mockResolvedValue(0);
    prisma.ledger.update.mockResolvedValue(makeLedger({ id: 1, delete_status: true }));

    await svc.softDelete(1, USER_ID);
    expect(prisma.ledger.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { delete_status: true, updatedBy: USER_ID },
    });
  });
});

// ── getCashBankLedgers ────────────────────────────────────────────────────────

describe('getCashBankLedgers()', () => {
  it('queries only ASSET ledgers that are active and not deleted', async () => {
    prisma.ledger.findMany.mockResolvedValue([]);
    await svc.getCashBankLedgers();
    const where = prisma.ledger.findMany.mock.calls[0][0].where;
    expect(where.ledgerType).toBe('ASSET');
    expect(where.delete_status).toBe(false);
    expect(where.active_status).toBe(true);
  });

  it('returns all matching asset ledgers', async () => {
    const ledgers = [makeLedger({ id: 1 }), makeLedger({ id: 2 })];
    prisma.ledger.findMany.mockResolvedValue(ledgers);
    const result = await svc.getCashBankLedgers();
    expect(result).toHaveLength(2);
  });
});
