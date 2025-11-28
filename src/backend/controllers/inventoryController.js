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
   * Get inventory dashboard statistics
   * @route GET /api/inventory/dashboard
   */
  async getInventoryDashboard(req, res, next) {
    try {
      // This could be implemented to provide dashboard statistics
      // For now, return basic counts
      const stats = {
        totalItems: 0,
        availableItems: 0,
        reservedItems: 0,
        lowStockItems: 0
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
}

export default InventoryController;