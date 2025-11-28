import prisma from "../config/prisma.js";
import { APIError } from "../middleware/errorHandler.js";

class PurchaseOrderService {
  /**
   * Generate next PO number
   * @returns {Promise<string>} Next PO number
   */
  async generatePONumber() {
    try {
      const lastPO = await prisma.purchaseOrder.findFirst({
        where: {
          poNumber: {
            startsWith: "PO-",
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!lastPO) {
        return "PO-0001";
      }

      const lastNumber = parseInt(lastPO.poNumber.split("-")[1]);
      const nextNumber = lastNumber + 1;
      return `PO-${String(nextNumber).padStart(4, "0")}`;
    } catch (error) {
      console.error("Error generating PO number:", error);
      throw new APIError(
        "Failed to generate PO number",
        500,
        "GENERATE_PO_NUMBER_ERROR"
      );
    }
  }

  /**
   * Create a new purchase order
   * @param {Object} poData - Purchase order data
   * @returns {Promise<Object>} Created purchase order
   */
  async createPurchaseOrder(poData) {
    try {
      // Check for duplicate reference_id if provided
      if (poData.reference_id) {
        const existing = await prisma.purchaseOrder.findUnique({
          where: { reference_id: poData.reference_id },
        });

        if (existing) {
          throw new APIError(
            "Purchase order with this reference ID already exists",
            409,
            "DUPLICATE_REFERENCE_ID"
          );
        }
      }

      const purchaseOrder = await prisma.purchaseOrder.create({
        data: poData,
        include: {
          vendor: {
            select: {
              id: true,
              code: true,
              name: true,
              shopname: true,
              email: true,
              phone: true,
            },
          },
          saleOrder: {
            select: {
              id: true,
              orderNo: true,
            },
          },
          lensProduct: {
            select: {
              id: true,
              lens_name: true,
              product_code: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          lensType: {
            select: {
              id: true,
              name: true,
            },
          },
          dia: {
            select: {
              id: true,
              name: true,
            },
          },
          fitting: {
            select: {
              id: true,
              name: true,
            },
          },
          coating: {
            select: {
              id: true,
              name: true,
            },
          },
          tinting: {
            select: {
              id: true,
              name: true,
            },
          },
          createdByUser: {
            select: {
              id: true,
              name: true,
              usercode: true,
            },
          },
        },
      });

      return purchaseOrder;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error("Error creating purchase order:", error);
      throw new APIError(
        "Failed to create purchase order",
        500,
        "CREATE_PO_ERROR"
      );
    }
  }

  /**
   * Get paginated list of purchase orders with filtering
   * @param {Object} queryParams - Query parameters for filtering and pagination
   * @returns {Promise<Object>} Paginated purchase orders list
   */
  async getPurchaseOrders(queryParams) {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        vendorId,
        status,
        activeStatus,
        startDate,
        endDate,
      } = queryParams;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      // Build where clause
      const where = {
        deleteStatus: false,
      };

      // Search filter
      if (search) {
        where.OR = [
          { poNumber: { contains: search, mode: "insensitive" } },
          { reference_id: { contains: search, mode: "insensitive" } },
          { supplierInvoiceNo: { contains: search, mode: "insensitive" } },
          {
            vendor: {
              name: { contains: search, mode: "insensitive" },
            },
          },
        ];
      }

      // Vendor filter
      if (vendorId) {
        where.vendorId = parseInt(vendorId);
      }

      // Status filter
      if (status && status !== "all") {
        where.status = status.toUpperCase();
      }

      // Active status filter
      if (activeStatus !== undefined && activeStatus !== "all") {
        where.activeStatus = activeStatus === "true" || activeStatus === true;
      }

      // Date range filter
      if (startDate || endDate) {
        where.orderDate = {};
        if (startDate) {
          where.orderDate.gte = new Date(startDate);
        }
        if (endDate) {
          where.orderDate.lte = new Date(endDate);
        }
      }

      // Execute query with pagination
      const [purchaseOrders, total] = await Promise.all([
        prisma.purchaseOrder.findMany({
          where,
          skip,
          take,
          include: {
            vendor: {
              select: {
                id: true,
                code: true,
                name: true,
                shopname: true,
                email: true,
                phone: true,
              },
            },
            saleOrder: {
              select: {
                id: true,
                orderNo: true,
              },
            },
            lensProduct: {
              select: {
                id: true,
                lens_name: true,
                product_code: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
              },
            },
            lensType: {
              select: {
                id: true,
                name: true,
              },
            },
            createdByUser: {
              select: {
                id: true,
                name: true,
                usercode: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        }),
        prisma.purchaseOrder.count({ where }),
      ]);

      return {
        data: purchaseOrders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / take),
        },
      };
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
      throw new APIError(
        "Failed to fetch purchase orders",
        500,
        "FETCH_POS_ERROR"
      );
    }
  }

  /**
   * Get purchase order by ID
   * @param {number} id - Purchase order ID
   * @returns {Promise<Object>} Purchase order details
   */
  async getPurchaseOrderById(id) {
    try {
      const purchaseOrder = await prisma.purchaseOrder.findUnique({
        where: { id },
        include: {
          vendor: {
            select: {
              id: true,
              code: true,
              name: true,
              shopname: true,
              email: true,
              phone: true,
              address: true,
              city: true,
              state: true,
              pincode: true,
              gstin: true,
            },
          },
          saleOrder: {
            select: {
              id: true,
              orderNo: true,
              customerId: true,
              customer: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },
          lensProduct: {
            select: {
              id: true,
              lens_name: true,
              product_code: true,
              brand: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          lensType: {
            select: {
              id: true,
              name: true,
            },
          },
          dia: {
            select: {
              id: true,
              name: true,
            },
          },
          fitting: {
            select: {
              id: true,
              name: true,
            },
          },
          coating: {
            select: {
              id: true,
              name: true,
            },
          },
          tinting: {
            select: {
              id: true,
              name: true,
            },
          },
          createdByUser: {
            select: {
              id: true,
              name: true,
              usercode: true,
            },
          },
          updatedByUser: {
            select: {
              id: true,
              name: true,
              usercode: true,
            },
          },
        },
      });

      if (!purchaseOrder) {
        throw new APIError("Purchase order not found", 404, "PO_NOT_FOUND");
      }

      return purchaseOrder;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error("Error fetching purchase order:", error);
      throw new APIError(
        "Failed to fetch purchase order",
        500,
        "FETCH_PO_ERROR"
      );
    }
  }

  /**
   * Update purchase order
   * @param {number} id - Purchase order ID
   * @param {Object} updateData - Updated purchase order data
   * @returns {Promise<Object>} Updated purchase order
   */
  async updatePurchaseOrder(id, updateData) {
    try {
      // Check if purchase order exists
      const existing = await prisma.purchaseOrder.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new APIError("Purchase order not found", 404, "PO_NOT_FOUND");
      }

      // Check for duplicate reference_id if being updated
      if (updateData.reference_id && updateData.reference_id !== existing.reference_id) {
        const duplicate = await prisma.purchaseOrder.findFirst({
          where: {
            reference_id: updateData.reference_id,
            id: { not: id },
          },
        });

        if (duplicate) {
          throw new APIError(
            "Purchase order with this reference ID already exists",
            409,
            "DUPLICATE_REFERENCE_ID"
          );
        }
      }

      const updatedPO = await prisma.purchaseOrder.update({
        where: { id },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
        include: {
          vendor: {
            select: {
              id: true,
              code: true,
              name: true,
              shopname: true,
              email: true,
              phone: true,
            },
          },
          saleOrder: {
            select: {
              id: true,
              orderNo: true,
            },
          },
          lensProduct: {
            select: {
              id: true,
              lens_name: true,
              product_code: true,
            },
          },
          updatedByUser: {
            select: {
              id: true,
              name: true,
              usercode: true,
            },
          },
        },
      });

      return updatedPO;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error("Error updating purchase order:", error);
      throw new APIError(
        "Failed to update purchase order",
        500,
        "UPDATE_PO_ERROR"
      );
    }
  }

  /**
   * Delete purchase order (soft delete)
   * @param {number} id - Purchase order ID
   * @param {number} updatedBy - User ID performing the deletion
   * @returns {Promise<Object>} Deleted purchase order
   */
  async deletePurchaseOrder(id, updatedBy) {
    try {
      const existing = await prisma.purchaseOrder.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new APIError("Purchase order not found", 404, "PO_NOT_FOUND");
      }

      const deletedPO = await prisma.purchaseOrder.update({
        where: { id },
        data: {
          deleteStatus: true,
          updatedBy,
          updatedAt: new Date(),
        },
      });

      return deletedPO;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error("Error deleting purchase order:", error);
      throw new APIError(
        "Failed to delete purchase order",
        500,
        "DELETE_PO_ERROR"
      );
    }
  }

  /**
   * Get vendor dropdown list
   * @returns {Promise<Array>} List of active vendors
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
          code: true,
          name: true,
          shopname: true,
        },
        orderBy: {
          name: "asc",
        },
      });

      return vendors.map((vendor) => ({
        value: vendor.id,
        label: `${vendor.code} - ${vendor.name}${
          vendor.shopname ? ` (${vendor.shopname})` : ""
        }`,
        ...vendor,
      }));
    } catch (error) {
      console.error("Error fetching vendor dropdown:", error);
      throw new APIError(
        "Failed to fetch vendors",
        500,
        "FETCH_VENDORS_ERROR"
      );
    }
  }
}

export default new PurchaseOrderService();
