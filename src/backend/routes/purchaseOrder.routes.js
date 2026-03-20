import express from "express";
import purchaseOrderController from "../controllers/purchaseOrderController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Apply auth middleware to all purchase order routes
router.use(authenticateToken);

/**
 * @route   POST /api/purchase-orders/generate-po-number
 * @desc    Generate next PO number
 * @access  Private
 */
router.post(
  "/generate-po-number",
  purchaseOrderController.generatePONumber.bind(purchaseOrderController)
);

/**
 * @route   GET /api/purchase-orders/vendors/dropdown
 * @desc    Get vendor dropdown list
 * @access  Private
 */
router.get(
  "/vendors/dropdown",
  purchaseOrderController.getVendorDropdown.bind(purchaseOrderController)
);

/**
 * @route   GET /api/purchase-orders/order-types/dropdown
 * @desc    Get order types dropdown list
 * @access  Private
 */
router.get(
  "/order-types/dropdown",
  purchaseOrderController.getOrderTypesDropdown.bind(purchaseOrderController)
);

/**
 * @route   POST /api/purchase-orders/calculate-bulk-totals
 * @desc    Calculate totals for bulk lens selection
 * @access  Private
 */
router.post(
  "/calculate-bulk-totals",
  purchaseOrderController.calculateBulkTotals.bind(purchaseOrderController)
);

/**
 * @route   POST /api/purchase-orders
 * @desc    Create a new purchase order
 * @access  Private
 */
router.post(
  "/",
  purchaseOrderController.createPurchaseOrder.bind(purchaseOrderController)
);

/**
 * @route   GET /api/purchase-orders
 * @desc    Get all purchase orders with pagination and filtering
 * @access  Private
 */
router.get(
  "/",
  purchaseOrderController.getPurchaseOrders.bind(purchaseOrderController)
);

/**
 * @route   GET /api/purchase-orders/:id
 * @desc    Get purchase order by ID
 * @access  Private
 */
router.get(
  "/:id",
  purchaseOrderController.getPurchaseOrderById.bind(purchaseOrderController)
);

/**
 * @route   POST /api/purchase-orders/:id/receive
 * @desc    Receive a purchase order (create a receipt)
 * @access  Private
 */
router.post(
  "/:id/receive",
  purchaseOrderController.receivePurchaseOrder.bind(purchaseOrderController)
);

/**
 * @route   GET /api/purchase-orders/:id/receipts
 * @desc    Get all receipts for a purchase order
 * @access  Private
 */
router.get(
  "/:id/receipts",
  purchaseOrderController.getPOReceipts.bind(purchaseOrderController)
);

/**
 * @route   PUT /api/purchase-orders/:id
 * @desc    Update purchase order
 * @access  Private
 */
router.put(
  "/:id",
  purchaseOrderController.updatePurchaseOrder.bind(purchaseOrderController)
);

/**
 * @route   DELETE /api/purchase-orders/:id
 * @desc    Delete purchase order (soft delete)
 * @access  Private
 */
router.delete(
  "/:id",
  purchaseOrderController.deletePurchaseOrder.bind(purchaseOrderController)
);

export default router;
