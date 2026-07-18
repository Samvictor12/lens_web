import { Router } from 'express';
import vendorCreditDebitNoteController from '../controllers/vendorCreditDebitNoteController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();
const guard = [authenticateToken, requireRole(['Accounts', 'Admin'])];

router.get('/', ...guard, vendorCreditDebitNoteController.list.bind(vendorCreditDebitNoteController));
router.get('/:id', ...guard, vendorCreditDebitNoteController.getById.bind(vendorCreditDebitNoteController));
router.post('/credit', ...guard, vendorCreditDebitNoteController.createCredit.bind(vendorCreditDebitNoteController));
router.post('/debit', ...guard, vendorCreditDebitNoteController.createDebit.bind(vendorCreditDebitNoteController));
router.patch('/:id/cancel', ...guard, vendorCreditDebitNoteController.cancel.bind(vendorCreditDebitNoteController));

export default router;
