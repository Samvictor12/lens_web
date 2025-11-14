import LensFittingMasterService from '../services/lensFittingMasterService.js';

const lensFittingService = new LensFittingMasterService();

/**
 * Lens Fitting Master Controller
 * Handles HTTP requests for lens fitting types management
 */
export class LensFittingMasterController {

  /**
   * Create a new lens fitting type
   * POST /api/lens-fittings
   */
  async create(req, res, next) {
    try {
      const { name, short_name, description, activeStatus } = req.body;

      // Validation
      if (!name || !short_name) {
        return res.status(400).json({
          success: false,
          message: 'Name and short name are required'
        });
      }

      const userId = req.user?.id || 1; // Default to 1 if no auth

      const fittingData = {
        name: name.trim(),
        short_name: short_name.trim(),
        description: description?.trim(),
        activeStatus,
        createdBy: userId
      };

      const fitting = await lensFittingService.createLensFitting(fittingData);

      res.status(201).json({
        success: true,
        message: 'Lens fitting created successfully',
        data: fitting
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all lens fittings with pagination
   * GET /api/lens-fittings
   */
  async getAll(req, res, next) {
    try {
      const { page, limit, sortBy, sortOrder, search, activeStatus } = req.query;

      const result = await lensFittingService.getLensFittings({
        page,
        limit,
        sortBy,
        sortOrder,
        search,
        activeStatus
      });

      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a single lens fitting by ID
   * GET /api/lens-fittings/:id
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const fittingId = parseInt(id);

      if (isNaN(fittingId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid fitting ID'
        });
      }

      const fitting = await lensFittingService.getLensFittingById(fittingId);

      res.status(200).json({
        success: true,
        data: fitting
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a lens fitting
   * PUT /api/lens-fittings/:id
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const fittingId = parseInt(id);

      if (isNaN(fittingId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid fitting ID'
        });
      }

      const { name, short_name, description, activeStatus } = req.body;
      const userId = req.user?.id || 1;

      const updateData = {
        name: name?.trim(),
        short_name: short_name?.trim(),
        description: description?.trim(),
        activeStatus,
        updatedBy: userId
      };

      const updated = await lensFittingService.updateLensFitting(fittingId, updateData);

      res.status(200).json({
        success: true,
        message: 'Lens fitting updated successfully',
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a lens fitting (soft delete)
   * DELETE /api/lens-fittings/:id
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const fittingId = parseInt(id);

      if (isNaN(fittingId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid fitting ID'
        });
      }

      const userId = req.user?.id || 1;
      await lensFittingService.deleteLensFitting(fittingId, userId);

      res.status(200).json({
        success: true,
        message: 'Lens fitting deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get dropdown list of active fittings
   * GET /api/lens-fittings/dropdown
   */
  async getDropdown(req, res, next) {
    try {
      const fittings = await lensFittingService.getFittingDropdown();

      res.status(200).json({
        success: true,
        data: fittings
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get fitting statistics
   * GET /api/lens-fittings/stats
   */
  async getStats(req, res, next) {
    try {
      const stats = await lensFittingService.getFittingStats();

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
}

export default LensFittingMasterController;
