import InventoryService from '../services/inventory.service.js';
import {
  validateCreateInventoryItem,
  validateCreateInventoryTransaction,
  validateQueryParams,
  validateIdParam
} from '../dto/inventoryDto.js';
import { APIError } from '../middleware/errorHandler.js';

/**
 * Inventory Controller
 * Handles HTTP requests for Inventory operations
 */
export class InventoryController {
  constructor() {
    this.inventoryService = new InventoryService();
  }

  /**
   * Create a new inventory item (inward entry)
   * @route POST /api/inventory/items
   */
  async createInventoryItem(req, res, next) {
    try {
      // Add user ID from auth middleware
      const requestData = { ...req.body, createdBy: req.user.id };
      
      // Validate request body
      const validation = validateCreateInventoryItem(requestData);

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        });
      }

      // Create inventory item
      const result = await this.inventoryService.createInventoryItem(validation.data);

      res.status(201).json({
        success: true,
        data: result,
        message: 'Inventory item created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk inward from power grid
   * @route POST /api/inventory/bulk-inward
   */
  async bulkInwardFromGrid(req, res, next) {
    try {
      const result = await this.inventoryService.bulkInwardFromGrid(req.body, req.user.id);
      res.status(201).json({
        success: true,
        data: result,
        message: `${result.createdCount} inventory item(s) created`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get paginated list of inventory items
   * @route GET /api/inventory/items
   */
  async getInventoryItems(req, res, next) {
    try {
      // Validate query parameters
      const validation = validateQueryParams(req.query);

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          errors: validation.errors
        });
      }

      // Get inventory items
      const result = await this.inventoryService.getInventoryItems(validation.data);

      res.json({
        success: true,
        data: result.inventoryItems,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get pending PO receipt inward queue for inventory users
   * @route GET /api/inventory/inward-queue
   */
  async getInventoryInwardQueue(req, res, next) {
    try {
      const validation = validateQueryParams(req.query);

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          errors: validation.errors,
        });
      }

      const result = await this.inventoryService.getInventoryInwardQueue(validation.data);

      res.json({
        success: true,
        data: result.queueItems,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get inventory item by ID
   * @route GET /api/inventory/items/:id
   */
  async getInventoryItemById(req, res, next) {
    try {
      // Validate ID parameter
      const validation = validateIdParam(req.params.id);

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid ID parameter',
          errors: validation.errors
        });
      }

      // Get inventory item
      const inventoryItem = await this.inventoryService.getInventoryItemById(validation.data.id);

      res.json({
        success: true,
        data: inventoryItem
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update inventory item
   * @route PUT /api/inventory/items/:id
   */
  async updateInventoryItem(req, res, next) {
    try {
      // Validate ID parameter
      const validation = validateIdParam(req.params.id);

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid ID parameter',
          errors: validation.errors
        });
      }

      // Add user ID for update tracking
      const updateData = { ...req.body, updatedBy: req.user.id };

      // Update inventory item
      const inventoryItem = await this.inventoryService.updateInventoryItem(
        validation.data.id,
        updateData
      );

      res.json({
        success: true,
        data: inventoryItem,
        message: 'Inventory item updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get paginated list of inventory transactions
   * @route GET /api/inventory/transactions
   */
  async getInventoryTransactions(req, res, next) {
    try {
      // Validate query parameters
      const validation = validateQueryParams(req.query);

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          errors: validation.errors
        });
      }

      // Get inventory transactions
      const result = await this.inventoryService.getInventoryTransactions(validation.data);

      res.json({
        success: true,
        data: result.transactions,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create inventory transaction (for stock movements)
   * @route POST /api/inventory/transactions
   */
  async createInventoryTransaction(req, res, next) {
    try {
      // Add user ID from auth middleware
      const requestData = { ...req.body, createdBy: req.user.id };
      
      // Validate request body
      const validation = validateCreateInventoryTransaction(requestData);

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        });
      }

      // Create inventory transaction
      const transaction = await this.inventoryService.createInventoryTransaction(validation.data);

      res.status(201).json({
        success: true,
        data: transaction,
        message: 'Inventory transaction created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get inventory stock summary
   * @route GET /api/inventory/stock
   */
  async getInventoryStock(req, res, next) {
    try {
      // Validate query parameters
      const validation = validateQueryParams(req.query);

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          errors: validation.errors
        });
      }

      // Get inventory stock
      const result = await this.inventoryService.getInventoryStock(validation.data);

      res.json({
        success: true,
        data: result.stockItems,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reserve inventory for sale order
   * @route POST /api/inventory/reserve
   */
  async reserveInventoryForSale(req, res, next) {
    try {
      const { inventoryItemId, quantity, saleOrderId } = req.body;

      if (!inventoryItemId || !quantity || !saleOrderId) {
        return res.status(400).json({
          success: false,
          message: 'inventoryItemId, quantity, and saleOrderId are required'
        });
      }

      const result = await this.inventoryService.reserveInventoryForSale(
        parseInt(inventoryItemId),
        parseFloat(quantity),
        parseInt(saleOrderId),
        req.user.id
      );

      res.json({
        success: true,
        data: result,
        message: 'Inventory reserved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get dropdown data for inventory forms
   * @route GET /api/inventory/dropdowns
   */
  async getInventoryDropdowns(req, res, next) {
    try {
      const dropdowns = await this.inventoryService.getInventoryDropdowns();

      res.json({
        success: true,
        data: dropdowns
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export stock grouped / pivot data
   * @route GET /api/inventory/stock-grouped/export
   */
  async exportInventoryStockGrouped(req, res, next) {
    try {
      const queryParams = {
        groupBy: req.query.groupBy || "pivot",
        search: req.query.search || "",
        productName: req.query.productName || "",
        locationName: req.query.locationName || "",
        Type_id: req.query.Type_id || req.query.typeId || null,
        coating_id: req.query.coating_id || req.query.coatingId || null,
        sph: req.query.sph || "",
        cyl: req.query.cyl || "",
        add: req.query.add || "",
      };
      await this.inventoryService.exportInventoryStockGrouped(queryParams, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get inventory dashboard statistics
   * @route GET /api/inventory/dashboard
   */
  async getInventoryDashboard(req, res, next) {
    try {
      const stats = await this.inventoryService.getInventoryDashboardEnhanced();
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get tray occupancy information
   * @route GET /api/v1/inventory/tray-occupancy/:trayId
   */
  async getTrayOccupancy(req, res, next) {
    try {
      const { trayId } = req.params;
      const occupancy = await this.inventoryService.getTrayOccupancy(
        parseInt(trayId)
      );
      res.json({
        success: true,
        data: occupancy,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get inventory stock with grouping support
   * @route GET /api/v1/inventory/stock-grouped
   */
  async getInventoryStockGrouped(req, res, next) {
    try {
      const queryParams = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        lens_id: req.query.lens_id ? parseInt(req.query.lens_id) : null,
        location_id: req.query.location_id
          ? parseInt(req.query.location_id)
          : null,
        tray_id: req.query.tray_id ? parseInt(req.query.tray_id) : null,
        category_id: req.query.category_id
          ? parseInt(req.query.category_id)
          : null,
        groupBy: req.query.groupBy || null,
        search: req.query.search || "",
        productName: req.query.productName || "",
        locationName: req.query.locationName || "",
        Type_id: req.query.Type_id || req.query.typeId || null,
        coating_id: req.query.coating_id || req.query.coatingId || null,
        sph: req.query.sph || "",
        cyl: req.query.cyl || "",
        add: req.query.add || "",
      };

      const result = await this.inventoryService.getInventoryStockWithGrouping(
        queryParams
      );
      res.json({
        success: true,
        data: result.data,
        grouping: result.grouping,
        total: result.total || 0,
        pagination: {
          page: queryParams.page,
          limit: queryParams.limit,
          total: result.total || 0,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get items below low stock threshold
   * @route GET /api/v1/inventory/low-stock-items
   */
  async getLowStockItems(req, res, next) {
    try {
      const lowStockItems = await this.inventoryService.getItemsBelowThreshold();
      res.json({
        success: true,
        data: lowStockItems,
        count: lowStockItems.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get stock value report
   * @route GET /api/v1/inventory/reports/value
   */
  async getStockValueReport(req, res, next) {
    try {
      const queryParams = {
        startDate: req.query.startDate || null,
        endDate: req.query.endDate || null,
        groupBy: req.query.groupBy || "lens_id",
      };

      const report = await this.inventoryService.getStockValueReport(
        queryParams
      );
      res.json({
        success: true,
        data: report.data,
        summary: report.summary,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Product spec inward trend for dashboard chart
   * @route GET /api/inventory/dashboard/spec-trend
   */
  async getProductSpecTrend(req, res, next) {
    try {
      const result = await this.inventoryService.getProductSpecTrend({
        from: req.query.from,
        to: req.query.to,
        Type_id: req.query.lensTypeId || req.query.Type_id,
      });
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Top / low selling products widget
   * @route GET /api/inventory/dashboard/top-selling
   */
  async getTopSellingProducts(req, res, next) {
    try {
      const result = await this.inventoryService.getTopSellingProducts({
        direction: req.query.direction || "top",
        limit: req.query.limit || 10,
        days: req.query.days || 30,
      });
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
}

export default InventoryController;