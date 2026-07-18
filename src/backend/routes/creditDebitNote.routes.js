import { Router } from 'express';
import creditDebitNoteController from '../controllers/creditDebitNoteController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();
const guard = [authenticateToken, requireRole(['Accounts', 'Admin'])];

router.get('/', ...guard, creditDebitNoteController.list.bind(creditDebitNoteController));
router.get('/:id', ...guard, creditDebitNoteController.getById.bind(creditDebitNoteController));
router.post('/credit', ...guard, creditDebitNoteController.createCredit.bind(creditDebitNoteController));
router.post('/debit', ...guard, creditDebitNoteController.createDebit.bind(creditDebitNoteController));
router.patch('/:id/cancel', ...guard, creditDebitNoteController.cancel.bind(creditDebitNoteController));

export default router;
