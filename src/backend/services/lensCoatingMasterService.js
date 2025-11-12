import { PrismaClient } from '@prisma/client';
import { APIError } from '../middleware/errorHandler.js';

const prisma = new PrismaClient();

/**
 * Lens Coating Master Service
 */
export class LensCoatingMasterService {
  
  async createLensCoating(coatingData) {
    try {
      const existingCoating = await prisma.lensCoatingMaster.findUnique({
        where: { name: coatingData.name }
      });

      if (existingCoating) {
        throw new APIError('Coating name already exists', 409, 'DUPLICATE_NAME');
      }

      const coating = await prisma.lensCoatingMaster.create({
        data: {
          name: coatingData.name,
          short_name: coatingData.short_name,
          description: coatingData.description,
          activeStatus: coatingData.activeStatus ?? true,
          deleteStatus: false,
          createdBy: coatingData.createdBy,
          updatedBy: coatingData.createdBy
        },
        include: {
          Usercreated: { select: { id: true, name: true, email: true } }
        }
      });

      return coating;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Error creating lens coating:', error);
      throw new APIError('Failed to create lens coating', 500, 'CREATE_COATING_ERROR');
    }
  }

  async getLensCoatings(queryParams) {
    try {
      const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', search, activeStatus } = queryParams;
      
      const where = { deleteStatus: false };
      
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { short_name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }
      
      if (activeStatus !== undefined) {
        where.activeStatus = activeStatus === 'true';
      }

      const offset = (page - 1) * limit;
      const total = await prisma.lensCoatingMaster.count({ where });

      const coatings = await prisma.lensCoatingMaster.findMany({
        where,
        skip: offset,
        take: parseInt(limit),
        orderBy: { [sortBy]: sortOrder },
        include: {
          Usercreated: { select: { id: true, name: true } },
          Userupdated: { select: { id: true, name: true } },
          _count: { select: { lensPriceMasters: true } }
        }
      });

      return {
        data: coatings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error fetching lens coatings:', error);
      throw new APIError('Failed to fetch lens coatings', 500, 'FETCH_COATINGS_ERROR');
    }
  }

  async getLensCoatingById(id) {
    try {
      const coating = await prisma.lensCoatingMaster.findUnique({
        where: { id },
        include: {
          Usercreated: { select: { id: true, name: true, email: true } },
          Userupdated: { select: { id: true, name: true, email: true } },
          _count: { select: { lensPriceMasters: true } }
        }
      });

      if (!coating || coating.deleteStatus) {
        throw new APIError('Lens coating not found', 404, 'COATING_NOT_FOUND');
      }

      return coating;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Error fetching lens coating:', error);
      throw new APIError('Failed to fetch lens coating', 500, 'FETCH_COATING_ERROR');
    }
  }

  async updateLensCoating(id, updateData) {
    try {
      const existing = await prisma.lensCoatingMaster.findUnique({ where: { id } });

      if (!existing || existing.deleteStatus) {
        throw new APIError('Lens coating not found', 404, 'COATING_NOT_FOUND');
      }

      if (updateData.name && updateData.name !== existing.name) {
        const duplicate = await prisma.lensCoatingMaster.findFirst({
          where: { name: updateData.name, id: { not: id }, deleteStatus: false }
        });

        if (duplicate) {
          throw new APIError('Coating name already exists', 409, 'DUPLICATE_NAME');
        }
      }

      const updated = await prisma.lensCoatingMaster.update({
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
      console.error('Error updating lens coating:', error);
      throw new APIError('Failed to update lens coating', 500, 'UPDATE_COATING_ERROR');
    }
  }

  async deleteLensCoating(id, updatedBy) {
    try {
      const existing = await prisma.lensCoatingMaster.findUnique({
        where: { id },
        include: { _count: { select: { lensPriceMasters: true } } }
      });

      if (!existing || existing.deleteStatus) {
        throw new APIError('Lens coating not found', 404, 'COATING_NOT_FOUND');
      }

      if (existing._count.lensPriceMasters > 0) {
        throw new APIError('Cannot delete coating with existing price records', 400, 'COATING_HAS_PRICES');
      }

      await prisma.lensCoatingMaster.update({
        where: { id },
        data: { deleteStatus: true, activeStatus: false, updatedBy }
      });

      return true;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Error deleting lens coating:', error);
      throw new APIError('Failed to delete lens coating', 500, 'DELETE_COATING_ERROR');
    }
  }

  async getCoatingDropdown() {
    try {
      const coatings = await prisma.lensCoatingMaster.findMany({
        where: { activeStatus: true, deleteStatus: false },
        select: { id: true, name: true, short_name: true, description: true },
        orderBy: { name: 'asc' }
      });

      return coatings.map(c => ({
        id: c.id,
        label: `${c.name} (${c.short_name})`,
        value: c.id,
        name: c.name,
        short_name: c.short_name,
        description: c.description
      }));
    } catch (error) {
      console.error('Error fetching coating dropdown:', error);
      throw new APIError('Failed to fetch coating dropdown', 500, 'FETCH_DROPDOWN_ERROR');
    }
  }

  async getCoatingStats() {
    try {
      const [total, active, inactive] = await Promise.all([
        prisma.lensCoatingMaster.count({ where: { deleteStatus: false } }),
        prisma.lensCoatingMaster.count({ where: { deleteStatus: false, activeStatus: true } }),
        prisma.lensCoatingMaster.count({ where: { deleteStatus: false, activeStatus: false } })
      ]);

      return { total, active, inactive };
    } catch (error) {
      console.error('Error fetching coating stats:', error);
      throw new APIError('Failed to fetch coating statistics', 500, 'FETCH_STATS_ERROR');
    }
  }
}

export default LensCoatingMasterService;
