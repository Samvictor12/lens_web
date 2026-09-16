export function classifyCycleCountOutcome({
  bookQty,
  countedQty,
  recountThreshold = 0,
  isRecount = false,
}) {
  const book = Number(bookQty) || 0;
  const counted = Number(countedQty);
  if (Number.isNaN(counted)) return "UNCOUNTED";
  const variance = counted - book;
  const threshold = Math.max(0, Number(recountThreshold) || 0);
  if (Math.abs(variance) <= threshold) return "MATCH";
  if (!isRecount) return "PENDING_RECOUNT";
  return variance < 0 ? "SHORTAGE" : "OVERAGE";
}

export function summarizeCycleCountKpis({ traysInScope = 0, trayIdsCounted = [], lines = [] } = {}) {
  const countedTraySet = new Set(trayIdsCounted.filter((id) => id != null));
  const traysCounted = countedTraySet.size;
  const scope = Number(traysInScope) || 0;
  const completionPct = scope === 0 ? 0 : Math.round((traysCounted / scope) * 100);

  const countedLines = (lines || []).filter(
    (l) => l.outcome && l.outcome !== "UNCOUNTED"
  );
  const matched = countedLines.filter((l) => l.outcome === "MATCH").length;
  const pendingRecount = countedLines.filter((l) => l.outcome === "PENDING_RECOUNT").length;
  const shortage = countedLines.filter((l) => l.outcome === "SHORTAGE").length;
  const overage = countedLines.filter((l) => l.outcome === "OVERAGE").length;
  const variance = shortage + overage;
  const accuracyPct =
    countedLines.length === 0 ? null : Math.round((matched / countedLines.length) * 100);

  return {
    traysInScope: scope,
    traysCounted,
    completionPct,
    accuracyPct,
    matched,
    variance,
    pendingRecount,
    shortage,
    overage,
    lineCount: countedLines.length,
  };
}

export function assertDifferentTrays(fromTrayId, toTrayId) {
  const from = Number(fromTrayId);
  const to = Number(toTrayId);
  if (!from || !to) return { ok: false, message: "Source and destination trays are required" };
  if (from === to) return { ok: false, message: "Destination tray must be different from source tray" };
  return { ok: true };
}

export function validateAuditTrayTransfer({ fromTrayId, toTrayId, quantity } = {}) {
  const trays = assertDifferentTrays(fromTrayId, toTrayId);
  if (!trays.ok) return trays;
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    return { ok: false, message: "Quantity must be greater than 0" };
  }
  return { ok: true };
}
