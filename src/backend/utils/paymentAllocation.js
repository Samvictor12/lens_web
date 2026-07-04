/**
 * FIFO payment allocation across outstanding items.
 * Sort: dueDate asc → orderDate asc → documentNo tie-break.
 */

function round2(n) {
  return Math.round(n * 100) / 100;
}

function sortItems(items) {
  return [...items].sort((a, b) => {
    const dueA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
    const dueB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
    if (dueA !== dueB) return dueA - dueB;

    const orderA = a.orderDate ? new Date(a.orderDate).getTime() : Infinity;
    const orderB = b.orderDate ? new Date(b.orderDate).getTime() : Infinity;
    if (orderA !== orderB) return orderA - orderB;

    return String(a.documentNo || '').localeCompare(String(b.documentNo || ''));
  });
}

/**
 * @param {Object} params
 * @param {Array<{ id, outstanding, dueDate?, orderDate?, documentNo }>} params.items
 * @param {number} params.totalAmount
 * @param {Record<string|number, number>} [params.overrides] — manual allocation per id
 * @returns {{ allocations: Array<{ id, amount }>, remaining: number }}
 */
export function distributePayment({ items, totalAmount, overrides = {} }) {
  const total = round2(parseFloat(totalAmount) || 0);
  if (total < 0) {
    return { allocations: [], remaining: total };
  }

  const sorted = sortItems(items);
  const overrideIds = new Set(
    Object.keys(overrides)
      .filter((k) => overrides[k] != null && overrides[k] !== '')
      .map((k) => (typeof sorted[0]?.id === 'number' ? parseInt(k) : k))
  );

  const allocations = [];
  let remaining = total;

  // Honour manual overrides first (in sort order)
  for (const item of sorted) {
    const key = item.id;
    if (!overrideIds.has(key) && !Object.prototype.hasOwnProperty.call(overrides, String(key))) continue;

    const raw = overrides[key] ?? overrides[String(key)];
    const amt = round2(parseFloat(raw) || 0);
    const maxOutstanding = round2(parseFloat(item.outstanding) || 0);

    if (amt > maxOutstanding + 0.01) {
      throw new Error(`Allocation for ${item.documentNo || key} exceeds outstanding (${maxOutstanding})`);
    }
    if (amt > remaining + 0.01) {
      throw new Error(`Allocation for ${item.documentNo || key} exceeds remaining payment amount`);
    }

    if (amt > 0) {
      allocations.push({ id: key, amount: amt });
      remaining = round2(remaining - amt);
    }
  }

  // FIFO fill for non-overridden items
  for (const item of sorted) {
    if (overrideIds.has(item.id) || Object.prototype.hasOwnProperty.call(overrides, String(item.id))) {
      continue;
    }
    if (remaining <= 0.001) break;

    const maxOutstanding = round2(parseFloat(item.outstanding) || 0);
    if (maxOutstanding <= 0) continue;

    const amt = round2(Math.min(remaining, maxOutstanding));
    if (amt > 0) {
      allocations.push({ id: item.id, amount: amt });
      remaining = round2(remaining - amt);
    }
  }

  // Last line absorbs rounding remainder when fully allocating that line
  if (allocations.length > 0 && remaining > 0 && remaining <= 0.01) {
    const last = allocations[allocations.length - 1];
    const lastItem = sorted.find((i) => i.id === last.id);
    const maxOutstanding = round2(parseFloat(lastItem?.outstanding) || 0);
    const bump = round2(Math.min(remaining, maxOutstanding - last.amount));
    if (bump > 0) {
      last.amount = round2(last.amount + bump);
      remaining = round2(remaining - bump);
    }
  }

  return { allocations, remaining: round2(remaining) };
}
