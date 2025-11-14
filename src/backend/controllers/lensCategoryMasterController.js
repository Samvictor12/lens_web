/**
 * Lens Category Master Controller
 * Handles HTTP requests for lens category management
 */

import LensCategoryMasterService from "../services/lensCategoryMasterService.js";
import {
  validateCreateLensCategory,
  validateUpdateLensCategory,
  validateIdParam,
  validateQueryParams,
} from "../dto/lensMastersDto.js";
import { APIError } from "../utils/errors.js";

// Instantiate the service
const lensCategoryService = new LensCategoryMasterService();

/**
 * Create new lens category
 * @route POST /api/v1/lens-categories
 */
export const createLensCategory = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new APIError("Unauthorized", 401, "UNAUTHORIZED");
    }
    console.log("req.body", req.body);

    const validation = validateCreateLensCategory({
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

    const category = await lensCategoryService.createLensCategory(
      validation.data
    );
    res.status(201).json({
      success: true,
      message: "Lens category created successfully",
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all lens categories with pagination
 * @route GET /api/v1/lens-categories
 */
export const getAllLensCategories = async (req, res, next) => {
  try {
    const validation = validateQueryParams(req.query);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters",
        errors: validation.errors,
      });
    }

    const result = await lensCategoryService.getLensCategories(validation.data);
    res.status(200).json({
      success: true,
      message: "Lens categories retrieved successfully",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get lens category by ID
 * @route GET /api/v1/lens-categories/:id
 */
export const getLensCategoryById = async (req, res, next) => {
  try {
    const validation = validateIdParam(req.params.id);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID parameter",
        errors: validation.errors,
      });
    }

    const category = await lensCategoryService.getLensCategoryById(
      validation.id
    );
    res.status(200).json({
      success: true,
      message: "Lens category retrieved successfully",
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update lens category
 * @route PUT /api/v1/lens-categories/:id
 */
export const updateLensCategory = async (req, res, next) => {
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

    const validation = validateUpdateLensCategory({
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

    const category = await lensCategoryService.updateLensCategory(
      idValidation.id,
      validation.data
    );
    res.status(200).json({
      success: true,
      message: "Lens category updated successfully",
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete lens category (soft delete)
 * @route DELETE /api/v1/lens-categories/:id
 */
export const deleteLensCategory = async (req, res, next) => {
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

    const category = await lensCategoryService.deleteLensCategory(
      validation.id,
      userId
    );
    res.status(200).json({
      success: true,
      message: "Lens category deleted successfully",
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get lens categories for dropdown
 * @route GET /api/v1/lens-categories/dropdown
 */
export const getLensCategoriesDropdown = async (req, res, next) => {
  try {
    const categories = await lensCategoryService.getCategoryDropdown();
    res.status(200).json({
      success: true,
      message: "Lens categories dropdown retrieved successfully",
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get lens category statistics
 * @route GET /api/v1/lens-categories/statistics
 */
export const getLensCategoryStatistics = async (req, res, next) => {
  try {
    const stats = await lensCategoryService.getCategoryStats();
    res.status(200).json({
      success: true,
      message: "Lens category statistics retrieved successfully",
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};
