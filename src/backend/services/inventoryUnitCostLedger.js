import { APIError } from '../middleware/errorHandler.js';

export const UNIT_COST_SOURCE_TYPES = ['INWARD_PO', 'INWARD_DIRECT', 'TRANSFER'];

export function sourceLedgerFields(quantity) {
  const qty = Number(quantity) || 0;
  return { remainingQty: qty, status: 'OPEN' };
}

export function nonSourceLedgerFields() {
  return { remainingQty: 0 };
}

/**
 * Unit price already locked by a vendor bill for this PO, or computable from the bill line.
 * @param {object} client
 * @param {number} poId
 * @param {number} [upcomingQty=0] extra INWARD_PO qty about to be written (first inward after bill)
 */
export async function resolveBilledPoUnitPrice(client, poId, upcomingQty = 0) {
  if (!poId) return null;

  const priced = await client.inventoryTransaction.findFirst({
    where: {
      purchaseOrderId: poId,
      type: 'INWARD_PO',
      unitPrice: { not: null },
    },
    orderBy: { id: 'desc' },
    select: { unitPrice: true },
  });
  if (priced?.unitPrice != null && Number(priced.unitPrice) !== 0) {
    return Number(priced.unitPrice);
  }

  const viItem = await client.vendorInvoiceItem.findFirst({
    where: {
      purchaseOrderId: poId,
      vendorInvoice: { deleteStatus: false, status: { not: 'CANCELLED' } },
    },
    select: { subtotalAmount: true },
  });
  if (!viItem) return null;

  const agg = await client.inventoryTransaction.aggregate({
    where: { purchaseOrderId: poId, type: 'INWARD_PO' },
    _sum: { quantity: true },
  });
  const qty = Number(agg._sum.quantity || 0) + Number(upcomingQty || 0);
  if (qty <= 0) return null;
  return Number(viItem.subtotalAmount) / qty;
}

/**
 * Vendor bill: unitPrice = line subtotal / sum(INWARD_PO.quantity for that PO).
 * Writes unitPrice+totalValue on those rows and InventoryItem.costPrice.
 */
export async function syncInwardPoPricesFromVendorBill(client, poId, subtotalAmount) {
  const txs = await client.inventoryTransaction.findMany({
    where: { purchaseOrderId: poId, type: 'INWARD_PO' },
    select: { id: true, quantity: true, inventoryItemId: true },
  });
  const totalQty = txs.reduce((sum, t) => sum + Number(t.quantity || 0), 0);
  if (totalQty <= 0) return { unitPrice: null, updated: 0 };

  const unitPrice = Number(subtotalAmount) / totalQty;
  const itemIds = new Set();
  for (const t of txs) {
    await client.inventoryTransaction.update({
      where: { id: t.id },
      data: {
        unitPrice,
        totalValue: Number(t.quantity) * unitPrice,
      },
    });
    if (t.inventoryItemId) itemIds.add(t.inventoryItemId);
  }
  for (const itemId of itemIds) {
    await client.inventoryItem.update({
      where: { id: itemId },
      data: { costPrice: unitPrice },
    });
  }
  return { unitPrice, updated: txs.length };
}

/**
 * FIFO OPEN sources for an inventory item (or a single explicit parentTransactionId).
 * Each unit slot is one entry (the same source may appear remainingQty times).
 */
export async function pickOpenSourceUnits(
  client,
  inventoryItemId,
  units,
  explicitParentId,
  { required = true } = {}
) {
  const need = Math.max(0, Math.round(Number(units) || 0));
  if (need <= 0) return [];

  const where = {
    inventoryItemId,
    status: 'OPEN',
    remainingQty: { gt: 0 },
    type: { in: UNIT_COST_SOURCE_TYPES },
  };
  if (explicitParentId) {
    where.id = parseInt(explicitParentId, 10);
  }

  const sources = await client.inventoryTransaction.findMany({
    where,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });

  const picks = [];
  for (const src of sources) {
    let avail = Number(src.remainingQty || 0);
    while (avail > 0.001 && picks.length < need) {
      picks.push(src);
      avail -= 1;
    }
    if (picks.length >= need) break;
  }

  if (picks.length < need && required) {
    throw new APIError(
      `Insufficient OPEN source quantity (need ${need}, found ${picks.length})`,
      400,
      'INSUFFICIENT_OPEN_SOURCE'
    );
  }
  return picks;
}

export async function decrementSourceUnit(client, source) {
  const fresh = await client.inventoryTransaction.findUnique({
    where: { id: source.id },
    select: { remainingQty: true },
  });
  const nextRemaining = Math.max(0, Number(fresh?.remainingQty || 0) - 1);
  return client.inventoryTransaction.update({
    where: { id: source.id },
    data: {
      remainingQty: nextRemaining,
      status: nextRemaining <= 0.001 ? 'CONSUMED' : 'OPEN',
    },
  });
}

export async function restoreSourceUnits(client, outwardTxs) {
  for (const row of outwardTxs || []) {
    if (!row.parentTransactionId) continue;
    const parent = await client.inventoryTransaction.findUnique({
      where: { id: row.parentTransactionId },
      select: { remainingQty: true },
    });
    if (!parent) continue;
    const next = Number(parent.remainingQty || 0) + 1;
    await client.inventoryTransaction.update({
      where: { id: row.parentTransactionId },
      data: {
        remainingQty: next,
        status: 'OPEN',
      },
    });
  }
}
