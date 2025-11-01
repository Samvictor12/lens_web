import { Request, Response, NextFunction } from 'express';
import { PrismaClient, InvoiceStatus, PaymentMethod } from '@prisma/client';
import { z } from 'zod';
import { APIError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

// Validation schemas
const createInvoiceSchema = z.object({
  saleOrderIds: z.array(z.number()).min(1),
  dueDate: z.string().transform(val => new Date(val))
});

const createPaymentSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CHECK']),
  referenceNo: z.string().optional(),
  notes: z.string().optional()
});

export class InvoiceController {
  // Create a new invoice from delivered sale orders
  async create(req, res) {
    try {
      const { saleOrderIds } = req.body;

      // Validate sale orders exist and are delivered
      const saleOrders = await prisma.saleOrder.findMany({
        where: {
          id: { in },
          status: 'DELIVERED'
        },
        include: {
          items
        }
      });

      if (saleOrders.length !== saleOrderIds.length) {
        return res.status(400).json({
          success,
          message: 'Some sale orders are not found or not delivered'
        });
      }

      // Calculate total amount
      const totalAmount = saleOrders.reduce((total, order) => {
        return total + order.items.reduce((orderTotal, item) => {
          return orderTotal + (item.price * item.quantity * (1 - item.discount));
        }, 0);
      }, 0);

      // Generate invoice number (format-YYYY-XXXX)
      const year = new Date().getFullYear();
      const lastInvoice = await prisma.invoice.findFirst({
        where: {
          invoiceNo: {
            startsWith: `INV-${year}-`
          }
        },
        orderBy: {
          invoiceNo: 'desc'
        }
      });

      let sequenceNumber = 1;
      if (lastInvoice) {
        const lastSequence = parseInt(lastInvoice.invoiceNo.split('-')[2]);
        sequenceNumber = lastSequence + 1;
      }

      const invoiceNo = `INV-${year}-${String(sequenceNumber).padStart(4, '0')}`;

      // Create invoice
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNo,
          totalAmount,
          saleOrders: {
            connect.map((id) => ({ id }))
          }
        },
        include: {
          saleOrders: {
            include: {
              customer,
              items: {
                include: {
                  lensVariant
                }
              }
            }
          }
        }
      });

      return res.status(201).json({
        success,
        data
      });
    } catch (error) {
      console.error('Error creating invoice:', error);
      return res.status(500).json({
        success,
        message: 'Error creating invoice'
      });
    }
  }

  // Record payment for invoice
  async recordPayment(req, res) {
    try {
      const { invoiceId, amount, mode, transactionId } = req.body;

      // Validate invoice exists
      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
          payments
        }
      });

      if (!invoice) {
        return res.status(404).json({
          success,
          message: 'Invoice not found'
        });
      }

      // Check if payment amount is valid
      const totalPaid = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);
      const remainingAmount = invoice.totalAmount - totalPaid;

      if (amount > remainingAmount) {
        return res.status(400).json({
          success,
          message: 'Payment amount exceeds remaining balance'
        });
      }

      // Record payment
      const payment = await prisma.payment.create({
        data: {
          invoiceId,
          amount,
          mode,
          transactionId
        }
      });

      return res.json({
        success,
        data
      });
    } catch (error) {
      console.error('Error recording payment:', error);
      return res.status(500).json({
        success,
        message: 'Error recording payment'
      });
    }
  }

  // Get customer ledger
  async getCustomerLedger(req, res) {
    try {
      const { customerId } = req.params;

      const invoices = await prisma.invoice.findMany({
        where: {
          saleOrders: {
            some: {
              customerId(customerId)
            }
          }
        },
        include: {
          payments,
          saleOrders
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Calculate balance for each invoice
      const ledger = invoices.map(invoice = {
        const totalPaid = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);
        const balance = invoice.totalAmount - totalPaid;

        return {
          ...invoice,
          totalPaid,
          balance,
          status === 0 ? 'PAID' : 'PENDING'
        };
      });

      return res.json({
        success,
        data
      });
    } catch (error) {
      console.error('Error fetching customer ledger:', error);
      return res.status(500).json({
        success,
        message: 'Error fetching customer ledger'
      });
    }
  }
}



