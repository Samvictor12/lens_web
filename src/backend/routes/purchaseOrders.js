import { Router } from 'express';
import { PurchaseOrderController } from '../controllers/purchaseOrderController';
import { requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { createPurchaseOrderSchema, updatePOStatusSchema, getPOListSchema } from '../middleware/schemas';

const router = Router();
const controller = new PurchaseOrderController();

// Create new purchase order
router.post('/', 
  requireRole(['Inventory', 'Admin']),
  validateRequest(createPurchaseOrderSchema),
  controller.create.bind(controller)
);

// Get all purchase orders with filters
router.get('/',
  requireRole(['Inventory', 'Admin', 'Accounts']),
  validateRequest(getPOListSchema),
  controller.list.bind(controller)
);

// Get purchase order by id
router.get('/:id',
  requireRole(['Inventory', 'Admin', 'Accounts']),
  controller.get.bind(controller)
);

// Update purchase order status
router.patch('/:id/status',
  requireRole(['Inventory', 'Admin']),
  validateRequest(updatePOStatusSchema),
  controller.updateStatus.bind(controller)
);

export default router;

