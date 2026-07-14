# Active Feature Spec

This is the single shared feature document (`planning/feature.md`). Each phase owns exactly one section below.

---

## Requirement

**Feature: Inventory Issue Stock - Inward Queue, Tray, RX & Stock Visibility & Gap Alignment**

### Context & Problem Statement
During "Issue Stock" (both via the SO Request Queue's "Issue & Pre-QC" and the Sale Order Form's "Move to Fitting" transitions), inventory users need to select matching available lenses. These matches can come from:
1. Physical inventory in a location's tray.
2. The inward queue (PO receipts with pending quantity).

Currently, there are several gaps in this flow:
- **Missing Source Visibility:** There is no visual representation of whether a matched item is an RX item (procured specifically for a customer's order) or general Stock.
- **Earmarked Stock Leakage:** `getMatchingInventoryFIFO` does not exclude RX-sourced items (physical or receipts) that belong to other Sale Orders.
- **Form Inconsistency:** The inline FIFO modal in `SaleOrderForm.jsx` does not support the special rendering for Inward Queue items (receipts).
- **Backend updateStatus Failure:** If a user selects a receipt item (`rec_...`) in `SaleOrderForm.jsx`, the backend status transition to `IN_FITTING` fails to perform auto-inward and reservation because it completely ignores `inventoryItemIds` and lacks auto-inward logic.

### Objectives
1. **Filter Earmarked Stock:** Update the backend FIFO matching logic (`getMatchingInventoryFIFO`) to only return general stock items or items specifically procured (RX) for the target Sale Order. Exclude items earmarked for other Sale Orders.
2. **Display Type Badge (RX vs Stock):** Enrich the match data with `sourceType` (RX vs STOCK) and `poNumber`. Display a badge in the matching tables in both `StockPickModal.jsx` and `SaleOrderForm.jsx` to show whether an item is RX or Stock.
3. **Render Receipts in Sale Order Form Modal:** Update `SaleOrderForm.jsx`'s inline FIFO modal to render receipt matches with the correct purple "Inward Queue" and "Pending Inward" labels/styling.
4. **Implement Auto-Inward on Status Update:** Update the backend status transition (`updateStatus` in `saleOrderService.js`) to handle auto-inwarding and reservation when transitioning to `IN_FITTING` with selected `inventoryItemIds` containing `rec_` prefixes.
5. **Fix status update DTO Validation:** Update `validateUpdateStatus` to allow string prefixes `rec_` and `inv_` in `inventoryItemIds`.

---

## Contract

### C1 — Backend matching logic updates
- [ ] Update `getMatchingInventoryFIFO` in `src/backend/services/saleOrderService.js` to:
  - Add `OR: [ { purchaseOrderId: null }, { purchaseOrder: { saleOrderId: null } }, { purchaseOrder: { saleOrderId: saleOrderId } } ]` in `buildWhereClause` for physical inventory matches.
  - Add `OR: [ { saleOrderId: null }, { saleOrderId: saleOrderId } ]` in `buildPoWhereClause` for pending receipts matches.
  - Include `purchaseOrder: { select: { id: true, poNumber: true, saleOrderId: true } }` in the `physical` findMany query.
  - Format `physical` results to append `sourceType: isRx ? 'RX' : 'STOCK'` and `poNumber`.
  - Format `receipts` results to append `sourceType: isRx ? 'RX' : 'STOCK'` and `poNumber`.

### C2 — Backend updateStatus method updates
- [ ] Import `InventoryService` in `src/backend/services/saleOrderService.js`.
- [ ] In `updateStatus`, check if `status === 'IN_FITTING'` and `inventoryItemIds` is provided with length > 0.
- [ ] Implement stock reservation and auto-inwarding:
  - Verify required eyes count vs item IDs.
  - Wrap the operation in a transaction (`tx`).
  - For each `itemId` in `inventoryItemIds`:
    - If `itemId` starts with `rec_`, auto-inward the receipt (find location and tray, create `InventoryItem` with matching specifications, log an `INWARD_PO` transaction, update the stock summary bucket, increment the receipt `inwardedQty`, and reserve the item).
    - If `itemId` is a standard item ID (number or prefixed with `inv_`), call `reserveInventoryForSale`.
  - Pass the transaction `tx` through to `transition` as well.

### C3 — Status update validation DTO
- [ ] Modify `validateUpdateStatus` in `src/backend/dto/saleOrderDto.js` to allow string items in `inventoryItemIds` without coercing them to `NaN` (only map elements to `Number` if they are numeric).

### C4 — Standalone StockPickModal updates
- [ ] Update `StockPickModal.jsx` to render a **Source** column in the match tables.
- [ ] Display a green badge for RX (with PO number, e.g. `RX (PO-2026-0045)`) and a blue badge for Stock.

### C5 — SaleOrderForm inline modal updates
- [ ] Update `SaleOrderForm.jsx` inline modal to render the same **Source** column and badges.
- [ ] Update row rendering inside `SaleOrderForm.jsx` to render `isReceipt` matches with `Inward Queue` styling, `Pending Inward` tray, and `Inward Queue` location.

---

## Test plan

### T1 — Earmarked stock exclusion (API/Integration)
- **Test Case:** Verify `getMatchingInventoryFIFO` excludes items earmarked for other Sale Orders.
- **Steps:**
  1. Seed SO 1 and SO 2 with identical lens specs.
  2. Seed an available physical `InventoryItem` or `PurchaseOrderReceipt` linked to a `PurchaseOrder` with `saleOrderId = 2`.
  3. Call `getMatchingInventoryFIFO(1)`.
- **Expected:** The returned matches for SO 1 do NOT include the item/receipt earmarked for SO 2.

### T2 — Specific RX and general Stock matches included (API/Integration)
- **Test Case:** Verify `getMatchingInventoryFIFO` returns general stock and specifically earmarked stock.
- **Steps:**
  1. Seed SO 1.
  2. Seed an available physical `InventoryItem` with no PO (Stock).
  3. Seed a receipt with a PO linked to `saleOrderId = 1` (RX for SO 1).
  4. Call `getMatchingInventoryFIFO(1)`.
- **Expected:** Matches include both the general stock item and the receipt.

### T3 — Modal UI source badges (UI Verification)
- **Test Case:** Verify `StockPickModal.jsx` and `SaleOrderForm.jsx` display source badges.
- **Steps:**
  1. Open StockPickModal for SO 1.
  2. Verify a "Source" column exists.
  3. Verify Stock matches display a blue `Stock` badge.
  4. Verify RX matches display a green `RX (PO-xxxx)` badge.

### T4 — Inline modal rendering in SaleOrderForm (UI Verification)
- **Test Case:** Verify `SaleOrderForm.jsx` renders receipts in the inline modal correctly.
- **Steps:**
  1. In `SaleOrderForm.jsx`, transition to `IN_FITTING` to trigger the inline modal.
  2. Verify receipt matches display with purple `Inward Queue` and `Pending Inward` labels.

### T5 — Auto-inward and reservation on status change to IN_FITTING (End-to-End)
- **Test Case:** Verify status update transitions to `IN_FITTING` and reserves receipt items.
- **Steps:**
  1. Call `PATCH /api/sale-orders/:id/status` with `status: 'IN_FITTING'` and a receipt ID in `inventoryItemIds` (e.g. `rec_1`).
  2. Verify response status is 200.
  3. Query `PurchaseOrderReceipt` to verify `inwardedQty` is incremented.
  4. Query the newly created `InventoryItem` to verify it has `status: 'RESERVED'` and is linked to the Sale Order.

---

## Test results

*(To be filled by Reviewer-QA in the next phase)*
