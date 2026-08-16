import prisma from '../config/prisma.js';
import { APIError } from '../middleware/errorHandler.js';

/**
 * Location Tray Master Service (UI: Tray)
 * Destination trays under a Location for Issue & Pre-QC.
 */
export class LocationTrayMasterService {
  async validateName(name, excludeId = null) {
    const trimmedName = name?.trim();
    if (!trimmedName) return;

    const duplicate = await prisma.locationTrayMaster.findFirst({
      where: {
        name: { equals: trimmedName, mode: 'insensitive' },
        deleteStatus: false,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });

    if (duplicate) {
      throw new APIError('Tray name already exists', 409, 'DUPLICATE_NAME');
    }
  }

  async assertLocation(locationId) {
    const location = await prisma.locationMaster.findUnique({
      where: { id: locationId },
    });
    if (!location || location.deleteStatus) {
      throw new APIError('Invalid location', 400, 'INVALID_LOCATION');
    }
    return location;
  }

  async create(data) {
    try {
      let locationId = null;
      if (data.location_id != null && data.location_id !== '') {
        locationId = parseInt(data.location_id, 10);
        if (!locationId || Number.isNaN(locationId)) {
          throw new APIError('Invalid location', 400, 'INVALID_LOCATION');
        }
        await this.assertLocation(locationId);
      }
      await this.validateName(data.name);

      const createData = {
        name: data.name.trim(),
        description: data.description || null,
        activeStatus: data.activeStatus ?? true,
        deleteStatus: false,
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
      };
      if (locationId) createData.location_id = locationId;

      return await prisma.locationTrayMaster.create({
        data: createData,
        include: {
          location: { select: { id: true, name: true } },
          createdByUser: { select: { id: true, name: true, email: true } },
        },
      });
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Error creating location tray:', error);
      throw new APIError('Failed to create tray', 500, 'CREATE_LOCATION_TRAY_ERROR');
    }
  }

  async list(queryParams) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        search,
        activeStatus,
        location_id,
      } = queryParams;

      const where = { deleteStatus: false };

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (activeStatus !== undefined && activeStatus !== 'all') {
        where.activeStatus = activeStatus === 'true' || activeStatus === true;
      }

      if (location_id) {
        where.location_id = parseInt(location_id, 10);
      }

      const offset = (page - 1) * limit;
      const total = await prisma.locationTrayMaster.count({ where });

      const rows = await prisma.locationTrayMaster.findMany({
        where,
        skip: offset,
        take: parseInt(limit, 10),
        orderBy: { [sortBy]: sortOrder },
        include: {
          location: { select: { id: true, name: true } },
          createdByUser: { select: { id: true, name: true } },
          updatedByUser: { select: { id: true, name: true } },
        },
      });

      return {
        data: rows,
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error fetching location trays:', error);
      throw new APIError('Failed to fetch trays', 500, 'FETCH_LOCATION_TRAYS_ERROR');
    }
  }

  async getById(id) {
    try {
      const row = await prisma.locationTrayMaster.findUnique({
        where: { id },
        include: {
          location: { select: { id: true, name: true, description: true } },
          createdByUser: { select: { id: true, name: true, email: true } },
          updatedByUser: { select: { id: true, name: true, email: true } },
        },
      });

      if (!row) throw new APIError('Tray not found', 404, 'LOCATION_TRAY_NOT_FOUND');
      if (row.deleteStatus) {
        throw new APIError('Tray has been deleted', 404, 'LOCATION_TRAY_DELETED');
      }
      return row;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Error fetching location tray:', error);
      throw new APIError('Failed to fetch tray', 500, 'FETCH_LOCATION_TRAY_ERROR');
    }
  }

  async update(id, updateData) {
    try {
      const existing = await prisma.locationTrayMaster.findUnique({ where: { id } });
      if (!existing) throw new APIError('Tray not found', 404, 'LOCATION_TRAY_NOT_FOUND');
      if (existing.deleteStatus) {
        throw new APIError('Cannot update deleted tray', 400, 'LOCATION_TRAY_DELETED');
      }

      const nextLocationId =
        updateData.location_id !== undefined
          ? (updateData.location_id == null || updateData.location_id === ''
              ? null
              : parseInt(updateData.location_id, 10))
          : existing.location_id;

      if (nextLocationId != null) {
        if (Number.isNaN(nextLocationId)) {
          throw new APIError('Invalid location', 400, 'INVALID_LOCATION');
        }
        await this.assertLocation(nextLocationId);
      }

      if (
        updateData.name !== undefined &&
        updateData.name.trim().toLowerCase() !== existing.name.trim().toLowerCase()
      ) {
        await this.validateName(updateData.name, id);
      }

      const data = {};
      if (updateData.name !== undefined) data.name = updateData.name.trim();
      if (updateData.description !== undefined) data.description = updateData.description;
      if (updateData.location_id !== undefined) data.location_id = nextLocationId;
      if (updateData.activeStatus !== undefined) data.activeStatus = updateData.activeStatus;
      if (updateData.updatedBy !== undefined) data.updatedBy = updateData.updatedBy;

      return await prisma.locationTrayMaster.update({
        where: { id },
        data,
        include: {
          location: { select: { id: true, name: true } },
          createdByUser: { select: { id: true, name: true } },
          updatedByUser: { select: { id: true, name: true } },
        },
      });
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Error updating location tray:', error);
      throw new APIError('Failed to update tray', 500, 'UPDATE_LOCATION_TRAY_ERROR');
    }
  }

  async delete(id) {
    try {
      const existing = await prisma.locationTrayMaster.findUnique({ where: { id } });
      if (!existing) throw new APIError('Tray not found', 404, 'LOCATION_TRAY_NOT_FOUND');
      if (existing.deleteStatus) {
        throw new APIError('Tray already deleted', 400, 'LOCATION_TRAY_DELETED');
      }

      const soCount = await prisma.saleOrder.count({
        where: { locationTrayId: id, deleteStatus: false },
      });
      if (soCount > 0) {
        throw new APIError(
          'Cannot delete tray referenced by sale orders',
          400,
          'LOCATION_TRAY_IN_USE'
        );
      }

      return await prisma.locationTrayMaster.update({
        where: { id },
        data: { deleteStatus: true, activeStatus: false },
      });
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Error deleting location tray:', error);
      throw new APIError('Failed to delete tray', 500, 'DELETE_LOCATION_TRAY_ERROR');
    }
  }

  async dropdown(location_id = null) {
    try {
      const where = { deleteStatus: false, activeStatus: true };
      if (location_id) {
        where.location_id = parseInt(location_id, 10);
      }

      const rows = await prisma.locationTrayMaster.findMany({
        where,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          location_id: true,
          location: { select: { id: true, name: true } },
        },
      });

      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        label: r.name,
        location_id: r.location_id,
      }));
    } catch (error) {
      console.error('Error fetching location tray dropdown:', error);
      throw new APIError('Failed to fetch tray dropdown', 500, 'DROPDOWN_LOCATION_TRAY_ERROR');
    }
  }
}

export default new LocationTrayMasterService();
