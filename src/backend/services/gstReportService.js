import prisma from '../config/prisma.js';

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

    const [company, invoices, vendorInvoices, legacyVouchers] = await Promise.all([
      prisma.companySettings.findFirst(),
      prisma.invoice.findMany({
        where: { deleteStatus: false, status: { not: 'DRAFT' }, ...(filter && { createdAt: filter }) },
        select: { taxAmount: true },
      }),
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
    ]);

    const outputGst = round2(invoices.reduce((s, i) => s + (parseFloat(i.taxAmount) || 0), 0));
    const inputGstFromInvoices = round2(vendorInvoices.reduce((s, v) => s + (parseFloat(v.taxAmount) || 0), 0));
    // Only count legacy vouchers with no vendorInvoiceId allocation (avoid double-counting M5 invoice-first payments).
    const inputGstFromLegacyVouchers = round2(
      legacyVouchers
        .filter((v) => !v.items.some((i) => i.vendorInvoiceId))
        .reduce((s, v) => s + (parseFloat(v.taxAmount) || 0), 0)
    );
    const inputGst = round2(inputGstFromInvoices + inputGstFromLegacyVouchers);
    const netPayable = round2(outputGst - inputGst);

    const companyState = company?.state || null;

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
    };
  }
}

export default new GstReportService();
