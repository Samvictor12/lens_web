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
            location: { select: { id: true, name: true } },
            tray: { select: { id: true, name: true } },
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
   * Get purchase order receipts that still have pending inward quantity.
   * This powers the inventory-side inward queue.
   */
  async getInventoryInwardQueue(queryParams) {
    try {
      const {
        page = 1,
        limit = 10,
        search = '',
      } = queryParams;

      const receipts = await prisma.purchaseOrderReceipt.findMany({
        where: {
          deleteStatus: false,
          purchaseOrder: {
            deleteStatus: false,
          },
        },
        include: {
          purchaseOrder: {
            select: {
              id: true,
              poNumber: true,
              orderType: true,
              vendor: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
              lensProduct: {
                select: {
                  id: true,
                  lens_name: true,
                  product_code: true,
                },
              },
              lensType: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          createdByUser: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const normalizedSearch = search.trim().toLowerCase();
      const queueItems = receipts
        .map((receipt) => {
          const totalReceivedQty = parseFloat(receipt.totalReceivedQty || 0);
          const inwardedQty = parseFloat(receipt.inwardedQty || 0);
          const pendingQty = Math.max(0, totalReceivedQty - inwardedQty);

          return {
            id: receipt.id,
            receiptId: receipt.id,
            receiptNumber: receipt.receiptNumber,
            purchaseOrderId: receipt.purchaseOrderId,
            poNumber: receipt.purchaseOrder?.poNumber || '-',
            orderType: receipt.purchaseOrder?.orderType || 'Single',
            vendor: receipt.purchaseOrder?.vendor || null,
            lensProduct: receipt.purchaseOrder?.lensProduct || null,
            lensType: receipt.purchaseOrder?.lensType || null,
            receivedDate: receipt.receivedDate,
            actualDeliveryDate: receipt.actualDeliveryDate,
            createdAt: receipt.createdAt,
            supplierInvoiceNo: receipt.supplierInvoiceNo,
            totalReceivedQty,
            inwardedQty,
            pendingQty,
            status: receipt.status,
            createdByUser: receipt.createdByUser || null,
          };
        })
        .filter((item) => item.pendingQty > 0)
        .filter((item) => {
          if (!normalizedSearch) return true;

          return [
            item.receiptNumber,
            item.poNumber,
            item.vendor?.name,
            item.vendor?.code,
            item.lensProduct?.lens_name,
            item.lensProduct?.product_code,
            item.supplierInvoiceNo,
          ]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(normalizedSearch));
        });

      const total = queueItems.length;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const skip = (page - 1) * limit;
      const paginatedItems = queueItems.slice(skip, skip + limit);

      return {
        queueItems: paginatedItems,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      console.error('Error fetching inventory inward queue:', error);
      throw new APIError(
        error.message || 'Failed to fetch inventory inward queue',
        500,
        'FETCH_INVENTORY_INWARD_QUEUE_ERROR'
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

        if (transactionData.type === 'TRANSFER') {
          const transaction = await prisma.inventoryTransaction.create({
            data: {
              ...transactionData,
              transactionNo,
              quantity: Math.abs(transactionData.quantity),
              balanceAfter: inventoryItem.quantity, // unchanged
              totalValue: null,
            },
          });

          await prisma.inventoryItem.update({
            where: { id: transactionData.inventoryItemId },
            data: {
              location_id: transactionData.toLocationId,
              tray_id: transactionData.toTrayId,
              updatedAt: new Date(),
              updatedBy: transactionData.createdBy,
            },
          });

          // Move totals from source bucket to destination bucket
          await this.updateInventoryStock(inventoryItem, Math.abs(transactionData.quantity), 'SUBTRACT');
          await this.updateInventoryStock(
            { ...inventoryItem, location_id: transactionData.toLocationId, tray_id: transactionData.toTrayId },
            Math.abs(transactionData.quantity),
            'ADD'
          );

          return transaction;
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
        await this.updateInventoryStock(
          inventoryItem,
          transactionData.quantity,
          transactionData.type === 'DAMAGE' ? 'DAMAGE' : (transactionData.quantity > 0 ? 'ADD' : 'SUBTRACT')
        );

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
        stockItems: stockItems.map((s) => ({
          ...s,
          totalValue: (s.totalStock || 0) * (s.avgCostPrice || 0),
        })),
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
            quantity: inventoryItem.quantity - quantity,
            saleOrderId: saleOrderId,
            reservedDate: new Date(),
            updatedBy: userId,
            updatedAt: new Date()
          }
        });

        // Update stock summary (move from available to reserved)
        await this.updateInventoryStock(inventoryItem, quantity, 'RESERVE');

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

      if (!existingStock && (operation === 'RESERVE' || operation === 'UNRESERVE')) {
        // A stock bucket should already exist from the original inward —
        // do not fabricate one with reservedStock but zero totalStock.
        console.error(
          `updateInventoryStock: no existing InventoryStock bucket found for ${operation} operation`,
          stockKey
        );
        return;
      }

      // Compute updateData (used only when existingStock is present; the
      // create branch below handles the first-time bucket creation case)
      const updateData = {};
      if (existingStock) {
        if (operation === 'ADD') {
          const newQty = Math.abs(quantity);
          const priorTotal = existingStock.totalStock;
          const newAvgCost = inventoryItem.costPrice != null && priorTotal + newQty > 0
            ? ((existingStock.avgCostPrice || 0) * priorTotal + inventoryItem.costPrice * newQty) / (priorTotal + newQty)
            : existingStock.avgCostPrice;
          updateData.totalStock = priorTotal + newQty;
          updateData.availableStock = existingStock.availableStock + newQty;
          updateData.avgCostPrice = newAvgCost;
          if (inventoryItem.costPrice != null) updateData.lastCostPrice = inventoryItem.costPrice;
          if (inventoryItem.sellingPrice != null) updateData.sellingPrice = inventoryItem.sellingPrice;
          updateData.lastInwardDate = new Date();
        } else if (operation === 'SUBTRACT') {
          updateData.totalStock = Math.max(0, existingStock.totalStock - Math.abs(quantity));
          updateData.availableStock = Math.max(0, existingStock.availableStock - Math.abs(quantity));
          updateData.lastOutwardDate = new Date();
        } else if (operation === 'RESERVE') {
          updateData.availableStock = Math.max(0, existingStock.availableStock - Math.abs(quantity));
          updateData.reservedStock = existingStock.reservedStock + Math.abs(quantity);
        } else if (operation === 'UNRESERVE') {
          updateData.availableStock = existingStock.availableStock + Math.abs(quantity);
          updateData.reservedStock = Math.max(0, existingStock.reservedStock - Math.abs(quantity));
        } else if (operation === 'DAMAGE') {
          updateData.totalStock = Math.max(0, existingStock.totalStock - Math.abs(quantity));
          updateData.availableStock = Math.max(0, existingStock.availableStock - Math.abs(quantity));
          updateData.damagedStock = existingStock.damagedStock + Math.abs(quantity);
        }
      }

      if (existingStock) {
        await prisma.inventoryStock.update({
          where: { id: existingStock.id },
          data: updateData,
        });
      } else {
        await prisma.inventoryStock.create({
          data: {
            ...stockKey,
            totalStock: operation === 'ADD' ? Math.abs(quantity) : 0,
            availableStock: operation === 'ADD' ? Math.abs(quantity) : 0,
            avgCostPrice: inventoryItem.costPrice,
            lastCostPrice: inventoryItem.costPrice,
            sellingPrice: inventoryItem.sellingPrice,
            lastInwardDate: new Date(),
          },
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
      const [lensProducts, categories, lensTypes, coatings, locations, trays, vendors, inventoryItems, purchaseOrders, saleOrders] = await Promise.all([
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
          select: { id: true, name: true },
          orderBy: { name: 'asc' }
        }),
        prisma.trayMaster.findMany({
          where: { deleteStatus: false, activeStatus: true },
          select: { id: true, name: true, location_id: true },
          orderBy: { name: 'asc' }
        }),
        prisma.vendor.findMany({
          where: { delete_status: false, active_status: true },
          select: { id: true, name: true, code: true },
          orderBy: { name: 'asc' }
        }),
        prisma.inventoryItem.findMany({
          where: { deleteStatus: false },
          select: {
            id: true,
            quantity: true,
            costPrice: true,
            location_id: true,
            lensProduct: {
              select: {
                id: true,
                lens_name: true,
              },
            },
            location: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.purchaseOrder.findMany({
          where: { deleteStatus: false },
          select: {
            id: true,
            poNumber: true,
            vendor: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.saleOrder.findMany({
          where: { deleteStatus: false },
          select: {
            id: true,
            orderNo: true,
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        })
      ]);

      return {
        lensProducts,
        categories,
        lensTypes,
        coatings,
        locations,
        trays,
        vendors,
        inventoryItems: inventoryItems.map((item) => ({
          ...item,
          lensProduct: item.lensProduct
            ? {
                ...item.lensProduct,
                name: item.lensProduct.lens_name,
              }
            : null,
        })),
        purchaseOrders: purchaseOrders.map((po) => ({
          ...po,
          orderNumber: po.poNumber,
        })),
        saleOrders: saleOrders.map((saleOrder) => ({
          ...saleOrder,
          orderNumber: saleOrder.orderNo,
          customer: saleOrder.customer
            ? {
                ...saleOrder.customer,
                name: saleOrder.customer.name,
              }
            : null,
        })),
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

  /**
   * Get tray occupancy information
   * @param {number} trayId - Tray ID
   * @returns {Promise<Object>} Tray occupancy data
   */
  async getTrayOccupancy(trayId) {
    try {
      const tray = await prisma.trayMaster.findUnique({
        where: { id: trayId, deleteStatus: false },
        select: { id: true, name: true, capacity: true },
      });

      if (!tray) {
        throw new APIError("Tray not found", 404, "TRAY_NOT_FOUND");
      }

      // Get current quantity in tray
      const currentQty = await prisma.inventoryItem.aggregate({
        where: { tray_id: trayId, deleteStatus: false },
        _sum: { quantity: true },
      });

      const usedQty = currentQty._sum.quantity || 0;
      const availableQty = (tray.capacity || 0) - usedQty;
      const percentUsed = tray.capacity ? (usedQty / tray.capacity) * 100 : 0;

      return {
        trayId: tray.id,
        trayName: tray.name,
        capacity: tray.capacity || 0,
        currentQty: usedQty,
        availableQty: Math.max(0, availableQty),
        percentUsed: Math.min(100, percentUsed),
      };
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error("Error getting tray occupancy:", error);
      throw new APIError(
        "Failed to get tray occupancy",
        500,
        "GET_TRAY_OCCUPANCY_ERROR"
      );
    }
  }

  /**
   * Get inventory stock with grouping support
   * @param {Object} queryParams - Query parameters including groupBy
   * @returns {Promise<Object>} Grouped or flat stock data
   */
  async getInventoryStockWithGrouping(queryParams) {
    try {
      const {
        page = 1,
        limit = 10,
        lens_id,
        location_id,
        tray_id,
        category_id,
        groupBy = null, // 'location' or 'location_tray' or null
        search = "",
      } = queryParams;

      const skip = (page - 1) * limit;
      const take = limit;
      
      const isGrouped = groupBy && groupBy !== "none";
      const where = isGrouped ? { lensProduct: { deleteStatus: false } } : { deleteStatus: false };

      if (lens_id) where.lens_id = lens_id;
      if (location_id) where.location_id = location_id;
      if (tray_id) where.tray_id = tray_id;
      if (category_id) where.category_id = category_id;

      if (search) {
        where.OR = [
          {
            lensProduct: {
              lens_name: { contains: search, mode: "insensitive" }
            }
          },
          {
            lensProduct: {
              product_code: { contains: search, mode: "insensitive" }
            }
          },
          {
            category: {
              name: { contains: search, mode: "insensitive" }
            }
          },
          {
            location: {
              name: { contains: search, mode: "insensitive" }
            }
          }
        ];
      }

      if (groupBy === "location") {
        // Group by location
        const count = await prisma.inventoryStock.count({ where });
        const stocks = await prisma.inventoryStock.findMany({
          where,
          skip,
          take,
          include: {
            lensProduct: {
              select: { id: true, lens_name: true, product_code: true },
            },
            category: { select: { id: true, name: true } },
            location: { select: { id: true, name: true } },
            tray: { select: { id: true, name: true } },
          },
          orderBy: { location_id: "asc" },
        });

        return {
          data: stocks.map((s) => ({ ...s, totalValue: (s.totalStock || 0) * (s.avgCostPrice || 0) })),
          grouping: "location",
          total: count,
        };
      } else if (groupBy === "location_tray") {
        // Group by location and tray
        const count = await prisma.inventoryStock.count({ where });
        const stocks = await prisma.inventoryStock.findMany({
          where,
          skip,
          take,
          include: {
            lensProduct: {
              select: { id: true, lens_name: true, product_code: true },
            },
            category: { select: { id: true, name: true } },
            location: { select: { id: true, name: true } },
            tray: { select: { id: true, name: true, capacity: true } },
          },
          orderBy: [{ location_id: "asc" }, { tray_id: "asc" }],
        });

        return {
          data: stocks.map((s) => ({ ...s, totalValue: (s.totalStock || 0) * (s.avgCostPrice || 0) })),
          grouping: "location_tray",
          total: count,
        };
      } else if (groupBy === "category") {
        // Group by category
        const count = await prisma.inventoryStock.count({ where });
        const stocks = await prisma.inventoryStock.findMany({
          where,
          skip,
          take,
          include: {
            lensProduct: {
              select: { id: true, lens_name: true, product_code: true },
            },
            category: { select: { id: true, name: true } },
            location: { select: { id: true, name: true } },
            tray: { select: { id: true, name: true } },
          },
          orderBy: { category_id: "asc" },
        });

        return {
          data: stocks.map((s) => ({ ...s, totalValue: (s.totalStock || 0) * (s.avgCostPrice || 0) })),
          grouping: "category",
          total: count,
        };
      } else if (groupBy === "lens") {
        // Group by lens product
        const count = await prisma.inventoryStock.count({ where });
        const stocks = await prisma.inventoryStock.findMany({
          where,
          skip,
          take,
          include: {
            lensProduct: {
              select: { id: true, lens_name: true, product_code: true },
            },
            category: { select: { id: true, name: true } },
            location: { select: { id: true, name: true } },
            tray: { select: { id: true, name: true } },
          },
          orderBy: { lens_id: "asc" },
        });

        return {
          data: stocks.map((s) => ({ ...s, totalValue: (s.totalStock || 0) * (s.avgCostPrice || 0) })),
          grouping: "lens",
          total: count,
        };
      } else {
        // No grouping - return items
        const count = await prisma.inventoryItem.count({ where });
        const items = await prisma.inventoryItem.findMany({
          where,
          skip,
          take,
          include: {
            lensProduct: {
              select: { id: true, lens_name: true, product_code: true },
            },
            category: { select: { id: true, name: true } },
            location: { select: { id: true, name: true } },
            tray: { select: { id: true, name: true } },
          },
        });

        return {
          data: items,
          grouping: "none",
          total: count,
        };
      }
    } catch (error) {
      console.error("Error getting inventory stock with grouping:", error);
      throw new APIError(
        "Failed to get inventory stock",
        500,
        "GET_INVENTORY_STOCK_ERROR",
        { originalError: error.message, stack: error.stack }
      );
    }
  }

  /**
   * Get items below low stock threshold
   * @returns {Promise<Array>} Items below minimum threshold
   */
  async getItemsBelowThreshold() {
    try {
      const lowStockItems = await prisma.inventoryStock.findMany({
        where: {
          lensProduct: {
            minThresholdQty: { not: null },
          },
        },
        include: {
          lensProduct: {
            select: {
              id: true,
              lens_name: true,
              product_code: true,
              minThresholdQty: true,
            },
          },
          category: { select: { id: true, name: true } },
          location: { select: { id: true, name: true } },
        },
        orderBy: { totalStock: "asc" },
        take: 15, // Top 15 low stock items
      });

      // Filter items where current stock < min threshold
      return lowStockItems
        .filter(
          (item) =>
            item.totalStock <
            (item.lensProduct?.minThresholdQty || Number.MAX_VALUE)
        )
        .map((item) => ({
          ...item,
          gap: (item.lensProduct?.minThresholdQty || 0) - item.totalStock,
        }));
    } catch (error) {
      console.error("Error getting low stock items:", error);
      throw new APIError(
        "Failed to get low stock items",
        500,
        "GET_LOW_STOCK_ERROR"
      );
    }
  }

  /**
   * Get enhanced inventory dashboard with pending inwards and low stock
   * @returns {Promise<Object>} Dashboard statistics
   */
  async getInventoryDashboardEnhanced() {
    try {
      const [
        totalItems,
        availableItems,
        reservedItems,
        damagedItems,
        allStock,
        lowStockItems,
        pendingReceipts,
      ] = await Promise.all([
        // Total items
        prisma.inventoryItem.count({
          where: { deleteStatus: false, activeStatus: true },
        }),
        // Available items
        prisma.inventoryItem.count({
          where: {
            deleteStatus: false,
            activeStatus: true,
            status: "AVAILABLE",
          },
        }),
        // Reserved items
        prisma.inventoryItem.count({
          where: {
            deleteStatus: false,
            activeStatus: true,
            status: "RESERVED",
          },
        }),
        // Damaged items
        prisma.inventoryItem.count({
          where: {
            deleteStatus: false,
            activeStatus: true,
            status: "DAMAGED",
          },
        }),
        // Total inventory value (computed in JS - InventoryStock has no totalValue/deleteStatus columns)
        prisma.inventoryStock.findMany({
          select: { totalStock: true, avgCostPrice: true },
        }),
        // Low stock items (using the service method)
        this.getItemsBelowThreshold(),
        // Pending inwards (receipts not fully inwarded)
        prisma.purchaseOrderReceipt.findMany({
          where: { deleteStatus: false },
          include: {
            purchaseOrder: { select: { id: true, poNumber: true, vendor: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      const totalValue = allStock.reduce(
        (sum, s) => sum + (s.totalStock || 0) * (s.avgCostPrice || 0),
        0
      );

      const pendingFiltered = pendingReceipts.filter(
        (r) => (r.totalReceivedQty || 0) > (r.inwardedQty || 0)
      );
      const pendingCount = pendingFiltered.length;
      const pendingInwardsList = pendingFiltered.slice(0, 5);

      return {
        totalItems,
        availableItems,
        reservedItems,
        damagedItems,
        lowStockItems: lowStockItems || [],
        totalValue,
        pendingInwardsCount: pendingCount,
        pendingInwardsList: pendingInwardsList || [],
      };
    } catch (error) {
      console.error("Error getting inventory dashboard:", error);
      throw new APIError(
        "Failed to get dashboard data",
        500,
        "GET_DASHBOARD_ERROR"
      );
    }
  }

  /**
   * Get stock value report by date range
   * @param {Object} queryParams - Date range and grouping params
   * @returns {Promise<Object>} Stock value report data
   */
  async getStockValueReport(queryParams) {
    try {
      const {
        startDate,
        endDate,
        groupBy = "lens_id", // lens_id, category_id, location_id
      } = queryParams;

      const dateFilter = {};
      if (startDate) {
        dateFilter.gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.lte = new Date(endDate);
      }

      // Get inward and outward transactions
      const transactions = await prisma.inventoryTransaction.findMany({
        where: {
          transactionDate: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
          type: { in: ["INWARD_PO", "INWARD_DIRECT", "OUTWARD_SALE", "OUTWARD_RETURN"] },
          deleteStatus: false,
        },
        include: {
          inventoryItem: {
            select: {
              id: true,
              lens_id: true,
              category_id: true,
              location_id: true,
              lensProduct: {
                select: { id: true, lens_name: true, product_code: true },
              },
              category: { select: { id: true, name: true } },
              location: { select: { id: true, name: true } },
            },
          },
        },
      });

      // Group and aggregate
      const grouped = {};
      let totalInwardValue = 0;
      let totalOutwardValue = 0;

      transactions.forEach((txn) => {
        const groupKey =
          groupBy === "lens_id"
            ? txn.inventoryItem.lens_id
            : groupBy === "category_id"
              ? txn.inventoryItem.category_id
              : txn.inventoryItem.location_id;

        const label =
          groupBy === "lens_id"
            ? txn.inventoryItem.lensProduct?.lens_name || "N/A"
            : groupBy === "category_id"
              ? txn.inventoryItem.category?.name || "N/A"
              : txn.inventoryItem.location?.name || "N/A";

        if (!grouped[groupKey]) {
          grouped[groupKey] = {
            groupKey,
            label,
            inwardValue: 0,
            outwardValue: 0,
            quantity: 0,
          };
        }

        if (["INWARD_PO", "INWARD_DIRECT"].includes(txn.type)) {
          grouped[groupKey].inwardValue += txn.totalValue || 0;
          grouped[groupKey].quantity += txn.quantity || 0;
          totalInwardValue += txn.totalValue || 0;
        } else {
          grouped[groupKey].outwardValue += Math.abs(txn.totalValue || 0);
          totalOutwardValue += Math.abs(txn.totalValue || 0);
        }
      });

      const data = Object.values(grouped);

      return {
        summary: {
          totalInwardValue,
          totalOutwardValue,
          netValue: totalInwardValue - totalOutwardValue,
          startDate,
          endDate,
          groupBy,
        },
        data,
      };
    } catch (error) {
      console.error("Error getting stock value report:", error);
      throw new APIError(
        "Failed to get stock value report",
        500,
        "GET_STOCK_VALUE_REPORT_ERROR"
      );
    }
  }
}

export default InventoryService;
