/**
 * Tray Master Controller
 * Handles HTTP requests for tray management
 */

import TrayMasterService from "../services/trayMasterService.js";
import {
  validateCreateTray,
  validateUpdateTray,
} from "../dto/inventoryMastersDto.js";
import { APIError } from "../utils/errors.js";

// Instantiate the service
const trayService = new TrayMasterService();

/**
 * Validate ID parameter
 */
const validateIdParam = (id) => {
  const parsedId = parseInt(id);
  if (isNaN(parsedId) || parsedId <= 0) {
    return { isValid: false, errors: [{ field: 'id', message: 'Invalid ID parameter' }] };
  }
  return { isValid: true, id: parsedId };
};

/**
 * Validate query parameters
 */
const validateQueryParams = (params) => {
  return { isValid: true, data: params };
};

/**
 * Create new tray
 * @route POST /api/v1/tray-master
 */
export const createTray = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new APIError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const { capacity, location_id, ...rest } = req.body;
    
    const validation = validateCreateTray({
      ...rest,
      capacity: capacity ? parseInt(capacity) : null,
      location_id: location_id ? parseInt(location_id) : null,
      createdBy: userId,
    });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    const tray = await trayService.createTray(validation.data);
    res.status(201).json({
      success: true,
      message: "Tray created successfully",
      data: tray,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all trays with pagination
 * @route GET /api/v1/tray-master
 */
export const getAllTrays = async (req, res, next) => {
  try {
    const validation = validateQueryParams(req.query);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters",
        errors: validation.errors,
      });
    }

    const result = await trayService.getTrays(validation.data);
    res.status(200).json({
      success: true,
      message: "Trays retrieved successfully",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get tray by ID
 * @route GET /api/v1/tray-master/:id
 */
export const getTrayById = async (req, res, next) => {
  try {
    const validation = validateIdParam(req.params.id);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID parameter",
        errors: validation.errors,
      });
    }

    const tray = await trayService.getTrayById(validation.id);
    res.status(200).json({
      success: true,
      message: "Tray retrieved successfully",
      data: tray,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update tray
 * @route PUT /api/v1/tray-master/:id
 */
export const updateTray = async (req, res, next) => {
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

    const { capacity, location_id, ...rest } = req.body;
    
    const validation = validateUpdateTray({
      ...rest,
      capacity: capacity !== undefined ? (capacity ? parseInt(capacity) : null) : undefined,
      location_id: location_id !== undefined ? (location_id ? parseInt(location_id) : null) : undefined,
      updatedBy: userId,
    });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    const tray = await trayService.updateTray(
      idValidation.id,
      validation.data
    );
    res.status(200).json({
      success: true,
      message: "Tray updated successfully",
      data: tray,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete tray (soft delete)
 * @route DELETE /api/v1/tray-master/:id
 */
export const deleteTray = async (req, res, next) => {
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

    await trayService.deleteTray(validation.id, userId);
    res.status(200).json({
      success: true,
      message: "Tray deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get trays for dropdown
 * @route GET /api/v1/tray-master/dropdown
 */
export const getTraysDropdown = async (req, res, next) => {
  try {
    const { location_id } = req.query;
    const trays = await trayService.getTrayDropdown(
      location_id ? parseInt(location_id) : null
    );
    res.status(200).json({
      success: true,
      message: "Trays dropdown retrieved successfully",
      data: trays,
    });
  } catch (error) {
    next(error);
  }
};
