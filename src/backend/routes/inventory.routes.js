import express from 'express';
import InventoryController from '../controllers/inventoryController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const inventoryController = new InventoryController();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @swagger
 * components:
 *   schemas:
 *     InventoryItem:
 *       type: object
 *       required:
 *         - lens_id
 *         - quantity
 *         - costPrice
 *       properties:
 *         id:
 *           type: integer
 *           description: Auto-generated inventory item ID
 *         lens_id:
 *           type: integer
 *           description: Lens product ID
 *         category_id:
 *           type: integer
 *           description: Lens category ID
 *         quantity:
 *           type: number
 *           minimum: 0.1
 *           description: Quantity in stock
 *         costPrice:
 *           type: number
 *           minimum: 0
 *           description: Purchase/cost price
 *         sellingPrice:
 *           type: number
 *           minimum: 0
 *           description: Retail/selling price
 *         status:
 *           type: string
 *           enum: [AVAILABLE, RESERVED, IN_PRODUCTION, DAMAGED, RETURNED, QUALITY_CHECK]
 *           description: Current status of inventory item
 *         batchNo:
 *           type: string
 *           description: Batch number from vendor
 *         location_id:
 *           type: integer
 *           description: Storage location ID
 *         tray_id:
 *           type: integer
 *           description: Storage tray ID
 *         
 *     InventoryTransaction:
 *       type: object
 *       required:
 *         - type
 *         - inventoryItemId
 *         - quantity
 *       properties:
 *         id:
 *           type: integer
 *           description: Auto-generated transaction ID
 *         type:
 *           type: string
 *           enum: [INWARD_PO, INWARD_DIRECT, OUTWARD_SALE, OUTWARD_RETURN, TRANSFER, ADJUSTMENT, DAMAGE]
 *           description: Type of inventory transaction
 *         inventoryItemId:
 *           type: integer
 *           description: Related inventory item ID
 *         quantity:
 *           type: number
 *           description: Quantity moved (positive for inward, negative for outward)
 *         reason:
 *           type: string
 *           description: Reason for transaction
 */

/**
 * @swagger
 * /api/inventory/items:
 *   post:
 *     summary: Create new inventory item (inward entry)
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InventoryItem'
 *     responses:
 *       201:
 *         description: Inventory item created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/items', (req, res, next) => {
  inventoryController.createInventoryItem(req, res, next);
});

/**
 * @swagger
 * /api/inventory/items:
 *   get:
 *     summary: Get paginated list of inventory items
 *     tags: [Inventory]
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
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in batch number, serial number, notes, lens name
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [AVAILABLE, RESERVED, IN_PRODUCTION, DAMAGED, RETURNED, QUALITY_CHECK]
 *         description: Filter by status
 *       - in: query
 *         name: lens_id
 *         schema:
 *           type: integer
 *         description: Filter by lens product
 *       - in: query
 *         name: location_id
 *         schema:
 *           type: integer
 *         description: Filter by location
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, inwardDate, quantity, costPrice, status]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of inventory items retrieved successfully
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized
 */
router.get('/items', (req, res, next) => {
  inventoryController.getInventoryItems(req, res, next);
});

router.get('/inward-queue', (req, res, next) => {
  inventoryController.getInventoryInwardQueue(req, res, next);
});

/**
 * @swagger
 * /api/inventory/items/{id}:
 *   get:
 *     summary: Get inventory item by ID
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Inventory item ID
 *     responses:
 *       200:
 *         description: Inventory item details retrieved successfully
 *       404:
 *         description: Inventory item not found
 *       401:
 *         description: Unauthorized
 */
router.get('/items/:id', (req, res, next) => {
  inventoryController.getInventoryItemById(req, res, next);
});

/**
 * @swagger
 * /api/inventory/items/{id}:
 *   put:
 *     summary: Update inventory item
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Inventory item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InventoryItem'
 *     responses:
 *       200:
 *         description: Inventory item updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Inventory item not found
 *       401:
 *         description: Unauthorized
 */
router.put('/items/:id', (req, res, next) => {
  inventoryController.updateInventoryItem(req, res, next);
});

/**
 * @swagger
 * /api/inventory/transactions:
 *   get:
 *     summary: Get paginated list of inventory transactions
 *     tags: [Inventory]
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
 *         description: Items per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [INWARD_PO, INWARD_DIRECT, OUTWARD_SALE, OUTWARD_RETURN, TRANSFER, ADJUSTMENT, DAMAGE]
 *         description: Filter by transaction type
 *       - in: query
 *         name: inventoryItemId
 *         schema:
 *           type: integer
 *         description: Filter by inventory item
 *     responses:
 *       200:
 *         description: List of inventory transactions retrieved successfully
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized
 */
router.get('/transactions', (req, res, next) => {
  inventoryController.getInventoryTransactions(req, res, next);
});

/**
 * @swagger
 * /api/inventory/transactions:
 *   post:
 *     summary: Create inventory transaction (stock movement)
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InventoryTransaction'
 *     responses:
 *       201:
 *         description: Inventory transaction created successfully
 *       400:
 *         description: Validation error or insufficient stock
 *       401:
 *         description: Unauthorized
 */
router.post('/transactions', (req, res, next) => {
  inventoryController.createInventoryTransaction(req, res, next);
});

/**
 * @swagger
 * /api/inventory/stock:
 *   get:
 *     summary: Get inventory stock summary
 *     tags: [Inventory]
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
 *         description: Items per page
 *       - in: query
 *         name: lens_id
 *         schema:
 *           type: integer
 *         description: Filter by lens product
 *       - in: query
 *         name: location_id
 *         schema:
 *           type: integer
 *         description: Filter by location
 *     responses:
 *       200:
 *         description: Inventory stock summary retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/stock', (req, res, next) => {
  inventoryController.getInventoryStock(req, res, next);
});

/**
 * @swagger
 * /api/inventory/reserve:
 *   post:
 *     summary: Reserve inventory for sale order
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - inventoryItemId
 *               - quantity
 *               - saleOrderId
 *             properties:
 *               inventoryItemId:
 *                 type: integer
 *                 description: Inventory item to reserve
 *               quantity:
 *                 type: number
 *                 minimum: 0.1
 *                 description: Quantity to reserve
 *               saleOrderId:
 *                 type: integer
 *                 description: Sale order ID for reservation
 *     responses:
 *       200:
 *         description: Inventory reserved successfully
 *       400:
 *         description: Insufficient stock or validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/reserve', (req, res, next) => {
  inventoryController.reserveInventoryForSale(req, res, next);
});

/**
 * @swagger
 * /api/inventory/dropdowns:
 *   get:
 *     summary: Get dropdown data for inventory forms
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dropdown data retrieved successfully
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
 *                     lensProducts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           lens_name:
 *                             type: string
 *                           product_code:
 *                             type: string
 *                     categories:
 *                       type: array
 *                     lensTypes:
 *                       type: array
 *                     coatings:
 *                       type: array
 *                     locations:
 *                       type: array
 *                     trays:
 *                       type: array
 *                     vendors:
 *                       type: array
 *       401:
 *         description: Unauthorized
 */
router.get('/dropdowns', (req, res, next) => {
  inventoryController.getInventoryDropdowns(req, res, next);
});

/**
 * @swagger
 * /api/inventory/dashboard:
 *   get:
 *     summary: Get inventory dashboard statistics
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/dashboard', (req, res, next) => {
  inventoryController.getInventoryDashboard(req, res, next);
});

export default router;