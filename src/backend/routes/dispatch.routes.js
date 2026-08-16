import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import * as dispatchController from '../controllers/dispatchController.js';
import { broadcast } from '../utils/websocket.js';

const router = Router();

router.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const originalJson = res.json;
    res.json = function (body) {
      if (res.statusCode >= 200 && res.statusCode < 300 && body && body.success !== false) {
        setTimeout(() => {
          broadcast('DISPATCH_UPDATED', { method: req.method, url: req.originalUrl });
        }, 100);
      }
      return originalJson.apply(this, arguments);
    };
  }
  next();
});

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
