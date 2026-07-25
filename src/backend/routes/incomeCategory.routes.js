import { Router } from 'express';
import incomeController from '../controllers/incomeController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();
const guard = [authenticateToken, requireRole(['Accounts', 'Admin'])];

router.get('/', ...guard, incomeController.listCategories.bind(incomeController));
router.get('/:id', ...guard, incomeController.getCategoryById.bind(incomeController));
router.post('/', ...guard, incomeController.createCategory.bind(incomeController));
router.put('/:id', ...guard, incomeController.updateCategory.bind(incomeController));
router.delete('/:id', ...guard, incomeController.deleteCategory.bind(incomeController));

export default router;
