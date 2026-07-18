import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import * as dispatchController from '../controllers/dispatchController.js';

const router = Router();

// ── New endpoints ──────────────────────────────────────────────────────────────
router.get('/dashboard', authenticateToken, dispatchController.getDashboard);
router.get('/ready', authenticateToken, dispatchController.getReady);
router.post('/', authenticateToken, dispatchController.createDispatch);
router.get('/list', authenticateToken, dispatchController.getDispatchList);

// ── Legacy (backward compat) — before /:id so paths like /orders are not captured ──
router.get('/orders', authenticateToken, dispatchController.getOrders);
router.patch('/bulk-pickup', authenticateToken, dispatchController.bulkPickup);
router.patch('/bulk-deliver', authenticateToken, dispatchController.bulkDeliver);

router.get('/:id', authenticateToken, dispatchController.getDispatchById);
router.patch('/:id', authenticateToken, dispatchController.updateDispatch);
router.patch('/:id/status', authenticateToken, dispatchController.updateDispatchStatus);

export default router;
