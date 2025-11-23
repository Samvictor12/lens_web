import prisma from '../config/prisma.js';
import { APIError } from '../middleware/errorHandler.js';

/**
 * Location Master Service
 * Handles all database operations for Location Master management
 */
export class LocationMasterService {
  
  /**
   * Create a new location
   * @param {Object} locationData - Location data
   * @returns {Promise<Object>} Created location
   */
  async createLocation(locationData) {
    try {
      // Check if location_code already exists
      const existingLocation = await prisma.locationMaster.findUnique({
        where: { location_code: locationData.location_code }
      });

      if (existingLocation) {
        throw new APIError('Location code already exists', 409, 'DUPLICATE_CODE');
      }

      const location = await prisma.locationMaster.create({
        data: {
          name: locationData.name,
          location_code: locationData.location_code,
          description: locationData.description,
          activeStatus: locationData.activeStatus ?? true,
          deleteStatus: false,
          createdBy: locationData.createdBy,
          updatedBy: locationData.createdBy
        },
        include: {
          createdByUser: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      return location;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Error creating location:', error);
      throw new APIError('Failed to create location', 500, 'CREATE_LOCATION_ERROR');
    }
  }

  /**
   * Get paginated list of locations
   * @param {Object} queryParams - Query parameters
   * @returns {Promise<Object>} Paginated locations
   */
  async getLocations(queryParams) {
    try {
      const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', search, activeStatus } = queryParams;
      
      const where = {};
      
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { location_code: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }
      
      if (activeStatus !== undefined) {
        where.activeStatus = activeStatus === 'true';
      }

      // Filter out deleted records
      where.deleteStatus = false;

      const offset = (page - 1) * limit;
      const total = await prisma.locationMaster.count({ where });

      const locations = await prisma.locationMaster.findMany({
        where,
        skip: offset,
        take: parseInt(limit),
        orderBy: { [sortBy]: sortOrder },
        include: {
          createdByUser: {
            select: { id: true, name: true }
          },
          updatedByUser: {
            select: { id: true, name: true }
          },
          _count: {
            select: { trays: true }
          }
        }
      });

      return {
        data: locations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error fetching locations:', error);
      throw new APIError('Failed to fetch locations', 500, 'FETCH_LOCATIONS_ERROR');
    }
  }

  /**
   * Get location by ID
   * @param {number} id - Location ID
   * @returns {Promise<Object>} Location details
   */
  async getLocationById(id) {
    try {
      const location = await prisma.locationMaster.findUnique({
        where: { id },
        include: {
          createdByUser: {
            select: { id: true, name: true, email: true }
          },
          updatedByUser: {
            select: { id: true, name: true, email: true }
          },
          _count: {
            select: { trays: true }
          }
        }
      });

      if (!location) {
        throw new APIError('Location not found', 404, 'LOCATION_NOT_FOUND');
      }

      if (location.deleteStatus) {
        throw new APIError('Location has been deleted', 404, 'LOCATION_DELETED');
      }

      return location;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Error fetching location by ID:', error);
      throw new APIError('Failed to fetch location', 500, 'FETCH_LOCATION_ERROR');
    }
  }

  /**
   * Update location
   * @param {number} id - Location ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated location
   */
  async updateLocation(id, updateData) {
    try {
      const existingLocation = await prisma.locationMaster.findUnique({
        where: { id }
      });

      if (!existingLocation) {
        throw new APIError('Location not found', 404, 'LOCATION_NOT_FOUND');
      }

      if (existingLocation.deleteStatus) {
        throw new APIError('Cannot update deleted location', 400, 'LOCATION_DELETED');
      }

      // Check for duplicate location_code if being updated
      if (updateData.location_code && updateData.location_code !== existingLocation.location_code) {
        const duplicateCode = await prisma.locationMaster.findFirst({
          where: {
            location_code: updateData.location_code,
            id: { not: id }
          }
        });

        if (duplicateCode) {
          throw new APIError('Location code already exists', 409, 'DUPLICATE_CODE');
        }
      }

      const data = {};
      if (updateData.name !== undefined) data.name = updateData.name;
      if (updateData.location_code !== undefined) data.location_code = updateData.location_code;
      if (updateData.description !== undefined) data.description = updateData.description;
      if (updateData.activeStatus !== undefined) data.activeStatus = updateData.activeStatus;
      if (updateData.updatedBy !== undefined) data.updatedBy = updateData.updatedBy;

      const updatedLocation = await prisma.locationMaster.update({
        where: { id },
        data,
        include: {
          createdByUser: {
            select: { id: true, name: true }
          },
          updatedByUser: {
            select: { id: true, name: true }
          }
        }
      });

      return updatedLocation;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Error updating location:', error);
      throw new APIError('Failed to update location', 500, 'UPDATE_LOCATION_ERROR');
    }
  }

  /**
   * Delete location (soft delete)
   * @param {number} id - Location ID
   * @param {number} updatedBy - User ID performing deletion
   * @returns {Promise<boolean>} Deletion success
   */
  async deleteLocation(id, updatedBy) {
    try {
      const existingLocation = await prisma.locationMaster.findUnique({
        where: { id },
        include: {
          _count: {
            select: { trays: true }
          }
        }
      });

      if (!existingLocation) {
        throw new APIError('Location not found', 404, 'LOCATION_NOT_FOUND');
      }

      if (existingLocation.deleteStatus) {
        throw new APIError('Location is already deleted', 400, 'LOCATION_ALREADY_DELETED');
      }

      // Check if location has trays
      if (existingLocation._count.trays > 0) {
        throw new APIError('Cannot delete location with existing trays', 400, 'LOCATION_HAS_TRAYS');
      }

      // Soft delete
      await prisma.locationMaster.update({
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
      console.error('Error deleting location:', error);
      throw new APIError('Failed to delete location', 500, 'DELETE_LOCATION_ERROR');
    }
  }

  /**
   * Get dropdown list of locations
   * @returns {Promise<Array>} Locations for dropdown
   */
  async getLocationDropdown() {
    try {
      const locations = await prisma.locationMaster.findMany({
        where: {
          activeStatus: true,
          deleteStatus: false
        },
        select: {
          id: true,
          name: true,
          location_code: true,
          description: true
        },
        orderBy: { name: 'asc' }
      });

      return locations.map(loc => ({
        id: loc.id,
        label: `${loc.name} (${loc.location_code})`,
        value: loc.id,
        name: loc.name,
        location_code: loc.location_code,
        description: loc.description
      }));
    } catch (error) {
      console.error('Error fetching location dropdown:', error);
      throw new APIError('Failed to fetch location dropdown', 500, 'FETCH_DROPDOWN_ERROR');
    }
  }
}

export default LocationMasterService;
