import prisma from '../config/prisma.js';
import { APIError } from '../middleware/errorHandler.js';
import { logCreate, logUpdate, logDelete } from '../utils/auditLogger.js';
import { logDatabaseError, logNotFoundError, logBusinessError } from '../utils/errorLogger.js';
import { postInvoice, postClientPayment } from './accountingService.js';

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
  async generateInvoiceNo() {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    const last = await prisma.invoice.findFirst({
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

      // Fetch all requested sale orders
      const orders = await prisma.saleOrder.findMany({
        where: { id: { in: saleOrderIds }, deleteStatus: false },
        include: { customer: { select: { id: true, name: true, code: true } } },
      });

      if (orders.length !== saleOrderIds.length) {
        throw new APIError('One or more sale orders not found', 404, 'ORDERS_NOT_FOUND');
      }

      // All must be DISPATCHED or DELIVERED
      const nonDelivered = orders.filter(o => o.status !== 'DELIVERED' && o.status !== 'DISPATCHED');
      if (nonDelivered.length) {
        throw new APIError(
          `Sale orders must be in DISPATCHED or DELIVERED status before billing. Non-delivered: ${nonDelivered.map(o => o.orderNo).join(', ')}`,
          400,
          'ORDERS_NOT_DELIVERED'
        );
      }

      // All must belong to the same customer
      const customerIds = [...new Set(orders.map(o => o.customerId))];
      if (customerIds.length > 1) {
        throw new APIError(
          'All sale orders in an invoice must belong to the same customer',
          400,
          'MULTIPLE_CUSTOMERS'
        );
      }

      // None should already be linked to an open invoice
      const alreadyBilled = orders.filter(o => o.invoiceId !== null);
      if (alreadyBilled.length) {
        throw new APIError(
          `Some orders are already on an invoice: ${alreadyBilled.map(o => o.orderNo).join(', ')}`,
          400,
          'ALREADY_INVOICED'
        );
      }

      const customerId = customerIds[0];
      const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true, code: true, ledgerId: true } });
      if (!customer) throw new APIError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');

      // Calculate total from individual order amounts
      const totalAmount = orders.reduce((sum, o) => {
        const lensPrice = o.lensPrice || 0;
        const extras = (o.fittingPrice || 0) + (o.tintingPrice || 0)
          + (o.rightEyeExtra || 0) + (o.leftEyeExtra || 0);
        // Discount applies to lens price only (not fitting, tinting, or extras)
        const discountAmt = lensPrice * ((o.discount || 0) / 100);
        // additionalPrice is a JSON array [{ label, amount }]
        const additional = Array.isArray(o.additionalPrice)
          ? o.additionalPrice.reduce((a, x) => a + (x.amount || 0), 0)
          : 0;
        return sum + (lensPrice - discountAmt + extras + additional);
      }, 0);

      const invoiceNo = await this.generateInvoiceNo();

      const taxAmount = parseFloat(req?.body?.taxAmount || 0);

      const invoice = await prisma.$transaction(async (tx) => {
        // Create invoice
        const created = await tx.invoice.create({
          data: {
            invoiceNo,
            customerId,
            totalAmount: Math.round(totalAmount * 100) / 100,
            taxAmount,
            paidAmount: 0,
            dueDate: new Date(dueDate),
            status: 'DRAFT',
            notes: notes || null,
            createdBy: userId,
            updatedBy: userId,
          },
        });

        // Link all sale orders to this invoice
        await tx.saleOrder.updateMany({
          where: { id: { in: saleOrderIds } },
          data: { invoiceId: created.id, updatedBy: userId },
        });

        // Move SO amounts from reserved_amount → outstanding_credit
        // (the invoiced amount is now owed by the customer, no longer just reserved)
        const invoicedTotal = Math.round(totalAmount * 100) / 100;
        await tx.customer.update({
          where: { id: customerId },
          data: {
            reserved_amount: { decrement: invoicedTotal },
            outstanding_credit: { increment: invoicedTotal },
          },
        });

        // Auto-post accounting entry
        await postInvoice(tx, { invoiceId: created.id, invoiceNo, totalAmount: created.totalAmount, taxAmount, customer }, userId);

        return created;
      });

      await logCreate({
        userId,
        entity: 'Invoice',
        entityId: invoice.id,
        newValues: { invoiceNo, customerId, totalAmount, saleOrderIds },
        req,
        metadata: { operation: 'createInvoice' },
      });

      return this.getInvoiceById(invoice.id);
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
        customer: { select: { id: true, code: true, name: true, shopname: true, phone: true } },
        saleOrders: {
          where: { deleteStatus: false },
          select: {
            id: true, orderNo: true, status: true, orderDate: true,
            lensPrice: true, fittingPrice: true, tintingPrice: true,
            rightEyeExtra: true, leftEyeExtra: true, discount: true, additionalPrice: true,
            lensProduct: { select: { lens_name: true } },
            coating: { select: { name: true } },
            category: { select: { name: true } },
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
    return invoice;
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
  async recordPayment(invoiceId, { amount, method, referenceNo, notes, bankLedgerId }, userId, req = null) {
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

      if (['PAID', 'CANCELLED'].includes(invoice.status)) {
        throw new APIError(`Cannot add payment to a ${invoice.status} invoice`, 400, 'INVOICE_CLOSED');
      }

      const newPaidAmount = Math.round((invoice.paidAmount + amount) * 100) / 100;
      if (newPaidAmount > invoice.totalAmount) {
        throw new APIError(
          `Payment of ₹${amount} would exceed invoice total of ₹${invoice.totalAmount}`,
          400,
          'PAYMENT_EXCEEDS_TOTAL'
        );
      }

      // Determine new invoice status
      const isFullyPaid = newPaidAmount >= invoice.totalAmount;
      const newInvoiceStatus = isFullyPaid ? 'PAID'
        : newPaidAmount > 0 ? 'PARTIALLY_PAID'
        : invoice.status;

      const saleOrderIds = invoice.saleOrders.map(s => s.id);

      await prisma.$transaction(async (tx) => {
        // Record payment
        await tx.payment.create({
          data: {
            invoiceId,
            amount,
            method,
            referenceNo: referenceNo || null,
            notes: notes || null,
          },
        });

        // Update invoice paid amount + status
        await tx.invoice.update({
          where: { id: invoiceId },
          data: { paidAmount: newPaidAmount, status: newInvoiceStatus, updatedBy: userId },
        });

        // Decrement customer outstanding_credit by payment amount
        await tx.customer.update({
          where: { id: invoice.customer.id },
          data: { outstanding_credit: { decrement: amount } },
        });

        // If fully paid → mark all linked sale orders as COMPLETED
        if (isFullyPaid && saleOrderIds.length) {
          await tx.saleOrder.updateMany({
            where: { id: { in: saleOrderIds } },
            data: { status: 'COMPLETED', updatedBy: userId },
          });
        }

        // Auto-post accounting entry if bankLedgerId provided
        if (bankLedgerId) {
          await postClientPayment(tx, { invoiceId, invoiceNo: invoice.invoiceNo, amount, bankLedgerId: parseInt(bankLedgerId), customer: invoice.customer }, userId);
        }
      });

      await logUpdate({
        userId,
        entity: 'Invoice',
        entityId: invoiceId,
        oldValues: { paidAmount: invoice.paidAmount, status: invoice.status },
        newValues: { paidAmount: newPaidAmount, status: newInvoiceStatus },
        req,
        metadata: { operation: 'recordPayment', paymentAmount: amount, fullyPaid: isFullyPaid },
      });

      return this.getInvoiceById(invoiceId);
    } catch (error) {
      if (error instanceof APIError) throw error;
      await logDatabaseError({ error, userId, req, metadata: { operation: 'recordPayment', invoiceId } }).catch(() => {});
      throw new APIError('Failed to record payment', 500, 'PAYMENT_ERROR');
    }
  }

  // ──────────────────────────────────────────────────────────
  // Cancel invoice — unlinks sale orders (returns them to DELIVERED)
  // ──────────────────────────────────────────────────────────
  async cancelInvoice(invoiceId, userId, req = null) {
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { saleOrders: { select: { id: true } } },
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
        // Unlink sale orders and return them to DELIVERED
        if (saleOrderIds.length) {
          await tx.saleOrder.updateMany({
            where: { id: { in: saleOrderIds } },
            data: { invoiceId: null, status: 'DELIVERED', updatedBy: userId },
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

      const updated = await prisma.$transaction(async (tx) => {
        const issued = await tx.invoice.update({
          where: { id: invoiceId },
          data: { status: 'ISSUED', updatedBy: userId },
        });

        await tx.saleOrder.updateMany({
          where: { invoiceId, deleteStatus: false },
          data: { status: 'INVOICED', updatedBy: userId },
        });

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
  // Get ALL dispatched (DELIVERED, un-billed) orders — for the billing screen
  // ──────────────────────────────────────────────────────────
  async getAllDispatchedOrders({ page = 1, limit = 20, search, customerId } = {}) {
    const skip = (page - 1) * limit;
    const where = {
      status: { in: ['DISPATCHED', 'DELIVERED'] },
      invoiceId: null,
      deleteStatus: false,
      ...(customerId && { customerId: parseInt(customerId) }),
      ...(search && {
        OR: [
          { orderNo: { contains: search, mode: 'insensitive' } },
          { customer: { name: { contains: search, mode: 'insensitive' } } },
          { customer: { code: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      prisma.saleOrder.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { orderDate: 'desc' },
        select: {
          id: true, orderNo: true, orderDate: true, status: true,
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
  // Get delivered (unbilled) orders for a specific customer
  // ──────────────────────────────────────────────────────────
  async getDeliveredOrders(customerId) {
    return prisma.saleOrder.findMany({
      where: {
        customerId: parseInt(customerId),
        status: { in: ['DISPATCHED', 'DELIVERED'] },
        invoiceId: null,
        deleteStatus: false,
      },
      select: {
        id: true, orderNo: true, orderDate: true, status: true,
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
