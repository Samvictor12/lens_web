/**
 * Lens Type Master Controller
 * Handles HTTP requests for lens type management
 */

import LensTypeMasterService from "../services/lensTypeMasterService.js";
import {
  validateCreateLensType,
  validateUpdateLensType,
  validateIdParam,
  validateQueryParams,
} from "../dto/lensMastersDto.js";
import { APIError } from "../utils/errors.js";

const lensTypeService = new LensTypeMasterService();

/**
 * Create new lens type
 * @route POST /api/v1/lens-types
 */
export const createLensType = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new APIError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const validation = validateCreateLensType({
      ...req.body,
      createdBy: userId,
    });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    const type = await lensTypeService.createLensType(validation.data);
    res.status(201).json({
      success: true,
      message: "Lens type created successfully",
      data: type,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all lens types with pagination
 * @route GET /api/v1/lens-types
 */
export const getAllLensTypes = async (req, res, next) => {
  try {
    const validation = validateQueryParams(req.query);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters",
        errors: validation.errors,
      });
    }

    const result = await lensTypeService.getAllLensTypes(validation.data);
    res.status(200).json({
      success: true,
      message: "Lens types retrieved successfully",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get lens type by ID
 * @route GET /api/v1/lens-types/:id
 */
export const getLensTypeById = async (req, res, next) => {
  try {
    const validation = validateIdParam(req.params.id);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID parameter",
        errors: validation.errors,
      });
    }

    const type = await lensTypeService.getLensTypeById(validation.id);
    res.status(200).json({
      success: true,
      message: "Lens type retrieved successfully",
      data: type,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update lens type
 * @route PUT /api/v1/lens-types/:id
 */
export const updateLensType = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new APIError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const idValidation = validateIdParam(req.params.id);
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID parameter",
        errors: idValidation.errors,
      });
    }

    const validation = validateUpdateLensType({
      ...req.body,
      updatedBy: userId,
    });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    const type = await lensTypeService.updateLensType(
      idValidation.id,
      validation.data
    );
    res.status(200).json({
      success: true,
      message: "Lens type updated successfully",
      data: type,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete lens type (soft delete)
 * @route DELETE /api/v1/lens-types/:id
 */
export const deleteLensType = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new APIError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const validation = validateIdParam(req.params.id);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID parameter",
        errors: validation.errors,
      });
    }

    const type = await lensTypeService.deleteLensType(validation.id, userId);
    res.status(200).json({
      success: true,
      message: "Lens type deleted successfully",
      data: type,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get lens types for dropdown
 * @route GET /api/v1/lens-types/dropdown
 */
export const getLensTypesDropdown = async (req, res, next) => {
  try {
    const types = await lensTypeService.getLensTypesForDropdown();
    res.status(200).json({
      success: true,
      message: "Lens types dropdown retrieved successfully",
      data: types,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get lens type statistics
 * @route GET /api/v1/lens-types/statistics
 */
export const getLensTypeStatistics = async (req, res, next) => {
  try {
    const stats = await lensTypeService.getLensTypeStatistics();
    res.status(200).json({
      success: true,
      message: "Lens type statistics retrieved successfully",
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};
