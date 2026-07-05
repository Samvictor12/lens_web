/** Shared PO payable / payment-status helpers (vendor payments + PO stage sync). */

export function round2(n) {
  return Math.round(parseFloat(n) * 100) / 100;
}

/** Payable for vendor payment — PO header value set at payment time, not from receipts. */
export function computePayableAmount(po) {
  return round2(parseFloat(po.totalValue) || 0);
}

export const PO_PAYABLE_SELECT = {
  id: true,
  poNumber: true,
  totalValue: true,
  subtotal: true,
  taxAmount: true,
  unitPrice: true,
  quantity: true,
  receivedQty: true,
  status: true,
  orderDate: true,
  expectedDeliveryDate: true,
  vendorId: true,
};

/** POs eligible for vendor payment (received, not yet fully paid to vendor). */
export const PO_PAYMENT_ELIGIBLE_STATUSES = ['PO_PARTIAL_RECEIVED', 'RECEIVED', 'INVOICE_RECEIVED'];

/**
 * After vendor payment: set status to PAID only when fully paid (no partial-paid stage).
 * Partial payments leave PO at PO_PARTIAL_RECEIVED / RECEIVED.
 */
export async function syncPoPaidStatus(tx, poIds, userId) {
  if (!poIds?.length) return;

  const uniqueIds = [...new Set(poIds.map((id) => parseInt(id)).filter(Boolean))];
  const pos = await tx.purchaseOrder.findMany({
    where: { id: { in: uniqueIds }, deleteStatus: false },
    select: PO_PAYABLE_SELECT,
  });

  if (!pos.length) return;

  const [allocations] = await Promise.all([
    tx.vendorPaymentVoucherItem.findMany({
      where: { purchaseOrderId: { in: uniqueIds } },
      select: { purchaseOrderId: true, allocatedAmount: true },
    }),
  ]);

  const paidByPo = allocations.reduce((acc, a) => {
    acc[a.purchaseOrderId] = (acc[a.purchaseOrderId] || 0) + parseFloat(a.allocatedAmount);
    return acc;
  }, {});

  for (const po of pos) {
    if (po.status === 'PAID' || po.status === 'CANCELLED') continue;
    if (!PO_PAYMENT_ELIGIBLE_STATUSES.includes(po.status)) continue;

    const payable = computePayableAmount(po);
    const paid = paidByPo[po.id] || 0;

    if (payable > 0.01 && paid >= payable - 0.01) {
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { status: 'PAID', updatedBy: userId },
      });
    }
  }
}
