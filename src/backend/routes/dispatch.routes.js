import { Router } from 'express';
import { DispatchController } from '../controllers/dispatchController';
import { requireRole } from '../middleware/auth';

const router = Router();
const controller = new DispatchController();

// List all dispatches
router.get('/',
  requireRole(['Inventory', 'Admin', 'Sales']),
  controller.list.bind(controller)
);

// Create new dispatch
router.post('/',
  requireRole(['Inventory', 'Admin']),
  controller.create.bind(controller)
);

// Get a specific dispatch
router.get('/:id',
  requireRole(['Inventory', 'Admin', 'Sales']),
  controller.get.bind(controller)
);

// Update dispatch status
router.patch('/:id/status',
  requireRole(['Inventory', 'Admin']),
  controller.updateStatus.bind(controller)
);

export default router;

