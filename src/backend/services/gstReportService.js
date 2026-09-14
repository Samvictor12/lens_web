import prisma from '../config/prisma.js';
import {
  GST_REGISTER_HEADERS,
  defaultsFromCompanySettings,
  deriveGstRegisterRow,
} from './gstInvoiceRegister.js';

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

function monthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key) {
  const [y, m] = key.split('-');
  const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

/** Split a GST total into CGST/SGST halves when company state is configured, else return consolidated. */
function splitGst(total, companyState) {
  if (companyState) {
    const half = round2(total / 2);
    return { split: true, cgst: half, sgst: round2(total - half), total: round2(total) };
  }
  return { split: false, total: round2(total) };
}

/**
 * GST reports (M6): Monthly Sales Report (taxable sales by month) and GST Collection
 * Report (output GST collected vs input GST credit, net payable).
 */
export class GstReportService {
  async getGstInvoiceRegister({ from, to } = {}) {
    const now = new Date();
    const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const defaultTo = [
      monthEnd.getFullYear(),
      String(monthEnd.getMonth() + 1).padStart(2, '0'),
      String(monthEnd.getDate()).padStart(2, '0'),
    ].join('-');
    const fromStr = from || defaultFrom;
    const toStr = to || defaultTo;
    const filter = dateRange(fromStr, toStr);

    const company = await prisma.companySettings.findFirst();
    const ctx = defaultsFromCompanySettings(company);

    const invoices = await prisma.invoice.findMany({
      where: {
        deleteStatus: false,
        status: { notIn: ['DRAFT', 'CANCELLED'] },
        OR: [
          { billDate: filter },
          { AND: [{ billDate: null }, { createdAt: filter }] },
        ],
      },
      select: {
        id: true,
        invoiceNo: true,
        billDate: true,
        createdAt: true,
        totalAmount: true,
        taxAmount: true,
        customer: { select: { name: true, gstin: true, state: true } },
        saleOrders: { select: { rightEye: true, leftEye: true } },
      },
      orderBy: [{ billDate: 'asc' }, { createdAt: 'asc' }],
    });

    const rows = invoices.map((inv, i) => deriveGstRegisterRow(inv, ctx, i + 1));
    return {
      period: { from: fromStr, to: toStr },
      headers: GST_REGISTER_HEADERS,
      companyState: ctx.companyState || null,
      rows,
    };
  }

  async getMonthlySalesReport({ from, to } = {}) {
    const filter = dateRange(from, to);
    const invoices = await prisma.invoice.findMany({
      where: {
        deleteStatus: false,
        status: { not: 'DRAFT' },
        ...(filter && { createdAt: filter }),
      },
      select: { id: true, invoiceNo: true, totalAmount: true, taxAmount: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const byMonth = new Map();
    for (const inv of invoices) {
      const key = monthKey(inv.createdAt);
      if (!byMonth.has(key)) {
        byMonth.set(key, { month: key, monthLabel: monthLabel(key), invoiceCount: 0, taxableSales: 0, gstAmount: 0, totalSales: 0 });
      }
      const row = byMonth.get(key);
      const total = parseFloat(inv.totalAmount) || 0;
      const tax = parseFloat(inv.taxAmount) || 0;
      row.invoiceCount += 1;
      row.taxableSales = round2(row.taxableSales + (total - tax));
      row.gstAmount = round2(row.gstAmount + tax);
      row.totalSales = round2(row.totalSales + total);
    }

    const rows = Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month));
    const totals = rows.reduce(
      (acc, r) => ({
        invoiceCount: acc.invoiceCount + r.invoiceCount,
        taxableSales: round2(acc.taxableSales + r.taxableSales),
        gstAmount: round2(acc.gstAmount + r.gstAmount),
        totalSales: round2(acc.totalSales + r.totalSales),
      }),
      { invoiceCount: 0, taxableSales: 0, gstAmount: 0, totalSales: 0 }
    );

    return { period: { from: from || null, to: to || null }, rows, totals };
  }

  async getGstCollectionReport({ from, to } = {}) {
    const filter = dateRange(from, to);

    const company = await prisma.companySettings.findFirst();
    const companyState = company?.state || null;

    const [vendorInvoices, legacyVouchers, outputGstTransactions] = await Promise.all([
      // New (M5) invoice-first flow — canonical input GST source.
      prisma.vendorInvoice.findMany({
        where: { deleteStatus: false, status: { not: 'CANCELLED' }, ...(filter && { invoiceDate: filter }) },
        select: { taxAmount: true },
      }),
      // Legacy pre-M5 vouchers that captured PO invoice GST directly at payment time.
      prisma.vendorPaymentVoucher.findMany({
        where: { delete_status: false, ...(filter && { paymentDate: filter }) },
        select: { taxAmount: true, items: { select: { vendorInvoiceId: true } } },
      }),
      this._getOutputGstTransactions(filter, companyState),
    ]);

    const outputGst = round2(outputGstTransactions.reduce((s, t) => s + t.gstAmount, 0));
    const inputGstFromInvoices = round2(vendorInvoices.reduce((s, v) => s + (parseFloat(v.taxAmount) || 0), 0));
    // Only count legacy vouchers with no vendorInvoiceId allocation (avoid double-counting M5 invoice-first payments).
    const inputGstFromLegacyVouchers = round2(
      legacyVouchers
        .filter((v) => !v.items.some((i) => i.vendorInvoiceId))
        .reduce((s, v) => s + (parseFloat(v.taxAmount) || 0), 0)
    );
    const inputGst = round2(inputGstFromInvoices + inputGstFromLegacyVouchers);
    const netPayable = round2(outputGst - inputGst);

    return {
      period: { from: from || null, to: to || null },
      companyState,
      output: splitGst(outputGst, companyState),
      input: splitGst(inputGst, companyState),
      netPayable: {
        ...splitGst(Math.abs(netPayable), companyState),
        total: netPayable,
        direction: netPayable >= 0 ? 'PAYABLE' : 'REFUNDABLE',
      },
      outputGstTransactions,
      // Back-compat alias for older clients
      outputInvoices: outputGstTransactions,
    };
  }

  async _getOutputGstTransactions(filter, companyState) {
    const gstOutputLedger = await prisma.ledger.findFirst({ where: { ledgerCode: 'AC-2003' } });
    if (!gstOutputLedger) return [];

    const entries = await prisma.transactionEntry.findMany({
      where: {
        ledgerId: gstOutputLedger.id,
        ...(filter
          ? { transaction: { transactionDate: filter, isPosted: true } }
          : { transaction: { isPosted: true } }),
      },
      select: {
        id: true,
        entryType: true,
        amount: true,
        description: true,
        transaction: {
          select: {
            id: true,
            transactionDate: true,
            referenceType: true,
            referenceId: true,
            referenceNumber: true,
            description: true,
          },
        },
      },
      orderBy: { transaction: { transactionDate: 'asc' } },
    });

    const invoiceIds = [
      ...new Set(
        entries
          .filter((e) => e.transaction.referenceType === 'INVOICE' && e.transaction.referenceId)
          .map((e) => e.transaction.referenceId)
      ),
    ];

    const invoices = invoiceIds.length
      ? await prisma.invoice.findMany({
          where: { id: { in: invoiceIds } },
          select: { id: true, invoiceNo: true, customer: { select: { name: true } } },
        })
      : [];
    const invoiceById = Object.fromEntries(invoices.map((i) => [i.id, i]));

    return entries
      .map((e) => {
        const raw = parseFloat(e.amount) || 0;
        if (raw <= 0) return null;

        const signedGst = round2(e.entryType === 'CREDIT' ? raw : -raw);
        const absGst = Math.abs(signedGst);
        const split = companyState ? splitGst(absGst, companyState) : null;
        const inv =
          e.transaction.referenceType === 'INVOICE' ? invoiceById[e.transaction.referenceId] : null;

        return {
          transactionId: e.transaction.id,
          entryId: e.id,
          transactionDate: e.transaction.transactionDate,
          referenceType: e.transaction.referenceType,
          referenceNumber: inv?.invoiceNo || e.transaction.referenceNumber || null,
          partyName: inv?.customer?.name || null,
          description: e.description || e.transaction.description || null,
          entryType: e.entryType,
          gstAmount: signedGst,
          ...(split?.split && {
            cgst: round2(e.entryType === 'CREDIT' ? split.cgst : -split.cgst),
            sgst: round2(e.entryType === 'CREDIT' ? split.sgst : -split.sgst),
          }),
        };
      })
      .filter(Boolean);
  }
}

export default new GstReportService();
