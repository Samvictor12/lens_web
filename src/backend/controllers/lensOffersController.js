/**
 * Lens Offers Controller
 * Handles HTTP requests for lens offer management
 */

import LensOffersService from "../services/lensOffersService.js";
import {
  validateCreateLensOffer,
  validateUpdateLensOffer,
  validateIdParam,
  validateQueryParams,
} from "../dto/lensMastersDto.js";
import { APIError } from "../utils/errors.js";

const lensOffersService = new LensOffersService();

/**
 * Create new lens offer
 * @route POST /api/v1/lens-offers
 */
export const createLensOffer = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new APIError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const validation = validateCreateLensOffer({
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

    const offer = await lensOffersService.createLensOffer(validation.data);
    res.status(201).json({
      success: true,
      message: "Lens offer created successfully",
      data: offer,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all lens offers with pagination
 * @route GET /api/v1/lens-offers
 */
export const getAllLensOffers = async (req, res, next) => {
  try {
    const validation = validateQueryParams(req.query);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters",
        errors: validation.errors,
      });
    }

    const result = await lensOffersService.getAllLensOffers(req.query);
    res.status(200).json({
      success: true,
      message: "Lens offers retrieved successfully",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get lens offer by ID
 * @route GET /api/v1/lens-offers/:id
 */
export const getLensOfferById = async (req, res, next) => {
  try {
    const validation = validateIdParam(req.params.id);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID parameter",
        errors: validation.errors,
      });
    }

    const offer = await lensOffersService.getLensOfferById(validation.data);
    res.status(200).json({
      success: true,
      message: "Lens offer retrieved successfully",
      data: offer,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update lens offer
 * @route PUT /api/v1/lens-offers/:id
 */
export const updateLensOffer = async (req, res, next) => {
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

    const validation = validateUpdateLensOffer({
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

    const offer = await lensOffersService.updateLensOffer(
      idValidation.data,
      validation.data
    );
    res.status(200).json({
      success: true,
      message: "Lens offer updated successfully",
      data: offer,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete lens offer (soft delete)
 * @route DELETE /api/v1/lens-offers/:id
 */
export const deleteLensOffer = async (req, res, next) => {
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

    await lensOffersService.deleteLensOffer(validation.data, userId);
    res.status(200).json({
      success: true,
      message: "Lens offer deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get currently active offers
 * @route GET /api/v1/lens-offers/active/list
 */
export const getActiveOffers = async (req, res, next) => {
  try {
    const offers = await lensOffersService.getActiveOffers();
    res.status(200).json({
      success: true,
      message: "Active offers retrieved successfully",
      data: offers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get applicable offers for lens/coating combination
 * @route GET /api/v1/lens-offers/applicable
 */
export const getApplicableOffers = async (req, res, next) => {
  try {
    const { lens_id, coating_id } = req.query;
    
    const offers = await lensOffersService.getApplicableOffers({
      lens_id,
      coating_id,
    });
    
    res.status(200).json({
      success: true,
      message: "Applicable offers retrieved successfully",
      data: offers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get offer dropdown list
 * @route GET /api/v1/lens-offers/dropdown
 */
export const getOfferDropdown = async (req, res, next) => {
  try {
    const offers = await lensOffersService.getOfferDropdown(req.query);
    res.status(200).json({
      success: true,
      message: "Offer dropdown retrieved successfully",
      data: offers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get offer statistics
 * @route GET /api/v1/lens-offers/stats
 */
export const getOfferStats = async (req, res, next) => {
  try {
    const stats = await lensOffersService.getOfferStats();
    res.status(200).json({
      success: true,
      message: "Offer statistics retrieved successfully",
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};
