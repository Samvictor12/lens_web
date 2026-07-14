# Module Specification — Inventory

This document details the functional specifications, technical implementation, and cross-module linkages for the **Inventory** module.

---

## 1. Functional Overview

The Inventory module manages:

* **Initial Inward (Manual):** A 3-step wizard (`InventoryInitializationForm.jsx`) lets a user pick a Location → select Type/Category/Lens Product/Coating → enter Sph/Cyl/Add ranges (0.25-step cartesian product via `BulkLensSelection.jsx`) → allocate to trays with per-spec Qty (auto-fills to available gap) and per-spec Price (auto-fills from global cost price). Coating is required before the grid can be displayed. The generated spec list is shown as an expandable card grouped by Coating.
* **Inward by PO:** Purchase-order-driven receipt queue (`POInwardToInventory.jsx`). Confirmed working end-to-end. Live tray capacity badge reflects in-form sibling-row allocations via `siblingAllocatedQty()` — shows **"Tray Full — X/X"** immediately when another row fills the same tray, without waiting for submit. **Inward Queue (Pass K)** lists only stock-type PO receipts (direct POs and POs from `STOCK`-type SOs); RX-type PO receipts are hidden and consumed via Issue Stock auto-inward instead.
* **Tray-to-tray transfer (Pass K):** `InventoryTransactionForm` allows same-location transfers when trays differ. Backend `TRANSFER` supports full relocate and partial-qty split (new `InventoryItem` at destination) with atomic source/destination `InventoryStock` updates.
* **Tray Master / Location Master:** Organizes stock into designated physical bins (trays) inside locations.
* **SO Request Query (tab inside Inventory module):** `InventoryRequestQueueTab.jsx` — lists Sale Orders requiring stock allocation (driven by `INVENTORY_QUEUE_STATUSES`). "Issue & Pre-QC" button opens `StockPickModal.jsx` before transitioning the SO to `PRE_QC`. Includes live filter controls (by Customer, Product, Customer Ref No, and SO Number) and collapsible grouping options (by Customer or Product). No standalone route; reachable only as a tab within the Inventory module.
  * **Stock Pick Modal (Pass D):** Shows the SO's product name + coating + per-eye Sph/Cyl/Add specs at the top. Lists FIFO matches from **both** physical `InventoryItem` rows (`inv_<id>`) and pending `PurchaseOrderReceipt` rows from the Inward Queue (`rec_<id>`, badged "Inward Queue", purple-themed row). Selecting a `rec_` row and confirming auto-inwards that receipt's pending qty (1 unit) into a new `InventoryItem` + `InventoryTransaction` + `InventoryStock` bucket update, then reserves it for the SO — all inside one `prisma.$transaction`.
  * "Raise PO" button (`raisePoFromSo`) — previously an unresolved known gap (Pass D: static review found no bug, needed live reproduction). **Resolved 2026-06-27:** user confirmed via live use that Raise PO works correctly; no further action needed.
* **Transactions Log:** Record of all stock updates for value auditing. Supports filtering by transaction `type` (Pass D) via a dropdown, and can be deep-linked from the Dashboard's Inward/Outward value click-through (`location.state.filterType`).
* **Stock Summary:** Toggle between the original Pivot Grid view and an Expandable List view (grouped by Location / Location+Tray / Category / Lens Product / none), each with its own AND-combined filters; Pivot retains Excel/PDF exports (Pass C/D — complete). Since Pass J, both views (and the Initialize Stock Grid's tray-occupancy/capacity check) exclude **RX-sourced stock** — `InventoryItem` rows whose originating `PurchaseOrder.saleOrderId` is set (i.e. procured specifically for one customer's Sale Order) — so these surfaces only reflect general/stock-type inventory, not RX-earmarked stock. This does not affect FIFO picking, low-stock alerts, or the `InventoryStock` bucket table itself, which still account for all stock regardless of source.
* **Dashboard:** Analytics cards — **Available**/**Reserved** now show summed stock *quantity* (sourced from `InventoryStock.availableStock`/`reservedStock`, not a row count) so fractional/partial quantities display correctly (Pass E). "Inward / Outward Quantity Trend" chart (renamed from "Value Trend" in Pass E) plots daily summed transaction *quantity*, not ₹ value — the ₹ summary links above the chart and the "Total Inventory Value" card are unchanged. Top 10 / Low 10 selling products rendered side-by-side, and Excel/PDF export. "Product Spec Count Trend" card was removed in Pass D (Pass B/D — complete).

> **Nav:** Inventory module tab bar = `Dashboard | Inward Queue | SO Request Query | Transactions | Stock Summary`. The "Items" tab and "Add Item" button have been removed — no manual inventory creation allowed except via Initial Inward or PO Inward.

---

## 2. Technical Design

### Key Frontend Files

| File | Role |
|------|------|
| `InventoryMain.jsx` | Top-level tab router (5 tabs) |
| `InventoryInitializationForm.jsx` | 3-step manual inward wizard |
| `BulkLensSelection.jsx` | Coating + range inputs + Sph×CYL/ADD grid + expandable spec list |
| `POInwardToInventory.jsx` | PO-receipt-driven inward with live tray badge (`siblingAllocatedQty`) |
| `InventoryRequestQueueTab.jsx` | SO queue tab with FIFO stock pick trigger |
| `StockPickModal.jsx` | FIFO allocation dialog reused for Request Queue |
| `InventoryDashboard.jsx` | Stat cards + charts + Excel/PDF export |
| `InventoryStockTab.jsx` | Stock summary pivot + AND-combined filters + Excel/PDF export |
| `InventoryInwardQueueTab.jsx` | PO inward queue listing |
| `InventoryTransactionsTab.jsx` | Transaction log tab |

### Key Backend Files

| File | Role |
|------|------|
| `inventory.service.js` | Core service: `bulkInwardFromGrid`, `reserveInventoryForSale` (qty-aware + `dbClient` threading), `updateInventoryStock`, `generateTransactionNumber`, `getInventorySpecCountTrend`, `getTopLowSellingProducts`, `getInventoryStockPivot`, `getInventoryStockGrouped` (list view), `getStockValueReport` (daily `trend` array — `inward`/`outward` are now summed transaction *quantity*, not ₹ value, since Pass E; the `summary`/`data` ₹ breakdown is unchanged), `getInventoryDashboardEnhanced` (`availableItems`/`reservedItems` sourced from `InventoryStock.availableStock`/`reservedStock`, not `InventoryItem` row count/quantity, since Pass E). Since Pass J: module-level `RX_SOURCE_EXCLUSION_FILTER` const applied in `getInventoryStockPivot`, `getInventoryStockWithGrouping` (ungrouped + all 4 grouped branches), and `getTrayOccupancy`; the grouped branches of `getInventoryStockWithGrouping` no longer read the `InventoryStock` bucket table (which has no PO/RX linkage) — they now live-aggregate off `InventoryItem` via `prisma.groupBy` keyed on the bucket's natural unique key (`lens_id, category_id, Type_id, coating_id, location_id, tray_id`), with a second `groupBy` (same keys + `status`) to split out `reservedStock`/`damagedStock`. Pass K: `getInventoryInwardQueue` filters to stock-type POs only; `createInventoryTransaction` TRANSFER supports partial-qty split + same-tx stock bucket updates. |
| `saleOrderWorkflowService.js` | `issueToPreQc()` — wraps `reserveInventoryForSale` in a `prisma.$transaction`; threads `tx` as `dbClient` so all eye reservations roll back together on failure. Pass D: also handles `rec_<id>` selections by auto-inwarding the receipt (creates `InventoryItem`+`InventoryTransaction`+stock bucket) before reserving. `raisePoFromSo()` lives in the same file (see known gap above). |
| `saleOrderService.js` | `getMatchingInventoryFIFO()` — Pass D: also queries matching `PurchaseOrderReceipt`s (filtered to `totalReceivedQty > inwardedQty`) alongside physical stock, returns both `inv_`/`rec_`-prefixed plus the parent `saleOrder` (with product/coating/type) for the modal header. Pass K: `buildWhereClause` / `buildPoWhereClause` treat `STOCK`-type linked SOs as general stock (pickable by any order), alongside null-SO stock and current-SO RX reservations. |
| `purchaseOrderService.js` | `getPurchaseOrderById` selects `saleOrder.procurementType` so receive UI can classify stock vs RX POs. |
| `inventory.routes.js` / `inventoryController.js` | REST API layer |

### Key Data Rules

* **`reserveInventoryForSale(inventoryItemId, quantity, saleOrderId, userId, dbClient = prisma)`:**
  - Quantity-aware status flip: if `remainingQty ≤ 0.001` → status = `RESERVED`, `saleOrderId` + `reservedDate` set. Otherwise stays `AVAILABLE` with decremented `quantity`.
  - Accepts optional `dbClient` (defaults to `prisma`). When called from `issueToPreQc`'s `prisma.$transaction`, the transaction's `tx` is passed through so all reservations in one call are atomic.
* **`bulkInwardFromGrid`:** Accepts `coating_id` at top level and optional `costPrice` per `splits[]` entry (falls back to form-level `costPrice` via `??`, not `||` — preserves explicit `0`).
* **Tray Live Badge (PO Inward):** `effectiveAvailable = trayOccupancy.availableQty - siblingAllocatedQty(trayId, excludeRowKey, excludeSplitIdx)`. Badge turns red with "Tray Full — X/X" when `effectiveAvailable ≤ 0`.
* **Date-range `endDate` filters on `transactionDate` must use end-of-day, not a bare `new Date(endDate)`:** A date-only string parses to UTC-midnight-start-of-day, which on an IST server silently excludes most of the final day(s) of a range. `getStockValueReport()` and `getInventoryTransactions()` both normalize via `end.setHours(23,59,59,999)` before using it as `lte` (Pass F; same pattern already used by `getInventorySpecCountTrend()`). Apply this pattern to any future `startDate`/`endDate` range filter on a `DateTime` column.
* **`InventoryItem.quantity` is NOT a reliable source for RESERVED-row totals:** `reserveInventoryForSale()` zeroes a row's own `quantity` in the same write that flips its `status` to `RESERVED` (the field represents "how much of this row is still unreserved," always ~0 once fully reserved). Any future Available/Reserved/stock-quantity aggregate must use `InventoryStock.availableStock`/`reservedStock`/`totalStock`/`damagedStock` (bucket-level running totals maintained by `updateInventoryStock()`), not `InventoryItem.quantity` summed across rows.
* **RX-sourced stock exclusion (Pass J / Refined):** An `InventoryItem` is RX-sourced iff its `purchaseOrder.saleOrderId` is non-null AND the linked `saleOrder.procurementType === 'RX'`. The correct Prisma filter is `NOT: { purchaseOrder: { saleOrder: { procurementType: 'RX' } } }` (module-level `RX_SOURCE_EXCLUSION_FILTER` in `inventory.service.js`) — **not** the simpler `{ purchaseOrder: { saleOrder: { procurementType: 'RX' } } }` form, since on an optional relation that form would drop every row with `purchaseOrderId = null` (i.e. manually-initialized stock). When adding RX-exclusion to any new query, reuse the `NOT` form.
* **Stock vs RX PO classification (Pass K):** Direct PO (`saleOrderId` null) and PO linked to `procurementType === 'STOCK'` → stock-type (Inward Queue + general FIFO). PO linked to `procurementType === 'RX'` → RX-type (hidden from Inward Queue; FIFO-reserved to that SO only). Do not treat "any non-null `saleOrderId`" as RX — STOCK-raised POs are general stock.
* **`InventoryStock` bucket cannot answer "non-RX only" queries:** it has no relation to `PurchaseOrder`/`saleOrderId` and permanently mixes RX + non-RX quantities once accumulated (its update lifecycle, `updateInventoryStock()`, is also relied on by FIFO picking and low-stock alerts, so it must keep reflecting *all* stock). Any future "RX-excluded" display surface reading grouped/aggregated stock must aggregate live off `InventoryItem` (see `getInventoryStockWithGrouping`'s grouped branches) rather than extending the bucket table.

---

## 3. Linkages & Dependencies

```mermaid
graph LR
    Procurement[Procurement Module] -->|Inward by PO| Inventory(Inventory Module)
    CatalogMasters[Lens Masters] -->|LensCoatingMaster, LensProduct| Inventory
    Sales[Sales Module] -->|FIFO Allocation Queue - issueToPreQc| Inventory
    Inventory -->|OUTWARD_SALE transactions| Accounting[Accounting Module]
    Inventory -->|InventoryItem.saleOrderId| Sales
```

* **Procurement:** PO receipts feed `InventoryInwardQueueTab`; `POInwardToInventory.jsx` creates `InventoryItem` rows per spec+tray.
* **Lens Masters:** `getInventoryDropdowns()` returns `coatings` (from `LensCoatingMaster`), `lensProducts`, `lensTypes`, `categories` — used by both `BulkLensSelection` and `InventoryInitializationForm`.
* **Sales:** Sale Orders with `INVENTORY_QUEUE_STATUSES` appear in `InventoryRequestQueueTab` (displayed as the **SO Request Query** tab). `issueToPreQc()` calls `reserveInventoryForSale()` per selected `InventoryItem` (or auto-inwards + reserves for a `rec_` receipt selection), transitioning the SO to `PRE_QC`. `getMatchingInventoryFIFO(saleOrderId)` populates `StockPickModal` with FIFO-ordered matches from both physical stock and the Inward Queue.
* **Procurement (extended, Pass D):** `PurchaseOrderReceipt.inwardedQty` now tracks partial consumption from the Sales side too (incremented by `issueToPreQc`'s auto-inward), not just from the dedicated PO Inward screen — any future Procurement-side reporting on receipt pending-qty must account for both sources.
* **Accounting:** `inventoryTransaction.create()` (type `OUTWARD_SALE`) is called inside `reserveInventoryForSale()`, feeding the cost-price valuation used in financial reporting. Pass D adds a second write path: `INWARD_PO`-type transactions created by the auto-inward branch of `issueToPreQc()`.

---

## 4. Pass History

| Pass | Scope | Status | Shipped |
|------|-------|--------|---------|
| **Pass A** | Product Inward flows (1a/1b/1c) + Items tab removal | ✅ QA PASSED | 2026-06-27 |
| **Pass B** | Dashboard analytics (relabel, graphs, Top10/Low10, export) | ✅ QA PASSED | 2026-06-27 |
| **Pass C** | Stock Summary pivot + filters + export | ✅ QA PASSED | 2026-06-27 |
| **Pass D** | Dashboard Top/Low side-by-side + value-trend fix + click-to-filter Transactions; Stock Summary Pivot/List toggle; SO Request Queue — Stock Pick Modal product/specs header + Inward Queue allocation + auto-inward-on-issue | ✅ QA PASSED (static review — no live DB/browser run; see `feature.md` Test results) | 2026-06-27 |
| **Pass E** | Inward/Outward Dashboard chart switched from ₹ value to quantity; Available/Reserved stat cards switched from `InventoryItem` row count/quantity to `InventoryStock.availableStock`/`reservedStock` sums (1 rework cycle — first attempt summing `InventoryItem.quantity` for RESERVED failed QA, see Key Data Rules above) | ✅ QA PASSED (static review — no live DB/browser run) | 2026-06-27 |
| **Pass F** | Fixed Inward/Outward Quantity Trend chart silently dropping the most recent day(s) of a range (`getStockValueReport()`'s `endDate` `lte` filter parsed as UTC-midnight-start-of-day instead of end-of-day; same bug also fixed in `getInventoryTransactions()`'s Transactions Log date filter). See `KB-022`. | ✅ QA PASSED (static review + Node-simulated boundary check — no live DB/browser run) | 2026-06-27 |
| **Pass G** | Follow-on to Pass F, found via live use: backend fix alone wasn't enough — `InventoryDashboard.jsx`'s `dateRangeToParams()` computed "today" via `toISOString()` (UTC), which under-reports the local IST date by one day during the midnight–5:30 AM window, so "today" never reached the backend at all. Added `toLocalDateStr()` helper using local `getFullYear/getMonth/getDate`; applied to both `startDate` and `endDate` in the `7d`/`30d` branches. See `KB-022` (extended). | ✅ QA PASSED (static review + Node-simulated `dateRangeToParams()` output + production `vite build` — no live DB/browser run) | 2026-06-27 |
| **Pass H** | Initial Stock Grid Inward Workflow: Simplified manual stock grid inward wizard into a 2-step setup. Enabled direct Product selection from a single dropdown, full Cartesian range combinations generation, expandable coating card view, and in-line tray and price allocations with live capacity validation. Fixed pre-existing backend bug where invalid `rightDia`/`leftDia` parameters crashed manual stock grid inward operations in database. | ✅ QA PASSED (L1 build + Node-simulated service integration test with DB transaction rollback) | 2026-06-27 |
| **Pass I** | Initial Stock Inward Location Optimization: Moved Location selection from Step 1 (global parameter) to Step 2 (per-spec row parameter), enabling multi-location stock initialization in a single batch. Updated backend API `bulkInwardFromGrid` to support split-level Location ID and validated correctly. | ✅ QA PASSED (L1 build + Node-simulated service integration test with DB transaction rollback) | 2026-06-27 |
| **Pass J** | Exclude RX-sourced stock (`InventoryItem`s from a `PurchaseOrder` with a non-null `saleOrderId`) from the Stock Summary List (pivot + all 4 grouped list modes) and the Initialize Stock Grid's tray-occupancy/capacity check. Grouped list branches were switched from reading the `InventoryStock` bucket table to a live `InventoryItem.groupBy` aggregation (bucket table has no RX/PO linkage). 1 rework cycle — first attempt was missing `availableStock`/`reservedStock`/`damagedStock`/`lastCostPrice`/`lastInwardDate` on the new aggregated rows, caught by QA via live-seeded-data verification. | ✅ QA PASSED (L1 build + live-seeded-data verification: RX item excluded from pivot/list/tray-occupancy, non-RX totals and stock-breakdown fields numerically confirmed correct, test data cleaned up afterward) | 2026-07-01 |
| **Pass K** | Inventory Workflow Corrections: Inward Queue filters to stock-type POs only; PO receive `isStockPO` uses `procurementType`; tray-to-tray TRANSFER allows same location + partial qty split; FIFO matching treats STOCK-linked PO items as general stock. | ✅ QA PASSED (static + build) | 2026-07-14 |
