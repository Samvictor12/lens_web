import { PrismaClient } from '@prisma/client';
import { APIError } from '../middleware/errorHandler.js';

const prisma = new PrismaClient();

/**
 * Business Category Service
 * Handles all database operations for Business Category management
 */
export class BusinessCategoryService {
  
  /**
   * Create a new business category
   * @param {Object} categoryData - Category data
   * @returns {Promise<Object>} Created category
   */
  async createBusinessCategory(categoryData) {
    try {
      // Check if name already exists
      const existingCategory = await prisma.businessCategory.findFirst({
        where: { 
          name: categoryData.name,
          delete_status: false
        }
      });

      if (existingCategory) {
        throw new APIError(409, 'Category name already exists', 'DUPLICATE_CATEGORY_NAME');
      }

      // Create the business category
      const category = await prisma.businessCategory.create({
        data: {
          name: categoryData.name,
          active_status: categoryData.active_status !== undefined ? categoryData.active_status : true,
          delete_status: false,
          createdBy: categoryData.createdBy,
          updatedBy: categoryData.updatedBy
        }
      });

      return category;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error('Error creating business category:', error);
      throw new APIError(500, 'Failed to create business category', 'CREATE_CATEGORY_ERROR');
    }
  }

  /**
   * Get paginated list of business categories with filtering
   * @param {Object} queryParams - Query parameters for filtering and pagination
   * @returns {Promise<Object>} Paginated categories list
   */
  async getBusinessCategories(queryParams) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        name,
        active_status
      } = queryParams;

      // Build where clause
      const where = {
        delete_status: false
      };

      // Add name search (partial match, case insensitive)
      if (name) {
        where.name = {
          contains: name,
          mode: 'insensitive'
        };
      }

      // Add active status filter
      if (active_status !== undefined) {
        where.active_status = active_status === 'true' || active_status === true;
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      // Get total count
      const total = await prisma.businessCategory.count({ where });

      // Get paginated data
      const categories = await prisma.businessCategory.findMany({
        where,
        skip,
        take,
        orderBy: {
          [sortBy]: sortOrder
        }
      });

      return {
        data: categories,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      };
    } catch (error) {
      console.error('Error fetching business categories:', error);
      throw new APIError(500, 'Failed to fetch business categories', 'FETCH_CATEGORIES_ERROR');
    }
  }

  /**
   * Get single business category by ID
   * @param {number} id - Category ID
   * @returns {Promise<Object>} Category data
   */
  async getBusinessCategoryById(id) {
    try {
      const category = await prisma.businessCategory.findUnique({
        where: { id: parseInt(id) },
        include: {
          _count: {
            select: { customers: true }
          }
        }
      });

      if (!category || category.delete_status) {
        throw new APIError(404, 'Business category not found', 'CATEGORY_NOT_FOUND');
      }

      return category;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error('Error fetching business category:', error);
      throw new APIError(500, 'Failed to fetch business category', 'FETCH_CATEGORY_ERROR');
    }
  }

  /**
   * Update business category
   * @param {number} id - Category ID
   * @param {Object} categoryData - Updated category data
   * @returns {Promise<Object>} Updated category
   */
  async updateBusinessCategory(id, categoryData) {
    try {
      // Check if category exists
      const existingCategory = await prisma.businessCategory.findUnique({
        where: { id: parseInt(id) }
      });

      if (!existingCategory || existingCategory.delete_status) {
        throw new APIError(404, 'Business category not found', 'CATEGORY_NOT_FOUND');
      }

      // Check if new name already exists (excluding current category)
      if (categoryData.name) {
        const duplicateName = await prisma.businessCategory.findFirst({
          where: {
            name: categoryData.name,
            id: { not: parseInt(id) },
            delete_status: false
          }
        });

        if (duplicateName) {
          throw new APIError(409, 'Category name already exists', 'DUPLICATE_CATEGORY_NAME');
        }
      }

      // Update the category
      const updatedCategory = await prisma.businessCategory.update({
        where: { id: parseInt(id) },
        data: {
          name: categoryData.name,
          active_status: categoryData.active_status,
          updatedBy: categoryData.updatedBy
        }
      });

      return updatedCategory;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error('Error updating business category:', error);
      throw new APIError(500, 'Failed to update business category', 'UPDATE_CATEGORY_ERROR');
    }
  }

  /**
   * Soft delete business category
   * @param {number} id - Category ID
   * @param {number} updatedBy - User ID performing the delete
   * @returns {Promise<Object>} Success response
   */
  async deleteBusinessCategory(id, updatedBy) {
    try {
      // Check if category exists
      const existingCategory = await prisma.businessCategory.findUnique({
        where: { id: parseInt(id) }
      });

      if (!existingCategory) {
        throw new APIError(404, 'Business category not found', 'CATEGORY_NOT_FOUND');
      }

      if (existingCategory.delete_status) {
        throw new APIError(400, 'Category is already deleted', 'CATEGORY_ALREADY_DELETED');
      }

      // Soft delete the category (set both flags to false as per requirement)
      await prisma.businessCategory.update({
        where: { id: parseInt(id) },
        data: {
          delete_status: true,
          active_status: false,
          updatedBy
        }
      });

      return { message: 'Business category deleted successfully' };
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error('Error deleting business category:', error);
      throw new APIError(500, 'Failed to delete business category', 'DELETE_CATEGORY_ERROR');
    }
  }

  /**
   * Get dropdown list of active business categories
   * @returns {Promise<Array>} List of active categories
   */
  async getBusinessCategoryDropdown() {
    try {
      const categories = await prisma.businessCategory.findMany({
        where: {
          active_status: true,
          delete_status: false
        },
        select: {
          id: true,
          name: true
        },
        orderBy: {
          name: 'asc'
        }
      });

      return categories;
    } catch (error) {
      console.error('Error fetching business category dropdown:', error);
      throw new APIError(500, 'Failed to fetch business category dropdown', 'FETCH_DROPDOWN_ERROR');
    }
  }
}

export default BusinessCategoryService;
