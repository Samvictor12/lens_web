import express from 'express';
import LensDiaMasterController from '../controllers/lensDiaMasterController.js';

const router = express.Router();
const controller = new LensDiaMasterController();

/**
 * @swagger
 * components:
 *   schemas:
 *     LensDia:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Diameter ID
 *         name:
 *           type: string
 *           description: Diameter name
 *           example: "65mm"
 *         short_name:
 *           type: string
 *           description: Short name/abbreviation
 *           example: "65"
 *         description:
 *           type: string
 *           description: Detailed description
 *         activeStatus:
 *           type: boolean
 *           description: Whether the diameter is active
 *         deleteStatus:
 *           type: boolean
 *           description: Soft delete status
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
 *     
 *     LensDiaInput:
 *       type: object
 *       required:
 *         - name
 *         - short_name
 *       properties:
 *         name:
 *           type: string
 *           example: "70mm"
 *         short_name:
 *           type: string
 *           example: "70"
 *         description:
 *           type: string
 *           example: "Standard 70mm diameter lens"
 *         activeStatus:
 *           type: boolean
 *           default: true
 */

/**
 * @swagger
 * /api/lens-dias:
 *   post:
 *     summary: Create a new lens diameter type
 *     tags: [Lens Diameters]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LensDiaInput'
 *     responses:
 *       201:
 *         description: Diameter created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/LensDia'
 *       400:
 *         description: Validation error
 *       409:
 *         description: Diameter name already exists
 */
router.post('/', controller.create.bind(controller));

/**
 * @swagger
 * /api/lens-dias:
 *   get:
 *     summary: Get all lens diameters with pagination
 *     tags: [Lens Diameters]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in name, short_name, description
 *       - in: query
 *         name: activeStatus
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter by active status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of diameters retrieved successfully
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
 *                     $ref: '#/components/schemas/LensDia'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 */
router.get('/', controller.getAll.bind(controller));

/**
 * @swagger
 * /api/lens-dias/dropdown:
 *   get:
 *     summary: Get dropdown list of active diameters
 *     tags: [Lens Diameters]
 *     responses:
 *       200:
 *         description: Dropdown list retrieved successfully
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
 *                       label:
 *                         type: string
 *                       value:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       short_name:
 *                         type: string
 */
router.get('/dropdown', controller.getDropdown.bind(controller));

/**
 * @swagger
 * /api/lens-dias/stats:
 *   get:
 *     summary: Get lens diameter statistics
 *     tags: [Lens Diameters]
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     active:
 *                       type: integer
 *                     inactive:
 *                       type: integer
 */
router.get('/stats', controller.getStats.bind(controller));

/**
 * @swagger
 * /api/lens-dias/{id}:
 *   get:
 *     summary: Get a lens diameter by ID
 *     tags: [Lens Diameters]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Diameter ID
 *     responses:
 *       200:
 *         description: Diameter retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/LensDia'
 *       404:
 *         description: Diameter not found
 */
router.get('/:id', controller.getById.bind(controller));

/**
 * @swagger
 * /api/lens-dias/{id}:
 *   put:
 *     summary: Update a lens diameter
 *     tags: [Lens Diameters]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Diameter ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LensDiaInput'
 *     responses:
 *       200:
 *         description: Diameter updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/LensDia'
 *       404:
 *         description: Diameter not found
 *       409:
 *         description: Diameter name already exists
 */
router.put('/:id', controller.update.bind(controller));

/**
 * @swagger
 * /api/lens-dias/{id}:
 *   delete:
 *     summary: Delete a lens diameter (soft delete)
 *     tags: [Lens Diameters]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Diameter ID
 *     responses:
 *       200:
 *         description: Diameter deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Diameter not found
 */
router.delete('/:id', controller.delete.bind(controller));

export default router;
