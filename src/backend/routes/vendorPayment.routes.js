import { Router } from 'express';
import { VendorPaymentController } from '../controllers/vendorPaymentController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();
const ctrl = new VendorPaymentController();
const guard = [authenticateToken, requireRole(['Accounts', 'Admin'])];

router.get('/outstanding', ...guard, ctrl.getOutstanding.bind(ctrl));
router.get('/', ...guard, ctrl.list.bind(ctrl));
router.get('/:id', ...guard, ctrl.getById.bind(ctrl));
router.post('/', ...guard, ctrl.create.bind(ctrl));

export default router;
