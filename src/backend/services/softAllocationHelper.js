/**
 * In-memory FIFO soft allocation for SO Request Queue.
 * Display-only: does not write InventoryStock.reservedStock or item status.
 *
 * Pool tracks remaining claimable qty per match id (`inv_*` / `rec_*`).
 * Earlier waiting SOs claim first; later SOs see shortages / filtered matches.
 */

/**
 * @returns {Map<string, number>} matchId -> remaining qty
 */
export function createClaimPool() {
  return new Map();
}

/**
 * Ensure pool knows about units from match rows (first sight wins for initial qty).
 * @param {Map<string, number>} pool
 * @param {Array<{ id: string, quantity?: number }>} matches
 */
export function registerMatchesInPool(pool, matches = []) {
  for (const m of matches) {
    if (!m?.id) continue;
    if (!pool.has(m.id)) {
      const qty = Number(m.quantity);
      pool.set(m.id, Number.isFinite(qty) && qty > 0 ? qty : 1);
    }
  }
}

/**
 * Claim one unit from matches in FIFO order (array order = FIFO).
 * @returns {object|null} claimed match row, or null if none available
 */
export function claimOneUnit(pool, matches = []) {
  registerMatchesInPool(pool, matches);
  for (const m of matches) {
    if (!m?.id) continue;
    const remaining = pool.get(m.id) ?? 0;
    if (remaining > 0) {
      pool.set(m.id, remaining - 1);
      return m;
    }
  }
  return null;
}

/**
 * Soft-allocate R/L (1 unit each when enabled) for a single SO against shared pool.
 */
export function softAllocateOrder(order, rightMatches = [], leftMatches = [], pool = createClaimPool()) {
  let coveredRight = !order.rightEye;
  let coveredLeft = !order.leftEye;
  let shortageRight = false;
  let shortageLeft = false;
  let claimedQty = 0;

  if (order.rightEye) {
    const claim = claimOneUnit(pool, rightMatches);
    coveredRight = Boolean(claim);
    shortageRight = !claim;
    if (claim) claimedQty += 1;
  }
  if (order.leftEye) {
    const claim = claimOneUnit(pool, leftMatches);
    coveredLeft = Boolean(claim);
    shortageLeft = !claim;
    if (claim) claimedQty += 1;
  }

  return {
    isStockAvailable: coveredRight && coveredLeft,
    shortageRight,
    shortageLeft,
    claimedQty,
  };
}

/**
 * Filter match rows to units still available in the pool (after earlier claims).
 * Adjusts `quantity` to remaining claimable qty.
 */
export function filterMatchesByPool(matches = [], pool) {
  if (!pool) return matches;
  registerMatchesInPool(pool, matches);
  return matches
    .map((m) => {
      if (!m?.id) return null;
      const remaining = pool.get(m.id) ?? 0;
      if (remaining <= 0) return null;
      return { ...m, quantity: remaining };
    })
    .filter(Boolean);
}

/**
 * Eye demand for an SO (1 per enabled eye).
 */
export function orderEyeDemand(order) {
  let demand = 0;
  if (order?.rightEye) demand += 1;
  if (order?.leftEye) demand += 1;
  return demand;
}

/**
 * Resolve PO eyes: explicit overrides win; else shortage eyes; else SO eyes fallback.
 * Constrains selection to eyes present on the SO.
 */
export function resolvePoEyes(so, { rightEye, leftEye, shortageRight, shortageLeft } = {}) {
  const soRight = Boolean(so?.rightEye);
  const soLeft = Boolean(so?.leftEye);

  const hasExplicit =
    rightEye !== undefined && rightEye !== null ||
    leftEye !== undefined && leftEye !== null;

  let pickRight;
  let pickLeft;

  if (hasExplicit) {
    pickRight = rightEye !== undefined && rightEye !== null ? Boolean(rightEye) : false;
    pickLeft = leftEye !== undefined && leftEye !== null ? Boolean(leftEye) : false;
  } else if (shortageRight || shortageLeft) {
    pickRight = Boolean(shortageRight);
    pickLeft = Boolean(shortageLeft);
  } else {
    pickRight = soRight;
    pickLeft = soLeft;
  }

  if (pickRight && !soRight) {
    const err = new Error('Right eye is not enabled on this sale order');
    err.code = 'INVALID_EYE_SELECTION';
    throw err;
  }
  if (pickLeft && !soLeft) {
    const err = new Error('Left eye is not enabled on this sale order');
    err.code = 'INVALID_EYE_SELECTION';
    throw err;
  }
  if (!pickRight && !pickLeft) {
    const err = new Error('At least one eye must be selected for the PO');
    err.code = 'INVALID_EYE_SELECTION';
    throw err;
  }

  const quantity = (pickRight ? 1 : 0) + (pickLeft ? 1 : 0);
  return { rightEye: pickRight, leftEye: pickLeft, quantity };
}
