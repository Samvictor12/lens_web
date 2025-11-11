import { PrismaClient } from '@prisma/client';
import { APIError } from '../middleware/errorHandler.js';

const prisma = new PrismaClient();

/**
 * Customer Master Service
 * Handles all database operations for Customer Master management
 */
export class CustomerMasterService {
  
  /**
   * Create a new customer master
   * @param {Object} customerData - Customer master data
   * @returns {Promise<Object>} Created customer master
   */
  async createCustomerMaster(customerData) {
    try {
      // Check if email already exists (if provided)
      if (customerData.email) {
        const existingCustomer = await prisma.customer.findUnique({
          where: { email: customerData.email }
        });

        if (existingCustomer) {
          throw new APIError(409, 'Email already exists', 'DUPLICATE_EMAIL');
        }
      }

      // Create the customer master
      const customerMaster = await prisma.customer.create({
        data: {
          name: customerData.name,
          phone: customerData.phone,
          email: customerData.email,
          address: customerData.address,
          city: customerData.city,
          state: customerData.state,
          pincode: customerData.pincode,
          catagory: customerData.catagory,
          gstin: customerData.gstin,
          credit_limit: customerData.credit_limit,
          status: customerData.status,
          notes: customerData.notes
        }
      });

      return customerMaster;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error('Error creating customer master:', error);
      throw new APIError(500, 'Failed to create customer master', 'CREATE_CUSTOMER_ERROR');
    }
  }

  /**
   * Get paginated list of customer masters with filtering
   * @param {Object} queryParams - Query parameters for filtering and pagination
   * @returns {Promise<Object>} Paginated customer masters list
   */
  async getCustomerMasters(queryParams) {
    try {
      const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', ...filters } = queryParams;
      
      // Build where clause for filtering
      const where = {};
      
      if (filters.name) {
        where.name = {
          contains: filters.name,
          mode: 'insensitive'
        };
      }
      
      if (filters.city) {
        where.city = {
          contains: filters.city,
          mode: 'insensitive'
        };
      }
      
      if (filters.catagory) {
        where.catagory = {
          contains: filters.catagory,
          mode: 'insensitive'
        };
      }
      
      if (filters.email) {
        where.email = {
          contains: filters.email,
          mode: 'insensitive'
        };
      }
      
      if (filters.phone) {
        where.phone = {
          contains: filters.phone
        };
      }

      if (filters.status) {
        where.status = {
          contains: filters.status,
          mode: 'insensitive'
        };
      }

      // Calculate offset
      const offset = (page - 1) * limit;

      // Get total count for pagination
      const total = await prisma.customer.count({ where });

      // Get customer masters with pagination
      const customerMasters = await prisma.customer.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder
        }
      });

      // Calculate pagination info
      const pages = Math.ceil(total / limit);

      return {
        data: customerMasters,
        pagination: {
          page,
          limit,
          total,
          pages
        }
      };
    } catch (error) {
      console.error('Error fetching customer masters:', error);
      throw new APIError(500, 'Failed to fetch customer masters', 'FETCH_CUSTOMERS_ERROR');
    }
  }

  /**
   * Get customer master by ID
   * @param {number} id - Customer master ID
   * @returns {Promise<Object>} Customer master details
   */
  async getCustomerMasterById(id) {
    try {
      const customerMaster = await prisma.customer.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              saleOrders: true
            }
          }
        }
      });

      if (!customerMaster) {
        throw new APIError(404, 'Customer master not found', 'CUSTOMER_MASTER_NOT_FOUND');
      }

      return customerMaster;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error('Error fetching customer master by ID:', error);
      throw new APIError(500, 'Failed to fetch customer master', 'FETCH_CUSTOMER_ERROR');
    }
  }

  /**
   * Update customer master
   * @param {number} id - Customer master ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated customer master
   */
  async updateCustomerMaster(id, updateData) {
    try {
      // Check if customer master exists
      const existingCustomer = await prisma.customer.findUnique({
        where: { id }
      });

      if (!existingCustomer) {
        throw new APIError(404, 'Customer master not found', 'CUSTOMER_MASTER_NOT_FOUND');
      }

      // Check for duplicate email if being updated
      if (updateData.email && updateData.email !== existingCustomer.email) {
        const duplicateEmail = await prisma.customer.findFirst({
          where: {
            email: updateData.email,
            id: { not: id }
          }
        });

        if (duplicateEmail) {
          throw new APIError(409, 'Email already exists', 'DUPLICATE_EMAIL');
        }
      }

      // Update the customer master
      const updatedCustomer = await prisma.customer.update({
        where: { id },
        data: {
          ...updateData,
          credit_limit: updateData.credit_limit?.toString() || existingCustomer.credit_limit
        }
      });

      return updatedCustomer;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error('Error updating customer master:', error);
      throw new APIError(500, 'Failed to update customer master', 'UPDATE_CUSTOMER_ERROR');
    }
  }

  /**
   * Delete customer master
   * @param {number} id - Customer master ID
   * @returns {Promise<boolean>} Deletion success
   */
  async deleteCustomerMaster(id) {
    try {
      // Check if customer master exists
      const existingCustomer = await prisma.customer.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              saleOrders: true
            }
          }
        }
      });

      if (!existingCustomer) {
        throw new APIError(404, 'Customer master not found', 'CUSTOMER_MASTER_NOT_FOUND');
      }

      // Check if customer has any sale orders
      if (existingCustomer._count.saleOrders > 0) {
        throw new APIError(400, 'Cannot delete customer with existing sale orders', 'CUSTOMER_HAS_ORDERS');
      }

      // Delete the customer master
      await prisma.customer.delete({
        where: { id }
      });

      return true;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error('Error deleting customer master:', error);
      throw new APIError(500, 'Failed to delete customer master', 'DELETE_CUSTOMER_ERROR');
    }
  }

  /**
   * Check if customer email exists
   * @param {string} email - Email to check
   * @param {number} excludeId - ID to exclude from check (for updates)
   * @returns {Promise<boolean>} Whether email exists
   */
  async isCustomerEmailExists(email, excludeId = null) {
    try {
      const where = { email };
      if (excludeId) {
        where.id = { not: excludeId };
      }

      const existingCustomer = await prisma.customer.findFirst({ where });
      return !!existingCustomer;
    } catch (error) {
      console.error('Error checking customer email:', error);
      return false;
    }
  }

  /**
   * Get customer master dropdown list (for forms)
   * @returns {Promise<Array>} Simple customer list for dropdowns
   */
  async getCustomerDropdown() {
    try {
      const customers = await prisma.customer.findMany({
        select: {
          id: true,
          name: true,
          city: true,
          phone: true
        },
        orderBy: {
          name: 'asc'
        }
      });

      return customers.map(customer => ({
        id: customer.id,
        label: `${customer.name}${customer.city ? ` (${customer.city})` : ''}`,
        value: customer.id,
        phone: customer.phone
      }));
    } catch (error) {
      console.error('Error fetching customer dropdown:', error);
      throw new APIError(500, 'Failed to fetch customer dropdown', 'FETCH_DROPDOWN_ERROR');
    }
  }
}

export default CustomerMasterService;