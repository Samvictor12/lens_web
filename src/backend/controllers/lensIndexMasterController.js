import LensIndexMasterService from '../services/lensIndexMasterService.js';
import {
  validateCreateLensIndex,
  validateUpdateLensIndex,
  validateIdParam,
  validateQueryParams,
} from '../dto/lensMastersDto.js';
import { APIError } from '../utils/errors.js';

const lensIndexService = new LensIndexMasterService();

export const createLensIndex = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new APIError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const validation = validateCreateLensIndex({
      ...req.body,
      createdBy: userId,
    });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors,
      });
    }

    const index = await lensIndexService.createLensIndex(validation.data);
    res.status(201).json({
      success: true,
      message: 'Lens index created successfully',
      data: index,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllLensIndexes = async (req, res, next) => {
  try {
    const validation = validateQueryParams(req.query);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: validation.errors,
      });
    }

    const result = await lensIndexService.getAllLensIndexes(validation.data);
    res.status(200).json({
      success: true,
      message: 'Lens indexes retrieved successfully',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getLensIndexById = async (req, res, next) => {
  try {
    const validation = validateIdParam(req.params.id);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID parameter',
        errors: validation.errors,
      });
    }

    const index = await lensIndexService.getLensIndexById(validation.id);
    res.status(200).json({
      success: true,
      message: 'Lens index retrieved successfully',
      data: index,
    });
  } catch (error) {
    next(error);
  }
};

export const updateLensIndex = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new APIError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const idValidation = validateIdParam(req.params.id);
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID parameter',
        errors: idValidation.errors,
      });
    }

    const validation = validateUpdateLensIndex({
      ...req.body,
      updatedBy: userId,
    });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors,
      });
    }

    const index = await lensIndexService.updateLensIndex(idValidation.id, validation.data);
    res.status(200).json({
      success: true,
      message: 'Lens index updated successfully',
      data: index,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteLensIndex = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new APIError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const validation = validateIdParam(req.params.id);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID parameter',
        errors: validation.errors,
      });
    }

    await lensIndexService.deleteLensIndex(validation.id, userId);
    res.status(200).json({
      success: true,
      message: 'Lens index deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getLensIndexesDropdown = async (req, res, next) => {
  try {
    const indexes = await lensIndexService.getIndexDropdown();
    res.status(200).json({
      success: true,
      message: 'Lens indexes dropdown retrieved successfully',
      data: indexes,
    });
  } catch (error) {
    next(error);
  }
};

export const getLensIndexStatistics = async (req, res, next) => {
  try {
    const stats = await lensIndexService.getIndexStats();
    res.status(200).json({
      success: true,
      message: 'Lens index statistics retrieved successfully',
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};
