import { Router } from 'express';
import { InvoiceController } from '../controllers/invoiceController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();
const controller = new InvoiceController();

// All invoice routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: Invoices
 *   description: Invoice / Bill management — combine delivered sale orders into bills
 */

/**
 * @swagger
 * /api/invoices:
 *   post:
 *     summary: Create invoice from delivered sale orders
 *     tags: [Invoices]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [saleOrderIds, dueDate]
 *             properties:
 *               saleOrderIds:
 *                 type: array
 *                 items: { type: integer }
 *                 description: IDs of DELIVERED sale orders to combine (same customer)
 *               dueDate:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Invoice created
 */
router.post(
  '/',
  // requireRole({ module: 'Invoice', actions: ['create'] }),
  (req, res, next) => controller.create(req, res, next)
);

/**
 * @swagger
 * /api/invoices:
 *   get:
 *     summary: List invoices
 *     tags: [Invoices]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: customerId
 *         schema: { type: integer }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [DRAFT, ISSUED, PARTIALLY_PAID, PAID, CANCELLED] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of invoices
 */
router.get(
  '/',
  // requireRole({ module: 'Invoice', actions: ['read'] }),
  (req, res, next) => controller.list(req, res, next)
);

/**
 * @swagger
 * /api/invoices/customers/{customerId}/delivered-orders:
 *   get:
 *     summary: Get DELIVERED sale orders (not yet billed) for a customer
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: List of delivered, un-invoiced sale orders
 */
router.get(
  '/stats',
  (req, res, next) => controller.getStats(req, res, next)
);

router.get(
  '/customers/:customerId/delivered-orders',
  // requireRole({ module: 'Invoice', actions: ['read'] }),
  (req, res, next) => controller.getDeliveredOrders(req, res, next)
);

/**
 * @swagger
 * /api/invoices/dispatched-orders:
 *   get:
 *     summary: Get all DELIVERED un-billed sale orders (billing screen)
 *     tags: [Invoices]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: customerId
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Paginated list of dispatched orders
 */
router.get(
  '/dispatched-orders',
  // requireRole({ module: 'Invoice', actions: ['read'] }),
  (req, res, next) => controller.getAllDispatchedOrders(req, res, next)
);

router.get(
  '/awaiting-customers',
  (req, res, next) => controller.getAwaitingInvoiceCustomers(req, res, next)
);

/**
 * @swagger
 * /api/invoices/{id}:
 *   get:
 *     summary: Get invoice by ID
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Invoice detail
 */
router.get(
  '/:id',
  // requireRole({ module: 'Invoice', actions: ['read'] }),
  (req, res, next) => controller.getById(req, res, next)
);

/**
 * @swagger
 * /api/invoices/{id}/issue:
 *   patch:
 *     summary: Issue invoice (DRAFT → ISSUED)
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Invoice issued
 */
router.patch(
  '/:id/issue',
  // requireRole({ module: 'Invoice', actions: ['update'] }),
  (req, res, next) => controller.issue(req, res, next)
);

/**
 * @swagger
 * /api/invoices/{id}/payments:
 *   post:
 *     summary: Record a payment against an invoice
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, method]
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Payment amount
 *               method:
 *                 type: string
 *                 enum: [CASH, UPI, CARD, BANK_TRANSFER, CHECK]
 *               referenceNo:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment recorded; invoice status updated; sale orders marked BILLED if fully paid
 */
router.post(
  '/:id/payments',
  // requireRole({ module: 'Invoice', actions: ['create'] }),
  (req, res, next) => controller.recordPayment(req, res, next)
);

/**
 * @swagger
 * /api/invoices/{id}/cancel:
 *   patch:
 *     summary: Cancel invoice and return sale orders to DELIVERED
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Invoice cancelled
 */
router.patch(
  '/:id/cancel',
  // requireRole({ module: 'Invoice', actions: ['update'] }),
  (req, res, next) => controller.cancel(req, res, next)
);

export default router;


