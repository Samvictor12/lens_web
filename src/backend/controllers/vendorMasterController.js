import VendorMasterService from '../services/vendorMasterService.js';
import {
  validateCreateVendorMaster,
  validateUpdateVendorMaster,
  validateQueryParams,
  validateIdParam,
  validateCheckVendorEmail
} from '../dto/vendorMasterDto.js';
import { APIError } from '../middleware/errorHandler.js';

/**
 * Vendor Master Controller
 * Handles HTTP requests for Vendor Master operations
 */
export class VendorMasterController {
  constructor() {
    this.vendorMasterService = new VendorMasterService();
  }

  /**
   * Create a new vendor master
   * @route POST /api/vendor-master
   */
  async create(req, res, next) {
    try {
      // Validate request body
      const validation = validateCreateVendorMaster(req.body);
      
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        });
      }

      // Create vendor master
      const vendorMaster = await this.vendorMasterService.createVendorMaster(validation.data);

      res.status(201).json({
        success: true,
        data: vendorMaster
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get paginated list of vendor masters
   * @route GET /api/vendor-master
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

      // Get vendor masters with pagination
      const result = await this.vendorMasterService.getVendorMasters(validation.data);

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
   * Get vendor master by ID
   * @route GET /api/vendor-master/:id
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

      // Get vendor master by ID
      const vendorMaster = await this.vendorMasterService.getVendorMasterById(validation.data);

      res.json({
        success: true,
        data: vendorMaster
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update vendor master
   * @route PUT /api/vendor-master/:id
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
      const validation = validateUpdateVendorMaster(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        });
      }

      // Update vendor master
      const updatedVendor = await this.vendorMasterService.updateVendorMaster(idValidation.data, validation.data);

      res.json({
        success: true,
        data: updatedVendor
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete vendor master
   * @route DELETE /api/vendor-master/:id
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

      // Get updatedBy from request body or user context
      const updatedBy = req.body.updatedBy || req.user?.id;
      if (!updatedBy) {
        return res.status(400).json({
          success: false,
          message: 'Updated by user ID is required'
        });
      }

      // Delete vendor master
      await this.vendorMasterService.deleteVendorMaster(validation.data, updatedBy);

      res.json({
        success: true,
        message: 'Vendor master deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get vendor dropdown list
   * @route GET /api/vendor-master/dropdown
   */
  async getDropdown(req, res, next) {
    try {
      // Get vendor dropdown list
      const vendors = await this.vendorMasterService.getVendorDropdown();

      res.json({
        success: true,
        data: vendors
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check if vendor email exists
   * @route POST /api/vendor-master/check-email
   */
  async checkVendorEmail(req, res, next) {
    try {
      // Validate request body
      const validation = validateCheckVendorEmail(req.body);
      
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        });
      }

      const exists = await this.vendorMasterService.isVendorEmailExists(
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
   * Get vendor statistics
   * @route GET /api/vendor-master/stats
   */
  async getStats(req, res, next) {
    try {
      // This could be extended to include various vendor statistics
      const totalVendors = await this.vendorMasterService.getVendorMasters({ page: 1, limit: 1 });
      
      res.json({
        success: true,
        data: {
          totalVendors: totalVendors.pagination.total,
          // Add more statistics as needed
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

export default VendorMasterController;