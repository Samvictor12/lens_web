import { Router } from 'express';
import { FinancialReportController } from '../controllers/financialReportController';
import { requireRole } from '../middleware/auth';

const router = Router();
const controller = new FinancialReportController();

// Get financial summary
router.get('/summary',
  requireRole(['Accounts', 'Admin']),
  controller.generateSummary
);

// Get profit and loss statement
router.get('/profit-loss',
  requireRole(['Accounts', 'Admin']),
  controller.getProfitLossStatement
);

export default router;

