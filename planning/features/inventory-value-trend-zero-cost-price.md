## Meta

- id: inventory-value-trend-zero-cost-price
- title: Inventory Dashboard — Inward/Outward chart switched to quantity; Available/Reserved cards switched to summed stock quantity
- type: bug
- status: DONE
- contract_version: 1
- last_updated: 2026-06-27

## 1 Requirement

**Two related Inventory Dashboard metric bugs — both are "count of rows" being shown where "sum of quantity" is correct.**

### 1. "Inward / Outward Value Trend" chart → change to an Inward/Outward **Quantity** Trend (drop ₹ value)

Currently this chart (`InventoryDashboard.jsx:273-359`, backed by `getStockValueReport()` in `src/backend/services/inventory.service.js:1437-1562`) plots ₹ `totalValue` summed per day. **User decision: replace this with quantity** — sum of `InventoryTransaction.quantity` per day for inward types (`INWARD_PO`, `INWARD_DIRECT`) and outward types (`OUTWARD_SALE`, `OUTWARD_RETURN`), fully dropping the ₹-value metric from this chart (no toggle, no secondary view).

This also moots the previously-found root cause of the ₹ chart looking wrong (cost price silently defaults to 0 when left blank in `InventoryInitializationForm.jsx`, flowing into `totalValue: itemData.quantity * itemData.costPrice` at `inventory.service.js:45-46`) — once the chart no longer uses `totalValue` at all, that gap stops mattering for this chart.

**Scope:**
- Backend: `getStockValueReport()` must compute `trend[date].inward`/`outward` as `Σ quantity` instead of `Σ totalValue`, for the same transaction-type grouping it already uses (`inventory.service.js:1517-1536`).
- Frontend: `InventoryDashboard.jsx` chart labels/legend/Y-axis/tooltip/export (Excel/PDF) must reflect units, not ₹.
- Section title "Inward / Outward Value Trend" renamed to "Inward / Outward Quantity Trend".
- The separate "Total Inventory Value" card and the ₹ inward/outward summary links above the chart are **out of scope** — only the trend chart itself changes metric.

### 2. "Available" and "Reserved" stat cards → show summed stock quantity, not row count

Confirmed root cause: `getInventoryDashboardEnhanced()` computed both via `prisma.inventoryItem.count({ where: { status: "AVAILABLE" }})` and `.count({ where: { status: "RESERVED" }})` — i.e. counted `InventoryItem` rows, not their `quantity` field. Since a single `InventoryItem` row can hold a fractional/partial quantity, the card showed the row count instead of the true available/reserved stock quantity.

**User decision: fix both cards** to sum the underlying quantity instead of counting rows.

**Both fixes shipped together in one Contract/BUILD pass.**

## 2 Contract

### Backend & Data (no migrations — `quantity`/`totalValue` already exist on `InventoryTransaction`)
- [x] `getStockValueReport()`'s trend aggregation changed to sum `quantity` instead of `totalValue`: inward types add `txn.quantity` (positive); outward types add `Math.abs(txn.quantity || 0)` (outward `quantity` is stored negative, e.g. `quantity: -quantity` in `reserveInventoryForSale`).
- [x] `grouped`/`data` (per lens_id/category_id/location_id breakdown) and `summary.totalInwardValue`/`totalOutwardValue` ₹ calculations left untouched.
- [x] `getInventoryDashboardEnhanced()` — `availableItems`/`reservedItems` now computed from `InventoryStock.availableStock`/`reservedStock` instead of `InventoryItem.quantity`. **Amended after QA rework (Test Case 6 FAIL):** the originally-contracted `prisma.inventoryItem.aggregate({_sum:{quantity}})` approach is unsound — `reserveInventoryForSale()` zeroes a row's `quantity` in the same write that flips it to `RESERVED`, so that sum always returns ~0 for Reserved. Fixed by extending the existing `allStock` (`prisma.inventoryStock.findMany`) query's `select` to also pull `availableStock`/`reservedStock`, then summing both via `allStock.reduce(...)` in JS.
- [x] Removed the unused `availableItemsAgg`/`reservedItemsAgg` `Promise.all` entries.

### Frontend
- [x] `InventoryDashboard.jsx`: `YAxis` `tickFormatter` shows plain unit counts; `Area` `name` props → `"Inward Qty"`/`"Outward Qty"`; `Section` title → "Inward / Outward Quantity Trend"; `handleExportValueTrend()` headers/values switched from ₹ to plain quantity.
- [x] `CUSTOM_TOOLTIP` needed no edit — already rendered raw `p.value`.
- [x] `valueSummary` ₹ links and "Total Inventory Value" card left untouched.
- [x] No frontend change needed for the stat cards themselves — they already render `stats.availableItems`/`stats.reservedItems` directly.

## 3 Test plan

All 7 cases PASS on retest:
1. Inward/Outward chart plots quantity, not ₹.
2. Outward quantity sums correctly (sign handling, `Math.abs` on negative stored quantity).
3. Multiple transactions same day sum correctly (resolves the original "shows only 1" complaint).
4. Export (Excel/PDF) reflects quantity, not ₹.
5. Available stat card shows summed quantity.
6. Reserved stat card shows summed quantity (failed first pass, fixed in rework).
7. No regression on ₹ summary links / Total Inventory Value card elsewhere.

## 4 Test results

- result: PASS
- rework_tag: RETEST (1 rework cycle)
- next: —

**First pass FAILED Test Case 6:** `InventoryItem.aggregate({_sum:{quantity}})` for `status: "RESERVED"` always returns ~0 because `reserveInventoryForSale()` zeroes a row's `quantity` in the same write that sets it to `RESERVED`. Root cause and fix documented in `KB-021` (`planning/knowledge_base/lessons_learned.md`).

**Retest: all 7 Test Cases PASS.** L1 (build) PASS, L2 (field mapping) PASS, L3 N/A (no new records), L4 (business rules — correct authoritative source) PASS, L5 (KB regression) PASS.

## 5 Delivery note

- Inventory Dashboard's "Inward / Outward Value Trend" chart is now "Inward / Outward Quantity Trend" — plots summed daily transaction quantity, not ₹ value. Removes the dependency on cost price ever being entered, which was the original symptom reported (a day with 13.5 real inward units showing almost no value).
- "Available" and "Reserved" stat cards now show summed stock quantity (sourced from `InventoryStock.availableStock`/`reservedStock`) instead of a row count.
- One QA rework cycle: see Test results / `KB-021`.
- The separate ₹ inward/outward summary links above the chart and the "Total Inventory Value" card are unchanged — out of scope per Requirement.
- No Prisma schema changes were needed. Docs updated: `planning/Modules/Inventory.md` (Pass E row, Dashboard description, Key Data Rules note, Raise PO gap marked resolved per separate user confirmation this session), `planning/knowledge_base/lessons_learned.md` (KB-021; KB-020 marked resolved). `ARCHITECTURE.md`/`DATABASE_ERD.md`/`Project_doc.md` left as-is — no matching content to update.
