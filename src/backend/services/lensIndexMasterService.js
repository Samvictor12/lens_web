import prisma from '../config/prisma.js';
import { APIError } from '../middleware/errorHandler.js';

/**
 * Lens Index Master Service
 */
export class LensIndexMasterService {
  async createLensIndex(indexData) {
    try {
      const existing = await prisma.lensIndexMaster.findUnique({
        where: { index_name: indexData.index_name },
      });

      if (existing && !existing.deleteStatus) {
        throw new APIError('Index name already exists', 409, 'DUPLICATE_INDEX_NAME');
      }

      const index = await prisma.lensIndexMaster.create({
        data: {
          index_name: indexData.index_name,
          description: indexData.description,
          activeStatus: indexData.activeStatus ?? true,
          deleteStatus: false,
          createdBy: indexData.createdBy,
          updatedBy: indexData.createdBy,
        },
        include: {
          Usercreated: { select: { id: true, name: true, email: true } },
        },
      });

      return index;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Error creating lens index:', error);
      throw new APIError('Failed to create lens index', 500, 'CREATE_INDEX_ERROR');
    }
  }

  async getAllLensIndexes(queryParams) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        search,
        activeStatus,
      } = queryParams;

      const where = { deleteStatus: false };

      if (search) {
        where.OR = [
          { index_name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (activeStatus !== undefined) {
        where.activeStatus = activeStatus === 'true';
      }

      const offset = (page - 1) * limit;
      const total = await prisma.lensIndexMaster.count({ where });

      const indexes = await prisma.lensIndexMaster.findMany({
        where,
        skip: offset,
        take: parseInt(limit),
        orderBy: { [sortBy]: sortOrder },
        include: {
          Usercreated: { select: { id: true, name: true } },
          Userupdated: { select: { id: true, name: true } },
          _count: { select: { products: true } },
        },
      });

      return {
        data: indexes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error fetching lens indexes:', error);
      throw new APIError('Failed to fetch lens indexes', 500, 'FETCH_INDEXES_ERROR');
    }
  }

  async getLensIndexById(id) {
    try {
      const index = await prisma.lensIndexMaster.findUnique({
        where: { id },
        include: {
          Usercreated: { select: { id: true, name: true, email: true } },
          Userupdated: { select: { id: true, name: true, email: true } },
          _count: { select: { products: true } },
        },
      });

      if (!index || index.deleteStatus) {
        throw new APIError('Lens index not found', 404, 'INDEX_NOT_FOUND');
      }

      return index;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Error fetching lens index:', error);
      throw new APIError('Failed to fetch lens index', 500, 'FETCH_INDEX_ERROR');
    }
  }

  async updateLensIndex(id, updateData) {
    try {
      const existing = await prisma.lensIndexMaster.findUnique({ where: { id } });

      if (!existing || existing.deleteStatus) {
        throw new APIError('Lens index not found', 404, 'INDEX_NOT_FOUND');
      }

      if (updateData.index_name && updateData.index_name !== existing.index_name) {
        const duplicate = await prisma.lensIndexMaster.findFirst({
          where: {
            index_name: updateData.index_name,
            id: { not: id },
            deleteStatus: false,
          },
        });

        if (duplicate) {
          throw new APIError('Index name already exists', 409, 'DUPLICATE_INDEX_NAME');
        }
      }

      const updated = await prisma.lensIndexMaster.update({
        where: { id },
        data: {
          index_name: updateData.index_name,
          description: updateData.description,
          activeStatus: updateData.activeStatus,
          updatedBy: updateData.updatedBy,
        },
        include: {
          Usercreated: { select: { id: true, name: true } },
          Userupdated: { select: { id: true, name: true } },
        },
      });

      return updated;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Error updating lens index:', error);
      throw new APIError('Failed to update lens index', 500, 'UPDATE_INDEX_ERROR');
    }
  }

  async deleteLensIndex(id, updatedBy) {
    try {
      const existing = await prisma.lensIndexMaster.findUnique({
        where: { id },
        include: { _count: { select: { products: true } } },
      });

      if (!existing || existing.deleteStatus) {
        throw new APIError('Lens index not found', 404, 'INDEX_NOT_FOUND');
      }

      if (existing._count.products > 0) {
        throw new APIError('Cannot delete index with existing products', 400, 'INDEX_HAS_PRODUCTS');
      }

      await prisma.lensIndexMaster.update({
        where: { id },
        data: { deleteStatus: true, activeStatus: false, updatedBy },
      });

      return true;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Error deleting lens index:', error);
      throw new APIError('Failed to delete lens index', 500, 'DELETE_INDEX_ERROR');
    }
  }

  async getIndexDropdown() {
    try {
      const indexes = await prisma.lensIndexMaster.findMany({
        where: { activeStatus: true, deleteStatus: false },
        select: { id: true, index_name: true, description: true },
        orderBy: { index_name: 'asc' },
      });

      return indexes.map((item) => ({
        id: item.id,
        label: item.index_name,
        value: item.id,
        description: item.description,
      }));
    } catch (error) {
      console.error('Error fetching index dropdown:', error);
      throw new APIError('Failed to fetch index dropdown', 500, 'FETCH_DROPDOWN_ERROR');
    }
  }

  async getIndexStats() {
    try {
      const [total, active, inactive] = await Promise.all([
        prisma.lensIndexMaster.count({ where: { deleteStatus: false } }),
        prisma.lensIndexMaster.count({ where: { deleteStatus: false, activeStatus: true } }),
        prisma.lensIndexMaster.count({ where: { deleteStatus: false, activeStatus: false } }),
      ]);

      return { total, active, inactive };
    } catch (error) {
      console.error('Error fetching index stats:', error);
      throw new APIError('Failed to fetch index statistics', 500, 'FETCH_STATS_ERROR');
    }
  }
}

export default LensIndexMasterService;
