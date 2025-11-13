/**
 * Lens Material Master Routes
 * Defines all routes for lens material management
 */

import express from 'express';
import * as lensMaterialController from '../controllers/lensMaterialMasterController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/lens-materials:
 *   post:
 *     summary: Create a new lens material
 *     tags: [Lens Materials]
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
         description: Material created successfully
 */
router.post('/', authenticateToken, lensMaterialController.createLensMaterial);

/**
 * @swagger
 * /api/v1/lens-materials:
 *   get:
 *     summary: Get all lens materials
 *     tags: [Lens Materials]
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
         description: Materials retrieved successfully
 */
router.get('/', authenticateToken, lensMaterialController.getAllLensMaterials);

/**
 * @swagger
 * /api/v1/lens-materials/dropdown:
 *   get:
 *     summary: Get lens materials for dropdown
 *     tags: [Lens Materials]
 *     security:
 *       - bearerAuth: []
 *     responses:
       200:
         description: Dropdown data retrieved successfully
 */
router.get('/dropdown', authenticateToken, lensMaterialController.getLensMaterialsDropdown);

/**
 * @swagger
 * /api/v1/lens-materials/statistics:
 *   get:
 *     summary: Get lens material statistics
 *     tags: [Lens Materials]
 *     security:
 *       - bearerAuth: []
 *     responses:
       200:
         description: Statistics retrieved successfully
 */
router.get('/statistics', authenticateToken, lensMaterialController.getLensMaterialStatistics);

/**
 * @swagger
 * /api/v1/lens-materials/{id}:
 *   get:
 *     summary: Get lens material by ID
 *     tags: [Lens Materials]
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
         description: Material retrieved successfully
 */
router.get('/:id', authenticateToken, lensMaterialController.getLensMaterialById);

/**
 * @swagger
 * /api/v1/lens-materials/{id}:
 *   put:
 *     summary: Update lens material
 *     tags: [Lens Materials]
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
         description: Material updated successfully
 */
router.put('/:id', authenticateToken, lensMaterialController.updateLensMaterial);

/**
 * @swagger
 * /api/v1/lens-materials/{id}:
 *   delete:
 *     summary: Delete lens material (soft delete)
 *     tags: [Lens Materials]
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
         description: Material deleted successfully
 */
router.delete('/:id', authenticateToken, lensMaterialController.deleteLensMaterial);

export default router;
