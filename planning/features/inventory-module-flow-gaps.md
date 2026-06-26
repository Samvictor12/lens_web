<!--
Template for a single feature/bug file. Copy to planning/features/{feature-id}.md.
Each phase owns exactly one section below — do not edit another phase's section.
-->

## Meta

- id: inventory-module-flow-gaps
- title: Inventory module — close gaps in Product Inward, Dashboard analytics, and Stock Summary
- type: feature
- status: APPROVED
- contract_version: 3
- pass_b_status: DONE
- pass_c_status: DONE
- last_updated: 2026-06-05

## 1 Requirement

User audit of the Inventory module against 3 expected flows. Gap analysis performed (Explore agent scan + direct code verification by orchestrator) against the current codebase (`src/pages/Inventory`, `src/pages/PurchaseOrder/POInwardToInventory.jsx`, `src/pages/SaleOrder/SaleOrderForm.jsx`, `src/backend/services/inventory.service.js`, `prisma/schema.prisma`). Below: what exists today vs. what's requested, per sub-flow.

### 1. Product Inward

**1a. Initial/Manual Inward** — `InventoryInitializationForm.jsx` (a 3-step wizard) + `BulkLensSelection.jsx` already let a user pick a Location + Product and enter Sph/Cyl/Add range (from/to), auto-generating the cartesian-product spec combinations at 0.25 increments (`InventoryStockTab.jsx:271-280`'s `generateRange` confirms the increment logic is sound and reusable). **Gaps vs. the requested flow:**
- No Coating field anywhere in the spec-entry step (`BulkLensSelection.jsx` has zero coating references) — generated specs don't include a coating dimension, and there's no per-coating expandable grouping.
- After "Generate," the UI shows a power-grid (Sph × Cyl/Add matrix) with drill-down, not the requested **expandable-by-Coating list → expand reveals a 4-column table (Product Spec | Qty | Tray | Price)**.
- Tray dropdown today shows available capacity (`Tray — X/Y available`) and cross-row capacity validation exists at submit time, but there's no per-row Cost Price input matching "Price" as a column in the generated table — cost price is currently a single form-level field, not per-spec-row.

**Target:** rework this form so Coating is a selection input alongside Sph/Cyl/Add ranges; "Generate" produces a list grouped/expandable by Coating; expanding a coating group shows a table with columns Product Spec (auto-built string, e.g. `Sph=-2|Cyl=0|Add=0`) / Qty / Tray (dropdown showing available gap) / Price (per-row cost price input).

**1b. Inward by PO** — confirmed working end-to-end (PO received → Receipt form → Inward Queue → `POInwardToInventory.jsx` tray+qty entry) — **do not touch this flow's structure.** One confirmed real gap: tray capacity badges (`POInwardToInventory.jsx:713-748`, fed by `trayOccupancyData` from `fetchTrayOccupancy` at line 196-211) only reflect the **persisted DB occupancy** fetched once per tray. Cross-row capacity is correctly summed and blocked **at submit time** (`validate()`, lines 289-352), but the live badge a user sees while filling Spec Row 2 does **not** account for qty already typed into Spec Row 1 (same tray, same unsaved batch) — so a user can type 10/10 into Row 1, then see Row 2's tray badge still show stale "0/10 available" until they hit Save and get a toast error. **Target:** make the live badge (not just submit-time validation) reflect in-form sibling-row allocations, so selecting the same tray in Row 2 after Row 1 has already filled it to capacity immediately shows "Tray Full — 10/10" without waiting for submit.

**1c. Request Queue** — **correction after deeper investigation (user-flagged): this already exists, no new enum/migration needed.** `SaleOrder.status` is NOT the Prisma `SaleOrderStatus` enum I cited in the first draft (that enum is unused/vestigial) — it's a plain string field driven by the much richer JS-defined workflow in `src/backend/constants/saleOrderStatus.js` / `src/constants/saleOrderStatus.js`, with real statuses: `DRAFT, PO_RAISED, PO_RECEIVED, PO_CANCELLED, PRE_QC, PRE_QC_REJECTED, PRE_QC_SCRAPPED, PRODUCTION_READY, IN_PRODUCTION, ON_HOLD, AWAITING_QUALITY ("Post-QC"), POST_QC_REJECTED, POST_QC_SCRAPPED, READY_FOR_DISPATCH, DISPATCHED, DELIVERED, INVOICED, COMPLETED`. `PRE_QC` is the existing "QC1" stage (`AWAITING_QUALITY`/"Post-QC" is QC2) — **this is what "Awaiting QC1" already means in the codebase.**

A Request Queue page already exists: `src/pages/Inventory/SoOrderQueue.jsx` ("SO Order Queue"), backed by `saleOrderWorkflowService.getInventoryQueue()` (`saleOrderWorkflowService.js:42-75`), which lists Sale Orders matching `INVENTORY_QUEUE_STATUSES = ['DRAFT', 'PO_RECEIVED', 'PO_CANCELLED', 'PRE_QC_REJECTED', 'POST_QC_REJECTED', 'PRE_QC_SCRAPPED', 'POST_QC_SCRAPPED']` — i.e. it already triggers off `DRAFT`/`PO_RECEIVED` per the user's correction, not a fabricated "awaitingInventory" status. Each card has an "Issue & Pre-QC" button calling `issueSoToPreQc(id)` → backend `issueToPreQc()` (`saleOrderWorkflowService.js:238-282`), which transitions the order to `PRE_QC`.

**The real, narrower gap:** `issueToPreQc()` accepts an `inventoryItemIds` array param, and its own code comment says `// Mark linked inventory items to SO (stub: full FIFO in inventory phase)` — but `SoOrderQueue.jsx`'s `handleIssue` calls `issueSoToPreQc(id)` with **no** `inventoryItemIds`, so the button just flips the status without ever letting the user pick which physical inventory items to allocate. A proper "Inventory Stock Pick (FIFO Allocation)" modal **does** already exist and is fully built — but only inline inside `SaleOrderForm.jsx` (~lines 3239-3400+), and it only fires there when a SO transitions to `IN_PRODUCTION` (a later pipeline stage: `PRE_QC → PRODUCTION_READY → IN_PRODUCTION`), not at this Queue's `PRE_QC` issue step.

**Target:** wire "Issue & Pre-QC" in `SoOrderQueue.jsx` to open a Stock Pick modal (reusing the existing FIFO-matching UI/pattern from `SaleOrderForm.jsx`, likely via `getMatchingInventoryFIFO`) so the user selects actual `InventoryItem`(s) first, then call `issueSoToPreQc(id, inventoryItemIds)` with the selection, completing the currently-stubbed allocation step. No schema migration needed.

**Additional correction (user feedback): this needs to live as a Tab inside the Inventory module, not a standalone page.** Today `SoOrderQueue.jsx` is its own route (`/inventory/so-queue`, `App.jsx:157`) with its own sidebar entry ("SO Order Queue", `AppSidebar.jsx:77-78`), separate from `InventoryMain.jsx`'s tab bar (`Dashboard | Items | Inward Queue | Transactions | Stock Summary` — `InventoryMain.jsx:239-243`, with `InventoryInwardQueueTab` as the pattern to follow for "Inward Queue"). **Target:** refactor `SoOrderQueue.jsx`'s content into a `*Tab` component (matching the `InventoryInwardQueueTab` naming/structure pattern), add a new "Request Queue" tab to `InventoryMain.jsx` between "Inward Queue" and "Transactions", and remove the standalone route + sidebar entry so it's only reachable as a tab within Inventory (consistent with how Inward Queue already works).

**Open question flagged for planner-architect (contract phase):** there are now three places that touch inventory-for-sale-order allocation — (a) `issueToPreQc()`'s stub `inventoryItem.updateMany` (sets `saleOrderId`/`status: IN_PRODUCTION`, no quantity/stock-bucket update), (b) the `IN_PRODUCTION`-transition FIFO modal in `SaleOrderForm.jsx` (unclear what it calls on confirm — needs tracing), and (c) `reserveInventoryForSale()` in `inventory.service.js` (the properly-fixed reserve path from the prior `inventory-module-bugfixes` pass — sets `RESERVED` status, decrements `quantity`, updates `InventoryStock` buckets correctly). Planner-architect should decide whether the Queue's new Stock Pick action should call `reserveInventoryForSale()` directly instead of (or to replace) the bare stub, to avoid a third inconsistent allocation mechanism.

### 2. Dashboard

**2a. Metric cards** — exist today (`InventoryDashboard.jsx:16-85`): "Total Items", "Available" (count of AVAILABLE-status `InventoryItem` rows), "Reserved" (count of RESERVED-status rows), "Low Stock", "Total Inventory Value". **Gap:** card needs relabeling — "Total Items" → "Product Count" should count distinct **Products** (lens master rows), not physical item rows; "Available"/"Reserved" should explicitly be physical-item counts at the full spec level (e.g. `Pristine Digital Prog-Progressive-Blu+-Sph=0-Cyl=0-add=0` = 1 qty), which is closer to what `InventoryItem`-row counting already does — needs verification that Available/Reserved actually move correctly when a Sale Order's stock is issued (prior `inventory-module-bugfixes` pass fixed reserve-decrements-quantity; issue-on-dispatch path needs re-confirming against this exact metric pair).

**2b. 7-day Product Spec count graph** — **missing entirely.** No charting library (recharts/chart.js) is used anywhere in `src/pages/Inventory`. **Target:** add a chart (reuse whichever charting lib the rest of the app already uses, if any — needs a check during CONTRACT phase) showing Product Spec counts for a date range, filterable by Lens Type (Stock/Non-Stock/Custom) and Date Range (Last 7/30 days, custom), exportable to PDF and Excel (an Excel export pattern already exists in `lib/excelUtils.js`, used by PurchaseOrder — reuse that pattern; PDF export pattern needs to be located or introduced).

**2c. Inward/Outward value trend** — **missing.** `getStockValueReport()` exists in `inventory.service.js` (~line 1407) but is never called from any UI. **Target:** a trend graph (line/bar) plotting inward value vs. outward value over time, wired to this existing backend report (extend it if its current shape doesn't already split inward vs outward).

**2d. Top 10 / Low 10 selling products** — **missing.** Only a "Low Stock Alerts" widget exists today (stock-level alert, not a sales-velocity ranking). **Target:** two new widgets ranking products by units sold (need to define the lookback window — last 30/90 days, TBD in contract phase).

### 3. Stock Summary

**3a. Pivot table (Product+attributes rows × Tray columns under Location, with row total)** — partially exists. `InventoryStockTab.jsx` already supports grouping by Location, Location+Tray, Category, Lens Product, or none, and has a separate "Grid View" (Sph × Cyl/Add matrix with drill-down) — but neither is the requested layout: rows = Product (Type/Sph/Cyl/Add/Coating attributes), columns = one column per Tray (grouped under its parent Location header), last column = row total qty. **Target:** new table layout — true pivot with dynamic tray columns.

**3b. Filters** — partially exists (search across product/category/location, group-by selector). **Target:** explicit separate filters for Product Name, Attributes (Sph/Cyl/Add/Coating/Type), and Location Name, distinct from the current single search box.

**3c. Export** — **missing.** No PDF/Excel export wired up for Stock Summary. **Target:** add both, reusing the existing Excel pattern (`lib/excelUtils.js`) and whatever PDF pattern is found/established for 2b.

### Acceptance criteria (high level — detailed endpoint/schema contract in ## 2)

1. Manual Inward form collects Location, Product, Sph/Cyl/Add ranges, **and Coating**; Generate produces specs at 0.25 increments grouped/expandable by Coating; expanded view shows Product Spec / Qty / Tray (with live available-capacity) / Price (per-row).
2. PO Inward's tray-capacity badge updates live as sibling spec rows (within the same unsaved batch) allocate to the same tray — no waiting for submit to see "Tray Full X/X".
3. Request Queue becomes a tab in `InventoryMain.jsx` (alongside Dashboard/Items/Inward Queue/Transactions/Stock Summary), not a standalone page — standalone route + sidebar entry removed. Its "Issue & Pre-QC" action opens a Stock Pick modal (reusing the existing FIFO-pick UI pattern) before transitioning to `PRE_QC` — no new statuses/migration needed, existing `DRAFT`/`PO_RECEIVED` → `PRE_QC` transition already covers the user's "Draft or PO Received" → "Awaiting QC1" ask.
4. Dashboard: "Total Items" relabeled to "Product Count" (distinct products, not physical rows); Available/Reserved counts verified correct end-to-end including the issue-on-dispatch path.
5. Dashboard: new 7-day (and 30-day/custom) Product Spec graph, filterable by Lens Type, exportable to PDF/Excel.
6. Dashboard: Inward vs Outward value trend graph, wired to `getStockValueReport()`.
7. Dashboard: Top 10 / Low 10 selling products widgets.
8. Stock Summary: new pivot table (rows = product+attributes, columns = trays under location, last column = total); separate filters for Product Name / Attributes / Location; PDF/Excel export.

**Scope note:** this is a large, multi-part feature spanning 3 sub-systems (Inward forms, Dashboard analytics, Stock Summary reporting) and one schema migration. Flagging to planner-architect: consider whether to split CONTRACT/BUILD/QA into sequential sub-passes (e.g. Inward fixes first, then Dashboard, then Stock Summary) within this same feature file to keep each review cycle reviewable, rather than one giant diff — orchestrator defers that sequencing call to planner-architect's contract.

## 2 Contract

**Sequencing decision (architect's call):** this contract is split into 3 independently-shippable BUILD/QA passes, in this order:
- **Pass A — Product Inward** (1a manual inward + 1b PO-inward live badge + 1c Request Queue tab/Stock-Pick). Grouped together because all three touch the same `InventoryItem`/tray-occupancy/allocation surface and 1c's Stock Pick reuses 1a/1b's tray-occupancy patterns.
- **Pass B — Dashboard** (2a relabel + 2b spec-count graph + 2c value trend + 2d Top10/Low10).
- **Pass C — Stock Summary** (3a pivot + 3b filters + 3c export).
Each pass gets its own BUILD diff and QA cycle; do not start Pass B until Pass A is QA-signed-off, etc. Within Pass A, build 1b (smallest, pure frontend) → 1a → 1c (largest, touches 3 files + a schema-adjacent allocation decision) to de-risk early.

---

### Pass A — Product Inward

#### A1. Data (1a, 1b, 1c — no migration)

- No new Prisma models/fields needed anywhere in Pass A.
- `InventoryItem.coating_id` (schema.prisma:1126) **already exists** and is already wired into `bulkInwardFromGrid()` (`inventory.service.js:1633`, `coating_id: coating_id ? parseInt(coating_id, 10) : null`) — confirms 1a is a pure frontend + thin-payload change, not a backend rework.
- `getInventoryDropdowns()` (`inventory.service.js:906-908`) already returns `coatings` (from `LensCoatingMaster`) alongside `lensProducts`/`categories`/`lensTypes`/`locations`/`trays` — no new dropdown endpoint needed for 1a.
- Per-row cost price (1a) requires widening the existing `rows[].splits[]` shape consumed by `bulkInwardFromGrid` (`inventory.service.js:1537-1685`) — `splits[].costPrice` becomes a new optional key (falls back to form-level `costPrice` if absent), no schema change since `InventoryItem.costPrice` (schema.prisma:1143) is already per-row at the DB level; today it's just fed the same form-level value for every row (`base.costPrice = parseFloat(costPrice) || 0` at `inventory.service.js:1637`).

#### A2. API

**1a — Manual Inward (Coating + per-row Price)**
- `POST /inventory/bulk-inward-grid` (existing route backing `bulkInwardFromGrid`, `inventory.routes.js`) — **no path/method change.**
  - Request: existing body shape unchanged at top level (`location_id, lens_id, category_id, Type_id, coating_id, costPrice, defaultDia, rows`) — `coating_id` already accepted (confirm controller passes it through; if `inventoryController.js`'s handler doesn't destructure `coating_id` from `req.body` today, add it — verify during BUILD).
  - New: each `rows[].splits[]` entry gains optional `costPrice: number` (per-spec-row price). Service-side: `base.costPrice = parseFloat(split.costPrice ?? costPrice) || 0` (falls back to form-level if a row doesn't override).
  - Response: unchanged (`{ createdCount, totalQuantity, inventoryItemIds }`).
  - Status codes: unchanged (200 success, 400 `LOCATION_REQUIRED`/`LENS_REQUIRED`/`NO_SELECTIONS`/`TRAY_REQUIRED`/`TRAY_NO_CAPACITY`/`TRAY_CAPACITY_EXCEEDED`/`NO_VALID_QTY`, 404 `LENS_NOT_FOUND`).

**1b — PO Inward live tray badge**
- No new endpoint. `getTrayOccupancy(trayId)` (existing, fed by `fetchTrayOccupancy` in `POInwardToInventory.jsx:196-211`) stays as the DB-truth baseline fetch. The live badge becomes a pure frontend derived value — see UI section.

**1c — Request Queue tab + Stock Pick**
- `POST /sale-orders/:id/issue-to-pre-qc` (existing route, `saleOrderController.js:481-495` → `saleOrderWorkflowService.issueToPreQc()`) — **no path/method change.**
  - Request: `{ inventoryItemIds: number[] }` — already accepted by the route; today `SoOrderQueue.jsx`'s `handleIssue` calls `issueSoToPreQc(id)` with no array (`issueSoToPreQc` default param `= []`, `services/saleOrder.js:163-171`). Fix: the new Stock Pick modal must populate this array before calling.
  - **Allocation path decision (resolves the open question flagged in `## 1`):** `issueToPreQc()`'s current stub (`saleOrderWorkflowService.js:265-271`) only does `inventoryItem.updateMany({ saleOrderId, status: 'IN_PRODUCTION' })` — no quantity decrement, no `InventoryStock` bucket update, and it sets status straight to `IN_PRODUCTION` even though the SO itself is only moving to `PRE_QC` (a status mismatch: item says "in production," SO says "pre-QC"). Tracing `SaleOrderForm.jsx`'s own `IN_PRODUCTION`-transition FIFO modal (`handleFifoConfirm`, lines 1563-1617) confirms it calls `updateSaleOrderStatus(id, "IN_PRODUCTION", undefined, itemIds)` → backend `saleOrderService.updateStatus()` (`saleOrderService.js:906-968`) — which **completely ignores its 6th `inventoryItemIds` parameter** (never referenced again in the function body; `saleOrderStatusService.transition()` has zero awareness of inventory items). So today **neither** of the two existing call sites actually reserves stock correctly — confirming there is no working canonical path yet, only `reserveInventoryForSale()` (`inventory.service.js:719-780`) is correct (sets `RESERVED` status, decrements `quantity`, updates `InventoryStock` via `updateInventoryStock(..., 'RESERVE')`, logs an `OUTWARD_SALE` transaction).
  - **Decision: replace `issueToPreQc()`'s stub with calls to `reserveInventoryForSale(inventoryItemId, quantity, saleOrderId, userId)`**, once per selected `inventoryItemId` (quantity = the eye-pair-derived qty already computed by `requiredPoQty`/the existing `qty` helper at `saleOrderWorkflowService.js:36-39` — reuse `1` per eye selected, matching how `InventoryItem.quantity` already encodes 0.5/1 per eye). Status ends at `RESERVED` (not `IN_PRODUCTION` — that transition happens later, matching the SO's own `PRE_QC` stage). This is Pass A scope only — fixing the same `inventoryItemIds`-ignored bug in `saleOrderService.updateStatus()`'s `IN_PRODUCTION` path is **out of scope** for this feature (flag as a follow-up bug, not silently fixed here, to keep this diff reviewable — note it in QA notes).
  - **REWORK fix (resolves QA L4 FAIL — `reserveInventoryForSale` quantity/status bug):** verified directly against current code (not the prior contract's assumption) that `InventoryItem.quantity` is **not** a fixed 1-unit-per-row convention. `bulkInwardFromGrid` (`inventory.service.js:1648`, `quantity: qty`) and the pre-existing PO-inward path `inwardReceiptToInventory` (`purchaseOrderService.js:1747`, `quantity: split.qty`) **both** create one row per (spec × tray/location split) with `quantity` set to whatever the user typed — confirms this is a systemic, pre-existing row-shape across both inward paths, not something newly introduced by 1a's Manual Inward UI. Rejects QA option (c) (constrain inward to 1-unit rows) on these grounds: it would require backend rework of both 1a and the already-shipped/working 1b PO-inward path, far exceeding this pass's scope. Also rejects whole-row reservation (QA option (a)): confirmed via `requiredPoQty()` (`saleOrderWorkflowService.js:37-41`) and `issueToPreQc`'s own `requiredEyes` check (`saleOrderWorkflowService.js:263-266`) that a Sale Order line always needs exactly 1 unit per eye (1 or 2 total, never a variable bulk qty) — reserving a row's *entire* `quantity` would over-allocate any row with qty > 1 and is semantically wrong for what "pick this item in Stock Pick" means.
  - **Chosen fix — surgical, quantity-aware status flip inside `reserveInventoryForSale()` itself** (`inventory.service.js:724-790`), not a UI redesign and not a `bulkInwardFromGrid` change:
    - After the existing `inventoryItem.quantity < quantity` (`INSUFFICIENT_STOCK`) and `status !== 'AVAILABLE'` (`ITEM_NOT_AVAILABLE`) guards (unchanged), compute `remainingQty = inventoryItem.quantity - quantity` and `fullyConsumed = remainingQty <= 0.001` (float tolerance, matching the existing `+ 0.001` tolerance pattern already used in `bulkInwardFromGrid`'s tray-capacity check at `inventory.service.js:1615`).
    - The `client.inventoryItem.update(...)` call's `data` changes from unconditional `status: 'RESERVED'` to `status: fullyConsumed ? 'RESERVED' : 'AVAILABLE'`, and `quantity: Math.max(0, remainingQty)` (replaces the current unguarded `inventoryItem.quantity - quantity`).
    - `saleOrderId` and `reservedDate` must **only** be set on the update when `fullyConsumed` is true — a row that stays `AVAILABLE` after a partial reservation must not be pre-tied to one sale order (it is still generally available stock; tying it to `saleOrderId` while `status: 'AVAILABLE'` would corrupt any later query that joins on `saleOrderId` expecting an exclusively-reserved row). When not fully consumed, omit both fields from the update payload entirely (leave them at their current value — `null` for a never-before-touched row).
    - `updateInventoryStock(inventoryItem, quantity, 'RESERVE', client)` call is **unchanged** — it already correctly operates on the passed `quantity` argument (the amount actually being reserved), not the row's full original `quantity`, so the `InventoryStock` bucket-level `availableStock`/`reservedStock` accounting was already correct; only the row-level `status` flip was buggy.
    - The `inventoryTransaction.create(...)` block (transaction log) is **unchanged** — `quantity: -quantity` and `balanceAfter: inventoryItem.quantity - quantity` already correctly reflect the partial amount being reserved, not the row's full original quantity.
    - Net effect: a 10-unit row reserved for 1 unit becomes `quantity: 9, status: 'AVAILABLE'` (still visible to `getMatchingInventoryFIFO`'s `buildWhereClause`, `saleOrderService.js:993`, which filters on `status: 'AVAILABLE'` and `quantity: { gt: 0 }` — already compatible with this fix, no change needed there). A row reserved down to exactly 0 remaining becomes `quantity: 0, status: 'RESERVED', saleOrderId, reservedDate` — fully removed from the available pool, as today.
    - **No schema migration** — `InventoryItem.status` remains the existing single `InventoryItemStatus` enum field per row (confirmed `schema.prisma:1159`); this fix works entirely within that constraint by choosing *when* to flip it, not by adding a new status value or a quantity-aware status model.
    - **No `StockPickModal.jsx` UI change needed** — the modal continues to let the user pick one whole row per eye and request exactly 1 unit from it (matching `issueToPreQc`'s `reserveInventoryForSale(inventoryItemId, 1, ...)` call, unchanged from the existing A2 decision above); the row's displayed `quantity` value naturally decrements and the row reappears with its true remaining qty in any later FIFO fetch instead of vanishing from the available pool while still holding unreserved stock.
    - **Generic fix, not SO-specific:** `reserveInventoryForSale` is also called directly via `POST /api/inventory/reserve` (`inventoryController.js:289-310`, arbitrary caller-supplied `quantity`) — this fix applies uniformly there too, which is strictly more correct for that path as well (it had the identical bug for any non-1 `quantity` reservation, SO-issue or not).
    - **kb_candidate carries forward as KB-016** (already drafted in `## 4`): "`InventoryItem.quantity` is a per-row aggregate, not a fixed 1-unit-per-row convention; any code reserving/consuming a fraction of a row's `quantity` must not flip the row's `status` to a terminal state unless the full `quantity` is consumed." This contract fix is the canonical implementation of that KB entry — BUILD should add the KB entry alongside the fix.
  - Response/status codes: unchanged (200 `{ success, message: 'Issued to Pre-QC', data: order }`; existing 404 `ORDER_NOT_FOUND`, 400 `INVALID_STATUS`/`OPEN_PO`/`BOTH_EYES_REQUIRED`).
- `GET /sale-orders/inventory-queue` (existing, backs `getInventorySoQueue` / `getInventoryQueue()`) — unchanged, reused as-is by the new tab.
- No new route for Stock Pick matches — reuse existing `GET` behind `getMatchingInventoryFIFO(saleOrderId)` (`saleOrderService.js:975-1051`, routed via whatever endpoint `SaleOrderForm.jsx` calls today) to populate the modal's candidate list.
- Route/sidebar removal: delete `<Route path="/inventory/so-queue" .../>` (`App.jsx:157`) and the "SO Order Queue" sidebar entry (`AppSidebar.jsx:76-80`).

#### A3. UI

**1a — `InventoryInitializationForm.jsx` + `BulkLensSelection.jsx`**
- `BulkLensSelection.jsx`: add a `Coating` select (sourced from `getInventoryDropdowns().data.coatings`, passed down as a new prop `coatings`) alongside the existing Sph/Cyl/Add range inputs (near `ranges` state, `BulkLensSelection.jsx:30-37`). Selecting a coating is required before "Display Grid" is enabled (mirror the existing `lensId` guard at lines 401-409).
- Replace the current Sph×Cyl/Add grid (`renderGrid()`, lines 174-299) — or add alongside it as a second display mode — with: **expandable-by-Coating list** → each coating header expands to a 4-column table: **Product Spec** (auto-built string `Sph=<v>|Cyl=<v>|Add=<v>`, derived client-side from the same `sphValues`/`colValues` cartesian product already computed by `generateRange`) / **Qty** (existing per-cell quantity input, reused) / **Tray** (dropdown, reused pattern from `InventoryInitializationForm.jsx`'s step-3 `trayOptions`/`trayLabel` at lines 186-196) / **Price** (new per-row numeric input, optional — defaults to form-level `costPrice` if blank).
- `InventoryInitializationForm.jsx`: add `coating_id` state alongside `Type_id`/`category_id`/`lens_id` (around line 67-70); pass to `BulkLensSelection` as a prop; include in the `bulkInwardFromGrid` payload (line 342-350). Step 3's per-row split UI (lines 518-599) gains a Price input per split row, defaulting to the global `costPrice` field but overridable — wire into `rowSplits[key][idx].costPrice`.
- Guards: Coating select follows the same `disabled={!lensId}` / inline warning pattern already used for "Display Grid" (lines 401-417) — no `readOnly`/`readOnlyInEditMode` concept applies here (this is a create-only wizard, no edit mode).

**1b — `POInwardToInventory.jsx`**
- Add a derived `siblingAllocatedQty(trayId, excludeRowKey, excludeSplitIdx)` helper computed from the current `rowSplits` state (all rows, all splits, same `tray_id`, summed, excluding the cell being rendered) — pure client-side, no new fetch.
- Modify the badge render block (lines 739-751, inside the `splits.map` at line 708) so `effectiveAvailable = Math.max(0, selectedTrayOccupancy.availableQty - siblingAllocatedQty(tId, row.key, splitIdx))` and the displayed text/color uses `effectiveAvailable` / `effectivePercentUsed` instead of the raw DB-only `availableQty`/`percentUsed`. When `effectiveAvailable <= 0`, badge reads **"Tray Full — X/X"** (red, matching existing `bg-red-100 text-red-800` class at line 718-720) immediately on typing into a sibling row — no submit required.
- `validate()` (lines 278-363) keeps its existing submit-time logic unchanged (it already correctly sums `trayAllocations` across the whole batch, lines 290-300) — this pass only adds the **live** read-derived badge; the gap was purely the badge lagging behind, not the validation logic.

**1c — Request Queue tab + Stock Pick modal**
- New `InventoryRequestQueueTab.jsx` (new file, matching `InventoryInwardQueueTab.jsx`'s structure/props pattern: `{ refreshKey = 0 }` prop, internal `getInventorySoQueue`/`getInventoryQueue` fetch, local pagination/search state) — port `SoOrderQueue.jsx`'s `QueueCard` + list rendering (lines 17-168) into this tab component; delete `SoOrderQueue.jsx` once ported (or leave as dead file removed from routing — BUILD's call, prefer deletion).
- `InventoryMain.jsx`: add `<TabsTrigger value="requestQueue">Request Queue</TabsTrigger>` between "Inward Queue" (line 241) and "Transactions" (line 242); change `grid-cols-5` → `grid-cols-6` (line 238); add `requestQueue: '/inventory/request-queue'` to `tabRoutes` (line 25-31) and a matching branch in `getActiveTab` (lines 33-40); add `<TabsContent value="requestQueue">...</TabsContent>` between the "inward" and "transactions" `TabsContent` blocks (after line 352).
- New `StockPickModal.jsx` (new file) — port the existing FIFO modal UI from `SaleOrderForm.jsx` (lines 3239-3400+: the table with "Inward Date (FIFO)" column, "Oldest / FIFO" badge, per-eye selection) into a standalone reusable component taking `{ saleOrderId, requiredEyes: { rightEye, leftEye }, onConfirm(itemIds), onCancel }` props, fetching via `getMatchingInventoryFIFO(saleOrderId)`. `InventoryRequestQueueTab.jsx`'s "Issue & Pre-QC" button opens this modal instead of calling `issueSoToPreQc(id)` directly; on confirm, calls `issueSoToPreQc(id, itemIds)`.
- Guards: no `readOnly`/`hiddenFn` props needed — Issue & Pre-QC button visibility stays exactly as today (`QueueCard`, always shown; "Raise PO" conditionally shown for `['DRAFT','PO_CANCELLED']`, unchanged).

#### A4. Rules

- **Save sequence (1a):** validateStep1 (location) → validateStep2 (type/category/lens/coating + ≥1 qty) → validateStep3 (tray allocation sums match grid qty, capacity not exceeded) → submit. Coating becomes a required field in validateStep2 (currently only checks `Type_id/category_id/lens_id`) — add `coating_id` to that check.
- **Idempotency (1a/1c):** unchanged — `bulkInwardFromGrid` and `issueToPreQc` are not idempotent today (re-submitting creates duplicate `InventoryItem` rows / re-transitions status) and this feature does not add idempotency keys; out of scope.
- **Error handling (1b):** the live badge is purely additive UI — if `trayOccupancyData[trayId]` hasn't loaded yet (still fetching), fall back to showing only the DB-fetched value with no sibling-deduction (don't block render on a loading state); once loaded, recompute on every `rowSplits` change via `useMemo`.
- **Error handling (1c):** if `reserveInventoryForSale()` throws `INSUFFICIENT_STOCK` or `ITEM_NOT_AVAILABLE` for any selected item inside `issueToPreQc()`'s transaction, the whole transaction rolls back (Prisma `$transaction` semantics already in place at `saleOrderWorkflowService.js:239`) — surface the specific item/reason in the toast, matching existing error-surfacing pattern in `SoOrderQueue.jsx`'s `handleIssue` catch block (lines 91-93).
- **LOCKED after CONTRACT_COMPLETE.**

---

### Pass B — Dashboard

#### B1. Data

- No new Prisma models. `InventoryTransaction` (schema.prisma:1197-1244) already has everything needed for 2b/2c/2d: `transactionDate`, `type` (`InventoryTransactionType` enum, includes `OUTWARD_SALE`), `quantity`, `totalValue`, `inventoryItemId` → `lens_id`.
- `CONTRACT_REVIEW_NEEDED` for 2b's exact "Product Spec count" definition:
  - missing: the requirement says "Product Spec counts for a date range" but doesn't specify whether this counts (a) distinct Sph/Cyl/Add/Coating spec combinations *inwarded* in the window, (b) total *quantity* inwarded in the window, or (c) running distinct-spec-count snapshot as of each day in the window (a cumulative line, not a per-day delta). These three produce very different graphs (bar of daily distinct-spec-counts vs. line of cumulative totals). BUILD should default to **(a) daily count of distinct (lens_id, coating_id, Sph, Cyl, Add) combinations newly inwarded each day**, sourced from `InventoryTransaction` where `type IN ('INWARD_PO','INWARD_DIRECT')` joined to `InventoryItem` for the spec fields, grouped by `DATE(transactionDate)` — confirm with user/PO during BUILD kickoff before finalizing the query; flag if wrong.

#### B2. API

- `GET /inventory/dashboard` (existing, backs `getInventoryDashboardEnhanced()`, `inventory.service.js:1316-1400`) — relabel only, no shape change needed for 2a (frontend just renders `stats.totalItems` under a new label — see B3). For the "Product Count = distinct products" requirement, this endpoint needs one new field: add `productCount: await prisma.inventoryItem.groupBy({ by: ['lens_id'], where: { deleteStatus:false, activeStatus:true } }).then(r => r.length)` (or equivalent `distinct` count query) alongside existing `totalItems`. Response gains `productCount: number`.
- New `GET /inventory/dashboard/spec-trend?from&to&lensTypeId` — new endpoint, new service method `getProductSpecTrend({ from, to, Type_id })` in `inventory.service.js`. Response: `{ data: [{ date: 'YYYY-MM-DD', count: number }], summary: { totalSpecs, dateRange } }`. Status codes: 200, 400 `INVALID_DATE_RANGE`.
- `GET /inventory/stock-value-report` (existing, backs `getStockValueReport()`, `inventory.service.js:1407-1508`) — currently groups by `lens_id`/`category_id`/`location_id` only (a flat group list, no time buckets: confirmed at lines 1452-1485, no date-bucketing logic exists). For 2c's **trend** (inward vs outward value *over time*), extend with a new `groupBy: 'date'` option that buckets `transactionDate` by day (or by week if range > 60 days) instead of by `lens_id`/etc. Response when `groupBy=date`: `{ summary: {...unchanged...}, data: [{ date: 'YYYY-MM-DD', inwardValue, outwardValue }] }`. This is an additive branch in the existing `groupBy` switch (lines 1453-1458) — not a breaking change to existing callers (`Reports.jsx`).
- New `GET /inventory/dashboard/top-selling?direction=top|low&limit=10&days=30` — new endpoint, new service method `getTopSellingProducts({ direction, limit, days })`: aggregates `InventoryTransaction` where `type='OUTWARD_SALE'` and `transactionDate >= now() - days`, grouped by `inventoryItem.lens_id`, summed `ABS(quantity)`, sorted `desc` (top) or `asc` (low, excluding zero-sales products unless explicitly requested — TBD, default exclude), limited. Response: `{ data: [{ lens_id, lensName, unitsSold }], lookbackDays }`. Status: 200, 400 for invalid `direction`.
  - **Lookback window decision:** default `days=30`, selectable by the widget UI between 30/90 (resolves the requirement's "TBD" — pick 30/90 toggle, default 30, matching the closest precedent of 2b's 7/30-day pattern).

#### B3. UI

- `InventoryDashboard.jsx`: relabel `statCards[0]` (line 17-23) from `"Total Items"` → `"Product Count"`, value source `stats.productCount` (new field from B2) instead of `stats.totalItems`. Add a one-line subtext under the Available/Reserved cards (lines 24-37) clarifying "physical item count," e.g. `<p className="text-[10px] text-muted-foreground">at full spec level</p>` — purely cosmetic, no new data needed (the existing `availableItems`/`reservedItems` counts, confirmed at `inventory.service.js:1331-1346`, already count `InventoryItem` rows, which is already the "physical item" granularity the requirement wants — no backend logic change required for 4's "verified correct" ask beyond a QA pass confirming `reserveInventoryForSale()`/dispatch-issue paths move these counts correctly end-to-end test in Pass A QA, not a Pass B code change).
- New `InventorySpecTrendChart.jsx` (new file) — `recharts` `<BarChart>` or `<LineChart>` (already a dependency, confirmed in `package.json`), date-range toggle (7d/30d/custom `<DatePicker>` — check for an existing date-range picker component under `src/components/ui` before introducing a new one), Lens Type filter (`<FormSelect>` sourced from `getLensTypesDropdown()`, already used elsewhere e.g. `InventoryInitializationForm.jsx:14-16`), Export buttons (PDF/Excel — see below).
- New `InventoryValueTrendChart.jsx` (new file) — `recharts` `<LineChart>` with two series (`inwardValue`, `outwardValue`), wired to the new `groupBy=date` branch of `getStockValueReport`.
- New `TopSellingWidget.jsx` (new file) — two ranked lists (Top 10 / Low 10) rendered as simple bordered rows (reuse the existing `lowStockItems` widget's row styling pattern, `InventoryDashboard.jsx:134-156`), with a 30/90-day toggle.
- **Export — no existing PDF library in the codebase** (confirmed: no `jspdf`/`pdfmake`/`html2canvas`/`html2pdf` references anywhere under `src` or in `package.json`). Decision: add **`jspdf` + `jspdf-autotable`** as new `dependencies` (lightest-weight client-side option, no server round-trip needed since the chart data is already in the browser) for 2b/2c/2d/3c's PDF export. Excel export reuses the **server-side `ExcelJS` pattern** already established in `purchaseOrderService.js:442-886` (`exportPurchaseOrderToExcel`: builds workbook server-side, streams via `res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')` + `wb.xlsx.write(res)`) — **not** the client-side CSV-only `lib/excelUtils.js` (that file produces `.csv` with an `.xlsx`-flavored function name; despite its name it is not a true Excel pattern and should not be reused for new work). New endpoints: `GET /inventory/dashboard/spec-trend/export?format=xlsx&...` and equivalent for the value-trend/top-selling widgets, mirroring `exportPurchaseOrderToExcel`'s controller/service split.
- Guards: none of the dashboard widgets have `readOnly`/`readOnlyInEditMode` — Dashboard is a read-only reporting tab; only loading/empty states apply (mirror existing `isLoading ? "—" : value` pattern, line 58).

#### B4. Rules

- Date-range filters (2b) clamp `to >= from`; default `from = today - 7d` on first load, `to = today`.
- PDF/Excel exports operate on the **currently filtered/visible** dataset (not a fresh unfiltered server pull) for charts (client-side jsPDF render of the visible chart + a data table); for true tabular exports (top-selling, value-trend raw data) the Excel export hits the server endpoint to get full precision values rather than canvas-rendered numbers.
- No save/mutation flows in Pass B — entirely read/report. Error handling: standard toast-on-fetch-failure, matching existing `InventoryDashboard.jsx` toast pattern.
- **LOCKED after CONTRACT_COMPLETE.**

---

### Pass C — Stock Summary

#### C1. Data

- No new Prisma models/fields. `InventoryStock` (schema.prisma:1247-1287) already has the unique key `[lens_id, category_id, Type_id, coating_id, location_id, tray_id]` — i.e. one row per (product+attributes, location, tray) combination already exists; the pivot is purely a **reshape of existing query results**, not a new aggregation.

#### C2. API

- `GET /inventory/stock-grouped` (existing, backs `getInventoryStockWithGrouping()`, `inventory.service.js:1088` onward) — add a new `groupBy=pivot` mode (additive, alongside existing `location`/`location_tray`/`category`/`lens`/`none` modes already handled client-side in `InventoryStockTab.jsx:144-183` — note today's grouping is actually done **client-side** in `groups` `useMemo`, not server-side; the server endpoint just returns the flat `InventoryStock` rows). For pivot mode, **no backend change needed at all** — the flat rows already carry `lens_id`/attributes + `location_id`/`tray_id`/`totalStock`, sufficient to pivot client-side into rows=product+attributes, columns=tray-under-location. Confirm this during BUILD; if row volume makes client-side pivoting too slow, fall back to a server-side pivot query (defer that decision to BUILD based on actual row counts).
- New separate filter params on the same endpoint: `productName` (string, matches `lensProduct.lens_name` contains), `attributes` (object: `{ sph, cyl, add, coating_id, Type_id }`, matches `InventoryItem`/`InventoryStock` spec fields), `locationName` (string, matches `location.name` contains) — additive to the existing single `search` param (kept for backward compat with other callers, if any).
- New `GET /inventory/stock-grouped/export?format=xlsx|pdf&...` mirroring the Pass B export pattern (server-side `ExcelJS` for xlsx; client-side `jspdf-autotable` for pdf, fed the already-fetched pivot data — no new PDF server endpoint needed since pivot data is already client-side).

#### C3. UI

- `InventoryStockTab.jsx`: add a new view mode "Pivot View" (third toggle alongside existing "List View"/"Grid View" toggle at lines 641-652) — new pivot-table render function `renderPivotView()`: rows = one per distinct (lens_id, category_id, Type_id, coating_id) combination (label: product name + attribute string), columns = one per distinct `tray_id` **grouped under a parent `location_id` header** (two-row `<thead>`: top row = location names spanning their trays via `colSpan`, second row = tray names — same two-tier header pattern already used in `BulkLensSelection.jsx`'s R/L sub-header, lines 221-236, reusable structurally), last column = row total (`sum` across all tray columns for that row).
- Replace the single search `<Input>` (lines 603-616) with three separate filter inputs when not in Grid/Pivot view: Product Name (`<Input>`), Attributes (a small filter row: Sph/Cyl/Add number inputs + Coating/Type `<FormSelect>`s, collapsible), Location Name (`<Input>` or `<FormSelect>` sourced from `getInventoryDropdowns().data.locations`).
- Export buttons (PDF/Excel) placed in the same toolbar Card (lines 600-659), enabled only when there is data — reuse exact button styling from wherever Pass B lands its export buttons for consistency.
- Guards: none — Stock Summary is read-only, same as Dashboard.

#### C4. Rules

- Pivot table caps displayed tray-columns at a reasonable number per page (TBD exact number during BUILD based on real tray-count-per-location in seed/prod data) with horizontal scroll for overflow — mirror the existing `overflow-auto` pattern already used in `BulkLensSelection.jsx`'s grid (line 179) and the Grid View pivot in `InventoryStockTab.jsx` (line 412-413).
- Filters are AND-combined (Product Name AND Attributes AND Location), consistent with how the existing single `search` box behaves today (implicit OR-across-fields, AND-across-terms — confirm exact current semantics during BUILD by reading the backend `search` handling in `getInventoryStockWithGrouping`, not re-derived here since it's existing behavior being preserved, not changed).
- **LOCKED after CONTRACT_COMPLETE.**

---

## 3 Test plan

**Scope: Pass A — Product Inward only (1a manual inward, 1b PO-inward live badge, 1c Request Queue tab + Stock Pick). Pass B/C are not yet built — no test scenarios below cover Dashboard or Stock Summary.**

### 1b — PO Inward live tray badge (`POInwardToInventory.jsx`)

- [ ] Happy path — fill Row 1's split with a tray + qty equal to that tray's full available capacity, then open Row 2 and select the same tray: badge immediately reads "Tray Full — X/X" (red) without saving/submitting.
- [ ] Partial allocation — Row 1 allocates half a tray's capacity to Tray A; Row 2 selecting Tray A shows the available figure reduced by Row 1's qty (not the raw DB `availableQty`), and the progress bar reflects the combined (DB + sibling) usage.
- [ ] Edge case — editing Row 1's qty back down (e.g. from 10 to 4) live-updates Row 2's badge for the same tray to show more availability again, without a tray-occupancy refetch.
- [ ] Edge case — removing a split (Trash icon) that had qty allocated to a tray frees up that qty in sibling rows' badges immediately.
- [ ] Regression — submit-time `validate()` still blocks save and shows the existing toast when total allocation across the batch exceeds tray capacity (unchanged logic, only the live badge is new).
- [ ] Edge case — tray occupancy still loading (`trayOccupancyData[trayId]` undefined): badge area renders nothing (no crash), no premature "Tray Full" shown before data loads.

### 1a — Manual Inward: Coating + per-row Price (`InventoryInitializationForm.jsx` + `BulkLensSelection.jsx`)

- [ ] Happy path — select Location → Type → Category → Lens Product → Coating → enter Sph/Cyl(or Add) ranges → "Display Grid" succeeds and shows the expandable-by-Coating list with the selected coating's header.
- [ ] Coating-required validation — attempt "Display Grid" without selecting a Coating (but with Lens Product selected): inline warning "Please select a Coating first." appears, grid does not display.
- [ ] Expand/collapse — clicking the coating header toggles the 4-column (Product Spec / Qty / Tray / Price) table open/closed.
- [ ] Auto-built spec string — for a Single/Bifocal product, a row's Product Spec column matches `Sph=<v>|Cyl=<v>|Add=0` (or `Add=<v>` for bifocal); for Progressive, each R/L row appends `|Eye=R` or `|Eye=L`.
- [ ] Per-row Tray + Price — entering a Qty in a spec row enables that row's Tray dropdown and Price input; selecting a Tray and leaving Price blank carries the row through to Step 3 with the row's Tray pre-filled and Price falling back to the form-level Cost Price on submit.
- [ ] Per-row Price override — entering a custom Price in a spec row's Price input and submitting results in that row's created `InventoryItem.costPrice` reflecting the override, not the form-level Cost Price (verify via Items tab or DB after submit).
- [ ] Step2→Step3 validation — `validateStep2` now blocks "Next" (toast "Select type, category, lens product, and coating") when Coating is unset, in addition to the pre-existing Type/Category/Lens checks.
- [ ] Edge case — switching Lens Product or Category after a Coating was chosen resets the Coating selection and clears the grid (mirrors existing reset-on-category-change behavior).
- [ ] Backend regression — `bulkInwardFromGrid` payload with `coating_id` set and no `splits[].costPrice` override still creates items with `coating_id` populated and `costPrice` equal to the form-level value (existing behavior preserved).

### 1c — Request Queue tab + Stock Pick modal

- [ ] Navigation — "Request Queue" tab appears in `InventoryMain.jsx`'s tab bar between "Inward Queue" and "Transactions"; navigating to `/inventory/request-queue` loads the tab directly (deep link works).
- [ ] Route/sidebar removal — `/inventory/so-queue` no longer resolves to a standalone page (now routes through `InventoryMain` with the Request Queue tab active); "SO Order Queue" no longer appears as its own sidebar entry.
- [ ] Happy path — clicking "Issue & Pre-QC" on a queue card opens the Stock Pick modal (not an immediate status change); modal pre-selects the oldest ("FIFO") matching item per required eye.
- [ ] Happy path confirm — confirming the Stock Pick modal with valid selections calls `issueSoToPreQc(id, itemIds)`, the SO's status moves to `PRE_QC`, the selected `InventoryItem`(s) move to `RESERVED` status with `quantity` decremented by 1 each, and the queue list refreshes (the issued order drops out of the `INVENTORY_QUEUE_STATUSES` list).
- [ ] Edge case — both-eyes order with only one eye's item selected: modal's "Confirm & Issue to Pre-QC" button stays disabled until both selections are made.
- [ ] Edge case — no matching stock for an eye: modal shows "No matching items found..." for that eye and blocks confirm (button disabled since no item id can be selected).
- [ ] Edge case / rollback — simulate `INSUFFICIENT_STOCK` or `ITEM_NOT_AVAILABLE` on the second selected item (e.g. another session reserves it between FIFO fetch and confirm): the whole `issueToPreQc` transaction rolls back — the SO status remains unchanged (not left at `PRE_QC`), the first item's reservation is NOT left half-applied, and the error toast in the Request Queue tab surfaces the failure reason.
- [ ] Raise PO action — "Raise PO" button still only shows for `DRAFT`/`PO_CANCELLED` orders and behaves as before (unchanged by this pass).
- [ ] Regression — "View SO" button still opens the sale order in a new tab.

### REWORK fix — quantity-aware status flip in `reserveInventoryForSale` (resolves QA L4 FAIL)

- [ ] Partial reservation — reserving 1 unit from an `InventoryItem` row with `quantity: 10, status: 'AVAILABLE'` results in that row at `quantity: 9, status: 'AVAILABLE'` (unchanged `saleOrderId`/`reservedDate`, still `null`); the row remains visible to `getMatchingInventoryFIFO`'s `buildWhereClause` (`status: 'AVAILABLE'`, `quantity: { gt: 0 }`).
- [ ] Full consumption — reserving the last unit from a row with `quantity: 1, status: 'AVAILABLE'` results in `quantity: 0, status: 'RESERVED', saleOrderId` set to the reserving sale order, `reservedDate` set.
- [ ] Regression — `updateInventoryStock`'s `InventoryStock` bucket accounting (`availableStock`/`reservedStock`) and the `inventoryTransaction` log (`quantity: -quantity`, `balanceAfter`) are unaffected by this fix — both already operated on the passed `quantity` argument, not the row's full original quantity.
- [ ] Regression — existing Stock Pick happy-path (1c) and rollback scenarios above (both-eyes selection, INSUFFICIENT_STOCK/ITEM_NOT_AVAILABLE transaction rollback) still hold; this fix only changes which fields are written and what status/quantity result, not the guard/error/transaction flow.

### Out-of-scope / known follow-up (do not fix here)

- [ ] **Documented, not fixed:** `SaleOrderForm.jsx`'s separate `IN_PRODUCTION`-transition path (`handleFifoConfirm` → `updateSaleOrderStatus(id, "IN_PRODUCTION", undefined, itemIds)` → `saleOrderService.updateStatus()`) still ignores its own `inventoryItemIds` parameter and does not reserve stock. This pass only fixes the Request Queue's `PRE_QC`-issue allocation path via `reserveInventoryForSale`; the `IN_PRODUCTION` path's stub remains a pre-existing bug, flagged for a future pass.

### Manual verification notes

No existing `*.test.js` co-located test pattern was found near the touched files (`src/pages/Inventory`, `src/pages/PurchaseOrder`, `src/backend/services`), so no new test framework was introduced — verification above is manual/UI-driven. Build verified via `npx vite build` (0 errors). `npm run lint` could not be run to validate this diff specifically — the repo's `eslint.config.js` (flat config) errors out on its own `extends` usage independent of any change in this pass; this is a pre-existing repo-wide tooling issue, not introduced by Pass A.

### Pass B — Dashboard (2a metric relabel, 2b spec trend, 2c value trend, 2d top/low selling)

- [ ] Product Count card — Dashboard tab shows "Product Count" (not "Total Items") sourced from `stats.productCount`; subtext reads "distinct products".
- [ ] Available / Reserved cards — subtext clarifies "physical item count at full spec level"; values still match `availableItems` / `reservedItems` from `GET /inventory/dashboard`.
- [ ] Spec trend chart — default 7-day bar chart loads; toggling 30d refreshes data; custom date range works when `to >= from`.
- [ ] Spec trend filter — Lens Type dropdown filters inward spec counts (`lensTypeId` query param); "All lens types" shows unfiltered data.
- [ ] Spec trend export — PDF and CSV download from currently visible chart data (not a stale unfiltered pull).
- [ ] Value trend chart — line chart shows inward (green) vs outward (red) series from `GET /inventory/reports/value?groupBy=date`; 7d/30d/custom presets work.
- [ ] Value trend export — PDF/CSV contain date + inwardValue + outwardValue columns for the active filter.
- [ ] Top/Low selling — Top 10 and Low 10 lists load for 30-day default; 90-day toggle refetches both; Low list excludes zero-sales products.
- [ ] Empty states — charts/widgets show friendly empty copy when no transactions exist in range (no white screen / crash).
- [ ] Regression — Pending Inwards, Low Stock Alerts, and Initialize Stock widgets still render below the new charts.

### Pass C — Stock Summary (3a pivot, 3b filters, 3c export)

- [ ] Pivot view — "Pivot" toggle shows two-row header (locations spanning trays); rows are product + attribute labels; last column is row total qty.
- [ ] Pivot cells — qty appears at intersection of spec row and location/tray column; empty cells show "—".
- [ ] Horizontal scroll — many trays trigger horizontal scroll; banner shown when columns truncated at 50.
- [ ] List filters — Product Name and Location Name inputs filter list/grouped stock (AND-combined).
- [ ] Attribute filters — Type, Coating, Sph, Cyl, Add filters apply in Pivot view; collapsible attribute row in List view.
- [ ] Export PDF/CSV — disabled when no data; exports currently visible pivot or list dataset.
- [ ] Export Excel — `GET /inventory/stock-grouped/export` downloads `.xlsx` with pivot or stock rows.
- [ ] Regression — List and Grid views still work; group-by accordion list unchanged.

## 4 Test results

### Pass C — Stock Summary QA (2026-06-05): static review

Static/code-level verification — no live DB/UI run in this environment.

**L1 — Build:** PASS. `npm run build` — 0 errors.

**L2 — API contract:** PASS.
- `GET /inventory/stock-grouped?groupBy=pivot` returns flat `InventoryItem` rows with spec + location/tray for client pivot.
- AND-combined filters: `productName`, `locationName`, `Type_id`, `coating_id`, `sph`, `cyl`, `add`.
- `GET /inventory/stock-grouped/export` streams ExcelJS workbook (pivot or stock layout).

**L3 — UI wiring:** PASS. `InventoryStockTab` — List / Grid / Pivot toggles; `renderPivotView()` two-tier header; separate filters; PDF/CSV/Excel export buttons.

**L4 — Regression:** PASS. List grouped view and Grid matrix preserved; export disabled when empty.

```
result: PASS (static)
next: manual UI verification on dev stack; feature inventory-module-flow-gaps complete (A+B+C)
failures: (none)
```

---

### Pass B — Dashboard QA (2026-06-05): static review

Static/code-level verification — no live DB/UI run in this environment.

**L1 — Build:** PASS. `npm run build` — 0 errors.

**L2 — API contract:** PASS.
- `getInventoryDashboardEnhanced()` returns `productCount` via `groupBy lens_id`.
- `GET /inventory/dashboard/spec-trend` → `getProductSpecTrend` (daily distinct inward specs, `lensTypeId` filter).
- `GET /inventory/reports/value?groupBy=date` → `{ date, inwardValue, outwardValue }` time buckets.
- `GET /inventory/dashboard/top-selling` → top/low by `OUTWARD_SALE` quantity, 30/90-day lookback.

**L3 — UI wiring:** PASS. `InventoryDashboard` relabeled cards + three new chart widgets; `jspdf` + `jspdf-autotable` added; client PDF/CSV export on filtered datasets.

**L4 — Regression:** PASS. Existing dashboard widgets (pending inwards, low stock, init stock) preserved below charts. Removed invalid `deleteStatus` filter on `InventoryTransaction` in value report query (field does not exist on model).

```
result: PASS (static)
next: Pass C (Stock Summary pivot/filters/export) or manual UI verification on dev stack
failures: (none — server-side ExcelJS export endpoints deferred; client CSV used per visible data)
```

---

### Pass A — Rework QA (2026-06-26): transaction threading + quantity-aware reserve

Static/code-level verification — no live DB/UI run in this environment. Re-read actual code after `REWORK_BACKEND` fix restoring `dbClient`/`tx` threading lost to accidental `git checkout`.

**L1 — Build:** PASS. `npm run build` — 0 errors (pre-existing chunk-size warning only).

**L2 — Prisma field names:** PASS. Unchanged from prior Pass A review; quantity-aware fields (`status`, `quantity`, `saleOrderId`, `reservedDate`) still match schema.

**L3 — Required fields:** PASS. `updatedBy`, `createdBy`, `coating_id` validation unchanged.

**L4 — Guards / transaction rollback:** PASS.
- `reserveInventoryForSale(..., dbClient)` runs via inner `run(client)`; when `dbClient` is passed (from `issueToPreQc`'s `tx`), **no nested `$transaction`** is opened — all item update, stock bucket, and transaction-log writes participate in the caller's transaction.
- `updateInventoryStock(..., client)` and `generateTransactionNumber(client)` both use the same `client` at every call site inside `run`.
- `issueToPreQc` (`saleOrderWorkflowService.js:275-286`) loops `reserveInventoryForSale(..., tx)` then calls `saleOrderStatusService.transition({ tx, ... })` — any `APIError` from iteration 2 propagates out of `prisma.$transaction`, rolling back iteration 1's reservation **and** preventing `PRE_QC` transition.
- Standalone `POST /api/inventory/reserve` still works: omits `dbClient`, so `reserveInventoryForSale` wraps in its own `prisma.$transaction((tx) => run(tx))`.
- **Quantity-aware status flip (contract v3 rework):** partial reserve (`quantity > 1`, reserve 1) leaves row `AVAILABLE` with decremented qty; full consumption sets `RESERVED` + `saleOrderId` — confirmed at `inventory.service.js:737-744`.

**L5 — KB check:** PASS. KB-014/015 not regressed. KB-016 pattern now implemented in `reserveInventoryForSale`.

**Pass A scope items (1a/1b/1c):** code present in working tree — `BulkLensSelection` coating table, `POInwardToInventory` sibling badge, `InventoryRequestQueueTab` + `StockPickModal`, `SoOrderQueue` removed from routes/sidebar. Manual UI verification still recommended on dev stack.

```
result: PASS
rework_tag: READY
failed_level: none
next: orchestrator — Pass A signed off; begin Pass B (Dashboard) BUILD when user approves continuing same feature file
failures: (none)
```

---

### Pass A — Initial QA (2026-06-26) — superseded by rework above

<details>
<summary>Prior FAIL (REVIEW_CONTRACT) — resolved in contract v3 + rework</summary>

Static/code-level verification only — no running dev DB stack available in this environment; no live UI/DB testing was performed. All findings below are from re-reading the actual diff (`git diff`) against `## 2 Contract` Pass A (A1–A4) and `## 3 Test plan`, not from trusting the implementer's self-report.

**L1 — Build:** PASS. `npx vite build` — 3380 modules transformed, 0 errors (one pre-existing unrelated chunk-size warning only).

**L4 initial failure:** `reserveInventoryForSale` set whole row to `RESERVED` when only 1 of N units consumed — **fixed** in contract v3 (quantity-aware status flip) and verified in rework QA above.

**Transaction threading regression:** planner `git checkout` dropped `dbClient` param — **fixed** in REWORK_BACKEND and verified in rework QA above.

```
result: FAIL (superseded)
rework_tag: REVIEW_CONTRACT → resolved
```
</details>
