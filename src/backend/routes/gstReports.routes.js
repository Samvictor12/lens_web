import { Router } from 'express';
import gstReportController from '../controllers/gstReportController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();
const guard = [authenticateToken, requireRole(['Accounts', 'Admin'])];

router.get('/monthly-sales', ...guard, gstReportController.getMonthlySales.bind(gstReportController));
router.get('/gst-collection', ...guard, gstReportController.getGstCollection.bind(gstReportController));

export default router;
