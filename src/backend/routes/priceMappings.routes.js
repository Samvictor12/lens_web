import express from 'express';
import PriceMappingController from '../controllers/priceMappingController.js';
// import { authenticate } from '../middleware/auth.js'; // Uncomment when auth is ready

const router = express.Router();
const priceMappingController = new PriceMappingController();

/**
 * @swagger
 * components:
 *   schemas:
 *     PriceMapping:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         lensProduct_id:
 *           type: integer
 *         customer_id:
 *           type: integer
 *         discountRate:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/price-mappings/bulk:
 *   post:
 *     summary: Bulk create price mappings for a customer
 *     tags: [Price Mappings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customer_id
 *               - mappings
 *             properties:
 *               customer_id:
 *                 type: integer
 *               mappings:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - lensProduct_id
 *                   properties:
 *                     lensProduct_id:
 *                       type: integer
 *                     discountRate:
 *                       type: number
 *                       minimum: 0
 *                       maximum: 100
 *                       default: 0
 *     responses:
 *       201:
 *         description: Price mappings created successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Customer or lens product not found
 *       409:
 *         description: Duplicate price mapping
 */
router.post('/bulk', priceMappingController.bulkCreate.bind(priceMappingController));

/**
 * @swagger
 * /api/price-mappings/bulk:
 *   put:
 *     summary: Bulk update price mappings
 *     tags: [Price Mappings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mappings
 *             properties:
 *               mappings:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - id
 *                     - discountRate
 *                   properties:
 *                     id:
 *                       type: integer
 *                     discountRate:
 *                       type: number
 *                       minimum: 0
 *                       maximum: 100
 *     responses:
 *       200:
 *         description: Price mappings updated successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Price mappings not found
 */
router.put('/bulk', priceMappingController.bulkUpdate.bind(priceMappingController));

/**
 * @swagger
 * /api/price-mappings/bulk/upsert:
 *   post:
 *     summary: Bulk upsert (create or update) price mappings
 *     tags: [Price Mappings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customer_id
 *               - mappings
 *             properties:
 *               customer_id:
 *                 type: integer
 *               mappings:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - lensProduct_id
 *                   properties:
 *                     lensProduct_id:
 *                       type: integer
 *                     discountRate:
 *                       type: number
 *                       minimum: 0
 *                       maximum: 100
 *     responses:
 *       200:
 *         description: Price mappings upserted successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Customer not found
 */
router.post('/bulk/upsert', priceMappingController.bulkUpsert.bind(priceMappingController));

/**
 * @swagger
 * /api/price-mappings/bulk:
 *   delete:
 *     summary: Bulk delete price mappings by IDs
 *     tags: [Price Mappings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ids
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Price mappings deleted successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Price mappings not found
 */
router.delete('/bulk', priceMappingController.bulkDelete.bind(priceMappingController));

/**
 * @swagger
 * /api/price-mappings:
 *   get:
 *     summary: Get all price mappings with pagination and filtering
 *     tags: [Price Mappings]
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
 *         name: customer_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: lensProduct_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
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
 *     responses:
 *       200:
 *         description: List of price mappings
 */
router.get('/', priceMappingController.getAll.bind(priceMappingController));

/**
 * @swagger
 * /api/price-mappings/customer/{customer_id}:
 *   get:
 *     summary: Get all price mappings for a specific customer
 *     tags: [Price Mappings]
 *     parameters:
 *       - in: path
 *         name: customer_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Customer's price mappings
 *       404:
 *         description: Customer not found
 */
router.get('/customer/:customer_id', priceMappingController.getByCustomer.bind(priceMappingController));

/**
 * @swagger
 * /api/price-mappings/customer/{customer_id}:
 *   delete:
 *     summary: Delete all price mappings for a customer
 *     tags: [Price Mappings]
 *     parameters:
 *       - in: path
 *         name: customer_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Customer's price mappings deleted successfully
 */
router.delete('/customer/:customer_id', priceMappingController.deleteByCustomer.bind(priceMappingController));

/**
 * @swagger
 * /api/price-mappings/{id}:
 *   get:
 *     summary: Get a single price mapping by ID
 *     tags: [Price Mappings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Price mapping details
 *       404:
 *         description: Price mapping not found
 */
router.get('/:id', priceMappingController.getById.bind(priceMappingController));

export default router;
