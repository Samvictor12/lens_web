import { Router } from 'express';
import { CustomerPaymentController } from '../controllers/customerPaymentController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();
const ctrl = new CustomerPaymentController();
const guard = [authenticateToken, requireRole(['Accounts', 'Admin'])];

router.get('/outstanding', ...guard, ctrl.getOutstanding.bind(ctrl));
router.get('/', ...guard, ctrl.list.bind(ctrl));
router.get('/:id', ...guard, ctrl.getById.bind(ctrl));
router.post('/', ...guard, ctrl.create.bind(ctrl));
router.patch('/:id/close', ...guard, ctrl.close.bind(ctrl));

export default router;
