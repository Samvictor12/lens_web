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
import { resolveAutoInwardLocationAndBin } from '../utils/autoInwardBin.js';
import {
  resolveBilledPoUnitPrice,
  sourceLedgerFields,
} from './inventoryUnitCostLedger.js';
import {
  resolveFreeLensApprovalOnWrite,
  pendingFreeLensApprovalFields,
  isAdminUser,
  FREE_LENS_APPROVAL,
  clearedFreeLensApprovalFields,
} from '../utils/freeLensApproval.js';
import { buildSaleOrderTextSearchOr } from '../utils/saleOrderSearch.js';
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

const cylRequiresAxis = (cylindrical) =>
  cylindrical !== null && cylindrical !== undefined && String(cylindrical).trim() !== '';

const hasAxisEntry = (axis) =>
  axis !== null && axis !== undefined && String(axis).trim() !== '';

/** Reject save when CYL is set (including 0) without Axis. */
const assertAxisForCylPowers = (order) => {
  if (order.rightEye !== false && cylRequiresAxis(order.rightCylindrical) && !hasAxisEntry(order.rightAxis)) {
    throw new APIError(
      'Right eye Axis is required when cylindrical is entered (including 0)',
      400,
      'AXIS_REQUIRED_FOR_CYL'
    );
  }
  if (order.leftEye !== false && cylRequiresAxis(order.leftCylindrical) && !hasAxisEntry(order.leftAxis)) {
    throw new APIError(
      'Left eye Axis is required when cylindrical is entered (including 0)',
      400,
      'AXIS_REQUIRED_FOR_CYL'
    );
  }
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
   * Ensure customer reference is unique for this customer (case-insensitive).
   * Same ref on a different customer is allowed.
   */
  async assertUniqueCustomerRef(customerRefNo, customerId, excludeId = null) {
    const ref = customerRefNo?.trim();
    if (!ref || !customerId) return;

    const existing = await prisma.saleOrder.findFirst({
      where: {
        deleteStatus: false,
        customerId: parseInt(customerId, 10),
        customerRefNo: { equals: ref, mode: 'insensitive' },
        ...(excludeId ? { id: { not: parseInt(excludeId, 10) } } : {}),
      },
      select: { id: true, orderNo: true },
    });

    if (existing) {
      throw new APIError(
        `Already same ref is used against this customer (Order ${existing.orderNo})`,
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

    const parsedCustomerId = customerId != null && customerId !== ''
      ? parseInt(customerId, 10)
      : null;
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

    if (Number.isFinite(parsedCustomerId)) {
      const sameCustomerMatch = matches.find(
        (m) => Number(m.customerId) === parsedCustomerId
      );
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
      message: 'Reference is used by another customer (still allowed)',
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

      // Same ref is allowed across customers; block only same customer + same ref
      await this.assertUniqueCustomerRef(orderData.customerRefNo, orderData.customerId);
      assertAxisForCylPowers(orderData);

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
          mrdRefNo: orderData.mrdRefNo,
          freeLens: orderData.freeLens ?? false,
          urgentOrder: orderData.urgentOrder ?? false,
          freeFitting: orderData.freeFitting ?? false,
          ...(orderData.freeLens
            ? pendingFreeLensApprovalFields()
            : clearedFreeLensApprovalFields()),
          
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
  /**
   * Shared list/stats filter where-clause for sale orders.
   */
  buildSaleOrderListWhere(queryParams = {}) {
    const {
      status,
      statuses,
      customerId,
      search,
      startDate,
      endDate,
      dispatchStatus,
      Type_id,
      category_id,
      coating_id,
      procurementType,
      urgentOrder,
    } = queryParams;

    const where = { deleteStatus: false };

    if (statuses) {
      where.status = { in: String(statuses).split(',').map((s) => s.trim()).filter(Boolean) };
    } else if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = parseInt(customerId, 10);
    }

    if (dispatchStatus) {
      where.dispatchStatus = dispatchStatus;
    }

    if (Type_id) {
      where.Type_id = parseInt(Type_id, 10);
    }

    if (category_id) {
      where.category_id = parseInt(category_id, 10);
    }

    if (coating_id) {
      where.coating_id = parseInt(coating_id, 10);
    }

    if (procurementType) {
      where.procurementType = String(procurementType).trim().toUpperCase();
    }

    if (urgentOrder === true || urgentOrder === false) {
      where.urgentOrder = urgentOrder;
    }

    if (search) {
      const searchOr = buildSaleOrderTextSearchOr(search);
      if (searchOr) where.OR = searchOr;
    }

    if (startDate || endDate) {
      where.orderDate = {};
      // Date-only filters use IST calendar day (12:00 AM – 11:59:59.999 PM IST)
      const istDayBound = (raw, endOfDay) => {
        const m = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) {
          const suffix = endOfDay ? "T23:59:59.999+05:30" : "T00:00:00.000+05:30";
          return new Date(`${m[1]}-${m[2]}-${m[3]}${suffix}`);
        }
        const d = new Date(raw);
        if (Number.isNaN(d.getTime())) return d;
        return d;
      };
      if (startDate) {
        where.orderDate.gte = istDayBound(startDate, false);
      }
      if (endDate) {
        where.orderDate.lte = istDayBound(endDate, true);
      }
    }

    return where;
  }

  /**
   * Get all sale orders with pagination and filters
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
      } = queryParams;

      const where = this.buildSaleOrderListWhere(queryParams);

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
          freeLensApprovedByUser: {
            select: { id: true, name: true, email: true }
          },
          freeLensRejectedByUser: {
            select: { id: true, name: true, email: true }
          },
          locationTray: {
            select: { id: true, name: true, location_id: true }
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

      if (existing.status !== 'DRAFT') {
        throw new APIError(
          'Only Draft sale orders can be edited',
          400,
          'ORDER_NOT_EDITABLE'
        );
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
        await this.assertUniqueCustomerRef(
          updateData.customerRefNo,
          updateData.customerId ?? existing.customerId,
          id
        );
      }

      assertAxisForCylPowers({
        rightEye: updateData.rightEye ?? existing.rightEye,
        leftEye: updateData.leftEye ?? existing.leftEye,
        rightCylindrical: updateData.rightCylindrical ?? existing.rightCylindrical,
        rightAxis: updateData.rightAxis ?? existing.rightAxis,
        leftCylindrical: updateData.leftCylindrical ?? existing.leftCylindrical,
        leftAxis: updateData.leftAxis ?? existing.leftAxis,
      });

      // Prepare update object
      const dataToUpdate = {
        ...updateData,
        updatedBy: userId
      };

      if (updateData.freeLens !== undefined) {
        const approvalPatch = resolveFreeLensApprovalOnWrite({
          freeLens: Boolean(updateData.freeLens),
          wasFreeLens: Boolean(existing.freeLens),
        });
        if (approvalPatch) {
          Object.assign(dataToUpdate, approvalPatch);
        }
      }

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
  async updateStatus(id, status, userId, req = null, remark = undefined, inventoryItemIds = undefined, rejectedEyes = undefined) {
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

      const qcRejectOrScrap = [
        'PRE_QC_REJECTED',
        'PRE_QC_SCRAPPED',
        'POST_QC_REJECTED',
        'POST_QC_SCRAPPED',
      ].includes(status);

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

                // 2. Find location/bin (TrayMaster). Destination LocationTray is recorded on the SO only.
                const preferredGodown =
                  existing.procurementType === 'STOCK' ? 'STOCK' : 'RX';
                const { location, tray } = await resolveAutoInwardLocationAndBin(tx, preferredGodown);

                // 3. Create inventory item
                const billedPrice = await resolveBilledPoUnitPrice(
                  tx,
                  receipt.purchaseOrderId,
                  1
                );
                const itemData = {
                  lens_id: existing.lens_id,
                  category_id: existing.category_id,
                  Type_id: existing.Type_id,
                  coating_id: existing.coating_id,
                  dia_id: existing.dia_id,
                  fitting_id: existing.fitting_id,
                  tinting_id: existing.tinting_id,
                  location_id: location.id,
                  tray_id: tray?.id ?? null,
                  quantity: 1,
                  costPrice: billedPrice ?? 0,
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
                    unitPrice: billedPrice,
                    totalValue: billedPrice != null ? itemData.quantity * billedPrice : null,
                    toLocationId: itemData.location_id,
                    toTrayId: itemData.tray_id,
                    purchaseOrderId: itemData.purchaseOrderId,
                    vendorId: itemData.vendorId,
                    batchNo: itemData.batchNo,
                    reason: 'Auto-inward from Inward Queue for Fitting issue',
                    createdBy: userId,
                    ...sourceLedgerFields(itemData.quantity),
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
          ...(qcRejectOrScrap ? { rejectedEyes } : {}),
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
   * Match available inventory (physical + pending receipts) for SO-like specs.
   * @param {object} saleOrder - SO record or synthetic specs
   * @param {{ applySoftClaims?: boolean, softClaimAsNewest?: boolean }} [options]
   */
  async findMatchingInventoryBySpecs(saleOrder, options = {}) {
    const { applySoftClaims = true, softClaimAsNewest = false } = options;
    const saleOrderId = saleOrder?.id != null ? Number(saleOrder.id) : null;
    const procurementType =
      saleOrder?.procurementType === 'STOCK' || saleOrder?.procurementType === 'RX'
        ? saleOrder.procurementType
        : null;

    const results = {
      rightEyeMatches: [],
      leftEyeMatches: [],
    };

    const buildWhereClause = (eyeType) => {
      const where = {
        status: 'AVAILABLE',
        deleteStatus: false,
        quantity: { gt: 0 },
      };

      if (procurementType === 'RX') {
        where.OR = [
          { purchaseOrderId: null },
          { purchaseOrder: { saleOrderId: null } },
          { purchaseOrder: { saleOrder: { procurementType: 'RX' } } },
          ...(saleOrderId ? [{ purchaseOrder: { saleOrderId } }] : []),
        ];
      } else {
        where.OR = [
          { purchaseOrderId: null },
          { purchaseOrder: { saleOrderId: null } },
          { purchaseOrder: { saleOrder: { procurementType: 'STOCK' } } },
          ...(saleOrderId ? [{ purchaseOrder: { saleOrderId } }] : []),
        ];
      }

      if (procurementType) {
        where.AND = [
          ...(where.AND || []),
          { location: { godownType: procurementType } },
        ];
      }

      if (saleOrder.lens_id) where.lens_id = saleOrder.lens_id;
      if (saleOrder.coating_id) where.coating_id = saleOrder.coating_id;
      if (saleOrder.category_id) where.category_id = saleOrder.category_id;

      if (eyeType === 'right') {
        addSpecMatch(where, 'rightSpherical', saleOrder.rightSpherical);
        addSpecMatch(where, 'rightCylindrical', saleOrder.rightCylindrical);
        if (categoryUsesAdd(saleOrder.category?.name)) {
          addSpecMatch(where, 'rightAdd', saleOrder.rightAdd);
        }
      } else {
        const leftSpecWhere = {};
        addSpecMatch(leftSpecWhere, 'leftSpherical', saleOrder.leftSpherical);
        addSpecMatch(leftSpecWhere, 'leftCylindrical', saleOrder.leftCylindrical);
        if (categoryUsesAdd(saleOrder.category?.name)) {
          addSpecMatch(leftSpecWhere, 'leftAdd', saleOrder.leftAdd);
        }

        const rightSpecWhere = { leftSpherical: null };
        addSpecMatch(rightSpecWhere, 'rightSpherical', saleOrder.leftSpherical);
        addSpecMatch(rightSpecWhere, 'rightCylindrical', saleOrder.leftCylindrical);
        if (categoryUsesAdd(saleOrder.category?.name)) {
          addSpecMatch(rightSpecWhere, 'rightAdd', saleOrder.leftAdd);
        }

        if (!where.AND) where.AND = [];
        where.AND.push({
          OR: [leftSpecWhere, rightSpecWhere],
        });
      }

      return where;
    };

    const buildPoWhereClause = (eyeType) => {
      const poWhere = { deleteStatus: false };

      if (procurementType === 'RX') {
        poWhere.OR = [
          { saleOrder: { procurementType: 'RX' } },
          ...(saleOrderId ? [{ saleOrderId }] : []),
        ];
      } else {
        poWhere.OR = [
          { saleOrderId: null },
          { saleOrder: { procurementType: 'STOCK' } },
          ...(saleOrderId ? [{ saleOrderId }] : []),
        ];
      }

      if (saleOrder.lens_id) poWhere.lens_id = saleOrder.lens_id;
      if (saleOrder.coating_id) poWhere.coating_id = saleOrder.coating_id;
      if (saleOrder.category_id) poWhere.category_id = saleOrder.category_id;

      if (eyeType === 'right') {
        addSpecMatch(poWhere, 'rightSpherical', saleOrder.rightSpherical);
        addSpecMatch(poWhere, 'rightCylindrical', saleOrder.rightCylindrical);
        if (categoryUsesAdd(saleOrder.category?.name)) {
          addSpecMatch(poWhere, 'rightAdd', saleOrder.rightAdd);
        }
      } else {
        const leftSpecWhere = {};
        addSpecMatch(leftSpecWhere, 'leftSpherical', saleOrder.leftSpherical);
        addSpecMatch(leftSpecWhere, 'leftCylindrical', saleOrder.leftCylindrical);
        if (categoryUsesAdd(saleOrder.category?.name)) {
          addSpecMatch(leftSpecWhere, 'leftAdd', saleOrder.leftAdd);
        }

        const rightSpecWhere = { leftSpherical: null };
        addSpecMatch(rightSpecWhere, 'rightSpherical', saleOrder.leftSpherical);
        addSpecMatch(rightSpecWhere, 'rightCylindrical', saleOrder.leftCylindrical);
        if (categoryUsesAdd(saleOrder.category?.name)) {
          addSpecMatch(rightSpecWhere, 'rightAdd', saleOrder.leftAdd);
        }

        if (!poWhere.AND) poWhere.AND = [];
        poWhere.AND.push({
          OR: [leftSpecWhere, rightSpecWhere],
        });
      }

      return poWhere;
    };

    const loadEyeMatches = async (eyeType) => {
      const physical = await prisma.inventoryItem.findMany({
        where: buildWhereClause(eyeType),
        orderBy: { inwardDate: 'asc' },
        include: {
          location: { select: { id: true, name: true, godownType: true } },
          tray: { select: { id: true, name: true, capacity: true } },
          purchaseOrder: { select: { id: true, poNumber: true, saleOrderId: true } },
        },
      });
      const formattedPhysical = physical.map((item) => {
        const isRx =
          item.purchaseOrder?.saleOrderId !== null &&
          item.purchaseOrder?.saleOrderId !== undefined;
        return {
          ...item,
          id: `inv_${item.id}`,
          sourceType: isRx ? 'RX' : 'STOCK',
          poNumber: item.purchaseOrder?.poNumber || null,
        };
      });

      const receipts = await prisma.purchaseOrderReceipt.findMany({
        where: {
          deleteStatus: false,
          purchaseOrder: buildPoWhereClause(eyeType),
        },
        include: { purchaseOrder: true },
        orderBy: { receivedDate: 'asc' },
      });
      const formattedReceipts = receipts
        .filter((r) => (r.totalReceivedQty || 0) > (r.inwardedQty || 0))
        .map((r) => {
          const isRx =
            r.purchaseOrder?.saleOrderId !== null &&
            r.purchaseOrder?.saleOrderId !== undefined;
          return {
            id: `rec_${r.id}`,
            inwardDate: r.receivedDate || r.createdAt,
            quantity: (r.totalReceivedQty || 0) - (r.inwardedQty || 0),
            costPrice: r.unitPrice || 0,
            tray: { name: 'Inward Queue (Pending)', capacity: '-' },
            location: { name: 'Inward Queue' },
            isReceipt: true,
            sourceType: isRx ? 'RX' : 'STOCK',
            poNumber: r.purchaseOrder?.poNumber || null,
          };
        });

      return [...formattedPhysical, ...formattedReceipts];
    };

    if (saleOrder.rightEye) {
      results.rightEyeMatches = await loadEyeMatches('right');
    }
    if (saleOrder.leftEye) {
      results.leftEyeMatches = await loadEyeMatches('left');
    }

    let rightEyeMatches = results.rightEyeMatches;
    let leftEyeMatches = results.leftEyeMatches;

    if (applySoftClaims) {
      const earlierWhere = {
        deleteStatus: false,
        status: { in: INVENTORY_QUEUE_STATUSES },
      };
      if (saleOrderId) {
        earlierWhere.id = { not: saleOrderId };
      }
      if (procurementType) {
        earlierWhere.procurementType = procurementType;
      }

      if (!softClaimAsNewest && saleOrderId && saleOrder.createdAt) {
        earlierWhere.OR = [
          { createdAt: { lt: saleOrder.createdAt } },
          {
            AND: [
              { createdAt: saleOrder.createdAt },
              { id: { lt: saleOrderId } },
            ],
          },
        ];
      }

      const earlierWaiting = await prisma.saleOrder.findMany({
        where: earlierWhere,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          rightEye: true,
          leftEye: true,
          createdAt: true,
          procurementType: true,
        },
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
  }

  /**
   * Preview available physical stock counts for create/draft SO lens specs.
   * Excludes soft-reserved units; does not block save when zero.
   */
  async previewStockAvailability(payload = {}) {
    try {
      const lens_id = payload.lens_id != null ? parseInt(payload.lens_id, 10) : null;
      const coating_id =
        payload.coating_id != null ? parseInt(payload.coating_id, 10) : null;
      const category_id =
        payload.category_id != null ? parseInt(payload.category_id, 10) : null;
      const Type_id = payload.Type_id != null ? parseInt(payload.Type_id, 10) : null;
      const excludeSaleOrderId =
        payload.excludeSaleOrderId != null
          ? parseInt(payload.excludeSaleOrderId, 10)
          : null;

      if (!lens_id) {
        throw new APIError(
          'Lens is required for stock preview',
          400,
          'STOCK_PREVIEW_VALIDATION'
        );
      }

      let procurementType =
        payload.procurementType === 'STOCK' || payload.procurementType === 'RX'
          ? payload.procurementType
          : null;

      if (!procurementType && Type_id) {
        const lensType = await prisma.lensTypeMaster.findUnique({
          where: { id: Type_id, deleteStatus: false },
          select: { name: true },
        });
        if (lensType?.name === 'STOCK' || lensType?.name === 'RX') {
          procurementType = lensType.name;
        }
      }
      if (!procurementType) procurementType = 'RX';

      let categoryName = null;
      if (category_id) {
        const category = await prisma.lensCategoryMaster.findUnique({
          where: { id: category_id, deleteStatus: false },
          select: { name: true },
        });
        categoryName = category?.name || null;
      }

      const rightEye = Boolean(payload.rightEye);
      const leftEye = Boolean(payload.leftEye);

      const specs = {
        id: Number.isFinite(excludeSaleOrderId) ? excludeSaleOrderId : null,
        lens_id,
        coating_id,
        category_id: category_id || null,
        procurementType,
        category: { name: categoryName },
        rightEye,
        leftEye,
        rightSpherical: payload.rightSpherical,
        rightCylindrical: payload.rightCylindrical,
        rightAdd: payload.rightAdd,
        leftSpherical: payload.leftSpherical,
        leftCylindrical: payload.leftCylindrical,
        leftAdd: payload.leftAdd,
      };

      const matches = await this.findMatchingInventoryBySpecs(specs, {
        applySoftClaims: true,
        softClaimAsNewest: true,
      });

      const sumPhysicalQty = (rows = []) =>
        rows
          .filter((m) => !m.isReceipt)
          .reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);

      return {
        procurementType,
        rightEye,
        leftEye,
        rightAvailable: rightEye ? sumPhysicalQty(matches.rightEyeMatches) : 0,
        leftAvailable: leftEye ? sumPhysicalQty(matches.leftEyeMatches) : 0,
      };
    } catch (error) {
      console.error('Error in previewStockAvailability:', error);
      if (error instanceof APIError) throw error;
      throw new APIError(
        'Failed to preview stock availability',
        500,
        'STOCK_PREVIEW_ERROR'
      );
    }
  }

  /**
   * Get matching available inventory items on a FIFO basis for a sale order.
   * When applySoftClaims is true (default), units soft-claimed by earlier
   * waiting queue SOs (same procurement type) are excluded.
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
        },
      });

      if (!saleOrder) {
        throw new APIError('Sale order not found', 404, 'ORDER_NOT_FOUND');
      }

      return this.findMatchingInventoryBySpecs(saleOrder, { applySoftClaims });
    } catch (error) {
      console.error('Error in getMatchingInventoryFIFO:', error);
      if (error instanceof APIError) throw error;
      throw new APIError('Failed to get matching inventory', 500, 'FIFO_MATCH_ERROR');
    }
  }

  /**
   * Get alternate-lens matching inventory for a sale order (M2).
   * Matches on SPH/CYL/ADD only (per enabled eye) — explicitly ignores
   * coating_id, lens_id/brand, and category_id so any in-stock power-matching
   * item qualifies. Excludes hard-RESERVED stock and (optionally) units
   * soft-claimed by earlier waiting queue SOs' own alternate matches.
   * @param {number} saleOrderId
   * @param {{ applySoftClaims?: boolean }} [options]
   */
  async getAlternateMatchingInventory(saleOrderId, options = {}) {
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

      // Power-only where clause: intentionally does NOT filter by lens_id,
      // coating_id, category_id, or Type_id (user-confirmed alternate rule).
      const buildAlternateWhereClause = (eyeType) => {
        const where = {
          status: 'AVAILABLE',
          deleteStatus: false,
          quantity: { gt: 0 },
        };

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
            OR: [leftSpecWhere, rightSpecWhere]
          });
        }

        return where;
      };

      const identityInclude = {
        location: { select: { id: true, name: true } },
        tray: { select: { id: true, name: true, capacity: true } },
        lensProduct: {
          select: {
            id: true,
            lens_name: true,
            product_code: true,
            brand: { select: { id: true, name: true } },
          },
        },
        category: { select: { id: true, name: true } },
        coating: { select: { id: true, name: true } },
        purchaseOrder: { select: { id: true, poNumber: true, saleOrderId: true } },
      };

      const results = { rightEyeMatches: [], leftEyeMatches: [] };

      if (saleOrder.rightEye) {
        const physical = await prisma.inventoryItem.findMany({
          where: buildAlternateWhereClause('right'),
          orderBy: { inwardDate: 'asc' },
          include: identityInclude,
        });
        results.rightEyeMatches = physical.map((item) => {
          const isRx = item.purchaseOrder?.saleOrderId !== null && item.purchaseOrder?.saleOrderId !== undefined;
          return {
            ...item,
            id: `inv_${item.id}`,
            sourceType: isRx ? 'RX' : 'STOCK',
            poNumber: item.purchaseOrder?.poNumber || null,
            isAlternate: true,
          };
        });
      }

      if (saleOrder.leftEye) {
        const physical = await prisma.inventoryItem.findMany({
          where: buildAlternateWhereClause('left'),
          orderBy: { inwardDate: 'asc' },
          include: identityInclude,
        });
        results.leftEyeMatches = physical.map((item) => {
          const isRx = item.purchaseOrder?.saleOrderId !== null && item.purchaseOrder?.saleOrderId !== undefined;
          return {
            ...item,
            id: `inv_${item.id}`,
            sourceType: isRx ? 'RX' : 'STOCK',
            poNumber: item.purchaseOrder?.poNumber || null,
            isAlternate: true,
          };
        });
      }

      let { rightEyeMatches, leftEyeMatches } = results;

      // Exclude units soft-claimed by earlier waiting SOs' own alternate matches
      // (display-only pool; no DB write) — mirrors getMatchingInventoryFIFO.
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
            const earlierMatches = await this.getAlternateMatchingInventory(earlier.id, {
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
      console.error('Error in getAlternateMatchingInventory:', error);
      if (error instanceof APIError) throw error;
      throw new APIError('Failed to get alternate matching inventory', 500, 'ALTERNATE_MATCH_ERROR');
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
      const where = this.buildSaleOrderListWhere(filters);
      const { startDate, endDate, start_date, end_date, ...undatedFilters } = filters;
      const whereOpen = this.buildSaleOrderListWhere(undatedFilters);

      const sumAdditional = (additionalPrice) => {
        if (!Array.isArray(additionalPrice)) return 0;
        return additionalPrice.reduce(
          (s, x) => s + (parseFloat(x?.value ?? x?.amount) || 0),
          0
        );
      };

      const orderTotal = (o) => {
        const lensPrice = o.lensPrice || 0;
        const extras =
          (o.fittingPrice || 0) +
          (o.tintingPrice || 0) +
          (o.rightEyeExtra || 0) +
          (o.leftEyeExtra || 0);
        const disc = lensPrice * ((o.discount || 0) / 100);
        return Math.round((lensPrice - disc + extras + sumAdditional(o.additionalPrice)) * 100) / 100;
      };

      const [
        totalOrders,
        pendingOrders,
        urgentOrders,
        readyToDispatch,
        poPending,
        valueRows,
      ] = await Promise.all([
        prisma.saleOrder.count({ where }),
        prisma.saleOrder.count({ where: { AND: [whereOpen, { status: 'DRAFT' }] } }),
        prisma.saleOrder.count({ where: { AND: [whereOpen, { urgentOrder: true }] } }),
        prisma.saleOrder.count({ where: { AND: [whereOpen, { status: 'READY_FOR_DISPATCH' }] } }),
        prisma.saleOrder.count({ where: { AND: [whereOpen, { status: 'PO_RAISED' }] } }),
        prisma.saleOrder.findMany({
          where,
          select: {
            lensPrice: true,
            fittingPrice: true,
            tintingPrice: true,
            rightEyeExtra: true,
            leftEyeExtra: true,
            discount: true,
            additionalPrice: true,
          },
        }),
      ]);

      const totalOrderValue = Math.round(
        valueRows.reduce((sum, row) => sum + orderTotal(row), 0) * 100
      ) / 100;

      return {
        totalOrders,
        totalOrderValue,
        pendingOrders,
        urgentOrders,
        readyToDispatch,
        poPending,
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
            mrdRefNo: existing.mrdRefNo,
            freeLens: existing.freeLens,
            urgentOrder: existing.urgentOrder,
            freeFitting: existing.freeFitting,
            ...(existing.freeLens
              ? pendingFreeLensApprovalFields()
              : clearedFreeLensApprovalFields()),
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

  /**
   * Recent (active) sale orders for a customer — used on SO create form.
   * Excludes terminal statuses: DELIVERED, INVOICED, COMPLETED, CANCELLED.
   * @param {number} customerId
   * @returns {Promise<Array<{id:number,orderNo:string,orderDate:Date,status:string}>>}
   */
  async getRecentOrdersByCustomer(customerId) {
    const id = parseInt(customerId, 10);
    if (isNaN(id) || id <= 0) {
      throw new APIError('Invalid customer ID', 400, 'INVALID_CUSTOMER_ID');
    }

    const EXCLUDED = ['DELIVERED', 'INVOICED', 'COMPLETED', 'CANCELLED'];

    return prisma.saleOrder.findMany({
      where: {
        customerId: id,
        deleteStatus: false,
        status: { notIn: EXCLUDED },
      },
      select: {
        id: true,
        orderNo: true,
        orderDate: true,
        status: true,
        rightEye: true,
        leftEye: true,
        rightSpherical: true,
        rightCylindrical: true,
        rightAxis: true,
        rightAdd: true,
        rightDia: true,
        leftSpherical: true,
        leftCylindrical: true,
        leftAxis: true,
        leftAdd: true,
        leftDia: true,
        lensProduct: {
          select: {
            lens_name: true,
            index: { select: { index_name: true } },
          },
        },
        lensType: { select: { name: true } },
        category: { select: { name: true } },
        coating: { select: { name: true } },
      },
      orderBy: { orderDate: 'desc' },
    });
  }

  /**
   * Admin approves Free Lens on a sale order.
   */
  async approveFreeLens(id, userId, user, remark = null) {
    if (!isAdminUser(user)) {
      throw new APIError('Only Admin can approve Free Lens', 403, 'FORBIDDEN');
    }
    const existing = await prisma.saleOrder.findUnique({ where: { id } });
    if (!existing || existing.deleteStatus) {
      throw new APIError('Sale order not found', 404, 'ORDER_NOT_FOUND');
    }
    if (!existing.freeLens) {
      throw new APIError('Sale order does not have Free Lens enabled', 400, 'FREE_LENS_NOT_SET');
    }
    if (existing.freeLensApprovalStatus === FREE_LENS_APPROVAL.APPROVED) {
      throw new APIError('Free Lens is already approved', 400, 'FREE_LENS_ALREADY_APPROVED');
    }

    return prisma.saleOrder.update({
      where: { id },
      data: {
        freeLensApprovalStatus: FREE_LENS_APPROVAL.APPROVED,
        freeLensApprovedBy: userId,
        freeLensApprovedAt: new Date(),
        freeLensRejectedBy: null,
        freeLensRejectedAt: null,
        freeLensApprovalRemark: remark?.trim() || null,
        updatedBy: userId,
      },
      include: {
        freeLensApprovedByUser: { select: { id: true, name: true, email: true } },
        freeLensRejectedByUser: { select: { id: true, name: true, email: true } },
      },
    });
  }

  /**
   * Admin rejects Free Lens on a sale order.
   */
  async rejectFreeLens(id, userId, user, remark = null) {
    if (!isAdminUser(user)) {
      throw new APIError('Only Admin can reject Free Lens', 403, 'FORBIDDEN');
    }
    const existing = await prisma.saleOrder.findUnique({ where: { id } });
    if (!existing || existing.deleteStatus) {
      throw new APIError('Sale order not found', 404, 'ORDER_NOT_FOUND');
    }
    if (!existing.freeLens) {
      throw new APIError('Sale order does not have Free Lens enabled', 400, 'FREE_LENS_NOT_SET');
    }
    if (existing.freeLensApprovalStatus === FREE_LENS_APPROVAL.REJECTED) {
      throw new APIError('Free Lens is already rejected', 400, 'FREE_LENS_ALREADY_REJECTED');
    }

    return prisma.saleOrder.update({
      where: { id },
      data: {
        freeLensApprovalStatus: FREE_LENS_APPROVAL.REJECTED,
        freeLensRejectedBy: userId,
        freeLensRejectedAt: new Date(),
        freeLensApprovedBy: null,
        freeLensApprovedAt: null,
        freeLensApprovalRemark: remark?.trim() || null,
        updatedBy: userId,
      },
      include: {
        freeLensApprovedByUser: { select: { id: true, name: true, email: true } },
        freeLensRejectedByUser: { select: { id: true, name: true, email: true } },
      },
    });
  }
}

export default SaleOrderService;
