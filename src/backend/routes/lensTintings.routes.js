/**
 * Lens Tinting Master Routes
 * Defines all routes for lens tinting management
 */

import express from 'express';
import * as lensTintingController from '../controllers/lensTintingMasterController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/lens-tintings:
 *   post:
 *     summary: Create a new lens tinting
 *     tags: [Lens Tintings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - short_name
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 200
 *               short_name:
 *                 type: string
 *                 maxLength: 50
 *               description:
 *                 type: string
 *                 maxLength: 500
 *     responses:
       201:
         description: Tinting created successfully
 */
router.post('/', authenticateToken, lensTintingController.createLensTinting);

/**
 * @swagger
 * /api/v1/lens-tintings:
 *   get:
 *     summary: Get all lens tintings
 *     tags: [Lens Tintings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
       200:
         description: Tintings retrieved successfully
 */
router.get('/', authenticateToken, lensTintingController.getAllLensTintings);

/**
 * @swagger
 * /api/v1/lens-tintings/dropdown:
 *   get:
 *     summary: Get lens tintings for dropdown
 *     tags: [Lens Tintings]
 *     security:
 *       - bearerAuth: []
 *     responses:
       200:
         description: Dropdown data retrieved successfully
 */
router.get('/dropdown', authenticateToken, lensTintingController.getLensTintingsDropdown);

/**
 * @swagger
 * /api/v1/lens-tintings/statistics:
 *   get:
 *     summary: Get lens tinting statistics
 *     tags: [Lens Tintings]
 *     security:
 *       - bearerAuth: []
 *     responses:
       200:
         description: Statistics retrieved successfully
 */
router.get('/statistics', authenticateToken, lensTintingController.getLensTintingStatistics);

/**
 * @swagger
 * /api/v1/lens-tintings/{id}:
 *   get:
 *     summary: Get lens tinting by ID
 *     tags: [Lens Tintings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
       200:
         description: Tinting retrieved successfully
 */
router.get('/:id', authenticateToken, lensTintingController.getLensTintingById);

/**
 * @swagger
 * /api/v1/lens-tintings/{id}:
 *   put:
 *     summary: Update lens tinting
 *     tags: [Lens Tintings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               short_name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
       200:
         description: Tinting updated successfully
 */
router.put('/:id', authenticateToken, lensTintingController.updateLensTinting);

/**
 * @swagger
 * /api/v1/lens-tintings/{id}:
 *   delete:
 *     summary: Delete lens tinting (soft delete)
 *     tags: [Lens Tintings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
       200:
         description: Tinting deleted successfully
 */
router.delete('/:id', authenticateToken, lensTintingController.deleteLensTinting);

export default router;
