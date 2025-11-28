import prisma from "../config/prisma.js";
import { APIError } from "../middleware/errorHandler.js";

/**
 * Inventory Service
 * Handles all database operations for Inventory management
 */
export class InventoryService {
  
  /**
   * Create a new inventory item (inward entry)
   * @param {Object} itemData - Inventory item data
   * @returns {Promise<Object>} Created inventory item with transaction
   */
  async createInventoryItem(itemData) {
    try {
      return await prisma.$transaction(async (prisma) => {
        // Generate transaction number
        const transactionNo = await this.generateTransactionNumber();
        
        // Create inventory item
        const inventoryItem = await prisma.inventoryItem.create({
          data: itemData,
          include: {
            lensProduct: { select: { id: true, lens_name: true, product_code: true } },
            category: { select: { id: true, name: true } },
            lensType: { select: { id: true, name: true } },
            coating: { select: { id: true, name: true } },
            location: { select: { id: true, name: true } },
            tray: { select: { id: true, name: true } },
            vendor: { select: { id: true, name: true } },
            purchaseOrder: { select: { id: true, poNumber: true } }
          }
        });

        // Create inventory transaction
        const transactionType = itemData.purchaseOrderId ? 'INWARD_PO' : 'INWARD_DIRECT';
        const transaction = await prisma.inventoryTransaction.create({
          data: {
            transactionNo,
            type: transactionType,
            inventoryItemId: inventoryItem.id,
            quantity: itemData.quantity,
            balanceAfter: itemData.quantity,
            unitPrice: itemData.costPrice,
            totalValue: itemData.quantity * itemData.costPrice,
            toLocationId: itemData.location_id,
            toTrayId: itemData.tray_id,
            purchaseOrderId: itemData.purchaseOrderId,
            vendorId: itemData.vendorId,
            batchNo: itemData.batchNo,
            reason: 'Initial inward entry',
            createdBy: itemData.createdBy
          }
        });

        // Update or create inventory stock summary
        await this.updateInventoryStock(inventoryItem, itemData.quantity, 'ADD');

        return {
          inventoryItem,
          transaction
        };
      });
    } catch (error) {
      console.error("Error creating inventory item:", error);
      throw new APIError(
        error.message || "Failed to create inventory item",
        500,
        "CREATE_INVENTORY_ITEM_ERROR"
      );
    }
  }

  /**
   * Get paginated inventory items
   * @param {Object} queryParams - Query parameters
   * @returns {Promise<Object>} Paginated inventory items
   */
  async getInventoryItems(queryParams) {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        status,
        lens_id,
        location_id,
        tray_id,
        vendor_id,
        category_id,
        startDate,
        endDate,
        sortBy = "createdAt",
        sortOrder = "desc"
      } = queryParams;

      const skip = (page - 1) * limit;
      const take = limit;

      // Build where clause
      const where = {
        deleteStatus: false,
      };

      // Search filter
      if (search) {
        where.OR = [
          { batchNo: { contains: search, mode: "insensitive" } },
          { serialNo: { contains: search, mode: "insensitive" } },
          { notes: { contains: search, mode: "insensitive" } },
          { lensProduct: { lens_name: { contains: search, mode: "insensitive" } } },
          { lensProduct: { product_code: { contains: search, mode: "insensitive" } } }
        ];
      }

      // Status filter
      if (status) {
        where.status = status;
      }

      // ID filters
      if (lens_id) where.lens_id = lens_id;
      if (location_id) where.location_id = location_id;
      if (tray_id) where.tray_id = tray_id;
      if (vendor_id) where.vendorId = vendor_id;
      if (category_id) where.category_id = category_id;

      // Date range filter
      if (startDate || endDate) {
        where.inwardDate = {};
        if (startDate) {
          where.inwardDate.gte = new Date(startDate);
        }
        if (endDate) {
          where.inwardDate.lte = new Date(endDate);
        }
      }

      // Build orderBy
      const orderBy = {};
      orderBy[sortBy] = sortOrder;

      // Execute query with pagination
      const [inventoryItems, total] = await Promise.all([
        prisma.inventoryItem.findMany({
          where,
          skip,
          take,
          orderBy,
          include: {
            lensProduct: {
              select: {
                id: true,
                lens_name: true,
                product_code: true,
                brand: { select: { name: true } }
              }
            },
            category: { select: { id: true, name: true } },
            lensType: { select: { id: true, name: true } },
            coating: { select: { id: true, name: true } },
            dia: { select: { id: true, name: true } },
            fitting: { select: { id: true, name: true } },
            tinting: { select: { id: true, name: true } },
            location: { select: { id: true, name: true, location_code: true } },
            tray: { select: { id: true, name: true, tray_code: true } },
            vendor: { select: { id: true, name: true, code: true } },
            purchaseOrder: { select: { id: true, poNumber: true } },
            saleOrder: { select: { id: true, orderNo: true } },
            createdByUser: { select: { id: true, name: true } }
          }
        }),
        prisma.inventoryItem.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        inventoryItems,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      };
    } catch (error) {
      console.error("Error fetching inventory items:", error);
      throw new APIError(
        error.message || "Failed to fetch inventory items",
        500,
        "FETCH_INVENTORY_ITEMS_ERROR"
      );
    }
  }

  /**
   * Get inventory item by ID
   * @param {number} id - Inventory item ID
   * @returns {Promise<Object>} Inventory item details
   */
  async getInventoryItemById(id) {
    try {
      const inventoryItem = await prisma.inventoryItem.findFirst({
        where: { id, deleteStatus: false },
        include: {
          lensProduct: {
            include: {
              brand: true,
              category: true,
              material: true,
              type: true
            }
          },
          category: true,
          lensType: true,
          coating: true,
          dia: true,
          fitting: true,
          tinting: true,
          location: true,
          tray: true,
          vendor: true,
          purchaseOrder: true,
          saleOrder: true,
          createdByUser: { select: { id: true, name: true } },
          updatedByUser: { select: { id: true, name: true } },
          transactions: {
            orderBy: { createdAt: 'desc' },
            include: {
              createdByUser: { select: { name: true } }
            }
          }
        }
      });

      if (!inventoryItem) {
        throw new APIError("Inventory item not found", 404, "INVENTORY_ITEM_NOT_FOUND");
      }

      return inventoryItem;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error("Error fetching inventory item:", error);
      throw new APIError(
        error.message || "Failed to fetch inventory item",
        500,
        "FETCH_INVENTORY_ITEM_ERROR"
      );
    }
  }

  /**
   * Update inventory item
   * @param {number} id - Inventory item ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated inventory item
   */
  async updateInventoryItem(id, updateData) {
    try {
      // Check if inventory item exists
      const existingItem = await prisma.inventoryItem.findFirst({
        where: { id, deleteStatus: false }
      });

      if (!existingItem) {
        throw new APIError("Inventory item not found", 404, "INVENTORY_ITEM_NOT_FOUND");
      }

      // Update inventory item
      const inventoryItem = await prisma.inventoryItem.update({
        where: { id },
        data: {
          ...updateData,
          updatedAt: new Date()
        },
        include: {
          lensProduct: { select: { id: true, lens_name: true, product_code: true } },
          category: { select: { id: true, name: true } },
          location: { select: { id: true, name: true } },
          tray: { select: { id: true, name: true } }
        }
      });

      return inventoryItem;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error("Error updating inventory item:", error);
      throw new APIError(
        error.message || "Failed to update inventory item",
        500,
        "UPDATE_INVENTORY_ITEM_ERROR"
      );
    }
  }

  /**
   * Get inventory transactions
   * @param {Object} queryParams - Query parameters
   * @returns {Promise<Object>} Paginated inventory transactions
   */
  async getInventoryTransactions(queryParams) {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        type,
        inventoryItemId,
        startDate,
        endDate,
        sortBy = "createdAt",
        sortOrder = "desc"
      } = queryParams;

      const skip = (page - 1) * limit;
      const take = limit;

      // Build where clause
      const where = {};

      // Search filter
      if (search) {
        where.OR = [
          { transactionNo: { contains: search, mode: "insensitive" } },
          { reason: { contains: search, mode: "insensitive" } },
          { notes: { contains: search, mode: "insensitive" } },
          { batchNo: { contains: search, mode: "insensitive" } }
        ];
      }

      // Filters
      if (type) where.type = type;
      if (inventoryItemId) where.inventoryItemId = inventoryItemId;

      // Date range filter
      if (startDate || endDate) {
        where.transactionDate = {};
        if (startDate) {
          where.transactionDate.gte = new Date(startDate);
        }
        if (endDate) {
          where.transactionDate.lte = new Date(endDate);
        }
      }

      // Build orderBy
      const orderBy = {};
      orderBy[sortBy] = sortOrder;

      // Execute query
      const [transactions, total] = await Promise.all([
        prisma.inventoryTransaction.findMany({
          where,
          skip,
          take,
          orderBy,
          include: {
            inventoryItem: {
              select: {
                id: true,
                batchNo: true,
                serialNo: true,
                lensProduct: { select: { lens_name: true, product_code: true } }
              }
            },
            fromLocation: { select: { id: true, name: true } },
            toLocation: { select: { id: true, name: true } },
            fromTray: { select: { id: true, name: true } },
            toTray: { select: { id: true, name: true } },
            purchaseOrder: { select: { id: true, poNumber: true } },
            saleOrder: { select: { id: true, orderNo: true } },
            vendor: { select: { id: true, name: true } },
            createdByUser: { select: { id: true, name: true } }
          }
        }),
        prisma.inventoryTransaction.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        transactions,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      };
    } catch (error) {
      console.error("Error fetching inventory transactions:", error);
      throw new APIError(
        error.message || "Failed to fetch inventory transactions",
        500,
        "FETCH_INVENTORY_TRANSACTIONS_ERROR"
      );
    }
  }

  /**
   * Create inventory transaction (for stock movements)
   * @param {Object} transactionData - Transaction data
   * @returns {Promise<Object>} Created transaction
   */
  async createInventoryTransaction(transactionData) {
    try {
      return await prisma.$transaction(async (prisma) => {
        // Generate transaction number
        const transactionNo = await this.generateTransactionNumber();
        
        // Get current inventory item
        const inventoryItem = await prisma.inventoryItem.findUnique({
          where: { id: transactionData.inventoryItemId }
        });

        if (!inventoryItem) {
          throw new APIError("Inventory item not found", 404, "INVENTORY_ITEM_NOT_FOUND");
        }

        // Calculate new balance
        const currentBalance = inventoryItem.quantity;
        const newBalance = currentBalance + transactionData.quantity; // quantity can be negative for outward

        if (newBalance < 0) {
          throw new APIError("Insufficient stock available", 400, "INSUFFICIENT_STOCK");
        }

        // Create transaction
        const transaction = await prisma.inventoryTransaction.create({
          data: {
            ...transactionData,
            transactionNo,
            balanceAfter: newBalance,
            totalValue: transactionData.unitPrice ? Math.abs(transactionData.quantity) * transactionData.unitPrice : null
          }
        });

        // Update inventory item quantity
        await prisma.inventoryItem.update({
          where: { id: transactionData.inventoryItemId },
          data: { 
            quantity: newBalance,
            updatedAt: new Date(),
            updatedBy: transactionData.createdBy
          }
        });

        // Update stock summary
        await this.updateInventoryStock(inventoryItem, transactionData.quantity, transactionData.quantity > 0 ? 'ADD' : 'SUBTRACT');

        return transaction;
      });
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error("Error creating inventory transaction:", error);
      throw new APIError(
        error.message || "Failed to create inventory transaction",
        500,
        "CREATE_INVENTORY_TRANSACTION_ERROR"
      );
    }
  }

  /**
   * Get inventory stock summary
   * @param {Object} queryParams - Query parameters
   * @returns {Promise<Object>} Stock summary
   */
  async getInventoryStock(queryParams) {
    try {
      const {
        page = 1,
        limit = 10,
        lens_id,
        location_id,
        tray_id,
        category_id
      } = queryParams;

      const skip = (page - 1) * limit;
      const take = limit;

      const where = {};
      if (lens_id) where.lens_id = lens_id;
      if (location_id) where.location_id = location_id;
      if (tray_id) where.tray_id = tray_id;
      if (category_id) where.category_id = category_id;

      const [stockItems, total] = await Promise.all([
        prisma.inventoryStock.findMany({
          where,
          skip,
          take,
          include: {
            lensProduct: {
              select: {
                id: true,
                lens_name: true,
                product_code: true,
                brand: { select: { name: true } }
              }
            },
            category: { select: { id: true, name: true } },
            lensType: { select: { id: true, name: true } },
            coating: { select: { id: true, name: true } },
            location: { select: { id: true, name: true } },
            tray: { select: { id: true, name: true } }
          }
        }),
        prisma.inventoryStock.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        stockItems,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      };
    } catch (error) {
      console.error("Error fetching inventory stock:", error);
      throw new APIError(
        error.message || "Failed to fetch inventory stock",
        500,
        "FETCH_INVENTORY_STOCK_ERROR"
      );
    }
  }

  /**
   * Reserve inventory for sale order
   * @param {number} inventoryItemId - Inventory item ID
   * @param {number} quantity - Quantity to reserve
   * @param {number} saleOrderId - Sale order ID
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Updated inventory item
   */
  async reserveInventoryForSale(inventoryItemId, quantity, saleOrderId, userId) {
    try {
      return await prisma.$transaction(async (prisma) => {
        const inventoryItem = await prisma.inventoryItem.findUnique({
          where: { id: inventoryItemId }
        });

        if (!inventoryItem) {
          throw new APIError("Inventory item not found", 404, "INVENTORY_ITEM_NOT_FOUND");
        }

        if (inventoryItem.quantity < quantity) {
          throw new APIError("Insufficient stock available", 400, "INSUFFICIENT_STOCK");
        }

        if (inventoryItem.status !== 'AVAILABLE') {
          throw new APIError("Inventory item is not available for reservation", 400, "ITEM_NOT_AVAILABLE");
        }

        // Update inventory item status
        const updatedItem = await prisma.inventoryItem.update({
          where: { id: inventoryItemId },
          data: {
            status: 'RESERVED',
            saleOrderId: saleOrderId,
            reservedDate: new Date(),
            updatedBy: userId,
            updatedAt: new Date()
          }
        });

        // Create transaction for reservation
        const transactionNo = await this.generateTransactionNumber();
        await prisma.inventoryTransaction.create({
          data: {
            transactionNo,
            type: 'OUTWARD_SALE',
            inventoryItemId: inventoryItemId,
            quantity: -quantity,
            balanceAfter: inventoryItem.quantity - quantity,
            saleOrderId: saleOrderId,
            reason: 'Reserved for sale order',
            createdBy: userId
          }
        });

        return updatedItem;
      });
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error("Error reserving inventory:", error);
      throw new APIError(
        error.message || "Failed to reserve inventory",
        500,
        "RESERVE_INVENTORY_ERROR"
      );
    }
  }

  /**
   * Helper: Generate transaction number
   */
  async generateTransactionNumber() {
    try {
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, "0");

      // Find the latest transaction number for current year-month
      const latestTransaction = await prisma.inventoryTransaction.findFirst({
        where: {
          transactionNo: {
            startsWith: `IT-${year}-${month}-`,
          },
        },
        orderBy: { transactionNo: "desc" },
        select: { transactionNo: true },
      });

      let sequence = 1;
      if (latestTransaction) {
        const parts = latestTransaction.transactionNo.split("-");
        sequence = parseInt(parts[3]) + 1;
      }

      return `IT-${year}-${month}-${String(sequence).padStart(3, "0")}`;
    } catch (error) {
      console.error("Error generating transaction number:", error);
      throw new APIError(
        "Failed to generate transaction number",
        500,
        "GENERATE_TRANSACTION_NUMBER_ERROR"
      );
    }
  }

  /**
   * Helper: Update inventory stock summary
   */
  async updateInventoryStock(inventoryItem, quantity, operation) {
    try {
      const stockKey = {
        lens_id: inventoryItem.lens_id,
        category_id: inventoryItem.category_id,
        Type_id: inventoryItem.Type_id,
        coating_id: inventoryItem.coating_id,
        location_id: inventoryItem.location_id,
        tray_id: inventoryItem.tray_id
      };

      const existingStock = await prisma.inventoryStock.findFirst({
        where: stockKey
      });

      if (existingStock) {
        // Update existing stock
        const updateData = {};
        if (operation === 'ADD') {
          updateData.totalStock = existingStock.totalStock + quantity;
          updateData.availableStock = existingStock.availableStock + quantity;
          updateData.lastInwardDate = new Date();
        } else if (operation === 'SUBTRACT') {
          updateData.totalStock = Math.max(0, existingStock.totalStock - Math.abs(quantity));
          updateData.availableStock = Math.max(0, existingStock.availableStock - Math.abs(quantity));
          updateData.lastOutwardDate = new Date();
        }

        await prisma.inventoryStock.update({
          where: { id: existingStock.id },
          data: updateData
        });
      } else {
        // Create new stock entry
        await prisma.inventoryStock.create({
          data: {
            ...stockKey,
            totalStock: quantity,
            availableStock: quantity,
            avgCostPrice: inventoryItem.costPrice,
            lastCostPrice: inventoryItem.costPrice,
            sellingPrice: inventoryItem.sellingPrice,
            lastInwardDate: new Date()
          }
        });
      }
    } catch (error) {
      console.error("Error updating inventory stock:", error);
      // Don't throw error here as it's a helper function
    }
  }

  /**
   * Get dropdown data for inventory forms
   */
  async getInventoryDropdowns() {
    try {
      const [lensProducts, categories, lensTypes, coatings, locations, trays, vendors] = await Promise.all([
        prisma.lensProductMaster.findMany({
          where: { deleteStatus: false, activeStatus: true },
          select: { id: true, lens_name: true, product_code: true },
          orderBy: { lens_name: 'asc' }
        }),
        prisma.lensCategoryMaster.findMany({
          where: { deleteStatus: false, activeStatus: true },
          select: { id: true, name: true },
          orderBy: { name: 'asc' }
        }),
        prisma.lensTypeMaster.findMany({
          where: { deleteStatus: false, activeStatus: true },
          select: { id: true, name: true },
          orderBy: { name: 'asc' }
        }),
        prisma.lensCoatingMaster.findMany({
          where: { deleteStatus: false, activeStatus: true },
          select: { id: true, name: true },
          orderBy: { name: 'asc' }
        }),
        prisma.locationMaster.findMany({
          where: { deleteStatus: false, activeStatus: true },
          select: { id: true, name: true, location_code: true },
          orderBy: { name: 'asc' }
        }),
        prisma.trayMaster.findMany({
          where: { deleteStatus: false, activeStatus: true },
          select: { id: true, name: true, tray_code: true },
          orderBy: { name: 'asc' }
        }),
        prisma.vendor.findMany({
          where: { delete_status: false, active_status: true },
          select: { id: true, name: true, code: true },
          orderBy: { name: 'asc' }
        })
      ]);

      return {
        lensProducts,
        categories,
        lensTypes,
        coatings,
        locations,
        trays,
        vendors
      };
    } catch (error) {
      console.error("Error fetching inventory dropdowns:", error);
      throw new APIError(
        "Failed to fetch dropdown data",
        500,
        "FETCH_INVENTORY_DROPDOWNS_ERROR"
      );
    }
  }
}

export default InventoryService;