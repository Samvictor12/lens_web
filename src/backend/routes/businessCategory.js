import { Router } from 'express';
import BusinessCategoryController from '../controllers/businessCategoryController.js';

const router = Router();
const controller = new BusinessCategoryController();

/**
 * @swagger
 * components:
 *   schemas:
 *     BusinessCategory:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         id:
 *           type: integer
 *           description: Auto-generated category ID
 *         name:
 *           type: string
 *           description: Category name
 *           example: "Optical Retail"
 *         active_status:
 *           type: boolean
 *           description: Active status
 *           default: true
 *         delete_status:
 *           type: boolean
 *           description: Soft delete status
 *           default: false
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         createdBy:
 *           type: integer
 *         updatedBy:
 *           type: integer
 */

/**
 * @swagger
 * /api/business-category:
 *   post:
 *     summary: Create a new business category
 *     tags: [Business Category]
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
 *                 example: "Optical Retail"
 *               active_status:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Business category created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Category name already exists
 */
router.post('/',
    // authenticateToken,  // Temporarily disabled for testing
    // requireRole(['Admin']),  // Temporarily disabled for testing
    controller.create.bind(controller)
);

/**
 * @swagger
 * /api/business-category:
 *   get:
 *     summary: Get paginated list of business categories
 *     tags: [Business Category]
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
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Search by category name (partial match)
 *       - in: query
 *         name: active_status
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of business categories
 */
router.get('/',
    // authenticateToken,  // Temporarily disabled for testing
    // requireRole(['Admin', 'Sales', 'Inventory']),  // Temporarily disabled for testing
    controller.list.bind(controller)
);

/**
 * @swagger
 * /api/business-category/dropdown:
 *   get:
 *     summary: Get dropdown list of active business categories
 *     tags: [Business Category]
 *     responses:
 *       200:
 *         description: List of active categories for dropdown
 */
router.get('/dropdown',
    // authenticateToken,  // Temporarily disabled for testing
    controller.dropdown.bind(controller)
);

/**
 * @swagger
 * /api/business-category/{id}:
 *   get:
 *     summary: Get single business category by ID
 *     tags: [Business Category]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Business category details
 *       404:
 *         description: Category not found
 */
router.get('/:id',
    // authenticateToken,  // Temporarily disabled for testing
    controller.getById.bind(controller)
);

/**
 * @swagger
 * /api/business-category/{id}:
 *   put:
 *     summary: Update business category
 *     tags: [Business Category]
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
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               active_status:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       404:
 *         description: Category not found
 *       409:
 *         description: Category name already exists
 */
router.put('/:id',
    // authenticateToken,  // Temporarily disabled for testing
    // requireRole(['Admin']),  // Temporarily disabled for testing
    controller.update.bind(controller)
);

/**
 * @swagger
 * /api/business-category/{id}:
 *   delete:
 *     summary: Delete business category (soft delete)
 *     tags: [Business Category]
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
 */
router.delete('/:id',
    // authenticateToken,  // Temporarily disabled for testing
    // requireRole(['Admin']),  // Temporarily disabled for testing
    controller.delete.bind(controller)
);

export default router;
