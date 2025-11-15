import prisma from "../config/prisma.js";
import { APIError } from "../middleware/errorHandler.js";

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
    console.log("customerData", customerData);

    try {
      // Check if email already exists (if provided)
      if (customerData.email) {
        const existingCustomer = await prisma.customer.findFirst({
          where: { email: customerData.email, delete_status: false },
        });
        console.log("existingCustomer", existingCustomer);

        if (existingCustomer) {
          throw new APIError("Email already exists", 409, "DUPLICATE_EMAIL");
        }
      }

      // Check if customer code already exists
      if (customerData.code) {
        const existingCode = await prisma.customer.findUnique({
          where: { code: customerData.code },
        });

        if (existingCode) {
          throw new APIError(
            "Customer code already exists",
            409,
            "DUPLICATE_CODE"
          );
        }
      }

      // Create the customer master
      const customerMaster = await prisma.customer.create({
        data: {
          name: customerData.name,
          code: customerData.code,
          shopname: customerData.shopname,
          phone: customerData.phone,
          alternatephone: customerData.alternatephone,
          email: customerData.email,
          address: customerData.address,
          city: customerData.city,
          state: customerData.state,
          pincode: customerData.pincode,
          businessCategory_id: customerData.businessCategory_id,
          gstin: customerData.gstin,
          credit_limit: customerData.credit_limit,
          outstanding_credit: customerData.outstanding_credit,
          active_status: customerData.active_status,
          delete_status: customerData.delete_status || false,
          notes: customerData.notes,
          createdBy: customerData.createdBy,
        },
        include: {
          usercreate: {
            select: { id: true, name: true, email: true },
          },
          userupdate: {
            select: { id: true, name: true, email: true },
          },
          category: {
            select: { id: true, name: true },
          },
        },
      });

      return customerMaster;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error("Error creating customer master:", error);
      throw new APIError(
        "Failed to create customer master",
        500,
        "CREATE_CUSTOMER_ERROR"
      );
    }
  }

  /**
   * Get paginated list of customer masters with filtering
   * @param {Object} queryParams - Query parameters for filtering and pagination
   * @returns {Promise<Object>} Paginated customer masters list
   */
  async getCustomerMasters(queryParams) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc",
        ...filters
      } = queryParams;

      // Build where clause for filtering
      const where = {};

      if (filters.name) {
        where.name = {
          contains: filters.name,
          mode: "insensitive",
        };
      }

      if (filters.code) {
        where.code = {
          contains: filters.code,
          mode: "insensitive",
        };
      }

      if (filters.city) {
        where.city = {
          contains: filters.city,
          mode: "insensitive",
        };
      }

      if (filters.businessCategory_id) {
        where.businessCategory_id = filters.businessCategory_id;
      }

      if (filters.email) {
        where.email = {
          contains: filters.email,
          mode: "insensitive",
        };
      }

      if (filters.phone) {
        where.phone = {
          contains: filters.phone,
        };
      }

      if (filters.active_status !== undefined) {
        where.active_status = filters.active_status;
      }

      // Always filter out deleted records unless specifically requested
      if (!filters.includeDeleted) {
        where.delete_status = false;
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
          [sortBy]: sortOrder,
        },
        include: {
          usercreate: {
            select: { id: true, name: true, email: true },
          },
          userupdate: {
            select: { id: true, name: true, email: true },
          },
          category: {
            select: { id: true, name: true },
          },
        },
      });

      // Calculate pagination info
      const pages = Math.ceil(total / limit);

      return {
        data: customerMasters,
        pagination: {
          page,
          limit,
          total,
          pages,
        },
      };
    } catch (error) {
      console.error("Error fetching customer masters:", error);
      throw new APIError(
        "Failed to fetch customer masters",
        500,
        "FETCH_CUSTOMERS_ERROR"
      );
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
          usercreate: {
            select: { id: true, name: true, email: true },
          },
          userupdate: {
            select: { id: true, name: true, email: true },
          },
          category: {
            select: { id: true, name: true },
          },
          _count: {
            select: {
              saleOrders: true,
            },
          },
        },
      });

      if (!customerMaster) {
        throw new APIError(
          "Customer master not found",
          404,
          "CUSTOMER_MASTER_NOT_FOUND"
        );
      }

      return customerMaster;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error("Error fetching customer master by ID:", error);
      throw new APIError(
        "Failed to fetch customer master",
        500,
        "FETCH_CUSTOMER_ERROR"
      );
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
        where: { id },
      });

      if (!existingCustomer) {
        throw new APIError(
          "Customer master not found",
          404,
          "CUSTOMER_MASTER_NOT_FOUND"
        );
      }

      // Check for duplicate email if being updated
      if (updateData.email && updateData.email !== existingCustomer.email) {
        const duplicateEmail = await prisma.customer.findFirst({
          where: {
            email: updateData.email,
            id: { not: id },
          },
        });

        if (duplicateEmail) {
          throw new APIError("Email already exists", 409, "DUPLICATE_EMAIL");
        }
      }

      // Update the customer master
      const updatedCustomer = await prisma.customer.update({
        where: { id },
        data: updateData,
      });

      return updatedCustomer;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error("Error updating customer master:", error);
      throw new APIError(
        "Failed to update customer master",
        500,
        "UPDATE_CUSTOMER_ERROR"
      );
    }
  }

  /**
   * Delete customer master (soft delete)
   * @param {number} id - Customer master ID
   * @param {number} updatedBy - User ID performing the deletion
   * @returns {Promise<boolean>} Deletion success
   */
  async deleteCustomerMaster(id, updatedBy) {
    try {
      // Check if customer master exists
      const existingCustomer = await prisma.customer.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              saleOrders: true,
            },
          },
        },
      });

      if (!existingCustomer) {
        throw new APIError(
          "Customer master not found",
          404,
          "CUSTOMER_MASTER_NOT_FOUND"
        );
      }

      if (existingCustomer.delete_status) {
        throw new APIError(
          "Customer is already deleted",
          400,
          "CUSTOMER_ALREADY_DELETED"
        );
      }

      // Check if customer has any sale orders
      if (existingCustomer._count.saleOrders > 0) {
        throw new APIError(
          "Cannot delete customer with existing sale orders",
          400,
          "CUSTOMER_HAS_ORDERS"
        );
      }

      // Soft delete the customer master
      await prisma.customer.update({
        where: { id },
        data: {
          delete_status: true,
          active_status: false,
          updatedBy: updatedBy,
        },
      });

      return true;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error("Error deleting customer master:", error);
      throw new APIError(
        "Failed to delete customer master",
        500,
        "DELETE_CUSTOMER_ERROR"
      );
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
      console.error("Error checking customer email:", error);
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
        where: {
          active_status: true,
          delete_status: false,
        },
        select: {
          id: true,
          name: true,
          code: true,
          city: true,
          phone: true,
        },
        orderBy: {
          name: "asc",
        },
      });

      return customers.map((customer) => ({
        id: customer.id,
        label: `${customer.name} (${customer.code})${
          customer.city ? ` - ${customer.city}` : ""
        }`,
        value: customer.id,
        code: customer.code,
        phone: customer.phone,
      }));
    } catch (error) {
      console.error("Error fetching customer dropdown:", error);
      throw new APIError(
        "Failed to fetch customer dropdown",
        500,
        "FETCH_DROPDOWN_ERROR"
      );
    }
  }
}

export default CustomerMasterService;
