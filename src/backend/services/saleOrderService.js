import prisma from '../config/prisma.js';
import { APIError } from '../middleware/errorHandler.js';
import { logCreate, logUpdate, logDelete } from '../utils/auditLogger.js';
import { 
  logDatabaseError, 
  logValidationError, 
  logNotFoundError,
  logBusinessError 
} from '../utils/errorLogger.js';
import saleOrderStatusService from './saleOrderStatusService.js';
import { isSoLocked, SALE_ORDER_STATUSES, INVENTORY_QUEUE_STATUSES } from '../constants/saleOrderStatus.js';
import { InventoryService } from './inventory.service.js';
import {
  createClaimPool,
  softAllocateOrder,
  filterMatchesByPool,
} from './softAllocationHelper.js';
const inventoryService = new InventoryService();

/** Generic string/number normalize (no null→0). Kept for non-optical specs (Axis/Dia). */
const normalizeSpecValue = (value) => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;

  const numeric = Number(text);
  if (!Number.isNaN(numeric)) {
    return Number.isInteger(numeric) ? String(numeric) : String(numeric);
  }

  return text.toUpperCase();
};

/** SPH/CYL/ADD FIFO match only: null / undefined / empty ≡ "0". */
const normalizeOpticalSpecValue = (value) => {
  const normalized = normalizeSpecValue(value);
  return normalized === null ? '0' : normalized;
};

const opticalSpecVariants = (value) => {
  const normalized = normalizeOpticalSpecValue(value);
  const variants = new Set([normalized]);

  if (value !== null && value !== undefined) {
    const text = String(value).trim();
    if (text) variants.add(text);
  }

  const numeric = Number(normalized);
  if (!Number.isNaN(numeric)) {
    variants.add(numeric.toFixed(1));
    variants.add(numeric.toFixed(2));
    if (numeric > 0) {
      variants.add(`+${numeric}`);
      variants.add(`+${numeric.toFixed(1)}`);
      variants.add(`+${numeric.toFixed(2)}`);
    }
  }
  return [...variants].filter((v) => v !== '');
};

const addSpecMatch = (where, field, value) => {
  const variants = opticalSpecVariants(value);
  if (variants.length === 0) return;

  const numeric = Number(normalizeOpticalSpecValue(value));
  const isZero = !Number.isNaN(numeric) && numeric === 0;

  // Effective 0 must also match SQL NULL on the inventory/PO column
  if (isZero) {
    if (!where.AND) where.AND = [];
    where.AND.push({
      OR: [
        { [field]: { in: variants } },
        { [field]: null },
      ],
    });
    return;
  }

  if (variants.length === 1) {
    where[field] = variants[0];
    return;
  }
  if (!where.AND) where.AND = [];
  where.AND.push({ OR: variants.map((variant) => ({ [field]: variant })) });
};

const categoryUsesAdd = (categoryName) => {
  const name = String(categoryName || '').toLowerCase();
  return name.includes('progressive') || name.includes('bifocal') || name.includes('bi-focal') || name.includes('bi focal');
};

/**
 * Sale Order Service
 * Handles business logic for sale order management with comprehensive audit logging
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
   * Ensure customer reference is globally unique (case-insensitive).
   * @deprecated Submit-time check replaced by checkCustomerRef (per-customer fail / cross-customer warning).
   */
  async assertUniqueCustomerRef(customerRefNo, excludeId = null) {
    const ref = customerRefNo?.trim();
    if (!ref) return;

    const existing = await prisma.saleOrder.findFirst({
      where: {
        deleteStatus: false,
        customerRefNo: { equals: ref, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true, orderNo: true },
    });

    if (existing) {
      throw new APIError(
        `Customer reference already used on order ${existing.orderNo}`,
        409,
        'DUPLICATE_CUSTOMER_REF',
        { existingOrderId: existing.id, orderNo: existing.orderNo }
      );
    }
  }

  /**
   * Check customer reference for async FE validation.
   * - pass: ref is unique (no other orders use it)
   * - fail: same customer already has an order with this ref
   * - warning: ref used by a different customer (submit still allowed)
   */
  async checkCustomerRef(customerRefNo, customerId = null, excludeId = null) {
    const ref = customerRefNo?.trim();
    if (!ref) {
      return { status: 'pass', message: 'Reference is unique' };
    }

    const parsedCustomerId = customerId ? parseInt(customerId, 10) : null;
    const excludeFilter = excludeId ? { id: { not: parseInt(excludeId, 10) } } : {};

    const matches = await prisma.saleOrder.findMany({
      where: {
        deleteStatus: false,
        customerRefNo: { equals: ref, mode: 'insensitive' },
        ...excludeFilter,
      },
      select: {
        id: true,
        orderNo: true,
        customerId: true,
        customer: { select: { id: true, name: true, code: true } },
        lensProduct: { select: { id: true, lens_name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (matches.length === 0) {
      return { status: 'pass', message: 'Reference is unique' };
    }

    if (parsedCustomerId) {
      const sameCustomerMatch = matches.find((m) => m.customerId === parsedCustomerId);
      if (sameCustomerMatch) {
        return {
          status: 'fail',
          message: 'Already same ref is used against this customer',
          existingOrderId: sameCustomerMatch.id,
          orderNo: sameCustomerMatch.orderNo,
        };
      }
    }

    return {
      status: 'warning',
      message: 'Reference is used by another customer',
      conflicts: matches.map((m) => ({
        orderId: m.id,
        orderNo: m.orderNo,
        customerId: m.customerId,
        customerName: m.customer?.name || m.customer?.code || 'Unknown',
        lensName: m.lensProduct?.lens_name || 'N/A',
      })),
    };
  }

  /**
   * Create a new sale order
   * @param {Object} orderData - Sale order data
   * @param {number} userId - User creating the order
   * @param {Object} req - Express request object (for audit logging)
   * @returns {Promise<Object>} Created sale order
   */
  async createSaleOrder(orderData, userId, req = null) {
    try {
      // Validate customer exists
      const customer = await prisma.customer.findUnique({
        where: { id: orderData.customerId, delete_status: false }
      });

      if (!customer) {
        const error = new APIError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
        await logNotFoundError({
          error,
          userId,
          req,
          resource: 'Customer',
          resourceId: orderData.customerId,
          metadata: { operation: 'createSaleOrder' }
        });
        throw error;
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

      if (orderData.material_id) {
        const material = await prisma.lensMaterialMaster.findUnique({
          where: { id: orderData.material_id, deleteStatus: false }
        });
        if (!material) {
          throw new APIError('Lens material not found', 404, 'MATERIAL_NOT_FOUND');
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
        if (lensType.name === 'STOCK' || lensType.name === 'RX') {
          orderData.procurementType = lensType.name;
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

      // Validate and cross-verify offer if provided
      if (orderData.offer_id) {
        const offer = await prisma.lensOffers.findUnique({
          where: { id: orderData.offer_id }
        });
        if (!offer || !offer.activeStatus) {
          throw new APIError('Selected offer not found or is inactive', 400, 'OFFER_INVALID');
        }
        const now = new Date();
        if (offer.startDate && new Date(offer.startDate) > now) {
          throw new APIError('Selected offer has not started yet', 400, 'OFFER_NOT_STARTED');
        }
        if (offer.endDate && new Date(offer.endDate) < now) {
          throw new APIError('Selected offer has expired', 400, 'OFFER_EXPIRED');
        }
        // Cannot apply an offer to a zero-total order
        const orderTotal = (orderData.lensPrice || 0) + (orderData.fittingPrice || 0) +
          (orderData.tintingPrice || 0) + (orderData.rightEyeExtra || 0) + (orderData.leftEyeExtra || 0);
        if (orderTotal === 0) {
          throw new APIError('Cannot apply an offer when the order total is ₹0', 400, 'OFFER_ZERO_TOTAL');
        }
        // For PERCENTAGE offers, the category discount should be zeroed out (offer replaced it)
        if (offer.offerType === 'PERCENTAGE' && orderData.discount && orderData.discount !== 0) {
          throw new APIError(
            'Discount field must be 0 when a PERCENTAGE offer is applied',
            400,
            'OFFER_DISCOUNT_CONFLICT'
          );
        }
      }

      // Submit-time duplicate ref check handled on FE via checkCustomerRef API
      // await this.assertUniqueCustomerRef(orderData.customerRefNo);

      // Generate order number
      const orderNo = await this.generateOrderNumber();

      // ── Credit limit pre-check ────────────────────────────────────────────────
      {
        const lensP = orderData.lensPrice || 0;
        const lensD = lensP * ((orderData.discount || 0) / 100);
        const prospectiveTotal =
          lensP - lensD +
          (orderData.rightEyeExtra || 0) +
          (orderData.leftEyeExtra || 0) +
          (orderData.fittingPrice || 0) +
          (orderData.tintingPrice || 0) +
          (Array.isArray(orderData.additionalPrice)
            ? orderData.additionalPrice.reduce((s, x) => s + (parseFloat(x.value) || 0), 0)
            : 0);

        const custCredit = await prisma.customer.findUnique({
          where: { id: orderData.customerId },
          select: { credit_limit: true, reserved_amount: true, outstanding_credit: true },
        });

        if (custCredit?.credit_limit && custCredit.credit_limit > 0) {
          const currentExposure = (custCredit.reserved_amount || 0) + (custCredit.outstanding_credit || 0);
          if (currentExposure + prospectiveTotal >= custCredit.credit_limit) {
            throw new APIError(
              `Credit limit exceeded. Limit: \u20b9${custCredit.credit_limit}, Current exposure: \u20b9${currentExposure.toFixed(2)}, New SO amount: \u20b9${prospectiveTotal.toFixed(2)}`,
              400,
              'CREDIT_LIMIT_EXCEEDED'
            );
          }
        }
      }
      // ─────────────────────────────────────────────────────────────────────────

      // Create the sale order
      const saleOrder = await prisma.$transaction(async (tx) => {
        const created = await tx.saleOrder.create({
        data: {
          orderNo,
          customerId: orderData.customerId,
          status: orderData.status || 'DRAFT',
          procurementType: orderData.procurementType || 'RX',
          
          // Basic order information
          customerRefNo: orderData.customerRefNo,
          orderDate: orderData.orderDate ? new Date(orderData.orderDate) : new Date(),
          type: orderData.type,
          deliverySchedule: orderData.deliverySchedule ? new Date(orderData.deliverySchedule) : null,
          remark: orderData.remark,
          itemRefNo: orderData.itemRefNo,
          freeLens: orderData.freeLens ?? false,
          urgentOrder: orderData.urgentOrder ?? false,
          freeFitting: orderData.freeFitting ?? false,
          
          // Lens details
          lens_id: orderData.lens_id,
          category_id: orderData.category_id,
          Type_id: orderData.Type_id,
          dia_id: orderData.dia_id,
          fitting_id: orderData.fitting_id,
          material_id: orderData.material_id,
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
          
          // Left eye specifications
          leftSpherical: orderData.leftSpherical,
          leftCylindrical: orderData.leftCylindrical,
          leftAxis: orderData.leftAxis,
          leftAdd: orderData.leftAdd,
          leftDia: orderData.leftDia,
          
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
          rightEyeExtra: orderData.rightEyeExtra ?? 0,
          leftEyeExtra: orderData.leftEyeExtra ?? 0,
          fittingPrice: orderData.fittingPrice ?? 0,
          tintingPrice: orderData.tintingPrice ?? 0,
          discount: orderData.discount ?? 0,
          additionalPrice: orderData.additionalPrice || null,

          // Offer
          offer_id: orderData.offer_id || null,
          
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
          },
          offer: {
            select: {
              id: true,
              offerName: true,
              offerType: true,
              discountValue: true,
              discountPercentage: true
            }
          }
        }
      });

        // Compute SO final total (lens discount only)
        const lensPrice = orderData.lensPrice || 0;
        const lensDiscount = lensPrice * ((orderData.discount || 0) / 100);
        const soFinalTotal =
          lensPrice - lensDiscount +
          (orderData.rightEyeExtra || 0) +
          (orderData.leftEyeExtra || 0) +
          (orderData.fittingPrice || 0) +
          (orderData.tintingPrice || 0) +
          (Array.isArray(orderData.additionalPrice)
            ? orderData.additionalPrice.reduce((s, x) => s + (parseFloat(x.value) || 0), 0)
            : 0);

        // Increment customer reserved_amount by SO total
        await tx.customer.update({
          where: { id: orderData.customerId },
          data: { reserved_amount: { increment: soFinalTotal } },
        });

        await saleOrderStatusService.logCreation(tx, created.id, userId);
        return created;
      });

      // ✅ LOG THE CREATE OPERATION
      await logCreate({
        userId,
        entity: 'SaleOrder',
        entityId: saleOrder.id,
        newValues: saleOrder,
        req,
        metadata: {
          orderNo: saleOrder.orderNo,
          customerId: saleOrder.customerId,
          customerName: saleOrder.customer.name,
          status: saleOrder.status,
          operation: 'Sale order created successfully'
        }
      });

      return saleOrder;
    } catch (error) {
      // ✅ LOG THE ERROR
      if (!(error instanceof APIError)) {
        await logDatabaseError({
          error,
          userId,
          req,
          metadata: {
            operation: 'createSaleOrder',
            input: orderData
          }
        });
      }
      
      if (error instanceof APIError) throw error;
      console.error('Error creating sale order:', error);
      throw new APIError('Failed to create sale order', 500, 'CREATE_ORDER_ERROR');
    }
  }

  /**
   * Get all sale orders with pagination and filtering
   * @param {Object} queryParams - Query parameters
   * @param {Object} req - Express request object (for audit logging)
   * @param {number} userId - User requesting data (for audit logging)
   * @returns {Promise<Object>} Paginated sale orders
   */
  async getSaleOrders(queryParams, req = null, userId = null) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        status,
        statuses,
        customerId,
        search,
        startDate,
        endDate,
        dispatchStatus
      } = queryParams;

      const where = { deleteStatus: false };

      // Filter by multiple statuses (comma-separated) or single status
      if (statuses) {
        where.status = { in: statuses.split(',').map(s => s.trim()) };
      } else if (status) {
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

      // Build orderBy clause based on sortBy field
      let orderBy;
      
      // Handle nested relation sorting
      if (sortBy === 'customer') {
        orderBy = { customer: { name: sortOrder } };
      } else if (sortBy === 'customerName') {
        orderBy = { customer: { name: sortOrder } };
      } else {
        // For direct fields on SaleOrder
        orderBy = { [sortBy]: sortOrder };
      }

      const saleOrders = await prisma.saleOrder.findMany({
        where,
        skip: offset,
        take: parseInt(limit),
        orderBy: orderBy,
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
          lensType: {
            select: {
              id: true,
              name: true
            }
          },
          assignedPerson: {
            select: {
              id: true,
              name: true
            }
          },
          offer: {
            select: {
              id: true,
              offerType: true,
              discountValue: true,
              discountPercentage: true,
              withDiscount: true
            }
          },
          items: true
        }
      });

      // Sale order read operations - no logging needed

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
      // ✅ LOG THE ERROR
      await logDatabaseError({
        error,
        userId,
        req,
        metadata: {
          operation: 'getSaleOrders',
          queryParams
        }
      }).catch(err => console.error('Error log failed:', err));
      
      console.error('Error fetching sale orders:', error);
      throw new APIError('Failed to fetch sale orders', 500, 'FETCH_ORDERS_ERROR');
    }
  }

  /**
   * Get a single sale order by ID
   * @param {number} id - Sale order ID
   * @param {Object} req - Express request object (for audit logging)
   * @param {number} userId - User requesting data (for audit logging)
   * @returns {Promise<Object>} Sale order details
   */
  async getSaleOrderById(id, req = null, userId = null) {
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
          material: true,
          coating: true,
          fitting: true,
          dia: true,
          tinting: true,
          items: true,
          invoice: true,
          purchaseOrders: {
            where: { deleteStatus: false },
            select: {
              id: true,
              poNumber: true,
              status: true,
              receivedQty: true,
              deleteStatus: true,
            },
          },
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
          },
          offer: {
            select: {
              id: true,
              offerName: true,
              offerType: true,
              discountValue: true,
              discountPercentage: true,
              exchange_coating_id: true,
              withDiscount: true,
              endDate: true,
              exchangeCoating: {
                select: { id: true, name: true }
              }
            }
          },
          children: {
            where: { deleteStatus: false },
            select: { id: true, orderNo: true, status: true }
          }
        }
      });

      if (!saleOrder || saleOrder.deleteStatus) {
        const error = new APIError('Sale order not found', 404, 'ORDER_NOT_FOUND');
        await logNotFoundError({
          error,
          userId,
          req,
          resource: 'SaleOrder',
          resourceId: id,
          metadata: { operation: 'getSaleOrderById' }
        });
        throw error;
      }

      // Sale order read operation - no logging needed

      return saleOrder;
    } catch (error) {
      if (error instanceof APIError) throw error;
      
      // ✅ LOG THE ERROR
      await logDatabaseError({
        error,
        userId,
        req,
        metadata: {
          operation: 'getSaleOrderById',
          saleOrderId: id
        }
      }).catch(err => console.error('Error log failed:', err));
      
      console.error('Error fetching sale order:', error);
      throw new APIError('Failed to fetch sale order', 500, 'FETCH_ORDER_ERROR');
    }
  }

  /**
   * Update a sale order
   * @param {number} id - Sale order ID
   * @param {Object} updateData - Updated data
   * @param {number} userId - User performing update
   * @param {Object} req - Express request object (for audit logging)
   * @returns {Promise<Object>} Updated sale order
   */
  async updateSaleOrder(id, updateData, userId, req = null) {
    try {
      // Check if order exists and get old values for audit trail
      const existing = await prisma.saleOrder.findUnique({
        where: { id },
        include: {
          customer: true,
          lensProduct: true,
          category: true
        }
      });

      if (!existing || existing.deleteStatus) {
        const error = new APIError('Sale order not found', 404, 'ORDER_NOT_FOUND');
        await logNotFoundError({
          error,
          userId,
          req,
          resource: 'SaleOrder',
          resourceId: id,
          metadata: { operation: 'updateSaleOrder' }
        });
        throw error;
      }

      // Validate customer if changed
      if (updateData.customerId) {
        const customer = await prisma.customer.findUnique({
          where: { id: updateData.customerId, delete_status: false }
        });
        if (!customer) {
          throw new APIError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
        }
      }

      // Validate and cross-verify offer if provided
      if (updateData.offer_id) {
        const offer = await prisma.lensOffers.findUnique({
          where: { id: updateData.offer_id }
        });
        if (!offer || !offer.activeStatus) {
          throw new APIError('Selected offer not found or is inactive', 400, 'OFFER_INVALID');
        }
        const now = new Date();
        if (offer.startDate && new Date(offer.startDate) > now) {
          throw new APIError('Selected offer has not started yet', 400, 'OFFER_NOT_STARTED');
        }
        if (offer.endDate && new Date(offer.endDate) < now) {
          throw new APIError('Selected offer has expired', 400, 'OFFER_EXPIRED');
        }
        // Cannot apply an offer to a zero-total order
        const orderTotal = (updateData.lensPrice || 0) + (updateData.fittingPrice || 0) +
          (updateData.tintingPrice || 0) + (updateData.rightEyeExtra || 0) + (updateData.leftEyeExtra || 0);
        if (orderTotal === 0) {
          throw new APIError('Cannot apply an offer when the order total is ₹0', 400, 'OFFER_ZERO_TOTAL');
        }
        if (offer.offerType === 'PERCENTAGE' && updateData.discount && updateData.discount !== 0) {
          throw new APIError(
            'Discount field must be 0 when a PERCENTAGE offer is applied',
            400,
            'OFFER_DISCOUNT_CONFLICT'
          );
        }
      }

      if (updateData.customerRefNo !== undefined) {
        // Submit-time duplicate ref check handled on FE via checkCustomerRef API
        // await this.assertUniqueCustomerRef(updateData.customerRefNo, id);
      }

      // Prepare update object
      const dataToUpdate = {
        ...updateData,
        updatedBy: userId
      };

      if (updateData.Type_id) {
        const lensType = await prisma.lensTypeMaster.findUnique({
          where: { id: updateData.Type_id, deleteStatus: false }
        });
        if (lensType && (lensType.name === 'STOCK' || lensType.name === 'RX')) {
          dataToUpdate.procurementType = lensType.name;
        }
      }

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
          material: true,
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
          },
          offer: {
            select: {
              id: true,
              offerName: true,
              offerType: true,
              discountValue: true,
              discountPercentage: true
            }
          }
        }
      });

      // ✅ LOG THE UPDATE OPERATION
      await logUpdate({
        userId,
        entity: 'SaleOrder',
        entityId: updated.id,
        oldValues: existing,
        newValues: updated,
        req,
        metadata: {
          orderNo: updated.orderNo,
          customerName: updated.customer?.name,
          updatedFields: Object.keys(updateData),
          operation: 'Sale order updated successfully'
        }
      });

      return updated;
    } catch (error) {
      if (error instanceof APIError) throw error;
      
      // ✅ LOG THE ERROR
      await logDatabaseError({
        error,
        userId,
        req,
        metadata: {
          operation: 'updateSaleOrder',
          saleOrderId: id,
          input: updateData
        }
      }).catch(err => console.error('Error log failed:', err));
      
      console.error('Error updating sale order:', error);
      throw new APIError('Failed to update sale order', 500, 'UPDATE_ORDER_ERROR');
    }
  }

  /**
   * Update sale order status
   * @param {number} id - Sale order ID
   * @param {string} status - New status
   * @param {number} userId - User performing update
   * @param {Object} req - Express request object (for audit logging)
   * @param {string} [remark] - Optional remark (used for QC rejection reason)
   * @returns {Promise<Object>} Updated sale order
   */
  async updateStatus(id, status, userId, req = null, remark = undefined, inventoryItemIds = undefined) {
    try {
      if (!SALE_ORDER_STATUSES.includes(status)) {
        throw new APIError(`Invalid status. Must be one of: ${SALE_ORDER_STATUSES.join(', ')}`, 400, 'INVALID_STATUS');
      }

      const sourceByStatus = {
        FITTING_READY: 'PRE_QC',
        IN_FITTING: 'FITTING',
        ON_HOLD: 'FITTING',
        AWAITING_QUALITY: 'FITTING',
        READY_FOR_DISPATCH: 'POST_QC',
        PRE_QC_REJECTED: 'PRE_QC',
        PRE_QC_SCRAPPED: 'PRE_QC',
        POST_QC_REJECTED: 'POST_QC',
        POST_QC_SCRAPPED: 'POST_QC',
        READY_FOR_PICKUP: 'DISPATCH',
        DISPATCHED: 'DISPATCH',
        DELIVERED: 'DISPATCH',
        INVOICED: 'BILLING',
        COMPLETED: 'BILLING',
      };

      const existing = await prisma.saleOrder.findUnique({
        where: { id, deleteStatus: false },
        include: {
          purchaseOrders: { where: { deleteStatus: false, status: { not: 'CANCELLED' } } }
        }
      });
      if (!existing) throw new APIError('Sale order not found', 404, 'ORDER_NOT_FOUND');

      let updated;
      if (status === 'IN_FITTING' && inventoryItemIds && inventoryItemIds.length > 0) {
        updated = await prisma.$transaction(async (tx) => {
          const requiredEyes = (existing.rightEye ? 1 : 0) + (existing.leftEye ? 1 : 0);
          if (requiredEyes === 2 && inventoryItemIds.length < 2) {
            throw new APIError('Both RE and LE inventory items required', 400, 'BOTH_EYES_REQUIRED');
          }

          for (const itemId of inventoryItemIds) {
            try {
              if (typeof itemId === 'string' && itemId.startsWith('rec_')) {
                const receiptId = parseInt(itemId.replace('rec_', ''), 10);
                
                // 1. Fetch receipt
                const receipt = await tx.purchaseOrderReceipt.findUnique({
                  where: { id: receiptId },
                  include: { purchaseOrder: true },
                });
                if (!receipt) throw new APIError('Purchase order receipt not found', 404, 'RECEIPT_NOT_FOUND');
                if (receipt.inwardedQty >= receipt.totalReceivedQty) {
                  throw new APIError('Receipt has no pending inward quantity', 400, 'NO_PENDING_QTY');
                }

                // 2. Find location/tray
                const location = await tx.locationMaster.findFirst({ where: { deleteStatus: false } });
                if (!location) throw new APIError('No location found for auto-inward', 400, 'NO_LOCATION_FOUND');
                const tray = await tx.trayMaster.findFirst({ where: { location_id: location.id, deleteStatus: false } });
                if (!tray) throw new APIError('No tray found for auto-inward', 400, 'NO_TRAY_FOUND');

                // 3. Create inventory item
                const itemData = {
                  lens_id: existing.lens_id,
                  category_id: existing.category_id,
                  Type_id: existing.Type_id,
                  coating_id: existing.coating_id,
                  dia_id: existing.dia_id,
                  fitting_id: existing.fitting_id,
                  tinting_id: existing.tinting_id,
                  location_id: location.id,
                  tray_id: tray.id,
                  quantity: 1,
                  costPrice: receipt.unitPrice || 0,
                  batchNo: receipt.receiptNumber,
                  purchaseOrderId: receipt.purchaseOrderId,
                  purchaseReceiptId: receipt.id,
                  vendorId: receipt.purchaseOrder?.vendorId,
                  rightEye: existing.rightEye,
                  leftEye: existing.leftEye,
                  rightSpherical: existing.rightSpherical,
                  rightCylindrical: existing.rightCylindrical,
                  rightAdd: existing.rightAdd,
                  leftSpherical: existing.leftSpherical,
                  leftCylindrical: existing.leftCylindrical,
                  leftAdd: existing.leftAdd,
                  status: 'AVAILABLE',
                  createdBy: userId,
                };
                const item = await tx.inventoryItem.create({ data: itemData });

                // 4. Record transaction & update stock
                const transactionNo = await inventoryService.generateTransactionNumber(tx);
                await tx.inventoryTransaction.create({
                  data: {
                    transactionNo,
                    type: 'INWARD_PO',
                    inventoryItemId: item.id,
                    quantity: itemData.quantity,
                    balanceAfter: itemData.quantity,
                    unitPrice: itemData.costPrice,
                    totalValue: itemData.quantity * itemData.costPrice,
                    toLocationId: itemData.location_id,
                    toTrayId: itemData.tray_id,
                    purchaseOrderId: itemData.purchaseOrderId,
                    vendorId: itemData.vendorId,
                    batchNo: itemData.batchNo,
                    reason: 'Auto-inward from Inward Queue for Fitting issue',
                    createdBy: userId,
                  },
                });
                await inventoryService.updateInventoryStock(item, itemData.quantity, 'ADD', tx);

                // 5. Update receipt
                await tx.purchaseOrderReceipt.update({
                  where: { id: receipt.id },
                  data: {
                    inwardedQty: { increment: 1 },
                    updatedBy: userId,
                  },
                });

                // 6. Reserve item
                await inventoryService.reserveInventoryForSale(item.id, 1, existing.id, userId, tx);
              } else {
                const inventoryItemId = typeof itemId === 'string' && itemId.startsWith('inv_')
                  ? parseInt(itemId.replace('inv_', ''), 10)
                  : parseInt(itemId, 10);
                await inventoryService.reserveInventoryForSale(inventoryItemId, 1, existing.id, userId, tx);
              }
            } catch (err) {
              const reason = err?.message || 'Failed to reserve inventory item';
              throw new APIError(`Could not reserve inventory item ${itemId}: ${reason}`, 400, 'RESERVATION_FAILED');
            }
          }

          // Transition status inside transaction
          return await saleOrderStatusService.transition({
            tx,
            saleOrderId: id,
            toStatus: status,
            userId,
            remark,
            source: sourceByStatus[status] || 'USER',
          });
        });
      } else {
        updated = await saleOrderStatusService.transition({
          saleOrderId: id,
          toStatus: status,
          userId,
          remark,
          source: sourceByStatus[status] || 'USER',
        });
      }

      await logUpdate({
        userId,
        entity: 'SaleOrder',
        entityId: updated.id,
        oldValues: { status: existing.status },
        newValues: { status: updated.status },
        req,
        metadata: {
          orderNo: updated.orderNo,
          oldStatus: existing.status,
          newStatus: updated.status,
          operation: 'Sale order status updated',
        },
      });

      return updated;
    } catch (error) {
      if (error instanceof APIError) throw error;

      await logDatabaseError({
        error,
        userId,
        req,
        metadata: { operation: 'updateStatus', saleOrderId: id, newStatus: status },
      }).catch((err) => console.error('Error log failed:', err));

      console.error('Error updating order status:', error);
      throw new APIError('Failed to update order status', 500, 'UPDATE_STATUS_ERROR');
    }
  }

  /**
   * Get matching available inventory items on a FIFO basis for a sale order
   * @param {number} saleOrderId - Sale order ID
   * @returns {Promise<Object>} Object containing rightEyeMatches and leftEyeMatches arrays
   */
  /**
   * @param {number} saleOrderId
   * @param {{ applySoftClaims?: boolean }} [options]
   *   When applySoftClaims is true (default), units soft-claimed by earlier
   *   waiting queue SOs are excluded so Issue cannot double-claim.
   */
  async getMatchingInventoryFIFO(saleOrderId, options = {}) {
    const { applySoftClaims = true } = options;
    try {
      const saleOrder = await prisma.saleOrder.findUnique({
        where: { id: saleOrderId, deleteStatus: false },
        include: {
          lensProduct: { select: { id: true, lens_name: true, product_code: true } },
          category: { select: { id: true, name: true } },
          coating: { select: { id: true, name: true } },
          lensType: { select: { id: true, name: true } },
        }
      });

      if (!saleOrder) {
        throw new APIError('Sale order not found', 404, 'ORDER_NOT_FOUND');
      }

      const results = {
        rightEyeMatches: [],
        leftEyeMatches: []
      };

      // Helper function to build query conditions
      const buildWhereClause = (eyeType) => {
        const where = {
          status: 'AVAILABLE',
          deleteStatus: false,
          quantity: { gt: 0 },
          OR: [
            { purchaseOrderId: null },
            { purchaseOrder: { saleOrderId: null } },
            { purchaseOrder: { saleOrder: { procurementType: 'STOCK' } } },
            { purchaseOrder: { saleOrderId: saleOrderId } }
          ]
        };

        if (saleOrder.lens_id) where.lens_id = saleOrder.lens_id;
        // Type_id is not used for SO↔stock FIFO matching (stock often has null Type_id).
        if (saleOrder.coating_id) where.coating_id = saleOrder.coating_id;
        if (saleOrder.category_id) where.category_id = saleOrder.category_id;

        if (eyeType === 'right') {
          addSpecMatch(where, 'rightSpherical', saleOrder.rightSpherical);
          addSpecMatch(where, 'rightCylindrical', saleOrder.rightCylindrical);
          if (categoryUsesAdd(saleOrder.category?.name)) addSpecMatch(where, 'rightAdd', saleOrder.rightAdd);
        } else {
          const leftSpecWhere = {};
          addSpecMatch(leftSpecWhere, 'leftSpherical', saleOrder.leftSpherical);
          addSpecMatch(leftSpecWhere, 'leftCylindrical', saleOrder.leftCylindrical);
          if (categoryUsesAdd(saleOrder.category?.name)) addSpecMatch(leftSpecWhere, 'leftAdd', saleOrder.leftAdd);

          const rightSpecWhere = {
            leftSpherical: null
          };
          addSpecMatch(rightSpecWhere, 'rightSpherical', saleOrder.leftSpherical);
          addSpecMatch(rightSpecWhere, 'rightCylindrical', saleOrder.leftCylindrical);
          if (categoryUsesAdd(saleOrder.category?.name)) addSpecMatch(rightSpecWhere, 'rightAdd', saleOrder.leftAdd);

          if (!where.AND) where.AND = [];
          where.AND.push({
            OR: [
              leftSpecWhere,
              rightSpecWhere
            ]
          });
        }

        return where;
      };

      const buildPoWhereClause = (eyeType) => {
        const poWhere = {
          deleteStatus: false,
          OR: [
            { saleOrderId: null },
            { saleOrder: { procurementType: 'STOCK' } },
            { saleOrderId: saleOrderId }
          ]
        };

        if (saleOrder.lens_id) poWhere.lens_id = saleOrder.lens_id;
        // Type_id is not used for SO↔PO receipt FIFO matching (same as physical stock).
        if (saleOrder.coating_id) poWhere.coating_id = saleOrder.coating_id;
        if (saleOrder.category_id) poWhere.category_id = saleOrder.category_id;

        if (eyeType === 'right') {
          addSpecMatch(poWhere, 'rightSpherical', saleOrder.rightSpherical);
          addSpecMatch(poWhere, 'rightCylindrical', saleOrder.rightCylindrical);
          if (categoryUsesAdd(saleOrder.category?.name)) addSpecMatch(poWhere, 'rightAdd', saleOrder.rightAdd);
        } else {
          const leftSpecWhere = {};
          addSpecMatch(leftSpecWhere, 'leftSpherical', saleOrder.leftSpherical);
          addSpecMatch(leftSpecWhere, 'leftCylindrical', saleOrder.leftCylindrical);
          if (categoryUsesAdd(saleOrder.category?.name)) addSpecMatch(leftSpecWhere, 'leftAdd', saleOrder.leftAdd);

          const rightSpecWhere = {
            leftSpherical: null
          };
          addSpecMatch(rightSpecWhere, 'rightSpherical', saleOrder.leftSpherical);
          addSpecMatch(rightSpecWhere, 'rightCylindrical', saleOrder.leftCylindrical);
          if (categoryUsesAdd(saleOrder.category?.name)) addSpecMatch(rightSpecWhere, 'rightAdd', saleOrder.leftAdd);

          if (!poWhere.AND) poWhere.AND = [];
          poWhere.AND.push({
            OR: [
              leftSpecWhere,
              rightSpecWhere
            ]
          });
        }

        return poWhere;
      };

      if (saleOrder.rightEye) {
        const physical = await prisma.inventoryItem.findMany({
          where: buildWhereClause('right'),
          orderBy: { inwardDate: 'asc' }, // FIFO
          include: {
            location: { select: { id: true, name: true } },
            tray: { select: { id: true, name: true, capacity: true } },
            purchaseOrder: { select: { id: true, poNumber: true, saleOrderId: true } }
          }
        });
        const formattedPhysical = physical.map(item => {
          const isRx = item.purchaseOrder?.saleOrderId !== null && item.purchaseOrder?.saleOrderId !== undefined;
          return {
            ...item,
            id: `inv_${item.id}`,
            sourceType: isRx ? 'RX' : 'STOCK',
            poNumber: item.purchaseOrder?.poNumber || null
          };
        });

        const receipts = await prisma.purchaseOrderReceipt.findMany({
          where: {
            deleteStatus: false,
            purchaseOrder: buildPoWhereClause('right')
          },
          include: {
            purchaseOrder: true
          },
          orderBy: { receivedDate: 'asc' }
        });
        const formattedReceipts = receipts
          .filter(r => (r.totalReceivedQty || 0) > (r.inwardedQty || 0))
          .map(r => {
            const isRx = r.purchaseOrder?.saleOrderId !== null && r.purchaseOrder?.saleOrderId !== undefined;
            return {
              id: `rec_${r.id}`,
              inwardDate: r.receivedDate || r.createdAt,
              quantity: (r.totalReceivedQty || 0) - (r.inwardedQty || 0),
              costPrice: r.unitPrice || 0,
              tray: { name: 'Inward Queue (Pending)', capacity: '-' },
              location: { name: 'Inward Queue' },
              isReceipt: true,
              sourceType: isRx ? 'RX' : 'STOCK',
              poNumber: r.purchaseOrder?.poNumber || null
            };
          });

        results.rightEyeMatches = [...formattedPhysical, ...formattedReceipts];
      }

      if (saleOrder.leftEye) {
        const physical = await prisma.inventoryItem.findMany({
          where: buildWhereClause('left'),
          orderBy: { inwardDate: 'asc' }, // FIFO
          include: {
            location: { select: { id: true, name: true } },
            tray: { select: { id: true, name: true, capacity: true } },
            purchaseOrder: { select: { id: true, poNumber: true, saleOrderId: true } }
          }
        });
        const formattedPhysical = physical.map(item => {
          const isRx = item.purchaseOrder?.saleOrderId !== null && item.purchaseOrder?.saleOrderId !== undefined;
          return {
            ...item,
            id: `inv_${item.id}`,
            sourceType: isRx ? 'RX' : 'STOCK',
            poNumber: item.purchaseOrder?.poNumber || null
          };
        });

        const receipts = await prisma.purchaseOrderReceipt.findMany({
          where: {
            deleteStatus: false,
            purchaseOrder: buildPoWhereClause('left')
          },
          include: {
            purchaseOrder: true
          },
          orderBy: { receivedDate: 'asc' }
        });
        const formattedReceipts = receipts
          .filter(r => (r.totalReceivedQty || 0) > (r.inwardedQty || 0))
          .map(r => {
            const isRx = r.purchaseOrder?.saleOrderId !== null && r.purchaseOrder?.saleOrderId !== undefined;
            return {
              id: `rec_${r.id}`,
              inwardDate: r.receivedDate || r.createdAt,
              quantity: (r.totalReceivedQty || 0) - (r.inwardedQty || 0),
              costPrice: r.unitPrice || 0,
              tray: { name: 'Inward Queue (Pending)', capacity: '-' },
              location: { name: 'Inward Queue' },
              isReceipt: true,
              sourceType: isRx ? 'RX' : 'STOCK',
              poNumber: r.purchaseOrder?.poNumber || null
            };
          });

        results.leftEyeMatches = [...formattedPhysical, ...formattedReceipts];
      }

      let rightEyeMatches = results.rightEyeMatches;
      let leftEyeMatches = results.leftEyeMatches;

      // Exclude units soft-claimed by earlier waiting SOs (display-only pool; no DB write).
      if (applySoftClaims) {
        const earlierWaiting = await prisma.saleOrder.findMany({
          where: {
            deleteStatus: false,
            status: { in: INVENTORY_QUEUE_STATUSES },
            id: { not: saleOrderId },
            OR: [
              { createdAt: { lt: saleOrder.createdAt } },
              {
                AND: [
                  { createdAt: saleOrder.createdAt },
                  { id: { lt: saleOrderId } },
                ],
              },
            ],
          },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: { id: true, rightEye: true, leftEye: true, createdAt: true },
        });

        if (earlierWaiting.length > 0) {
          const pool = createClaimPool();
          for (const earlier of earlierWaiting) {
            const earlierMatches = await this.getMatchingInventoryFIFO(earlier.id, {
              applySoftClaims: false,
            });
            softAllocateOrder(
              earlier,
              earlierMatches.rightEyeMatches || [],
              earlierMatches.leftEyeMatches || [],
              pool
            );
          }
          rightEyeMatches = filterMatchesByPool(rightEyeMatches, pool);
          leftEyeMatches = filterMatchesByPool(leftEyeMatches, pool);
        }
      }

      return {
        saleOrder,
        rightEyeMatches,
        leftEyeMatches,
      };
    } catch (error) {
      console.error('Error in getMatchingInventoryFIFO:', error);
      if (error instanceof APIError) throw error;
      throw new APIError('Failed to get matching inventory', 500, 'FIFO_MATCH_ERROR');
    }
  }

  /**
   * Update dispatch information
   * @param {number} id - Sale order ID
   * @param {Object} dispatchData - Dispatch information
   * @param {number} userId - User performing update
   * @param {Object} req - Express request object (for audit logging)
   * @returns {Promise<Object>} Updated sale order
   */
  async updateDispatchInfo(id, dispatchData, userId, req = null) {
    try {
      const existing = await prisma.saleOrder.findUnique({
        where: { id },
        include: {
          customer: true,
          assignedPerson: true
        }
      });

      if (!existing || existing.deleteStatus) {
        const error = new APIError('Sale order not found', 404, 'ORDER_NOT_FOUND');
        await logNotFoundError({
          error,
          userId,
          req,
          resource: 'SaleOrder',
          resourceId: id,
          metadata: { operation: 'updateDispatchInfo' }
        });
        throw error;
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

      // ✅ LOG THE DISPATCH UPDATE
      await logUpdate({
        userId,
        entity: 'SaleOrder',
        entityId: updated.id,
        oldValues: {
          dispatchStatus: existing.dispatchStatus,
          assignedPerson_id: existing.assignedPerson_id,
          estimatedDate: existing.estimatedDate,
          actualDate: existing.actualDate
        },
        newValues: {
          dispatchStatus: updated.dispatchStatus,
          assignedPerson_id: updated.assignedPerson_id,
          estimatedDate: updated.estimatedDate,
          actualDate: updated.actualDate
        },
        req,
        metadata: {
          orderNo: updated.orderNo,
          customerName: updated.customer?.name,
          assignedTo: updated.assignedPerson?.name,
          operation: 'Dispatch information updated'
        }
      });

      return updated;
    } catch (error) {
      if (error instanceof APIError) throw error;
      
      // ✅ LOG THE ERROR
      await logDatabaseError({
        error,
        userId,
        req,
        metadata: {
          operation: 'updateDispatchInfo',
          saleOrderId: id,
          input: dispatchData
        }
      }).catch(err => console.error('Error log failed:', err));
      
      console.error('Error updating dispatch info:', error);
      throw new APIError('Failed to update dispatch information', 500, 'UPDATE_DISPATCH_ERROR');
    }
  }

  /**
   * Soft delete a sale order
   * @param {number} id - Sale order ID
   * @param {number} userId - User performing deletion
   * @param {Object} req - Express request object (for audit logging)
   * @returns {Promise<boolean>} Success status
   */
  async deleteSaleOrder(id, userId, req = null) {
    try {
      const existing = await prisma.saleOrder.findUnique({
        where: { id },
        include: {
          customer: true,
          invoice: true,
          purchaseOrders: true
        }
      });

      if (!existing || existing.deleteStatus) {
        const error = new APIError('Sale order not found', 404, 'ORDER_NOT_FOUND');
        await logNotFoundError({
          error,
          userId,
          req,
          resource: 'SaleOrder',
          resourceId: id,
          metadata: { operation: 'deleteSaleOrder' }
        });
        throw error;
      }

      // Check if order can be deleted
      if (existing.invoiceId) {
        const error = new APIError('Cannot delete sale order with an invoice', 400, 'HAS_INVOICE');
        await logBusinessError({
          error,
          userId,
          req,
          businessRule: 'Cannot delete sale order that has an associated invoice',
          metadata: {
            operation: 'deleteSaleOrder',
            saleOrderId: id,
            invoiceId: existing.invoiceId
          }
        });
        throw error;
      }

      if (existing.purchaseOrders.length > 0) {
        const error = new APIError('Cannot delete sale order with purchase orders', 400, 'HAS_PURCHASE_ORDERS');
        await logBusinessError({
          error,
          userId,
          req,
          businessRule: 'Cannot delete sale order that has associated purchase orders',
          metadata: {
            operation: 'deleteSaleOrder',
            saleOrderId: id,
            purchaseOrderCount: existing.purchaseOrders.length
          }
        });
        throw error;
      }

      if (['DELIVERED', 'BILLED'].includes(existing.status)) {
        const error = new APIError('Cannot delete a delivered or billed sale order', 400, 'INVALID_STATUS');
        await logBusinessError({
          error,
          userId,
          req,
          businessRule: 'Cannot delete sale order with DELIVERED or BILLED status',
          metadata: {
            operation: 'deleteSaleOrder',
            saleOrderId: id,
            currentStatus: existing.status
          }
        });
        throw error;
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

      // Decrement customer reserved_amount if the SO was not yet invoiced
      if (!existing.invoiceId) {
        const lP = existing.lensPrice || 0;
        const lD = lP * ((existing.discount || 0) / 100);
        const soTotal =
          lP - lD +
          (existing.rightEyeExtra || 0) +
          (existing.leftEyeExtra || 0) +
          (existing.fittingPrice || 0) +
          (existing.tintingPrice || 0) +
          (Array.isArray(existing.additionalPrice)
            ? existing.additionalPrice.reduce((s, x) => s + (parseFloat(x.value) || 0), 0)
            : 0);
        await prisma.customer.update({
          where: { id: existing.customerId },
          data: { reserved_amount: { decrement: Math.max(0, soTotal) } },
        });
      }

      // ✅ LOG THE DELETE OPERATION
      await logDelete({
        userId,
        entity: 'SaleOrder',
        entityId: id,
        oldValues: existing,
        req,
        metadata: {
          orderNo: existing.orderNo,
          customerName: existing.customer?.name,
          status: existing.status,
          deleteType: 'soft',
          operation: 'Sale order deleted (soft delete)'
        }
      });

      return true;
    } catch (error) {
      if (error instanceof APIError) throw error;
      
      // ✅ LOG THE ERROR
      await logDatabaseError({
        error,
        userId,
        req,
        metadata: {
          operation: 'deleteSaleOrder',
          saleOrderId: id
        }
      }).catch(err => console.error('Error log failed:', err));
      
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
  /**
   * Get sale orders dropdown options
   * @param {Object} req - Express request object (for audit logging)
   * @param {number} userId - User requesting data (for audit logging)
   * @returns {Promise<Array>} Sale orders dropdown data
   */
  async getSaleOrdersDropdown(req = null, userId = null) {
    try {
      const saleOrders = await prisma.saleOrder.findMany({
        where: {
          deleteStatus: false,
          activeStatus: true
        },
        select: {
          id: true,
          orderNo: true,
          customer: {
            select: {
              id: true,
              name: true,
              code: true
            }
          },
          status: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Format data for dropdown: value = id, label = "orderNo - customerName"
      const dropdownData = saleOrders.map(order => ({
        value: order.id,
        label: `${order.orderNo} - ${order.customer.name}`,
        orderNo: order.orderNo,
        customerName: order.customer.name,
        customerCode: order.customer.code,
        status: order.status
      }));

      return dropdownData;
    } catch (error) {
      // ✅ LOG THE ERROR
      await logDatabaseError({
        error,
        userId,
        req,
        metadata: {
          operation: 'getSaleOrdersDropdown'
        }
      }).catch(err => console.error('Error log failed:', err));
      
      console.error('Error fetching sale orders dropdown:', error);
      throw new APIError('Failed to fetch sale orders dropdown', 500, 'FETCH_DROPDOWN_ERROR');
    }
  }

  /**
   * Close an existing sale order and create a new duplicate as its parent
   * @param {number} id - ID of the sale order to close
   * @param {number} userId - User performing the action
   * @param {Object} req - Express request object (for audit logging)
   * @returns {Promise<Object>} { newOrder, closedOrder }
   */
  async closeAndCreateSaleOrder(id, userId, req = null) {
    try {
      // Fetch the existing order
      const existing = await prisma.saleOrder.findUnique({
        where: { id },
        include: { customer: true }
      });

      if (!existing || existing.deleteStatus) {
        throw new APIError('Sale order not found', 404, 'ORDER_NOT_FOUND');
      }

      if (existing.status === 'CLOSED') {
        throw new APIError('Sale order is already closed', 400, 'ORDER_ALREADY_CLOSED');
      }

      // Generate a new order number for the parent
      const newOrderNo = await this.generateOrderNumber();

      // Run both writes in a transaction
      const [newOrder, closedOrder] = await prisma.$transaction(async (tx) => {
        // 1. Create new (parent) sale order as a copy
        const created = await tx.saleOrder.create({
          data: {
            orderNo: newOrderNo,
            customerId: existing.customerId,
            status: 'DRAFT',
            customerRefNo: existing.customerRefNo,
            orderDate: new Date(),
            type: existing.type,
            remark: existing.remark,
            itemRefNo: existing.itemRefNo,
            freeLens: existing.freeLens,
            urgentOrder: existing.urgentOrder,
            freeFitting: existing.freeFitting,
            offer_id: existing.offer_id,
            lens_id: existing.lens_id,
            category_id: existing.category_id,
            Type_id: existing.Type_id,
            dia_id: existing.dia_id,
            fitting_id: existing.fitting_id,
            material_id: existing.material_id,
            coating_id: existing.coating_id,
            tinting_id: existing.tinting_id,
            rightEye: existing.rightEye,
            leftEye: existing.leftEye,
            rightSpherical: existing.rightSpherical,
            rightCylindrical: existing.rightCylindrical,
            rightAxis: existing.rightAxis,
            rightAdd: existing.rightAdd,
            rightDia: existing.rightDia,
            leftSpherical: existing.leftSpherical,
            leftCylindrical: existing.leftCylindrical,
            leftAxis: existing.leftAxis,
            leftAdd: existing.leftAdd,
            leftDia: existing.leftDia,
            lensPrice: existing.lensPrice,
            rightEyeExtra: existing.rightEyeExtra,
            leftEyeExtra: existing.leftEyeExtra,
            fittingPrice: existing.fittingPrice,
            tintingPrice: existing.tintingPrice,
            discount: existing.discount,
            additionalPrice: existing.additionalPrice,
            dispatchStatus: 'Pending',
            activeStatus: true,
            deleteStatus: false,
            createdBy: userId,
            updatedBy: userId,
          },
          include: {
            customer: { select: { id: true, name: true, code: true } }
          }
        });

        // 2. Close the original order and set it as a child of the new one
        const closed = await tx.saleOrder.update({
          where: { id },
          data: {
            status: 'CLOSED',
            parentId: created.id,
            updatedBy: userId,
          },
          include: {
            customer: { select: { id: true, name: true, code: true } }
          }
        });

        return [created, closed];
      });

      // Audit log
      await logCreate({
        userId,
        entity: 'SaleOrder',
        entityId: newOrder.id,
        newValues: { orderNo: newOrder.orderNo, status: newOrder.status, sourceOrderId: id },
        req,
        metadata: { operation: 'closeAndCreateSaleOrder', sourceOrderNo: existing.orderNo }
      });

      await logUpdate({
        userId,
        entity: 'SaleOrder',
        entityId: closedOrder.id,
        oldValues: { status: existing.status },
        newValues: { status: 'CLOSED', parentId: newOrder.id },
        req,
        metadata: { operation: 'closeAndCreateSaleOrder', newOrderNo: newOrder.orderNo }
      });

      return { newOrder, closedOrder };
    } catch (error) {
      if (error instanceof APIError) throw error;

      await logDatabaseError({
        error,
        userId,
        req,
        metadata: { operation: 'closeAndCreateSaleOrder', saleOrderId: id }
      }).catch(err => console.error('Error log failed:', err));

      console.error('Error in closeAndCreateSaleOrder:', error);
      throw new APIError('Failed to close and create sale order', 500, 'CLOSE_CREATE_ORDER_ERROR');
    }
  }
}

export default SaleOrderService;
