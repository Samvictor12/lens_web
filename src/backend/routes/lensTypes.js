/**
 * Lens Type Master Routes
 * Defines all routes for lens type management
 */

import express from 'express';
import * as lensTypeController from '../controllers/lensTypeMasterController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/lens-types:
 *   post:
 *     summary: Create a new lens type
 *     tags: [Lens Types]
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
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 200
 *               description:
 *                 type: string
 *                 maxLength: 500
 *     responses:
       201:
         description: Type created successfully
 */
router.post('/', authenticateToken, lensTypeController.createLensType);

/**
 * @swagger
 * /api/v1/lens-types:
 *   get:
 *     summary: Get all lens types
 *     tags: [Lens Types]
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
         description: Types retrieved successfully
 */
router.get('/', authenticateToken, lensTypeController.getAllLensTypes);

/**
 * @swagger
 * /api/v1/lens-types/dropdown:
 *   get:
 *     summary: Get lens types for dropdown
 *     tags: [Lens Types]
 *     security:
 *       - bearerAuth: []
 *     responses:
       200:
         description: Dropdown data retrieved successfully
 */
router.get('/dropdown', authenticateToken, lensTypeController.getLensTypesDropdown);

/**
 * @swagger
 * /api/v1/lens-types/statistics:
 *   get:
 *     summary: Get lens type statistics
 *     tags: [Lens Types]
 *     security:
 *       - bearerAuth: []
 *     responses:
       200:
         description: Statistics retrieved successfully
 */
router.get('/statistics', authenticateToken, lensTypeController.getLensTypeStatistics);

/**
 * @swagger
 * /api/v1/lens-types/{id}:
 *   get:
 *     summary: Get lens type by ID
 *     tags: [Lens Types]
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
         description: Type retrieved successfully
 */
router.get('/:id', authenticateToken, lensTypeController.getLensTypeById);

/**
 * @swagger
 * /api/v1/lens-types/{id}:
 *   put:
 *     summary: Update lens type
 *     tags: [Lens Types]
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
 *               description:
 *                 type: string
 *     responses:
       200:
         description: Type updated successfully
 */
router.put('/:id', authenticateToken, lensTypeController.updateLensType);

/**
 * @swagger
 * /api/v1/lens-types/{id}:
 *   delete:
 *     summary: Delete lens type (soft delete)
 *     tags: [Lens Types]
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
         description: Type deleted successfully
 */
router.delete('/:id', authenticateToken, lensTypeController.deleteLensType);

export default router;
