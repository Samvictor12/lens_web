import { Router } from 'express';
import { FinancialReportController } from '../controllers/financialReportController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();
const ctrl = new FinancialReportController();
const guard = [authenticateToken, requireRole(['Accounts', 'Admin'])];

router.get('/summary',         ...guard, ctrl.getSummary.bind(ctrl));
router.get('/profit-loss',     ...guard, ctrl.getProfitLoss.bind(ctrl));
router.get('/ledger-statement',...guard, ctrl.getLedgerStatement.bind(ctrl));
router.get('/trial-balance',   ...guard, ctrl.getTrialBalance.bind(ctrl));
router.get('/day-book',        ...guard, ctrl.getDayBook.bind(ctrl));
router.get('/cash-bank-book',  ...guard, ctrl.getCashBankBook.bind(ctrl));

export default router;
