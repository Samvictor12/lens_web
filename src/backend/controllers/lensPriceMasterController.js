/**
 * Lens Price Master Controller
 * Handles HTTP requests for lens pricing management
 */

import * as LensPriceService from '../services/lensPriceMasterService.js';
import { 
  validateCreateLensPrice, 
  validateUpdateLensPrice, 
  validateIdParam,
  validateQueryParams 
} from '../dto/lensMastersDto.js';
import { APIError } from '../utils/errors.js';

/**
 * Create new lens price
 * @route POST /api/v1/lens-prices
 */
export const createLensPrice = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new APIError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const validation = validateCreateLensPrice({ ...req.body, createdBy: userId });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    const price = await LensPriceService.createLensPrice(validation.data);
    res.status(201).json({
      success: true,
      message: 'Lens price created successfully',
      data: price
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all lens prices with pagination and filters
 * @route GET /api/v1/lens-prices
 */
export const getAllLensPrices = async (req, res, next) => {
  try {
    const validation = validateQueryParams(req.query);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: validation.errors
      });
    }

    const filters = {
      ...validation.data,
      lens_id: req.query.lens_id ? parseInt(req.query.lens_id) : undefined,
      coating_id: req.query.coating_id ? parseInt(req.query.coating_id) : undefined,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined
    };

    const result = await LensPriceService.getAllLensPrices(filters);
    res.status(200).json({
      success: true,
      message: 'Lens prices retrieved successfully',
      data: result.prices,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get lens price by ID
 * @route GET /api/v1/lens-prices/:id
 */
export const getLensPriceById = async (req, res, next) => {
  try {
    const validation = validateIdParam(req.params.id);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID parameter',
        errors: validation.errors
      });
    }

    const price = await LensPriceService.getLensPriceById(validation.id);
    res.status(200).json({
      success: true,
      message: 'Lens price retrieved successfully',
      data: price
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update lens price
 * @route PUT /api/v1/lens-prices/:id
 */
export const updateLensPrice = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
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

    const validation = validateUpdateLensPrice({ ...req.body, updatedBy: userId });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    const price = await LensPriceService.updateLensPrice(idValidation.id, validation.data);
    res.status(200).json({
      success: true,
      message: 'Lens price updated successfully',
      data: price
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete lens price (soft delete)
 * @route DELETE /api/v1/lens-prices/:id
 */
export const deleteLensPrice = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
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

    const price = await LensPriceService.deleteLensPrice(validation.id, userId);
    res.status(200).json({
      success: true,
      message: 'Lens price deleted successfully',
      data: price
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get lens prices for dropdown
 * @route GET /api/v1/lens-prices/dropdown
 */
export const getLensPricesDropdown = async (req, res, next) => {
  try {
    const prices = await LensPriceService.getLensPricesForDropdown();
    res.status(200).json({
      success: true,
      message: 'Lens prices dropdown retrieved successfully',
      data: prices
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get lens price statistics
 * @route GET /api/v1/lens-prices/statistics
 */
export const getLensPriceStatistics = async (req, res, next) => {
  try {
    const stats = await LensPriceService.getLensPriceStatistics();
    res.status(200).json({
      success: true,
      message: 'Lens price statistics retrieved successfully',
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get price for specific lens and coating combination
 * @route GET /api/v1/lens-prices/by-lens-coating
 */
export const getPriceByLensAndCoating = async (req, res, next) => {
  try {
    const lens_id = req.query.lens_id ? parseInt(req.query.lens_id) : null;
    const coating_id = req.query.coating_id ? parseInt(req.query.coating_id) : null;

    if (!lens_id || !coating_id) {
      return res.status(400).json({
        success: false,
        message: 'Both lens_id and coating_id are required'
      });
    }

    const price = await LensPriceService.getPriceByLensAndCoating(lens_id, coating_id);
    res.status(200).json({
      success: true,
      message: 'Price retrieved successfully',
      data: price
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all prices for a specific lens
 * @route GET /api/v1/lens-prices/by-lens/:lensId
 */
export const getPricesByLens = async (req, res, next) => {
  try {
    const validation = validateIdParam(req.params.lensId);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid lens ID parameter',
        errors: validation.errors
      });
    }

    const prices = await LensPriceService.getPricesByLens(validation.id);
    res.status(200).json({
      success: true,
      message: 'Prices for lens retrieved successfully',
      data: prices
    });
  } catch (error) {
    next(error);
  }
};
