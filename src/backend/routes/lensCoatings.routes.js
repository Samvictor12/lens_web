/**
 * Lens Coating Master Routes
 * Defines all routes for lens coating management
 */

import express from 'express';
import * as lensCoatingController from '../controllers/lensCoatingMasterController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/lens-coatings:
 *   post:
 *     summary: Create a new lens coating
 *     tags: [Lens Coatings]
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
         description: Coating created successfully
 */
router.post('/', authenticateToken, lensCoatingController.createLensCoating);

/**
 * @swagger
 * /api/v1/lens-coatings:
 *   get:
 *     summary: Get all lens coatings
 *     tags: [Lens Coatings]
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
         description: Coatings retrieved successfully
 */
router.get('/', authenticateToken, lensCoatingController.getAllLensCoatings);

/**
 * @swagger
 * /api/v1/lens-coatings/dropdown:
 *   get:
 *     summary: Get lens coatings for dropdown
 *     tags: [Lens Coatings]
 *     security:
 *       - bearerAuth: []
 *     responses:
       200:
         description: Dropdown data retrieved successfully
 */
router.get('/dropdown', authenticateToken, lensCoatingController.getLensCoatingsDropdown);

/**
 * @swagger
 * /api/v1/lens-coatings/statistics:
 *   get:
 *     summary: Get lens coating statistics
 *     tags: [Lens Coatings]
 *     security:
 *       - bearerAuth: []
 *     responses:
       200:
         description: Statistics retrieved successfully
 */
router.get('/statistics', authenticateToken, lensCoatingController.getLensCoatingStatistics);

/**
 * @swagger
 * /api/v1/lens-coatings/{id}:
 *   get:
 *     summary: Get lens coating by ID
 *     tags: [Lens Coatings]
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
         description: Coating retrieved successfully
 */
router.get('/:id', authenticateToken, lensCoatingController.getLensCoatingById);

/**
 * @swagger
 * /api/v1/lens-coatings/{id}:
 *   put:
 *     summary: Update lens coating
 *     tags: [Lens Coatings]
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
         description: Coating updated successfully
 */
router.put('/:id', authenticateToken, lensCoatingController.updateLensCoating);

/**
 * @swagger
 * /api/v1/lens-coatings/{id}:
 *   delete:
 *     summary: Delete lens coating (soft delete)
 *     tags: [Lens Coatings]
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
         description: Coating deleted successfully
 */
router.delete('/:id', authenticateToken, lensCoatingController.deleteLensCoating);

export default router;
