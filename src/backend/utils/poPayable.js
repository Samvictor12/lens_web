/** Shared PO payable / payment-status helpers (vendor payments + PO stage sync). */

export function round2(n) {
  return Math.round(parseFloat(n) * 100) / 100;
}

function sumReceiptItems(receivedItems) {
  if (!Array.isArray(receivedItems)) return 0;
  return receivedItems.reduce(
    (sum, item) => sum + (parseFloat(item.receivedQty) || 0) * (parseFloat(item.unitPrice) || 0),
    0
  );
}

/** Payable base: PO header → receipt totals → line economics → qty × unit price */
export function computePayableAmount(po, receipts = []) {
  const header = round2(parseFloat(po.totalValue) || 0);
  if (header > 0.01) return header;

  let fromReceipts = 0;
  for (const r of receipts) {
    let rv = parseFloat(r.totalValue) || 0;
    if (rv <= 0.01) rv = sumReceiptItems(r.receivedItems);
    if (rv <= 0.01) rv = (parseFloat(r.subtotal) || 0) + (parseFloat(r.taxAmount) || 0);
    fromReceipts += rv;
  }
  fromReceipts = round2(fromReceipts);
  if (fromReceipts > 0.01) return fromReceipts;

  const poSubtotal = round2(parseFloat(po.subtotal) || 0);
  const poTax = round2(parseFloat(po.taxAmount) || 0);
  if (poSubtotal + poTax > 0.01) return round2(poSubtotal + poTax);

  const qty = parseFloat(po.receivedQty) || parseFloat(po.quantity) || 0;
  const unit = parseFloat(po.unitPrice) || 0;
  if (qty * unit > 0.01) return round2(qty * unit);

  return 0;
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

  const [allocations, receipts] = await Promise.all([
    tx.vendorPaymentVoucherItem.findMany({
      where: { purchaseOrderId: { in: uniqueIds } },
      select: { purchaseOrderId: true, allocatedAmount: true },
    }),
    tx.purchaseOrderReceipt.findMany({
      where: { purchaseOrderId: { in: uniqueIds }, deleteStatus: false },
      select: {
        purchaseOrderId: true,
        totalValue: true,
        subtotal: true,
        taxAmount: true,
        receivedItems: true,
      },
    }),
  ]);

  const paidByPo = allocations.reduce((acc, a) => {
    acc[a.purchaseOrderId] = (acc[a.purchaseOrderId] || 0) + parseFloat(a.allocatedAmount);
    return acc;
  }, {});

  const receiptsByPo = receipts.reduce((acc, r) => {
    if (!acc[r.purchaseOrderId]) acc[r.purchaseOrderId] = [];
    acc[r.purchaseOrderId].push(r);
    return acc;
  }, {});

  for (const po of pos) {
    if (po.status === 'PAID' || po.status === 'CANCELLED') continue;
    if (!PO_PAYMENT_ELIGIBLE_STATUSES.includes(po.status)) continue;

    const payable = computePayableAmount(po, receiptsByPo[po.id] || []);
    const paid = paidByPo[po.id] || 0;

    if (payable > 0.01 && paid >= payable - 0.01) {
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { status: 'PAID', updatedBy: userId },
      });
    }
  }
}
