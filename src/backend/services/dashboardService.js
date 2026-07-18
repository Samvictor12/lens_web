import prisma from '../config/prisma.js';

/**
 * Dashboard Service
 * Provides aggregated "today" snapshot data for the Dashboard sales widgets.
 * "Sales" = Invoice (system of record for billed revenue), not SaleOrder.
 */
export class DashboardService {

  // ──────────────────────────────────────────────────────────
  // Per-saleOrder revenue formula — copied verbatim from
  // InvoiceService.createInvoice (invoiceService.js lines 84-93)
  // ──────────────────────────────────────────────────────────
  _saleOrderRevenue(o) {
    const lensPrice = o.lensPrice || 0;
    const extras = (o.fittingPrice || 0) + (o.tintingPrice || 0)
      + (o.rightEyeExtra || 0) + (o.leftEyeExtra || 0);
    // Discount applies to lens price only — consistent with invoiceService & SaleOrderForm
    const discountAmt = lensPrice * ((o.discount || 0) / 100);
    const additional = Array.isArray(o.additionalPrice)
      ? o.additionalPrice.reduce((a, x) => a + (parseFloat(x?.value ?? x?.amount) || 0), 0)
      : 0;
    return lensPrice - discountAmt + extras + additional;
  }

  // ──────────────────────────────────────────────────────────
  // Today's sales summary: total, top 5 invoices, top product
  // ──────────────────────────────────────────────────────────
  async getTodaySummary() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const invoices = await prisma.invoice.findMany({
      where: {
        createdAt: { gte: startOfToday, lte: endOfToday },
        status: { not: 'CANCELLED' },
      },
      include: {
        customer: { select: { name: true } },
        saleOrders: {
          select: {
            lensPrice: true,
            fittingPrice: true,
            tintingPrice: true,
            rightEyeExtra: true,
            leftEyeExtra: true,
            discount: true,
            additionalPrice: true,
            lensProduct: { select: { lens_name: true } },
          },
        },
      },
    });

    const todaySales = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

    const top5Sales = [...invoices]
      .sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0))
      .slice(0, 5)
      .map((inv) => ({
        invoiceNo: inv.invoiceNo,
        customerName: inv.customer?.name || null,
        totalAmount: inv.totalAmount,
        status: inv.status,
      }));

    // Flatten all saleOrders across today's invoices, sum revenue per product
    const revenueByProduct = new Map();
    for (const inv of invoices) {
      for (const so of inv.saleOrders || []) {
        const name = so.lensProduct?.lens_name;
        if (!name) continue;
        const revenue = this._saleOrderRevenue(so);
        revenueByProduct.set(name, (revenueByProduct.get(name) || 0) + revenue);
      }
    }

    let topProduct = null;
    for (const [name, revenue] of revenueByProduct.entries()) {
      if (!topProduct || revenue > topProduct.revenue) {
        topProduct = { name, revenue };
      }
    }

    return { todaySales, top5Sales, topProduct };
  }
}
