import prisma from '../config/prisma.js';
import { APIError } from '../middleware/errorHandler.js';

/**
 * Lens Brand Master Service
 */
export class LensBrandMasterService {
  
  async createLensBrand(brandData) {
    try {
      const existingBrand = await prisma.lensBrandMaster.findUnique({
        where: { name: brandData.name }
      });

      if (existingBrand) {
        throw new APIError('Brand name already exists', 409, 'DUPLICATE_NAME');
      }

      const brand = await prisma.lensBrandMaster.create({
        data: {
          name: brandData.name,
          description: brandData.description,
          activeStatus: brandData.activeStatus ?? true,
          deleteStatus: false,
          createdBy: brandData.createdBy,
          updatedBy: brandData.createdBy
        },
        include: {
          Usercreated: { select: { id: true, name: true, email: true } }
        }
      });

      return brand;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Error creating lens brand:', error);
      throw new APIError('Failed to create lens brand', 500, 'CREATE_BRAND_ERROR');
    }
  }

  async getLensBrands(queryParams) {
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
      const total = await prisma.lensBrandMaster.count({ where });

      const brands = await prisma.lensBrandMaster.findMany({
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
        data: brands,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error fetching lens brands:', error);
      throw new APIError('Failed to fetch lens brands', 500, 'FETCH_BRANDS_ERROR');
    }
  }

  async getLensBrandById(id) {
    try {
      const brand = await prisma.lensBrandMaster.findUnique({
        where: { id },
        include: {
          Usercreated: { select: { id: true, name: true, email: true } },
          Userupdated: { select: { id: true, name: true, email: true } },
          _count: { select: { lensProductMasters: true } }
        }
      });

      if (!brand || brand.deleteStatus) {
        throw new APIError('Lens brand not found', 404, 'BRAND_NOT_FOUND');
      }

      return brand;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Error fetching lens brand:', error);
      throw new APIError('Failed to fetch lens brand', 500, 'FETCH_BRAND_ERROR');
    }
  }

  async updateLensBrand(id, updateData) {
    try {
      const existing = await prisma.lensBrandMaster.findUnique({ where: { id } });

      if (!existing || existing.deleteStatus) {
        throw new APIError('Lens brand not found', 404, 'BRAND_NOT_FOUND');
      }

      if (updateData.name && updateData.name !== existing.name) {
        const duplicate = await prisma.lensBrandMaster.findFirst({
          where: { name: updateData.name, id: { not: id }, deleteStatus: false }
        });

        if (duplicate) {
          throw new APIError('Brand name already exists', 409, 'DUPLICATE_NAME');
        }
      }

      const updated = await prisma.lensBrandMaster.update({
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
      console.error('Error updating lens brand:', error);
      throw new APIError('Failed to update lens brand', 500, 'UPDATE_BRAND_ERROR');
    }
  }

  async deleteLensBrand(id, updatedBy) {
    try {
      const existing = await prisma.lensBrandMaster.findUnique({
        where: { id },
        include: { _count: { select: { lensProductMasters: true } } }
      });

      if (!existing || existing.deleteStatus) {
        throw new APIError('Lens brand not found', 404, 'BRAND_NOT_FOUND');
      }

      if (existing._count.lensProductMasters > 0) {
        throw new APIError('Cannot delete brand with existing products', 400, 'BRAND_HAS_PRODUCTS');
      }

      await prisma.lensBrandMaster.update({
        where: { id },
        data: { deleteStatus: true, activeStatus: false, updatedBy }
      });

      return true;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Error deleting lens brand:', error);
      throw new APIError('Failed to delete lens brand', 500, 'DELETE_BRAND_ERROR');
    }
  }

  async getBrandDropdown() {
    try {
      const brands = await prisma.lensBrandMaster.findMany({
        where: { activeStatus: true, deleteStatus: false },
        select: { id: true, name: true, description: true },
        orderBy: { name: 'asc' }
      });

      return brands.map(b => ({
        id: b.id,
        label: b.name,
        value: b.id,
        description: b.description
      }));
    } catch (error) {
      console.error('Error fetching brand dropdown:', error);
      throw new APIError('Failed to fetch brand dropdown', 500, 'FETCH_DROPDOWN_ERROR');
    }
  }

  async getBrandStats() {
    try {
      const [total, active, inactive] = await Promise.all([
        prisma.lensBrandMaster.count({ where: { deleteStatus: false } }),
        prisma.lensBrandMaster.count({ where: { deleteStatus: false, activeStatus: true } }),
        prisma.lensBrandMaster.count({ where: { deleteStatus: false, activeStatus: false } })
      ]);

      return { total, active, inactive };
    } catch (error) {
      console.error('Error fetching brand stats:', error);
      throw new APIError('Failed to fetch brand statistics', 500, 'FETCH_STATS_ERROR');
    }
  }
}

export default LensBrandMasterService;
