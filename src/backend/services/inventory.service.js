import prisma from "../config/prisma.js";
import { APIError } from "../middleware/errorHandler.js";

// Excludes InventoryItems sourced from an RX-linked PurchaseOrder (saleOrderId set),
// while keeping manually-initialized items (purchaseOrderId null) and stock-type PO items.
// NOT{ purchaseOrder: { saleOrderId: { not: null } } } — not the simpler
// { purchaseOrder: { saleOrderId: null } } form, which would also drop rows with no PO at all.
const RX_SOURCE_EXCLUSION_FILTER = {
  NOT: { purchaseOrder: { saleOrderId: { not: null } } },
};

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
            saleOrderId: null, // Exclude RX POs that were raised from a Sale Order
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
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          where.transactionDate.lte = end;
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
   * @param {object} [dbClient=prisma] - Prisma client or transaction handle to use.
   *   When omitted, a new internal `prisma.$transaction` is opened so the call is
   *   atomic on its own. When a caller passes its own transaction's `tx`, this
   *   function's writes participate in that outer transaction instead.
   * @returns {Promise<Object>} Updated inventory item
   */
  async reserveInventoryForSale(inventoryItemId, quantity, saleOrderId, userId, dbClient = prisma) {
    try {
      const runner = async (client) => {
        const inventoryItem = await client.inventoryItem.findUnique({
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

        // Quantity-aware status flip: a row's full quantity should only be
        // marked RESERVED (with saleOrderId/reservedDate set) once it is fully
        // consumed. Partial consumption keeps the row AVAILABLE with the
        // remaining quantity decremented, so it stays visible to FIFO matching.
        const remainingQty = inventoryItem.quantity - quantity;
        const fullyConsumed = remainingQty <= 0.001;

        const updateData = {
          status: fullyConsumed ? 'RESERVED' : 'AVAILABLE',
          quantity: Math.max(0, remainingQty),
          updatedBy: userId,
          updatedAt: new Date()
        };
        if (fullyConsumed) {
          updateData.saleOrderId = saleOrderId;
          updateData.reservedDate = new Date();
        }

        // Update inventory item status
        const updatedItem = await client.inventoryItem.update({
          where: { id: inventoryItemId },
          data: updateData
        });

        // Update stock summary (move from available to reserved)
        await this.updateInventoryStock(inventoryItem, quantity, 'RESERVE', client);

        // Create transaction for reservation
        const transactionNo = await this.generateTransactionNumber(client);
        await client.inventoryTransaction.create({
          data: {
            transactionNo,
            type: 'OUTWARD_SALE',
            inventoryItemId: inventoryItemId,
            quantity: -quantity,
            balanceAfter: Math.max(0, remainingQty),
            saleOrderId: saleOrderId,
            reason: 'Reserved for sale order',
            createdBy: userId
          }
        });

        return updatedItem;
      };

      // If no explicit dbClient was passed, open our own transaction so this
      // call remains atomic in isolation (preserves prior default behavior).
      if (dbClient === prisma) {
        return await prisma.$transaction((tx) => runner(tx));
      }
      return await runner(dbClient);
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
   * @param {object} [dbClient=prisma] - Prisma client or transaction handle to use.
   */
  async generateTransactionNumber(dbClient = prisma) {
    try {
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, "0");

      // Find the latest transaction number for current year-month
      const latestTransaction = await dbClient.inventoryTransaction.findFirst({
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
   * @param {object} [dbClient=prisma] - Prisma client or transaction handle to use.
   */
  async updateInventoryStock(inventoryItem, quantity, operation, dbClient = prisma) {
    try {
      const stockKey = {
        lens_id: inventoryItem.lens_id,
        category_id: inventoryItem.category_id,
        Type_id: inventoryItem.Type_id,
        coating_id: inventoryItem.coating_id,
        location_id: inventoryItem.location_id,
        tray_id: inventoryItem.tray_id
      };

      const existingStock = await dbClient.inventoryStock.findFirst({
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
        await dbClient.inventoryStock.update({
          where: { id: existingStock.id },
          data: updateData,
        });
      } else {
        await dbClient.inventoryStock.create({
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
        lensProducts: lensProducts.map((p) => ({ ...p, name: p.lens_name })),
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

      // Get current quantity in tray (excluding RX-sourced stock, so Initialize Stock
      // capacity checks are based on general/non-RX occupancy only)
      const currentQty = await prisma.inventoryItem.aggregate({
        where: { tray_id: trayId, deleteStatus: false, ...RX_SOURCE_EXCLUSION_FILTER },
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

      if (!isGrouped) {
        // No grouping - return raw items directly, excluding RX-sourced stock
        const where = { deleteStatus: false, ...RX_SOURCE_EXCLUSION_FILTER };

        if (lens_id) where.lens_id = lens_id;
        if (location_id) where.location_id = location_id;
        if (tray_id) where.tray_id = tray_id;
        if (category_id) where.category_id = category_id;

        if (search) {
          where.OR = [
            { lensProduct: { lens_name: { contains: search, mode: "insensitive" } } },
            { lensProduct: { product_code: { contains: search, mode: "insensitive" } } },
            { category: { name: { contains: search, mode: "insensitive" } } },
            { location: { name: { contains: search, mode: "insensitive" } } },
          ];
        }

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

      // Grouped views ("location" | "location_tray" | "category" | "lens"): aggregate
      // live off InventoryItem (excluding RX-sourced stock) instead of the InventoryStock
      // bucket table. InventoryStock has no relation to PurchaseOrder/saleOrderId and
      // permanently mixes RX + non-RX quantities once accumulated, so it cannot be used
      // to answer "non-RX stock only" queries without touching its shared update lifecycle
      // (relied on elsewhere for FIFO picking / low-stock alerts). Grouping matches
      // InventoryStock's own natural key (@@unique on lens/category/Type/coating/location/tray)
      // so each resulting row corresponds 1:1 with what used to be one InventoryStock bucket row.
      const itemWhere = {
        deleteStatus: false,
        lensProduct: { deleteStatus: false },
        ...RX_SOURCE_EXCLUSION_FILTER,
      };

      if (lens_id) itemWhere.lens_id = lens_id;
      if (location_id) itemWhere.location_id = location_id;
      if (tray_id) itemWhere.tray_id = tray_id;
      if (category_id) itemWhere.category_id = category_id;

      if (search) {
        itemWhere.OR = [
          { lensProduct: { lens_name: { contains: search, mode: "insensitive" } } },
          { lensProduct: { product_code: { contains: search, mode: "insensitive" } } },
          { category: { name: { contains: search, mode: "insensitive" } } },
          { location: { name: { contains: search, mode: "insensitive" } } },
        ];
      }

      const groups = await prisma.inventoryItem.groupBy({
        by: ["lens_id", "category_id", "Type_id", "coating_id", "location_id", "tray_id"],
        where: itemWhere,
        _sum: { quantity: true },
        _avg: { costPrice: true },
        _max: { inwardDate: true },
      });

      // Split reserved/damaged quantities out per bucket (same 6-key grouping) so the
      // group rows can expose availableStock/reservedStock/damagedStock like the old
      // InventoryStock bucket rows did. availableStock is derived as (total - reserved),
      // matching InventoryStock's own documented semantics (schema.prisma comment:
      // "availableStock: Available for sale (total - reserved)"), not a raw
      // status === 'AVAILABLE' sum.
      const statusGroups = await prisma.inventoryItem.groupBy({
        by: ["lens_id", "category_id", "Type_id", "coating_id", "location_id", "tray_id", "status"],
        where: itemWhere,
        _sum: { quantity: true },
      });

      const bucketKey = (g) => [g.lens_id, g.category_id, g.Type_id, g.coating_id, g.location_id, g.tray_id].join("|");

      const statusSumsByBucket = {};
      for (const sg of statusGroups) {
        const key = bucketKey(sg);
        if (!statusSumsByBucket[key]) statusSumsByBucket[key] = { reservedStock: 0, damagedStock: 0 };
        const qty = sg._sum.quantity || 0;
        if (sg.status === "RESERVED") statusSumsByBucket[key].reservedStock += qty;
        if (sg.status === "DAMAGED") statusSumsByBucket[key].damagedStock += qty;
      }

      const sortKeyFor = {
        location: (g) => [g.location_id ?? -1],
        location_tray: (g) => [g.location_id ?? -1, g.tray_id ?? -1],
        category: (g) => [g.category_id ?? -1],
        lens: (g) => [g.lens_id ?? -1],
      };
      const sortKey = sortKeyFor[groupBy] || sortKeyFor.location;

      const sorted = [...groups].sort((a, b) => {
        const ka = sortKey(a);
        const kb = sortKey(b);
        for (let i = 0; i < ka.length; i++) {
          if (ka[i] !== kb[i]) return ka[i] - kb[i];
        }
        return 0;
      });

      const total = sorted.length;
      const pageSlice = sorted.slice(skip, skip + take);

      const lensIds = [...new Set(pageSlice.map((g) => g.lens_id).filter(Boolean))];
      const categoryIds = [...new Set(pageSlice.map((g) => g.category_id).filter(Boolean))];
      const locationIds = [...new Set(pageSlice.map((g) => g.location_id).filter(Boolean))];
      const trayIds = [...new Set(pageSlice.map((g) => g.tray_id).filter(Boolean))];

      const [lensProducts, categories, locations, trays] = await Promise.all([
        lensIds.length
          ? prisma.lensProductMaster.findMany({ where: { id: { in: lensIds } }, select: { id: true, lens_name: true, product_code: true } })
          : [],
        categoryIds.length
          ? prisma.lensCategoryMaster.findMany({ where: { id: { in: categoryIds } }, select: { id: true, name: true } })
          : [],
        locationIds.length
          ? prisma.locationMaster.findMany({ where: { id: { in: locationIds } }, select: { id: true, name: true } })
          : [],
        trayIds.length
          ? prisma.trayMaster.findMany({ where: { id: { in: trayIds } }, select: { id: true, name: true, capacity: true } })
          : [],
      ]);

      const lensMap = Object.fromEntries(lensProducts.map((p) => [p.id, p]));
      const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]));
      const locationMap = Object.fromEntries(locations.map((l) => [l.id, l]));
      const trayMap = Object.fromEntries(trays.map((t) => [t.id, t]));

      // lastCostPrice needs the cost price of the specific row with the most recent
      // inwardDate per bucket — not derivable from a plain _max/_avg aggregate — so
      // resolve it with one targeted lookup per page row (bounded by page size).
      const lastCostPrices = await Promise.all(
        pageSlice.map((g) =>
          prisma.inventoryItem.findFirst({
            where: {
              ...itemWhere,
              lens_id: g.lens_id,
              category_id: g.category_id,
              Type_id: g.Type_id,
              coating_id: g.coating_id,
              location_id: g.location_id,
              tray_id: g.tray_id,
            },
            orderBy: { inwardDate: "desc" },
            select: { costPrice: true },
          })
        )
      );

      const data = pageSlice.map((g, idx) => {
        const totalStock = g._sum.quantity || 0;
        const avgCostPrice = g._avg.costPrice || 0;
        const key = bucketKey(g);
        const reservedStock = statusSumsByBucket[key]?.reservedStock || 0;
        const damagedStock = statusSumsByBucket[key]?.damagedStock || 0;
        const availableStock = Math.max(0, totalStock - reservedStock);
        return {
          lens_id: g.lens_id,
          category_id: g.category_id,
          Type_id: g.Type_id,
          coating_id: g.coating_id,
          location_id: g.location_id,
          tray_id: g.tray_id,
          totalStock,
          availableStock,
          reservedStock,
          damagedStock,
          avgCostPrice,
          lastCostPrice: lastCostPrices[idx]?.costPrice ?? avgCostPrice,
          totalValue: totalStock * avgCostPrice,
          lastInwardDate: g._max.inwardDate,
          lensProduct: g.lens_id ? lensMap[g.lens_id] || null : null,
          category: g.category_id ? categoryMap[g.category_id] || null : null,
          location: g.location_id ? locationMap[g.location_id] || null : null,
          tray: g.tray_id ? trayMap[g.tray_id] || null : null,
        };
      });

      return {
        data,
        grouping: groupBy,
        total,
      };
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
        productCountResult,
        damagedItems,
        allStock,
        lowStockItems,
        pendingReceipts,
      ] = await Promise.all([
        // Product count: distinct lens products (not raw item count)
        prisma.inventoryItem.groupBy({
          by: ['lens_id'],
          where: { deleteStatus: false, activeStatus: true },
        }),
        // Damaged items
        prisma.inventoryItem.count({
          where: {
            deleteStatus: false,
            activeStatus: true,
            status: "DAMAGED",
          },
        }),
        // Total inventory value + Available/Reserved stock quantity — sourced from
        // InventoryStock (bucket-level running totals correctly maintained by
        // updateInventoryStock()'s ADD/SUBTRACT/RESERVE/UNRESERVE branches), NOT
        // InventoryItem.quantity: a fully-RESERVED InventoryItem row has its own
        // quantity zeroed by reserveInventoryForSale() in the same write that sets
        // its status, so summing InventoryItem.quantity for RESERVED rows always
        // returns ~0 regardless of how much stock is actually reserved.
        prisma.inventoryStock.findMany({
          select: { totalStock: true, avgCostPrice: true, availableStock: true, reservedStock: true },
        }),
        // Low stock items
        this.getItemsBelowThreshold(),
        // Pending inwards
        prisma.purchaseOrderReceipt.findMany({
          where: { deleteStatus: false },
          include: {
            purchaseOrder: { select: { id: true, poNumber: true, vendor: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      const productCount = productCountResult.length;
      const availableItems = allStock.reduce((sum, s) => sum + (s.availableStock || 0), 0);
      const reservedItems = allStock.reduce((sum, s) => sum + (s.reservedStock || 0), 0);

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
        productCount,
        // Keep legacy name for backward compat so existing dashboard cards don't break
        totalItems: productCount,
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
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }

      // Get inward and outward transactions
      const transactions = await prisma.inventoryTransaction.findMany({
        where: {
          transactionDate: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
          type: { in: ["INWARD_PO", "INWARD_DIRECT", "OUTWARD_SALE", "OUTWARD_RETURN"] },
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

      // Group by date (YYYY-MM-DD) for trend — quantity-based, not value-based
      // (outward txn.quantity is stored negative, e.g. `quantity: -quantity` in
      // reserveInventoryForSale, so Math.abs() it the same way the old ₹ sum did)
      const trendMap = {};
      transactions.forEach((txn) => {
        const dateKey = txn.transactionDate
          ? txn.transactionDate.toISOString().slice(0, 10)
          : 'unknown';

        if (!trendMap[dateKey]) {
          trendMap[dateKey] = {
            date: dateKey,
            inward: 0,
            outward: 0,
          };
        }

        if (["INWARD_PO", "INWARD_DIRECT"].includes(txn.type)) {
          trendMap[dateKey].inward += txn.quantity || 0;
        } else {
          trendMap[dateKey].outward += Math.abs(txn.quantity || 0);
        }
      });

      const trend = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));

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
        trend,
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

  parseBulkSelectionKey(key) {
    const parts = key.split("_");
    const sphIdx = parts.indexOf("sph");
    const cylIdx = parts.indexOf("cyl");
    const addIdx = parts.indexOf("add");
    const lastPart = parts[parts.length - 1];
    const eye = lastPart === "L" || lastPart === "R" ? lastPart : null;
    return {
      spherical: sphIdx !== -1 ? parts[sphIdx + 1] : "0",
      cylindrical: cylIdx !== -1 ? parts[cylIdx + 1] : "0",
      add: addIdx !== -1 ? parts[addIdx + 1] : null,
      eye,
    };
  }

  getBulkSelectionQty(val) {
    if (typeof val === "object" && val !== null) {
      if (val.quantity != null) return parseInt(val.quantity, 10) || 0;
      return Object.values(val).reduce((s, v) => s + (parseInt(v, 10) || 0), 0);
    }
    return parseInt(val, 10) || 0;
  }

  /**
   * Bulk inward stock from power grid (Initialize Stock)
   * Supports multi-tray splits via `rows` payload.
   */
  async bulkInwardFromGrid(payload, userId) {
    const {
      location_id,
      lens_id,
      category_id,
      Type_id,
      coating_id,
      costPrice = 0,
      defaultDia = "70",
      rows,
      lensBulkSelection,
      tray_id,
    } = payload;

    const hasGlobalLocation = !!location_id;
    const hasPerSplitLocation = rows?.every(r => r.splits?.every(sp => sp.location_id));
    if (!hasGlobalLocation && !hasPerSplitLocation) {
      throw new APIError("Location is required", 400, "LOCATION_REQUIRED");
    }
    if (!lens_id) throw new APIError("Lens product is required", 400, "LENS_REQUIRED");

    const lens = await prisma.lensProductMaster.findUnique({
      where: { id: parseInt(lens_id, 10), deleteStatus: false },
    });
    if (!lens) throw new APIError("Lens product not found", 404, "LENS_NOT_FOUND");

    // Normalize legacy single-tray payload
    let inwardRows = rows;
    if (!inwardRows?.length && lensBulkSelection?.selections) {
      inwardRows = Object.entries(lensBulkSelection.selections)
        .map(([key, val]) => {
          const qty = this.getBulkSelectionQty(val);
          if (qty <= 0) return null;
          const parsed = this.parseBulkSelectionKey(key);
          return {
            key,
            ...parsed,
            splits: [{ tray_id: tray_id ? parseInt(tray_id, 10) : null, qty }],
          };
        })
        .filter(Boolean);
    }

    if (!inwardRows?.length) {
      throw new APIError("Enter at least one quantity in the grid", 400, "NO_SELECTIONS");
    }

    // Validate tray capacity across entire batch
    const trayAllocations = {};
    for (const row of inwardRows) {
      for (const split of row.splits || []) {
        const qty = parseFloat(split.qty) || 0;
        if (qty <= 0) continue;
        if (!split.tray_id) {
          throw new APIError("Tray is required for each split", 400, "TRAY_REQUIRED");
        }
        const tId = parseInt(split.tray_id, 10);
        trayAllocations[tId] = (trayAllocations[tId] || 0) + qty;
      }
    }

    for (const [trayIdStr, allocQty] of Object.entries(trayAllocations)) {
      const occ = await this.getTrayOccupancy(parseInt(trayIdStr, 10));
      if (!occ.capacity) {
        throw new APIError(
          `Tray "${occ.trayName}" has no capacity set. Update Tray Master.`,
          400,
          "TRAY_NO_CAPACITY"
        );
      }
      if (allocQty > occ.availableQty + 0.001) {
        throw new APIError(
          `Tray "${occ.trayName}" only has ${occ.availableQty} available, but ${allocQty} allocated in this batch`,
          400,
          "TRAY_CAPACITY_EXCEEDED"
        );
      }
    }

    const dia = defaultDia || "70";
    const itemsToCreate = [];

    for (const row of inwardRows) {
      for (const split of row.splits || []) {
        const qty = parseFloat(split.qty) || 0;
        if (qty <= 0) continue;

        const { spherical, cylindrical, add, eye } = row.key
          ? this.parseBulkSelectionKey(row.key)
          : {
              spherical: row.spherical ?? "0",
              cylindrical: row.cylindrical ?? "0",
              add: row.add ?? null,
              eye: row.eye ?? null,
            };

        const base = {
          lens_id: parseInt(lens_id, 10),
          category_id: category_id ? parseInt(category_id, 10) : lens.category_id,
          Type_id: Type_id ? parseInt(Type_id, 10) : lens.Type_id,
          coating_id: coating_id ? parseInt(coating_id, 10) : null,
          location_id: split.location_id ? parseInt(split.location_id, 10) : parseInt(location_id, 10),
          tray_id: parseInt(split.tray_id, 10),
          quantity: qty,
          costPrice: parseFloat(split.costPrice ?? costPrice) || 0,
          status: "AVAILABLE",
          createdBy: userId,
        };

        if (eye === "R" || eye === "L") {
          itemsToCreate.push({
            ...base,
            rightEye: eye === "R",
            leftEye: eye === "L",
            rightSpherical: eye === "R" ? spherical : null,
            rightCylindrical: eye === "R" ? cylindrical : null,
            rightAdd: eye === "R" ? add : null,
            leftSpherical: eye === "L" ? spherical : null,
            leftCylindrical: eye === "L" ? cylindrical : null,
            leftAdd: eye === "L" ? add : null,
          });
        } else {
          itemsToCreate.push({
            ...base,
            rightEye: true,
            leftEye: false,
            rightSpherical: spherical,
            rightCylindrical: cylindrical,
            rightAdd: add,
          });
        }
      }
    }

    if (itemsToCreate.length === 0) {
      throw new APIError("No valid quantities to inward", 400, "NO_VALID_QTY");
    }

    const createdIds = [];
    for (const itemData of itemsToCreate) {
      const result = await this.createInventoryItem(itemData);
      createdIds.push(result.inventoryItem.id);
    }

    return {
      createdCount: createdIds.length,
      totalQuantity: itemsToCreate.reduce((s, i) => s + i.quantity, 0),
      inventoryItemIds: createdIds,
    };
  }

  /**
   * Product spec count trend — daily count of distinct (lens_id, coating_id, Sph, Cyl, Add)
   * combinations inwarded within the date range.
   * @param {Object} params - { startDate, endDate, lensTypeId }
   */
  async getInventorySpecCountTrend({ startDate, endDate, lensTypeId } = {}) {
    try {
      const where = {
        type: { in: ['INWARD_PO', 'INWARD_DIRECT'] },
      };
      if (startDate || endDate) {
        where.transactionDate = {};
        if (startDate) where.transactionDate.gte = new Date(startDate);
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          where.transactionDate.lte = end;
        }
      }
      if (lensTypeId) {
        where.inventoryItem = { lensType: { id: parseInt(lensTypeId, 10) } };
      }

      const txns = await prisma.inventoryTransaction.findMany({
        where,
        select: {
          transactionDate: true,
          inventoryItem: {
            select: {
              lens_id: true,
              coating_id: true,
              rightSpherical: true,
              rightCylindrical: true,
              rightAdd: true,
              lensType: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { transactionDate: 'asc' },
      });

      // Group by date (YYYY-MM-DD) then count distinct spec signatures per day
      const byDate = {};
      for (const txn of txns) {
        const dateKey = txn.transactionDate
          ? txn.transactionDate.toISOString().slice(0, 10)
          : 'unknown';
        if (!byDate[dateKey]) byDate[dateKey] = new Set();
        const item = txn.inventoryItem;
        const sig = `${item.lens_id}|${item.coating_id ?? 'none'}|${item.rightSpherical ?? ''}|${item.rightCylindrical ?? ''}|${item.rightAdd ?? ''}`;
        byDate[dateKey].add(sig);
      }

      const trend = Object.entries(byDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, specs]) => ({ date, specCount: specs.size }));

      return { trend };
    } catch (error) {
      console.error('Error getting spec count trend:', error);
      throw new APIError('Failed to get spec count trend', 500, 'SPEC_TREND_ERROR');
    }
  }

  /**
   * Top 10 and Low 10 selling products by OUTWARD_SALE transaction volume.
   * @param {Object} params - { days: 30 | 90 }
   */
  async getTopLowSellingProducts({ days = 30 } = {}) {
    try {
      const since = new Date();
      since.setDate(since.getDate() - parseInt(days, 10));

      const txns = await prisma.inventoryTransaction.findMany({
        where: {
          type: 'OUTWARD_SALE',
          transactionDate: { gte: since },
        },
        select: {
          quantity: true,
          inventoryItem: {
            select: {
              lens_id: true,
              lensProduct: { select: { id: true, lens_name: true, product_code: true } },
            },
          },
        },
      });

      // Aggregate by lens_id
      const byProduct = {};
      for (const txn of txns) {
        const id = txn.inventoryItem?.lens_id;
        if (!id) continue;
        if (!byProduct[id]) {
          byProduct[id] = {
            lens_id: id,
            lens_name: txn.inventoryItem.lensProduct?.lens_name ?? `Lens #${id}`,
            product_code: txn.inventoryItem.lensProduct?.product_code ?? '',
            unitsSold: 0,
          };
        }
        byProduct[id].unitsSold += Math.abs(txn.quantity || 0);
      }

      const sorted = Object.values(byProduct).sort((a, b) => b.unitsSold - a.unitsSold);
      const top10 = sorted.slice(0, 10);
      const low10 = [...sorted].sort((a, b) => a.unitsSold - b.unitsSold).slice(0, 10);

      return { top10, low10, days };
    } catch (error) {
      console.error('Error getting top/low selling products:', error);
      throw new APIError('Failed to get top/low selling products', 500, 'TOP_LOW_SELLING_ERROR');
    }
  }

  /**
   * Get inventory stock pivot representation
   * @param {Object} queryParams - Filters: lens_id, category_id, Type_id, coating_id, location_id, search, sph, cyl, add
   */
  async getInventoryStockPivot(queryParams = {}) {
    try {
      const {
        lens_id,
        category_id,
        Type_id,
        coating_id,
        location_id,
        search,
        sph,
        cyl,
        add,
      } = queryParams;

      const where = {
        deleteStatus: false,
        activeStatus: true,
      };

      const andClauses = [RX_SOURCE_EXCLUSION_FILTER];

      if (lens_id) andClauses.push({ lens_id: parseInt(lens_id, 10) });
      if (category_id) andClauses.push({ category_id: parseInt(category_id, 10) });
      if (Type_id) andClauses.push({ Type_id: parseInt(Type_id, 10) });
      if (coating_id) andClauses.push({ coating_id: parseInt(coating_id, 10) });
      if (location_id) andClauses.push({ location_id: parseInt(location_id, 10) });

      if (sph) {
        andClauses.push({
          OR: [
            { rightSpherical: String(sph) },
            { leftSpherical: String(sph) }
          ]
        });
      }
      if (cyl) {
        andClauses.push({
          OR: [
            { rightCylindrical: String(cyl) },
            { leftCylindrical: String(cyl) }
          ]
        });
      }
      if (add) {
        andClauses.push({
          OR: [
            { rightAdd: String(add) },
            { leftAdd: String(add) }
          ]
        });
      }

      if (search) {
        andClauses.push({
          OR: [
            { lensProduct: { lens_name: { contains: search, mode: 'insensitive' } } },
            { lensProduct: { product_code: { contains: search, mode: 'insensitive' } } },
            { location: { name: { contains: search, mode: 'insensitive' } } },
            { tray: { name: { contains: search, mode: 'insensitive' } } }
          ]
        });
      }

      if (andClauses.length > 0) {
        where.AND = andClauses;
      }

      const items = await prisma.inventoryItem.findMany({
        where,
        select: {
          id: true,
          quantity: true,
          status: true,
          rightSpherical: true,
          rightCylindrical: true,
          rightAdd: true,
          leftSpherical: true,
          leftCylindrical: true,
          leftAdd: true,
          lens_id: true,
          lensProduct: {
            select: { id: true, lens_name: true, product_code: true }
          },
          category: { select: { id: true, name: true } },
          lensType: { select: { id: true, name: true } },
          coating: { select: { id: true, name: true } },
          location_id: true,
          location: { select: { id: true, name: true } },
          tray_id: true,
          tray: { select: { id: true, name: true, capacity: true } }
        }
      });

      const locationsMap = {};
      const productMap = {};

      for (const item of items) {
        const locId = item.location_id;
        const trayId = item.tray_id;

        if (locId && item.location) {
          if (!locationsMap[locId]) {
            locationsMap[locId] = {
              id: locId,
              name: item.location.name,
              trays: {}
            };
          }
          if (trayId && item.tray) {
            locationsMap[locId].trays[trayId] = {
              id: trayId,
              name: item.tray.name,
              capacity: item.tray.capacity || 0
            };
          }
        }

        const sphVal = item.rightSpherical || item.leftSpherical || '0';
        const cylVal = item.rightCylindrical || item.leftCylindrical || '0';
        const addVal = item.rightAdd || item.leftAdd || '0';
        
        const prodKey = `${item.lens_id}|${item.lensType?.id ?? '0'}|${sphVal}|${cylVal}|${addVal}|${item.coating_id ?? '0'}`;

        if (!productMap[prodKey]) {
          productMap[prodKey] = {
            key: prodKey,
            lensProduct: item.lensProduct,
            lensType: item.lensType,
            coating: item.coating,
            sph: sphVal,
            cyl: cylVal,
            add: addVal,
            trays: {},
            totalQty: 0
          };
        }

        if (trayId) {
          productMap[prodKey].trays[trayId] = (productMap[prodKey].trays[trayId] || 0) + item.quantity;
          productMap[prodKey].totalQty += item.quantity;
        }
      }

      const locationsList = Object.values(locationsMap).map(loc => ({
        id: loc.id,
        name: loc.name,
        trays: Object.values(loc.trays).sort((a, b) => a.name.localeCompare(b.name))
      })).sort((a, b) => a.name.localeCompare(b.name));

      const productsList = Object.values(productMap).sort((a, b) => {
        const nameA = a.lensProduct?.lens_name || '';
        const nameB = b.lensProduct?.lens_name || '';
        const comp = nameA.localeCompare(nameB);
        if (comp !== 0) return comp;
        return parseFloat(a.sph) - parseFloat(b.sph);
      });

      return {
        products: productsList,
        locations: locationsList
      };
    } catch (error) {
      console.error('Error compiling stock pivot:', error);
      throw new APIError('Failed to get stock pivot data', 500, 'STOCK_PIVOT_ERROR');
    }
  }
}

export default InventoryService;
