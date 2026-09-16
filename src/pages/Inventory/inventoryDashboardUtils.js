const toGridNum = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? parseFloat(n.toFixed(2)) : 0;
};

/**
 * Build BulkLensSelection value from low-stock specs.
 * Each cell qty = that spec's minQty (not the gap).
 */
export function buildBulkSelectionFromSpecs(specs = [], categoryName = "") {
  const lowerCat = (categoryName || "").toLowerCase();
  const isProgressive = lowerCat.includes("prog");
  const isBifocal = lowerCat.includes("bifocal") || lowerCat.includes("bi-focal");
  const useAdd = isProgressive || isBifocal;

  const selections = {};
  let minSph = Infinity;
  let maxSph = -Infinity;
  let minCyl = Infinity;
  let maxCyl = -Infinity;
  let minAdd = Infinity;
  let maxAdd = -Infinity;

  for (const spec of specs) {
    const sph = toGridNum(spec.sph);
    const cyl = toGridNum(spec.cyl);
    const add = toGridNum(spec.add);
    const qty = Math.max(0, parseInt(spec.minQty, 10) || 0);
    if (qty <= 0) continue;

    minSph = Math.min(minSph, sph);
    maxSph = Math.max(maxSph, sph);
    minCyl = Math.min(minCyl, cyl);
    maxCyl = Math.max(maxCyl, cyl);
    minAdd = Math.min(minAdd, add);
    maxAdd = Math.max(maxAdd, add);

    if (useAdd) {
      selections[`sph_${sph}_add_${add}`] = { quantity: qty };
    } else {
      selections[`sph_${sph}_cyl_${cyl}`] = { quantity: qty };
    }
  }

  return {
    ranges: {
      sphFrom: Number.isFinite(minSph) ? minSph : 0,
      sphTo: Number.isFinite(maxSph) ? maxSph : 2,
      cylFrom: Number.isFinite(minCyl) ? minCyl : 0,
      cylTo: Number.isFinite(maxCyl) ? maxCyl : 2,
      addFrom: useAdd ? (Number.isFinite(minAdd) ? minAdd : 0) : "",
      addTo: useAdd ? (Number.isFinite(maxAdd) ? maxAdd : 2) : "",
    },
    selections,
  };
}

export function selectedSpecsShareOneLens(specs = []) {
  if (!specs.length) return false;
  const first = specs[0].lens_id;
  return specs.every((s) => s.lens_id === first);
}

export function specAlertRowKey(row) {
  return `${row.lens_id}|${row.sph}|${row.cyl}|${row.add}|${row.id}`;
}

/** Group spec-alert rows by lens_id, preserving first-seen product order. */
export function groupSpecAlertsByProduct(rows = []) {
  const map = new Map();
  for (const row of rows) {
    const id = row.lens_id;
    if (id == null) continue;
    if (!map.has(id)) {
      map.set(id, {
        lens_id: id,
        lens_name: row.lensProduct?.lens_name || `Lens #${id}`,
        product_code: row.lensProduct?.product_code || "",
        specs: [],
      });
    }
    map.get(id).specs.push(row);
  }
  return [...map.values()];
}

export function specKeysForGroup(specs = []) {
  return specs.map(specAlertRowKey);
}

/** Product checkbox: all / none / some of the group's spec keys. */
export function productGroupSelectState(selectedKeys, specs = []) {
  const keys = specKeysForGroup(specs);
  if (!keys.length) return { checked: false, indeterminate: false };
  const n = keys.filter((k) => selectedKeys.has(k)).length;
  if (n === 0) return { checked: false, indeterminate: false };
  if (n === keys.length) return { checked: true, indeterminate: false };
  return { checked: false, indeterminate: true };
}

/** Selecting a product keeps only that product's specs (Raise PO is one lens). */
export function toggleProductSpecSelection(selectedKeys, specs, selectAll) {
  if (!selectAll) return new Set();
  return new Set(specKeysForGroup(specs));
}

export function toLocalDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const TREND_RANGE_DAYS = { "7d": 7, "15d": 15, "30d": 30, "60d": 60, "90d": 90 };

/** Map last-N-days select (7/15/30/60/90) to local startDate/endDate for GET /reports/value. */
export function dateRangeToParams(range, now = new Date()) {
  const days = TREND_RANGE_DAYS[range] ?? 30;
  const s = new Date(now);
  s.setDate(s.getDate() - days);
  return { startDate: toLocalDateStr(s), endDate: toLocalDateStr(now) };
}

/**
 * Inward vs SO Queue bars: pct = count / (inward + SO), sorted descending.
 */
export function queueShareBars(inwardCount, soCount) {
  const inward = Number(inwardCount) || 0;
  const so = Number(soCount) || 0;
  const total = inward + so;
  if (!total) return [];
  return [
    { key: "inward", name: "Inward", tab: "inward", value: inward },
    { key: "so", name: "SO Queue", tab: "requestQueue", value: so },
  ]
    .map((d) => ({ ...d, pct: d.value / total }))
    .sort((a, b) => b.pct - a.pct);
}
