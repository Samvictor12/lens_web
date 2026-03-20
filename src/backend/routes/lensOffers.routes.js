/**
 * Lens Offers Routes
 * Defines all routes for lens offer management
 */

import express from 'express';
import * as lensOffersController from '../controllers/lensOffersController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/lens-offers:
 *   post:
 *     summary: Create a new lens offer
 *     tags: [Lens Offers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - offerName
 *               - offerType
 *               - startDate
 *               - endDate
 *             properties:
 *               offerName:
 *                 type: string
 *                 maxLength: 200
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               offerType:
 *                 type: string
 *                 enum: [VALUE, PERCENTAGE, EXCHANGE_PRODUCT]
 *               discountValue:
 *                 type: number
 *               discountPercentage:
 *                 type: number
 *               offerPrice:
 *                 type: number
 *               lens_id:
 *                 type: integer
 *               coating_id:
 *                 type: integer
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Offer created successfully
 */
router.post('/', authenticateToken, lensOffersController.createLensOffer);

/**
 * @swagger
 * /api/v1/lens-offers:
 *   get:
 *     summary: Get all lens offers
 *     tags: [Lens Offers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in offer name/description
 *       - in: query
 *         name: activeStatus
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: offerType
 *         schema:
 *           type: string
 *           enum: [VALUE, PERCENTAGE, EXCHANGE_PRODUCT]
 *         description: Filter by offer type
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter for currently active offers (within date range)
 *     responses:
 *       200:
 *         description: Offers retrieved successfully
 */
router.get('/', authenticateToken, lensOffersController.getAllLensOffers);

/**
 * @swagger
 * /api/v1/lens-offers/active/list:
 *   get:
 *     summary: Get currently active offers (within date range)
 *     tags: [Lens Offers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active offers retrieved successfully
 */
router.get('/active/list', authenticateToken, lensOffersController.getActiveOffers);

/**
 * @swagger
 * /api/v1/lens-offers/applicable:
 *   get:
 *     summary: Get applicable offers for specific lens/coating
 *     tags: [Lens Offers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lens_id
 *         schema:
 *           type: integer
 *         description: Lens product ID
 *       - in: query
 *         name: coating_id
 *         schema:
 *           type: integer
 *         description: Coating ID
 *     responses:
 *       200:
 *         description: Applicable offers retrieved successfully
 */
router.get('/applicable', authenticateToken, lensOffersController.getApplicableOffers);

/**
 * @swagger
 * /api/v1/lens-offers/dropdown:
 *   get:
 *     summary: Get offer dropdown list
 *     tags: [Lens Offers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dropdown list retrieved successfully
 */
router.get('/dropdown', authenticateToken, lensOffersController.getOfferDropdown);

/**
 * @swagger
 * /api/v1/lens-offers/stats:
 *   get:
 *     summary: Get offer statistics
 *     tags: [Lens Offers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get('/stats', authenticateToken, lensOffersController.getOfferStats);

/**
 * @swagger
 * /api/v1/lens-offers/{id}:
 *   get:
 *     summary: Get lens offer by ID
 *     tags: [Lens Offers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Offer ID
 *     responses:
 *       200:
 *         description: Offer retrieved successfully
 *       404:
 *         description: Offer not found
 */
router.get('/:id', authenticateToken, lensOffersController.getLensOfferById);

/**
 * @swagger
 * /api/v1/lens-offers/{id}:
 *   put:
 *     summary: Update lens offer
 *     tags: [Lens Offers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Offer ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               offerName:
 *                 type: string
 *               description:
 *                 type: string
 *               offerType:
 *                 type: string
 *                 enum: [VALUE, PERCENTAGE, EXCHANGE_PRODUCT]
 *               discountValue:
 *                 type: number
 *               discountPercentage:
 *                 type: number
 *               offerPrice:
 *                 type: number
 *               lens_id:
 *                 type: integer
 *               coating_id:
 *                 type: integer
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               activeStatus:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Offer updated successfully
 *       404:
 *         description: Offer not found
 */
router.put('/:id', authenticateToken, lensOffersController.updateLensOffer);

/**
 * @swagger
 * /api/v1/lens-offers/{id}:
 *   delete:
 *     summary: Delete lens offer (soft delete)
 *     tags: [Lens Offers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Offer ID
 *     responses:
 *       200:
 *         description: Offer deleted successfully
 *       404:
 *         description: Offer not found
 */
router.delete('/:id', authenticateToken, lensOffersController.deleteLensOffer);

export default router;
