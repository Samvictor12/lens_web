/**
 * Audit and Error Log Routes
 * API endpoints to view audit logs and error logs
 */

import express from 'express';
import { getAuditLogs } from '../utils/auditLogger.js';
import { getErrorLogs, getErrorStats, resolveError } from '../utils/errorLogger.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/logs/audit-logs:
 *   get:
 *     summary: Get audit logs
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: Filter by user ID
 *       - in: query
 *         name: entity
 *         schema:
 *           type: string
 *         description: Filter by entity name (e.g., SaleOrder, Customer)
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           enum: [CREATE, READ, UPDATE, DELETE]
 *         description: Filter by action type
 *       - in: query
 *         name: entityId
 *         schema:
 *           type: integer
 *         description: Filter by entity ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by start date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by end date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Records per page
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/audit-logs', authenticateToken, async (req, res) => {
  try {
    const {
      userId,
      entity,
      action,
      entityId,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;

    const result = await getAuditLogs({
      userId: userId ? parseInt(userId) : undefined,
      entity,
      action,
      entityId: entityId ? parseInt(entityId) : undefined,
      startDate,
      endDate,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: result.logs,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs'
    });
  }
});

/**
 * @swagger
 * /api/logs/error-logs:
 *   get:
 *     summary: Get error logs
 *     tags: [Error Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: Filter by user ID
 *       - in: query
 *         name: errorType
 *         schema:
 *           type: string
 *         description: Filter by error type
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [INFO, WARNING, ERROR, CRITICAL]
 *         description: Filter by severity
 *       - in: query
 *         name: resolved
 *         schema:
 *           type: boolean
 *         description: Filter by resolution status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by start date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by end date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Records per page
 *     responses:
 *       200:
 *         description: Error logs retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/error-logs', authenticateToken, async (req, res) => {
  try {
    const {
      userId,
      errorType,
      severity,
      resolved,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;

    const result = await getErrorLogs({
      userId: userId ? parseInt(userId) : undefined,
      errorType,
      severity,
      resolved: resolved !== undefined ? resolved === 'true' : undefined,
      startDate,
      endDate,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: result.logs,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching error logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch error logs'
    });
  }
});

/**
 * @swagger
 * /api/logs/error-logs/stats:
 *   get:
 *     summary: Get error statistics
 *     tags: [Error Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for statistics
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for statistics
 *     responses:
 *       200:
 *         description: Error statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/error-logs/stats', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const stats = await getErrorStats(startDate, endDate);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching error stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch error statistics'
    });
  }
});

/**
 * @swagger
 * /api/logs/error-logs/{id}/resolve:
 *   patch:
 *     summary: Mark an error as resolved
 *     tags: [Error Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Error log ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resolution
 *             properties:
 *               resolution:
 *                 type: string
 *                 description: Description of how the error was resolved
 *     responses:
 *       200:
 *         description: Error marked as resolved
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Error log not found
 *       500:
 *         description: Server error
 */
router.patch('/error-logs/:id/resolve', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution } = req.body;
    const userId = req.user.id;

    if (!resolution) {
      return res.status(400).json({
        success: false,
        error: 'Resolution description is required'
      });
    }

    await resolveError(parseInt(id), userId, resolution);

    res.json({
      success: true,
      message: 'Error marked as resolved'
    });
  } catch (error) {
    console.error('Error resolving error log:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve error log'
    });
  }
});

export default router;
