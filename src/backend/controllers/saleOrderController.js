import prisma from '../config/prisma.js';
import { SaleOrderStatus } from '@prisma/client';
import { z } from 'zod';
import { APIError } from '../middleware/errorHandler.js';

// Input validation schemas
const saleOrderItemSchema = z.object({
  lensVariantId: z.number().optional(),
  quantity: z.number().min(1).default(1),
  discount: z.number().min(0).max(100).default(0),
});

const createSaleOrderSchema = z.object({
  customerId: z.number(),
  
  // Basic order information
  customerRefNo: z.string().optional(),
  orderDate: z.string().datetime().optional(),
  type: z.string().optional(),
  deliverySchedule: z.string().datetime().optional(),
  remark: z.string().optional(),
  itemRefNo: z.string().optional(),
  freeLens: z.boolean().default(false),
  
  // Lens details
  lensName: z.string().optional(),
  category: z.string().optional(),
  lensType: z.string().optional(),
  dia: z.string().optional(),
  fittingType: z.string().optional(),
  coatingType: z.string().optional(),
  coatingName: z.string().optional(),
  tintingName: z.string().optional(),
  
  // Eye selection
  rightEye: z.boolean().default(false),
  leftEye: z.boolean().default(false),
  
  // Right eye specifications
  rightSpherical: z.string().optional(),
  rightCylindrical: z.string().optional(),
  rightAxis: z.string().optional(),
  rightAdd: z.string().optional(),
  rightDia: z.string().optional(),
  rightBase: z.string().optional(),
  rightBaseSize: z.string().optional(),
  rightBled: z.string().optional(),
  
  // Left eye specifications
  leftSpherical: z.string().optional(),
  leftCylindrical: z.string().optional(),
  leftAxis: z.string().optional(),
  leftAdd: z.string().optional(),
  leftDia: z.string().optional(),
  leftBase: z.string().optional(),
  leftBaseSize: z.string().optional(),
  leftBled: z.string().optional(),
  
  // Dispatch information
  dispatchStatus: z.string().optional(),
  assignedPerson: z.string().optional(),
  dispatchId: z.string().optional(),
  estimatedDate: z.string().datetime().optional(),
  estimatedTime: z.string().optional(),
  actualDate: z.string().datetime().optional(),
  actualTime: z.string().optional(),
  dispatchNotes: z.string().optional(),
  
  // Billing information
  lensPrice: z.number().min(0).default(0),
  coatingPrice: z.number().min(0).default(0),
  fittingPrice: z.number().min(0).default(0),
  tintingPrice: z.number().min(0).default(0),
  discount: z.number().min(0).max(100).default(0),
  
  // Legacy items support
  items: z.array(saleOrderItemSchema).optional(),
});

const updateSaleOrderSchema = z.object({
  customerId: z.number().optional(),
  
  // Basic order information
  customerRefNo: z.string().optional(),
  orderDate: z.string().datetime().optional(),
  type: z.string().optional(),
  deliverySchedule: z.string().datetime().optional(),
  remark: z.string().optional(),
  itemRefNo: z.string().optional(),
  freeLens: z.boolean().optional(),
  
  // Lens details
  lensName: z.string().optional(),
  category: z.string().optional(),
  lensType: z.string().optional(),
  dia: z.string().optional(),
  fittingType: z.string().optional(),
  coatingType: z.string().optional(),
  coatingName: z.string().optional(),
  tintingName: z.string().optional(),
  
  // Eye selection
  rightEye: z.boolean().optional(),
  leftEye: z.boolean().optional(),
  
  // Right eye specifications
  rightSpherical: z.string().optional(),
  rightCylindrical: z.string().optional(),
  rightAxis: z.string().optional(),
  rightAdd: z.string().optional(),
  rightDia: z.string().optional(),
  rightBase: z.string().optional(),
  rightBaseSize: z.string().optional(),
  rightBled: z.string().optional(),
  
  // Left eye specifications
  leftSpherical: z.string().optional(),
  leftCylindrical: z.string().optional(),
  leftAxis: z.string().optional(),
  leftAdd: z.string().optional(),
  leftDia: z.string().optional(),
  leftBase: z.string().optional(),
  leftBaseSize: z.string().optional(),
  leftBled: z.string().optional(),
  
  // Dispatch information
  dispatchStatus: z.string().optional(),
  assignedPerson: z.string().optional(),
  dispatchId: z.string().optional(),
  estimatedDate: z.string().datetime().optional(),
  estimatedTime: z.string().optional(),
  actualDate: z.string().datetime().optional(),
  actualTime: z.string().optional(),
  dispatchNotes: z.string().optional(),
  
  // Billing information
  lensPrice: z.number().min(0).optional(),
  coatingPrice: z.number().min(0).optional(),
  fittingPrice: z.number().min(0).optional(),
  tintingPrice: z.number().min(0).optional(),
  discount: z.number().min(0).max(100).optional(),
  
  // Status and legacy items support
  status: z.enum(['DRAFT', 'CONFIRMED', 'IN_PRODUCTION', 'READY_FOR_DISPATCH', 'DELIVERED']).optional(),
  items: z.array(saleOrderItemSchema).optional(),
});

export class SaleOrderController {
  // Create a new sale order
  async create(req, res, next) {
    try {
      // Validate input
      const data = createSaleOrderSchema.parse(req.body);

      // Validate customer exists
      const customer = await prisma.customer.findUnique({
        where: { id: data.customerId }
      });

      if (!customer) {
        throw new APIError(404, 'Customer not found', 'CUSTOMER_NOT_FOUND');
      }

      // Prepare data for creation
      const createData = {
        customerId: data.customerId,
        
        // Basic order information
        customerRefNo: data.customerRefNo,
        orderDate: data.orderDate ? new Date(data.orderDate) : new Date(),
        type: data.type,
        deliverySchedule: data.deliverySchedule ? new Date(data.deliverySchedule) : null,
        remark: data.remark,
        itemRefNo: data.itemRefNo,
        freeLens: data.freeLens,
        
        // Lens details
        lensName: data.lensName,
        category: data.category,
        lensType: data.lensType,
        dia: data.dia,
        fittingType: data.fittingType,
        coatingType: data.coatingType,
        coatingName: data.coatingName,
        tintingName: data.tintingName,
        
        // Eye selection
        rightEye: data.rightEye,
        leftEye: data.leftEye,
        
        // Right eye specifications
        rightSpherical: data.rightSpherical,
        rightCylindrical: data.rightCylindrical,
        rightAxis: data.rightAxis,
        rightAdd: data.rightAdd,
        rightDia: data.rightDia,
        rightBase: data.rightBase,
        rightBaseSize: data.rightBaseSize,
        rightBled: data.rightBled,
        
        // Left eye specifications
        leftSpherical: data.leftSpherical,
        leftCylindrical: data.leftCylindrical,
        leftAxis: data.leftAxis,
        leftAdd: data.leftAdd,
        leftDia: data.leftDia,
        leftBase: data.leftBase,
        leftBaseSize: data.leftBaseSize,
        leftBled: data.leftBled,
        
        // Dispatch information
        dispatchStatus: data.dispatchStatus || "Pending",
        assignedPerson: data.assignedPerson,
        dispatchId: data.dispatchId,
        estimatedDate: data.estimatedDate ? new Date(data.estimatedDate) : null,
        estimatedTime: data.estimatedTime,
        actualDate: data.actualDate ? new Date(data.actualDate) : null,
        actualTime: data.actualTime,
        dispatchNotes: data.dispatchNotes,
        
        // Billing information
        lensPrice: data.lensPrice,
        coatingPrice: data.coatingPrice,
        fittingPrice: data.fittingPrice,
        tintingPrice: data.tintingPrice,
        discount: data.discount,
        
        // Default status
        status: 'DRAFT'
      };

      // Handle legacy items if provided
      if (data.items && data.items.length > 0) {
        // Get all lens variants to check stock and calculate prices
        const lensVariantIds = data.items.map(item => item.lensVariantId).filter(Boolean);
        
        if (lensVariantIds.length > 0) {
          const lensVariants = await prisma.lensVariant.findMany({
            where: { id: { in: lensVariantIds } }
          });

          // Map variants for easy lookup
          const variantMap = new Map(lensVariants.map(v => [v.id, v]));

          // Calculate final prices and check stock
          const itemsWithPrices = await Promise.all(data.items.map(async item => {
            if (!item.lensVariantId) return null;
            
            const variant = variantMap.get(item.lensVariantId);
            if (!variant) {
              throw new APIError(400, `Invalid lens variant ID: ${item.lensVariantId}`, 'INVALID_VARIANT');
            }

            // Check stock for non-Rx items
            if (!variant.isRx && variant.stock < item.quantity) {
              throw new APIError(
                400,
                `Insufficient stock for ${variant.name}`,
                'INSUFFICIENT_STOCK',
                { available: variant.stock, requested: item.quantity }
              );
            }

            return {
              lensVariantId: item.lensVariantId,
              quantity: item.quantity,
              price: variant.price,
              discount: item.discount
            };
          }));

          const validItems = itemsWithPrices.filter(Boolean);

          // Determine initial status based on Rx requirements
          const hasRxItems = lensVariants.some(v => v.isRx);
          createData.status = hasRxItems ? 'CONFIRMED' : 'IN_PRODUCTION';

          // Create sale order with items
          createData.items = {
            create: validItems
          };
        }
      }

      // Create sale order
      const saleOrder = await prisma.saleOrder.create({
        data: createData,
        include: {
          customer: true,
          items: {
            include: {
              lensVariant: true
            }
          }
        }
      });

      // Calculate total amount
      const totalAmount = saleOrder.lensPrice + saleOrder.coatingPrice + saleOrder.fittingPrice + saleOrder.tintingPrice;
      const finalAmount = totalAmount * (1 - saleOrder.discount / 100);

      res.status(201).json({
        status: 'success',
        data: {
          ...saleOrder,
          totalAmount: finalAmount
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get all sale orders with optional filters
  async list(req, res, next) {
    try {
      const querySchema = z.object({
        status: z.enum(['DRAFT', 'CONFIRMED', 'IN_PRODUCTION', 'READY_FOR_DISPATCH', 'DELIVERED']).optional(),
        customerId: z.string().transform(val => parseInt(val)).optional(),
        page: z.string().transform(val => parseInt(val)).default('1'),
        limit: z.string().transform(val => parseInt(val)).default('10')
      });

      const { status, customerId, page, limit } = querySchema.parse(req.query);

      const where = {};
      if (status) where.status = status;
      if (customerId) where.customerId = customerId;

      const skip = (page - 1) * limit;

      const [saleOrders, total] = await Promise.all([
        prisma.saleOrder.findMany({
          where,
          include: {
            customer: true,
            items: {
              include: {
                lensVariant: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          skip,
          take: limit
        }),
        prisma.saleOrder.count({ where })
      ]);

      // Calculate total amount for each sale order
      const saleOrdersWithTotals = saleOrders.map(order => ({
        ...order,
        totalAmount: order.items.reduce((sum, item) => {
          const discountedPrice = item.price * (1 - item.discount / 100);
          return sum + (discountedPrice * item.quantity);
        }, 0)
      }));

      return res.json({
        success: true,
        data: saleOrdersWithTotals,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get sale order by ID
  async getById(req, res, next) {
    try {
      const { id } = req.params;

      const saleOrder = await prisma.saleOrder.findUnique({
        where: { id },
        include: {
          customer: true,
          items: {
            include: {
              lensVariant: {
                include: {
                  lensType: true
                }
              }
            }
          },
          invoice: true,
          dispatch: true
        }
      });

      if (!saleOrder) {
        throw new APIError(404, 'Sale order not found', 'SALE_ORDER_NOT_FOUND');
      }

      // Calculate total amount from new pricing fields
      const lensPrice = saleOrder.lensPrice || 0;
      const coatingPrice = saleOrder.coatingPrice || 0;
      const fittingPrice = saleOrder.fittingPrice || 0;
      const tintingPrice = saleOrder.tintingPrice || 0;
      const discount = saleOrder.discount || 0;

      const totalAmount = lensPrice + coatingPrice + fittingPrice + tintingPrice;
      const finalAmount = totalAmount * (1 - discount / 100);

      // Fallback to legacy item calculation if new pricing fields are not available
      const legacyTotalAmount = saleOrder.items.reduce((sum, item) => {
        const discountedPrice = item.price * (1 - item.discount / 100);
        return sum + (discountedPrice * item.quantity);
      }, 0);

      return res.json({
        status: 'success',
        data: {
          ...saleOrder,
          totalAmount: finalAmount || legacyTotalAmount
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Update an existing sale order
  async update(req, res, next) {
    try {
      const { id } = req.params;
      
      // Check if order exists
      const existingOrder = await prisma.saleOrder.findUnique({
        where: { id },
        include: { items: true }
      });

      if (!existingOrder) {
        throw new APIError(404, 'Sale order not found', 'ORDER_NOT_FOUND');
      }

      // Validate input
      const data = updateSaleOrderSchema.parse(req.body);

      // Validate customer exists if provided
      if (data.customerId) {
        const customer = await prisma.customer.findUnique({
          where: { id: data.customerId }
        });

        if (!customer) {
          throw new APIError(404, 'Customer not found', 'CUSTOMER_NOT_FOUND');
        }
      }

      // Prepare update data
      const updateData = {};

      // Basic order information
      if (data.customerId !== undefined) updateData.customerId = data.customerId;
      if (data.customerRefNo !== undefined) updateData.customerRefNo = data.customerRefNo;
      if (data.orderDate !== undefined) updateData.orderDate = data.orderDate ? new Date(data.orderDate) : null;
      if (data.type !== undefined) updateData.type = data.type;
      if (data.deliverySchedule !== undefined) updateData.deliverySchedule = data.deliverySchedule ? new Date(data.deliverySchedule) : null;
      if (data.remark !== undefined) updateData.remark = data.remark;
      if (data.itemRefNo !== undefined) updateData.itemRefNo = data.itemRefNo;
      if (data.freeLens !== undefined) updateData.freeLens = data.freeLens;
      
      // Lens details
      if (data.lensName !== undefined) updateData.lensName = data.lensName;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.lensType !== undefined) updateData.lensType = data.lensType;
      if (data.dia !== undefined) updateData.dia = data.dia;
      if (data.fittingType !== undefined) updateData.fittingType = data.fittingType;
      if (data.coatingType !== undefined) updateData.coatingType = data.coatingType;
      if (data.coatingName !== undefined) updateData.coatingName = data.coatingName;
      if (data.tintingName !== undefined) updateData.tintingName = data.tintingName;
      
      // Eye selection
      if (data.rightEye !== undefined) updateData.rightEye = data.rightEye;
      if (data.leftEye !== undefined) updateData.leftEye = data.leftEye;
      
      // Right eye specifications
      if (data.rightSpherical !== undefined) updateData.rightSpherical = data.rightSpherical;
      if (data.rightCylindrical !== undefined) updateData.rightCylindrical = data.rightCylindrical;
      if (data.rightAxis !== undefined) updateData.rightAxis = data.rightAxis;
      if (data.rightAdd !== undefined) updateData.rightAdd = data.rightAdd;
      if (data.rightDia !== undefined) updateData.rightDia = data.rightDia;
      if (data.rightBase !== undefined) updateData.rightBase = data.rightBase;
      if (data.rightBaseSize !== undefined) updateData.rightBaseSize = data.rightBaseSize;
      if (data.rightBled !== undefined) updateData.rightBled = data.rightBled;
      
      // Left eye specifications
      if (data.leftSpherical !== undefined) updateData.leftSpherical = data.leftSpherical;
      if (data.leftCylindrical !== undefined) updateData.leftCylindrical = data.leftCylindrical;
      if (data.leftAxis !== undefined) updateData.leftAxis = data.leftAxis;
      if (data.leftAdd !== undefined) updateData.leftAdd = data.leftAdd;
      if (data.leftDia !== undefined) updateData.leftDia = data.leftDia;
      if (data.leftBase !== undefined) updateData.leftBase = data.leftBase;
      if (data.leftBaseSize !== undefined) updateData.leftBaseSize = data.leftBaseSize;
      if (data.leftBled !== undefined) updateData.leftBled = data.leftBled;
      
      // Dispatch information
      if (data.dispatchStatus !== undefined) updateData.dispatchStatus = data.dispatchStatus;
      if (data.assignedPerson !== undefined) updateData.assignedPerson = data.assignedPerson;
      if (data.dispatchId !== undefined) updateData.dispatchId = data.dispatchId;
      if (data.estimatedDate !== undefined) updateData.estimatedDate = data.estimatedDate ? new Date(data.estimatedDate) : null;
      if (data.estimatedTime !== undefined) updateData.estimatedTime = data.estimatedTime;
      if (data.actualDate !== undefined) updateData.actualDate = data.actualDate ? new Date(data.actualDate) : null;
      if (data.actualTime !== undefined) updateData.actualTime = data.actualTime;
      if (data.dispatchNotes !== undefined) updateData.dispatchNotes = data.dispatchNotes;
      
      // Billing information
      if (data.lensPrice !== undefined) updateData.lensPrice = data.lensPrice;
      if (data.coatingPrice !== undefined) updateData.coatingPrice = data.coatingPrice;
      if (data.fittingPrice !== undefined) updateData.fittingPrice = data.fittingPrice;
      if (data.tintingPrice !== undefined) updateData.tintingPrice = data.tintingPrice;
      if (data.discount !== undefined) updateData.discount = data.discount;
      
      // Status update
      if (data.status !== undefined) updateData.status = data.status;

      // Handle legacy items update if provided
      if (data.items) {
        // Get lens variants for validation
        const lensVariantIds = data.items.map(item => item.lensVariantId).filter(Boolean);
        
        if (lensVariantIds.length > 0) {
          const lensVariants = await prisma.lensVariant.findMany({
            where: { id: { in: lensVariantIds } }
          });

          const variantMap = new Map(lensVariants.map(v => [v.id, v]));

          // Validate items and prepare for update
          const itemsWithPrices = await Promise.all(data.items.map(async item => {
            if (!item.lensVariantId) return null;
            
            const variant = variantMap.get(item.lensVariantId);
            if (!variant) {
              throw new APIError(400, `Invalid lens variant ID: ${item.lensVariantId}`, 'INVALID_VARIANT');
            }

            return {
              lensVariantId: item.lensVariantId,
              quantity: item.quantity,
              price: variant.price,
              discount: item.discount
            };
          }));

          const validItems = itemsWithPrices.filter(Boolean);

          // Delete existing items and create new ones
          updateData.items = {
            deleteMany: {},
            create: validItems
          };
        }
      }

      // Update sale order
      const updatedOrder = await prisma.saleOrder.update({
        where: { id },
        data: updateData,
        include: {
          customer: true,
          items: {
            include: {
              lensVariant: true
            }
          }
        }
      });

      // Calculate total amount
      const totalAmount = updatedOrder.lensPrice + updatedOrder.coatingPrice + updatedOrder.fittingPrice + updatedOrder.tintingPrice;
      const finalAmount = totalAmount * (1 - updatedOrder.discount / 100);

      res.json({
        status: 'success',
        data: {
          ...updatedOrder,
          totalAmount: finalAmount
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Update sale order status
  async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const saleOrderId = parseInt(id);

      if (isNaN(saleOrderId)) {
        throw new APIError(400, 'Invalid sale order ID', 'INVALID_ID');
      }

      // Validate status
      const validStatuses = ['DRAFT', 'CONFIRMED', 'IN_PRODUCTION', 'READY_FOR_DISPATCH', 'DELIVERED'];
      if (!validStatuses.includes(status)) {
        throw new APIError(400, 'Invalid status', 'INVALID_STATUS');
      }

      const existingSaleOrder = await prisma.saleOrder.findUnique({
        where: { id: saleOrderId },
        include: {
          items: {
            include: {
              lensVariant: true
            }
          }
        }
      });

      if (!existingSaleOrder) {
        throw new APIError(404, 'Sale order not found', 'SALE_ORDER_NOT_FOUND');
      }

      const saleOrder = await prisma.saleOrder.update({
        where: { id: saleOrderId },
        data: { status },
        include: {
          customer: true,
          items: {
            include: {
              lensVariant: true
            }
          }
        }
      });

      // If status is changed to IN_PRODUCTION, deduct from inventory for non-Rx items
      if (status === 'IN_PRODUCTION' && existingSaleOrder.status !== 'IN_PRODUCTION') {
        await Promise.all(
          saleOrder.items
            .filter(item => !item.lensVariant.isRx)
            .map(item =>
              prisma.lensVariant.update({
                where: { id: item.lensVariantId },
                data: {
                  stock: {
                    decrement: item.quantity
                  }
                }
              })
            )
        );
      }

      return res.json({
        success: true,
        data: saleOrder
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete sale order
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const saleOrderId = parseInt(id);

      if (isNaN(saleOrderId)) {
        throw new APIError(400, 'Invalid sale order ID', 'INVALID_ID');
      }

      const existingSaleOrder = await prisma.saleOrder.findUnique({
        where: { id: saleOrderId },
        include: {
          items: true,
          invoice: true,
          purchaseOrders: true
        }
      });

      if (!existingSaleOrder) {
        throw new APIError(404, 'Sale order not found', 'SALE_ORDER_NOT_FOUND');
      }

      // Check if sale order can be deleted
      if (existingSaleOrder.invoiceId) {
        throw new APIError(400, 'Cannot delete sale order that has an invoice', 'HAS_INVOICE');
      }

      if (existingSaleOrder.purchaseOrders.length > 0) {
        throw new APIError(400, 'Cannot delete sale order that has purchase orders', 'HAS_PURCHASE_ORDERS');
      }

      if (['READY_FOR_DISPATCH', 'DELIVERED'].includes(existingSaleOrder.status)) {
        throw new APIError(400, 'Cannot delete completed sale order', 'INVALID_STATUS_FOR_DELETE');
      }

      // Delete sale order (items will be deleted automatically due to cascade)
      await prisma.$transaction(async (tx) => {
        // Delete sale order items first
        await tx.saleOrderItem.deleteMany({
          where: { saleOrderId }
        });

        // Delete sale order
        await tx.saleOrder.delete({
          where: { id: saleOrderId }
        });

        // If the order was in production, restore stock for non-Rx items
        if (existingSaleOrder.status === 'IN_PRODUCTION') {
          const itemsToRestore = existingSaleOrder.items.filter(item => 
            !item.lensVariant?.isRx
          );

          await Promise.all(
            itemsToRestore.map(item =>
              tx.lensVariant.update({
                where: { id: item.lensVariantId },
                data: {
                  stock: {
                    increment: item.quantity
                  }
                }
              })
            )
          );
        }
      });

      return res.json({
        success: true,
        message: 'Sale order deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Get sale order summary/statistics
  async getSummary(req, res, next) {
    try {
      const querySchema = z.object({
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional()
      });

      const { startDate, endDate } = querySchema.parse(req.query);

      const where = {};
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      const [
        totalOrders,
        ordersByStatus,
        totalRevenue
      ] = await Promise.all([
        prisma.saleOrder.count({ where }),
        prisma.saleOrder.groupBy({
          by: ['status'],
          where,
          _count: {
            id: true
          }
        }),
        prisma.saleOrder.findMany({
          where,
          include: {
            items: true
          }
        }).then(orders => {
          return orders.reduce((total, order) => {
            const orderTotal = order.items.reduce((sum, item) => {
              const discountedPrice = item.price * (1 - item.discount / 100);
              return sum + (discountedPrice * item.quantity);
            }, 0);
            return total + orderTotal;
          }, 0);
        })
      ]);

      const statusSummary = ordersByStatus.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      }, {});

      return res.json({
        success: true,
        data: {
          totalOrders,
          totalRevenue,
          ordersByStatus: statusSummary
        }
      });
    } catch (error) {
      next(error);
    }
  }
}


