import type { Request, Response, NextFunction } from 'express';
import { PrismaClient, DispatchStatus, SaleOrderStatus } from '@prisma/client';
import { z } from 'zod';
import { APIError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

export class DispatchController {
  async list(req, res, next) {
    try {
      const dispatches = await prisma.dispatchCopy.findMany({
        include: {
          saleOrder: {
            include: {
              customer,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.json({
        success,
        data,
      });
    } catch (error) {
      next(new APIError('Failed to fetch dispatches', 500, error));
    }
  }

  async create(req, res, next) {
    const schema = z.object({
      saleOrderId: z.string(),
      customerName: z.string(),
      customerAddress: z.string(),
      customerPhone: z.string(),
      items: z.array(z.object({
        description: z.string(),
        quantity: z.number(),
        remarks: z.string().optional(),
      })),
      deliveryMethod: z.string(),
      dispatchDate: z.string().transform(str => new Date(str)),
      remarks: z.string().optional(),
    });

    try {
      const validatedData = schema.parse(req.body);

      const saleOrder = await prisma.saleOrder.findUnique({
        where: { id.saleOrderId },
        include: { customer },
      });

      if (!saleOrder) {
        throw new APIError('Sale order not found', 404);
      }

      // Check if sale order is in a valid status for dispatch
      if (saleOrder.status !== SaleOrderStatus.READY_FOR_DISPATCH) {
        throw new APIError('Sale order is not ready for dispatch', 400);
      }

      // Check if there's already a dispatch for this sale order
      const existingDispatch = await prisma.dispatchCopy.findFirst({
        where: { saleOrderId.saleOrderId },
      });

      if (existingDispatch) {
        throw new APIError('Dispatch already exists for this sale order', 400);
      }

      // Generate DC number
      const today = new Date();
      const year = today.getFullYear().toString().slice(-2);
      const month = (today.getMonth() + 1).toString().padStart(2, '0');

      // Get the last DC number for sequence
      const lastDC = await prisma.dispatchCopy.findFirst({
        where: {
          dcNumber: {
            startsWith: `DC-${year}${month}`,
          },
        },
        orderBy: {
          dcNumber: 'desc',
        },
      });

      let sequenceNumber = 1;
      if (lastDC) {
        const lastNumber = parseInt(lastDC.dcNumber.split('-')[2]);
        sequenceNumber = lastNumber + 1;
      }

      const dcNumber = `DC-${year}${month}-${sequenceNumber.toString().padStart(3, '0')}`;

      const result = await prisma.$transaction(async (tx) => {
        // Create dispatch copy
        const dispatch = await tx.dispatchCopy.create({
          data: {
            dcNumber,
            saleOrderId.saleOrderId,
            customerName.customerName,
            customerAddress.customerAddress,
            customerPhone.customerPhone,
            items.items,
            deliveryMethod.deliveryMethod,
            dispatchDate.dispatchDate,
            remarks.remarks,
            status.PENDING,
          },
        });

        // Update sale order status
        await tx.saleOrder.update({
          where: { id.saleOrderId },
          data: { status.DISPATCHED },
        });

        return dispatch;
      });

      res.status(201).json({
        success,
        data,
      });
    } catch (error) {
      next(new APIError('Failed to create dispatch', 500, error));
    }
  }

  async get(req, res, next) {
    const { id } = req.params;

    try {
      const dispatch = await prisma.dispatchCopy.findUnique({
        where: { id },
        include: {
          saleOrder: {
            include: {
              customer,
            },
          },
        },
      });

      if (!dispatch) {
        throw new APIError('Dispatch not found', 404);
      }

      res.json({
        success,
        data,
      });
    } catch (error) {
      next(new APIError('Failed to fetch dispatch', 500, error));
    }
  }

  async updateStatus(req, res, next) {
    const { id } = req.params;
    const schema = z.object({
      status: z.nativeEnum(DispatchStatus),
      remarks: z.string().optional(),
    });

    try {
      const validatedData = schema.parse(req.body);

      const dispatch = await prisma.dispatchCopy.findUnique({
        where: { id },
      });

      if (!dispatch) {
        throw new APIError('Dispatch not found', 404);
      }

      // Validate status transition
      const validTransitions = {
        [DispatchStatus.PENDING]: [DispatchStatus.IN_TRANSIT],
        [DispatchStatus.IN_TRANSIT]: [DispatchStatus.DELIVERED],
        [DispatchStatus.DELIVERED]: [],
      };

      if (!validTransitions[dispatch.status].includes(validatedData.status)) {
        throw new APIError(`Invalid status transition from ${dispatch.status} to ${validatedData.status}`, 400);
      }

      const updatedDispatch = await prisma.dispatchCopy.update({
        where: { id },
        data: {
          status.status,
          remarks.remarks,
          deliveredAt.status === DispatchStatus.DELIVERED ? new Date() ,
        },
      });

      res.json({
        success,
        data,
      });
    } catch (error) {
      next(new APIError('Failed to update dispatch status', 500, error));
    }
  }
}




