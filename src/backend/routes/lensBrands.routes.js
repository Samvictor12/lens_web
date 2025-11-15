/**
 * Lens Brand Master Routes
 * Defines all routes for lens brand management
 */

import express from 'express';
import * as lensBrandController from '../controllers/lensBrandMasterController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/lens-brands:
 *   post:
 *     summary: Create a new lens brand
 *     tags: [Lens Brands]
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
         description: Brand created successfully
 */
router.post('/', authenticateToken, lensBrandController.createLensBrand);

/**
 * @swagger
 * /api/v1/lens-brands:
 *   get:
 *     summary: Get all lens brands
 *     tags: [Lens Brands]
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
         description: Brands retrieved successfully
 */
router.get('/', authenticateToken, lensBrandController.getAllLensBrands);

/**
 * @swagger
 * /api/v1/lens-brands/dropdown:
 *   get:
 *     summary: Get lens brands for dropdown
 *     tags: [Lens Brands]
 *     security:
 *       - bearerAuth: []
 *     responses:
       200:
         description: Dropdown data retrieved successfully
 */
router.get('/dropdown', authenticateToken, lensBrandController.getLensBrandsDropdown);

/**
 * @swagger
 * /api/v1/lens-brands/statistics:
 *   get:
 *     summary: Get lens brand statistics
 *     tags: [Lens Brands]
 *     security:
 *       - bearerAuth: []
 *     responses:
       200:
         description: Statistics retrieved successfully
 */
router.get('/statistics', authenticateToken, lensBrandController.getLensBrandStatistics);

/**
 * @swagger
 * /api/v1/lens-brands/{id}:
 *   get:
 *     summary: Get lens brand by ID
 *     tags: [Lens Brands]
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
         description: Brand retrieved successfully
 */
router.get('/:id', authenticateToken, lensBrandController.getLensBrandById);

/**
 * @swagger
 * /api/v1/lens-brands/{id}:
 *   put:
 *     summary: Update lens brand
 *     tags: [Lens Brands]
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
         description: Brand updated successfully
 */
router.put('/:id', authenticateToken, lensBrandController.updateLensBrand);

/**
 * @swagger
 * /api/v1/lens-brands/{id}:
 *   delete:
 *     summary: Delete lens brand (soft delete)
 *     tags: [Lens Brands]
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
         description: Brand deleted successfully
 */
router.delete('/:id', authenticateToken, lensBrandController.deleteLensBrand);

export default router;
