import BusinessCategoryService from '../services/businessCategory.service.js';

/**
 * Business Category Controller
 * Handles HTTP requests for Business Category operations
 */
export class BusinessCategoryController {
  constructor() {
    this.businessCategoryService = new BusinessCategoryService();
  }

  /**
   * Create a new business category
   * @route POST /api/business-category
   */
  async create(req, res, next) {
    try {
      const { name, active_status } = req.body;

      // Basic validation
      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Category name is required'
        });
      }

      const categoryData = {
        name: name.trim(),
        active_status: active_status !== undefined ? active_status : true,
        createdBy: 1, // TODO: Get from authenticated user
        updatedBy: 1  // TODO: Get from authenticated user
      };

      const category = await this.businessCategoryService.createBusinessCategory(categoryData);

      res.status(201).json({
        success: true,
        data: category
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get paginated list of business categories
   * @route GET /api/business-category
   */
  async list(req, res, next) {
    try {
      const result = await this.businessCategoryService.getBusinessCategories(req.query);

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single business category by ID
   * @route GET /api/business-category/:id
   */
  async getById(req, res, next) {
    try {
      const category = await this.businessCategoryService.getBusinessCategoryById(req.params.id);

      res.status(200).json({
        success: true,
        data: category
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update business category
   * @route PUT /api/business-category/:id
   */
  async update(req, res, next) {
    try {
      const { name, active_status } = req.body;

      // Basic validation
      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Category name is required'
        });
      }

      const categoryData = {
        name: name.trim(),
        active_status,
        updatedBy: 1 // TODO: Get from authenticated user
      };

      const category = await this.businessCategoryService.updateBusinessCategory(
        req.params.id,
        categoryData
      );

      res.status(200).json({
        success: true,
        data: category
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete business category (soft delete)
   * @route DELETE /api/business-category/:id
   */
  async delete(req, res, next) {
    try {
      const updatedBy = 1; // TODO: Get from authenticated user

      await this.businessCategoryService.deleteBusinessCategory(
        req.params.id,
        updatedBy
      );

      res.status(200).json({
        success: true,
        message: 'Business category deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get dropdown list of business categories
   * @route GET /api/business-category/dropdown
   */
  async dropdown(req, res, next) {
    try {
      const categories = await this.businessCategoryService.getBusinessCategoryDropdown();

      res.status(200).json({
        success: true,
        data: categories
      });
    } catch (error) {
      next(error);
    }
  }
}

export default BusinessCategoryController;
