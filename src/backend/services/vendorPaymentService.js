import prisma from '../config/prisma.js';
import { APIError } from '../middleware/errorHandler.js';
import { generateVoucherNumber, postVendorPayment } from './accountingService.js';

export class VendorPaymentService {

  async generateVoucherNo() {
    return generateVoucherNumber();
  }

  async list({ vendorId, from, to, paymentMethod, page = 1, limit = 20 }) {
    const where = {
      delete_status: false,
      ...(vendorId && { vendorId: parseInt(vendorId) }),
      ...(paymentMethod && { paymentMethod }),
      ...((from || to) && {
        paymentDate: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) }),
        },
      }),
    };
    const [data, total] = await Promise.all([
      prisma.vendorPaymentVoucher.findMany({
        where,
        include: {
          vendor: { select: { id: true, code: true, name: true } },
          bankLedger: { select: { id: true, ledgerName: true } },
          items: { include: { purchaseOrder: { select: { id: true, poNumber: true } } } },
        },
        orderBy: { paymentDate: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.vendorPaymentVoucher.count({ where }),
    ]);
    return { data, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id) {
    const v = await prisma.vendorPaymentVoucher.findFirst({
      where: { id, delete_status: false },
      include: {
        vendor: true,
        bankLedger: true,
        items: { include: { purchaseOrder: { select: { id: true, poNumber: true, totalValue: true, receivedQty: true } } } },
        createdByUser: { select: { id: true, name: true } },
      },
    });
    if (!v) throw new APIError('Voucher not found', 404, 'NOT_FOUND');
    return v;
  }

  async closeVoucher(id, userId) {
    const v = await prisma.vendorPaymentVoucher.findFirst({
      where: { id, delete_status: false },
    });
    if (!v) throw new APIError('Voucher not found', 404, 'NOT_FOUND');
    if (v.closedStatus) throw new APIError('Voucher already closed', 400, 'ALREADY_CLOSED');

    return prisma.vendorPaymentVoucher.update({
      where: { id },
      data: { closedStatus: true, closedAt: new Date(), updatedBy: userId },
      include: {
        vendor: true,
        bankLedger: true,
        items: { include: { purchaseOrder: { select: { id: true, poNumber: true, totalValue: true, receivedQty: true } } } },
        createdByUser: { select: { id: true, name: true } },
      },
    });
  }

  async getOutstanding(vendorId) {
    if (!vendorId) throw new APIError('vendorId is required', 400, 'VALIDATION_ERROR');
    const vid = parseInt(vendorId);

    const vendor = await prisma.vendor.findFirst({ where: { id: vid }, select: { id: true, name: true, code: true } });
    if (!vendor) throw new APIError('Vendor not found', 404, 'VENDOR_NOT_FOUND');

    // All POs for this vendor with values
    const pos = await prisma.purchaseOrder.findMany({
      where: { vendorId: vid, deleteStatus: false, status: { in: ['RECEIVED', 'INVOICE_RECEIVED'] } },
      select: { id: true, poNumber: true, totalValue: true, receivedQty: true, quantity: true },
    });

    // Sum all payments allocated per PO
    const allocations = await prisma.vendorPaymentVoucherItem.findMany({
      where: { purchaseOrderId: { in: pos.map(p => p.id) } },
      select: { purchaseOrderId: true, allocatedAmount: true },
    });

    const paidByPo = allocations.reduce((acc, a) => {
      acc[a.purchaseOrderId] = (acc[a.purchaseOrderId] || 0) + parseFloat(a.allocatedAmount);
      return acc;
    }, {});

    const purchaseOrders = pos.map(po => {
      const paid = paidByPo[po.id] || 0;
      const outstanding = parseFloat(po.totalValue) - paid;
      return { purchaseOrderId: po.id, poNumber: po.poNumber, totalValue: parseFloat(po.totalValue).toFixed(2), paidAmount: paid.toFixed(2), outstanding: outstanding.toFixed(2) };
    });

    const totalPayable = purchaseOrders.reduce((s, p) => s + parseFloat(p.totalValue), 0);
    const totalPaid = purchaseOrders.reduce((s, p) => s + parseFloat(p.paidAmount), 0);

    return {
      vendorId: vendor.id, vendorName: vendor.name,
      totalPayable: totalPayable.toFixed(2),
      totalPaid: totalPaid.toFixed(2),
      outstanding: (totalPayable - totalPaid).toFixed(2),
      purchaseOrders,
    };
  }

  async create({ vendorId, paymentDate, paymentMethod, bankLedgerId, referenceNo, notes, items }, userId) {
    if (!vendorId || !paymentMethod || !bankLedgerId || !items?.length)
      throw new APIError('vendorId, paymentMethod, bankLedgerId, items[] required', 400, 'VALIDATION_ERROR');

    const totalAmount = items.reduce((s, i) => s + parseFloat(i.allocatedAmount), 0);
    if (totalAmount <= 0) throw new APIError('Total amount must be greater than zero', 400, 'VALIDATION_ERROR');

    // Validate all POs belong to vendor
    const poIds = items.map(i => parseInt(i.purchaseOrderId));
    const pos = await prisma.purchaseOrder.findMany({ where: { id: { in: poIds }, vendorId: parseInt(vendorId) } });
    if (pos.length !== poIds.length) throw new APIError('One or more POs do not belong to this vendor', 400, 'INVALID_PO');

    const vendor = await prisma.vendor.findUnique({ where: { id: parseInt(vendorId) }, select: { id: true, code: true, ledgerId: true } });
    if (!vendor) throw new APIError('Vendor not found', 404, 'VENDOR_NOT_FOUND');

    const voucherNumber = await generateVoucherNumber();

    return prisma.$transaction(async (tx) => {
      const voucher = await tx.vendorPaymentVoucher.create({
        data: {
          voucherNumber,
          vendorId: parseInt(vendorId),
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          totalAmount,
          paymentMethod,
          bankLedgerId: parseInt(bankLedgerId),
          referenceNo: referenceNo || null,
          notes: notes || null,
          createdBy: userId,
          items: {
            create: items.map(i => ({
              purchaseOrderId: parseInt(i.purchaseOrderId),
              allocatedAmount: parseFloat(i.allocatedAmount),
              notes: i.notes || null,
            })),
          },
        },
        include: { items: true },
      });

      await postVendorPayment(tx, {
        voucherId: voucher.id,
        voucherNumber,
        totalAmount,
        bankLedgerId: parseInt(bankLedgerId),
        vendor,
      }, userId);

      return voucher;
    });
  }
}
