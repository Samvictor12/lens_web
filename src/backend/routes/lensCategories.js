/**
 * Lens Category Master Routes
 * Defines all routes for lens category management
 */

import express from 'express';
import * as lensCategoryController from '../controllers/lensCategoryMasterController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/lens-categories:
 *   post:
 *     summary: Create a new lens category
 *     tags: [Lens Categories]
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
 *       201:
 *         description: Category created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticateToken, lensCategoryController.createLensCategory);

/**
 * @swagger
 * /api/v1/lens-categories:
 *   get:
 *     summary: Get all lens categories
 *     tags: [Lens Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticateToken, lensCategoryController.getAllLensCategories);

/**
 * @swagger
 * /api/v1/lens-categories/dropdown:
 *   get:
 *     summary: Get lens categories for dropdown
 *     tags: [Lens Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dropdown data retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/dropdown', authenticateToken, lensCategoryController.getLensCategoriesDropdown);

/**
 * @swagger
 * /api/v1/lens-categories/statistics:
 *   get:
 *     summary: Get lens category statistics
 *     tags: [Lens Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/statistics', authenticateToken, lensCategoryController.getLensCategoryStatistics);

/**
 * @swagger
 * /api/v1/lens-categories/{id}:
 *   get:
 *     summary: Get lens category by ID
 *     tags: [Lens Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Category retrieved successfully
 *       404:
 *         description: Category not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', authenticateToken, lensCategoryController.getLensCategoryById);

/**
 * @swagger
 * /api/v1/lens-categories/{id}:
 *   put:
 *     summary: Update lens category
 *     tags: [Lens Categories]
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
 *                 maxLength: 200
 *               description:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Category not found
 *       401:
 *         description: Unauthorized
 */
router.put('/:id', authenticateToken, lensCategoryController.updateLensCategory);

/**
 * @swagger
 * /api/v1/lens-categories/{id}:
 *   delete:
 *     summary: Delete lens category (soft delete)
 *     tags: [Lens Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       404:
 *         description: Category not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', authenticateToken, lensCategoryController.deleteLensCategory);

export default router;
