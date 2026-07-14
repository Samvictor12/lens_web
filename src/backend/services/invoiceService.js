import prisma from '../config/prisma.js';
import { APIError } from '../middleware/errorHandler.js';
import { logCreate, logUpdate, logDelete } from '../utils/auditLogger.js';
import { logDatabaseError, logNotFoundError, logBusinessError } from '../utils/errorLogger.js';
import { postInvoice, reverseInvoice } from './accountingService.js';

/**
 * Invoice Service
 * Handles business logic for combining delivered sale orders into invoices/bills.
 *
 * Flow:
 *   SaleOrder(DELIVERED) ─── grouped into ──► Invoice(DRAFT → ISSUED → PARTIALLY_PAID → PAID)
 *                                                              │
 *                                                              ▼
 *                                                    SaleOrder(BILLED)  ← final state
 */
export class InvoiceService {

  // ──────────────────────────────────────────────────────────
  // Auto-number generation
  // ──────────────────────────────────────────────────────────
  async generateInvoiceNo(db = prisma) {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    const last = await db.invoice.findFirst({
      where: { invoiceNo: { startsWith: prefix } },
      orderBy: { invoiceNo: 'desc' },
    });
    const next = last ? parseInt(last.invoiceNo.split('-')[2]) + 1 : 1;
    return `${prefix}${String(next).padStart(4, '0')}`;
  }

  // ──────────────────────────────────────────────────────────
  // Create invoice from delivered sale orders
  // ──────────────────────────────────────────────────────────
  async createInvoice({ saleOrderIds, dueDate, notes }, userId, req = null) {
    try {
      if (!saleOrderIds?.length) {
        throw new APIError('At least one sale order is required', 400, 'NO_ORDERS');
      }

      const uniqueIds = [...new Set(saleOrderIds.map(Number))];
      const taxAmount = parseFloat(req?.body?.taxAmount || 0);

      // All validation + writes happen in one transaction so a concurrent/duplicate
      // create cannot commit an invoice and then return ALREADY_INVOICED (or leave orphans).
      const invoice = await prisma.$transaction(async (tx) => {
        const orders = await tx.saleOrder.findMany({
          where: { id: { in: uniqueIds }, deleteStatus: false },
          include: {
            customer: { select: { id: true, name: true, code: true } },
            invoice: { select: { status: true } },
          },
        });

        if (orders.length !== uniqueIds.length) {
          throw new APIError('One or more sale orders not found', 404, 'ORDERS_NOT_FOUND');
        }

        const nonDelivered = orders.filter((o) => o.status !== 'DELIVERED');
        if (nonDelivered.length) {
          throw new APIError(
            `Sale orders must be DELIVERED before billing. Not ready: ${nonDelivered.map((o) => `${o.orderNo} (${o.status})`).join(', ')}`,
            400,
            'ORDERS_NOT_DELIVERED'
          );
        }

        const customerIds = [...new Set(orders.map((o) => o.customerId))];
        if (customerIds.length > 1) {
          throw new APIError(
            'All sale orders in an invoice must belong to the same customer',
            400,
            'MULTIPLE_CUSTOMERS'
          );
        }

        const alreadyBilled = orders.filter(
          (o) => o.invoiceId !== null && o.invoice?.status !== 'CANCELLED'
        );
        if (alreadyBilled.length) {
          throw new APIError(
            `Some orders are already on an invoice: ${alreadyBilled.map((o) => o.orderNo).join(', ')}`,
            400,
            'ALREADY_INVOICED'
          );
        }

        const customerId = customerIds[0];
        const customer = await tx.customer.findUnique({
          where: { id: customerId },
          select: { id: true, code: true, ledgerId: true, credit_days: true },
        });
        if (!customer) throw new APIError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');

        const totalAmount = orders.reduce((sum, o) => {
          const lensPrice = o.lensPrice || 0;
          const extras = (o.fittingPrice || 0) + (o.tintingPrice || 0)
            + (o.rightEyeExtra || 0) + (o.leftEyeExtra || 0);
          const discountAmt = lensPrice * ((o.discount || 0) / 100);
          const additional = Array.isArray(o.additionalPrice)
            ? o.additionalPrice.reduce((a, x) => a + (x.amount || 0), 0)
            : 0;
          return sum + (lensPrice - discountAmt + extras + additional);
        }, 0);

        const invoicedTotal = Math.round(totalAmount * 100) / 100;
        const invoiceNo = await this.generateInvoiceNo(tx);

        // Due date: client override, else invoiceDate + customer.credit_days (default 0)
        const invoiceDate = new Date();
        let resolvedDueDate;
        if (dueDate !== undefined && dueDate !== null && String(dueDate).trim() !== '') {
          resolvedDueDate = new Date(dueDate);
        } else {
          const creditDays = customer.credit_days ?? 0;
          resolvedDueDate = new Date(invoiceDate);
          resolvedDueDate.setDate(resolvedDueDate.getDate() + (Number.isFinite(creditDays) ? creditDays : 0));
        }

        const created = await tx.invoice.create({
          data: {
            invoiceNo,
            customerId,
            totalAmount: invoicedTotal,
            taxAmount,
            paidAmount: 0,
            dueDate: resolvedDueDate,
            status: 'DRAFT',
            notes: notes || null,
            createdBy: userId,
            updatedBy: userId,
          },
        });

        // Only claim orders that are still unbilled / on a cancelled invoice.
        // If another request already claimed them, count < expected → rollback this invoice.
        const linked = await tx.saleOrder.updateMany({
          where: {
            id: { in: uniqueIds },
            deleteStatus: false,
            OR: [
              { invoiceId: null },
              { invoice: { status: 'CANCELLED' } },
            ],
          },
          data: { invoiceId: created.id, updatedBy: userId },
        });

        if (linked.count !== uniqueIds.length) {
          throw new APIError(
            `Some orders are already on an invoice: ${orders.map((o) => o.orderNo).join(', ')}`,
            400,
            'ALREADY_INVOICED'
          );
        }

        await tx.customer.update({
          where: { id: customerId },
          data: {
            reserved_amount: { decrement: invoicedTotal },
            outstanding_credit: { increment: invoicedTotal },
          },
        });

        return { created, invoiceNo, customerId, totalAmount: invoicedTotal };
      });

      await logCreate({
        userId,
        entity: 'Invoice',
        entityId: invoice.created.id,
        newValues: { invoiceNo: invoice.invoiceNo, customerId: invoice.customerId, totalAmount: invoice.totalAmount, saleOrderIds: uniqueIds },
        req,
        metadata: { operation: 'createInvoice' },
      }).catch(() => {});

      return this.getInvoiceById(invoice.created.id);
    } catch (error) {
      if (error instanceof APIError) throw error;
      await logDatabaseError({ error, userId, req, metadata: { operation: 'createInvoice' } }).catch(() => {});
      throw new APIError('Failed to create invoice', 500, 'CREATE_INVOICE_ERROR');
    }
  }

  // ──────────────────────────────────────────────────────────
  // Get single invoice by ID
  // ──────────────────────────────────────────────────────────
  async getInvoiceById(id) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true, code: true, name: true, shopname: true, phone: true,
            address: true, city: true, state: true, pincode: true, gstin: true,
            credit_days: true, credit_limit: true,
          },
        },
        saleOrders: {
          where: { deleteStatus: false },
          select: {
            id: true, orderNo: true, status: true, orderDate: true, customerRefNo: true,
            rightEye: true, leftEye: true,
            rightSpherical: true, rightCylindrical: true, rightAxis: true, rightAdd: true, rightDia: true,
            leftSpherical: true, leftCylindrical: true, leftAxis: true, leftAdd: true, leftDia: true,
            lensPrice: true, fittingPrice: true, tintingPrice: true,
            rightEyeExtra: true, leftEyeExtra: true, discount: true, additionalPrice: true,
            lensProduct: { select: { lens_name: true } },
            coating: { select: { name: true } },
            category: { select: { name: true } },
            fitting: { select: { name: true } },
            tinting: { select: { name: true } },
            dia: { select: { name: true } },
          },
        },
        payments: { orderBy: { createdAt: 'asc' } },
        createdByUser: { select: { id: true, name: true } },
        updatedByUser: { select: { id: true, name: true } },
      },
    });

    if (!invoice || invoice.deleteStatus) {
      throw new APIError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
    }

    // Attach company settings for Tax Invoice print/preview (PAN/bank via customAttributes)
    const company = await prisma.companySettings.findFirst();
    return { ...invoice, company: company || null };
  }

  // ──────────────────────────────────────────────────────────
  // List invoices with filters + pagination
  // ──────────────────────────────────────────────────────────
  async getInvoices({ page = 1, limit = 20, customerId, status, search, startDate, endDate } = {}) {
    const skip = (page - 1) * limit;
    const where = {
      deleteStatus: false,
      ...(customerId && { customerId: parseInt(customerId) }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { invoiceNo: { contains: search, mode: 'insensitive' } },
          { customer: { name: { contains: search, mode: 'insensitive' } } },
          { customer: { code: { contains: search, mode: 'insensitive' } } },
        ],
      }),
      ...(startDate || endDate ? {
        createdAt: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) }),
        },
      } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, code: true, name: true } },
          _count: { select: { saleOrders: true, payments: true } },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    return { data, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / limit) } };
  }

  // ──────────────────────────────────────────────────────────
  // Record a payment against an invoice
  // ──────────────────────────────────────────────────────────
  async recordPayment() {
    throw new APIError(
      'Per-invoice payment API is deprecated. Use POST /api/customer-payments instead.',
      410,
      'DEPRECATED_USE_CUSTOMER_PAYMENTS'
    );
  }

  // ──────────────────────────────────────────────────────────
  // Cancel invoice — unlinks sale orders (returns them to DELIVERED)
  // ──────────────────────────────────────────────────────────
  async cancelInvoice(invoiceId, userId, req = null) {
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          saleOrders: { select: { id: true } },
          customer: { select: { id: true, code: true, ledgerId: true } },
        },
      });

      if (!invoice || invoice.deleteStatus) {
        throw new APIError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
      }

      if (invoice.status === 'PAID') {
        throw new APIError('Cannot cancel a fully paid invoice', 400, 'INVOICE_PAID');
      }

      if (invoice.status === 'CANCELLED') {
        throw new APIError('Invoice is already cancelled', 400, 'ALREADY_CANCELLED');
      }

      const saleOrderIds = invoice.saleOrders.map(s => s.id);

      await prisma.$transaction(async (tx) => {
        // Return SOs to DELIVERED status so they can be re-invoiced,
        // but keep invoiceId intact so the cancelled invoice retains its SO history for review.
        if (saleOrderIds.length) {
          await tx.saleOrder.updateMany({
            where: { id: { in: saleOrderIds } },
            data: { status: 'DELIVERED', updatedBy: userId },
          });
        }

        await tx.invoice.update({
          where: { id: invoiceId },
          data: { status: 'CANCELLED', updatedBy: userId },
        });

        // Reverse the reserve→outstanding move: move unpaid amount back to reserved_amount
        const unpaidAmount = Math.max(0, invoice.totalAmount - (invoice.paidAmount || 0));
        if (unpaidAmount > 0) {
          await tx.customer.update({
            where: { id: invoice.customerId },
            data: {
              outstanding_credit: { decrement: unpaidAmount },
              reserved_amount: { increment: unpaidAmount },
            },
          });
        }

        // Reverse accounting if invoice was already posted (ISSUED or PARTIALLY_PAID)
        if (['ISSUED', 'PARTIALLY_PAID'].includes(invoice.status)) {
          await reverseInvoice(tx, {
            invoiceId,
            invoiceNo: invoice.invoiceNo,
            totalAmount: invoice.totalAmount,
            taxAmount: invoice.taxAmount,
            customer: invoice.customer,
          }, userId);
        }
      });

      await logUpdate({
        userId,
        entity: 'Invoice',
        entityId: invoiceId,
        oldValues: { status: invoice.status },
        newValues: { status: 'CANCELLED' },
        req,
        metadata: { operation: 'cancelInvoice', releasedOrders: saleOrderIds },
      });

      return this.getInvoiceById(invoiceId);
    } catch (error) {
      if (error instanceof APIError) throw error;
      await logDatabaseError({ error, userId, req, metadata: { operation: 'cancelInvoice', invoiceId } }).catch(() => {});
      throw new APIError('Failed to cancel invoice', 500, 'CANCEL_INVOICE_ERROR');
    }
  }

  // ──────────────────────────────────────────────────────────
  // Issue invoice (DRAFT → ISSUED)
  // ──────────────────────────────────────────────────────────
  async issueInvoice(invoiceId, userId, req = null) {
    try {
      const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });

      if (!invoice || invoice.deleteStatus) {
        throw new APIError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
      }

      if (invoice.status !== 'DRAFT') {
        throw new APIError(`Invoice is already ${invoice.status}`, 400, 'INVALID_STATUS_TRANSITION');
      }

      const customer = await prisma.customer.findUnique({
        where: { id: invoice.customerId },
        select: { id: true, code: true, ledgerId: true },
      });
      if (!customer) throw new APIError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');

      const updated = await prisma.$transaction(async (tx) => {
        const issued = await tx.invoice.update({
          where: { id: invoiceId },
          data: { status: 'ISSUED', updatedBy: userId },
        });

        await tx.saleOrder.updateMany({
          where: { invoiceId, deleteStatus: false },
          data: { status: 'INVOICED', updatedBy: userId },
        });

        await postInvoice(tx, { invoiceId, invoiceNo: invoice.invoiceNo, totalAmount: invoice.totalAmount, taxAmount: invoice.taxAmount, customer }, userId);

        return issued;
      });

      await logUpdate({
        userId, entity: 'Invoice', entityId: invoiceId,
        oldValues: { status: 'DRAFT' }, newValues: { status: 'ISSUED' },
        req, metadata: { operation: 'issueInvoice' },
      });

      return this.getInvoiceById(updated.id);
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError('Failed to issue invoice', 500, 'ISSUE_INVOICE_ERROR');
    }
  }

  // ──────────────────────────────────────────────────────────
  // Get ALL delivered, un-billed orders — for the billing screen
  // ──────────────────────────────────────────────────────────
  async getAllDispatchedOrders({ page = 1, limit = 20, search, customerId } = {}) {
    const skip = (page - 1) * limit;
    const where = {
      status: 'DELIVERED',
      deleteStatus: false,
      AND: [
        {
          OR: [
            { invoiceId: null },
            { invoice: { status: 'CANCELLED' } },
          ],
        },
      ],
      ...(customerId && { customerId: parseInt(customerId) }),
    };

    if (search) {
      where.AND.push({
        OR: [
          { orderNo: { contains: search, mode: 'insensitive' } },
          { customerRefNo: { contains: search, mode: 'insensitive' } },
          { customer: { name: { contains: search, mode: 'insensitive' } } },
          { customer: { code: { contains: search, mode: 'insensitive' } } },
        ],
      });
    }

    const [data, total] = await Promise.all([
      prisma.saleOrder.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { orderDate: 'desc' },
        select: {
          id: true, orderNo: true, orderDate: true, status: true, customerRefNo: true,
          lensPrice: true, fittingPrice: true, tintingPrice: true,
          rightEyeExtra: true, leftEyeExtra: true, discount: true, additionalPrice: true,
          customer: { select: { id: true, name: true, code: true, phone: true } },
          lensProduct: { select: { lens_name: true } },
          coating: { select: { name: true } },
          category: { select: { name: true } },
        },
      }),
      prisma.saleOrder.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ──────────────────────────────────────────────────────────
  // Aggregated stats for the Billing dashboard (fast, no row scan)
  // ──────────────────────────────────────────────────────────
  async getStats() {
    const [total, grouped, outstandingAgg] = await Promise.all([
      prisma.invoice.count({ where: { deleteStatus: false } }),
      prisma.invoice.groupBy({
        by: ['status'],
        where: { deleteStatus: false },
        _count: { id: true },
      }),
      prisma.invoice.aggregate({
        where: { deleteStatus: false, status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true, paidAmount: true },
      }),
    ]);

    const byStatus = {};
    for (const g of grouped) byStatus[g.status] = g._count.id;

    const totalRevenue = outstandingAgg._sum.totalAmount || 0;
    const totalPaid    = outstandingAgg._sum.paidAmount  || 0;
    const outstanding  = Math.max(0, totalRevenue - totalPaid);

    const pending = (byStatus['DRAFT'] || 0) + (byStatus['ISSUED'] || 0) + (byStatus['PARTIALLY_PAID'] || 0);
    const paid    = byStatus['PAID'] || 0;

    return { total, pending, paid, outstanding, byStatus };
  }

  // ──────────────────────────────────────────────────────────
  // Distinct customers who have DELIVERED un-billed orders
  // ──────────────────────────────────────────────────────────
  async getAwaitingInvoiceCustomers() {
    const rows = await prisma.saleOrder.findMany({
      where: {
        status: 'DELIVERED',
        deleteStatus: false,
        OR: [
          { invoiceId: null },
          { invoice: { status: 'CANCELLED' } },
        ],
      },
      select: {
        customerId: true,
        customer: {
          select: { id: true, name: true, shopname: true, code: true, credit_days: true },
        },
      },
      distinct: ['customerId'],
      orderBy: { customerId: 'asc' },
    });

    return rows
      .filter((r) => r.customer)
      .map((r) => ({
        id: r.customer.id,
        name: r.customer.name,
        shopname: r.customer.shopname || null,
        code: r.customer.code || null,
        creditDays: r.customer.credit_days ?? 0,
        credit_days: r.customer.credit_days ?? 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // ──────────────────────────────────────────────────────────
  // Get delivered (unbilled) orders for a specific customer
  // ──────────────────────────────────────────────────────────
  async getDeliveredOrders(customerId) {
    return prisma.saleOrder.findMany({
      where: {
        customerId: parseInt(customerId),
        status: 'DELIVERED',
        deleteStatus: false,
        // Include SOs with no invoice OR SOs from a cancelled invoice (available for re-invoicing)
        OR: [
          { invoiceId: null },
          { invoice: { status: 'CANCELLED' } },
        ],
      },
      select: {
        id: true, orderNo: true, orderDate: true, status: true, customerRefNo: true,
        lensPrice: true, fittingPrice: true, tintingPrice: true,
        rightEyeExtra: true, leftEyeExtra: true, discount: true, additionalPrice: true,
        lensProduct: { select: { lens_name: true } },
        coating: { select: { name: true } },
        category: { select: { name: true } },
        fitting: { select: { name: true } },
      },
      orderBy: { orderDate: 'asc' },
    });
  }
}
