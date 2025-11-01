import { Router } from 'express';
import { ExpenseController } from '../controllers/expenseController';
import { requireRole } from '../middleware/auth';

const router = Router();
const controller = new ExpenseController();

// Create new expense
router.post('/',
  requireRole(['Accounts', 'Admin']),
  controller.create
);

// List expenses with filters
router.get('/',
  requireRole(['Accounts', 'Admin']),
  controller.list
);

// Get monthly expense summary
router.get('/summary',
  requireRole(['Accounts', 'Admin']),
  controller.getMonthlySummary
);

export default router;

