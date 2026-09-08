/**
 * TC-4 — Invoice.billDate persistence and dueDate default from billDate + credit_days.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/prisma.js', () => ({
  default: {
    $transaction: vi.fn(),
    invoice: { findUnique: vi.fn(), findFirst: vi.fn() },
    companySettings: { findFirst: vi.fn() },
    customer: { findUnique: vi.fn() },
  },
}));

vi.mock('../../services/accountingService.js', () => ({
  postInvoice: vi.fn(),
  reverseInvoice: vi.fn(),
}));

vi.mock('../../utils/auditLogger.js', () => ({
  logCreate: vi.fn().mockResolvedValue(undefined),
  logUpdate: vi.fn().mockResolvedValue(undefined),
  logDelete: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../utils/errorLogger.js', () => ({
  logDatabaseError: vi.fn().mockResolvedValue(undefined),
  logNotFoundError: vi.fn().mockResolvedValue(undefined),
  logBusinessError: vi.fn().mockResolvedValue(undefined),
}));

import prisma from '../../config/prisma.js';
import { InvoiceService, resolveInvoiceBillDate, resolveInvoiceDueDate } from '../../services/invoiceService.js';

const service = new InvoiceService();
const USER_ID = 1;

describe('resolveInvoiceBillDate / resolveInvoiceDueDate (TC-4)', () => {
  it('defaults billDate to today when omitted', () => {
    const result = resolveInvoiceBillDate();
    const now = new Date();
    expect(result.getFullYear()).toBe(now.getFullYear());
    expect(result.getMonth()).toBe(now.getMonth());
    expect(result.getDate()).toBe(now.getDate());
  });

  it('parses YYYY-MM-DD billDate', () => {
    const result = resolveInvoiceBillDate('2026-08-20');
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(7);
    expect(result.getDate()).toBe(20);
  });

  it('defaults dueDate to billDate + credit_days when omitted', () => {
    const bill = resolveInvoiceBillDate('2026-08-20');
    const due = resolveInvoiceDueDate(undefined, bill, 10);
    expect(due.getFullYear()).toBe(2026);
    expect(due.getMonth()).toBe(7);
    expect(due.getDate()).toBe(30);
  });
});

describe('InvoiceService.createInvoice billDate (TC-4)', () => {
  let tx;

  beforeEach(() => {
    vi.clearAllMocks();
    tx = {
      saleOrder: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 11,
            orderNo: 'SO-1',
            status: 'DELIVERED',
            customerId: 3,
            invoiceId: null,
            invoice: null,
            lensPrice: 1000,
            fittingPrice: 0,
            tintingPrice: 0,
            rightEyeExtra: 0,
            leftEyeExtra: 0,
            discount: 0,
            additionalPrice: [],
          },
        ]),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      customer: {
        findUnique: vi.fn().mockResolvedValue({ id: 3, code: 'C1', ledgerId: 10, credit_days: 7 }),
        update: vi.fn().mockResolvedValue({}),
      },
      companySettings: { findFirst: vi.fn().mockResolvedValue({ customAttributes: {} }) },
      invoice: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 50, invoiceNo: 'INV-2026-0001' }),
      },
    };
    prisma.$transaction.mockImplementation(async (fn) => fn(tx));
    prisma.invoice.findUnique.mockResolvedValue({
      id: 50,
      invoiceNo: 'INV-2026-0001',
      billDate: new Date('2026-08-20T12:00:00'),
      dueDate: new Date('2026-08-27T12:00:00'),
      deleteStatus: false,
      customer: { id: 3, credit_days: 7 },
      saleOrders: [],
      payments: [],
    });
    prisma.companySettings.findFirst.mockResolvedValue(null);
  });

  it('persists supplied billDate and dueDate = billDate + credit_days when dueDate omitted', async () => {
    await service.createInvoice({ saleOrderIds: [11], billDate: '2026-08-20' }, USER_ID);
    expect(tx.invoice.create).toHaveBeenCalledOnce();
    const data = tx.invoice.create.mock.calls[0][0].data;
    expect(data.billDate.getFullYear()).toBe(2026);
    expect(data.billDate.getMonth()).toBe(7);
    expect(data.billDate.getDate()).toBe(20);
    expect(data.dueDate.getFullYear()).toBe(2026);
    expect(data.dueDate.getMonth()).toBe(7);
    expect(data.dueDate.getDate()).toBe(27);
  });
});
