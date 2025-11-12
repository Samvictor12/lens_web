import { Router } from 'express';
import CustomerMasterController from '../controllers/customerMasterController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();
const controller = new CustomerMasterController();

/**
 * @swagger
 * components:
 *   schemas:
 *     CustomerMaster:
 *       type: object
 *       required:
 *         - name
 *         - code
 *         - email
 *       properties:
 *         id:
 *           type: integer
 *           description: Auto-generated customer ID
 *         name:
 *           type: string
 *           maxLength: 200
 *           description: Customer name
 *           example: "Surash Kumar"
 *         code:
 *           type: string
 *           maxLength: 50
 *           description: Unique customer code
 *           example: "CUST-001"
 *         shopname:
 *           type: string
 *           maxLength: 200
 *           description: Shop name
 *           example: "Kumar Opticals"
 *         phone:
 *           type: string
 *           maxLength: 15
 *           description: Phone number
 *           example: "8988778899"
 *         email:
 *           type: string
 *           format: email
 *           description: Email address
 *           example: "surash@example.com"
 *         address:
 *           type: string
 *           maxLength: 500
 *           description: Customer address
 *           example: "123 Main Street"
 *         city:
 *           type: string
 *           maxLength: 100
 *           description: City name
 *           example: "Chennai"
 *         state:
 *           type: string
 *           maxLength: 100
 *           description: State name
 *           example: "Tamil Nadu"
 *         pincode:
 *           type: string
 *           maxLength: 10
 *           description: Postal code
 *           example: "600001"
 *         businessCategory_id:
 *           type: integer
 *           description: Business category ID
 *           example: 1
 *         gstin:
 *           type: string
 *           maxLength: 15
 *           description: GST registration number
 *           example: "33AAAAA0000A1Z5"
 *         credit_limit:
 *           type: integer
 *           description: Credit limit amount
 *           example: 20000
 *         outstanding_credit:
 *           type: integer
 *           description: Outstanding credit amount
 *           example: 5000
 *         notes:
 *           type: string
 *           maxLength: 1000
 *           description: Additional notes
 *           example: "VIP customer"
 *         active_status:
 *           type: boolean
 *           description: Whether customer is active
 *           example: true
 *         delete_status:
 *           type: boolean
 *           description: Whether customer is deleted
 *           example: false
 *         createdBy:
 *           type: integer
 *           description: User ID who created this customer
 *         updatedBy:
 *           type: integer
 *           description: User ID who last updated this customer
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 * 
 *     CustomerMasterInput:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - createdBy
 *       properties:
 *         name:
 *           type: string
 *           maxLength: 100
 *           example: "Surash Kumar"
 *         phone:
 *           type: string
 *           maxLength: 15
 *           example: "8988778899"
 *         email:
 *           type: string
 *           format: email
 *           example: "surash@example.com"
 *         address:
 *           type: string
 *           maxLength: 500
 *           example: "123 Main Street"
 *         city:
 *           type: string
 *           maxLength: 100
 *           example: "Chennai"
 *         state:
 *           type: string
 *           maxLength: 100
 *           example: "Tamil Nadu"
 *         pincode:
 *           type: string
 *           maxLength: 10
 *           example: "600001"
 *         catagory:
 *           type: string
 *           maxLength: 50
 *           example: "Retail"
 *         gstin:
 *           type: string
 *           maxLength: 15
 *           example: "33AAAAA0000A1Z5"
 *         credit_limit:
 *           type: integer
 *           example: 20000
 *         notes:
 *           type: string
 *           maxLength: 1000
 *           example: "VIP customer"
 *         active_status:
 *           type: boolean
 *           description: Whether customer is active
 *           default: true
 *           example: true
 *         createdBy:
 *           type: integer
 *           description: User ID who created this customer
 *           example: 1
 *         updatedBy:
 *           type: integer
 *           description: User ID who last updated this customer (for updates only)
 *           example: 1
 * 
 *     PaginationResponse:
 *       type: object
 *       properties:
 *         page:
 *           type: integer
 *           example: 1
 *         limit:
 *           type: integer
 *           example: 10
 *         total:
 *           type: integer
 *           example: 100
 *         pages:
 *           type: integer
 *           example: 10
 * 
 *     SuccessResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           oneOf:
 *             - $ref: '#/components/schemas/CustomerMaster'
 *             - type: array
 *               items:
 *                 $ref: '#/components/schemas/CustomerMaster'
 *         pagination:
 *           $ref: '#/components/schemas/PaginationResponse'
 * 
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "Validation error"
 *         code:
 *           type: string
 *           example: "VALIDATION_ERROR"
 *         errors:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               field:
 *                 type: string
 *               message:
 *                 type: string
 * 
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

// All validation is now handled in the controller layer

/**
 * @swagger
 * tags:
 *   name: Customer Master
 *   description: Customer Master management operations
 */

/**
 * @swagger
 * /api/customer-master:
 *   post:
 *     summary: Create a new customer master
 *     tags: [Customer Master]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CustomerMasterInput'
 *     responses:
 *       201:
 *         description: Customer master created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/CustomerMaster'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Customer code or email already exists
 */
router.post('/',
    authenticateToken,
    requireRole(['Sales', 'Admin']),
    controller.create.bind(controller)
);

/**
 * @swagger
 * /api/customer-master:
 *   get:
 *     summary: Get paginated list of customer masters
 *     tags: [Customer Master]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filter by customer name
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city
 *       - in: query
 *         name: catagory
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         description: Filter by email
 *       - in: query
 *         name: phone
 *         schema:
 *           type: string
 *         description: Filter by phone number
 *       - in: query
 *         name: active_status
 *         schema:
 *           type: boolean
 *         description: Filter by active status
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
 *         description: Number of items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, city, catagory, active_status, createdAt]
 *           default: createdAt
 *         description: Sort by field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of customer masters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CustomerMaster'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/',
    authenticateToken,
    requireRole(['Sales', 'Admin', 'Inventory']),
    controller.list.bind(controller)
);

/**
 * @swagger
 * /api/customer-master/dropdown:
 *   get:
 *     summary: Get customer dropdown list
 *     tags: [Customer Master]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Customer dropdown list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
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
 *                       customerCode:
 *                         type: string
 */
router.get('/dropdown',
    authenticateToken,
    requireRole(['Sales', 'Admin', 'Inventory']),
    controller.getDropdown.bind(controller)
);

/**
 * @swagger
 * /api/customer-master/stats:
 *   get:
 *     summary: Get customer statistics
 *     tags: [Customer Master]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Customer statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalCustomers:
 *                       type: integer
 */
router.get('/stats',
    authenticateToken,
    requireRole(['Admin']),
    controller.getStats.bind(controller)
);

/**
 * @swagger
 * /api/customer-master/check-email:
 *   post:
 *     summary: Check if customer email exists
 *     tags: [Customer Master]
 *     security:
 *       - BearerAuth: []
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
 *                 description: ID to exclude from check (for updates)
 *     responses:
 *       200:
 *         description: Customer email check result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     exists:
 *                       type: boolean
 *                     email:
 *                       type: string
 */
router.post('/check-email',
    authenticateToken,
    requireRole(['Sales', 'Admin']),
    controller.checkCustomerEmail.bind(controller)
);

/**
 * @swagger
 * /api/customer-master/{id}:
 *   get:
 *     summary: Get customer master by ID
 *     tags: [Customer Master]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Customer master ID
 *     responses:
 *       200:
 *         description: Customer master details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/CustomerMaster'
 *       404:
 *         description: Customer master not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id',
    authenticateToken,
    requireRole(['Sales', 'Admin', 'Inventory']),
    controller.getById.bind(controller)
);

/**
 * @swagger
 * /api/customer-master/{id}:
 *   put:
 *     summary: Update customer master
 *     tags: [Customer Master]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Customer master ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CustomerMasterInput'
 *     responses:
 *       200:
 *         description: Customer master updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/CustomerMaster'
 *       400:
 *         description: Validation error
 *       404:
 *         description: Customer master not found
 *       409:
 *         description: Customer code or email already exists
 */
router.put('/:id',
    authenticateToken,
    requireRole(['Sales', 'Admin']),
    controller.update.bind(controller)
);

/**
 * @swagger
 * /api/customer-master/{id}:
 *   delete:
 *     summary: Delete customer master
 *     tags: [Customer Master]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Customer master ID
 *     responses:
 *       200:
 *         description: Customer master deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Customer master deleted successfully"
 *       400:
 *         description: Cannot delete customer with existing orders
 *       404:
 *         description: Customer master not found
 */
router.delete('/:id',
    authenticateToken,
    requireRole(['Sales', 'Admin']),
    controller.delete.bind(controller)
);

export default router;