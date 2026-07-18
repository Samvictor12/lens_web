import SaleOrderService from '../services/saleOrderService.js';
import saleOrderStatusService from '../services/saleOrderStatusService.js';
import saleOrderWorkflowService from '../services/saleOrderWorkflowService.js';
import {
  validateCreateSaleOrder,
  validateUpdateSaleOrder,
  validateUpdateStatus,
  validateUpdateDispatchInfo,
  validateQueryParams,
  validateIdParam
} from '../dto/saleOrderDto.js';
import { APIError } from '../middleware/errorHandler.js';

/**
 * Sale Order Controller
 * Handles HTTP requests for sale order management
2 */
export class SaleOrderController {
  constructor() {
    this.saleOrderService = new SaleOrderService();
  }

  /**
   * Create a new sale order
   * POST /api/sale-orders
   */
  async create(req, res, next) {
    try {
      const data = { ...req.body, createdBy: req.user?.id };
      // Validate request body
      const validation = validateCreateSaleOrder(data);

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        });
      }

      const userId = req.user?.id || validation.data.createdBy;
      const saleOrder = await this.saleOrderService.createSaleOrder(validation.data, userId, req);

      res.status(201).json({
        success: true,
        message: 'Sale order created successfully',
        data: saleOrder
      });
    } catch (error) {
      next(error);
    }
  }

  /**
 * Get all sale orders with filtering and pagination
 * GET /api/sale-orders
 */
  async list(req, res, next) {
    try {
      // Validate query parameters
      const validation = validateQueryParams(req.query);

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        });
      }

      const userId = req.user?.id || null;
      const result = await this.saleOrderService.getSaleOrders(validation.data, req, userId);

      res.status(200).json({
        success: true,
        message: 'Sale orders retrieved successfully',
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check customer reference availability
   * GET /api/sale-orders/check-customer-ref
   */
  async checkCustomerRef(req, res, next) {
    try {
      const { ref, customerId, excludeId } = req.query;
      const result = await this.saleOrderService.checkCustomerRef(ref, customerId, excludeId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a single sale order by ID
   * GET /api/sale-orders/:id
   */
  async getById(req, res, next) {
    try {
      // Validate ID parameter
      const validation = validateIdParam(req.params.id);

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        });
      }

      const userId = req.user?.id || null;
      const saleOrder = await this.saleOrderService.getSaleOrderById(validation.data, req, userId);

      res.status(200).json({
        success: true,
        message: 'Sale order retrieved successfully',
        data: saleOrder
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a sale order
   * PUT /api/sale-orders/:id
   */
  async update(req, res, next) {
    try {
      const data = { ...req.body, updatedBy: req.user?.id };
      // Validate ID parameter
      const idValidation = validateIdParam(req.params.id);

      if (!idValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: idValidation.errors
        });
      }

      // Validate update data
      const validation = validateUpdateSaleOrder(data);

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        });
      }

      const userId = req.user?.id || validation.data.updatedBy;
      const saleOrder = await this.saleOrderService.updateSaleOrder(
        idValidation.data,
        validation.data,
        userId,
        req
      );

      res.status(200).json({
        success: true,
        message: 'Sale order updated successfully',
        data: saleOrder
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update sale order status
   * PATCH /api/sale-orders/:id/status
   */
  async updateStatus(req, res, next) {
    try {
      // Validate ID parameter
      const idValidation = validateIdParam(req.params.id);

      if (!idValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: idValidation.errors
        });
      }

      // Validate status data
      const validation = validateUpdateStatus(req.body);

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        });
      }

      const userId = req.user?.id || 1;
      const saleOrder = await this.saleOrderService.updateStatus(
        idValidation.data,
        validation.data.status,
        userId,
        req,
        validation.data.remark,
        validation.data.inventoryItemIds
      );

      res.status(200).json({
        success: true,
        message: 'Sale order status updated successfully',
        data: saleOrder
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Preview stock availability for SO lens specs (create / draft).
   * POST /api/sale-orders/preview-stock-availability
   */
  async previewStockAvailability(req, res, next) {
    try {
      const data = await this.saleOrderService.previewStockAvailability(req.body || {});
      res.status(200).json({
        success: true,
        message: 'Stock availability preview retrieved successfully',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get matching available inventory items on a FIFO basis for a sale order
   * GET /api/sale-orders/:id/fifo-matches
   */
  async getFifoMatches(req, res, next) {
    try {
      // Validate ID parameter
      const idValidation = validateIdParam(req.params.id);

      if (!idValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: idValidation.errors
        });
      }

      const matches = await this.saleOrderService.getMatchingInventoryFIFO(idValidation.data);

      res.status(200).json({
        success: true,
        message: 'FIFO matches retrieved successfully',
        data: matches
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update sale order dispatch information
   * PATCH /api/sale-orders/:id/dispatch
   */
  async updateDispatchInfo(req, res, next) {
    try {
      // Validate ID parameter
      const idValidation = validateIdParam(req.params.id);

      if (!idValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: idValidation.errors
        });
      }

      // Validate dispatch data
      const validation = validateUpdateDispatchInfo(req.body);

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        });
      }

      const userId = req.user?.id || 1;
      const saleOrder = await this.saleOrderService.updateDispatchInfo(
        idValidation.data,
        validation.data,
        userId,
        req
      );

      res.status(200).json({
        success: true,
        message: 'Sale order dispatch information updated successfully',
        data: saleOrder
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a sale order (soft delete)
   * DELETE /api/sale-orders/:id
   */
  async delete(req, res, next) {
    try {
      // Validate ID parameter
      const validation = validateIdParam(req.params.id);

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        });
      }

      const userId = req.user?.id || 1;
      await this.saleOrderService.deleteSaleOrder(validation.data, userId, req);

      res.status(200).json({
        success: true,
        message: 'Sale order deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get sale order statistics
   * GET /api/sale-orders/stats
   */
  async getStats(req, res, next) {
    try {
      const stats = await this.saleOrderService.getStatistics(req.query);

      res.status(200).json({
        success: true,
        message: 'Sale order statistics retrieved successfully',
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get sale orders dropdown options
   * GET /api/sale-orders/dropdown
   */
  async getDropdown(req, res, next) {
    try {
      const userId = req.user?.id;
      const dropdownData = await this.saleOrderService.getSaleOrdersDropdown(req, userId);

      res.status(200).json({
        success: true,
        message: 'Sale orders dropdown retrieved successfully',
        data: dropdownData
      });
    } catch (error) {
      next(error);
    }
  }
  /**
   * Get sale orders dropdown options
   * GET /api/sale-orders/dropdown
   */
  async getDropdown(req, res, next) {
    try {
      const userId = req.user?.id;
      const dropdownData = await this.saleOrderService.getSaleOrdersDropdown(req, userId);

      res.status(200).json({
        success: true,
        message: 'Sale orders dropdown retrieved successfully',
        data: dropdownData
      });
    } catch (error) {
      next(error);
    }
  }
  /**
   * Close an existing sale order and create a new duplicate as its parent
   * POST /api/sale-orders/:id/close-and-create
   */
  async closeAndCreate(req, res, next) {
    try {
      const validation = validateIdParam(req.params.id);

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        });
      }

      const userId = req.user?.id || 1;
      const result = await this.saleOrderService.closeAndCreateSaleOrder(
        validation.data,
        userId,
        req
      );

      res.status(201).json({
        success: true,
        message: 'Sale order closed and new order created successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getStatusLog(req, res, next) {
    try {
      const validation = validateIdParam(req.params.id);
      if (!validation.isValid) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: validation.errors });
      }
      const data = await saleOrderStatusService.getStatusLog(validation.data);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async raisePo(req, res, next) {
    try {
      const validation = validateIdParam(req.params.id);
      if (!validation.isValid) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: validation.errors });
      }
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const source = req.body?.source === 'INVENTORY' ? 'INVENTORY' : 'USER';
      const vendorId = req.body?.vendorId;
      const options = { source, vendorId };
      if (req.body?.rightEye !== undefined && req.body?.rightEye !== null) {
        options.rightEye = Boolean(req.body.rightEye);
      }
      if (req.body?.leftEye !== undefined && req.body?.leftEye !== null) {
        options.leftEye = Boolean(req.body.leftEye);
      }
      // When only one eye key is sent, treat the other as explicitly false
      if (
        (options.rightEye !== undefined && options.leftEye === undefined) ||
        (options.leftEye !== undefined && options.rightEye === undefined)
      ) {
        if (options.rightEye === undefined) options.rightEye = false;
        if (options.leftEye === undefined) options.leftEye = false;
      }
      const po = await saleOrderWorkflowService.raisePoFromSo(validation.data, userId, options);
      res.status(201).json({ success: true, message: 'PO raised', data: po });
    } catch (error) {
      next(error);
    }
  }

  async linkPo(req, res, next) {
    try {
      const validation = validateIdParam(req.params.id);
      if (!validation.isValid) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: validation.errors });
      }
      const poId = parseInt(req.body?.poId, 10);
      if (!poId) return res.status(400).json({ success: false, message: 'poId is required' });
      const userId = req.user?.id || 1;
      const po = await saleOrderWorkflowService.linkPoToSo(validation.data, poId, userId);
      res.status(200).json({ success: true, message: 'PO linked', data: po });
    } catch (error) {
      next(error);
    }
  }

  async confirmReset(req, res, next) {
    try {
      const validation = validateIdParam(req.params.id);
      if (!validation.isValid) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: validation.errors });
      }
      const userId = req.user?.id || 1;
      const order = await saleOrderStatusService.confirmReset(validation.data, userId, req.body?.remark, req);
      res.status(200).json({ success: true, message: 'Sale order reset to Draft', data: order });
    } catch (error) {
      next(error);
    }
  }

  async getInventoryQueue(req, res, next) {
    try {
      const result = await saleOrderWorkflowService.getInventoryQueue(req.query);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async issueToPreQc(req, res, next) {
    try {
      const validation = validateIdParam(req.params.id);
      if (!validation.isValid) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: validation.errors });
      }
      const userId = req.user?.id || 1;
      const order = await saleOrderWorkflowService.issueToPreQc(validation.data, userId, {
        inventoryItemIds: req.body?.inventoryItemIds,
      });
      res.status(200).json({ success: true, message: 'Issued to Pre-QC', data: order });
    } catch (error) {
      next(error);
    }
  }

  async cancelSaleOrder(req, res, next) {
    try {
      const validation = validateIdParam(req.params.id);
      if (!validation.isValid) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: validation.errors });
      }
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const order = await saleOrderWorkflowService.cancelSaleOrder(
        validation.data,
        userId,
        req.body?.remark
      );
      res.status(200).json({ success: true, message: 'Sale order cancelled', data: order });
    } catch (error) {
      next(error);
    }
  }
}

export default SaleOrderController;


