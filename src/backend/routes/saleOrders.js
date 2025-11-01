import { Router } from 'express';
import { SaleOrderController } from '../controllers/saleOrderController';
import { requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { z } from 'zod';

const router = Router();
const controller = new SaleOrderController();

// Validation schemas
const createSaleOrderSchema = z.object({
  body: z.object({
    customerId: z.number(),
    fittingType: z.string().nullable().optional(),
    items: z.array(z.object({
      lensVariantId: z.number(),
      quantity: z.number().min(1),
      discount: z.number().min(0).max(100).default(0)
    })).min(1)
  })
});

const updateStatusSchema = z.object({
  params: z.object({
    id: z.string().transform(val => parseInt(val))
  }),
  body: z.object({
    status: z.enum(['DRAFT', 'CONFIRMED', 'IN_PRODUCTION', 'READY_FOR_DISPATCH', 'DELIVERED'])
  })
});

// Create new sale order
router.post('/', 
  requireRole(['Sales', 'Admin']),
  validateRequest(createSaleOrderSchema),
  controller.create
);

// List sale orders with optional filters
router.get('/',
  requireRole(['Sales', 'Admin', 'Inventory']),
  validateRequest(z.object({
    query: z.object({
      status: z.enum(['DRAFT', 'CONFIRMED', 'IN_PRODUCTION', 'READY_FOR_DISPATCH', 'DELIVERED']).optional(),
      customerId: z.string().transform(val => parseInt(val)).optional()
    })
  })),
  controller.list
);

// Get sale order by ID
router.get('/:id',
  requireRole(['Sales', 'Admin', 'Inventory']),
  validateRequest(z.object({
    params: z.object({
      id: z.string().transform(val => parseInt(val))
    })
  })),
  controller.getById
);

// Update sale order status
router.patch('/:id/status',
  requireRole(['Sales', 'Admin', 'Inventory']),
  validateRequest(updateStatusSchema),
  controller.updateStatus
);

export default router;

