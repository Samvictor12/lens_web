import { Router } from 'express';
import incomeController from '../controllers/incomeController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();
const guard = [authenticateToken, requireRole(['Accounts', 'Admin'])];

router.get('/summary', ...guard, incomeController.getSummary.bind(incomeController));
router.get('/', ...guard, incomeController.list.bind(incomeController));
router.get('/:id/logs', ...guard, incomeController.getLogs.bind(incomeController));
router.get('/:id', ...guard, incomeController.getById.bind(incomeController));
router.post('/', ...guard, incomeController.create.bind(incomeController));
router.delete('/:id', ...guard, incomeController.remove.bind(incomeController));

export default router;
