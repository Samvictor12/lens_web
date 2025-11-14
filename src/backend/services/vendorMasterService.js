import prisma from "../config/prisma.js";
import { APIError } from "../middleware/errorHandler.js";

/**
 * Vendor Master Service
 * Business logic for Vendor Master operations
 */
export class VendorMasterService {
  /**
   * Create a new vendor master
   * @param {Object} vendorData - Vendor master data
   * @returns {Promise<Object>} Created vendor master
   */
  async createVendorMaster(vendorData) {
    console.log("vendorData", vendorData);

    try {
      // Check if code already exists
      if (vendorData.code) {
        const existingCode = await prisma.vendor.findUnique({
          where: { code: vendorData.code },
        });

        if (existingCode) {
          throw new APIError(
            "Vendor code already exists",
            409,
            "DUPLICATE_CODE"
          );
        }
      }

      // Check if email already exists (if provided)
      if (vendorData.email) {
        const existingVendor = await prisma.vendor.findFirst({
          where: { email: vendorData.email },
        });

        if (existingVendor) {
          throw new APIError("Email already exists", 409, "DUPLICATE_EMAIL");
        }
      }

      // Create the vendor master
      const vendorMaster = await prisma.vendor.create({
        data: {
          name: vendorData.name,
          code: vendorData.code,
          shopname: vendorData.shopname,
          phone: vendorData.phone,
          alternatephone: vendorData.alternatephone,
          email: vendorData.email,
          address: vendorData.address,
          city: vendorData.city,
          state: vendorData.state,
          pincode: vendorData.pincode,
          category: vendorData.category,
          gstin: vendorData.gstin,
          active_status: vendorData.active_status,
          delete_status: vendorData.delete_status || false,
          notes: vendorData.notes,
          createdBy: vendorData.createdBy,
          // updatedBy is optional - only set on updates, not on create
        },
        include: {
          usercreate: {
            select: { id: true, name: true, email: true },
          },
          userupdate: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return vendorMaster;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error("Error creating vendor master:", error);
      throw new APIError(
        "Failed to create vendor master",
        500,
        "CREATE_VENDOR_ERROR"
      );
    }
  }

  /**
   * Get paginated list of vendor masters with filtering
   * @param {Object} queryParams - Query parameters for filtering and pagination
   * @returns {Promise<Object>} Paginated vendor masters list
   */
  async getVendorMasters(queryParams) {
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

      if (filters.city) {
        where.city = {
          contains: filters.city,
          mode: "insensitive",
        };
      }

      if (filters.code) {
        where.code = {
          contains: filters.code,
          mode: "insensitive",
        };
      }

      if (filters.category) {
        where.category = {
          contains: filters.category,
          mode: "insensitive",
        };
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
      const total = await prisma.vendor.count({ where });

      // Get vendor masters with pagination
      const vendorMasters = await prisma.vendor.findMany({
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
        },
      });

      // Calculate pagination info
      const pages = Math.ceil(total / limit);

      return {
        data: vendorMasters,
        pagination: {
          page,
          limit,
          total,
          pages,
        },
      };
    } catch (error) {
      console.error("Error fetching vendor masters:", error);
      throw new APIError(
        "Failed to fetch vendor masters",
        500,
        "FETCH_VENDORS_ERROR"
      );
    }
  }

  /**
   * Get vendor master by ID
   * @param {number} id - Vendor master ID
   * @returns {Promise<Object>} Vendor master details
   */
  async getVendorMasterById(id) {
    try {
      const vendorMaster = await prisma.vendor.findUnique({
        where: { id },
        include: {
          usercreate: {
            select: { id: true, name: true, email: true },
          },
          userupdate: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: {
              purchaseOrders: true,
            },
          },
        },
      });

      if (!vendorMaster) {
        throw new APIError(
          "Vendor master not found",
          404,
          "VENDOR_MASTER_NOT_FOUND"
        );
      }

      return vendorMaster;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error("Error fetching vendor master by ID:", error);
      throw new APIError(
        "Failed to fetch vendor master",
        500,
        "FETCH_VENDOR_ERROR"
      );
    }
  }

  /**
   * Update vendor master
   * @param {number} id - Vendor master ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated vendor master
   */
  async updateVendorMaster(id, updateData) {
    try {
      // Check if vendor master exists
      const existingVendor = await prisma.vendor.findUnique({
        where: { id },
      });

      if (!existingVendor) {
        throw new APIError(
          "Vendor master not found",
          404,
          "VENDOR_MASTER_NOT_FOUND"
        );
      }

      // Check for duplicate email if being updated
      if (updateData.email && updateData.email !== existingVendor.email) {
        const duplicateEmail = await prisma.vendor.findFirst({
          where: {
            email: updateData.email,
            id: { not: id },
          },
        });

        if (duplicateEmail) {
          throw new APIError("Email already exists", 409, "DUPLICATE_EMAIL");
        }
      }

      // Update the vendor master
      const updatedVendor = await prisma.vendor.update({
        where: { id },
        data: updateData,
      });

      return updatedVendor;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error("Error updating vendor master:", error);
      throw new APIError(
        "Failed to update vendor master",
        500,
        "UPDATE_VENDOR_ERROR"
      );
    }
  }

  /**
   * Delete vendor master (soft delete)
   * @param {number} id - Vendor master ID
   * @param {number} updatedBy - User ID performing the deletion
   * @returns {Promise<boolean>} Deletion success
   */
  async deleteVendorMaster(id, updatedBy) {
    try {
      // Check if vendor master exists
      const existingVendor = await prisma.vendor.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              purchaseOrders: true,
            },
          },
        },
      });

      if (!existingVendor) {
        throw new APIError(
          "Vendor master not found",
          404,
          "VENDOR_MASTER_NOT_FOUND"
        );
      }

      if (existingVendor.delete_status) {
        throw new APIError(
          "Vendor is already deleted",
          400,
          "VENDOR_ALREADY_DELETED"
        );
      }

      // Check if vendor has any purchase orders
      if (existingVendor._count.purchaseOrders > 0) {
        throw new APIError(
          "Cannot delete vendor with existing purchase orders",
          400,
          "VENDOR_HAS_ORDERS"
        );
      }

      // Soft delete the vendor master
      await prisma.vendor.update({
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
      console.error("Error deleting vendor master:", error);
      throw new APIError(
        "Failed to delete vendor master",
        500,
        "DELETE_VENDOR_ERROR"
      );
    }
  }

  /**
   * Check if vendor email exists
   * @param {string} email - Email to check
   * @param {number} excludeId - ID to exclude from check (for updates)
   * @returns {Promise<boolean>} Whether email exists
   */
  async isVendorEmailExists(email, excludeId = null) {
    try {
      const where = { email };
      if (excludeId) {
        where.id = { not: excludeId };
      }

      const existingVendor = await prisma.vendor.findFirst({ where });
      return !!existingVendor;
    } catch (error) {
      console.error("Error checking vendor email:", error);
      return false;
    }
  }

  /**
   * Get vendor master dropdown list (for forms)
   * @returns {Promise<Array>} Simple vendor list for dropdowns
   */
  async getVendorDropdown() {
    try {
      const vendors = await prisma.vendor.findMany({
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

      return vendors.map((vendor) => ({
        id: vendor.id,
        label: `${vendor.name} (${vendor.code})${
          vendor.city ? ` - ${vendor.city}` : ""
        }`,
        value: vendor.id,
        code: vendor.code,
        phone: vendor.phone,
      }));
    } catch (error) {
      console.error("Error fetching vendor dropdown:", error);
      throw new APIError(
        "Failed to fetch vendor dropdown",
        500,
        "FETCH_DROPDOWN_ERROR"
      );
    }
  }
}

export default VendorMasterService;
