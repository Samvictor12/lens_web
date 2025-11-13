/**
 * Lens Product Master Routes
 * Defines all routes for lens product management
 */

import express from 'express';
import * as lensProductController from '../controllers/lensProductMasterController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/lens-products:
 *   post:
 *     summary: Create a new lens product
 *     tags: [Lens Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - brand_id
 *               - category_id
 *               - material_id
 *               - type_id
 *               - product_code
 *               - lens_name
 *             properties:
 *               brand_id:
 *                 type: integer
 *               category_id:
 *                 type: integer
 *               material_id:
 *                 type: integer
 *               type_id:
 *                 type: integer
 *               product_code:
 *                 type: string
 *               lens_name:
 *                 type: string
 *               sphere_from:
 *                 type: number
 *               sphere_to:
 *                 type: number
 *               cylinder_from:
 *                 type: number
 *               cylinder_to:
 *                 type: number
 *               add_from:
 *                 type: number
 *               add_to:
 *                 type: number
 *               range_text:
 *                 type: string
 *     responses:
       201:
         description: Product created successfully
 */
router.post('/', authenticateToken, lensProductController.createLensProduct);

/**
 * @swagger
 * /api/v1/lens-products:
 *   get:
 *     summary: Get all lens products with filters
 *     tags: [Lens Products]
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
 *         name: brand_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: category_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: material_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: type_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
       200:
         description: Products retrieved successfully
 */
router.get('/', authenticateToken, lensProductController.getAllLensProducts);

/**
 * @swagger
 * /api/v1/lens-products/dropdown:
 *   get:
 *     summary: Get lens products for dropdown with optional filters
 *     tags: [Lens Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: brand_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: category_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: material_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: type_id
 *         schema:
 *           type: integer
 *     responses:
       200:
         description: Dropdown data retrieved successfully
 */
router.get('/dropdown', authenticateToken, lensProductController.getLensProductsDropdown);

/**
 * @swagger
 * /api/v1/lens-products/statistics:
 *   get:
 *     summary: Get lens product statistics
 *     tags: [Lens Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
       200:
         description: Statistics retrieved successfully
 */
router.get('/statistics', authenticateToken, lensProductController.getLensProductStatistics);

/**
 * @swagger
 * /api/v1/lens-products/by-category/{categoryId}:
 *   get:
 *     summary: Get products by category
 *     tags: [Lens Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
       200:
         description: Products by category retrieved successfully
 */
router.get('/by-category/:categoryId', authenticateToken, lensProductController.getProductsByCategory);

/**
 * @swagger
 * /api/v1/lens-products/{id}:
 *   get:
 *     summary: Get lens product by ID
 *     tags: [Lens Products]
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
         description: Product retrieved successfully
 */
router.get('/:id', authenticateToken, lensProductController.getLensProductById);

/**
 * @swagger
 * /api/v1/lens-products/{id}:
 *   put:
 *     summary: Update lens product
 *     tags: [Lens Products]
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
 *               brand_id:
 *                 type: integer
 *               category_id:
 *                 type: integer
 *               material_id:
 *                 type: integer
 *               type_id:
 *                 type: integer
 *               product_code:
 *                 type: string
 *               lens_name:
 *                 type: string
 *     responses:
       200:
         description: Product updated successfully
 */
router.put('/:id', authenticateToken, lensProductController.updateLensProduct);

/**
 * @swagger
 * /api/v1/lens-products/{id}:
 *   delete:
 *     summary: Delete lens product (soft delete)
 *     tags: [Lens Products]
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
         description: Product deleted successfully
 */
router.delete('/:id', authenticateToken, lensProductController.deleteLensProduct);

export default router;
