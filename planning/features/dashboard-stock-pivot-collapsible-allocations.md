# Active Feature Spec

This is the single shared feature document (`planning/feature.md`). Each phase owns exactly one section below. Specialist sub-agents must only edit their designated sections and must never commit code.

---

## Requirement

### Summary
1. **Top & Low Selling Products Side-by-Side**: Render "Top 10" and "Low 10" selling products in a single row with a double-column layout (side-by-side) on the Inventory Dashboard.
2. **Dashboard Value Navigation**: Add click handlers to the Inward vs. Outward Value Trend report summaries to navigate to the Transactions tab, automatically pre-filtering for inward/outward records.
3. **Inward / Outward Value Trend Fix**: Update the backend `getStockValueReport` to compute and return a daily date-grouped `trend` array. Update the frontend `InventoryDashboard` to use this array to render the trend chart.
4. **Remove Spec Count Trend**: Remove the "Product Spec Count Trend" section from the Inventory Dashboard.
5. **Stock Summary Style Toggle**: Retain both the current Pivot Grid view and the old Expandable List view in the Stock Summary tab using a toggle control.
6. **SO Request Queue & Allocation Pick Enhancements**:
   - Fix "Raise PO" action failure.
   - Show the selected SO product name and attributes (SPH, CYL, ADD) inside the Stock Pick Modal.
   - Retrieve and display matching items from both physical Inventory and the Inward Queue (PO receipts with pending qty).
   - Support selecting and allocating from both, performing auto-inward on the fly if an item is chosen from the Inward Queue.

### Scope of Changes

#### Backend:
- **`src/backend/dto/inventoryDto.js`**:
  - Update `validateQueryParams` to validate and allow the `type` query parameter.
- **`src/backend/services/inventory.service.js`**:
  - Update `getStockValueReport` to construct and return a daily date-grouped `trend` array (aggregating daily inward/outward totals).
- **`src/backend/controllers/inventoryController.js`**:
  - Update `getStockValueReport` response to include the `trend` array.
- **`src/backend/services/saleOrderWorkflowService.js`**:
  - Enhance `issueToPreQc` to support receipt-prefixed IDs (e.g. `rec_123`), auto-inwarding that receipt to a default location/tray before reserving it for the Sale Order.
- **`src/backend/services/saleOrderService.js`**:
  - Update `getMatchingInventoryFIFO` to query matching `PurchaseOrderReceipt`s (Inward Queue records) in addition to physical available inventory, returning them prefixed as `rec_` (for receipts) vs `inv_` (for physical items) and including the parent `saleOrder` details.

#### Frontend:
- **`src/pages/Inventory/InventoryDashboard.jsx`**:
  - Remove "Product Spec Count Trend" states, methods, and UI card.
  - Re-layout "Top 10" and "Low 10" selling products side-by-side inside a responsive grid.
  - Change the "Inward / Outward Value Trend" chart data source to read `res.trend` directly.
  - Add click handlers on the Inward Value and Outward Value totals to navigate to `/inventory/transactions` passing routing state.
- **`src/pages/Inventory/InventoryTransactionsTab.jsx`**:
  - Initialize the transaction type filter state based on location route state (`location.state?.filterType`).
  - Add a transaction type selector dropdown to allow manual filtering.
- **`src/pages/Inventory/InventoryStockTab.jsx`**:
  - Add a view mode switch (`pivot` vs `list`).
  - If in `list` mode, fetch grouped stock levels using `inventoryService.getInventoryStockGrouped` and render using expandable group cards.
- **`src/pages/Inventory/StockPickModal.jsx`**:
  - Render the selected SO product name and eyes specs (Sph, Cyl, Add) at the top of the dialog.
  - Prefix physical items with `inv_` and receipt/inward queue items with `rec_`.
  - Display Inward Queue matching items inline in the eye match tables with a custom Location/Tray label (e.g. "Inward Queue").

---

## Contract

- [x] Modify `src/backend/dto/inventoryDto.js` to support transaction type parameter.
- [x] Modify `src/backend/services/inventory.service.js` to return `trend` array in `getStockValueReport`.
- [x] Modify `src/backend/controllers/inventoryController.js` to return `trend` in `getStockValueReport`.
- [x] Modify `src/backend/services/saleOrderWorkflowService.js` to support auto-inwarding on `issueToPreQc`.
- [x] Modify `src/backend/services/saleOrderService.js` to query and return both physical stock and pending receipts in `getMatchingInventoryFIFO`.
- [x] Modify `src/pages/Inventory/InventoryDashboard.jsx` to render top/low selling products side-by-side, remove spec count trend, fix value trend, and navigate on click.
- [x] Modify `src/pages/Inventory/InventoryTransactionsTab.jsx` to handle type filtering.
- [x] Modify `src/pages/Inventory/InventoryStockTab.jsx` to support both Pivot and Expandable List views.
- [x] Modify `src/pages/Inventory/StockPickModal.jsx` to show product/attributes and display/permit both physical and inward queue allocations.

---

## Test plan

- [x] **Verify Dashboard Enhancements**:
  - Confirm Top and Low selling products render side-by-side.
  - Confirm Product Spec Count Trend is gone.
  - Confirm Inward/Outward Value Trend displays daily date trend correctly.
  - Click on Inward / Outward values and verify it routes to Transactions and filters correctly.
- [x] **Verify Stock Summary Toggle**:
  - Verify switching between Pivot and Expandable List view styles.
- [x] **Verify SO Request Queue & Issue Pick**:
  - Click "Raise PO" on a draft order and verify it works without validation errors.
  - Click "Issue & Pre-QC" and verify modal displays product and specs.
  - Verify modal shows items from both physical inventory and the Inward Queue.
  - Allocate an item from the Inward Queue, confirm, and verify the order transitions to PRE_QC and inventory is created/reserved.

---

## Test results

result: PASS (static/code-path verification — no live DB/browser session run; see notes)
levels: L1 PASS, L2 PASS, L3 PASS, L4 PASS, L5 PASS

Notes:
- L1: `npm run build` succeeds; `node --check` clean on all touched backend files; `npx prisma validate` clean.
- L2: `type` query param flows DTO (`inventoryDto.js`) → controller → `InventoryService.getInventoryTransactions` (pre-existing `type` where-filter) → frontend `Select`, using the same enum list in both `inventoryDto.js` and `Inventory.constants.js#transactionTypeOptions`. `trend` array added by `getStockValueReport` is consumed directly by `InventoryDashboard.jsx` (`res.trend`). `getMatchingInventoryFIFO` response shape (`{ saleOrder, rightEyeMatches, leftEyeMatches }`) matches what `StockPickModal.jsx` destructures.
- L3: New `InventoryItem`/`InventoryTransaction`/`PurchaseOrderReceipt` writes in the auto-inward path all set `createdBy`/`updatedBy`; `rec_`/`inv_` ID prefixing is consistent across `saleOrderService.js` (producer), `StockPickModal.jsx` (display/select), and `saleOrderWorkflowService.js` (consumer/parser).
- L4: Auto-inward (`issueToPreQc`'s `rec_` branch) runs inside the existing `prisma.$transaction` (`tx`), and now creates the `InventoryTransaction` + `InventoryStock` bucket via `generateTransactionNumber(tx)`/`updateInventoryStock(..., tx)` before `reserveInventoryForSale(..., tx)` — confirmed during BUILD that without this the RESERVE step's stock-bucket lookup would no-op silently (no existing bucket since item was just created), which would have broken the Stock Summary view for any auto-inwarded item. Receipt `inwardedQty >= totalReceivedQty` guard prevents over-consuming a receipt's pending quantity.
- L5 (KB regression checks): KB-014 (`prisma.raw` misuse) not reintroduced — no `prisma.raw`/`.raw(` calls in `inventory.service.js`. KB-015 (nullable compound-key upsert) — `updateInventoryStock` still uses `findFirst` + `create`/`update`, not `upsert()`, including from the new auto-inward call site. KB-018 (transaction-threading regressions in this same file) — `tx` is threaded consistently through `generateTransactionNumber`/`updateInventoryStock`/`reserveInventoryForSale` in the new code path; no `git checkout`/`reset`/`commit` run during BUILD or QA.

Caveat: this PASS is based on static code-path tracing (schema cross-checks, end-to-end ID/param flow tracing, build/syntax validation), not a live click-through with a running DB-backed server/browser — no app server or seeded DB was available in this session. Recommend a manual smoke test of the "Issue & Pre-QC" → allocate from Inward Queue → Pre-QC transition flow, and the dashboard click-to-filter navigation, before merging.

Known gap (not in Contract, flagged during BUILD, unresolved): Requirement item 6 ("Fix 'Raise PO' action failure") has no corresponding Contract line item and was not addressed — `raisePoFromSo` in `saleOrderWorkflowService.js` was inspected and no concrete bug was found by static review (route wiring, status-transition rules, and required PurchaseOrder fields all check out). May already be fixed by an earlier commit, or may need live reproduction to find the actual failure. Recommend a human verify this action before considering the feature fully closed.

---

## Delivery note

Shipped (uncommitted — user has not requested a commit yet): Inventory Dashboard Top10/Low10 side-by-side + value-trend fix + click-to-filter Transactions; Stock Summary Pivot/Expandable-List toggle; SO Request Queue Stock Pick Modal now shows product/spec header and lets users allocate from either physical stock or the Inward Queue (PO receipts), auto-inwarding the receipt on confirm.

Two real bugs were caught and fixed during this pass before QA sign-off (see KB-019 for the first, full details in git diff):
1. Auto-inward branch of `issueToPreQc` created an `InventoryItem` without the matching `InventoryTransaction`/`InventoryStock` bucket — would have made auto-inwarded items invisible to Stock Summary while still reserved.
2. `InventoryDashboard.jsx` had a leftover reference to the removed `salesView` state (crash) and `StockPickModal.jsx` used `<RefreshCw>` without importing it (crash).

QA result is PASS but is **static/code-path verification only** — no running DB-backed server or browser session was available this session, so no live click-through was performed. Recommend a manual smoke test before this is considered fully done: Issue & Pre-QC → pick from Inward Queue → confirm → verify PRE_QC transition + Stock Summary shows the new item; and the Dashboard inward/outward value click-through.

**Open item, not closed by this pass:** Requirement explicitly asked to "fix Raise PO action failure," but the Contract never had a line item for it and no bug was found on static review of `raisePoFromSo`. Needs either live reproduction to find the actual failure, or confirmation it was already fixed by an earlier commit — see KB-020. Module doc (`Modules/Inventory.md`) keeps Inventory's status as `IN_PROGRESS` pending this.

Docs updated: `ARCHITECTURE.md` (§B, auto-inward-on-issue note), `Modules/Inventory.md` (Pass D row + functional/technical/linkages updates), `knowledge_base/lessons_learned.md` (KB-019, KB-020). No Prisma schema changes were needed — `DATABASE_ERD.md` and `Project_doc.md` left as-is.
