import { Router } from 'express';
import { LedgerController } from '../controllers/ledgerController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();
const ctrl = new LedgerController();

router.use(authenticateToken);

router.get('/cash-bank', ctrl.getCashBankLedgers.bind(ctrl));
router.get('/', ctrl.list.bind(ctrl));
router.get('/:id', ctrl.getById.bind(ctrl));
router.post('/', requireRole(['Accounts', 'Admin']), ctrl.create.bind(ctrl));
router.put('/:id', requireRole(['Accounts', 'Admin']), ctrl.update.bind(ctrl));
router.delete('/:id', requireRole(['Accounts', 'Admin']), ctrl.remove.bind(ctrl));

export default router;
