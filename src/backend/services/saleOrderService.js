import prisma from '../config/prisma.js';
import { APIError } from '../middleware/errorHandler.js';

/**
 * Sale Order Service
 * Handles business logic for sale order management
 */
export class SaleOrderService {

  /**
   * Generate unique order number
   * @returns {Promise<string>} Generated order number (e.g., SO-2025-001)
   */
  async generateOrderNumber() {
    const year = new Date().getFullYear();
    const prefix = `SO-${year}-`;
    
    // Get the latest order number for this year
    const lastOrder = await prisma.saleOrder.findFirst({
      where: {
        orderNo: {
          startsWith: prefix
        }
      },
      orderBy: {
        orderNo: 'desc'
      }
    });

    if (!lastOrder) {
      return `${prefix}001`;
    }

    // Extract the number part and increment
    const lastNumber = parseInt(lastOrder.orderNo.split('-')[2]);
    const newNumber = (lastNumber + 1).toString().padStart(3, '0');
    return `${prefix}${newNumber}`;
  }

  /**
   * Create a new sale order
   * @param {Object} orderData - Sale order data
   * @param {number} userId - User creating the order
   * @returns {Promise<Object>} Created sale order
   */
  async createSaleOrder(orderData, userId) {
    try {
      // Validate customer exists
      const customer = await prisma.customer.findUnique({
        where: { id: orderData.customerId, deleteStatus: false }
      });

      if (!customer) {
        throw new APIError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
      }

      // Validate related entities if provided
      if (orderData.lens_id) {
        const lensProduct = await prisma.lensProductMaster.findUnique({
          where: { id: orderData.lens_id, deleteStatus: false }
        });
        if (!lensProduct) {
          throw new APIError('Lens product not found', 404, 'LENS_PRODUCT_NOT_FOUND');
        }
      }

      if (orderData.category_id) {
        const category = await prisma.lensCategoryMaster.findUnique({
          where: { id: orderData.category_id, deleteStatus: false }
        });
        if (!category) {
          throw new APIError('Lens category not found', 404, 'CATEGORY_NOT_FOUND');
        }
      }

      if (orderData.coating_id) {
        const coating = await prisma.lensCoatingMaster.findUnique({
          where: { id: orderData.coating_id, deleteStatus: false }
        });
        if (!coating) {
          throw new APIError('Lens coating not found', 404, 'COATING_NOT_FOUND');
        }
      }

      if (orderData.Type_id) {
        const lensType = await prisma.lensTypeMaster.findUnique({
          where: { id: orderData.Type_id, deleteStatus: false }
        });
        if (!lensType) {
          throw new APIError('Lens type not found', 404, 'TYPE_NOT_FOUND');
        }
      }

      if (orderData.fitting_id) {
        const fitting = await prisma.lensFittingMaster.findUnique({
          where: { id: orderData.fitting_id, deleteStatus: false }
        });
        if (!fitting) {
          throw new APIError('Lens fitting not found', 404, 'FITTING_NOT_FOUND');
        }
      }

      if (orderData.dia_id) {
        const dia = await prisma.lensDiaMaster.findUnique({
          where: { id: orderData.dia_id, deleteStatus: false }
        });
        if (!dia) {
          throw new APIError('Lens diameter not found', 404, 'DIA_NOT_FOUND');
        }
      }

      if (orderData.tinting_id) {
        const tinting = await prisma.lensTintingMaster.findUnique({
          where: { id: orderData.tinting_id, deleteStatus: false }
        });
        if (!tinting) {
          throw new APIError('Lens tinting not found', 404, 'TINTING_NOT_FOUND');
        }
      }

      if (orderData.assignedPerson_id) {
        const user = await prisma.user.findUnique({
          where: { id: orderData.assignedPerson_id }
        });
        if (!user) {
          throw new APIError('Assigned person not found', 404, 'USER_NOT_FOUND');
        }
      }

      // Generate order number
      const orderNo = await this.generateOrderNumber();

      // Create the sale order
      const saleOrder = await prisma.saleOrder.create({
        data: {
          orderNo,
          customerId: orderData.customerId,
          status: orderData.status || 'DRAFT',
          
          // Basic order information
          customerRefNo: orderData.customerRefNo,
          orderDate: orderData.orderDate ? new Date(orderData.orderDate) : new Date(),
          type: orderData.type,
          deliverySchedule: orderData.deliverySchedule ? new Date(orderData.deliverySchedule) : null,
          remark: orderData.remark,
          itemRefNo: orderData.itemRefNo,
          freeLens: orderData.freeLens ?? false,
          
          // Lens details
          lens_id: orderData.lens_id,
          category_id: orderData.category_id,
          Type_id: orderData.Type_id,
          dia_id: orderData.dia_id,
          fitting_id: orderData.fitting_id,
          coating_id: orderData.coating_id,
          tinting_id: orderData.tinting_id,
          
          // Eye selection
          rightEye: orderData.rightEye ?? false,
          leftEye: orderData.leftEye ?? false,
          
          // Right eye specifications
          rightSpherical: orderData.rightSpherical,
          rightCylindrical: orderData.rightCylindrical,
          rightAxis: orderData.rightAxis,
          rightAdd: orderData.rightAdd,
          rightDia: orderData.rightDia,
          rightBase: orderData.rightBase,
          rightBaseSize: orderData.rightBaseSize,
          rightBled: orderData.rightBled,
          
          // Left eye specifications
          leftSpherical: orderData.leftSpherical,
          leftCylindrical: orderData.leftCylindrical,
          leftAxis: orderData.leftAxis,
          leftAdd: orderData.leftAdd,
          leftDia: orderData.leftDia,
          leftBase: orderData.leftBase,
          leftBaseSize: orderData.leftBaseSize,
          leftBled: orderData.leftBled,
          
          // Dispatch information
          dispatchStatus: orderData.dispatchStatus || 'Pending',
          assignedPerson_id: orderData.assignedPerson_id,
          dispatchId: orderData.dispatchId,
          estimatedDate: orderData.estimatedDate ? new Date(orderData.estimatedDate) : null,
          estimatedTime: orderData.estimatedTime,
          actualDate: orderData.actualDate ? new Date(orderData.actualDate) : null,
          actualTime: orderData.actualTime,
          dispatchNotes: orderData.dispatchNotes,
          
          // Billing information
          lensPrice: orderData.lensPrice ?? 0,
          discount: orderData.discount ?? 0,
          
          // Audit fields
          createdBy: userId,
          updatedBy: userId,
          activeStatus: true,
          deleteStatus: false
        },
        include: {
          customer: {
            select: {
              id: true,
              code: true,
              name: true,
              shopname: true,
              email: true,
              phone: true
            }
          },
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
          fitting: true,
          dia: true,
          tinting: true,
          assignedPerson: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          createdByUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      return saleOrder;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Error creating sale order:', error);
      throw new APIError('Failed to create sale order', 500, 'CREATE_ORDER_ERROR');
    }
  }

  /**
   * Get all sale orders with pagination and filtering
   * @param {Object} queryParams - Query parameters
   * @returns {Promise<Object>} Paginated sale orders
   */
  async getSaleOrders(queryParams) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        status,
        customerId,
        search,
        startDate,
        endDate,
        dispatchStatus
      } = queryParams;

      const where = { deleteStatus: false };

      // Filter by status
      if (status) {
        where.status = status;
      }

      // Filter by customer
      if (customerId) {
        where.customerId = parseInt(customerId);
      }

      // Filter by dispatch status
      if (dispatchStatus) {
        where.dispatchStatus = dispatchStatus;
      }

      // Search across order number, customer ref, item ref
      if (search) {
        where.OR = [
          { orderNo: { contains: search, mode: 'insensitive' } },
          { customerRefNo: { contains: search, mode: 'insensitive' } },
          { itemRefNo: { contains: search, mode: 'insensitive' } },
          { customer: { name: { contains: search, mode: 'insensitive' } } },
          { customer: { code: { contains: search, mode: 'insensitive' } } }
        ];
      }

      // Date range filter
      if (startDate || endDate) {
        where.orderDate = {};
        if (startDate) where.orderDate.gte = new Date(startDate);
        if (endDate) where.orderDate.lte = new Date(endDate);
      }

      const offset = (page - 1) * limit;
      const total = await prisma.saleOrder.count({ where });

      const saleOrders = await prisma.saleOrder.findMany({
        where,
        skip: offset,
        take: parseInt(limit),
        orderBy: { [sortBy]: sortOrder },
        include: {
          customer: {
            select: {
              id: true,
              code: true,
              name: true,
              shopname: true,
              phone: true
            }
          },
          lensProduct: {
            select: {
              id: true,
              lens_name: true,
              product_code: true
            }
          },
          category: {
            select: {
              id: true,
              name: true
            }
          },
          coating: {
            select: {
              id: true,
              name: true,
              short_name: true
            }
          },
          assignedPerson: {
            select: {
              id: true,
              name: true
            }
          },
          items: true
        }
      });

      return {
        data: saleOrders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error fetching sale orders:', error);
      throw new APIError('Failed to fetch sale orders', 500, 'FETCH_ORDERS_ERROR');
    }
  }

  /**
   * Get a single sale order by ID
   * @param {number} id - Sale order ID
   * @returns {Promise<Object>} Sale order details
   */
  async getSaleOrderById(id) {
    try {
      const saleOrder = await prisma.saleOrder.findUnique({
        where: { id },
        include: {
          customer: true,
          lensProduct: {
            include: {
              brand: true,
              category: true,
              material: true,
              type: true,
              lensPriceMasters: {
                include: {
                  coating: true
                }
              }
            }
          },
          category: true,
          lensType: true,
          coating: true,
          fitting: true,
          dia: true,
          tinting: true,
          items: true,
          invoice: true,
          purchaseOrders: true,
          dispatch: true,
          assignedPerson: {
            select: {
              id: true,
              name: true,
              email: true,
              phonenumber: true
            }
          },
          createdByUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          updatedByUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      if (!saleOrder || saleOrder.deleteStatus) {
        throw new APIError('Sale order not found', 404, 'ORDER_NOT_FOUND');
      }

      return saleOrder;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Error fetching sale order:', error);
      throw new APIError('Failed to fetch sale order', 500, 'FETCH_ORDER_ERROR');
    }
  }

  /**
   * Update a sale order
   * @param {number} id - Sale order ID
   * @param {Object} updateData - Updated data
   * @param {number} userId - User performing update
   * @returns {Promise<Object>} Updated sale order
   */
  async updateSaleOrder(id, updateData, userId) {
    try {
      // Check if order exists
      const existing = await prisma.saleOrder.findUnique({
        where: { id }
      });

      if (!existing || existing.deleteStatus) {
        throw new APIError('Sale order not found', 404, 'ORDER_NOT_FOUND');
      }

      // Validate customer if changed
      if (updateData.customerId) {
        const customer = await prisma.customer.findUnique({
          where: { id: updateData.customerId, deleteStatus: false }
        });
        if (!customer) {
          throw new APIError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
        }
      }

      // Prepare update object
      const dataToUpdate = {
        ...updateData,
        updatedBy: userId
      };

      // Handle date conversions
      if (updateData.orderDate) {
        dataToUpdate.orderDate = new Date(updateData.orderDate);
      }
      if (updateData.deliverySchedule) {
        dataToUpdate.deliverySchedule = new Date(updateData.deliverySchedule);
      }
      if (updateData.estimatedDate) {
        dataToUpdate.estimatedDate = new Date(updateData.estimatedDate);
      }
      if (updateData.actualDate) {
        dataToUpdate.actualDate = new Date(updateData.actualDate);
      }

      const updated = await prisma.saleOrder.update({
        where: { id },
        data: dataToUpdate,
        include: {
          customer: true,
          lensProduct: true,
          category: true,
          lensType: true,
          coating: true,
          fitting: true,
          dia: true,
          tinting: true,
          assignedPerson: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          updatedByUser: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      return updated;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Error updating sale order:', error);
      throw new APIError('Failed to update sale order', 500, 'UPDATE_ORDER_ERROR');
    }
  }

  /**
   * Update sale order status
   * @param {number} id - Sale order ID
   * @param {string} status - New status
   * @param {number} userId - User performing update
   * @returns {Promise<Object>} Updated sale order
   */
  async updateStatus(id, status, userId) {
    try {
      const existing = await prisma.saleOrder.findUnique({
        where: { id }
      });

      if (!existing || existing.deleteStatus) {
        throw new APIError('Sale order not found', 404, 'ORDER_NOT_FOUND');
      }

      // Validate status
      const validStatuses = ['DRAFT', 'CONFIRMED', 'IN_PRODUCTION', 'READY_FOR_DISPATCH', 'DELIVERED'];
      if (!validStatuses.includes(status)) {
        throw new APIError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400, 'INVALID_STATUS');
      }

      const updated = await prisma.saleOrder.update({
        where: { id },
        data: {
          status,
          updatedBy: userId
        },
        include: {
          customer: {
            select: {
              id: true,
              code: true,
              name: true
            }
          },
          updatedByUser: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      return updated;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Error updating order status:', error);
      throw new APIError('Failed to update order status', 500, 'UPDATE_STATUS_ERROR');
    }
  }

  /**
   * Update dispatch information
   * @param {number} id - Sale order ID
   * @param {Object} dispatchData - Dispatch information
   * @param {number} userId - User performing update
   * @returns {Promise<Object>} Updated sale order
   */
  async updateDispatchInfo(id, dispatchData, userId) {
    try {
      const existing = await prisma.saleOrder.findUnique({
        where: { id }
      });

      if (!existing || existing.deleteStatus) {
        throw new APIError('Sale order not found', 404, 'ORDER_NOT_FOUND');
      }

      // Validate assigned person if provided
      if (dispatchData.assignedPerson_id) {
        const user = await prisma.user.findUnique({
          where: { id: dispatchData.assignedPerson_id }
        });
        if (!user) {
          throw new APIError('Assigned person not found', 404, 'USER_NOT_FOUND');
        }
      }

      // Prepare dispatch update data
      const updateData = {
        updatedBy: userId
      };

      if (dispatchData.dispatchStatus !== undefined) updateData.dispatchStatus = dispatchData.dispatchStatus;
      if (dispatchData.assignedPerson_id !== undefined) updateData.assignedPerson_id = dispatchData.assignedPerson_id;
      if (dispatchData.dispatchId !== undefined) updateData.dispatchId = dispatchData.dispatchId;
      if (dispatchData.estimatedDate !== undefined) {
        updateData.estimatedDate = dispatchData.estimatedDate ? new Date(dispatchData.estimatedDate) : null;
      }
      if (dispatchData.estimatedTime !== undefined) updateData.estimatedTime = dispatchData.estimatedTime;
      if (dispatchData.actualDate !== undefined) {
        updateData.actualDate = dispatchData.actualDate ? new Date(dispatchData.actualDate) : null;
      }
      if (dispatchData.actualTime !== undefined) updateData.actualTime = dispatchData.actualTime;
      if (dispatchData.dispatchNotes !== undefined) updateData.dispatchNotes = dispatchData.dispatchNotes;

      const updated = await prisma.saleOrder.update({
        where: { id },
        data: updateData,
        include: {
          customer: {
            select: {
              id: true,
              code: true,
              name: true
            }
          },
          assignedPerson: {
            select: {
              id: true,
              name: true,
              email: true,
              phonenumber: true
            }
          },
          updatedByUser: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      return updated;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Error updating dispatch info:', error);
      throw new APIError('Failed to update dispatch information', 500, 'UPDATE_DISPATCH_ERROR');
    }
  }

  /**
   * Soft delete a sale order
   * @param {number} id - Sale order ID
   * @param {number} userId - User performing deletion
   * @returns {Promise<boolean>} Success status
   */
  async deleteSaleOrder(id, userId) {
    try {
      const existing = await prisma.saleOrder.findUnique({
        where: { id },
        include: {
          invoice: true,
          purchaseOrders: true
        }
      });

      if (!existing || existing.deleteStatus) {
        throw new APIError('Sale order not found', 404, 'ORDER_NOT_FOUND');
      }

      // Check if order can be deleted
      if (existing.invoiceId) {
        throw new APIError('Cannot delete sale order with an invoice', 400, 'HAS_INVOICE');
      }

      if (existing.purchaseOrders.length > 0) {
        throw new APIError('Cannot delete sale order with purchase orders', 400, 'HAS_PURCHASE_ORDERS');
      }

      if (['DELIVERED'].includes(existing.status)) {
        throw new APIError('Cannot delete delivered sale order', 400, 'INVALID_STATUS');
      }

      // Soft delete
      await prisma.saleOrder.update({
        where: { id },
        data: {
          deleteStatus: true,
          activeStatus: false,
          updatedBy: userId
        }
      });

      return true;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error('Error deleting sale order:', error);
      throw new APIError('Failed to delete sale order', 500, 'DELETE_ORDER_ERROR');
    }
  }

  /**
   * Get sale order statistics
   * @param {Object} filters - Date filters
   * @returns {Promise<Object>} Statistics
   */
  async getStatistics(filters = {}) {
    try {
      const where = { deleteStatus: false };

      if (filters.startDate || filters.endDate) {
        where.orderDate = {};
        if (filters.startDate) where.orderDate.gte = new Date(filters.startDate);
        if (filters.endDate) where.orderDate.lte = new Date(filters.endDate);
      }

      const [
        total,
        byStatus,
        byDispatchStatus,
        totalRevenue
      ] = await Promise.all([
        prisma.saleOrder.count({ where }),
        prisma.saleOrder.groupBy({
          by: ['status'],
          where,
          _count: { id: true }
        }),
        prisma.saleOrder.groupBy({
          by: ['dispatchStatus'],
          where,
          _count: { id: true }
        }),
        prisma.saleOrder.aggregate({
          where,
          _sum: { lensPrice: true }
        })
      ]);

      const statusCounts = byStatus.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      }, {});

      const dispatchCounts = byDispatchStatus.reduce((acc, item) => {
        acc[item.dispatchStatus || 'Pending'] = item._count.id;
        return acc;
      }, {});

      return {
        total,
        byStatus: statusCounts,
        byDispatchStatus: dispatchCounts,
        totalRevenue: totalRevenue._sum.lensPrice || 0
      };
    } catch (error) {
      console.error('Error fetching statistics:', error);
      throw new APIError('Failed to fetch statistics', 500, 'FETCH_STATS_ERROR');
    }
  }
}

export default SaleOrderService;
