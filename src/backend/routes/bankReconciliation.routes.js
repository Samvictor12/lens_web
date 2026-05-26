import { Router } from 'express';
import { BankReconciliationController } from '../controllers/bankReconciliationController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();
const ctrl = new BankReconciliationController();
const guard = [authenticateToken, requireRole(['Accounts', 'Admin'])];

router.get('/', ...guard, ctrl.getStatement.bind(ctrl));
router.put('/mark', ...guard, ctrl.markReconciled.bind(ctrl));

export default router;
