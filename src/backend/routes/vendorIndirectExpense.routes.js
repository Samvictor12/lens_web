import { Router } from 'express';
import { VendorIndirectExpenseController } from '../controllers/vendorIndirectExpenseController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();
const ctrl = new VendorIndirectExpenseController();
const guard = [authenticateToken, requireRole(['Accounts', 'Admin'])];

router.get('/', ...guard, ctrl.list.bind(ctrl));
router.post('/', ...guard, ctrl.create.bind(ctrl));

export default router;
