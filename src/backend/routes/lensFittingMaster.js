import express from 'express';
import LensFittingMasterController from '../controllers/lensFittingMasterController.js';

const router = express.Router();
const controller = new LensFittingMasterController();

/**
 * @swagger
 * components:
 *   schemas:
 *     LensFitting:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Fitting ID
 *         name:
 *           type: string
 *           description: Fitting name
 *           example: "Standard Fitting"
 *         short_name:
 *           type: string
 *           description: Short name/abbreviation
 *           example: "STD"
 *         description:
 *           type: string
 *           description: Detailed description
 *         activeStatus:
 *           type: boolean
 *           description: Whether the fitting is active
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
 *     LensFittingInput:
 *       type: object
 *       required:
 *         - name
 *         - short_name
 *       properties:
 *         name:
 *           type: string
 *           example: "Premium Fitting"
 *         short_name:
 *           type: string
 *           example: "PREM"
 *         description:
 *           type: string
 *           example: "Premium quality lens fitting"
 *         activeStatus:
 *           type: boolean
 *           default: true
 */

/**
 * @swagger
 * /api/lens-fittings:
 *   post:
 *     summary: Create a new lens fitting type
 *     tags: [Lens Fittings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LensFittingInput'
 *     responses:
 *       201:
 *         description: Fitting created successfully
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
 *                   $ref: '#/components/schemas/LensFitting'
 *       400:
 *         description: Validation error
 *       409:
 *         description: Fitting name already exists
 */
router.post('/', controller.create.bind(controller));

/**
 * @swagger
 * /api/lens-fittings:
 *   get:
 *     summary: Get all lens fittings with pagination
 *     tags: [Lens Fittings]
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
 *         description: List of fittings retrieved successfully
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
 *                     $ref: '#/components/schemas/LensFitting'
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
 * /api/lens-fittings/dropdown:
 *   get:
 *     summary: Get dropdown list of active fittings
 *     tags: [Lens Fittings]
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
 * /api/lens-fittings/stats:
 *   get:
 *     summary: Get lens fitting statistics
 *     tags: [Lens Fittings]
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
 * /api/lens-fittings/{id}:
 *   get:
 *     summary: Get a lens fitting by ID
 *     tags: [Lens Fittings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Fitting ID
 *     responses:
 *       200:
 *         description: Fitting retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/LensFitting'
 *       404:
 *         description: Fitting not found
 */
router.get('/:id', controller.getById.bind(controller));

/**
 * @swagger
 * /api/lens-fittings/{id}:
 *   put:
 *     summary: Update a lens fitting
 *     tags: [Lens Fittings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Fitting ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LensFittingInput'
 *     responses:
 *       200:
 *         description: Fitting updated successfully
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
 *                   $ref: '#/components/schemas/LensFitting'
 *       404:
 *         description: Fitting not found
 *       409:
 *         description: Fitting name already exists
 */
router.put('/:id', controller.update.bind(controller));

/**
 * @swagger
 * /api/lens-fittings/{id}:
 *   delete:
 *     summary: Delete a lens fitting (soft delete)
 *     tags: [Lens Fittings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Fitting ID
 *     responses:
 *       200:
 *         description: Fitting deleted successfully
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
 *         description: Fitting not found
 */
router.delete('/:id', controller.delete.bind(controller));

export default router;
