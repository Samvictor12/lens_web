import { Router } from 'express';
import { AccountGroupController } from '../controllers/accountGroupController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();
const ctrl = new AccountGroupController();
const guard = [authenticateToken, requireRole(['Accounts', 'Admin'])];

router.get('/', ...guard, ctrl.listTree.bind(ctrl));
router.post('/', ...guard, ctrl.create.bind(ctrl));
router.get('/:id/summary', ...guard, ctrl.getSummary.bind(ctrl));
router.get('/:id', ...guard, ctrl.getById.bind(ctrl));

export default router;
