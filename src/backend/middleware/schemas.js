import { z } from 'zod';

// Auth Schemas
export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6)
  })
});

// Sale Order Schemas
export const createSaleOrderSchema = z.object({
  body: z.object({
    customerId: z.number(),
    items: z.array(z.object({
      lensVariantId: z.number(),
      quantity: z.number().positive(),
      discount: z.number().min(0).max(100).optional()
    })).min(1),
    fittingType: z.string().optional()
  })
});

export const updateSaleOrderStatusSchema = z.object({
  params: z.object({
    id: z.string()
  }),
  body: z.object({
    status: z.enum([
      'DRAFT',
      'CONFIRMED',
      'IN_PRODUCTION',
      'READY_FOR_DISPATCH',
      'DISPATCHED',
      'DELIVERED'
    ])
  })
});

// Purchase Order Schemas
export const createPurchaseOrderSchema = z.object({
  body: z.object({
    vendorId: z.number(),
    items: z.array(z.object({
      lensVariantId: z.number(),
      quantity: z.number().positive(),
      price: z.number().positive()
    })).min(1),
    saleOrderId: z.number().optional(),
    notes: z.string().optional()
  })
});

export const updatePOStatusSchema = z.object({
  params: z.object({
    id: z.string()
  }),
  body: z.object({
    status: z.enum(['PENDING', 'ORDERED', 'RECEIVED', 'CANCELLED'])
  })
});

export const getPOListSchema = z.object({
  query: z.object({
    status: z.enum(['PENDING', 'ORDERED', 'RECEIVED', 'CANCELLED']).optional(),
    vendorId: z.string().optional(),
    fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
  }).optional()
});

// Invoice Schemas
export const createInvoiceSchema = z.object({
  body: z.object({
    saleOrderIds: z.array(z.number()).min(1)
  })
});

export const recordPaymentSchema = z.object({
  body: z.object({
    invoiceId: z.number(),
    amount: z.number().positive(),
    mode: z.enum(['CASH', 'UPI', 'BANK']),
    transactionId: z.string().optional()
  })
});

// Expense Schemas
export const createExpenseSchema = z.object({
  body: z.object({
    description: z.string(),
    amount: z.number().positive(),
    type: z.enum(['DIRECT', 'INDIRECT']),
    date: z.string().optional()
  })
});

// Financial Report Schemas
export const financialSummarySchema = z.object({
  query: z.object({
    month: z.string().regex(/^(0?[1-9]|1[0-2])$/),
    year: z.string().regex(/^\d{4}$/)
  })
});

export const profitLossSchema = z.object({
  query: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
  })
});

// Dispatch Schemas
export const createDispatchSchema = z.object({
  body: z.object({
    saleOrderId: z.string(),
    customerName: z.string(),
    customerAddress: z.string(),
    customerPhone: z.string(),
    items: z.array(z.object({
      description: z.string(),
      quantity: z.number(),
      remarks: z.string().optional(),
    })),
    deliveryMethod: z.string(),
    dispatchDate: z.string().transform(str => new Date(str)),
    remarks: z.string().optional(),
  })
});

export const updateDispatchStatusSchema = z.object({
  params: z.object({
    id: z.string()
  }),
  body: z.object({
    status: z.enum(['PENDING', 'IN_TRANSIT', 'DELIVERED']),
    remarks: z.string().optional()
  })
});

