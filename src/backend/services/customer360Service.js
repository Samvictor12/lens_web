import prisma from '../config/prisma.js';
import { APIError } from '../middleware/errorHandler.js';

const CARD_KEYS = [
  'ordersMonth',
  'inProduction',
  'inDispatch',
  'delivered',
  'collectionTarget',
  'collectionActual',
];

/** SO statuses in active lab/fitting/QC/PO path (contract Section 2). */
const IN_PRODUCTION_STATUSES = [
  'PO_RAISED',
  'PO_RECEIVED',
  'PO_CANCELLED',
  'PRE_QC',
  'PRE_QC_REJECTED',
  'PRE_QC_SCRAPPED',
  'FITTING_READY',
  'IN_FITTING',
  'ON_HOLD',
  'AWAITING_QUALITY',
  'POST_QC_REJECTED',
  'POST_QC_SCRAPPED',
];

const IN_DISPATCH_STATUSES = ['READY_FOR_DISPATCH', 'READY_FOR_PICKUP', 'DISPATCHED'];

function monthBounds(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function parseCustomerId(customerId) {
  const id = parseInt(customerId, 10);
  if (!Number.isFinite(id) || id <= 0) {
    throw new APIError('Invalid customerId', 400, 'VALIDATION_ERROR');
  }
  return id;
}

function outstandingBalance(inv) {
  return Math.max(0, (inv.totalAmount || 0) - (inv.paidAmount || 0));
}

function agingBucket(dueDate, now = new Date()) {
  const due = new Date(dueDate);
  const daysPastDue = Math.floor((now.getTime() - due.getTime()) / (24 * 60 * 60 * 1000));
  if (daysPastDue <= 30) return '0_30';
  if (daysPastDue <= 60) return '31_60';
  return '61_90_plus';
}

function cardWhere(cardKey, customerId, { start, end }) {
  const soBase = { customerId, deleteStatus: false };
  switch (cardKey) {
    case 'ordersMonth':
      return {
        type: 'saleOrder',
        where: { ...soBase, createdAt: { gte: start, lte: end }, status: { not: 'CANCELLED' } },
      };
    case 'inProduction':
      return {
        type: 'saleOrder',
        where: { ...soBase, status: { in: IN_PRODUCTION_STATUSES } },
      };
    case 'inDispatch':
      return {
        type: 'saleOrder',
        where: { ...soBase, status: { in: IN_DISPATCH_STATUSES } },
      };
    case 'delivered':
      return {
        type: 'saleOrder',
        where: {
          ...soBase,
          status: 'DELIVERED',
          updatedAt: { gte: start, lte: end },
        },
      };
    case 'collectionTarget':
      return {
        type: 'invoice',
        where: {
          customerId,
          deleteStatus: false,
          status: { in: ['ISSUED', 'PARTIALLY_PAID'] },
          dueDate: { gte: start, lte: end },
        },
      };
    case 'collectionActual':
      return {
        type: 'payment',
        where: {
          customerId,
          delete_status: false,
          cancelledStatus: false,
          paymentDate: { gte: start, lte: end },
        },
      };
    default:
      throw new APIError(`Unknown cardKey: ${cardKey}`, 400, 'VALIDATION_ERROR');
  }
}

export class Customer360Service {
  async getOverview(customerId) {
    const id = parseCustomerId(customerId);
    const { start, end } = monthBounds();
    const now = new Date();

    const customer = await prisma.customer.findFirst({
      where: { id, delete_status: false },
      select: {
        id: true,
        code: true,
        name: true,
        shopname: true,
        phone: true,
        email: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        gstin: true,
        credit_limit: true,
        credit_days: true,
        outstanding_credit: true,
        advance_credit: true,
        ledgerId: true,
        category: { select: { id: true, name: true } },
        salePerson: { select: { id: true, name: true } },
      },
    });
    if (!customer) throw new APIError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');

    const [
      priceMappingAgg,
      creditNoteAgg,
      lastPayment,
      ordersMonth,
      inProduction,
      inDispatch,
      delivered,
      targetInvoices,
      collectionActualAgg,
      topLensRaw,
      outstandingInvoices,
    ] = await Promise.all([
      prisma.priceMapping.aggregate({
        where: { customer_id: id },
        _count: { id: true },
        _avg: { discountRate: true },
      }),
      prisma.creditNote.aggregate({
        where: { customerId: id, status: { not: 'CANCELLED' } },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.customerPaymentVoucher.findFirst({
        where: { customerId: id, delete_status: false, cancelledStatus: false },
        orderBy: [{ paymentDate: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          receiptNumber: true,
          totalAmount: true,
          paymentDate: true,
          paymentMethod: true,
        },
      }),
      prisma.saleOrder.count({
        where: {
          customerId: id,
          deleteStatus: false,
          createdAt: { gte: start, lte: end },
          status: { not: 'CANCELLED' },
        },
      }),
      prisma.saleOrder.count({
        where: {
          customerId: id,
          deleteStatus: false,
          status: { in: IN_PRODUCTION_STATUSES },
        },
      }),
      prisma.saleOrder.count({
        where: {
          customerId: id,
          deleteStatus: false,
          status: { in: IN_DISPATCH_STATUSES },
        },
      }),
      prisma.saleOrder.count({
        where: {
          customerId: id,
          deleteStatus: false,
          status: 'DELIVERED',
          updatedAt: { gte: start, lte: end },
        },
      }),
      prisma.invoice.findMany({
        where: {
          customerId: id,
          deleteStatus: false,
          status: { in: ['ISSUED', 'PARTIALLY_PAID'] },
          dueDate: { gte: start, lte: end },
        },
        select: { totalAmount: true, paidAmount: true },
      }),
      prisma.customerPaymentVoucher.aggregate({
        where: {
          customerId: id,
          delete_status: false,
          cancelledStatus: false,
          paymentDate: { gte: start, lte: end },
        },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      prisma.saleOrder.groupBy({
        by: ['lens_id'],
        where: {
          customerId: id,
          deleteStatus: false,
          status: { not: 'CANCELLED' },
          lens_id: { not: null },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      prisma.invoice.findMany({
        where: {
          customerId: id,
          deleteStatus: false,
          status: { in: ['ISSUED', 'PARTIALLY_PAID'] },
        },
        select: { dueDate: true, totalAmount: true, paidAmount: true },
      }),
    ]);

    const lensIds = topLensRaw.map((r) => r.lens_id).filter(Boolean);
    const products = lensIds.length
      ? await prisma.lensProductMaster.findMany({
          where: { id: { in: lensIds } },
          select: { id: true, lens_name: true, product_code: true },
        })
      : [];
    const productMap = new Map(products.map((p) => [p.id, p]));

    const topLens = topLensRaw.map((r) => {
      const p = productMap.get(r.lens_id);
      return {
        lensId: r.lens_id,
        name: p?.lens_name || `Lens #${r.lens_id}`,
        productCode: p?.product_code || null,
        orderCount: r._count.id,
      };
    });

    const aging = {
      '0_30': { count: 0, amount: 0 },
      '31_60': { count: 0, amount: 0 },
      '61_90_plus': { count: 0, amount: 0 },
    };
    for (const inv of outstandingInvoices) {
      const bal = outstandingBalance(inv);
      if (bal <= 0) continue;
      const key = agingBucket(inv.dueDate, now);
      aging[key].count += 1;
      aging[key].amount += bal;
    }
    for (const k of Object.keys(aging)) {
      aging[k].amount = Math.round(aging[k].amount * 100) / 100;
    }

    const mappingCount = priceMappingAgg._count?.id || 0;
    const avgRate = priceMappingAgg._avg?.discountRate;
    const discounts =
      mappingCount > 0
        ? {
            mappingCount,
            avgDiscountRate: Math.round((avgRate || 0) * 100) / 100,
            label: `${mappingCount} price mapping(s), avg ${Math.round((avgRate || 0) * 100) / 100}%`,
          }
        : null;

    const collectionTargetAmount = targetInvoices.reduce(
      (s, inv) => s + outstandingBalance(inv),
      0
    );
    const collectionActualAmount = parseFloat(collectionActualAgg._sum.totalAmount || 0);

    return {
      customer,
      metrics: {
        billingCycle: customer.credit_days ?? null,
        creditLimit: customer.credit_limit ?? null,
        outstandingCredit: customer.outstanding_credit ?? 0,
        discounts,
        totalCreditNotes: parseFloat(creditNoteAgg._sum.amount || 0),
        creditNoteCount: creditNoteAgg._count?.id || 0,
        lastPayment: lastPayment
          ? {
              id: lastPayment.id,
              receiptNumber: lastPayment.receiptNumber,
              amount: parseFloat(lastPayment.totalAmount || 0),
              paymentDate: lastPayment.paymentDate,
              paymentMethod: lastPayment.paymentMethod,
            }
          : null,
      },
      cards: {
        ordersMonth: { count: ordersMonth },
        inProduction: { count: inProduction },
        inDispatch: { count: inDispatch },
        delivered: { count: delivered },
        collectionTarget: {
          count: targetInvoices.length,
          amount: Math.round(collectionTargetAmount * 100) / 100,
        },
        collectionActual: {
          count: collectionActualAgg._count?.id || 0,
          amount: Math.round(collectionActualAmount * 100) / 100,
        },
      },
      topLens,
      aging30_60_90: aging,
      month: { start, end },
    };
  }

  async getCardList(customerId, cardKey, { page = 1, limit = 5 } = {}) {
    const id = parseCustomerId(customerId);
    if (!CARD_KEYS.includes(cardKey)) {
      throw new APIError(
        `Invalid cardKey. Expected one of: ${CARD_KEYS.join(', ')}`,
        400,
        'VALIDATION_ERROR'
      );
    }

    const customer = await prisma.customer.findFirst({
      where: { id, delete_status: false },
      select: { id: true },
    });
    if (!customer) throw new APIError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(5, Math.max(1, parseInt(limit, 10) || 5));
    const skip = (pageNum - 1) * pageSize;
    const bounds = monthBounds();
    const { type, where } = cardWhere(cardKey, id, bounds);

    if (type === 'saleOrder') {
      const [rows, total] = await Promise.all([
        prisma.saleOrder.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            orderNo: true,
            status: true,
            orderDate: true,
            createdAt: true,
            updatedAt: true,
            customerRefNo: true,
            lensProduct: { select: { lens_name: true, product_code: true } },
          },
        }),
        prisma.saleOrder.count({ where }),
      ]);
      return {
        cardKey,
        data: rows,
        pagination: {
          page: pageNum,
          limit: pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
      };
    }

    if (type === 'invoice') {
      const [rows, total] = await Promise.all([
        prisma.invoice.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { dueDate: 'asc' },
          select: {
            id: true,
            invoiceNo: true,
            status: true,
            totalAmount: true,
            paidAmount: true,
            dueDate: true,
            createdAt: true,
          },
        }),
        prisma.invoice.count({ where }),
      ]);
      return {
        cardKey,
        data: rows.map((r) => ({
          ...r,
          balance: outstandingBalance(r),
        })),
        pagination: {
          page: pageNum,
          limit: pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
      };
    }

    const [rows, total] = await Promise.all([
      prisma.customerPaymentVoucher.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { paymentDate: 'desc' },
        select: {
          id: true,
          receiptNumber: true,
          totalAmount: true,
          advanceAmount: true,
          paymentDate: true,
          paymentMethod: true,
          referenceNo: true,
        },
      }),
      prisma.customerPaymentVoucher.count({ where }),
    ]);
    return {
      cardKey,
      data: rows.map((r) => ({
        ...r,
        totalAmount: parseFloat(r.totalAmount || 0),
        advanceAmount: parseFloat(r.advanceAmount || 0),
      })),
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }
}

export default new Customer360Service();
