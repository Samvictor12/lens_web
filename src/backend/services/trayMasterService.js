import prisma from '../config/prisma.js';
import { APIError } from '../middleware/errorHandler.js';

/**
 * Tray Master Service
 * Handles all database operations for Tray Master management
 */
export class TrayMasterService {
  
  /**
   * Create a new tray
   * @param {Object} trayData - Tray data
   * @returns {Promise<Object>} Created tray
   */
  async createTray(trayData) {
    try {
      // Check if tray_code already exists
      const existingTray = await prisma.trayMaster.findUnique({
        where: { tray_code: trayData.tray_code }
      });

      if (existingTray) {
        throw new APIError('Tray code already exists', 409, 'DUPLICATE_CODE');
      }

      // Verify location exists if provided
      if (trayData.location_id) {
        const location = await prisma.locationMaster.findUnique({
          where: { id: trayData.location_id }
        });

        if (!location || location.deleteStatus) {
          throw new APIError('Invalid location', 400, 'INVALID_LOCATION');
        }
      }

      const tray = await prisma.trayMaster.create({
        data: {
          name: trayData.name,
          tray_code: trayData.tray_code,
          description: trayData.description,
          capacity: trayData.capacity,
          location_id: trayData.location_id,
          activeStatus: trayData.activeStatus ?? true,
          deleteStatus: false,
          createdBy: trayData.createdBy,
          updatedBy: trayData.createdBy
        },
        include: {
          location: {
            select: { id: true, name: true, location_code: true }
          },
          createdByUser: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      return tray;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Error creating tray:', error);
      throw new APIError('Failed to create tray', 500, 'CREATE_TRAY_ERROR');
    }
  }

  /**
   * Get paginated list of trays
   * @param {Object} queryParams - Query parameters
   * @returns {Promise<Object>} Paginated trays
   */
  async getTrays(queryParams) {
    try {
      const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', search, activeStatus, location_id } = queryParams;
      
      const where = {};
      
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { tray_code: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }
      
      if (activeStatus !== undefined) {
        where.activeStatus = activeStatus === 'true';
      }

      if (location_id) {
        where.location_id = parseInt(location_id);
      }

      // Filter out deleted records
      where.deleteStatus = false;

      const offset = (page - 1) * limit;
      const total = await prisma.trayMaster.count({ where });

      const trays = await prisma.trayMaster.findMany({
        where,
        skip: offset,
        take: parseInt(limit),
        orderBy: { [sortBy]: sortOrder },
        include: {
          location: {
            select: { id: true, name: true, location_code: true }
          },
          createdByUser: {
            select: { id: true, name: true }
          },
          updatedByUser: {
            select: { id: true, name: true }
          }
        }
      });

      return {
        data: trays,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error fetching trays:', error);
      throw new APIError('Failed to fetch trays', 500, 'FETCH_TRAYS_ERROR');
    }
  }

  /**
   * Get tray by ID
   * @param {number} id - Tray ID
   * @returns {Promise<Object>} Tray details
   */
  async getTrayById(id) {
    try {
      const tray = await prisma.trayMaster.findUnique({
        where: { id },
        include: {
          location: {
            select: { id: true, name: true, location_code: true, description: true }
          },
          createdByUser: {
            select: { id: true, name: true, email: true }
          },
          updatedByUser: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      if (!tray) {
        throw new APIError('Tray not found', 404, 'TRAY_NOT_FOUND');
      }

      if (tray.deleteStatus) {
        throw new APIError('Tray has been deleted', 404, 'TRAY_DELETED');
      }

      return tray;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Error fetching tray by ID:', error);
      throw new APIError('Failed to fetch tray', 500, 'FETCH_TRAY_ERROR');
    }
  }

  /**
   * Update tray
   * @param {number} id - Tray ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated tray
   */
  async updateTray(id, updateData) {
    try {
      const existingTray = await prisma.trayMaster.findUnique({
        where: { id }
      });

      if (!existingTray) {
        throw new APIError('Tray not found', 404, 'TRAY_NOT_FOUND');
      }

      if (existingTray.deleteStatus) {
        throw new APIError('Cannot update deleted tray', 400, 'TRAY_DELETED');
      }

      // Check for duplicate tray_code if being updated
      if (updateData.tray_code && updateData.tray_code !== existingTray.tray_code) {
        const duplicateCode = await prisma.trayMaster.findFirst({
          where: {
            tray_code: updateData.tray_code,
            id: { not: id }
          }
        });

        if (duplicateCode) {
          throw new APIError('Tray code already exists', 409, 'DUPLICATE_CODE');
        }
      }

      // Verify location exists if being updated
      if (updateData.location_id) {
        const location = await prisma.locationMaster.findUnique({
          where: { id: updateData.location_id }
        });

        if (!location || location.deleteStatus) {
          throw new APIError('Invalid location', 400, 'INVALID_LOCATION');
        }
      }

      const data = {};
      if (updateData.name !== undefined) data.name = updateData.name;
      if (updateData.tray_code !== undefined) data.tray_code = updateData.tray_code;
      if (updateData.description !== undefined) data.description = updateData.description;
      if (updateData.capacity !== undefined) data.capacity = updateData.capacity;
      if (updateData.location_id !== undefined) data.location_id = updateData.location_id;
      if (updateData.activeStatus !== undefined) data.activeStatus = updateData.activeStatus;
      if (updateData.updatedBy !== undefined) data.updatedBy = updateData.updatedBy;

      const updatedTray = await prisma.trayMaster.update({
        where: { id },
        data,
        include: {
          location: {
            select: { id: true, name: true, location_code: true }
          },
          createdByUser: {
            select: { id: true, name: true }
          },
          updatedByUser: {
            select: { id: true, name: true }
          }
        }
      });

      return updatedTray;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Error updating tray:', error);
      throw new APIError('Failed to update tray', 500, 'UPDATE_TRAY_ERROR');
    }
  }

  /**
   * Delete tray (soft delete)
   * @param {number} id - Tray ID
   * @param {number} updatedBy - User ID performing deletion
   * @returns {Promise<boolean>} Deletion success
   */
  async deleteTray(id, updatedBy) {
    try {
      const existingTray = await prisma.trayMaster.findUnique({
        where: { id }
      });

      if (!existingTray) {
        throw new APIError('Tray not found', 404, 'TRAY_NOT_FOUND');
      }

      if (existingTray.deleteStatus) {
        throw new APIError('Tray is already deleted', 400, 'TRAY_ALREADY_DELETED');
      }

      // Soft delete
      await prisma.trayMaster.update({
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
      console.error('Error deleting tray:', error);
      throw new APIError('Failed to delete tray', 500, 'DELETE_TRAY_ERROR');
    }
  }

  /**
   * Get dropdown list of trays
   * @param {number} location_id - Optional location filter
   * @returns {Promise<Array>} Trays for dropdown
   */
  async getTrayDropdown(location_id = null) {
    try {
      const where = {
        activeStatus: true,
        deleteStatus: false
      };

      if (location_id) {
        where.location_id = location_id;
      }

      const trays = await prisma.trayMaster.findMany({
        where,
        select: {
          id: true,
          name: true,
          tray_code: true,
          capacity: true,
          location: {
            select: { id: true, name: true, location_code: true }
          }
        },
        orderBy: { tray_code: 'asc' }
      });

      return trays.map(tray => ({
        id: tray.id,
        label: `${tray.name} (${tray.tray_code})`,
        value: tray.id,
        name: tray.name,
        tray_code: tray.tray_code,
        capacity: tray.capacity,
        location: tray.location
      }));
    } catch (error) {
      console.error('Error fetching tray dropdown:', error);
      throw new APIError('Failed to fetch tray dropdown', 500, 'FETCH_DROPDOWN_ERROR');
    }
  }
}

export default TrayMasterService;
