import SaleOrderService from '../services/saleOrderService.js';
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
      // Validate request body
      const validation = validateCreateSaleOrder(req.body);

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        });
      }

      const userId = req.user?.id || validation.data.createdBy;
      const saleOrder = await this.saleOrderService.createSaleOrder(validation.data, userId);

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

      const result = await this.saleOrderService.getSaleOrders(validation.data);

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

      const saleOrder = await this.saleOrderService.getSaleOrderById(validation.data);

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
      const validation = validateUpdateSaleOrder(req.body);

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
        userId
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
        userId
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
        userId
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
      await this.saleOrderService.deleteSaleOrder(validation.data, userId);

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
}

export default SaleOrderController;


