import CustomerMasterService from '../services/customerMasterService.js';
import {
  validateCreateCustomerMaster,
  validateUpdateCustomerMaster,
  validateQueryParams,
  validateIdParam,
  validateCheckCustomerEmail
} from '../dto/customerMasterDto.js';
import { APIError } from '../middleware/errorHandler.js';

/**
 * Customer Master Controller
 * Handles HTTP requests for Customer Master operations
 */
export class CustomerMasterController {
  constructor() {
    this.customerMasterService = new CustomerMasterService();
  }

  /**
   * Create a new customer master
   * @route POST /api/customer-master
   */
  async create(req, res, next) {
    try {
      // Validate request body
      const validation = validateCreateCustomerMaster(req.body);
      
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        });
      }

      // Create customer master
      const customerMaster = await this.customerMasterService.createCustomerMaster(validation.data);

      res.status(201).json({
        success: true,
        data: customerMaster
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get paginated list of customer masters
   * @route GET /api/customer-master
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

      // Get customer masters with pagination
      const result = await this.customerMasterService.getCustomerMasters(validation.data);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get customer master by ID
   * @route GET /api/customer-master/:id
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

      // Get customer master by ID
      const customerMaster = await this.customerMasterService.getCustomerMasterById(validation.data);

      res.json({
        success: true,
        data: customerMaster
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update customer master
   * @route PUT /api/customer-master/:id
   */
  async update(req, res, next) {
    try {
      // Validate ID parameter
      const idValidation = validateIdParam(req.params.id);
      if (!idValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid ID parameter',
          errors: idValidation.errors
        });
      }

      // Validate request body
      const validation = validateUpdateCustomerMaster(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        });
      }

      // Update customer master
      const updatedCustomer = await this.customerMasterService.updateCustomerMaster(idValidation.data, validation.data);

      res.json({
        success: true,
        data: updatedCustomer
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete customer master
   * @route DELETE /api/customer-master/:id
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

      // Delete customer master
      await this.customerMasterService.deleteCustomerMaster(validation.data);

      res.json({
        success: true,
        message: 'Customer master deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get customer dropdown list
   * @route GET /api/customer-master/dropdown
   */
  async getDropdown(req, res, next) {
    try {
      // Get customer dropdown list
      const customers = await this.customerMasterService.getCustomerDropdown();

      res.json({
        success: true,
        data: customers
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check if customer email exists
   * @route POST /api/customer-master/check-email
   */
  async checkCustomerEmail(req, res, next) {
    try {
      // Validate request body
      const validation = validateCheckCustomerEmail(req.body);
      
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        });
      }

      const exists = await this.customerMasterService.isCustomerEmailExists(
        validation.data.email, 
        validation.data.excludeId
      );

      res.json({
        success: true,
        data: {
          exists,
          email: validation.data.email
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get customer statistics
   * @route GET /api/customer-master/stats
   */
  async getStats(req, res, next) {
    try {
      // This could be extended to include various customer statistics
      const totalCustomers = await this.customerMasterService.getCustomerMasters({ page: 1, limit: 1 });
      
      res.json({
        success: true,
        data: {
          totalCustomers: totalCustomers.pagination.total,
          // Add more statistics as needed
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

export default CustomerMasterController;