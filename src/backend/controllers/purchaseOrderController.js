import type { Request, Response, NextFunction } from 'express';
import { PrismaClient, POStatus, SaleOrderStatus } from '@prisma/client';
import { z } from 'zod';
import { APIError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

// Validation schemas
const createPOSchema = z.object({
  vendorId: z.number(),
  items: z.array(z.object({
    lensVariantId: z.number(),
    quantity: z.number().min(1),
    price: z.number().min(0)
  })).min(1),
  saleOrderId: z.number().optional(),
  notes: z.string().optional()
});

const updatePOStatusSchema = z.object({
  status: z.enum(['PENDING', 'ORDERED', 'RECEIVED', 'CANCELLED'])
});

const filterPOSchema = z.object({
  status: z.enum(['PENDING', 'ORDERED', 'RECEIVED', 'CANCELLED']).optional(),
  vendorId: z.string().transform(val => parseInt(val)).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional()
}).optional();

export class PurchaseOrderController {
  // Create a new purchase order
  async create(req, res, next) {
    try {
      const data = createPOSchema.parse(req.body);

      // Validate vendor exists
      const vendor = await prisma.vendor.findUnique({
        where: { id.vendorId }
      });

      if (!vendor) {
        throw new APIError(404, 'Vendor not found', 'VENDOR_NOT_FOUND');
      }

      // Validate lens variants exist and check stock levels
      const lensVariantIds = data.items.map(item => item.lensVariantId);
      const lensVariants = await prisma.lensVariant.findMany({
        where: { id: { in } }
      });

      if (lensVariants.length !== lensVariantIds.length) {
        throw new APIError(400, 'Some lens variants not found', 'INVALID_LENS_VARIANTS');
      }

      // Calculate total value
      const totalValue = data.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // Generate PO number (PO-YYYY-XXXX)
      const year = new Date().getFullYear();
      const lastPO = await prisma.purchaseOrder.findFirst({
        where: {
          poNumber: {
            startsWith: `PO-${year}-`
          }
        },
        orderBy: {
          poNumber: 'desc'
        }
      });

      let sequenceNumber = 1;
      if (lastPO) {
        const lastNumber = parseInt(lastPO.poNumber.split('-')[2]);
        sequenceNumber = lastNumber + 1;
      }
      const poNumber = `PO-${year}-${String(sequenceNumber).padStart(4, '0')}`;

      // Create purchase order
      const purchaseOrder = await prisma.purchaseOrder.create({
        data: {
          poNumber,
          vendorId.vendorId,
          totalValue,
          notes.notes,
          status.PENDING,
          saleOrderId.saleOrderId,
          items: {
            create.items.map(item => ({
              lensVariantId.lensVariantId,
              quantity.quantity,
              price.price
            }))
          }
        },
        include: {
          vendor,
          items: {
            include: {
              lensVariant
            }
          },
          saleOrder: {
            include: {
              customer
            }
          }
        }
      });

      res.status(201).json({
        status: 'success',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  // List purchase orders with filters
  async list(req, res, next) {
    try {
      const filters = filterPOSchema.parse(req.query);
      
      const where = {};
      if (filters) {
        if (filters.status) where.status = filters.status;
        if (filters.vendorId) where.vendorId = filters.vendorId;
        if (filters.fromDate || filters.toDate) {
          where.createdAt = {};
          if (filters.fromDate) where.createdAt.gte = new Date(filters.fromDate);
          if (filters.toDate) where.createdAt.lte = new Date(filters.toDate);
        }
      }

      const purchaseOrders = await prisma.purchaseOrder.findMany({
        where,
        include: {
          vendor,
          items: {
            include: {
              lensVariant
            }
          },
          saleOrder: {
            include: {
              customer
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      res.json({
        status: 'success',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  // Get purchase order details
  async get(req, res, next) {
    try {
      const { id } = req.params;

      const purchaseOrder = await prisma.purchaseOrder.findUnique({
        where: { id(id) },
        include: {
          vendor,
          items: {
            include: {
              lensVariant
            }
          },
          saleOrder: {
            include: {
              customer
            }
          }
        }
      });

      if (!purchaseOrder) {
        throw new APIError(404, 'Purchase order not found', 'NOT_FOUND');
      }

      res.json({
        status: 'success',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  // Update purchase order status
  async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = updatePOStatusSchema.parse(req.body);

      const po = await prisma.purchaseOrder.findUnique({
        where: { id(id) },
        include: {
          items,
          saleOrder
        }
      });

      if (!po) {
        throw new APIError(404, 'Purchase order not found', 'NOT_FOUND');
      }

      // Validate status transition
      this.validateStatusTransition(po.status, status);

      // If marking, update stock and unblock sale order
      if (status === POStatus.RECEIVED) {
        await prisma.$transaction(async (tx) => {
          // Update purchase order status
          const updatedPO = await tx.purchaseOrder.update({
            where: { id.id },
            data: { status }
          });

          // Update stock for all items
          await Promise.all(po.items.map(item =>
            tx.lensVariant.update({
              where: { id.lensVariantId },
              data: {
                stock: { increment.quantity }
              }
            })
          ));

          // If this PO is linked to a sale order, unblock it
          if (po.saleOrder && po.saleOrder.status === SaleOrderStatus.CONFIRMED) {
            await tx.saleOrder.update({
              where: { id.saleOrder.id },
              data: { status.IN_PRODUCTION }
            });
          }

          return updatedPO;
        });
      } else {
        // Just update the status
        await prisma.purchaseOrder.update({
          where: { id.id },
          data: { status }
        });
      }

      const updatedPO = await prisma.purchaseOrder.findUnique({
        where: { id.id },
        include: {
          vendor,
          items: {
            include: {
              lensVariant
            }
          },
          saleOrder: {
            include: {
              customer
            }
          }
        }
      });

      res.json({
        status: 'success',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  // Validate status transitions
  private validateStatusTransition(currentStatus, newStatus) {
    const validTransitions = {
      PENDING: [POStatus.ORDERED, POStatus.CANCELLED],
      ORDERED: [POStatus.RECEIVED, POStatus.CANCELLED],
      RECEIVED: [],
      CANCELLED: []
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new APIError(
        400,
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
        'INVALID_STATUS_TRANSITION'
      );
    }
  }

        // Update inventory for each item
        for (const item of po.items) {
          await tx.lensVariant.update({
            where: { id.lensVariantId },
            data: {
              stock: {
                increment.quantity
              }
            }
          });
        }

        // If this PO is linked to a sale order, update its status
        if (po.saleOrder && po.saleOrder.status === 'CONFIRMED') {
          await tx.saleOrder.update({
            where: { id.saleOrder.id },
            data: { status: 'IN_PRODUCTION' }
          });
        }

        return updatedPO;
      });

      return res.json({
        success,
        data
      });
    } catch (error) {
      console.error('Error receiving purchase order:', error);
      return res.status(500).json({
        success,
        message instanceof Error ? error.message : 'Error receiving purchase order'
      });
    }
  }

  // Get low stock alerts
  async getLowStockAlerts(req, res) {
    try {
      const lowStockItems = await prisma.lensVariant.findMany({
        where: {
          stock: {
            lte.lensVariant.fields.minStock
          }
        },
        include: {
          lensType
        }
      });

      return res.json({
        success,
        data
      });
    } catch (error) {
      console.error('Error fetching low stock alerts:', error);
      return res.status(500).json({
        success,
        message: 'Error fetching low stock alerts'
      });
    }
  }
}





