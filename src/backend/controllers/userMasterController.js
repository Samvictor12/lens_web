import UserMasterService from '../services/userMasterService.js';
import {
  validateCreateUserMaster,
  validateUpdateUserMaster,
  validateQueryParams,
  validateIdParam,
  validateCheckUserEmail,
  validateCheckUserCode
} from '../dto/userMasterDto.js';
import { APIError } from '../middleware/errorHandler.js';

/**
 * User Master Controller
 * Handles HTTP requests for User Master operations
 */
export class UserMasterController {
  constructor() {
    this.userMasterService = new UserMasterService();
  }

  /**
   * Create a new user master
   * @route POST /api/user-master
   */
  async create(req, res, next) {
    try {
      // Validate request body
      const validation = validateCreateUserMaster(req.body);
      
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        });
      }

      // Create user master
      const userMaster = await this.userMasterService.createUserMaster(validation.data);

      res.status(201).json({
        success: true,
        data: userMaster
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get paginated list of user masters
   * @route GET /api/user-master
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

      // Get user masters with pagination
      const result = await this.userMasterService.getUserMasters(validation.data);

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
   * Get user master by ID
   * @route GET /api/user-master/:id
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

      // Get user master by ID
      const userMaster = await this.userMasterService.getUserMasterById(validation.data);

      res.json({
        success: true,
        data: userMaster
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user master
   * @route PUT /api/user-master/:id
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
      const validation = validateUpdateUserMaster(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        });
      }

      // Update user master
      const updatedUser = await this.userMasterService.updateUserMaster(idValidation.data, validation.data);

      res.json({
        success: true,
        data: updatedUser
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete user master
   * @route DELETE /api/user-master/:id
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

      // Delete user master
      await this.userMasterService.deleteUserMaster(validation.data, updatedBy);

      res.json({
        success: true,
        message: 'User master deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user dropdown list
   * @route GET /api/user-master/dropdown
   */
  async getDropdown(req, res, next) {
    try {
      // Get user dropdown list
      const users = await this.userMasterService.getUserDropdown();

      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check if user email exists
   * @route POST /api/user-master/check-email
   */
  async checkUserEmail(req, res, next) {
    try {
      // Validate request body
      const validation = validateCheckUserEmail(req.body);
      
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        });
      }

      const exists = await this.userMasterService.isUserEmailExists(
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
   * Check if user code exists
   * @route POST /api/user-master/check-usercode
   */
  async checkUserCode(req, res, next) {
    try {
      // Validate request body
      const validation = validateCheckUserCode(req.body);
      
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        });
      }

      const exists = await this.userMasterService.isUserCodeExists(
        validation.data.usercode, 
        validation.data.excludeId
      );

      res.json({
        success: true,
        data: {
          exists,
          usercode: validation.data.usercode
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get roles dropdown
   * @route GET /api/user-master/roles
   */
  async getRoles(req, res, next) {
    try {
      const roles = await this.userMasterService.getRolesDropdown();

      res.json({
        success: true,
        data: roles
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get departments dropdown
   * @route GET /api/user-master/departments
   */
  async getDepartments(req, res, next) {
    try {
      const departments = await this.userMasterService.getDepartmentsDropdown();

      res.json({
        success: true,
        data: departments
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user statistics
   * @route GET /api/user-master/stats
   */
  async getStats(req, res, next) {
    try {
      // This could be extended to include various user statistics
      const totalUsers = await this.userMasterService.getUserMasters({ page: 1, limit: 1 });
      
      res.json({
        success: true,
        data: {
          totalUsers: totalUsers.pagination.total,
          // Add more statistics as needed
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

export default UserMasterController;