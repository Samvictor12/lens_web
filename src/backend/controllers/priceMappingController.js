import PriceMappingService from '../services/priceMappingService.js';

const priceMappingService = new PriceMappingService();

/**
 * Price Mapping Controller
 * Handles HTTP requests for bulk price mapping operations
 */
export class PriceMappingController {

  /**
   * Bulk create price mappings
   * POST /api/price-mappings/bulk
   */
  async bulkCreate(req, res, next) {
    try {
      const { customer_id, mappings } = req.body;
      const createdBy = req.user?.id || 1; // Get from auth middleware

      if (!customer_id) {
        return res.status(400).json({
          success: false,
          message: 'Customer ID is required'
        });
      }

      if (!mappings || !Array.isArray(mappings) || mappings.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Mappings array is required and must not be empty'
        });
      }

      // Validate each mapping has required fields
      for (const mapping of mappings) {
        if (!mapping.lensPrice_id) {
          return res.status(400).json({
            success: false,
            message: 'Each mapping must have lensPrice_id'
          });
        }
        if (mapping.discountRate !== undefined && (mapping.discountRate < 0 || mapping.discountRate > 100)) {
          return res.status(400).json({
            success: false,
            message: 'Discount rate must be between 0 and 100'
          });
        }
      }

      const result = await priceMappingService.bulkCreatePriceMappings({
        customer_id,
        mappings,
        createdBy
      });

      return res.status(201).json({
        success: true,
        message: 'Price mappings created successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk update price mappings
   * PUT /api/price-mappings/bulk
   */
  async bulkUpdate(req, res, next) {
    try {
      const { mappings } = req.body;
      const updatedBy = req.user?.id || 1; // Get from auth middleware

      if (!mappings || !Array.isArray(mappings) || mappings.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Mappings array is required and must not be empty'
        });
      }

      // Validate each mapping has required fields
      for (const mapping of mappings) {
        if (!mapping.id) {
          return res.status(400).json({
            success: false,
            message: 'Each mapping must have an id'
          });
        }
        if (mapping.discountRate === undefined) {
          return res.status(400).json({
            success: false,
            message: 'Each mapping must have discountRate'
          });
        }
        if (mapping.discountRate < 0 || mapping.discountRate > 100) {
          return res.status(400).json({
            success: false,
            message: 'Discount rate must be between 0 and 100'
          });
        }
      }

      const result = await priceMappingService.bulkUpdatePriceMappings({
        mappings,
        updatedBy
      });

      return res.status(200).json({
        success: true,
        message: 'Price mappings updated successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all price mappings with pagination and filtering
   * GET /api/price-mappings
   */
  async getAll(req, res, next) {
    try {
      const result = await priceMappingService.getPriceMappings(req.query);

      return res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get price mappings by customer ID
   * GET /api/price-mappings/customer/:customer_id
   */
  async getByCustomer(req, res, next) {
    try {
      const { customer_id } = req.params;

      const mappings = await priceMappingService.getPriceMappingsByCustomer(customer_id);

      return res.status(200).json({
        success: true,
        data: mappings,
        count: mappings.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single price mapping by ID
   * GET /api/price-mappings/:id
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;

      const mapping = await priceMappingService.getPriceMappingById(id);

      return res.status(200).json({
        success: true,
        data: mapping
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk delete price mappings
   * DELETE /api/price-mappings/bulk
   */
  async bulkDelete(req, res, next) {
    try {
      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'IDs array is required and must not be empty'
        });
      }

      const result = await priceMappingService.bulkDeletePriceMappings({ ids });

      return res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete all price mappings for a customer
   * DELETE /api/price-mappings/customer/:customer_id
   */
  async deleteByCustomer(req, res, next) {
    try {
      const { customer_id } = req.params;

      const result = await priceMappingService.deleteCustomerPriceMappings(customer_id);

      return res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk upsert price mappings (create or update)
   * POST /api/price-mappings/bulk/upsert
   */
  async bulkUpsert(req, res, next) {
    try {
      const { customer_id, mappings } = req.body;
      const createdBy = req.user?.id || 1; // Get from auth middleware
      const updatedBy = req.user?.id || 1;

      if (!customer_id) {
        return res.status(400).json({
          success: false,
          message: 'Customer ID is required'
        });
      }

      if (!mappings || !Array.isArray(mappings) || mappings.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Mappings array is required and must not be empty'
        });
      }

      // Validate each mapping
      for (const mapping of mappings) {
        if (!mapping.lensPrice_id) {
          return res.status(400).json({
            success: false,
            message: 'Each mapping must have lensPrice_id'
          });
        }
        if (mapping.discountRate !== undefined && (mapping.discountRate < 0 || mapping.discountRate > 100)) {
          return res.status(400).json({
            success: false,
            message: 'Discount rate must be between 0 and 100'
          });
        }
      }

      const result = await priceMappingService.bulkUpsertPriceMappings({
        customer_id,
        mappings,
        createdBy,
        updatedBy
      });

      return res.status(200).json({
        success: true,
        message: 'Price mappings upserted successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

export default PriceMappingController;
