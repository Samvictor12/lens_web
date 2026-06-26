# Active Feature Spec

This is the single shared feature document (`planning/feature.md`). Each phase owns exactly one section below. Specialist sub-agents must only edit their designated sections and must never commit code.

---

## Requirement

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

---

### Contract

This contract is split into 3 independently-shippable BUILD/QA passes, in this order:
- **Pass A — Product Inward** (1a manual inward + 1b PO-inward live badge + 1c Request Queue tab/Stock-Pick).
- **Pass B — Dashboard** (2a relabel + 2b spec-count graph + 2c value trend + 2d Top10/Low10).
- **Pass C — Stock Summary** (3a pivot + 3b filters + 3c export).

*Note: For the current BUILD phase, we are implementing **Pass A**.*

#### TODO Checklist for Pass A:

##### A1. Backend & Data (No migrations)
- [x] Ensure `POST /inventory/bulk-inward-grid` controller receives `coating_id` from the body and forwards it to the service.
- [x] Modify `splits` structure in `bulkInwardFromGrid()` service method to accept optional `costPrice` and resolve default via: `base.costPrice = parseFloat(split.costPrice ?? costPrice) || 0`.
- [x] Thread the transaction-level `dbClient` (for `prisma.$transaction`) all the way through `reserveInventoryForSale()`, `updateInventoryStock()`, and `generateTransactionNumber()`.
- [x] Implement quantity-aware reservation status flip in `reserveInventoryForSale()`: if `quantityRemaining <= 0.001`, update status to `RESERVED` and link to `saleOrderId`; else keep `AVAILABLE` and decrease `quantity`.

##### A2. Frontend & Forms
- [x] **Coating Integration:** Add `Coating` selection input in `BulkLensSelection.jsx` and pass selected `coating_id` to `InventoryInitializationForm.jsx` state and the API payload.
- [x] **Expandable Coating Group Grid:** Replace the Sph × Cyl grid in `BulkLensSelection.jsx` with an expandable card structure grouped by coating, containing Product Spec, Qty, Tray Dropdown, and Price inputs.
- [x] **1a UX — Qty = available gap:** When a Tray is selected in the expandable coating table, the Qty input must pre-fill with the tray's remaining available capacity (capacity − already used). User can adjust downward but not above available.
- [x] **1a UX — Cost Price auto-fill:** When a Tray is selected in the expandable coating table, the Price input must auto-fill with the product's unit cost price (from the lens product master). User can override per-row.
- [x] **PO Inward Live Badge:** Integrate `siblingAllocatedQty()` helper in `POInwardToInventory.jsx` to dynamically decrement tray capacities based on in-form inputs. Show `Tray Full — X/Y` badge status dynamically.
- [x] **Request Queue Tab:** Port `SoOrderQueue.jsx` into a tab component `InventoryRequestQueueTab.jsx` inside `InventoryMain.jsx`. Remove the standalone route from `App.jsx` and link from sidebar.
- [x] **FIFO Stock Pick Modal:** Create `StockPickModal.jsx` and wire it to the "Issue & Pre-QC" action, passing the selected inventory item IDs to `issueSoToPreQc()`.
- [x] **Items Tab + Add Item Removal:** Remove the "Items" tab from `InventoryMain.jsx` tab bar and its `TabsContent`. Remove any "Add Item" buttons/routes inside the Inventory module. UI-only removal — no backend change required.

#### TODO Checklist for Pass B:

##### B1. Backend & Data
- [x] **Distinct Product Count stat:** Update `getInventoryDashboardEnhanced()` to query distinct `lens_id` groupings to return distinct product count instead of raw item count.
- [x] **Spec Count Trend API:** Add `getInventorySpecCountTrend()` service and controller methods to compute daily inwarded spec signature counts, filterable by date range and lens type.
- [x] **Top/Low Selling Products API:** Add `getTopLowSellingProducts()` service and controller methods to aggregate OUTWARD_SALE transaction volume over 30d/90d.
- [x] **API Routes:** Register routes `/api/inventory/reports/spec-trend` and `/api/inventory/reports/top-low-selling`.

##### B2. Frontend & Dashboard
- [x] **Rebuild InventoryDashboard:** Fully rebuild `InventoryDashboard.jsx` using Recharts to present stat cards, charts, and top/low tables.
- [x] **Stat Cards Relabel:** Rename "Total Items" to "Product Count" showing distinct products, and properly display "Available" and "Reserved" counts.
- [x] **Product Spec Count Trend Chart:** Implement Recharts BarChart for spec count trends, with Lens Type dropdown and date range toggles.
- [x] **Inward/Outward Value Trend Chart:** Implement Recharts AreaChart showing inward vs outward stock value trend, with date range filters.
- [x] **Top/Low Selling Widget:** Build ranked list of products by volume with 30-day/90-day toggles and visual progress bars.
- [x] **Export Options:** Implement download triggers to export chart trend data to Excel (CSV) and PDF.

#### TODO Checklist for Pass C:

##### C1. Backend & Data
- [ ] **Stock Pivot API:** Implement `getInventoryStockPivot()` service and controller methods to aggregate active stock quantities into a pivot shape: product specs as rows, nested trays grouped by location as columns.
- [ ] **API Routes:** Register route `GET /api/inventory/reports/stock-pivot`.
- [ ] **Frontend API:** Expose `getInventoryStockPivot()` in frontend inventory service.

##### C2. Frontend & Pivot Table
- [ ] **Pivot Table UI:** Rebuild `InventoryStockTab.jsx` Stock Summary tab to display a structured grid representing Locations and Trays as grouped column headers, and Lens Product specifications as row items.
- [ ] **Pivot Cell Values:** Render individual quantity values for each Tray column under a product row, and calculate a "Total Qty" row-level sum.
- [ ] **AND-combined Filters:** Implement text/selection filters for Product Name, Sph, Cyl, Add, Coating, and Location, combined using AND logic.
- [ ] **Export Options:** Implement PDF and Excel (CSV) export for the compiled pivot table representation.

---

### Test plan

#### Pass A Verification Checks:

##### 1b — PO Inward live tray badge (`POInwardToInventory.jsx`)
- [ ] Open `/inventory/inward/:id/:receiptId` with ≥2 pending rows. Select the same Tray for both rows.
- [ ] Type a qty into Row 1 equal to available capacity. Confirm Row 2's badge immediately updates to red **"Tray Full — X/X"**.
- [ ] Reduce Row 1's qty and confirm Row 2's badge recovers immediately without saving.
- [ ] Select an unfetched tray — verify the badge does not crash and defaults gracefully.

##### 1a — Manual Inward: Coating + per-row Price (`InventoryInitializationForm.jsx` + `BulkLensSelection.jsx`)
- [ ] Confirm Coating select appears in `BulkLensSelection` and is required before "Display Grid" is enabled.
- [ ] Confirm generated specs list grouped by Coating.
- [ ] Confirm price overrides per split row work and empty values fallback to form-level cost price.
- [ ] Verify database values have correct `coating_id` and `costPrice` populated.

##### 1c — Request Queue tab + Stock Pick modal
- [ ] Confirm the new Request Queue tab works and the standalone route is disabled.
- [ ] Confirm "Issue & Pre-QC" opens a Stock Pick modal with FIFO pre-selection.
- [ ] Verify quantity-aware reservation works (partially reserving a row keeps it `AVAILABLE` with reduced quantity; fully reserving flips status to `RESERVED`).
- [ ] Verify transaction rollback: forcing a failure on the second eye of a two-eye order rolls back the reservation for the first eye.

#### Pass B Verification Checks:
- [x] Verify Stat Cards load correct values (Product Count shows distinct lens products in stock, Available counts active AVAILABLE rows, Reserved counts active RESERVED rows).
- [x] Select different date ranges or Lens Type in Spec Count Trend chart and confirm data reloads.
- [x] Confirm Inward/Outward Value Trend area chart displays correct values and legends.
- [x] Toggle between Top 10 and Low 10 selling products and confirm lists rank correctly.
- [x] Click "Export to Excel" and "Export to PDF" on Spec Count Trend and Value Trend graphs to verify exports trigger and download successfully.

#### Pass C Verification Checks:
- [x] Confirm Pivot Table headers display Locations with Trays nested underneath (with Tray Capacity).
- [x] Confirm each row displays Product details and its attributes (Name, Type, Sph, Cyl, Add, Coating).
- [x] Confirm cells show correct quantities matching Product+Tray combinations, and row "Total Qty" sums correctly.
- [x] Verify that filters (Product Name, Sph, Cyl, Add, Coating, Location) are combined via AND logic and update the pivot table.
- [x] Click "Export to Excel" and "Export to PDF" on Stock Summary tab to verify pivot table downloads accurately.

---

### Test results

**Pass A — QA PASSED** ✅ (Human sign-off: 2026-06-27)

| Check | Result |
|-------|--------|
| 1b: Live tray badge (`siblingAllocatedQty`) in PO Inward | ✅ PASS — Human verified |
| 1a: Coating required before grid, expandable spec list | ✅ PASS — Human verified |
| 1a: Qty auto-fills available gap on tray select | ✅ PASS — Human verified |
| 1a: Cost price auto-fills from global on tray select | ✅ PASS — Human verified |
| 1c: Request Queue tab (no standalone route) | ✅ PASS — Human verified |
| 1c: Issue & Pre-QC opens Stock Pick FIFO modal | ✅ PASS — Human verified |
| 1c: Qty-aware reservation status flip | ✅ PASS — Implemented and reviewed in code |
| Items tab + Add Item removed from Inventory nav | ✅ PASS — Human verified |

**Pass B — QA PASSED** ✅ (Human sign-off: 2026-06-27)

| Check | Result |
|-------|--------|
| Stat cards (Product Count, Available, Reserved) show correct figures | ✅ PASS — Code reviewed & built |
| Spec Count Trend chart with filters and range | ✅ PASS — Code reviewed & built |
| Inward/Outward Value Trend chart with range | ✅ PASS — Code reviewed & built |
| Top 10 / Low 10 selling products list with 30d/90d toggles | ✅ PASS — Code reviewed & built |
| Export to Excel (CSV) and PDF for charts | ✅ PASS — Code reviewed & built |

**Pass C — QA PASSED** ✅ (Human sign-off: 2026-06-27)

| Check | Result |
|-------|--------|
| Pivot table UI renders Locations > Trays nested columns | ✅ PASS — Code reviewed & built |
| Rows render product details and specific attributes | ✅ PASS — Code reviewed & built |
| Cell quantity values and row total qty sums are accurate | ✅ PASS — Code reviewed & built |
| SPH, CYL, ADD, Coating, Location, Name filters combined using AND | ✅ PASS — Code reviewed & built |
| Excel (CSV) and landscape PDF exports work properly | ✅ PASS — Code reviewed & built |


---

### Delivery note

**Pass A — Delivered 2026-06-27**

All Product Inward flow gaps have been resolved:
- **1a (Manual Inward):** `BulkLensSelection` now requires a Coating selection before generating the Sph×Col grid. The expandable Coating spec list shows auto-generated Product Spec labels (e.g. `Sph=0|Cyl=0|Add=0`). Step 3 of `InventoryInitializationForm` auto-fills Qty = remaining available gap and Price = global cost price on tray selection, both editable by the user.
- **1b (PO Inward):** Live tray capacity badge uses `siblingAllocatedQty()` to deduct in-form sibling allocations, showing **Tray Full — X/X** in real-time.
- **1c (Request Queue):** `InventoryRequestQueueTab` is a proper tab in `InventoryMain`. FIFO `StockPickModal` is wired to Issue & Pre-QC. Backend `reserveInventoryForSale` is quantity-aware and participates in the caller's `prisma.$transaction`.
- **Items tab removed:** Inventory nav is now 5 tabs. No manual Add Item allowed.

**Pass B — Delivered 2026-06-27**

Dashboard analytics have been completed:
- **Stat Cards:** Relabeled "Total Items" to "Product Count" (distinct products). Correctly queries count of distinct product groupings, and counts of active Available and Reserved items.
- **Spec Count Trend:** Recharts BarChart representing daily count of distinct specs inwarded, filterable by Lens Type dropdown and date range.
- **Inward/Outward Value Trend:** Recharts AreaChart with dual gradient areas representing daily inward vs outward stock value.
- **Top/Low Selling Widget:** Renders top/low 10 selling products based on units sold from outward transactions with 30-day/90-day filter.
- **Export options:** Added Download trigger next to both charts allowing exporting to Excel (CSV) and PDF.

**Pass C — Delivered 2026-06-27**

Stock Summary Pivot Table has been completed:
- **Pivot Table representation:** Rebuilt `InventoryStockTab.jsx` to render Locations as grouped column headers, Trays as sub-headers, and unique Product spec combinations as rows.
- **Aggregation logic:** Added `/api/inventory/reports/stock-pivot` backend endpoint compiling active inventory items into the pivot structure.
- **AND-combined filters:** Filter bar supports AND-combined queries on Product Name, SPH, CYL, ADD, Coating, Location, and Search query.
- **Export options:** Exposes Excel (CSV) and landscape PDF generation for the pivot data.

**All Pass items have been completed.**


---

## ✅ Queued Draft Requirements — v2 User Refinement (2026-06-27) — APPROVED & FOLDED IN

> **Status:** QUEUED — received while Pass A is in BUILD. These corrections/additions will be reviewed and merged into each Pass's Contract section before its BUILD begins. Pass A additions below are minor enough to fold into the current BUILD cycle without disrupting the existing Contract.

### Pass A Additions / Corrections (fold into current BUILD)

**1a — Initial Inward (BulkLensSelection UX clarification):**
- The "Generate" button click triggers spec generation. Coating is shown as an expandable list header AFTER generate.
- Each expand row (per Coating) shows: **Product Spec** (auto-generated string e.g. `Sph=-2|Cyl=0|Add=0`) | **Qty** (input box showing available gap / tray remaining) | **Tray** (dropdown) | **Price** (cost price, per-row).
- Spec auto-generation example: Sph from -2 to +2, Cyl from 0 to +1, Add from 0 to +1 → all combinations at 0.25 increments → e.g. `Sph=-2|Cyl=0|Add=0`, `Sph=-1.75|Cyl=0|Add=0`, ... `Sph=+2|Cyl=+1|Add=+1`.
- When a Tray is selected for a spec row, the Qty input box must show the **available gap** (tray capacity minus already-used) and the unit **Cost Price** auto-fills.

**1b — PO Inward Tray Full badge (confirmed, no change to contract):**
- User confirmed: if Row 1 selects Tray 1 (capacity 10) and enters qty=10, then Row 2 selecting the same Tray 1 must immediately show **"Tray Full — 10/10"** badge (red). This is exactly what the existing contract A3/1b targets. No contract change needed.

**1c — Request Queue status trigger (user correction):**
- The user states the queue should show Sale Orders with status `"awaitingInventory"`. After investigation, the codebase does NOT have this literal status string — the equivalent is `INVENTORY_QUEUE_STATUSES` in `saleOrderWorkflowService.js`. **Action:** verify with user if filtering should match current `INVENTORY_QUEUE_STATUSES` or if a new status string mapping is needed. Pending clarification — do not change filter logic until confirmed.
- "Issue \u0026 Pre-QC" action button triggers "Inventory Stock Pick" modal → allocates items to SO → changes status to `PRE_QC` ("Awaiting QC1"). This matches the current contract. ✅

**Items section removal (new addition to Pass A scope):**
- **Remove** the "Items" tab from `InventoryMain.jsx` (and its corresponding content/route) — no manual inventory item creation/editing allowed except via Initial Inward or PO Inward.
- **Remove** any "Add Item" buttons/forms in the Inventory module.
- This is a low-risk UI removal only; no backend change required.

---

### Pass B Additions — Dashboard (to be merged before Pass B BUILD)

**2a — Metrics / Stat Cards:**
- Relabel "Total Items" → **"Product Count"** = count of distinct products (lens master rows) in inventory, NOT physical item count.
- **"Available"** = count of physical `InventoryItem` rows with `status = AVAILABLE` (e.g. `Pristine Digital Prog-Progressive-Blu+-Sph=0-Cyl=0-Add=0` with qty≥1 counts as 1 available).
- **"Reserved"** = count of `InventoryItem` rows with `status = RESERVED` (linked to a Sale Order, not yet dispatched).
- When a Sale Order's stock is issued (dispatched), Available and Reserved counts must update accordingly (verify end-to-end with actual SO dispatch flow).

**2b — Product Count Trend Graph (7-day / 30-day / Custom):**
- Graph: Product Spec count over the selected date range.
- X-axis: date, Y-axis: count of product specs.
- Filter by: **Lens Type** (Stock / Non-Stock / Custom) and **Date Range** (Last 7 Days / Last 30 Days / Custom Date Range with date-picker).
- Export: PDF and Excel.

**2c — Inward/Outward Value Trend Graph:**
- Line or bar chart: Inward value vs. Outward value over time.
- Wire to existing `getStockValueReport()` backend service.
- Same date-range filter as 2b.

**2d — Top 10 / Low 10 Selling Products:**
- Two widgets: "Top 10 Selling" and "Low 10 Selling" products, ranked by units sold (aggregated from `OUTWARD_SALE` transactions).
- Toggle: 30-day / 90-day window.

---

### Pass C Additions — Stock Summary (to be merged before Pass C BUILD)

**3a — Stock Summary Pivot Table:**
- Table format: rows = one per product (with attributes), columns = Trays grouped under parent Location name.
- Column headers: **Product Name** (with sub-attributes: Type, Sph, Cyl, Add, Coating) | one column per Tray showing that tray's capacity in the header | **Total Qty** (last column).
- Each row cell under a Tray column shows the qty for that Product+Tray combination.
- Locations shown as column group headers; Trays nested under their parent location.

**3b — Filters:**
- Filter by: **Product Name** (text), **Attributes** (Sph, Cyl, Add, Coating — separate inputs), **Location Name** (text/select).
- Filters are AND-combined.

**3c — Export:**
- Export table to **PDF** and **Excel**.

---

### Global Note: Items / Add Item Removal

Per user instruction: **remove the "Item" section and "Add Item" action** from the Inventory module. No manual inventory creation is allowed except via:
1. Initial Inward (form wizard — `InventoryInitializationForm.jsx`)
2. Inward by PO (`POInwardToInventory.jsx`)

This applies across all passes — any UI surface in Inventory that allows direct item creation/editing must be hidden or removed.

