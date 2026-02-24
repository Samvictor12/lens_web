/**
 * Lens Tinting Master Controller
 * Handles HTTP requests for lens tinting management
 */

import LensTintingMasterService from "../services/lensTintingMasterService.js";
import {
  validateCreateLensTinting,
  validateUpdateLensTinting,
  validateIdParam,
  validateQueryParams,
} from "../dto/lensMastersDto.js";
import { APIError } from "../utils/errors.js";

const lensTintingService = new LensTintingMasterService();

/**
 * Create new lens tinting
 * @route POST /api/v1/lens-tintings
 */
export const createLensTinting = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new APIError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const validation = validateCreateLensTinting({
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

    const tinting = await lensTintingService.createLensTinting(validation.data);
    res.status(201).json({
      success: true,
      message: "Lens tinting created successfully",
      data: tinting,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all lens tintings with pagination
 * @route GET /api/v1/lens-tintings
 */
export const getAllLensTintings = async (req, res, next) => {
  try {
    const validation = validateQueryParams(req.query);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters",
        errors: validation.errors,
      });
    }

    const result = await lensTintingService.getAllLensTintings(validation.data);
    res.status(200).json({
      success: true,
      message: "Lens tintings retrieved successfully",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get lens tinting by ID
 * @route GET /api/v1/lens-tintings/:id
 */
export const getLensTintingById = async (req, res, next) => {
  try {
    const validation = validateIdParam(req.params.id);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID parameter",
        errors: validation.errors,
      });
    }

    const tinting = await lensTintingService.getLensTintingById(validation.id);
    res.status(200).json({
      success: true,
      message: "Lens tinting retrieved successfully",
      data: tinting,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update lens tinting
 * @route PUT /api/v1/lens-tintings/:id
 */
export const updateLensTinting = async (req, res, next) => {
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

    const validation = validateUpdateLensTinting({
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

    const tinting = await lensTintingService.updateLensTinting(
      idValidation.id,
      validation.data
    );
    res.status(200).json({
      success: true,
      message: "Lens tinting updated successfully",
      data: tinting,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete lens tinting (soft delete)
 * @route DELETE /api/v1/lens-tintings/:id
 */
export const deleteLensTinting = async (req, res, next) => {
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

    const tinting = await lensTintingService.deleteLensTinting(validation.id, userId);
    res.status(200).json({
      success: true,
      message: "Lens tinting deleted successfully",
      data: tinting,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get lens tintings for dropdown
 * @route GET /api/v1/lens-tintings/dropdown
 */
export const getLensTintingsDropdown = async (req, res, next) => {
  try {
    const filters = {
      name: req.query.name || undefined,
      short_name: req.query.short_name || undefined,
    };

    const tintings = await lensTintingService.getTintingDropdown(filters);
    res.status(200).json({
      success: true,
      message: "Lens tintings dropdown retrieved successfully",
      data: tintings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get lens tinting statistics
 * @route GET /api/v1/lens-tintings/statistics
 */
export const getLensTintingStatistics = async (req, res, next) => {
  try {
    const stats = await lensTintingService.getTintingStats();
    res.status(200).json({
      success: true,
      message: "Lens tinting statistics retrieved successfully",
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};
