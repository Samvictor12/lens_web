/**
 * Lens Product Master Controller
 * Handles HTTP requests for lens product management
 */

import * as LensProductService from '../services/lensProductMasterService.js';
import { 
  validateCreateLensProduct, 
  validateUpdateLensProduct, 
  validateIdParam,
  validateQueryParams 
} from '../dto/lensMastersDto.js';
import { APIError } from '../utils/errors.js';

/**
 * Create new lens product
 * @route POST /api/v1/lens-products
 */
export const createLensProduct = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new APIError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const validation = validateCreateLensProduct({ ...req.body, createdBy: userId });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    const product = await LensProductService.createLensProduct(validation.data);
    res.status(201).json({
      success: true,
      message: 'Lens product created successfully',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all lens products with pagination and filters
 * @route GET /api/v1/lens-products
 */
export const getAllLensProducts = async (req, res, next) => {
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
      brand_id: req.query.brand_id ? parseInt(req.query.brand_id) : undefined,
      category_id: req.query.category_id ? parseInt(req.query.category_id) : undefined,
      material_id: req.query.material_id ? parseInt(req.query.material_id) : undefined,
      type_id: req.query.type_id ? parseInt(req.query.type_id) : undefined,
      search: req.query.search
    };

    const result = await LensProductService.getAllLensProducts(filters);
    res.status(200).json({
      success: true,
      message: 'Lens products retrieved successfully',
      data: result.products,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get lens product by ID
 * @route GET /api/v1/lens-products/:id
 */
export const getLensProductById = async (req, res, next) => {
  try {
    const validation = validateIdParam(req.params.id);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID parameter',
        errors: validation.errors
      });
    }

    const product = await LensProductService.getLensProductById(validation.id);
    res.status(200).json({
      success: true,
      message: 'Lens product retrieved successfully',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update lens product
 * @route PUT /api/v1/lens-products/:id
 */
export const updateLensProduct = async (req, res, next) => {
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

    const validation = validateUpdateLensProduct({ ...req.body, updatedBy: userId });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    const product = await LensProductService.updateLensProduct(idValidation.id, validation.data);
    res.status(200).json({
      success: true,
      message: 'Lens product updated successfully',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete lens product (soft delete)
 * @route DELETE /api/v1/lens-products/:id
 */
export const deleteLensProduct = async (req, res, next) => {
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

    const product = await LensProductService.deleteLensProduct(validation.id, userId);
    res.status(200).json({
      success: true,
      message: 'Lens product deleted successfully',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get lens products for dropdown with optional filters
 * @route GET /api/v1/lens-products/dropdown
 */
export const getLensProductsDropdown = async (req, res, next) => {
  try {
    const filters = {
      brand_id: req.query.brand_id ? parseInt(req.query.brand_id) : undefined,
      category_id: req.query.category_id ? parseInt(req.query.category_id) : undefined,
      material_id: req.query.material_id ? parseInt(req.query.material_id) : undefined,
      type_id: req.query.type_id ? parseInt(req.query.type_id) : undefined
    };

    const products = await LensProductService.getLensProductsForDropdown(filters);
    res.status(200).json({
      success: true,
      message: 'Lens products dropdown retrieved successfully',
      data: products
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get lens product statistics
 * @route GET /api/v1/lens-products/statistics
 */
export const getLensProductStatistics = async (req, res, next) => {
  try {
    const stats = await LensProductService.getLensProductStatistics();
    res.status(200).json({
      success: true,
      message: 'Lens product statistics retrieved successfully',
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get products by category
 * @route GET /api/v1/lens-products/by-category/:categoryId
 */
export const getProductsByCategory = async (req, res, next) => {
  try {
    const validation = validateIdParam(req.params.categoryId);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID parameter',
        errors: validation.errors
      });
    }

    const products = await LensProductService.getProductsByCategory(validation.id);
    res.status(200).json({
      success: true,
      message: 'Products by category retrieved successfully',
      data: products
    });
  } catch (error) {
    next(error);
  }
};
