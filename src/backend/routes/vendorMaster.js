import express from 'express';
import VendorMasterController from '../controllers/vendorMasterController.js';
// import {
//     authenticateToken 
// } from '../middleware/auth.js';
// import { handleAsync } from '../middleware/errorHandler.js';

const router = express.Router();
const vendorMasterController = new VendorMasterController();

/**
 * @swagger
 * components:
 *   schemas:
 *     VendorMaster:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Auto-generated vendor ID
 *         name:
 *           type: string
 *           maxLength: 200
 *           description: Vendor name
 *         code:
 *           type: string
 *           maxLength: 50
 *           description: Unique vendor code
 *         shopname:
 *           type: string
 *           maxLength: 200
 *           description: Shop name
 *         phone:
 *           type: string
 *           maxLength: 15
 *           description: Phone number
 *         email:
 *           type: string
 *           format: email
 *           description: Vendor email address
 *         address:
 *           type: string
 *           maxLength: 500
 *           description: Vendor address
 *         city:
 *           type: string
 *           maxLength: 100
 *           description: City name
 *         state:
 *           type: string
 *           maxLength: 100
 *           description: State name
 *         pincode:
 *           type: string
 *           maxLength: 10
 *           description: Postal code
 *         category:
 *           type: string
 *           maxLength: 100
 *           description: Vendor category
 *         gstin:
 *           type: string
 *           maxLength: 15
 *           description: GST registration number
 *         active_status:
 *           type: boolean
 *           description: Active status of vendor
 *         notes:
 *           type: string
 *           description: Additional notes
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *         createdBy:
 *           type: object
 *           description: User who created the record
 *         updatedBy:
 *           type: object
 *           description: User who last updated the record
 *
 *     VendorMasterInput:
 *       type: object
 *       required:
 *         - name
 *         - code
 *         - email
 *         - createdBy
 *         - updatedBy
 *       properties:
 *         name:
 *           type: string
 *           minLength: 1
 *           maxLength: 200
 *           description: Vendor name
 *         code:
 *           type: string
 *           minLength: 1
 *           maxLength: 50
 *           description: Unique vendor code
 *         shopname:
 *           type: string
 *           maxLength: 200
 *           description: Shop name
 *         phone:
 *           type: string
 *           maxLength: 15
 *           description: Phone number
 *         email:
 *           type: string
 *           format: email
 *           maxLength: 150
 *           description: Vendor email address
 *         address:
 *           type: string
 *           maxLength: 500
 *           description: Vendor address
 *         city:
 *           type: string
 *           maxLength: 100
 *           description: City name
 *         state:
 *           type: string
 *           maxLength: 100
 *           description: State name
 *         pincode:
 *           type: string
 *           maxLength: 10
 *           description: Postal code
 *         category:
 *           type: string
 *           maxLength: 100
 *           description: Vendor category
 *         gstin:
 *           type: string
 *           maxLength: 15
 *           description: GST registration number
 *         active_status:
 *           type: boolean
 *           default: true
 *           description: Active status of vendor
 *         notes:
 *           type: string
 *           maxLength: 1000
 *           description: Additional notes
 *         createdBy:
 *           type: integer
 *           description: User ID of creator
 *         updatedBy:
 *           type: integer
 *           description: User ID of updater
 *
 *     VendorMasterUpdateInput:
 *       type: object
 *       required:
 *         - updatedBy
 *       properties:
 *         name:
 *           type: string
 *           minLength: 1
 *           maxLength: 200
 *           description: Vendor name
 *         shopname:
 *           type: string
 *           maxLength: 200
 *           description: Shop name
 *         phone:
 *           type: string
 *           maxLength: 15
 *           description: Phone number
 *         email:
 *           type: string
 *           format: email
 *           maxLength: 150
 *           description: Vendor email address
 *         address:
 *           type: string
 *           maxLength: 500
 *           description: Vendor address
 *         city:
 *           type: string
 *           maxLength: 100
 *           description: City name
 *         state:
 *           type: string
 *           maxLength: 100
 *           description: State name
 *         pincode:
 *           type: string
 *           maxLength: 10
 *           description: Postal code
 *         category:
 *           type: string
 *           maxLength: 100
 *           description: Type of company
 *         pan_number:
 *           type: string
 *           maxLength: 20
 *           description: PAN number
 *         gstin_number:
 *           type: string
 *           maxLength: 20
 *           description: GSTIN number
 *         billing_address:
 *           type: string
 *           description: Billing address
 *         shipping_address:
 *           type: string
 *           description: Shipping address
 *         payment_terms:
 *           type: string
 *           description: Payment terms
 *         credit_limit:
 *           type: number
 *           format: float
 *           description: Credit limit amount
 *         credit_days:
 *           type: integer
 *           description: Credit period in days
 *         active_status:
 *           type: boolean
 *           description: Active status of vendor
 *         notes:
 *           type: string
 *           description: Additional notes
 *         updatedBy:
 *           type: integer
 *           description: User ID of updater
 *
 *     PaginatedVendorMasterResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/VendorMaster'
 *         pagination:
 *           type: object
 *           properties:
 *             page:
 *               type: integer
 *             limit:
 *               type: integer
 *             total:
 *               type: integer
 *             totalPages:
 *               type: integer
 */

/**
 * @swagger
 * /api/vendor-master:
 *   post:
 *     summary: Create a new vendor master
 *     tags: [Vendor Master]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VendorMasterInput'
 *     responses:
 *       201:
 *         description: Vendor master created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/VendorMaster'
 *       400:
 *         description: Validation error
 *       409:
 *         description: Conflict - Vendor code or email already exists
 *       500:
 *         description: Internal server error
 */
router.post('/',
    // authenticateToken,
    vendorMasterController.create.bind(vendorMasterController));

/**
 * @swagger
 * /api/vendor-master:
 *   get:
 *     summary: Get paginated list of vendor masters
 *     tags: [Vendor Master]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of records per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for vendor name, code, or email
 *       - in: query
 *         name: active_status
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: company_type
 *         schema:
 *           type: string
 *           enum: [PROPRIETORSHIP, PARTNERSHIP, PRIVATE_LIMITED, PUBLIC_LIMITED, LLP, TRUST, SOCIETY, OTHERS]
 *         description: Filter by company type
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [vendor_name, vendor_code, email, createdAt, updatedAt]
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
 *         description: List of vendor masters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedVendorMasterResponse'
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Internal server error
 */
router.get('/',
    // authenticateToken,
    vendorMasterController.list.bind(vendorMasterController));

/**
 * @swagger
 * /api/vendor-master/dropdown:
 *   get:
 *     summary: Get vendor dropdown list
 *     tags: [Vendor Master]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vendor dropdown list
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
 *                       vendor_name:
 *                         type: string
 *                       vendor_code:
 *                         type: string
 *       500:
 *         description: Internal server error
 */
router.get('/dropdown',
    // authenticateToken,
    vendorMasterController.getDropdown.bind(vendorMasterController));

/**
 * @swagger
 * /api/vendor-master/check-email:
 *   post:
 *     summary: Check if vendor email exists
 *     tags: [Vendor Master]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               excludeId:
 *                 type: integer
 *                 description: Exclude this vendor ID from check (for updates)
 *     responses:
 *       200:
 *         description: Email check result
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
 *                     exists:
 *                       type: boolean
 *                     email:
 *                       type: string
 *       400:
 *         description: Invalid email
 *       500:
 *         description: Internal server error
 */
router.post('/check-email',
    // authenticateToken,
    vendorMasterController.checkVendorEmail.bind(vendorMasterController));

/**
 * @swagger
 * /api/vendor-master/stats:
 *   get:
 *     summary: Get vendor statistics
 *     tags: [Vendor Master]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vendor statistics
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
 *                     totalVendors:
 *                       type: integer
 *       500:
 *         description: Internal server error
 */
router.get('/stats',
    // authenticateToken,
    vendorMasterController.getStats.bind(vendorMasterController));

/**
 * @swagger
 * /api/vendor-master/{id}:
 *   get:
 *     summary: Get vendor master by ID
 *     tags: [Vendor Master]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Vendor master ID
 *     responses:
 *       200:
 *         description: Vendor master details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/VendorMaster'
 *       400:
 *         description: Invalid ID parameter
 *       404:
 *         description: Vendor master not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id',
    // authenticateToken,
    vendorMasterController.getById.bind(vendorMasterController));

/**
 * @swagger
 * /api/vendor-master/{id}:
 *   put:
 *     summary: Update vendor master
 *     tags: [Vendor Master]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Vendor master ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VendorMasterUpdateInput'
 *     responses:
 *       200:
 *         description: Vendor master updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/VendorMaster'
 *       400:
 *         description: Validation error
 *       404:
 *         description: Vendor master not found
 *       409:
 *         description: Conflict - Email already exists
 *       500:
 *         description: Internal server error
 */
router.put('/:id',
    // authenticateToken,
    vendorMasterController.update.bind(vendorMasterController));

/**
 * @swagger
 * /api/vendor-master/{id}:
 *   delete:
 *     summary: Delete vendor master (soft delete)
 *     tags: [Vendor Master]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Vendor master ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - updatedBy
 *             properties:
 *               updatedBy:
 *                 type: integer
 *                 description: User ID performing the deletion
 *     responses:
 *       200:
 *         description: Vendor master deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid ID parameter
 *       404:
 *         description: Vendor master not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id',
    // authenticateToken,
    vendorMasterController.delete.bind(vendorMasterController));

export default router;