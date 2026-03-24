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
   * Process bulk lens selection and calculate totals
   * @param {Array} bulkSelection - Array of bulk lens items
   * @returns {Object} Calculated totals for bulk order
   */
  async processBulkLensSelection(bulkSelection) {
    try {
      let totalQuantity = 0;
      let totalSubtotal = 0;
      
      // Process each bulk item
      for (const item of bulkSelection) {
        const quantity = parseFloat(item.quantity) || 0;
        const unitPrice = parseFloat(item.unitPrice) || 0;
        const subtotal = quantity * unitPrice;
        
        totalQuantity += quantity;
        totalSubtotal += subtotal;
        
        // Add calculated subtotal to the item
        item.subtotal = subtotal;
      }
      
      return {
        totalQuantity,
        totalSubtotal,
        processedItems: bulkSelection
      };
    } catch (error) {
      console.error("Error processing bulk lens selection:", error);
      throw new APIError(
        "Failed to process bulk lens selection",
        500,
        "PROCESS_BULK_ERROR"
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

      // Handle bulk order processing
      if (poData.orderType === 'Bulk' && poData.lensBulkSelection) {
        const bulkProcessing = await this.processBulkLensSelection(poData.lensBulkSelection);
        
        // Update totals based on bulk calculation
        poData.quantity = bulkProcessing.totalQuantity;
        poData.subtotal = bulkProcessing.totalSubtotal;
        
        // Calculate total with discount and tax
        const discountAmount = (bulkProcessing.totalSubtotal * (poData.discountPercentage || 0)) / 100;
        const afterDiscount = bulkProcessing.totalSubtotal - discountAmount;
        const taxAmount = poData.taxAmount || 0;
        const roundOff = poData.roundOff || 0;
        
        poData.totalValue = afterDiscount + taxAmount + roundOff;
        poData.lensBulkSelection = bulkProcessing.processedItems;
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

      // Format the purchase orders to handle bulk data
      const formattedPOs = purchaseOrders.map(po => this.formatPurchaseOrderResponse(po));

      return {
        data: formattedPOs,
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
   * Format purchase order response with bulk data
   * @param {Object} purchaseOrder - Purchase order from database
   * @returns {Object} Formatted purchase order
   */
  formatPurchaseOrderResponse(purchaseOrder) {
    if (!purchaseOrder) return null;

    const formatted = { ...purchaseOrder };

    // If it's a bulk order, ensure lensBulkSelection is properly formatted
    if (formatted.orderType === 'Bulk' && formatted.lensBulkSelection) {
      try {
        // Ensure bulk selection is an array
        if (typeof formatted.lensBulkSelection === 'string') {
          formatted.lensBulkSelection = JSON.parse(formatted.lensBulkSelection);
        }
        
        // Add summary for bulk orders
        if (Array.isArray(formatted.lensBulkSelection)) {
          formatted.bulkSummary = {
            totalItems: formatted.lensBulkSelection.length,
            totalQuantity: formatted.lensBulkSelection.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0),
            totalAmount: formatted.lensBulkSelection.reduce((sum, item) => sum + (parseFloat(item.subtotal) || 0), 0)
          };
        }
      } catch (error) {
        console.error("Error formatting bulk selection:", error);
        formatted.lensBulkSelection = null;
      }
    }

    return formatted;
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

      return this.formatPurchaseOrderResponse(purchaseOrder);
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

      // Handle bulk order processing if being updated to bulk or bulk data is modified
      if (updateData.orderType === 'Bulk' && updateData.lensBulkSelection) {
        const bulkProcessing = await this.processBulkLensSelection(updateData.lensBulkSelection);
        
        // Update totals based on bulk calculation
        updateData.quantity = bulkProcessing.totalQuantity;
        updateData.subtotal = bulkProcessing.totalSubtotal;
        
        // Calculate total with discount and tax
        const discountAmount = (bulkProcessing.totalSubtotal * (updateData.discountPercentage || 0)) / 100;
        const afterDiscount = bulkProcessing.totalSubtotal - discountAmount;
        const taxAmount = updateData.taxAmount || 0;
        const roundOff = updateData.roundOff || 0;
        
        updateData.totalValue = afterDiscount + taxAmount + roundOff;
        updateData.lensBulkSelection = bulkProcessing.processedItems;
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

      return this.formatPurchaseOrderResponse(updatedPO);
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

  /**
   * Generate next Receipt number (REC-0001)
   */
  async generateReceiptNumber() {
    try {
      const last = await prisma.purchaseOrderReceipt.findFirst({
        where: { receiptNumber: { startsWith: "REC-" } },
        orderBy: { createdAt: "desc" },
      });
      if (!last) return "REC-0001";
      const num = parseInt(last.receiptNumber.split("-")[1]) + 1;
      return `REC-${String(num).padStart(4, "0")}`;
    } catch (error) {
      throw new APIError("Failed to generate receipt number", 500, "GENERATE_RECEIPT_NUM_ERROR");
    }
  }

  /**
   * Receive a purchase order (create a PurchaseOrderReceipt)
   * Updates PO's receivedQty and status automatically.
   * @param {number} poId
   * @param {Object} receiptData - { receivedDate, receivedItems, notes, createdBy }
   *   receivedItems for Bulk: [{ key, spherical, cylindrical, orderedQty, receivedQty, unitPrice }]
   *   receivedItems for Single: [{ orderedQty, receivedQty, unitPrice }]
   */
  async receivePurchaseOrder(poId, receiptData) {
    try {
      const po = await prisma.purchaseOrder.findUnique({
        where: { id: poId, deleteStatus: false },
        include: { receipts: { where: { deleteStatus: false } } },
      });

      if (!po) throw new APIError("Purchase order not found", 404, "PO_NOT_FOUND");
      if (po.status === "RECEIVED") throw new APIError("This PO is already fully received", 400, "PO_ALREADY_RECEIVED");
      if (po.status === "INVOICE_RECEIVED") throw new APIError("Invoice already received for this PO", 400, "PO_INVOICE_RECEIVED");
      if (po.status === "CLOSED") throw new APIError("This PO is closed", 400, "PO_CLOSED");
      if (po.status === "CANCELLED") throw new APIError("Cannot receive a cancelled PO", 400, "PO_CANCELLED");

      const receiptNumber = await this.generateReceiptNumber();

      // Calculate totals from received items
      const totalReceivedQty = receiptData.receivedItems.reduce(
        (sum, item) => sum + (parseFloat(item.receivedQty) || 0), 0
      );
      // Use frontend-computed total (includes tax); fall back to item-level calc if not provided
      const totalValue = parseFloat(receiptData.totalValue) ||
        receiptData.receivedItems.reduce(
          (sum, item) => sum + ((parseFloat(item.receivedQty) || 0) * (parseFloat(item.unitPrice) || 0)), 0
        );

      // Calculate new cumulative received qty across all receipts
      const prevReceivedQty = po.receipts.reduce(
        (sum, r) => sum + (r.totalReceivedQty || 0), 0
      );
      const newCumulativeReceived = prevReceivedQty + totalReceivedQty;

      // Determine receipt status
      const receiptStatus = newCumulativeReceived >= po.quantity ? "COMPLETE" : "PARTIAL";

      // Any receipt sets PO to RECEIVED (partial or full)
      const newPOStatus = "RECEIVED";

      // Run in a transaction: create receipt, update PO, create log
      const [receipt, log] = await prisma.$transaction([
        prisma.purchaseOrderReceipt.create({
          data: {
            receiptNumber,
            purchaseOrderId: poId,
            receivedDate: receiptData.receivedDate ? new Date(receiptData.receivedDate) : new Date(),
            receivedItems: receiptData.receivedItems,
            totalReceivedQty,
            totalValue,
            actualDeliveryDate: receiptData.actualDeliveryDate ? new Date(receiptData.actualDeliveryDate) : null,
            unitPrice: parseFloat(receiptData.unitPrice) || 0,
            subtotal: parseFloat(receiptData.subtotal) || 0,
            taxAmount: parseFloat(receiptData.taxAmount) || 0,
            supplierInvoiceNo: receiptData.supplierInvoiceNo || null,
            purchaseType: receiptData.purchaseType || null,
            placeOfSupply: receiptData.placeOfSupply || null,
            itemDescription: receiptData.itemDescription || null,
            notes: receiptData.notes || null,
            status: receiptStatus,
            createdBy: receiptData.createdBy,
          },
        }),
        prisma.purchaseOrder.update({
          where: { id: poId },
          data: {
            receivedQty: newCumulativeReceived,
            status: newPOStatus,
            ...(receiptData.actualDeliveryDate && { actualDeliveryDate: new Date(receiptData.actualDeliveryDate) }),
            updatedBy: receiptData.createdBy,
          },
        }),
        prisma.purchaseReceiptLog.create({
          data: {
            receiptNumber,
            purchaseOrderId: poId,
            purchaseReceiptId: undefined, // Will set after receipt is created
            receivedItems: receiptData.receivedItems,
            totalReceivedQty,
            createdBy: receiptData.createdBy,
            createdAt: new Date(),
            status: receiptStatus,
          },
        }),
      ]);

      // Patch log with receipt id (since we need the created receipt's id)
      await prisma.purchaseReceiptLog.update({
        where: { id: log.id },
        data: { purchaseReceiptId: receipt.id },
      });

      return {
        receipt,
        poStatus: newPOStatus,
        cumulativeReceivedQty: newCumulativeReceived,
        orderedQty: po.quantity,
      };
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error("Error receiving purchase order:", error);
      throw new APIError("Failed to receive purchase order", 500, "RECEIVE_PO_ERROR");
    }
  }

  /**
   * Update an existing receipt
   * @param {number} poId
   * @param {number} receiptId
   * @param {Object} receiptData
   */
  async updateReceipt(poId, receiptId, receiptData) {
    try {
      const po = await prisma.purchaseOrder.findUnique({
        where: { id: poId, deleteStatus: false },
        include: { receipts: { where: { deleteStatus: false } } },
      });
      if (!po) throw new APIError("Purchase order not found", 404, "PO_NOT_FOUND");

      const existing = po.receipts.find((r) => r.id === receiptId);
      if (!existing) throw new APIError("Receipt not found", 404, "RECEIPT_NOT_FOUND");

      // New totals from updated items
      const newTotalQty = receiptData.receivedItems.reduce(
        (sum, item) => sum + (parseFloat(item.receivedQty) || 0), 0
      );
      const newTotalValue = parseFloat(receiptData.totalValue) ||
        receiptData.receivedItems.reduce(
          (sum, item) => sum + ((parseFloat(item.receivedQty) || 0) * (parseFloat(item.unitPrice) || 0)), 0
        );

      // Recalculate cumulative: subtract old receipt qty, add new
      const otherReceiptsQty = po.receipts
        .filter((r) => r.id !== receiptId)
        .reduce((sum, r) => sum + (r.totalReceivedQty || 0), 0);
      const newCumulativeReceived = otherReceiptsQty + newTotalQty;

      // Determine new PO status
      const receiptStatus = newCumulativeReceived >= po.quantity ? "COMPLETE" : "PARTIAL";
      // Any receipt (even partial) keeps PO as RECEIVED; only revert to DRAFT if all qty removed
      const newPOStatus = newCumulativeReceived <= 0 ? "DRAFT" : "RECEIVED";

      // Run in a transaction: update receipt, update PO, create log
      const [updatedReceipt, , log] = await prisma.$transaction([
        prisma.purchaseOrderReceipt.update({
          where: { id: receiptId },
          data: {
            receivedDate: receiptData.receivedDate ? new Date(receiptData.receivedDate) : existing.receivedDate,
            receivedItems: receiptData.receivedItems,
            totalReceivedQty: newTotalQty,
            totalValue: newTotalValue,
            actualDeliveryDate: receiptData.actualDeliveryDate ? new Date(receiptData.actualDeliveryDate) : existing.actualDeliveryDate,
            unitPrice: parseFloat(receiptData.unitPrice) || 0,
            subtotal: parseFloat(receiptData.subtotal) || 0,
            taxAmount: parseFloat(receiptData.taxAmount) || 0,
            supplierInvoiceNo: receiptData.supplierInvoiceNo || null,
            purchaseType: receiptData.purchaseType || null,
            placeOfSupply: receiptData.placeOfSupply || null,
            itemDescription: receiptData.itemDescription || null,
            notes: receiptData.notes || null,
            status: receiptStatus,
            updatedBy: receiptData.updatedBy,
          },
        }),
        prisma.purchaseOrder.update({
          where: { id: poId },
          data: {
            receivedQty: newCumulativeReceived,
            status: newPOStatus,
            ...(receiptData.actualDeliveryDate && { actualDeliveryDate: new Date(receiptData.actualDeliveryDate) }),
            updatedBy: receiptData.updatedBy,
          },
        }),
        prisma.purchaseReceiptLog.create({
          data: {
            receiptNumber: existing.receiptNumber,
            purchaseOrderId: poId,
            purchaseReceiptId: receiptId,
            receivedItems: receiptData.receivedItems,
            totalReceivedQty: newTotalQty,
            createdBy: receiptData.updatedBy,
            createdAt: new Date(),
            status: receiptStatus,
          },
        }),
      ]);

      return {
        receipt: updatedReceipt,
        poStatus: newPOStatus,
        cumulativeReceivedQty: newCumulativeReceived,
        orderedQty: po.quantity,
      };
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error("Error updating receipt:", error);
      throw new APIError("Failed to update receipt", 500, "UPDATE_RECEIPT_ERROR");
    }
  }

  /**
   * Get all receipts for a purchase order
   * @param {number} poId
   */
  async getPOReceipts(poId) {
    try {
      const po = await prisma.purchaseOrder.findUnique({
        where: { id: poId, deleteStatus: false },
      });
      if (!po) throw new APIError("Purchase order not found", 404, "PO_NOT_FOUND");

      const receipts = await prisma.purchaseOrderReceipt.findMany({
        where: { purchaseOrderId: poId, deleteStatus: false },
        include: {
          createdByUser: { select: { id: true, name: true, usercode: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      const totalReceived = receipts.reduce((sum, r) => sum + (r.totalReceivedQty || 0), 0);

      return {
        receipts,
        orderedQty: po.quantity,
        totalReceivedQty: totalReceived,
        pendingQty: Math.max(0, po.quantity - totalReceived),
        poStatus: po.status,
      };
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error("Error fetching PO receipts:", error);
      throw new APIError("Failed to fetch receipts", 500, "FETCH_RECEIPTS_ERROR");
    }
  }
  /**
   * Get all receipt logs for a purchase order (all logs for all receipts of a PO)
   * @param {number} poId
   * @returns {Promise<Array>} Array of logs, newest first
   */
  async getPOReceiptLogs(poId) {
    try {
      // Optional: validate PO exists
      const po = await prisma.purchaseOrder.findUnique({
        where: { id: poId, deleteStatus: false },
      });
  
      if (!po) {
        throw new APIError("Purchase order not found", 404, "PO_NOT_FOUND");
      }
  
      const logs = await prisma.purchaseReceiptLog.findMany({
        where: {
          purchaseOrderId: poId,
          deleteStatus: false,
        },
        include: {
          createdByUser: {
            select: { id: true, name: true, usercode: true },
          },
          updatedByUser: {
            select: { id: true, name: true, usercode: true },
          },
          purchaseReceipt: {
            select: { id: true, receiptNumber: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
  
      return logs;
    } catch (error) {
      if (error instanceof APIError) throw error;
  
      console.error("Error fetching receipt logs:", error);
      throw new APIError(
        "Failed to fetch receipt logs",
        500,
        "FETCH_RECEIPT_LOGS_ERROR"
      );
    }
  }
}

export default new PurchaseOrderService();
