import { PrismaClient } from '@prisma/client';
import { APIError } from '../middleware/errorHandler.js';

const prisma = new PrismaClient();

/**
 * Lens Material Master Service
 */
export class LensMaterialMasterService {
  
  async createLensMaterial(materialData) {
    try {
      const existingMaterial = await prisma.lensMaterialMaster.findUnique({
        where: { name: materialData.name }
      });

      if (existingMaterial) {
        throw new APIError('Material name already exists', 409, 'DUPLICATE_NAME');
      }

      const material = await prisma.lensMaterialMaster.create({
        data: {
          name: materialData.name,
          description: materialData.description,
          activeStatus: materialData.activeStatus ?? true,
          deleteStatus: false,
          createdBy: materialData.createdBy,
          updatedBy: materialData.createdBy
        },
        include: {
          Usercreated: { select: { id: true, name: true, email: true } }
        }
      });

      return material;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Error creating lens material:', error);
      throw new APIError('Failed to create lens material', 500, 'CREATE_MATERIAL_ERROR');
    }
  }

  async getLensMaterials(queryParams) {
    try {
      const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', search, activeStatus } = queryParams;
      
      const where = { deleteStatus: false };
      
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }
      
      if (activeStatus !== undefined) {
        where.activeStatus = activeStatus === 'true';
      }

      const offset = (page - 1) * limit;
      const total = await prisma.lensMaterialMaster.count({ where });

      const materials = await prisma.lensMaterialMaster.findMany({
        where,
        skip: offset,
        take: parseInt(limit),
        orderBy: { [sortBy]: sortOrder },
        include: {
          Usercreated: { select: { id: true, name: true } },
          Userupdated: { select: { id: true, name: true } },
          _count: { select: { lensProductMasters: true } }
        }
      });

      return {
        data: materials,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error fetching lens materials:', error);
      throw new APIError('Failed to fetch lens materials', 500, 'FETCH_MATERIALS_ERROR');
    }
  }

  async getLensMaterialById(id) {
    try {
      const material = await prisma.lensMaterialMaster.findUnique({
        where: { id },
        include: {
          Usercreated: { select: { id: true, name: true, email: true } },
          Userupdated: { select: { id: true, name: true, email: true } },
          _count: { select: { lensProductMasters: true } }
        }
      });

      if (!material || material.deleteStatus) {
        throw new APIError('Lens material not found', 404, 'MATERIAL_NOT_FOUND');
      }

      return material;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Error fetching lens material:', error);
      throw new APIError('Failed to fetch lens material', 500, 'FETCH_MATERIAL_ERROR');
    }
  }

  async updateLensMaterial(id, updateData) {
    try {
      const existing = await prisma.lensMaterialMaster.findUnique({ where: { id } });

      if (!existing || existing.deleteStatus) {
        throw new APIError('Lens material not found', 404, 'MATERIAL_NOT_FOUND');
      }

      if (updateData.name && updateData.name !== existing.name) {
        const duplicate = await prisma.lensMaterialMaster.findFirst({
          where: { name: updateData.name, id: { not: id }, deleteStatus: false }
        });

        if (duplicate) {
          throw new APIError('Material name already exists', 409, 'DUPLICATE_NAME');
        }
      }

      const updated = await prisma.lensMaterialMaster.update({
        where: { id },
        data: {
          name: updateData.name,
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
      console.error('Error updating lens material:', error);
      throw new APIError('Failed to update lens material', 500, 'UPDATE_MATERIAL_ERROR');
    }
  }

  async deleteLensMaterial(id, updatedBy) {
    try {
      const existing = await prisma.lensMaterialMaster.findUnique({
        where: { id },
        include: { _count: { select: { lensProductMasters: true } } }
      });

      if (!existing || existing.deleteStatus) {
        throw new APIError('Lens material not found', 404, 'MATERIAL_NOT_FOUND');
      }

      if (existing._count.lensProductMasters > 0) {
        throw new APIError('Cannot delete material with existing products', 400, 'MATERIAL_HAS_PRODUCTS');
      }

      await prisma.lensMaterialMaster.update({
        where: { id },
        data: { deleteStatus: true, activeStatus: false, updatedBy }
      });

      return true;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Error deleting lens material:', error);
      throw new APIError('Failed to delete lens material', 500, 'DELETE_MATERIAL_ERROR');
    }
  }

  async getMaterialDropdown() {
    try {
      const materials = await prisma.lensMaterialMaster.findMany({
        where: { activeStatus: true, deleteStatus: false },
        select: { id: true, name: true, description: true },
        orderBy: { name: 'asc' }
      });

      return materials.map(m => ({
        id: m.id,
        label: m.name,
        value: m.id,
        description: m.description
      }));
    } catch (error) {
      console.error('Error fetching material dropdown:', error);
      throw new APIError('Failed to fetch material dropdown', 500, 'FETCH_DROPDOWN_ERROR');
    }
  }

  async getMaterialStats() {
    try {
      const [total, active, inactive] = await Promise.all([
        prisma.lensMaterialMaster.count({ where: { deleteStatus: false } }),
        prisma.lensMaterialMaster.count({ where: { deleteStatus: false, activeStatus: true } }),
        prisma.lensMaterialMaster.count({ where: { deleteStatus: false, activeStatus: false } })
      ]);

      return { total, active, inactive };
    } catch (error) {
      console.error('Error fetching material stats:', error);
      throw new APIError('Failed to fetch material statistics', 500, 'FETCH_STATS_ERROR');
    }
  }
}

export default LensMaterialMasterService;
