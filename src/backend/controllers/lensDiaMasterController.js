import LensDiaMasterService from '../services/lensDiaMasterService.js';

const lensDiaService = new LensDiaMasterService();

/**
 * Lens Dia (Diameter) Master Controller
 * Handles HTTP requests for lens diameter types management
 */
export class LensDiaMasterController {

  /**
   * Create a new lens diameter type
   * POST /api/lens-dias
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

      const diaData = {
        name: name.trim(),
        short_name: short_name.trim(),
        description: description?.trim(),
        activeStatus,
        createdBy: userId
      };

      const dia = await lensDiaService.createLensDia(diaData);

      res.status(201).json({
        success: true,
        message: 'Lens diameter created successfully',
        data: dia
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all lens diameters with pagination
   * GET /api/lens-dias
   */
  async getAll(req, res, next) {
    try {
      const { page, limit, sortBy, sortOrder, search, activeStatus } = req.query;

      const result = await lensDiaService.getLensDias({
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
   * Get a single lens diameter by ID
   * GET /api/lens-dias/:id
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const diaId = parseInt(id);

      if (isNaN(diaId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid diameter ID'
        });
      }

      const dia = await lensDiaService.getLensDiaById(diaId);

      res.status(200).json({
        success: true,
        data: dia
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a lens diameter
   * PUT /api/lens-dias/:id
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const diaId = parseInt(id);

      if (isNaN(diaId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid diameter ID'
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

      const updated = await lensDiaService.updateLensDia(diaId, updateData);

      res.status(200).json({
        success: true,
        message: 'Lens diameter updated successfully',
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a lens diameter (soft delete)
   * DELETE /api/lens-dias/:id
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const diaId = parseInt(id);

      if (isNaN(diaId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid diameter ID'
        });
      }

      const userId = req.user?.id || 1;
      await lensDiaService.deleteLensDia(diaId, userId);

      res.status(200).json({
        success: true,
        message: 'Lens diameter deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get dropdown list of active diameters
   * GET /api/lens-dias/dropdown
   */
  async getDropdown(req, res, next) {
    try {
      const dias = await lensDiaService.getDiaDropdown();

      res.status(200).json({
        success: true,
        data: dias
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get diameter statistics
   * GET /api/lens-dias/stats
   */
  async getStats(req, res, next) {
    try {
      const stats = await lensDiaService.getDiaStats();

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
}

export default LensDiaMasterController;
