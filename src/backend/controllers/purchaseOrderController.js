import purchaseOrderService from "../services/purchaseOrderService.js";
import {
  validateCreatePurchaseOrder,
  validateUpdatePurchaseOrder,
} from "../dto/purchaseOrderDTO.js";

class PurchaseOrderController {
  /**
   * Generate next PO number
   */
  async generatePONumber(req, res, next) {
    try {
      const poNumber = await purchaseOrderService.generatePONumber();

      res.status(200).json({
        success: true,
        message: "PO number generated successfully",
        data: { poNumber },
      });
    } catch (error) {
      next(error);
    }
  }
  /**
   * Get all receipt logs for a purchase order
   * GET /api/purchase-orders/:id/receipt-logs
   */
  async getPOReceiptLogs(req, res, next) {
    try {
      const { id } = req.params;
      const logs = await purchaseOrderService.getPOReceiptLogs(parseInt(id));
      res.status(200).json({
        success: true,
        message: "Receipt logs fetched successfully",
        data: logs,
      });
    } catch (error) {
      next(error);
    }
  }
  /**
   * Create a new purchase order
   */
  async createPurchaseOrder(req, res, next) {
    try {
      // Validate request body
      const validation = validateCreatePurchaseOrder({
        ...req.body,
        createdBy: req.user?.id,
      });

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        });
      }

      const purchaseOrder = await purchaseOrderService.createPurchaseOrder(
        validation.data,
      );

      res.status(201).json({
        success: true,
        message: "Purchase order created successfully",
        data: purchaseOrder,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all purchase orders with pagination and filtering
   */
  async getPurchaseOrders(req, res, next) {
    try {
      console.log("req,res", req.body);

      const result = await purchaseOrderService.getPurchaseOrders(req.query);

      res.status(200).json({
        success: true,
        message: "Purchase orders fetched successfully",
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get purchase order by ID
   */
  async getPurchaseOrderById(req, res, next) {
    try {
      const { id } = req.params;
      const purchaseOrder = await purchaseOrderService.getPurchaseOrderById(
        parseInt(id),
      );

      res.status(200).json({
        success: true,
        message: "Purchase order fetched successfully",
        data: purchaseOrder,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update purchase order
   */
  async updatePurchaseOrder(req, res, next) {
    try {
      const { id } = req.params;

      // Validate request body
      const validation = validateUpdatePurchaseOrder({
        ...req.body,
        updatedBy: req.user?.id,
      });

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        });
      }

      const purchaseOrder = await purchaseOrderService.updatePurchaseOrder(
        parseInt(id),
        validation.data,
      );

      res.status(200).json({
        success: true,
        message: "Purchase order updated successfully",
        data: purchaseOrder,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete purchase order (soft delete)
   */
  async deletePurchaseOrder(req, res, next) {
    try {
      const { id } = req.params;
      const { updatedBy } = req.body;

      if (!updatedBy) {
        return res.status(400).json({
          success: false,
          message: "Updated by user ID is required",
        });
      }

      await purchaseOrderService.deletePurchaseOrder(
        parseInt(id),
        parseInt(updatedBy),
      );

      res.status(200).json({
        success: true,
        message: "Purchase order deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get vendor dropdown
   */
  async getVendorDropdown(req, res, next) {
    try {
      const vendors = await purchaseOrderService.getVendorDropdown();

      res.status(200).json({
        success: true,
        message: "Vendors fetched successfully",
        data: vendors,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Calculate bulk order totals
   */
  async calculateBulkTotals(req, res, next) {
    try {
      const { lensBulkSelection } = req.body;

      if (!lensBulkSelection || !Array.isArray(lensBulkSelection)) {
        return res.status(400).json({
          success: false,
          message: "Bulk lens selection array is required",
        });
      }

      const result =
        await purchaseOrderService.processBulkLensSelection(lensBulkSelection);

      res.status(200).json({
        success: true,
        message: "Bulk totals calculated successfully",
        data: {
          totalQuantity: result.totalQuantity,
          totalSubtotal: result.totalSubtotal,
          processedItems: result.processedItems,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get purchase order types dropdown
   */
  async getOrderTypesDropdown(req, res, next) {
    try {
      const orderTypes = [
        { value: "Single", label: "Single Purchase" },
        { value: "Bulk", label: "Bulk Purchase" },
      ];

      res.status(200).json({
        success: true,
        message: "Order types fetched successfully",
        data: orderTypes,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Receive a purchase order — create a receipt record
   * POST /api/purchase-orders/:id/receive
   */
  async receivePurchaseOrder(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const {
        receivedDate,
        actualDeliveryDate,
        receivedItems,
        notes,
        unitPrice,
        taxAmount,
        subtotal,
        totalValue,
        supplierInvoiceNo,
        purchaseType,
        placeOfSupply,
        itemDescription,
      } = req.body;

      if (
        !receivedItems ||
        !Array.isArray(receivedItems) ||
        receivedItems.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "receivedItems array is required and must not be empty",
        });
      }

      const result = await purchaseOrderService.receivePurchaseOrder(
        parseInt(id),
        {
          receivedDate,
          actualDeliveryDate,
          receivedItems,
          notes,
          unitPrice,
          taxAmount,
          subtotal,
          totalValue,
          supplierInvoiceNo,
          purchaseType,
          placeOfSupply,
          itemDescription,
          createdBy: userId,
        },
      );

      res.status(201).json({
        success: true,
        message: "Purchase order received successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all receipts for a purchase order
   * GET /api/purchase-orders/:id/receipts
   */
  async getPOReceipts(req, res, next) {
    try {
      const { id } = req.params;
      const result = await purchaseOrderService.getPOReceipts(parseInt(id));

      res.status(200).json({
        success: true,
        message: "Receipts fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update an existing receipt
   * PUT /api/purchase-orders/:id/receipts/:receiptId
   */
  async updateReceipt(req, res, next) {
    try {
      const { id, receiptId } = req.params;
      const userId = req.user?.id;
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const {
        receivedDate,
        actualDeliveryDate,
        receivedItems,
        notes,
        unitPrice,
        taxAmount,
        subtotal,
        totalValue,
        supplierInvoiceNo,
        purchaseType,
        placeOfSupply,
        itemDescription,
      } = req.body;

      if (
        !receivedItems ||
        !Array.isArray(receivedItems) ||
        receivedItems.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "receivedItems array is required and must not be empty",
        });
      }

      const result = await purchaseOrderService.updateReceipt(
        parseInt(id),
        parseInt(receiptId),
        {
          receivedDate,
          actualDeliveryDate,
          receivedItems,
          notes,
          unitPrice,
          taxAmount,
          subtotal,
          totalValue,
          supplierInvoiceNo,
          purchaseType,
          placeOfSupply,
          itemDescription,
          updatedBy: userId,
        },
      );

      res.status(200).json({
        success: true,
        message: "Receipt updated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new PurchaseOrderController();
