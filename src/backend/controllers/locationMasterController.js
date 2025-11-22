/**
 * Location Master Controller
 * Handles HTTP requests for location management
 */

import LocationMasterService from "../services/locationMasterService.js";
import {
  validateCreateLocation,
  validateUpdateLocation,
} from "../dto/inventoryMastersDto.js";
import { APIError } from "../utils/errors.js";

// Instantiate the service
const locationService = new LocationMasterService();

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
 * Create new location
 * @route POST /api/v1/location-master
 */
export const createLocation = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new APIError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const validation = validateCreateLocation({
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

    const location = await locationService.createLocation(validation.data);
    res.status(201).json({
      success: true,
      message: "Location created successfully",
      data: location,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all locations with pagination
 * @route GET /api/v1/location-master
 */
export const getAllLocations = async (req, res, next) => {
  try {
    const validation = validateQueryParams(req.query);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters",
        errors: validation.errors,
      });
    }

    const result = await locationService.getLocations(validation.data);
    res.status(200).json({
      success: true,
      message: "Locations retrieved successfully",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get location by ID
 * @route GET /api/v1/location-master/:id
 */
export const getLocationById = async (req, res, next) => {
  try {
    const validation = validateIdParam(req.params.id);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID parameter",
        errors: validation.errors,
      });
    }

    const location = await locationService.getLocationById(validation.id);
    res.status(200).json({
      success: true,
      message: "Location retrieved successfully",
      data: location,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update location
 * @route PUT /api/v1/location-master/:id
 */
export const updateLocation = async (req, res, next) => {
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

    const validation = validateUpdateLocation({
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

    const location = await locationService.updateLocation(
      idValidation.id,
      validation.data
    );
    res.status(200).json({
      success: true,
      message: "Location updated successfully",
      data: location,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete location (soft delete)
 * @route DELETE /api/v1/location-master/:id
 */
export const deleteLocation = async (req, res, next) => {
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

    await locationService.deleteLocation(validation.id, userId);
    res.status(200).json({
      success: true,
      message: "Location deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get locations for dropdown
 * @route GET /api/v1/location-master/dropdown
 */
export const getLocationsDropdown = async (req, res, next) => {
  try {
    const locations = await locationService.getLocationDropdown();
    res.status(200).json({
      success: true,
      message: "Locations dropdown retrieved successfully",
      data: locations,
    });
  } catch (error) {
    next(error);
  }
};
