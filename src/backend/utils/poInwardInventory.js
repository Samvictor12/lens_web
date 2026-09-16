/**
 * Helpers for PO receipt → inventory inward.
 * Progressive R/L + ADD must round-trip the same way BulkLensSelection / Receive store them.
 */

/** Parse receipt / bulk keys: sph_X_cyl_Y | sph_X_add_Z | sph_X_add_Z_R */
export function parseReceiptItemKey(key) {
  if (!key || typeof key !== "string") {
    return { spherical: "0", cylindrical: "0", add: null, eye: null };
  }
  const parts = key.split("_");
  const sphIdx = parts.indexOf("sph");
  const cylIdx = parts.indexOf("cyl");
  const addIdx = parts.indexOf("add");
  const lastPart = parts[parts.length - 1];
  const eye = lastPart === "L" || lastPart === "R" ? lastPart : null;
  return {
    spherical: sphIdx !== -1 ? parts[sphIdx + 1] : "0",
    cylindrical: cylIdx !== -1 ? parts[cylIdx + 1] : "0",
    add: addIdx !== -1 ? parts[addIdx + 1] : null,
    eye,
  };
}

export function normalizePower(value, fallback = "0") {
  if (value == null || value === "") return fallback;
  return String(value);
}

export function normalizeAdd(value) {
  if (value == null || value === "") return null;
  return String(value);
}

/** Resolve powers + eye from a receipt receivedItem row. */
export function resolveReceivedItemPowers(ri) {
  const parsed = parseReceiptItemKey(ri?.key);
  const eye =
    ri?.eye === "R" || ri?.eye === "L"
      ? ri.eye
      : parsed.eye;
  const add =
    ri?.add != null && ri.add !== ""
      ? String(ri.add)
      : parsed.add;
  return {
    key: ri?.key || null,
    spherical: normalizePower(ri?.spherical ?? parsed.spherical),
    cylindrical: normalizePower(ri?.cylindrical ?? parsed.cylindrical),
    add: normalizeAdd(add),
    eye: eye === "R" || eye === "L" ? eye : null,
  };
}

/**
 * Build inventory eye fields for one inward split.
 * Per-eye (Progressive R/L, single_R/single_L): one eye only + ADD on that eye.
 * No eye (Single / Bifocal bulk): store on right slot (same as Initialize Stock).
 */
export function buildInventoryEyeFields({
  eye,
  spherical,
  cylindrical,
  add,
  po = {},
  isBulk = true,
}) {
  const sph = normalizePower(spherical);
  const cyl = normalizePower(cylindrical);
  const addVal = normalizeAdd(add);

  let resolvedEye = eye === "R" || eye === "L" ? eye : null;
  if (!resolvedEye && !isBulk) {
    if (po.rightEye && !po.leftEye) resolvedEye = "R";
    else if (po.leftEye && !po.rightEye) resolvedEye = "L";
  }

  if (resolvedEye === "R") {
    return {
      rightEye: true,
      leftEye: false,
      rightSpherical: isBulk ? sph : (po.rightSpherical ?? sph),
      rightCylindrical: isBulk ? cyl : (po.rightCylindrical ?? cyl),
      rightAdd: isBulk ? addVal : (po.rightAdd ?? addVal),
      leftSpherical: null,
      leftCylindrical: null,
      leftAdd: null,
      rightAxis: isBulk ? null : (po.rightAxis ?? null),
      leftAxis: null,
    };
  }

  if (resolvedEye === "L") {
    return {
      rightEye: false,
      leftEye: true,
      rightSpherical: null,
      rightCylindrical: null,
      rightAdd: null,
      leftSpherical: isBulk ? sph : (po.leftSpherical ?? sph),
      leftCylindrical: isBulk ? cyl : (po.leftCylindrical ?? cyl),
      leftAdd: isBulk ? addVal : (po.leftAdd ?? addVal),
      rightAxis: null,
      leftAxis: isBulk ? null : (po.leftAxis ?? null),
    };
  }

  return {
    rightEye: true,
    leftEye: false,
    rightSpherical: isBulk ? sph : (po.rightSpherical ?? sph),
    rightCylindrical: isBulk ? cyl : (po.rightCylindrical ?? cyl),
    rightAdd: isBulk ? addVal : (po.rightAdd ?? addVal),
    leftSpherical: null,
    leftCylindrical: null,
    leftAdd: null,
    rightAxis: isBulk ? null : (po.rightAxis ?? null),
    leftAxis: null,
  };
}

/** Read canonical powers from an inventory item created by inward. */
export function inventoryItemPowers(item) {
  const isRightOnly = Boolean(item.rightEye) && !item.leftEye;
  const isLeftOnly = Boolean(item.leftEye) && !item.rightEye;
  const eye = isRightOnly ? "R" : isLeftOnly ? "L" : null;
  const sph = normalizePower(
    isLeftOnly ? item.leftSpherical : item.rightSpherical
  );
  const cyl = normalizePower(
    isLeftOnly ? item.leftCylindrical : item.rightCylindrical
  );
  const add = normalizeAdd(isLeftOnly ? item.leftAdd : item.rightAdd);
  return { eye, sph, cyl, add };
}

/** Rebuild bulk-style receipt key from inventory powers (not single_*). */
export function buildBulkStyleKey({ sph, cyl, add, eye }) {
  if (add != null) {
    return `sph_${sph}_add_${add}${eye ? `_${eye}` : ""}`;
  }
  return `sph_${sph}_cyl_${cyl}${eye ? `_${eye}` : ""}`;
}

/**
 * Map an inventory item back to a receipt receivedItems[].key
 * so already-inwarded qty can be tracked per Progressive R/L row.
 */
export function matchInventoryToReceiptKey(item, receivedItems = []) {
  const keys = new Set(
    (receivedItems || []).map((ri) => ri.key).filter(Boolean)
  );
  const inv = inventoryItemPowers(item);
  const rebuilt = buildBulkStyleKey(inv);

  if (keys.has(rebuilt)) return rebuilt;

  if (inv.eye === "R" && keys.has("single_R")) return "single_R";
  if (inv.eye === "L" && keys.has("single_L")) return "single_L";
  if (!inv.eye && keys.has("single")) return "single";

  for (const ri of receivedItems || []) {
    if (!ri?.key) continue;
    const p = resolveReceivedItemPowers(ri);
    const sameSph = String(p.spherical) === String(inv.sph);
    const sameCyl = String(p.cylindrical) === String(inv.cyl);
    const sameAdd = String(p.add ?? "") === String(inv.add ?? "");
    const sameEye = String(p.eye ?? "") === String(inv.eye ?? "");
    if (sameSph && sameCyl && sameAdd && sameEye) return ri.key;
  }

  return keys.has(rebuilt) ? rebuilt : rebuilt;
}

/** Aggregate inventory quantities by receipt item key. */
export function buildInwardedByReceiptKey(existingItems, receivedItems) {
  const inwardedByRow = {};
  for (const item of existingItems || []) {
    const key = matchInventoryToReceiptKey(item, receivedItems);
    if (!key) continue;
    inwardedByRow[key] =
      (inwardedByRow[key] || 0) + (parseFloat(item.quantity) || 0);
  }
  return inwardedByRow;
}
