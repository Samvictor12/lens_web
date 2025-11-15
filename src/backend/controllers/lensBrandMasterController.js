/**
 * Lens Brand Master Controller
 * Handles HTTP requests for lens brand management
 */

import LensBrandMasterService from "../services/lensBrandMasterService.js";
import {
  validateCreateLensBrand,
  validateUpdateLensBrand,
  validateIdParam,
  validateQueryParams,
} from "../dto/lensMastersDto.js";
import { APIError } from "../utils/errors.js";

const lensBrandService = new LensBrandMasterService();

/**
 * Create new lens brand
 * @route POST /api/v1/lens-brands
 */
export const createLensBrand = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new APIError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const validation = validateCreateLensBrand({
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

    const brand = await lensBrandService.createLensBrand(validation.data);
    res.status(201).json({
      success: true,
      message: "Lens brand created successfully",
      data: brand,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all lens brands with pagination
 * @route GET /api/v1/lens-brands
 */
export const getAllLensBrands = async (req, res, next) => {
  try {
    const validation = validateQueryParams(req.query);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters",
        errors: validation.errors,
      });
    }

    const result = await lensBrandService.getAllLensBrands(validation.data);
    res.status(200).json({
      success: true,
      message: "Lens brands retrieved successfully",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get lens brand by ID
 * @route GET /api/v1/lens-brands/:id
 */
export const getLensBrandById = async (req, res, next) => {
  try {
    const validation = validateIdParam(req.params.id);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID parameter",
        errors: validation.errors,
      });
    }

    const brand = await lensBrandService.getLensBrandById(validation.id);
    res.status(200).json({
      success: true,
      message: "Lens brand retrieved successfully",
      data: brand,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update lens brand
 * @route PUT /api/v1/lens-brands/:id
 */
export const updateLensBrand = async (req, res, next) => {
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

    const validation = validateUpdateLensBrand({
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

    const brand = await lensBrandService.updateLensBrand(
      idValidation.id,
      validation.data
    );
    res.status(200).json({
      success: true,
      message: "Lens brand updated successfully",
      data: brand,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete lens brand (soft delete)
 * @route DELETE /api/v1/lens-brands/:id
 */
export const deleteLensBrand = async (req, res, next) => {
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

    const brand = await lensBrandService.deleteLensBrand(validation.id, userId);
    res.status(200).json({
      success: true,
      message: "Lens brand deleted successfully",
      data: brand,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get lens brands for dropdown
 * @route GET /api/v1/lens-brands/dropdown
 */
export const getLensBrandsDropdown = async (req, res, next) => {
  try {
    const brands = await lensBrandService.getBrandDropdown();
    res.status(200).json({
      success: true,
      message: "Lens brands dropdown retrieved successfully",
      data: brands.data,
      totalCount: brands.pagination.total,
      page: brands.pagination.page,
      pageSize: brands.pagination.limit,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get lens brand statistics
 * @route GET /api/v1/lens-brands/statistics
 */
export const getLensBrandStatistics = async (req, res, next) => {
  try {
    const stats = await lensBrandService.getLensBrandStatistics();
    res.status(200).json({
      success: true,
      message: "Lens brand statistics retrieved successfully",
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};
