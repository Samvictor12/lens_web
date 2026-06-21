/**
 * Dashboard Routes
 * Read-only aggregated summary data for the Dashboard sales widgets.
 */

import express from 'express';
import { DashboardController } from '../controllers/dashboardController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const controller = new DashboardController();

/**
 * @swagger
 * /api/dashboard/summary:
 *   get:
 *     summary: Get today's sales summary (total sales, top 5 invoices, top selling product)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Today's sales summary retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/summary', authenticateToken, (req, res, next) => controller.getSummary(req, res, next));

export default router;
