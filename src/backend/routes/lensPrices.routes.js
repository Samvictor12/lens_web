/**
 * Lens Price Master Routes
 * Defines all routes for lens pricing management
 */

import express from 'express';
import * as lensPriceController from '../controllers/lensPriceMasterController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/lens-prices:
 *   post:
 *     summary: Create a new lens price
 *     tags: [Lens Prices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lens_id
 *               - coating_id
 *               - price
 *             properties:
 *               lens_id:
 *                 type: integer
 *               coating_id:
 *                 type: integer
 *               price:
 *                 type: number
 *                 format: float
 *     responses:
       201:
         description: Price created successfully
 */
router.post('/', authenticateToken, lensPriceController.createLensPrice);

/**
 * @swagger
 * /api/v1/lens-prices:
 *   get:
 *     summary: Get all lens prices with filters
 *     tags: [Lens Prices]
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
 *       - in: query
 *         name: lens_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: coating_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *     responses:
       200:
         description: Prices retrieved successfully
 */
router.get('/', authenticateToken, lensPriceController.getAllLensPrices);

/**
 * @swagger
 * /api/v1/lens-prices/dropdown:
 *   get:
 *     summary: Get lens prices for dropdown
 *     tags: [Lens Prices]
 *     security:
 *       - bearerAuth: []
 *     responses:
       200:
         description: Dropdown data retrieved successfully
 */
router.get('/dropdown', authenticateToken, lensPriceController.getLensPricesDropdown);

/**
 * @swagger
 * /api/v1/lens-prices/statistics:
 *   get:
 *     summary: Get lens price statistics
 *     tags: [Lens Prices]
 *     security:
 *       - bearerAuth: []
 *     responses:
       200:
         description: Statistics retrieved successfully
 */
router.get('/statistics', authenticateToken, lensPriceController.getLensPriceStatistics);

/**
 * @swagger
 * /api/v1/lens-prices/by-lens-coating:
 *   get:
 *     summary: Get price for specific lens and coating combination
 *     tags: [Lens Prices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lens_id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: coating_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Price retrieved successfully
       404:
         description: Price not found for this combination
 */
router.get('/by-lens-coating', authenticateToken, lensPriceController.getPriceByLensAndCoating);

/**
 * @swagger
 * /api/v1/lens-prices/by-lens/{lensId}:
 *   get:
 *     summary: Get all prices for a specific lens
 *     tags: [Lens Prices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lensId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
       200:
         description: Prices for lens retrieved successfully
 */
router.get('/by-lens/:lensId', authenticateToken, lensPriceController.getPricesByLens);

/**
 * @swagger
 * /api/v1/lens-prices/{id}:
 *   get:
 *     summary: Get lens price by ID
 *     tags: [Lens Prices]
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
         description: Price retrieved successfully
 */
router.get('/:id', authenticateToken, lensPriceController.getLensPriceById);

/**
 * @swagger
 * /api/v1/lens-prices/{id}:
 *   put:
 *     summary: Update lens price
 *     tags: [Lens Prices]
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
 *               lens_id:
 *                 type: integer
 *               coating_id:
 *                 type: integer
 *               price:
 *                 type: number
 *     responses:
       200:
         description: Price updated successfully
 */
router.put('/:id', authenticateToken, lensPriceController.updateLensPrice);

/**
 * @swagger
 * /api/v1/lens-prices/{id}:
 *   delete:
 *     summary: Delete lens price (soft delete)
 *     tags: [Lens Prices]
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
         description: Price deleted successfully
 */
router.delete('/:id', authenticateToken, lensPriceController.deleteLensPrice);

export default router;
