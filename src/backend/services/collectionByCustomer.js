function round2(n) {
  return Math.round((parseFloat(n) || 0) * 100) / 100;
}

/**
 * Target = remaining collectible (totalAmount − paidAmount) grouped by customer.
 * Actual = receipt voucher totals grouped by customer.
 * Balance = Target − Actual. Rows with both zero are omitted.
 */
export function aggregateCollectionByCustomer(targetInvoices = [], paymentVouchers = []) {
  const map = new Map();

  function row(customerId, customerName) {
    const id = customerId ?? 0;
    if (!map.has(id)) {
      map.set(id, {
        customerId: id,
        customerName: customerName || 'Unknown',
        target: 0,
        actual: 0,
      });
    }
    const existing = map.get(id);
    if (customerName && existing.customerName === 'Unknown') existing.customerName = customerName;
    return existing;
  }

  for (const inv of targetInvoices) {
    const remaining = Math.max(0, (parseFloat(inv.totalAmount) || 0) - (parseFloat(inv.paidAmount) || 0));
    const r = row(inv.customerId, inv.customer?.name);
    r.target = round2(r.target + remaining);
  }

  for (const p of paymentVouchers) {
    const r = row(p.customerId, p.customer?.name);
    r.actual = round2(r.actual + (parseFloat(p.totalAmount) || 0));
  }

  return Array.from(map.values())
    .filter((r) => r.target !== 0 || r.actual !== 0)
    .map((r) => ({
      customerId: r.customerId,
      customerName: r.customerName,
      target: round2(r.target),
      actual: round2(r.actual),
      balance: round2(r.target - r.actual),
    }))
    .sort((a, b) => a.customerName.localeCompare(b.customerName));
}

export function monthEndCollectibleTotal(rows = []) {
  return round2(rows.reduce((s, r) => s + (parseFloat(r.target) || 0), 0));
}
