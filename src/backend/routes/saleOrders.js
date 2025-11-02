import { Router } from 'express';
import { SaleOrderController } from '../controllers/saleOrderController.js';
import { requireRole } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { z } from 'zod';

const router = Router();
const controller = new SaleOrderController();

// Validation schemas
const createSaleOrderSchema = z.object({
  body: z.object({
    // Required fields
    customerId: z.number(),
    
    // Basic order information (optional)
    customerRefNo: z.string().optional(),
    orderDate: z.string().datetime().optional(),
    type: z.string().optional(),
    deliverySchedule: z.string().datetime().optional(),
    remark: z.string().optional(),
    itemRefNo: z.string().optional(),
    freeLens: z.boolean().optional(),
    
    // Lens details (optional)
    lensName: z.string().optional(),
    category: z.string().optional(),
    lensType: z.string().optional(),
    dia: z.string().optional(),
    fittingType: z.string().optional(),
    coatingType: z.string().optional(),
    coatingName: z.string().optional(),
    tintingName: z.string().optional(),
    
    // Eye selection (optional)
    rightEye: z.boolean().optional(),
    leftEye: z.boolean().optional(),
    
    // Right eye specifications (optional)
    rightSpherical: z.string().optional(),
    rightCylindrical: z.string().optional(),
    rightAxis: z.string().optional(),
    rightAdd: z.string().optional(),
    rightDia: z.string().optional(),
    rightBase: z.string().optional(),
    rightBaseSize: z.string().optional(),
    rightBled: z.string().optional(),
    
    // Left eye specifications (optional)
    leftSpherical: z.string().optional(),
    leftCylindrical: z.string().optional(),
    leftAxis: z.string().optional(),
    leftAdd: z.string().optional(),
    leftDia: z.string().optional(),
    leftBase: z.string().optional(),
    leftBaseSize: z.string().optional(),
    leftBled: z.string().optional(),
    
    // Dispatch information (optional)
    dispatchStatus: z.string().optional(),
    assignedPerson: z.string().optional(),
    dispatchId: z.string().optional(),
    estimatedDate: z.string().datetime().optional(),
    estimatedTime: z.string().optional(),
    actualDate: z.string().datetime().optional(),
    actualTime: z.string().optional(),
    dispatchNotes: z.string().optional(),
    
    // Billing information (optional)
    lensPrice: z.number().min(0).optional(),
    coatingPrice: z.number().min(0).optional(),
    fittingPrice: z.number().min(0).optional(),
    tintingPrice: z.number().min(0).optional(),
    discount: z.number().min(0).max(100).optional(),
    
    // Legacy support (optional)
    items: z.array(z.object({
      lensVariantId: z.number(),
      quantity: z.number().min(1),
      discount: z.number().min(0).max(100).default(0)
    })).optional()
  })
});

const updateSaleOrderSchema = z.object({
  params: z.object({
    id: z.string().transform(val => parseInt(val))
  }),
  body: z.object({
    // Basic order information (optional)
    customerId: z.number().optional(),
    customerRefNo: z.string().optional(),
    orderDate: z.string().datetime().optional(),
    type: z.string().optional(),
    deliverySchedule: z.string().datetime().optional(),
    remark: z.string().optional(),
    itemRefNo: z.string().optional(),
    freeLens: z.boolean().optional(),
    
    // Lens details (optional)
    lensName: z.string().optional(),
    category: z.string().optional(),
    lensType: z.string().optional(),
    dia: z.string().optional(),
    fittingType: z.string().optional(),
    coatingType: z.string().optional(),
    coatingName: z.string().optional(),
    tintingName: z.string().optional(),
    
    // Eye selection (optional)
    rightEye: z.boolean().optional(),
    leftEye: z.boolean().optional(),
    
    // Right eye specifications (optional)
    rightSpherical: z.string().optional(),
    rightCylindrical: z.string().optional(),
    rightAxis: z.string().optional(),
    rightAdd: z.string().optional(),
    rightDia: z.string().optional(),
    rightBase: z.string().optional(),
    rightBaseSize: z.string().optional(),
    rightBled: z.string().optional(),
    
    // Left eye specifications (optional)
    leftSpherical: z.string().optional(),
    leftCylindrical: z.string().optional(),
    leftAxis: z.string().optional(),
    leftAdd: z.string().optional(),
    leftDia: z.string().optional(),
    leftBase: z.string().optional(),
    leftBaseSize: z.string().optional(),
    leftBled: z.string().optional(),
    
    // Dispatch information (optional)
    dispatchStatus: z.string().optional(),
    assignedPerson: z.string().optional(),
    dispatchId: z.string().optional(),
    estimatedDate: z.string().datetime().optional(),
    estimatedTime: z.string().optional(),
    actualDate: z.string().datetime().optional(),
    actualTime: z.string().optional(),
    dispatchNotes: z.string().optional(),
    
    // Billing information (optional)
    lensPrice: z.number().min(0).optional(),
    coatingPrice: z.number().min(0).optional(),
    fittingPrice: z.number().min(0).optional(),
    tintingPrice: z.number().min(0).optional(),
    discount: z.number().min(0).max(100).optional(),
    
    // Status update (optional)
    status: z.enum(['DRAFT', 'CONFIRMED', 'IN_PRODUCTION', 'READY_FOR_DISPATCH', 'DELIVERED']).optional(),
    
    // Legacy support (optional)
    items: z.array(z.object({
      lensVariantId: z.number(),
      quantity: z.number().min(1),
      discount: z.number().min(0).max(100).default(0)
    })).optional()
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

const getSummarySchema = z.object({
  query: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional()
  })
});

const listSaleOrdersSchema = z.object({
  query: z.object({
    status: z.enum(['DRAFT', 'CONFIRMED', 'IN_PRODUCTION', 'READY_FOR_DISPATCH', 'DELIVERED']).optional(),
    customerId: z.string().transform(val => parseInt(val)).optional(),
    page: z.string().transform(val => parseInt(val)).default('1'),
    limit: z.string().transform(val => parseInt(val)).default('10')
  })
});

const idParamSchema = z.object({
  params: z.object({
    id: z.string().transform(val => parseInt(val))
  })
});

// Routes

// Create new sale order
router.post('/', 
  requireRole(['Sales', 'Admin']),
  validateRequest(createSaleOrderSchema),
  controller.create.bind(controller)
);

// List sale orders with optional filters and pagination
router.get('/',
  requireRole(['Sales', 'Admin', 'Inventory']),
  validateRequest(listSaleOrdersSchema),
  controller.list.bind(controller)
);

// Get sale order summary/statistics
router.get('/summary',
  requireRole(['Sales', 'Admin']),
  validateRequest(getSummarySchema),
  controller.getSummary.bind(controller)
);

// Get sale order by ID
router.get('/:id',
  requireRole(['Sales', 'Admin', 'Inventory']),
  validateRequest(idParamSchema),
  controller.getById.bind(controller)
);

// Update entire sale order
router.put('/:id',
  requireRole(['Sales', 'Admin']),
  validateRequest(updateSaleOrderSchema),
  controller.update.bind(controller)
);

// Update sale order status only
router.patch('/:id/status',
  requireRole(['Sales', 'Admin', 'Inventory']),
  validateRequest(updateStatusSchema),
  controller.updateStatus.bind(controller)
);

// Delete sale order
router.delete('/:id',
  requireRole(['Sales', 'Admin']),
  validateRequest(idParamSchema),
  controller.delete.bind(controller)
);

export default router;

