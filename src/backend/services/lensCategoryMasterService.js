import prisma from '../config/prisma.js';
import { APIError } from '../middleware/errorHandler.js';

/**
 * Lens Category Master Service
 * Handles all database operations for Lens Category Master management
 */
export class LensCategoryMasterService {
  
  /**
   * Create a new lens category
   * @param {Object} categoryData - Category data
   * @returns {Promise<Object>} Created category
   */
  async createLensCategory(categoryData) {
    try {
      // Check if name already exists
      const existingCategory = await prisma.lensCategoryMaster.findUnique({
        where: { name: categoryData.name }
      });

      if (existingCategory) {
        throw new APIError('Category name already exists', 409, 'DUPLICATE_NAME');
      }

      const category = await prisma.lensCategoryMaster.create({
        data: {
          name: categoryData.name,
          description: categoryData.description,
          activeStatus: categoryData.activeStatus ?? true,
          deleteStatus: false,
          createdBy: categoryData.createdBy,
          updatedBy: categoryData.createdBy
        },
        include: {
          Usercreated: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      return category;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Error creating lens category:', error);
      throw new APIError('Failed to create lens category', 500, 'CREATE_CATEGORY_ERROR');
    }
  }

  /**
   * Get paginated list of lens categories
   * @param {Object} queryParams - Query parameters
   * @returns {Promise<Object>} Paginated categories
   */
  async getLensCategories(queryParams) {
    try {
      const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', search, activeStatus } = queryParams;
      
      const where = {};
      
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }
      
      if (activeStatus !== undefined) {
        where.activeStatus = activeStatus === 'true';
      }

      // Filter out deleted records
      where.deleteStatus = false;

      const offset = (page - 1) * limit;
      const total = await prisma.lensCategoryMaster.count({ where });

      const categories = await prisma.lensCategoryMaster.findMany({
        where,
        skip: offset,
        take: parseInt(limit),
        orderBy: { [sortBy]: sortOrder },
        include: {
          Usercreated: {
            select: { id: true, name: true }
          },
          Userupdated: {
            select: { id: true, name: true }
          },
          _count: {
            select: { lensProductMasters: true }
          }
        }
      });

      return {
        data: categories,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error fetching lens categories:', error);
      throw new APIError('Failed to fetch lens categories', 500, 'FETCH_CATEGORIES_ERROR');
    }
  }

  /**
   * Get lens category by ID
   * @param {number} id - Category ID
   * @returns {Promise<Object>} Category details
   */
  async getLensCategoryById(id) {
    try {
      const category = await prisma.lensCategoryMaster.findUnique({
        where: { id },
        include: {
          Usercreated: {
            select: { id: true, name: true, email: true }
          },
          Userupdated: {
            select: { id: true, name: true, email: true }
          },
          _count: {
            select: { lensProductMasters: true }
          }
        }
      });

      if (!category) {
        throw new APIError('Lens category not found', 404, 'CATEGORY_NOT_FOUND');
      }

      if (category.deleteStatus) {
        throw new APIError('Lens category has been deleted', 404, 'CATEGORY_DELETED');
      }

      return category;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Error fetching lens category by ID:', error);
      throw new APIError('Failed to fetch lens category', 500, 'FETCH_CATEGORY_ERROR');
    }
  }

  /**
   * Update lens category
   * @param {number} id - Category ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated category
   */
  async updateLensCategory(id, updateData) {
    try {
      const existingCategory = await prisma.lensCategoryMaster.findUnique({
        where: { id }
      });

      if (!existingCategory) {
        throw new APIError('Lens category not found', 404, 'CATEGORY_NOT_FOUND');
      }

      if (existingCategory.deleteStatus) {
        throw new APIError('Cannot update deleted category', 400, 'CATEGORY_DELETED');
      }

      // Check for duplicate name if being updated
      if (updateData.name && updateData.name !== existingCategory.name) {
        const duplicateName = await prisma.lensCategoryMaster.findFirst({
          where: {
            name: updateData.name,
            id: { not: id }
          }
        });

        if (duplicateName) {
          throw new APIError('Category name already exists', 409, 'DUPLICATE_NAME');
        }
      }

      const updatedCategory = await prisma.lensCategoryMaster.update({
        where: { id },
        data: {
          name: updateData.name,
          description: updateData.description,
          activeStatus: updateData.activeStatus,
          updatedBy: updateData.updatedBy
        },
        include: {
          Usercreated: {
            select: { id: true, name: true }
          },
          Userupdated: {
            select: { id: true, name: true }
          }
        }
      });

      return updatedCategory;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Error updating lens category:', error);
      throw new APIError('Failed to update lens category', 500, 'UPDATE_CATEGORY_ERROR');
    }
  }

  /**
   * Delete lens category (soft delete)
   * @param {number} id - Category ID
   * @param {number} updatedBy - User ID performing deletion
   * @returns {Promise<boolean>} Deletion success
   */
  async deleteLensCategory(id, updatedBy) {
    try {
      const existingCategory = await prisma.lensCategoryMaster.findUnique({
        where: { id },
        include: {
          _count: {
            select: { lensProductMasters: true }
          }
        }
      });

      if (!existingCategory) {
        throw new APIError('Lens category not found', 404, 'CATEGORY_NOT_FOUND');
      }

      if (existingCategory.deleteStatus) {
        throw new APIError('Category is already deleted', 400, 'CATEGORY_ALREADY_DELETED');
      }

      // Check if category has products
      if (existingCategory._count.lensProductMasters > 0) {
        throw new APIError('Cannot delete category with existing products', 400, 'CATEGORY_HAS_PRODUCTS');
      }

      // Soft delete
      await prisma.lensCategoryMaster.update({
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
      console.error('Error deleting lens category:', error);
      throw new APIError('Failed to delete lens category', 500, 'DELETE_CATEGORY_ERROR');
    }
  }

  /**
   * Get dropdown list of lens categories
   * @returns {Promise<Array>} Categories for dropdown
   */
  async getCategoryDropdown() {
    try {
      const categories = await prisma.lensCategoryMaster.findMany({
        where: {
          activeStatus: true,
          deleteStatus: false
        },
        select: {
          id: true,
          name: true,
          description: true
        },
        orderBy: { name: 'asc' }
      });

      return categories.map(cat => ({
        id: cat.id,
        label: cat.name,
        value: cat.id,
        description: cat.description
      }));
    } catch (error) {
      console.error('Error fetching category dropdown:', error);
      throw new APIError('Failed to fetch category dropdown', 500, 'FETCH_DROPDOWN_ERROR');
    }
  }

  /**
   * Check if category name exists
   * @param {string} name - Category name
   * @param {number} excludeId - ID to exclude
   * @returns {Promise<boolean>} Whether name exists
   */
  async isCategoryNameExists(name, excludeId = null) {
    try {
      const where = { name, deleteStatus: false };
      if (excludeId) {
        where.id = { not: excludeId };
      }

      const existing = await prisma.lensCategoryMaster.findFirst({ where });
      return !!existing;
    } catch (error) {
      console.error('Error checking category name:', error);
      return false;
    }
  }

  /**
   * Get category statistics
   * @returns {Promise<Object>} Statistics
   */
  async getCategoryStats() {
    try {
      const [total, active, inactive] = await Promise.all([
        prisma.lensCategoryMaster.count({ where: { deleteStatus: false } }),
        prisma.lensCategoryMaster.count({ where: { deleteStatus: false, activeStatus: true } }),
        prisma.lensCategoryMaster.count({ where: { deleteStatus: false, activeStatus: false } })
      ]);

      return { total, active, inactive };
    } catch (error) {
      console.error('Error fetching category stats:', error);
      throw new APIError('Failed to fetch category statistics', 500, 'FETCH_STATS_ERROR');
    }
  }
}

export default LensCategoryMasterService;
