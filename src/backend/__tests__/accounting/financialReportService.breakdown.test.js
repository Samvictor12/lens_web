/**
 * Unit tests — financialReportService.getLedgerStatement breakdown enrichment
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/prisma.js', () => ({
  default: {
    ledger: { findFirst: vi.fn() },
    transactionEntry: { findMany: vi.fn() },
    customerPaymentVoucherItem: { findMany: vi.fn() },
    vendorPaymentVoucherItem: { findMany: vi.fn() },
    customerPaymentVoucher: { findMany: vi.fn() },
  },
}));

import prisma from '../../config/prisma.js';
import { FinancialReportService } from '../../services/financialReportService.js';

const service = new FinancialReportService();

const LEDGER = {
  id: 5,
  ledgerCode: 'AC-1002',
  ledgerName: 'HDFC Bank',
  ledgerType: 'ASSET',
  openingBalance: 0,
  delete_status: false,
};

function makeEntry(partial) {
  return {
    entryType: partial.entryType ?? 'DEBIT',
    amount: partial.amount ?? 1000,
    transaction: {
      id: partial.txnId ?? 1,
      transactionNumber: partial.txnNumber ?? 'TXN-2026-00001',
      transactionDate: new Date('2026-07-01'),
      description: partial.description ?? 'Test',
      referenceNumber: partial.referenceNumber ?? 'CRV-2026-0001',
      referenceType: partial.referenceType ?? 'RECEIPT',
      referenceId: partial.referenceId ?? 10,
      transactionType: partial.transactionType ?? 'RECEIPT',
      isReconciled: false,
    },
  };
}

describe('FinancialReportService.getLedgerStatement() breakdown', () => {
  beforeEach(() => vi.clearAllMocks());

  it('attaches customer voucher items and advance for RECEIPT + referenceType RECEIPT', async () => {
    prisma.ledger.findFirst.mockResolvedValue(LEDGER);
    prisma.transactionEntry.findMany.mockResolvedValue([
      makeEntry({ referenceType: 'RECEIPT', referenceId: 10, transactionType: 'RECEIPT' }),
    ]);
    prisma.customerPaymentVoucherItem.findMany.mockResolvedValue([
      {
        id: 1,
        voucherId: 10,
        invoiceId: 100,
        allocatedAmount: 800,
        invoice: { id: 100, invoiceNo: 'INV-001', dueDate: new Date('2026-06-01') },
      },
    ]);
    prisma.vendorPaymentVoucherItem.findMany.mockResolvedValue([]);
    prisma.customerPaymentVoucher.findMany.mockResolvedValue([
      { id: 10, receiptNumber: 'CRV-2026-0001', advanceAmount: 200 },
    ]);

    const result = await service.getLedgerStatement({ ledgerId: 5 });

    expect(result.entries).toHaveLength(1);
    const b = result.entries[0].breakdown;
    expect(b).toMatchObject({ type: 'customer', documentNumber: 'CRV-2026-0001' });
    expect(b.items).toHaveLength(1);
    expect(b.items[0].invoice.invoiceNo).toBe('INV-001');
    expect(parseFloat(b.advanceAmount)).toBe(200);
  });

  it('attaches vendor voucher items for PAYMENT transactions', async () => {
    prisma.ledger.findFirst.mockResolvedValue(LEDGER);
    prisma.transactionEntry.findMany.mockResolvedValue([
      makeEntry({
        entryType: 'CREDIT',
        referenceType: 'PURCHASE_ORDER',
        referenceId: 20,
        transactionType: 'PAYMENT',
        referenceNumber: 'VPV-2026-0001',
      }),
    ]);
    prisma.customerPaymentVoucherItem.findMany.mockResolvedValue([]);
    prisma.vendorPaymentVoucherItem.findMany.mockResolvedValue([
      {
        id: 2,
        voucherId: 20,
        purchaseOrderId: 50,
        allocatedAmount: 1000,
        purchaseOrder: { id: 50, poNumber: 'PO-001', orderDate: new Date('2026-05-01') },
      },
    ]);

    const result = await service.getLedgerStatement({ ledgerId: 5 });

    const b = result.entries[0].breakdown;
    expect(b).toMatchObject({ type: 'vendor', documentNumber: 'VPV-2026-0001' });
    expect(b.items[0].purchaseOrder.poNumber).toBe('PO-001');
  });

  it('builds single-line breakdown for legacy RECEIPT + referenceType INVOICE', async () => {
    prisma.ledger.findFirst.mockResolvedValue(LEDGER);
    prisma.transactionEntry.findMany.mockResolvedValue([
      makeEntry({
        referenceType: 'INVOICE',
        referenceId: 100,
        transactionType: 'RECEIPT',
        referenceNumber: 'INV-LEG-001',
      }),
    ]);
    prisma.customerPaymentVoucherItem.findMany.mockResolvedValue([]);
    prisma.vendorPaymentVoucherItem.findMany.mockResolvedValue([]);

    const result = await service.getLedgerStatement({ ledgerId: 5 });

    const b = result.entries[0].breakdown;
    expect(b.type).toBe('customer');
    expect(b.items).toHaveLength(1);
    expect(b.items[0].invoiceId).toBe(100);
    expect(b.items[0].invoice.invoiceNo).toBe('INV-LEG-001');
  });

  it('returns breakdown null for non-payment transaction types', async () => {
    prisma.ledger.findFirst.mockResolvedValue(LEDGER);
    prisma.transactionEntry.findMany.mockResolvedValue([
      makeEntry({
        transactionType: 'SALE',
        referenceType: 'INVOICE',
        referenceId: 1,
        referenceNumber: 'INV-001',
      }),
    ]);
    prisma.customerPaymentVoucherItem.findMany.mockResolvedValue([]);
    prisma.vendorPaymentVoucherItem.findMany.mockResolvedValue([]);

    const result = await service.getLedgerStatement({ ledgerId: 5 });

    expect(result.entries[0].breakdown).toBeNull();
  });
});

describe('accountingPaths', () => {
  it('builds invoice and PO detail paths', async () => {
    const { invoiceDetailPath, purchaseOrderDetailPath } = await import(
      '../../../constants/accountingPaths.js'
    );
    expect(invoiceDetailPath(42)).toBe('/billing?invoiceId=42&openDetail=1');
    expect(purchaseOrderDetailPath(7)).toBe('/masters/purchase-orders/view/7');
  });
});
