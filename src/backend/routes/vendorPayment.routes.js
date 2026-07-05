import { Router } from 'express';
import { VendorPaymentController } from '../controllers/vendorPaymentController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { vendorInvoiceUpload } from '../middleware/upload.js';

const router = Router();
const ctrl = new VendorPaymentController();
const guard = [authenticateToken, requireRole(['Accounts', 'Admin'])];

router.get('/outstanding', ...guard, ctrl.getOutstanding.bind(ctrl));
router.get('/', ...guard, ctrl.list.bind(ctrl));
router.get('/:id', ...guard, ctrl.getById.bind(ctrl));
router.post('/', ...guard, vendorInvoiceUpload.single('invoiceCopy'), ctrl.create.bind(ctrl));
router.patch('/:id/close', ...guard, ctrl.close.bind(ctrl));

export default router;
