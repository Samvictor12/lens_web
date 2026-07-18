import { Router } from 'express';
import vendorInvoiceController from '../controllers/vendorInvoiceController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { vendorInvoiceUpload } from '../middleware/upload.js';

const router = Router();
const guard = [authenticateToken, requireRole(['Accounts', 'Admin'])];

router.get('/outstanding', ...guard, vendorInvoiceController.getOutstanding.bind(vendorInvoiceController));
router.get('/', ...guard, vendorInvoiceController.list.bind(vendorInvoiceController));
router.get('/:id', ...guard, vendorInvoiceController.getById.bind(vendorInvoiceController));
router.post('/', ...guard, vendorInvoiceUpload.single('invoiceCopy'), vendorInvoiceController.create.bind(vendorInvoiceController));
router.patch('/:id/cancel', ...guard, vendorInvoiceController.cancel.bind(vendorInvoiceController));

export default router;
