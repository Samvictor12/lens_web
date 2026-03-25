import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import * as dispatchController from '../controllers/dispatchController.js';

const router = Router();

// GET /api/v1/dispatch/orders — all roles that can access dispatch
router.get('/orders', authenticateToken, dispatchController.getOrders);

// PATCH /api/v1/dispatch/bulk-pickup — Delivery Person, Admin, Inventory
router.patch('/bulk-pickup', authenticateToken, dispatchController.bulkPickup);

// PATCH /api/v1/dispatch/bulk-deliver — Delivery Person, Admin
router.patch('/bulk-deliver', authenticateToken, dispatchController.bulkDeliver);

export default router;
