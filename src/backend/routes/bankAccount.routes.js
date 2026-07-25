import { Router } from 'express';
import bankAccountController from '../controllers/bankAccountController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();
const guard = [authenticateToken, requireRole(['Accounts', 'Admin'])];

router.get('/', ...guard, bankAccountController.list.bind(bankAccountController));
router.get('/:id', ...guard, bankAccountController.getById.bind(bankAccountController));
router.post('/', ...guard, bankAccountController.create.bind(bankAccountController));
router.put('/:id', ...guard, bankAccountController.update.bind(bankAccountController));

export default router;
