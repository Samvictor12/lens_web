/**
 * Lens Material Master Controller
 * Handles HTTP requests for lens material management
 */

import { LensMaterialMasterService } from '../services/lensMaterialMasterService.js';
import { 
  validateCreateLensMaterial, 
  validateUpdateLensMaterial, 
  validateIdParam,
  validateQueryParams 
} from '../dto/lensMastersDto.js';
import { APIError } from '../utils/errors.js';

const lensMaterialService = new LensMaterialMasterService();

/**
 * Create new lens material
 * @route POST /api/v1/lens-materials
 */
export const createLensMaterial = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new APIError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const validation = validateCreateLensMaterial({ ...req.body, createdBy: userId });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    const material = await lensMaterialService.createLensMaterial(validation.data);
    res.status(201).json({
      success: true,
      message: 'Lens material created successfully',
      data: material
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all lens materials with pagination
 * @route GET /api/v1/lens-materials
 */
export const getAllLensMaterials = async (req, res, next) => {
  try {
    const validation = validateQueryParams(req.query);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: validation.errors
      });
    }

    const result = await lensMaterialService.getLensMaterials(validation.data);
    res.status(200).json({
      success: true,
      message: 'Lens materials retrieved successfully',
      data: result.data,
      totalCount: result.pagination.total,
      page: result.pagination.page,
      pageSize: result.pagination.limit
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get lens material by ID
 * @route GET /api/v1/lens-materials/:id
 */
export const getLensMaterialById = async (req, res, next) => {
  try {
    const validation = validateIdParam(req.params.id);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID parameter',
        errors: validation.errors
      });
    }

    const material = await lensMaterialService.getLensMaterialById(validation.id);
    res.status(200).json({
      success: true,
      message: 'Lens material retrieved successfully',
      data: material
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update lens material
 * @route PUT /api/v1/lens-materials/:id
 */
export const updateLensMaterial = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new APIError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const idValidation = validateIdParam(req.params.id);
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID parameter',
        errors: idValidation.errors
      });
    }

    const validation = validateUpdateLensMaterial({ ...req.body, updatedBy: userId });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    const material = await lensMaterialService.updateLensMaterial(idValidation.id, validation.data);
    res.status(200).json({
      success: true,
      message: 'Lens material updated successfully',
      data: material
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete lens material (soft delete)
 * @route DELETE /api/v1/lens-materials/:id
 */
export const deleteLensMaterial = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new APIError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const validation = validateIdParam(req.params.id);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID parameter',
        errors: validation.errors
      });
    }

    const material = await lensMaterialService.deleteLensMaterial(validation.id, userId);
    res.status(200).json({
      success: true,
      message: 'Lens material deleted successfully',
      data: material
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get lens materials for dropdown
 * @route GET /api/v1/lens-materials/dropdown
 */
export const getLensMaterialsDropdown = async (req, res, next) => {
  try {
    const materials = await lensMaterialService.getLensMaterialsForDropdown();
    res.status(200).json({
      success: true,
      message: 'Lens materials dropdown retrieved successfully',
      data: materials
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get lens material statistics
 * @route GET /api/v1/lens-materials/statistics
 */
export const getLensMaterialStatistics = async (req, res, next) => {
  try {
    const stats = await lensMaterialService.getLensMaterialStatistics();
    res.status(200).json({
      success: true,
      message: 'Lens material statistics retrieved successfully',
      data: stats
    });
  } catch (error) {
    next(error);
  }
};
