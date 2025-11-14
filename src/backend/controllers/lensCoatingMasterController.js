/**
 * Lens Coating Master Controller
 * Handles HTTP requests for lens coating management
 */

import LensCoatingService from "../services/lensCoatingMasterService.js";
import {
  validateCreateLensCoating,
  validateUpdateLensCoating,
  validateIdParam,
  validateQueryParams,
} from "../dto/lensMastersDto.js";
import { APIError } from "../utils/errors.js";

const lensCoatingService = new LensCoatingService();

/**
 * Create new lens coating
 * @route POST /api/v1/lens-coatings
 */
export const createLensCoating = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new APIError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const validation = validateCreateLensCoating({
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

    const coating = await lensCoatingService.createLensCoating(validation.data);
    res.status(201).json({
      success: true,
      message: "Lens coating created successfully",
      data: coating,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all lens coatings with pagination
 * @route GET /api/v1/lens-coatings
 */
export const getAllLensCoatings = async (req, res, next) => {
  try {
    const validation = validateQueryParams(req.query);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters",
        errors: validation.errors,
      });
    }

    const result = await lensCoatingService.getAllLensCoatings(validation.data);
    res.status(200).json({
      success: true,
      message: "Lens coatings retrieved successfully",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get lens coating by ID
 * @route GET /api/v1/lens-coatings/:id
 */
export const getLensCoatingById = async (req, res, next) => {
  try {
    const validation = validateIdParam(req.params.id);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID parameter",
        errors: validation.errors,
      });
    }

    const coating = await lensCoatingService.getLensCoatingById(validation.id);
    res.status(200).json({
      success: true,
      message: "Lens coating retrieved successfully",
      data: coating,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update lens coating
 * @route PUT /api/v1/lens-coatings/:id
 */
export const updateLensCoating = async (req, res, next) => {
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

    const validation = validateUpdateLensCoating({
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

    const coating = await lensCoatingService.updateLensCoating(
      idValidation.id,
      validation.data
    );
    res.status(200).json({
      success: true,
      message: "Lens coating updated successfully",
      data: coating,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete lens coating (soft delete)
 * @route DELETE /api/v1/lens-coatings/:id
 */
export const deleteLensCoating = async (req, res, next) => {
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

    const coating = await lensCoatingService.deleteLensCoating(
      validation.id,
      userId
    );
    res.status(200).json({
      success: true,
      message: "Lens coating deleted successfully",
      data: coating,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get lens coatings for dropdown
 * @route GET /api/v1/lens-coatings/dropdown
 */
export const getLensCoatingsDropdown = async (req, res, next) => {
  try {
    const coatings = await lensCoatingService.getCoatingDropdown();
    res.status(200).json({
      success: true,
      message: "Lens coatings dropdown retrieved successfully",
      data: coatings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get lens coating statistics
 * @route GET /api/v1/lens-coatings/statistics
 */
export const getLensCoatingStatistics = async (req, res, next) => {
  try {
    const stats = await lensCoatingService.getCoatingStats();
    res.status(200).json({
      success: true,
      message: "Lens coating statistics retrieved successfully",
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};
