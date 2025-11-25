import { Router } from 'express';
import { SaleOrderController } from '../controllers/saleOrderController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();
const controller = new SaleOrderController();

/**
 * @swagger
 * components:
 *   schemas:
 *     SaleOrder:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Auto-generated sale order ID
 *           example: 1
 *         orderNumber:
 *           type: string
 *           description: Auto-generated order number
 *           example: "SO-2024-0001"
 *         customerId:
 *           type: integer
 *           description: Customer ID
 *           example: 1
 *         customerRefNo:
 *           type: string
 *           description: Customer reference number
 *           example: "CUST-REF-001"
 *         orderDate:
 *           type: string
 *           format: date-time
 *           description: Order date
 *         type:
 *           type: string
 *           description: Order type
 *           example: "Standard"
 *         status:
 *           type: string
 *           enum: [DRAFT, CONFIRMED, IN_PRODUCTION, READY_FOR_DISPATCH, DELIVERED]
 *           description: Order status
 *           example: "CONFIRMED"
 *         deliverySchedule:
 *           type: string
 *           format: date-time
 *           description: Expected delivery date
 *         remark:
 *           type: string
 *           description: Order remarks
 *           example: "Handle with care"
 *         itemRefNo:
 *           type: string
 *           description: Item reference number
 *           example: "ITEM-001"
 *         freeLens:
 *           type: boolean
 *           description: Whether lens is free
 *           example: false
 *         lensName:
 *           type: string
 *           description: Lens name
 *           example: "Progressive Lens"
 *         category:
 *           type: string
 *           description: Lens category
 *           example: "Premium"
 *         lensType:
 *           type: string
 *           description: Type of lens
 *           example: "Progressive"
 *         dia:
 *           type: string
 *           description: Diameter
 *           example: "70mm"
 *         fittingType:
 *           type: string
 *           description: Fitting type
 *           example: "Standard"
 *         coatingType:
 *           type: string
 *           description: Coating type
 *           example: "Anti-reflective"
 *         coatingName:
 *           type: string
 *           description: Coating name
 *           example: "Blue Light Protection"
 *         tintingName:
 *           type: string
 *           description: Tinting name
 *           example: "Light Gray"
 *         rightEye:
 *           type: boolean
 *           description: Right eye selected
 *           example: true
 *         leftEye:
 *           type: boolean
 *           description: Left eye selected
 *           example: true
 *         rightSpherical:
 *           type: string
 *           description: Right eye spherical value
 *           example: "-2.00"
 *         rightCylindrical:
 *           type: string
 *           description: Right eye cylindrical value
 *           example: "-0.50"
 *         rightAxis:
 *           type: string
 *           description: Right eye axis
 *           example: "90"
 *         rightAdd:
 *           type: string
 *           description: Right eye addition
 *           example: "+1.50"
 *         leftSpherical:
 *           type: string
 *           description: Left eye spherical value
 *           example: "-2.25"
 *         leftCylindrical:
 *           type: string
 *           description: Left eye cylindrical value
 *           example: "-0.75"
 *         leftAxis:
 *           type: string
 *           description: Left eye axis
 *           example: "85"
 *         leftAdd:
 *           type: string
 *           description: Left eye addition
 *           example: "+1.50"
 *         dispatchStatus:
 *           type: string
 *           description: Dispatch status
 *           example: "Pending"
 *         assignedPerson:
 *           type: string
 *           description: Person assigned to dispatch
 *           example: "John Doe"
 *         dispatchId:
 *           type: string
 *           description: Dispatch ID
 *           example: "DISP-001"
 *         estimatedDate:
 *           type: string
 *           format: date-time
 *           description: Estimated dispatch date
 *         actualDate:
 *           type: string
 *           format: date-time
 *           description: Actual dispatch date
 *         dispatchNotes:
 *           type: string
 *           description: Dispatch notes
 *           example: "Deliver to main office"
 *         lensPrice:
 *           type: number
 *           description: Lens price
 *           example: 5000.00
 *         coatingPrice:
 *           type: number
 *           description: Coating price
 *           example: 500.00
 *         fittingPrice:
 *           type: number
 *           description: Fitting price
 *           example: 300.00
 *         tintingPrice:
 *           type: number
 *           description: Tinting price
 *           example: 200.00
 *         discount:
 *           type: number
 *           description: Discount percentage
 *           example: 10
 *         totalAmount:
 *           type: number
 *           description: Total order amount
 *           example: 5400.00
 *         createdBy:
 *           type: integer
 *           description: User ID who created the order
 *         updatedBy:
 *           type: integer
 *           description: User ID who last updated the order
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 * 
 *     SaleOrderInput:
 *       type: object
 *       required:
 *         - customerId
 *       properties:
 *         customerId:
 *           type: integer
 *           description: Customer ID (required)
 *           example: 1
 *         customerRefNo:
 *           type: string
 *           description: Customer reference number
 *           example: "CUST-REF-001"
 *         orderDate:
 *           type: string
 *           format: date-time
 *           description: Order date
 *         type:
 *           type: string
 *           description: Order type
 *           example: "Standard"
 *         deliverySchedule:
 *           type: string
 *           format: date-time
 *           description: Expected delivery date
 *         remark:
 *           type: string
 *           description: Order remarks
 *           example: "Handle with care"
 *         itemRefNo:
 *           type: string
 *           description: Item reference number
 *         freeLens:
 *           type: boolean
 *           description: Whether lens is free
 *           example: false
 *         lensName:
 *           type: string
 *           description: Lens name
 *           example: "Progressive Lens"
 *         category:
 *           type: string
 *           description: Lens category
 *           example: "Premium"
 *         lensType:
 *           type: string
 *           description: Type of lens
 *           example: "Progressive"
 *         dia:
 *           type: string
 *           description: Diameter
 *           example: "70mm"
 *         fittingType:
 *           type: string
 *           description: Fitting type
 *           example: "Standard"
 *         coatingType:
 *           type: string
 *           description: Coating type
 *           example: "Anti-reflective"
 *         coatingName:
 *           type: string
 *           description: Coating name
 *           example: "Blue Light Protection"
 *         tintingName:
 *           type: string
 *           description: Tinting name
 *           example: "Light Gray"
 *         rightEye:
 *           type: boolean
 *           description: Right eye selected
 *           example: true
 *         leftEye:
 *           type: boolean
 *           description: Left eye selected
 *           example: true
 *         rightSpherical:
 *           type: string
 *           description: Right eye spherical value
 *           example: "-2.00"
 *         rightCylindrical:
 *           type: string
 *           description: Right eye cylindrical value
 *           example: "-0.50"
 *         rightAxis:
 *           type: string
 *           description: Right eye axis
 *           example: "90"
 *         rightAdd:
 *           type: string
 *           description: Right eye addition
 *           example: "+1.50"
 *         rightDia:
 *           type: string
 *           description: Right eye diameter
 *         rightBase:
 *           type: string
 *           description: Right eye base
 *         rightBaseSize:
 *           type: string
 *           description: Right eye base size
 *         rightBled:
 *           type: string
 *           description: Right eye bled
 *         leftSpherical:
 *           type: string
 *           description: Left eye spherical value
 *           example: "-2.25"
 *         leftCylindrical:
 *           type: string
 *           description: Left eye cylindrical value
 *           example: "-0.75"
 *         leftAxis:
 *           type: string
 *           description: Left eye axis
 *           example: "85"
 *         leftAdd:
 *           type: string
 *           description: Left eye addition
 *           example: "+1.50"
 *         leftDia:
 *           type: string
 *           description: Left eye diameter
 *         leftBase:
 *           type: string
 *           description: Left eye base
 *         leftBaseSize:
 *           type: string
 *           description: Left eye base size
 *         leftBled:
 *           type: string
 *           description: Left eye bled
 *         lensPrice:
 *           type: number
 *           minimum: 0
 *           description: Lens price
 *           example: 5000.00
 *         coatingPrice:
 *           type: number
 *           minimum: 0
 *           description: Coating price
 *           example: 500.00
 *         fittingPrice:
 *           type: number
 *           minimum: 0
 *           description: Fitting price
 *           example: 300.00
 *         tintingPrice:
 *           type: number
 *           minimum: 0
 *           description: Tinting price
 *           example: 200.00
 *         discount:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *           description: Discount percentage
 *           example: 10
 * 
 *     SaleOrderStatusUpdate:
 *       type: object
 *       required:
 *         - status
 *       properties:
 *         status:
 *           type: string
 *           enum: [DRAFT, CONFIRMED, IN_PRODUCTION, READY_FOR_DISPATCH, DELIVERED]
 *           description: New order status
 *           example: "CONFIRMED"
 * 
 *     SaleOrderDispatchUpdate:
 *       type: object
 *       properties:
 *         dispatchStatus:
 *           type: string
 *           description: Dispatch status
 *           example: "In Transit"
 *         assignedPerson_id:
 *           type: integer
 *           description: ID of person assigned to dispatch
 *           example: 5
 *         dispatchId:
 *           type: string
 *           description: Dispatch ID
 *           example: "DISP-001"
 *         estimatedDate:
 *           type: string
 *           format: date-time
 *           description: Estimated dispatch date
 *         estimatedTime:
 *           type: string
 *           description: Estimated dispatch time
 *           example: "14:00"
 *         actualDate:
 *           type: string
 *           format: date-time
 *           description: Actual dispatch date
 *         actualTime:
 *           type: string
 *           description: Actual dispatch time
 *           example: "14:30"
 *         dispatchNotes:
 *           type: string
 *           description: Dispatch notes
 *           example: "Delivered to reception"
 * 
 *     SaleOrderStats:
 *       type: object
 *       properties:
 *         totalOrders:
 *           type: integer
 *           example: 150
 *         totalRevenue:
 *           type: number
 *           example: 750000.00
 *         ordersByStatus:
 *           type: object
 *           properties:
 *             DRAFT:
 *               type: integer
 *             CONFIRMED:
 *               type: integer
 *             IN_PRODUCTION:
 *               type: integer
 *             READY_FOR_DISPATCH:
 *               type: integer
 *             DELIVERED:
 *               type: integer
 *         averageOrderValue:
 *           type: number
 *           example: 5000.00
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
 *         message:
 *           type: string
 *           example: "Operation successful"
 *         data:
 *           oneOf:
 *             - $ref: '#/components/schemas/SaleOrder'
 *             - type: array
 *               items:
 *                 $ref: '#/components/schemas/SaleOrder'
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

/**
 * @swagger
 * tags:
 *   name: Sale Orders
 *   description: Sale order management operations
 */

// All validation is now handled in the controller layer

// Routes

/**
 * @swagger
 * /api/sale-orders:
 *   post:
 *     summary: Create a new sale order
 *     tags: [Sale Orders]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SaleOrderInput'
 *           example:
 *             customerId: 1
 *             customerRefNo: "CUST-REF-001"
 *             orderDate: "2024-11-14T10:00:00Z"
 *             type: "Standard"
 *             lensName: "Progressive Lens"
 *             category: "Premium"
 *             lensType: "Progressive"
 *             rightEye: true
 *             leftEye: true
 *             rightSpherical: "-2.00"
 *             rightCylindrical: "-0.50"
 *             rightAxis: "90"
 *             leftSpherical: "-2.25"
 *             leftCylindrical: "-0.75"
 *             leftAxis: "85"
 *             lensPrice: 5000
 *             coatingPrice: 500
 *             fittingPrice: 300
 *             discount: 10
 *     responses:
 *       201:
 *         description: Sale order created successfully
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
 *                   example: "Sale order created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/SaleOrder'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.post('/',
  authenticateToken,
  requireRole({ module: 'Sale Orders', actions: ['create'] }),
  controller.create.bind(controller)
);

/**
 * @swagger
 * /api/sale-orders:
 *   get:
 *     summary: Get paginated list of sale orders with optional filters
 *     tags: [Sale Orders]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, CONFIRMED, IN_PRODUCTION, READY_FOR_DISPATCH, DELIVERED]
 *         description: Filter by order status
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: integer
 *         description: Filter by customer ID
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
 *     responses:
 *       200:
 *         description: List of sale orders retrieved successfully
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
 *                   example: "Sale orders retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SaleOrder'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get('/',
  authenticateToken,
  requireRole({ module: 'Sale Orders', actions: ['read'] }),
  controller.list.bind(controller)
);

/**
 * @swagger
 * /api/sale-orders/stats:
 *   get:
 *     summary: Get sale order statistics
 *     tags: [Sale Orders]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for statistics filter
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for statistics filter
 *     responses:
 *       200:
 *         description: Sale order statistics retrieved successfully
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
 *                   example: "Sale order statistics retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/SaleOrderStats'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get('/stats',
  authenticateToken,
  requireRole({ module: 'Sale Orders', actions: ['read'] }),
  controller.getStats.bind(controller)
);

/**
 * @swagger
 * /api/sale-orders/{id}:
 *   get:
 *     summary: Get sale order by ID
 *     tags: [Sale Orders]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Sale order ID
 *     responses:
 *       200:
 *         description: Sale order retrieved successfully
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
 *                   example: "Sale order retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/SaleOrder'
 *       404:
 *         description: Sale order not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get('/:id',
  authenticateToken,
  requireRole({ module: 'Sale Orders', actions: ['read'] }),
  controller.getById.bind(controller)
);

/**
 * @swagger
 * /api/sale-orders/{id}:
 *   put:
 *     summary: Update entire sale order
 *     tags: [Sale Orders]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Sale order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SaleOrderInput'
 *           example:
 *             customerId: 1
 *             status: "IN_PRODUCTION"
 *             lensName: "Progressive Lens Updated"
 *             lensPrice: 5500
 *             discount: 15
 *     responses:
 *       200:
 *         description: Sale order updated successfully
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
 *                   example: "Sale order updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/SaleOrder'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Sale order not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.put('/:id',
  authenticateToken,
  requireRole({ module: 'Sale Orders', actions: ['update'] }),
  controller.update.bind(controller)
);

/**
 * @swagger
 * /api/sale-orders/{id}/status:
 *   patch:
 *     summary: Update sale order status only
 *     tags: [Sale Orders]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Sale order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SaleOrderStatusUpdate'
 *           example:
 *             status: "CONFIRMED"
 *     responses:
 *       200:
 *         description: Sale order status updated successfully
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
 *                   example: "Sale order status updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/SaleOrder'
 *       400:
 *         description: Validation error
 *       404:
 *         description: Sale order not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.patch('/:id/status',
  authenticateToken,
  // requireRole(['Sales', 'Admin', 'Inventory']),  // Temporarily disabled for testing
  controller.updateStatus.bind(controller)
);

/**
 * @swagger
 * /api/sale-orders/{id}/dispatch:
 *   patch:
 *     summary: Update dispatch information only
 *     tags: [Sale Orders]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Sale order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SaleOrderDispatchUpdate'
 *           example:
 *             dispatchStatus: "In Transit"
 *             assignedPerson_id: 5
 *             dispatchId: "DISP-001"
 *             estimatedDate: "2024-11-15T14:00:00Z"
 *             estimatedTime: "14:00"
 *             dispatchNotes: "Handle with care"
 *     responses:
 *       200:
 *         description: Sale order dispatch information updated successfully
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
 *                   example: "Sale order dispatch information updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/SaleOrder'
 *       400:
 *         description: Validation error
 *       404:
 *         description: Sale order not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.patch('/:id/dispatch',
  authenticateToken,
  // requireRole(['Sales', 'Admin', 'Inventory']),  // Temporarily disabled for testing
  controller.updateDispatchInfo.bind(controller)
);

/**
 * @swagger
 * /api/sale-orders/{id}:
 *   delete:
 *     summary: Delete sale order (soft delete)
 *     tags: [Sale Orders]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Sale order ID
 *     responses:
 *       200:
 *         description: Sale order deleted successfully
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
 *                   example: "Sale order deleted successfully"
 *       400:
 *         description: Cannot delete sale order with existing dependencies
 *       404:
 *         description: Sale order not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.delete('/:id',
  authenticateToken,
  // requireRole(['Sales', 'Admin']),  // Temporarily disabled for testing
  controller.delete.bind(controller)
);

export default router;

