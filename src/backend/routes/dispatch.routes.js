import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import * as dispatchController from '../controllers/dispatchController.js';

const router = Router();

// ── New endpoints ──────────────────────────────────────────────────────────────
router.get('/dashboard', authenticateToken, dispatchController.getDashboard);
router.get('/ready', authenticateToken, dispatchController.getReady);
router.post('/', authenticateToken, dispatchController.createDispatch);
router.get('/list', authenticateToken, dispatchController.getDispatchList);
router.patch('/:id/status', authenticateToken, dispatchController.updateDispatchStatus);

// ── Legacy (backward compat) ───────────────────────────────────────────────────
router.get('/orders', authenticateToken, dispatchController.getOrders);
router.patch('/bulk-pickup', authenticateToken, dispatchController.bulkPickup);
router.patch('/bulk-deliver', authenticateToken, dispatchController.bulkDeliver);

export default router;
