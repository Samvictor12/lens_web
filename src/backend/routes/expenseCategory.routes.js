import { Router } from 'express';
import { ExpenseController } from '../controllers/expenseController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();
const ctrl = new ExpenseController();
const guard = [authenticateToken, requireRole(['Accounts', 'Admin'])];

router.get('/', ...guard, ctrl.listCategories.bind(ctrl));
router.post('/', ...guard, ctrl.createCategory.bind(ctrl));
router.put('/:id', ...guard, ctrl.updateCategory.bind(ctrl));
router.delete('/:id', ...guard, ctrl.deleteCategory.bind(ctrl));

export default router;
