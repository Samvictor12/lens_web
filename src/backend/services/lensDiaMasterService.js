import prisma from '../config/prisma.js';
import { APIError } from '../middleware/errorHandler.js';

/**
 * Lens Dia (Diameter) Master Service
 * Handles business logic for lens diameter types
 */
export class LensDiaMasterService {
  
  /**
   * Create a new lens diameter type
   * @param {Object} diaData - Diameter data including name, short_name, description
   * @returns {Promise<Object>} Created diameter record
   */
  async createLensDia(diaData) {
    try {
      // Check for duplicate name
      const existingDia = await prisma.lensDiaMaster.findUnique({
        where: { name: diaData.name }
      });

      if (existingDia) {
        throw new APIError('Diameter name already exists', 409, 'DUPLICATE_NAME');
      }

      const dia = await prisma.lensDiaMaster.create({
        data: {
          name: diaData.name,
          short_name: diaData.short_name,
          description: diaData.description,
          activeStatus: diaData.activeStatus ?? true,
          deleteStatus: false,
          createdBy: diaData.createdBy,
          updatedBy: diaData.createdBy
        },
        include: {
          Usercreated: { select: { id: true, name: true, email: true } }
        }
      });

      return dia;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Error creating lens diameter:', error);
      throw new APIError('Failed to create lens diameter', 500, 'CREATE_DIA_ERROR');
    }
  }

  /**
   * Get all lens diameters with pagination and filtering
   * @param {Object} queryParams - Query parameters (page, limit, search, activeStatus, sortBy, sortOrder)
   * @returns {Promise<Object>} Paginated diameter list
   */
  async getLensDias(queryParams) {
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
      const total = await prisma.lensDiaMaster.count({ where });

      const dias = await prisma.lensDiaMaster.findMany({
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
        data: dias,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error fetching lens diameters:', error);
      throw new APIError('Failed to fetch lens diameters', 500, 'FETCH_DIAS_ERROR');
    }
  }

  /**
   * Get a single lens diameter by ID
   * @param {number} id - Diameter ID
   * @returns {Promise<Object>} Diameter record
   */
  async getLensDiaById(id) {
    try {
      const dia = await prisma.lensDiaMaster.findUnique({
        where: { id },
        include: {
          Usercreated: { select: { id: true, name: true, email: true } },
          Userupdated: { select: { id: true, name: true, email: true } }
        }
      });

      if (!dia || dia.deleteStatus) {
        throw new APIError('Lens diameter not found', 404, 'DIA_NOT_FOUND');
      }

      return dia;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Error fetching lens diameter:', error);
      throw new APIError('Failed to fetch lens diameter', 500, 'FETCH_DIA_ERROR');
    }
  }

  /**
   * Update an existing lens diameter
   * @param {number} id - Diameter ID
   * @param {Object} updateData - Updated diameter data
   * @returns {Promise<Object>} Updated diameter record
   */
  async updateLensDia(id, updateData) {
    try {
      // Check if diameter exists
      const existing = await prisma.lensDiaMaster.findUnique({ where: { id } });

      if (!existing || existing.deleteStatus) {
        throw new APIError('Lens diameter not found', 404, 'DIA_NOT_FOUND');
      }

      // Check for duplicate name (if name is being changed)
      if (updateData.name && updateData.name !== existing.name) {
        const duplicate = await prisma.lensDiaMaster.findFirst({
          where: { name: updateData.name, id: { not: id }, deleteStatus: false }
        });

        if (duplicate) {
          throw new APIError('Diameter name already exists', 409, 'DUPLICATE_NAME');
        }
      }

      const updated = await prisma.lensDiaMaster.update({
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
      console.error('Error updating lens diameter:', error);
      throw new APIError('Failed to update lens diameter', 500, 'UPDATE_DIA_ERROR');
    }
  }

  /**
   * Soft delete a lens diameter
   * @param {number} id - Diameter ID
   * @param {number} updatedBy - User ID performing the deletion
   * @returns {Promise<boolean>} Success status
   */
  async deleteLensDia(id, updatedBy) {
    try {
      const existing = await prisma.lensDiaMaster.findUnique({
        where: { id }
      });

      if (!existing || existing.deleteStatus) {
        throw new APIError('Lens diameter not found', 404, 'DIA_NOT_FOUND');
      }

      // Soft delete: set deleteStatus to true and deactivate
      await prisma.lensDiaMaster.update({
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
      console.error('Error deleting lens diameter:', error);
      throw new APIError('Failed to delete lens diameter', 500, 'DELETE_DIA_ERROR');
    }
  }

  /**
   * Get dropdown list of active diameters (for forms)
   * @returns {Promise<Array>} Simplified diameter list
   */
  async getDiaDropdown() {
    try {
      const dias = await prisma.lensDiaMaster.findMany({
        where: { activeStatus: true, deleteStatus: false },
        select: { 
          id: true, 
          name: true, 
          short_name: true, 
          description: true 
        },
        orderBy: { name: 'asc' }
      });

      return dias.map(d => ({
        id: d.id,
        label: `${d.name} (${d.short_name})`,
        value: d.id,
        name: d.name,
        short_name: d.short_name,
        description: d.description
      }));
    } catch (error) {
      console.error('Error fetching diameter dropdown:', error);
      throw new APIError('Failed to fetch diameter dropdown', 500, 'FETCH_DROPDOWN_ERROR');
    }
  }

  /**
   * Get statistics about lens diameters
   * @returns {Promise<Object>} Statistics (total, active, inactive)
   */
  async getDiaStats() {
    try {
      const [total, active, inactive] = await Promise.all([
        prisma.lensDiaMaster.count({ where: { deleteStatus: false } }),
        prisma.lensDiaMaster.count({ where: { deleteStatus: false, activeStatus: true } }),
        prisma.lensDiaMaster.count({ where: { deleteStatus: false, activeStatus: false } })
      ]);

      return { total, active, inactive };
    } catch (error) {
      console.error('Error fetching diameter stats:', error);
      throw new APIError('Failed to fetch diameter statistics', 500, 'FETCH_STATS_ERROR');
    }
  }
}

export default LensDiaMasterService;
