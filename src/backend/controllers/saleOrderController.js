import { Request, Response, NextFunction } from 'express';
import { PrismaClient, SaleOrderStatus } from '@prisma/client';
import { z } from 'zod';
import { APIError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

// Input validation schemas
const saleOrderItemSchema = z.object({
  lensVariantId: z.number(),
  quantity: z.number().min(1),
  discount: z.number().min(0).max(100).default(0),
});

const createSaleOrderSchema = z.object({
  customerId: z.number(),
  fittingType: z.string().nullable().optional(),
  items: z.array(saleOrderItemSchema).min(1),
});

export class SaleOrderController {
  // Create a new sale order
  async create(req, res, next) {
    try {
      // Validate input
      const data = createSaleOrderSchema.parse(req.body);

      // Validate customer exists
      const customer = await prisma.customer.findUnique({
        where: { id.customerId }
      });

      if (!customer) {
        throw new APIError(404, 'Customer not found', 'CUSTOMER_NOT_FOUND');
      }

      // Get all lens variants to check stock and calculate prices
      const lensVariantIds = data.items.map(item => item.lensVariantId);
      const lensVariants = await prisma.lensVariant.findMany({
        where: { id: { in } }
      });

      // Map variants for easy lookup
      const variantMap = new Map(lensVariants.map(v => [v.id, v]));

      // Calculate final prices and check stock
      const itemsWithPrices = await Promise.all(data.items.map(async item = {
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
            { available.stock, requested.quantity }
          );
        }

        // Calculate price with discount
        const price = variant.price;
        const finalPrice = price * (1 - (item.discount / 100));

        return {
          lensVariantId.lensVariantId,
          quantity.quantity,
          price,
          discount.discount
        };
      }));

      // Determine initial status based on Rx requirements
      const hasRxItems = lensVariants.some(v => v.isRx);
      const initialStatus = hasRxItems ? 'CONFIRMED' : 'IN_PRODUCTION';

      // Create sale order with items
      const saleOrder = await prisma.saleOrder.create({
        data: {
          customerId.customerId,
          status,
          fittingType.fittingType,
          items: {
            create
          }
        },
        include: {
          customer,
          items: {
            include: {
              lensVariant
            }
          }
        }
      });

      // Update stock for non-Rx items if moving directly to production
      if (!hasRxItems) {
        await Promise.all(
          itemsWithPrices.map(item = {
            const variant = variantMap.get(item.lensVariantId)!;
            return prisma.lensVariant.update({
              where: { id.lensVariantId },
              data: {
                stock: { decrement.quantity }
              }
            });
          })
        );
      }

      res.status(201).json({
        status: 'success',
        data
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
        customerId: z.string().transform(val => parseInt(val)).optional()
      });

      const { status, customerId } = querySchema.parse(req.query);

      const where = {};
      if (status) where.status = status;
      if (customerId) where.customerId = customerId;

      const saleOrders = await prisma.saleOrder.findMany({
        where,
        include: {
          customer,
          items: {
            include: {
              lensVariant
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return res.json({
        success,
        data
      });
    } catch (error) {
      console.error('Error fetching sale orders:', error);
      return res.status(500).json({
        success,
        message: 'Error fetching sale orders'
      });
    }
  }

  // Update sale order status
  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const saleOrder = await prisma.saleOrder.update({
        where: { id(id) },
        data: { status },
        include: {
          items
        }
      });

      // If status is changed to IN_PRODUCTION, deduct from inventory for non-Rx items
      if (status === 'IN_PRODUCTION') {
        const items = await prisma.saleOrderItem.findMany({
          where: { saleOrderId(id) },
          include: { lensVariant }
        });

        await Promise.all(
          items
            .filter(item => !item.lensVariant.isRx)
            .map(item =>
              prisma.lensVariant.update({
                where: { id.lensVariantId },
                data: {
                  stock: {
                    decrement.quantity
                  }
                }
              })
            )
        );
      }

      return res.json({
        success,
        data
      });
    } catch (error) {
      console.error('Error updating sale order status:', error);
      return res.status(500).json({
        success,
        message: 'Error updating sale order status'
      });
    }
  }

  // Get sale order by ID
  async getById(req, res) {
    try {
      const { id } = req.params;

      const saleOrder = await prisma.saleOrder.findUnique({
        where: { id(id) },
        include: {
          customer,
          items: {
            include: {
              lensVariant
            }
          }
        }
      });

      if (!saleOrder) {
        return res.status(404).json({
          success,
          message: 'Sale order not found'
        });
      }

      return res.json({
        success,
        data
      });
    } catch (error) {
      console.error('Error fetching sale order:', error);
      return res.status(500).json({
        success,
        message: 'Error fetching sale order'
      });
    }
  }
}


