/**
 * Lens Product Master Controller
 * Handles HTTP requests for lens product management
 */

import LensProductMasterService from "../services/lensProductMasterService.js";
import {
  validateCreateLensProduct,
  validateUpdateLensProduct,
  validateIdParam,
  validateQueryParams,
} from "../dto/lensMastersDto.js";
import { APIError } from "../utils/errors.js";

const lensProductMasterService = new LensProductMasterService();

/**
 * Create new lens product
 * @route POST /api/v1/lens-products
 */
export const createLensProduct = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new APIError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const validation = validateCreateLensProduct({
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

    const product = await lensProductMasterService.createLensProduct(validation.data);
    res.status(201).json({
      success: true,
      message: "Lens product created successfully",
      data: product,
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
        message: "Invalid query parameters",
        errors: validation.errors,
      });
    }

    const filters = {
      ...validation.data,
      brand_id: req.query.brand_id ? parseInt(req.query.brand_id) : undefined,
      category_id: req.query.category_id
        ? parseInt(req.query.category_id)
        : undefined,
      material_id: req.query.material_id
        ? parseInt(req.query.material_id)
        : undefined,
      type_id: req.query.type_id ? parseInt(req.query.type_id) : undefined,
      search: req.query.search,
    };

    const result = await lensProductMasterService.getAllLensProducts(filters);
    res.status(200).json({
      success: true,
      message: "Lens products retrieved successfully",
      data: result.data,
      pagination: result.pagination,
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
        message: "Invalid ID parameter",
        errors: validation.errors,
      });
    }

    const product = await lensProductMasterService.getLensProductById(validation.id);
    res.status(200).json({
      success: true,
      message: "Lens product retrieved successfully",
      data: product,
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

    const validation = validateUpdateLensProduct({
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

    const product = await lensProductMasterService.updateLensProduct(
      idValidation.id,
      validation.data
    );
    res.status(200).json({
      success: true,
      message: "Lens product updated successfully",
      data: product,
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

    const product = await lensProductMasterService.deleteLensProduct(
      validation.id,
      userId
    );
    res.status(200).json({
      success: true,
      message: "Lens product deleted successfully",
      data: product,
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
      category_id: req.query.category_id
        ? parseInt(req.query.category_id)
        : undefined,
      material_id: req.query.material_id
        ? parseInt(req.query.material_id)
        : undefined,
      type_id: req.query.type_id ? parseInt(req.query.type_id) : undefined,
    };

    const products = await lensProductMasterService.getProductDropdown(
      filters
    );
    res.status(200).json({
      success: true,
      message: "Lens products dropdown retrieved successfully",
      data: products,
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
    const stats = await lensProductMasterService.getLensProductStatistics();
    res.status(200).json({
      success: true,
      message: "Lens product statistics retrieved successfully",
      data: stats,
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
        message: "Invalid category ID parameter",
        errors: validation.errors,
      });
    }

    const products = await lensProductMasterService.getProductsByCategory(
      validation.id
    );
    res.status(200).json({
      success: true,
      message: "Products by category retrieved successfully",
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add or update price for a specific lens-coating combination
 * @route POST /api/v1/lens-products/:lensId/prices/:coatingId
 */
export const addOrUpdateLensPrice = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new APIError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const lensIdValidation = validateIdParam(req.params.lensId);
    if (!lensIdValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid lens ID parameter",
        errors: lensIdValidation.errors,
      });
    }

    const coatingIdValidation = validateIdParam(req.params.coatingId);
    if (!coatingIdValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid coating ID parameter",
        errors: coatingIdValidation.errors,
      });
    }

    const { price } = req.body;
    if (
      price === undefined ||
      price === null ||
      typeof price !== "number" ||
      price < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid price is required",
        errors: [
          { field: "price", message: "Price must be a positive number" },
        ],
      });
    }

    const result = await lensProductMasterService.addOrUpdateLensPrice(
      lensIdValidation.id,
      coatingIdValidation.id,
      price,
      userId
    );

    res.status(200).json({
      success: true,
      message: "Lens price added/updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk add or update prices for a lens product
 * @route POST /api/v1/lens-products/:lensId/prices/bulk
 */
export const bulkAddOrUpdateLensPrices = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new APIError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const lensIdValidation = validateIdParam(req.params.lensId);
    if (!lensIdValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid lens ID parameter",
        errors: lensIdValidation.errors,
      });
    }

    const { prices } = req.body;
    if (!Array.isArray(prices) || prices.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Prices array is required and must not be empty",
        errors: [
          { field: "prices", message: "Prices must be a non-empty array" },
        ],
      });
    }

    // Validate each price object
    const errors = [];
    prices.forEach((price, index) => {
      if (!price.coating_id || typeof price.coating_id !== "number") {
        errors.push({
          field: `prices[${index}].coating_id`,
          message: "Coating ID is required",
        });
      }
      if (
        price.price === undefined ||
        typeof price.price !== "number" ||
        price.price < 0
      ) {
        errors.push({
          field: `prices[${index}].price`,
          message: "Price must be a positive number",
        });
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    const result = await lensProductMasterService.bulkAddOrUpdateLensPrices(
      lensIdValidation.id,
      prices,
      userId
    );

    res.status(200).json({
      success: true,
      message: `Bulk prices processed successfully. ${result.pricesProcessed} prices updated.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete price for a specific lens-coating combination
 * @route DELETE /api/v1/lens-products/:lensId/prices/:coatingId
 */
export const deleteLensPrice = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new APIError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const lensIdValidation = validateIdParam(req.params.lensId);
    if (!lensIdValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid lens ID parameter",
        errors: lensIdValidation.errors,
      });
    }

    const coatingIdValidation = validateIdParam(req.params.coatingId);
    if (!coatingIdValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid coating ID parameter",
        errors: coatingIdValidation.errors,
      });
    }

    await lensProductMasterService.deleteLensPrice(
      lensIdValidation.id,
      coatingIdValidation.id,
      userId
    );

    res.status(200).json({
      success: true,
      message: "Lens price deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all prices for a specific lens product
 * @route GET /api/v1/lens-products/:lensId/prices
 */
export const getLensPricesByLensId = async (req, res, next) => {
  try {
    const lensIdValidation = validateIdParam(req.params.lensId);
    if (!lensIdValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid lens ID parameter",
        errors: lensIdValidation.errors,
      });
    }

    const prices = await lensProductMasterService.getLensPricesByLensId(
      lensIdValidation.id
    );
    res.status(200).json({
      success: true,
      message: "Lens prices retrieved successfully",
      data: prices,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all products with their prices
 * @route GET /api/v1/lens-products/with-prices
 */
export const getProductsWithPrices = async (req, res, next) => {
  try {
    const validation = validateQueryParams(req.query);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters",
        errors: validation.errors,
      });
    }

    const filters = {
      ...validation.data,
      brand_id: req.query.brand_id ? parseInt(req.query.brand_id) : undefined,
      category_id: req.query.category_id
        ? parseInt(req.query.category_id)
        : undefined,
      material_id: req.query.material_id
        ? parseInt(req.query.material_id)
        : undefined,
      type_id: req.query.type_id ? parseInt(req.query.type_id) : undefined,
      search: req.query.search,
    };

    const result = await lensProductMasterService.getProductsWithPrices(filters);
    res.status(200).json({
      success: true,
      message: "Products with prices retrieved successfully",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Calculate product cost based on customer and price master
 * @route POST /api/v1/lens-products/calculate-cost
 */
export const calculateProductCost = async (req, res, next) => {
  try {
    const { customer_id, lensPrice_id, fitting_id, quantity } = req.body;

    // Validate required fields
    if (!customer_id) {
      return res.status(400).json({
        success: false,
        message: "Customer ID is required",
        errors: [{ field: "customer_id", message: "Customer ID is required" }],
      });
    }

    if (!lensPrice_id) {
      return res.status(400).json({
        success: false,
        message: "Lens Price ID is required",
        errors: [{ field: "lensPrice_id", message: "Lens Price ID is required" }],
      });
    }

    if (!fitting_id) {
      return res.status(400).json({
        success: false,
        message: "Fitting ID is required",
        errors: [{ field: "fitting_id", message: "Fitting ID is required" }],
      });
    }

    // Validate quantity if provided
    if (quantity !== undefined) {
      const qty = parseInt(quantity);
      if (isNaN(qty) || qty < 1) {
        return res.status(400).json({
          success: false,
          message: "Quantity must be a positive number",
          errors: [{ field: "quantity", message: "Quantity must be at least 1" }],
        });
      }
    }

    const result = await lensProductMasterService.calculateProductCost({
      customer_id: parseInt(customer_id),
      lensPrice_id: parseInt(lensPrice_id),
      fitting_id: parseInt(fitting_id),
      quantity: quantity ? parseInt(quantity) : 1,
    });

    res.status(200).json({
      success: true,
      message: "Product cost calculated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
