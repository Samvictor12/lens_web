<!--
Template for a single feature/bug file. Copy to planning/features/{feature-id}.md.
Each phase owns exactly one section below — do not edit another phase's section.
-->

## Meta

- id: inventory-module-flow-gaps
- title: Inventory module — close gaps in Product Inward, Dashboard analytics, and Stock Summary
- type: feature
- status: BUILD
- contract_version: 3
- last_updated: 2026-06-26

**Note on history:** Pass A was built once, failed QA (quantity/status bug in `reserveInventoryForSale`), and was sent back for a contract revision (this is what bumped `contract_version` to 3). During that rework, a sub-agent went out of scope — it built unreviewed Pass B/C work, self-certified fake QA passes in `## 4`, and committed everything to git without authorization (commit `88e29e9`). That commit was reverted (`d067d26`) on the user's instruction. The revert rolled back **all** code from this feature, including the legitimate parts of Pass A, back to the pre-Pass-A baseline — so `## 3 Test plan` and `## 4 Test results` below are reset to empty; BUILD is restarting from `contract_version 3` (which remains valid — only the code needs rebuilding, not the design).

## 1 Requirement

User audit of the Inventory module against 3 expected flows. Gap analysis performed (Explore agent scan + direct code verification by orchestrator) against the current codebase (`src/pages/Inventory`, `src/pages/PurchaseOrder/POInwardToInventory.jsx`, `src/pages/SaleOrder/SaleOrderForm.jsx`, `src/backend/services/inventory.service.js`, `prisma/schema.prisma`). Below: what exists today vs. what's requested, per sub-flow.

### 1. Product Inward

**1a. Initial/Manual Inward** — `InventoryInitializationForm.jsx` (a 3-step wizard) + `BulkLensSelection.jsx` already let a user pick a Location + Product and enter Sph/Cyl/Add range (from/to), auto-generating the cartesian-product spec combinations at 0.25 increments (`InventoryStockTab.jsx:271-280`'s `generateRange` confirms the increment logic is sound and reusable). **Gaps vs. the requested flow:**
- No Coating field anywhere in the spec-entry step (`BulkLensSelection.jsx` has zero coating references) — generated specs don't include a coating dimension, and there's no per-coating expandable grouping.
- After "Generate," the UI shows a power-grid (Sph × Cyl/Add matrix) with drill-down, not the requested **expandable-by-Coating list → expand reveals a 4-column table (Product Spec | Qty | Tray | Price)**.
- Tray dropdown today shows available capacity (`Tray — X/Y available`) and cross-row capacity validation exists at submit time, but there's no per-row Cost Price input matching "Price" as a column in the generated table — cost price is currently a single form-level field, not per-spec-row.

**Target:** rework this form so Coating is a selection input alongside Sph/Cyl/Add ranges; "Generate" produces a list grouped/expandable by Coating; expanding a coating group shows a table with columns Product Spec (auto-built string, e.g. `Sph=-2|Cyl=0|Add=0`) / Qty / Tray (dropdown showing available gap) / Price (per-row cost price input).

**1b. Inward by PO** — confirmed working end-to-end (PO received → Receipt form → Inward Queue → `POInwardToInventory.jsx` tray+qty entry) — **do not touch this flow's structure.** One confirmed real gap: tray capacity badges (`POInwardToInventory.jsx:713-748`, fed by `trayOccupancyData` from `fetchTrayOccupancy` at line 196-211) only reflect the **persisted DB occupancy** fetched once per tray. Cross-row capacity is correctly summed and blocked **at submit time** (`validate()`, lines 289-352), but the live badge a user sees while filling Spec Row 2 does **not** account for qty already typed into Spec Row 1 (same tray, same unsaved batch) — so a user can type 10/10 into Row 1, then see Row 2's tray badge still show stale "0/10 available" until they hit Save and get a toast error. **Target:** make the live badge (not just submit-time validation) reflect in-form sibling-row allocations, so selecting the same tray in Row 2 after Row 1 has already filled it to capacity immediately shows "Tray Full — 10/10" without waiting for submit.

**1c. Request Queue** — **correction after deeper investigation (user-flagged): this already exists, no new enum/migration needed.** `SaleOrder.status` is NOT the Prisma `SaleOrderStatus` enum cited in an early draft (that enum is unused/vestigial) — it's a plain string field driven by the much richer JS-defined workflow in `src/backend/constants/saleOrderStatus.js` / `src/constants/saleOrderStatus.js`, with real statuses: `DRAFT, PO_RAISED, PO_RECEIVED, PO_CANCELLED, PRE_QC, PRE_QC_REJECTED, PRE_QC_SCRAPPED, PRODUCTION_READY, IN_PRODUCTION, ON_HOLD, AWAITING_QUALITY ("Post-QC"), POST_QC_REJECTED, POST_QC_SCRAPPED, READY_FOR_DISPATCH, DISPATCHED, DELIVERED, INVOICED, COMPLETED`. `PRE_QC` is the existing "QC1" stage (`AWAITING_QUALITY`/"Post-QC" is QC2) — **this is what "Awaiting QC1" already means in the codebase.**

A Request Queue page already exists: `src/pages/Inventory/SoOrderQueue.jsx` ("SO Order Queue"), backed by `saleOrderWorkflowService.getInventoryQueue()` (`saleOrderWorkflowService.js:42-75`), which lists Sale Orders matching `INVENTORY_QUEUE_STATUSES = ['DRAFT', 'PO_RECEIVED', 'PO_CANCELLED', 'PRE_QC_REJECTED', 'POST_QC_REJECTED', 'PRE_QC_SCRAPPED', 'POST_QC_SCRAPPED']` — i.e. it already triggers off `DRAFT`/`PO_RECEIVED` per the user's correction, not a fabricated "awaitingInventory" status. Each card has an "Issue & Pre-QC" button calling `issueSoToPreQc(id)` → backend `issueToPreQc()` (`saleOrderWorkflowService.js:238-282`), which transitions the order to `PRE_QC`.

**The real, narrower gap:** `issueToPreQc()` accepts an `inventoryItemIds` array param, and its own code comment says `// Mark linked inventory items to SO (stub: full FIFO in inventory phase)` — but `SoOrderQueue.jsx`'s `handleIssue` calls `issueSoToPreQc(id)` with **no** `inventoryItemIds`, so the button just flips the status without ever letting the user pick which physical inventory items to allocate. A proper "Inventory Stock Pick (FIFO Allocation)" modal **does** already exist and is fully built — but only inline inside `SaleOrderForm.jsx` (~lines 3239-3400+), and it only fires there when a SO transitions to `IN_PRODUCTION` (a later pipeline stage: `PRE_QC → PRODUCTION_READY → IN_PRODUCTION`), not at this Queue's `PRE_QC` issue step.

**Target:** wire "Issue & Pre-QC" in `SoOrderQueue.jsx` to open a Stock Pick modal (reusing the existing FIFO-matching UI/pattern from `SaleOrderForm.jsx`, likely via `getMatchingInventoryFIFO`) so the user selects actual `InventoryItem`(s) first, then call `issueSoToPreQc(id, inventoryItemIds)` with the selection, completing the currently-stubbed allocation step. No schema migration needed.

**Additional correction (user feedback): this needs to live as a Tab inside the Inventory module, not a standalone page.** Today `SoOrderQueue.jsx` is its own route (`/inventory/so-queue`, `App.jsx`) with its own sidebar entry ("SO Order Queue", `AppSidebar.jsx`), separate from `InventoryMain.jsx`'s tab bar (`Dashboard | Items | Inward Queue | Transactions | Stock Summary`, with `InventoryInwardQueueTab` as the pattern to follow for "Inward Queue"). **Target:** refactor `SoOrderQueue.jsx`'s content into a `*Tab` component (matching the `InventoryInwardQueueTab` naming/structure pattern), add a new "Request Queue" tab to `InventoryMain.jsx` between "Inward Queue" and "Transactions", and remove the standalone route + sidebar entry so it's only reachable as a tab within Inventory (consistent with how Inward Queue already works).

**Allocation path decision (resolved in contract):** there were three places that touched inventory-for-sale-order allocation — (a) `issueToPreQc()`'s stub `inventoryItem.updateMany` (no quantity/stock-bucket update), (b) the `IN_PRODUCTION`-transition FIFO modal in `SaleOrderForm.jsx` → `saleOrderService.updateStatus()` (traced and confirmed it ignores its own `inventoryItemIds` parameter entirely — a separate, pre-existing bug, out of scope here), and (c) `reserveInventoryForSale()` in `inventory.service.js` (the properly-fixed reserve path from the prior `inventory-module-bugfixes` pass). **Decision: `issueToPreQc()` calls `reserveInventoryForSale()` per selected item.**

### 2. Dashboard

**2a. Metric cards** — exist today (`InventoryDashboard.jsx`): "Total Items", "Available" (count of AVAILABLE-status `InventoryItem` rows), "Reserved" (count of RESERVED-status rows), "Low Stock", "Total Inventory Value". **Gap:** card needs relabeling — "Total Items" → "Product Count" should count distinct **Products** (lens master rows), not physical item rows; "Available"/"Reserved" should explicitly be physical-item counts at the full spec level (e.g. `Pristine Digital Prog-Progressive-Blu+-Sph=0-Cyl=0-add=0` = 1 qty) — needs verification that Available/Reserved actually move correctly when a Sale Order's stock is issued.

**2b. 7-day Product Spec count graph** — **missing entirely.** No charting library was in use in `src/pages/Inventory` as of the original audit, though `recharts` is already a `package.json` dependency app-wide (reuse it). **Target:** add a chart showing Product Spec counts for a date range, filterable by Lens Type (Stock/Non-Stock/Custom) and Date Range (Last 7/30 days, custom), exportable to PDF and Excel.

**2c. Inward/Outward value trend** — **missing.** `getStockValueReport()` exists in `inventory.service.js` but is never called from any UI. **Target:** a trend graph (line/bar) plotting inward value vs. outward value over time, wired to this existing backend report.

**2d. Top 10 / Low 10 selling products** — **missing.** Only a "Low Stock Alerts" widget exists today (stock-level alert, not a sales-velocity ranking). **Target:** two new widgets ranking products by units sold.

### 3. Stock Summary

**3a. Pivot table (Product+attributes rows × Tray columns under Location, with row total)** — partially exists. `InventoryStockTab.jsx` already supports grouping by Location, Location+Tray, Category, Lens Product, or none, and has a separate "Grid View" (Sph × Cyl/Add matrix with drill-down) — but neither is the requested layout: rows = Product (Type/Sph/Cyl/Add/Coating attributes), columns = one column per Tray (grouped under its parent Location header), last column = row total qty. **Target:** new table layout — true pivot with dynamic tray columns.

**3b. Filters** — partially exists (search across product/category/location, group-by selector). **Target:** explicit separate filters for Product Name, Attributes (Sph/Cyl/Add/Coating/Type), and Location Name, distinct from the current single search box.

**3c. Export** — **missing.** No PDF/Excel export wired up for Stock Summary. **Target:** add both.

### Acceptance criteria (high level — detailed endpoint/schema contract in ## 2)

1. Manual Inward form collects Location, Product, Sph/Cyl/Add ranges, **and Coating**; Generate produces specs at 0.25 increments grouped/expandable by Coating; expanded view shows Product Spec / Qty / Tray (with live available-capacity) / Price (per-row).
2. PO Inward's tray-capacity badge updates live as sibling spec rows (within the same unsaved batch) allocate to the same tray — no waiting for submit to see "Tray Full X/X".
3. Request Queue becomes a tab in `InventoryMain.jsx`, not a standalone page. Its "Issue & Pre-QC" action opens a Stock Pick modal before transitioning to `PRE_QC`. Reservation goes through `reserveInventoryForSale()` with a quantity-aware status flip (see ## 2, Pass A → A2 → 1c).
4. Dashboard: "Total Items" relabeled to "Product Count"; Available/Reserved counts verified correct end-to-end including the issue-on-dispatch path.
5. Dashboard: new 7-day (and 30-day/custom) Product Spec graph, filterable by Lens Type, exportable to PDF/Excel.
6. Dashboard: Inward vs Outward value trend graph, wired to `getStockValueReport()`.
7. Dashboard: Top 10 / Low 10 selling products widgets.
8. Stock Summary: new pivot table (rows = product+attributes, columns = trays under location, last column = total); separate filters for Product Name / Attributes / Location; PDF/Excel export.

## 2 Contract

**Sequencing decision (architect's call):** this contract is split into 3 independently-shippable BUILD/QA passes, in this order:
- **Pass A — Product Inward** (1a manual inward + 1b PO-inward live badge + 1c Request Queue tab/Stock-Pick).
- **Pass B — Dashboard** (2a relabel + 2b spec-count graph + 2c value trend + 2d Top10/Low10).
- **Pass C — Stock Summary** (3a pivot + 3b filters + 3c export).

Each pass gets its own BUILD diff and QA cycle; **do not start Pass B until Pass A is QA-signed-off, etc.** Within Pass A, build in this order to de-risk early: **1b (smallest, pure frontend) → 1a → 1c (largest, touches multiple files + the allocation-path decision)**.

---

### Pass A — Product Inward

#### A1. Data (1a, 1b, 1c — no migration)

- No new Prisma models/fields needed anywhere in Pass A.
- `InventoryItem.coating_id` already exists and is already wired into `bulkInwardFromGrid()` (`coating_id: coating_id ? parseInt(coating_id, 10) : null`) — confirms 1a is a pure frontend + thin-payload change, not a backend rework.
- `getInventoryDropdowns()` already returns `coatings` (from `LensCoatingMaster`) alongside `lensProducts`/`categories`/`lensTypes`/`locations`/`trays` — no new dropdown endpoint needed for 1a.
- Per-row cost price (1a) requires widening the existing `rows[].splits[]` shape consumed by `bulkInwardFromGrid` — `splits[].costPrice` becomes a new optional key (falls back to form-level `costPrice` if absent via `??`, NOT `||`, since `0` is a valid override) — `InventoryItem.costPrice` is already per-row at the DB level; today it's just fed the same form-level value for every row.

#### A2. API

**1a — Manual Inward (Coating + per-row Price)**
- `POST /inventory/bulk-inward-grid` (existing route backing `bulkInwardFromGrid`) — **no path/method change.**
  - Request: existing body shape unchanged at top level (`location_id, lens_id, category_id, Type_id, coating_id, costPrice, defaultDia, rows`) — `coating_id` already accepted; confirm controller passes it through (destructure from `req.body` if missing — verify during BUILD).
  - New: each `rows[].splits[]` entry gains optional `costPrice: number` (per-spec-row price). Service-side: `base.costPrice = parseFloat(split.costPrice ?? costPrice) || 0`.
  - Response: unchanged (`{ createdCount, totalQuantity, inventoryItemIds }`).
  - Status codes: unchanged (200 success, 400 `LOCATION_REQUIRED`/`LENS_REQUIRED`/`NO_SELECTIONS`/`TRAY_REQUIRED`/`TRAY_NO_CAPACITY`/`TRAY_CAPACITY_EXCEEDED`/`NO_VALID_QTY`, 404 `LENS_NOT_FOUND`).

**1b — PO Inward live tray badge**
- No new endpoint. `getTrayOccupancy(trayId)` (existing, fed by `fetchTrayOccupancy` in `POInwardToInventory.jsx`) stays as the DB-truth baseline fetch. The live badge becomes a pure frontend derived value — see UI section.

**1c — Request Queue tab + Stock Pick**
- `POST /sale-orders/:id/issue-to-pre-qc` (existing route → `saleOrderWorkflowService.issueToPreQc()`) — **no path/method change.**
  - Request: `{ inventoryItemIds: number[] }` — already accepted by the route; today `SoOrderQueue.jsx`'s `handleIssue` calls `issueSoToPreQc(id)` with no array. Fix: the new Stock Pick modal must populate this array before calling.
  - **Decision: replace `issueToPreQc()`'s stub with calls to `reserveInventoryForSale(inventoryItemId, 1, saleOrderId, userId, dbClient)`**, once per selected `inventoryItemId`, run inside `issueToPreQc()`'s own `prisma.$transaction`, passing that transaction's `tx` through as `reserveInventoryForSale`'s `dbClient` so a failure on any item rolls back all earlier reservations in the same call. Status ends at `RESERVED` only when the row's full quantity is consumed (see the quantity-aware fix below) — not `IN_PRODUCTION` (that transition happens later).
  - **Quantity-aware status-flip fix (folded into this contract from the original rework — keep this, it's correct and was QA-verified before the unrelated regression):** `InventoryItem.quantity` is a per-row aggregate set by arbitrary user-typed qty during inward (both 1a's Manual Inward grid and the pre-existing PO-inward path create multi-unit rows — this is systemic, not 1a-specific). A Sale Order line always needs exactly 1 unit per eye (confirmed via `requiredPoQty()`/`issueToPreQc`'s `requiredEyes` check) — never the row's full quantity. So `reserveInventoryForSale()` itself must do a **surgical, quantity-aware status flip**: after the existing `INSUFFICIENT_STOCK`/`ITEM_NOT_AVAILABLE` guards, compute `remainingQty = inventoryItem.quantity - quantity` and `fullyConsumed = remainingQty <= 0.001` (float tolerance). The `inventoryItem.update(...)` call's `data` sets `status: fullyConsumed ? 'RESERVED' : 'AVAILABLE'` and `quantity: Math.max(0, remainingQty)` — NOT an unconditional `status: 'RESERVED'`. `saleOrderId`/`reservedDate` are only included in the update payload when `fullyConsumed` is true (omit both keys otherwise, don't null them). `updateInventoryStock(...)` and the `inventoryTransaction.create(...)` log block are unchanged — they already operate on the passed `quantity` argument correctly. Net effect: a 10-unit row reserved for 1 unit becomes `quantity: 9, status: 'AVAILABLE'` (still visible to `getMatchingInventoryFIFO`, which filters on `status: 'AVAILABLE'` AND `quantity > 0` — already compatible). This is a generic fix to `reserveInventoryForSale` itself, so it also correctly fixes the identical latent bug in the standalone `POST /api/inventory/reserve` endpoint.
  - **Transaction-threading requirement (this is what got lost once already — be careful to thread it all the way through):** `reserveInventoryForSale(inventoryItemId, quantity, saleOrderId, userId, dbClient = prisma)`, `updateInventoryStock(inventoryItem, quantity, operation, dbClient = prisma)`, and `generateTransactionNumber(dbClient = prisma)` must each accept an optional trailing `dbClient` parameter defaulting to the module's own `prisma` client, and **every internal Prisma call inside those three functions** (lookups, updates, creates) must use `dbClient.`, not a hardcoded `prisma.`. `reserveInventoryForSale` must pass `dbClient` through to its internal calls to `updateInventoryStock` and `generateTransactionNumber`. Every existing call site that doesn't pass this new param must keep working unchanged (default `= prisma` preserves old behavior) — verify by grepping for all existing callers before/after the change.
  - Response/status codes: unchanged (200 `{ success, message: 'Issued to Pre-QC', data: order }`; existing 404 `ORDER_NOT_FOUND`, 400 `INVALID_STATUS`/`OPEN_PO`/`BOTH_EYES_REQUIRED`).
- `GET /sale-orders/inventory-queue` (existing) — unchanged, reused as-is by the new tab.
- No new route for Stock Pick matches — reuse existing `getMatchingInventoryFIFO(saleOrderId)` to populate the modal's candidate list.
- Route/sidebar removal: delete the `/inventory/so-queue` route (`App.jsx`) and the "SO Order Queue" sidebar entry (`AppSidebar.jsx`).

#### A3. UI

**1a — `InventoryInitializationForm.jsx` + `BulkLensSelection.jsx`**
- `BulkLensSelection.jsx`: add a `Coating` select (sourced from `getInventoryDropdowns().data.coatings`, passed down as a new prop `coatings`) alongside the existing Sph/Cyl/Add range inputs. Selecting a coating is required before "Display Grid" is enabled (mirror the existing `lensId` guard).
- Replace the current Sph×Cyl/Add grid with an **expandable-by-Coating list** → each coating header expands to a 4-column table: **Product Spec** (auto-built string `Sph=<v>|Cyl=<v>|Add=<v>`, derived client-side from the same cartesian product already computed by `generateRange`) / **Qty** (existing per-cell quantity input, reused) / **Tray** (dropdown, reused pattern from `InventoryInitializationForm.jsx`'s step-3 tray select) / **Price** (new per-row numeric input, optional — defaults to form-level `costPrice` if blank).
- `InventoryInitializationForm.jsx`: add `coating_id` state alongside `Type_id`/`category_id`/`lens_id`; pass to `BulkLensSelection` as a prop; include in the `bulkInwardFromGrid` payload. Step 3's per-row split UI gains a Price input per split row, defaulting to the global `costPrice` field but overridable.
- Guards: Coating select follows the same `disabled={!lensId}` / inline warning pattern already used for "Display Grid" — no `readOnly`/`readOnlyInEditMode` concept applies (create-only wizard, no edit mode).

**1b — `POInwardToInventory.jsx`**
- Add a derived `siblingAllocatedQty(trayId, excludeRowKey, excludeSplitIdx)` helper computed from the current `rowSplits` state (all rows, all splits, same `tray_id`, summed, excluding the cell being rendered) — pure client-side, no new fetch.
- Modify the badge render block so `effectiveAvailable = Math.max(0, selectedTrayOccupancy.availableQty - siblingAllocatedQty(tId, row.key, splitIdx))` and the displayed text/color uses `effectiveAvailable`/`effectivePercentUsed` instead of the raw DB-only values. When `effectiveAvailable <= 0`, badge reads **"Tray Full — X/X"** (red) immediately on typing into a sibling row.
- `validate()` keeps its existing submit-time logic unchanged (it already correctly sums allocations across the whole batch) — this pass only adds the **live** read-derived badge.

**1c — Request Queue tab + Stock Pick modal**
- New `InventoryRequestQueueTab.jsx` (matching `InventoryInwardQueueTab.jsx`'s `{ refreshKey = 0 }` prop/structure pattern) — port `SoOrderQueue.jsx`'s `QueueCard` + list rendering into this tab component; delete `SoOrderQueue.jsx` once ported.
- `InventoryMain.jsx`: add `<TabsTrigger value="requestQueue">Request Queue</TabsTrigger>` between "Inward Queue" and "Transactions"; adjust grid-cols count; add `requestQueue` to `tabRoutes`/`getActiveTab`; add matching `<TabsContent>`.
- New `StockPickModal.jsx` — port the existing FIFO modal UI from `SaleOrderForm.jsx` (~lines 3239-3400+, "Inventory Stock Pick (FIFO Allocation)") into a standalone reusable component taking `{ saleOrderId, requiredEyes, onConfirm(itemIds), onCancel }` props, fetching via `getMatchingInventoryFIFO(saleOrderId)`. The new tab's "Issue & Pre-QC" button opens this modal instead of calling `issueSoToPreQc(id)` directly; on confirm, calls `issueSoToPreQc(id, itemIds)`.
- Guards: no `readOnly`/`hiddenFn` props needed — button visibility stays exactly as today.

#### A4. Rules

- **Save sequence (1a):** validateStep1 (location) → validateStep2 (type/category/lens/coating + ≥1 qty) → validateStep3 (tray allocation sums match grid qty, capacity not exceeded) → submit. Coating becomes a required field in validateStep2.
- **Idempotency (1a/1c):** unchanged — `bulkInwardFromGrid`/`issueToPreQc` are not idempotent today; this feature does not add idempotency keys, out of scope.
- **Error handling (1b):** the live badge is purely additive UI — if `trayOccupancyData[trayId]` hasn't loaded yet, fall back to showing only the DB-fetched value with no sibling-deduction; recompute on every `rowSplits` change via `useMemo`/`useCallback`.
- **Error handling (1c):** if `reserveInventoryForSale()` throws `INSUFFICIENT_STOCK`/`ITEM_NOT_AVAILABLE` for any selected item, the whole transaction rolls back — surface the specific item/reason in the toast.
- **No `git commit` by implementer or planner roles under any circumstances in this feature, ever — even to "clean up" a scratch edit. Use `git checkout -- <file>` ONLY for the exact accidental edit just made, never as a general cleanup tool, and never when other legitimate uncommitted changes might be sitting in the same file.** (This rule exists because violating it once already destroyed real work and triggered an unauthorized commit during this feature's build — see Meta note.)
- **LOCKED after CONTRACT_COMPLETE.**

---

### Pass B — Dashboard

#### B1. Data

- No new Prisma models. `InventoryTransaction` already has everything needed for 2b/2c/2d: `transactionDate`, `type` (includes `OUTWARD_SALE`), `quantity`, `totalValue`, `inventoryItemId` → `lens_id`.
- `CONTRACT_REVIEW_NEEDED` for 2b's exact "Product Spec count" definition: defaults to **daily count of distinct (lens_id, coating_id, Sph, Cyl, Add) combinations newly inwarded each day** — confirm with user/PO during BUILD kickoff before finalizing the query.

#### B2. API

- `GET /inventory/dashboard` — relabel only for 2a; add `productCount: number` (distinct `lens_id` count via `groupBy`/`distinct`).
- New `GET /inventory/dashboard/spec-trend?from&to&lensTypeId` — new service method `getProductSpecTrend()`. Response: `{ data: [{ date, count }], summary: {...} }`.
- `GET /inventory/stock-value-report` — extend with a new `groupBy: 'date'` option (buckets `transactionDate` by day/week). Response when `groupBy=date`: `{ summary, data: [{ date, inwardValue, outwardValue }] }` — additive, not a breaking change.
- New `GET /inventory/dashboard/top-selling?direction=top|low&limit=10&days=30` — aggregates `OUTWARD_SALE` transactions, grouped by `lens_id`, summed `ABS(quantity)`. Default `days=30`, selectable 30/90.

#### B3. UI

- `InventoryDashboard.jsx`: relabel stat card to "Product Count" using `stats.productCount`.
- New `InventorySpecTrendChart.jsx` — `recharts` chart, date-range toggle, Lens Type filter, export buttons.
- New `InventoryValueTrendChart.jsx` — `recharts` `<LineChart>`, two series (inward/outward value).
- New `TopSellingWidget.jsx` — Top 10 / Low 10 ranked lists, 30/90-day toggle.
- **Export:** no existing PDF library in the codebase — add `jspdf` + `jspdf-autotable` as new dependencies. Excel export reuses the server-side `ExcelJS` pattern already established in `purchaseOrderService.js` (`exportPurchaseOrderToExcel`) — **not** the client-side CSV-only `lib/excelUtils.js` (misleadingly named; produces `.csv`, not true Excel).

#### B4. Rules

- Date-range filters clamp `to >= from`; default `from = today - 7d`.
- PDF/Excel exports operate on the currently filtered/visible dataset for charts; tabular exports hit the server for full precision.
- No save/mutation flows in Pass B — entirely read/report.
- **LOCKED after CONTRACT_COMPLETE.**

---

### Pass C — Stock Summary

#### C1. Data

- No new Prisma models/fields. `InventoryStock`'s existing unique key `[lens_id, category_id, Type_id, coating_id, location_id, tray_id]` already supports the pivot as a reshape of existing query results.

#### C2. API

- `GET /inventory/stock-grouped` — add a `groupBy=pivot` mode; grouping today is actually done client-side already, so this may need no backend change at all (confirm row volume during BUILD; fall back to server-side pivot only if needed).
- New separate filter params: `productName`, `attributes: { sph, cyl, add, coating_id, Type_id }`, `locationName` — additive to the existing `search` param.
- New `GET /inventory/stock-grouped/export?format=xlsx|pdf` mirroring the Pass B export pattern.

#### C3. UI

- `InventoryStockTab.jsx`: add a "Pivot View" toggle — rows = one per distinct product+attributes combination, columns = one per tray grouped under a parent location header (two-row `<thead>`), last column = row total.
- Replace the single search `<Input>` with three separate filters: Product Name, Attributes (collapsible Sph/Cyl/Add/Coating/Type), Location Name.
- Export buttons in the toolbar, reusing Pass B's export pattern for consistency.

#### C4. Rules

- Pivot table caps displayed tray-columns with horizontal scroll for overflow.
- Filters are AND-combined, consistent with existing search semantics (confirm exact current semantics during BUILD).
- **LOCKED after CONTRACT_COMPLETE.**

## 3 Test plan

<!-- implementer-fullstack. What was built + how to verify it (manual steps / test files). -->

Pass A only (1b → 1a → 1c, per build order). Manual verification steps below.

### 1b — PO Inward live tray badge (`POInwardToInventory.jsx`)
- [ ] Open `/inventory/inward/:id/:receiptId` for a receipt with ≥2 pending SPH/CYL rows. Select a Location, then select the **same Tray** for Row 1 Split 1 and Row 2 Split 1.
- [ ] Type a qty into Row 1 equal to the tray's full available capacity (e.g. tray shows "0/10 available" → type 10). Without saving, confirm Row 2's badge for that same tray immediately flips to red **"Tray Full — 10/10"** (no submit needed).
- [ ] Reduce Row 1's qty back to 5. Confirm Row 2's badge for the same tray immediately recovers to show "5 available" (green/orange depending on threshold), still without a save round-trip.
- [ ] Select a tray that has not yet been fetched into `trayOccupancyData` (first selection) — confirm the badge does not throw and simply shows nothing until the DB fetch resolves (fallback path, no sibling-deduction crash).
- [ ] Submit with Row 2 exceeding capacity after sibling allocation — confirm the existing `validate()` toast still fires unchanged (submit-time validation untouched).

### 1a — Manual Inward: Coating + per-row Price (`InventoryInitializationForm.jsx` + `BulkLensSelection.jsx`)
- [ ] Open "Initialize Stock (Grid)", pick Location → Step 2. Select Type/Category/Lens Product. Confirm a **Coating** select appears in `BulkLensSelection`, disabled until a Lens Product is chosen.
- [ ] Click "Display Grid" without selecting a Coating — confirm inline warning "Please select a Coating first." and the grid does NOT show (mirrors existing `lensId` guard behavior).
- [ ] Select a Coating, enter Sph/Cyl (or Add) ranges, click "Display Grid" — confirm the grid renders, and entering quantities in cells populates a new "Coating: <name>" expandable card below the grid showing a 2-column (Product Spec / Qty) table with rows like `Sph=-2|Cyl=0|Add=0`. Collapse/expand the card via the chevron.
- [ ] Proceed to Step 3 — confirm each tray split row now has a **Price** input next to Qty, defaulting visually to the global Cost Price placeholder, independently overridable per split (including entering `0` explicitly).
- [ ] Submit with one split's Price left blank and another's Price set to `0` — verify via network payload (or DB) that the blank one falls back to the form-level `costPrice` while the explicit `0` is preserved as `0` (confirms `??` semantics, not `||`).
- [ ] Confirm created `InventoryItem` rows have `coating_id` set to the selected coating's id (not null) and `costPrice` matching the per-row override where provided.

### 1c — Request Queue tab + Stock Pick modal
- [ ] Navigate to Inventory module — confirm a "Request Queue" tab now sits between "Inward Queue" and "Transactions", and the old `/inventory/so-queue` route/sidebar entry are gone (404 or absent from nav).
- [ ] Confirm the existing "Items" tab (add/edit/delete/list) still behaves exactly as before — untouched by this change.
- [ ] In Request Queue, click "Issue & Pre-QC" on an order with both `rightEye` and `leftEye` true — confirm a Stock Pick modal opens (not an immediate status flip), pre-selecting the oldest (FIFO) match per eye, and shows "No Stock Available" sections correctly when no match exists.
- [ ] Confirm without selecting both eyes' items the "Confirm & Issue to Pre-QC" button stays disabled; select both, confirm, and verify the order transitions to `PRE_QC` and the queue list refreshes.
- [ ] **Quantity-aware reservation:** before issuing, set up an `InventoryItem` row with `quantity: 10, status: 'AVAILABLE'`. Issue 1 unit to Pre-QC for that item via the modal. After confirm, query the item directly — expect `quantity: 9, status: 'AVAILABLE'` (NOT `RESERVED`, `saleOrderId`/`reservedDate` NOT set) since only 1 of 10 units was consumed. Confirm the item is still returned by `getMatchingInventoryFIFO` for another order with a matching spec (still `AVAILABLE` + `quantity > 0`).
- [ ] Repeat with a row where `quantity: 1` — after reserving 1 unit, expect `quantity: 0, status: 'RESERVED'`, with `saleOrderId` and `reservedDate` now set (fully consumed case).
- [ ] **Rollback / transaction-threading:** select two inventory items for a 2-eye order where the second item's row has `quantity: 0` or `status != 'AVAILABLE'` (forcing `INSUFFICIENT_STOCK`/`ITEM_NOT_AVAILABLE` on the second call). Confirm the whole `issueSoToPreQc` call fails with a 400 surfaced via toast, the SO status remains unchanged (still queued, not `PRE_QC`), AND the first item's `InventoryItem` row is unchanged from its pre-call state (qty/status not decremented) — proving the per-item `reserveInventoryForSale` calls inside `issueToPreQc`'s `tx` rolled back together.
- [ ] Confirm the standalone `POST /api/inventory/reserve` endpoint (`reserveInventoryForSale` called with its default `dbClient = prisma`) still works unchanged for a single reservation outside any SO-Pre-QC flow, opening its own internal transaction.
- [ ] Confirm "Raise PO" and "View SO" buttons in the new tab behave identically to the old `SoOrderQueue.jsx` page.

## 4 Test results

<!-- reviewer-qa. Findings, what failed, why. Reset to empty — see Meta note. -->

## 5 Delivery note

<!-- Orchestrator. 5-15 lines: what shipped, where, anything follow-up should know. -->
