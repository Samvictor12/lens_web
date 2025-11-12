import { Router } from 'express';
import DepartmentController from '../controllers/department.controller.js';

const router = Router();
const controller = new DepartmentController();

/**
 * @swagger
 * components:
 *   schemas:
 *     Department:
 *       type: object
 *       required:
 *         - department
 *       properties:
 *         id:
 *           type: integer
 *           description: Auto-generated department ID
 *         department:
 *           type: string
 *           description: Department name
 *           example: "Sales"
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
 * /api/department:
 *   post:
 *     summary: Create a new department
 *     tags: [Department]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - department
 *             properties:
 *               department:
 *                 type: string
 *                 example: "Sales"
 *               active_status:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Department created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Department name already exists
 */
router.post('/',
    // authenticateToken,  // Temporarily disabled for testing
    // requireRole(['Admin']),  // Temporarily disabled for testing
    controller.create.bind(controller)
);

/**
 * @swagger
 * /api/department:
 *   get:
 *     summary: Get paginated list of departments
 *     tags: [Department]
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
 *         name: department
 *         schema:
 *           type: string
 *         description: Search by department name (case insensitive)
 *       - in: query
 *         name: active_status
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of departments with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Department'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 */
router.get('/',
    // authenticateToken,  // Temporarily disabled for testing
    controller.list.bind(controller)
);

/**
 * @swagger
 * /api/department/dropdown:
 *   get:
 *     summary: Get dropdown list of active departments
 *     tags: [Department]
 *     responses:
 *       200:
 *         description: List of active departments for dropdown
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 */
router.get('/dropdown',
    // authenticateToken,  // Temporarily disabled for testing
    controller.dropdown.bind(controller)
);

/**
 * @swagger
 * /api/department/{id}:
 *   get:
 *     summary: Get department by ID
 *     tags: [Department]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Department ID
 *     responses:
 *       200:
 *         description: Department details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Department'
 *       404:
 *         description: Department not found
 */
router.get('/:id',
    // authenticateToken,  // Temporarily disabled for testing
    controller.getById.bind(controller)
);

/**
 * @swagger
 * /api/department/{id}:
 *   put:
 *     summary: Update department
 *     tags: [Department]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Department ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - department
 *             properties:
 *               department:
 *                 type: string
 *                 example: "Sales"
 *               active_status:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Department updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Department not found
 *       409:
 *         description: Department name already exists
 */
router.put('/:id',
    // authenticateToken,  // Temporarily disabled for testing
    // requireRole(['Admin']),  // Temporarily disabled for testing
    controller.update.bind(controller)
);

/**
 * @swagger
 * /api/department/{id}:
 *   delete:
 *     summary: Delete department (soft delete)
 *     tags: [Department]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Department ID
 *     responses:
 *       200:
 *         description: Department deleted successfully
 *       400:
 *         description: Cannot delete department with users
 *       404:
 *         description: Department not found
 */
router.delete('/:id',
    // authenticateToken,  // Temporarily disabled for testing
    // requireRole(['Admin']),  // Temporarily disabled for testing
    controller.delete.bind(controller)
);

export default router;
