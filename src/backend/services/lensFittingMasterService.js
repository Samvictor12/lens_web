import prisma from '../config/prisma.js';
import { APIError } from '../middleware/errorHandler.js';

/**
 * Lens Fitting Master Service
 * Handles business logic for lens fitting types (e.g., Standard, Premium, Custom)
 */
export class LensFittingMasterService {
  
  /**
   * Create a new lens fitting type
   * @param {Object} fittingData - Fitting data including name, short_name, description
   * @returns {Promise<Object>} Created fitting record
   */
  async createLensFitting(fittingData) {
    try {
      // Check for duplicate name
      const existingFitting = await prisma.lensFittingMaster.findUnique({
        where: { name: fittingData.name }
      });

      if (existingFitting) {
        throw new APIError('Fitting name already exists', 409, 'DUPLICATE_NAME');
      }

      const fitting = await prisma.lensFittingMaster.create({
        data: {
          name: fittingData.name,
          short_name: fittingData.short_name,
          description: fittingData.description,
          activeStatus: fittingData.activeStatus ?? true,
          deleteStatus: false,
          createdBy: fittingData.createdBy,
          updatedBy: fittingData.createdBy
        },
        include: {
          Usercreated: { select: { id: true, name: true, email: true } }
        }
      });

      return fitting;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Error creating lens fitting:', error);
      throw new APIError('Failed to create lens fitting', 500, 'CREATE_FITTING_ERROR');
    }
  }

  /**
   * Get all lens fittings with pagination and filtering
   * @param {Object} queryParams - Query parameters (page, limit, search, activeStatus, sortBy, sortOrder)
   * @returns {Promise<Object>} Paginated fitting list
   */
  async getLensFittings(queryParams) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        sortBy = 'createdAt', 
        sortOrder = 'desc', 
        search, 
        activeStatus 
      } = queryParams;
      
      const where = { deleteStatus: false };
      
      // Search across name, short_name, and description
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { short_name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }
      
      // Filter by active status
      if (activeStatus !== undefined) {
        where.activeStatus = activeStatus === 'true';
      }

      const offset = (page - 1) * limit;
      const total = await prisma.lensFittingMaster.count({ where });

      const fittings = await prisma.lensFittingMaster.findMany({
        where,
        skip: offset,
        take: parseInt(limit),
        orderBy: { [sortBy]: sortOrder },
        include: {
          Usercreated: { select: { id: true, name: true } },
          Userupdated: { select: { id: true, name: true } }
        }
      });

      return {
        data: fittings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error fetching lens fittings:', error);
      throw new APIError('Failed to fetch lens fittings', 500, 'FETCH_FITTINGS_ERROR');
    }
  }

  /**
   * Get a single lens fitting by ID
   * @param {number} id - Fitting ID
   * @returns {Promise<Object>} Fitting record
   */
  async getLensFittingById(id) {
    try {
      const fitting = await prisma.lensFittingMaster.findUnique({
        where: { id },
        include: {
          Usercreated: { select: { id: true, name: true, email: true } },
          Userupdated: { select: { id: true, name: true, email: true } }
        }
      });

      if (!fitting || fitting.deleteStatus) {
        throw new APIError('Lens fitting not found', 404, 'FITTING_NOT_FOUND');
      }

      return fitting;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Error fetching lens fitting:', error);
      throw new APIError('Failed to fetch lens fitting', 500, 'FETCH_FITTING_ERROR');
    }
  }

  /**
   * Update an existing lens fitting
   * @param {number} id - Fitting ID
   * @param {Object} updateData - Updated fitting data
   * @returns {Promise<Object>} Updated fitting record
   */
  async updateLensFitting(id, updateData) {
    try {
      // Check if fitting exists
      const existing = await prisma.lensFittingMaster.findUnique({ where: { id } });

      if (!existing || existing.deleteStatus) {
        throw new APIError('Lens fitting not found', 404, 'FITTING_NOT_FOUND');
      }

      // Check for duplicate name (if name is being changed)
      if (updateData.name && updateData.name !== existing.name) {
        const duplicate = await prisma.lensFittingMaster.findFirst({
          where: { name: updateData.name, id: { not: id }, deleteStatus: false }
        });

        if (duplicate) {
          throw new APIError('Fitting name already exists', 409, 'DUPLICATE_NAME');
        }
      }

      const updated = await prisma.lensFittingMaster.update({
        where: { id },
        data: {
          name: updateData.name,
          short_name: updateData.short_name,
          description: updateData.description,
          activeStatus: updateData.activeStatus,
          updatedBy: updateData.updatedBy
        },
        include: {
          Usercreated: { select: { id: true, name: true } },
          Userupdated: { select: { id: true, name: true } }
        }
      });

      return updated;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Error updating lens fitting:', error);
      throw new APIError('Failed to update lens fitting', 500, 'UPDATE_FITTING_ERROR');
    }
  }

  /**
   * Soft delete a lens fitting
   * @param {number} id - Fitting ID
   * @param {number} updatedBy - User ID performing the deletion
   * @returns {Promise<boolean>} Success status
   */
  async deleteLensFitting(id, updatedBy) {
    try {
      const existing = await prisma.lensFittingMaster.findUnique({
        where: { id }
      });

      if (!existing || existing.deleteStatus) {
        throw new APIError('Lens fitting not found', 404, 'FITTING_NOT_FOUND');
      }

      // Soft delete: set deleteStatus to true and deactivate
      await prisma.lensFittingMaster.update({
        where: { id },
        data: { 
          deleteStatus: true, 
          activeStatus: false, 
          updatedBy 
        }
      });

      return true;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Error deleting lens fitting:', error);
      throw new APIError('Failed to delete lens fitting', 500, 'DELETE_FITTING_ERROR');
    }
  }

  /**
   * Get dropdown list of active fittings (for forms)
   * @returns {Promise<Array>} Simplified fitting list
   */
  async getFittingDropdown() {
    try {
      const fittings = await prisma.lensFittingMaster.findMany({
        where: { activeStatus: true, deleteStatus: false },
        select: { 
          id: true, 
          name: true, 
          short_name: true, 
          description: true 
        },
        orderBy: { name: 'asc' }
      });

      return fittings.map(f => ({
        id: f.id,
        label: `${f.name} (${f.short_name})`,
        value: f.id,
        name: f.name,
        short_name: f.short_name,
        description: f.description
      }));
    } catch (error) {
      console.error('Error fetching fitting dropdown:', error);
      throw new APIError('Failed to fetch fitting dropdown', 500, 'FETCH_DROPDOWN_ERROR');
    }
  }

  /**
   * Get statistics about lens fittings
   * @returns {Promise<Object>} Statistics (total, active, inactive)
   */
  async getFittingStats() {
    try {
      const [total, active, inactive] = await Promise.all([
        prisma.lensFittingMaster.count({ where: { deleteStatus: false } }),
        prisma.lensFittingMaster.count({ where: { deleteStatus: false, activeStatus: true } }),
        prisma.lensFittingMaster.count({ where: { deleteStatus: false, activeStatus: false } })
      ]);

      return { total, active, inactive };
    } catch (error) {
      console.error('Error fetching fitting stats:', error);
      throw new APIError('Failed to fetch fitting statistics', 500, 'FETCH_STATS_ERROR');
    }
  }
}

export default LensFittingMasterService;
