import { Router } from 'express';
import { InvoiceController } from '../controllers/invoiceController';
import { requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { z } from 'zod';

const router = Router();
const controller = new InvoiceController();

// Validation schemas
const createInvoiceSchema = z.object({
  body: z.object({
    saleOrderIds: z.array(z.number()).min(1),
    dueDate: z.string().transform(val => new Date(val))
  })
});

const createPaymentSchema = z.object({
  params: z.object({
    id: z.string().transform(val => parseInt(val))
  }),
  body: z.object({
    amount: z.number().positive(),
    method: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CHECK']),
    referenceNo: z.string().optional(),
    notes: z.string().optional()
  })
});

// Routes
router.post('/',
  requireRole(['Admin', 'Accounts']),
  validateRequest(createInvoiceSchema),
  controller.create
);

router.post('/:id/payments',
  requireRole(['Admin', 'Accounts']),
  validateRequest(createPaymentSchema),
  controller.recordPayment
);

router.get('/customers/:id/ledger',
  requireRole(['Admin', 'Accounts', 'Sales']),
  validateRequest(z.object({
    params: z.object({
      id: z.string().transform(val => parseInt(val))
    })
  })),
  controller.getCustomerLedger
);

export default router;

