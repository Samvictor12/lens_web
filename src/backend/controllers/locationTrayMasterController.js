import locationTrayMasterService from '../services/locationTrayMasterService.js';
import {
  validateCreateLocationTray,
  validateUpdateLocationTray,
} from '../dto/inventoryMastersDto.js';
import { APIError } from '../utils/errors.js';

const validateIdParam = (id) => {
  const parsedId = parseInt(id, 10);
  if (isNaN(parsedId) || parsedId <= 0) {
    return { isValid: false, errors: [{ field: 'id', message: 'Invalid ID parameter' }] };
  }
  return { isValid: true, id: parsedId };
};

export const createLocationTray = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new APIError('Unauthorized', 401, 'UNAUTHORIZED');

    const { location_id, ...rest } = req.body;
    const validation = validateCreateLocationTray({
      ...rest,
      location_id: location_id ? parseInt(location_id, 10) : null,
      createdBy: userId,
    });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors,
      });
    }

    const row = await locationTrayMasterService.create(validation.data);
    res.status(201).json({
      success: true,
      message: 'Tray created successfully',
      data: row,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllLocationTrays = async (req, res, next) => {
  try {
    const result = await locationTrayMasterService.list(req.query);
    res.status(200).json({
      success: true,
      message: 'Trays retrieved successfully',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const getLocationTrayById = async (req, res, next) => {
  try {
    const idValidation = validateIdParam(req.params.id);
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: idValidation.errors,
      });
    }
    const row = await locationTrayMasterService.getById(idValidation.id);
    res.status(200).json({ success: true, data: row });
  } catch (error) {
    next(error);
  }
};

export const updateLocationTray = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new APIError('Unauthorized', 401, 'UNAUTHORIZED');

    const idValidation = validateIdParam(req.params.id);
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: idValidation.errors,
      });
    }

    const { location_id, ...rest } = req.body;
    const validation = validateUpdateLocationTray({
      ...rest,
      ...(location_id !== undefined
        ? { location_id: location_id ? parseInt(location_id, 10) : null }
        : {}),
      updatedBy: userId,
    });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors,
      });
    }

    const row = await locationTrayMasterService.update(idValidation.id, validation.data);
    res.status(200).json({
      success: true,
      message: 'Tray updated successfully',
      data: row,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteLocationTray = async (req, res, next) => {
  try {
    const idValidation = validateIdParam(req.params.id);
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: idValidation.errors,
      });
    }
    await locationTrayMasterService.delete(idValidation.id);
    res.status(200).json({ success: true, message: 'Tray deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getLocationTraysDropdown = async (req, res, next) => {
  try {
    const data = await locationTrayMasterService.dropdown(req.query.location_id || null);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
