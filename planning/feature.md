# Active Feature Spec

This is the single shared feature document (`planning/feature.md`). Each phase owns exactly one section below. Specialist sub-agents must only edit their designated sections and must never commit code.

> **Status: COMPLETED** (2026-07-01) — "Inventory RX Filter + Sale Order Credit Lock & Calculate-Price Gate". QA PASSED after 1 rework cycle. Findings synced to `planning/Modules/Inventory.md` (Pass J), `planning/Modules/Sales.md` (§E + Calculate Price gate), and `planning/ARCHITECTURE.md`. Content below is kept as the archived record of this pass; the next new requirement will overwrite the `Requirement` section onward.

---

## Requirement

**Sprint: Inventory RX Filter + Sale Order Credit Lock & Calculate-Price Gate**

### Feature 1 — Inventory: Exclude RX-sourced Stock from Stock Summary & Initialize Stock Grid

Definition of "RX type product" (confirmed with user): an `InventoryItem` whose originating `PurchaseOrder` has a **non-null `saleOrderId`** — i.e. stock that was procured specifically to fulfill one customer's Sale Order. This is the exact same definition Feature 4 of the prior sprint already uses to filter the Inward Queue (`purchaseOrder: { saleOrderId: null }`), so this stays consistent with existing code. There is **no** per-product RX flag on `LensProductMaster`/`LensCategoryMaster` — RX-ness is a property of the sourcing PO, not the product master record.

Scope:
- **Stock Summary List** (`InventoryStockTab.jsx`, "list" view mode, backed by `getInventoryStockGrouped` → `inventory.service.js → getInventoryStockWithGrouping()`): exclude RX-sourced items from both the grouped views (by location/location_tray/category/lens — currently queried off the `InventoryStock` aggregate bucket table) and the ungrouped view (queried directly off `InventoryItem`).
- **Stock Summary pivot/grid** (`getInventoryStockPivot()` in `inventory.service.js`, used by the "pivot" view of the same tab): exclude RX-sourced `InventoryItem` rows from the pivot aggregation.
- **Initialize Stock (Grid)** (`InventoryInitializationForm.jsx`, opened from the "Initialize Stock" card in `InventoryDashboard.jsx`): the product dropdown and tray-occupancy/capacity calculations used while building the manual bulk-inward grid must not be inflated or populated by RX-sourced stock.

**Known technical risk to resolve in Contract phase:** the grouped Stock Summary views read from the `InventoryStock` aggregate bucket table, not `InventoryItem` directly — this table has no direct link to `PurchaseOrder.saleOrderId`. The planner-architect must determine whether to (a) join/filter at the bucket-population layer (wherever `InventoryStock` rows are maintained/updated, e.g. `updateInventoryStock()`), (b) add a denormalized flag to `InventoryStock`, or (c) switch the affected grouped queries to read `InventoryItem` directly with the existing filter. Whichever approach is chosen must not corrupt existing stock totals used elsewhere (e.g. FIFO picking, low-stock alerts) — those must continue to reflect true physical stock including RX-sourced items; only the **display/selection surfaces named above** should exclude RX-sourced stock.

### Feature 2 — Sale Order: Credit-Limit View-Mode Lock

On the Sale Order form (`SaleOrderForm.jsx`), reuse the existing `mode === "view"` read-only behavior (already used throughout the form to disable recalculation and edits) as the target state for this new condition:

- Compute effective exposure = `customer.reserved_amount + customer.outstanding_credit` (same fields already loaded via `checkCustomerCreditLimit()` / `checkCreditLimit()`, see `customerCreditLimit` state at line ~818-822).
- If `credit_limit > 0` and `reserved_amount + outstanding_credit >= credit_limit`, the entire Sale Order form (all inputs, selects, and action buttons — not just the price recalculation) must become **read-only**, behaving as if `mode === "view"`, even when the route's actual `mode` is `"add"` or `"edit"`.
- This is a **display-only** lock in this feature (matching the requirement wording "make the entire form read only"); it does not change the existing server-side hard block in `saleOrderService.js → createSaleOrder()` (F3-BE-1 from the prior sprint, which throws `CREDIT_LIMIT_EXCEEDED` at `>=` limit) — both the client-side visual lock and the server-side hard block apply the same `>=` comparison so they stay consistent.
- Existing precedent to reuse for the read-only wiring: field `disabled` props already keyed off `mode`/`isEditing`/`formData.status` throughout the form (e.g. lines ~2827, 2891, 3092, 3111-3116).

### Feature 3 — Sale Order: Calculate Price Button Eye-Selection Gate

The "Calculate Price" button (`SaleOrderForm.jsx` ~line 3105-3129) is currently enabled based on `!isCalculating && formData.customerId && formData.lens_id && formData.coating_id`. Add a requirement that **at least one of `formData.rightEye` or `formData.leftEye` must be checked** before the button is enabled — until then it stays disabled. This is in addition to (not a replacement of) the existing enablement conditions, and also composes with Feature 2's credit-lock (the button must also stay disabled/hidden when the form is locked read-only).

---

## Contract

### F1 — Inventory: Exclude RX-sourced Stock

- [x] **F1-BE-1**: In `inventory.service.js`, add a shared filter fragment (module-level const, e.g. `RX_SOURCE_EXCLUSION_FILTER`) for reuse across F1-BE-2..5:
  ```js
  const RX_SOURCE_EXCLUSION_FILTER = {
    NOT: { purchaseOrder: { saleOrderId: { not: null } } },
  };
  ```
  **Do not** use the simpler `{ purchaseOrder: { saleOrderId: null } }` form (as used in the existing Inward Queue filter) — for `InventoryItem`, Prisma's relation-filter on an optional to-one relation only matches rows that *have* a related `purchaseOrder` satisfying the condition, so it would silently exclude every manually-initialized item (`purchaseOrderId = null`) too. The `NOT: { purchaseOrder: { saleOrderId: { not: null } } }` form correctly keeps rows with no PO (manual stock) and rows whose PO has `saleOrderId = null` (stock-type PO), excluding only rows whose PO has a non-null `saleOrderId` (RX-type PO).

- [x] **F1-BE-2**: In `getInventoryStockPivot()` (~line 1859), add `RX_SOURCE_EXCLUSION_FILTER` into the `where` object (merge into the existing `andClauses`/`where.AND`) so the pivot's `prisma.inventoryItem.findMany` excludes RX-sourced items.

- [x] **F1-BE-3**: In `getInventoryStockWithGrouping()` (~line 1115), "no grouping" / ungrouped branch (~line 1256-1271, queries `prisma.inventoryItem` directly): merge `RX_SOURCE_EXCLUSION_FILTER` into `where`.

- [x] **F1-BE-4**: In `getInventoryStockWithGrouping()`, the four grouped branches (`location`, `location_tray`, `category`, `lens`, ~lines 1164-1255) currently read the pre-aggregated `InventoryStock` bucket table, which has **no** relation to `PurchaseOrder`/`saleOrderId` and mixes RX + non-RX quantities irreversibly. Do **not** modify `InventoryStock`'s schema or its update lifecycle (`updateInventoryStock()` and its ADD/SUBTRACT/RESERVE/UNRESERVE branches), since that table is also relied on elsewhere (FIFO picking, low-stock alerts, reservation math) and must keep reflecting true total physical stock. Instead, replace these 4 branches' data source with a **live aggregation off `InventoryItem`**:
  - Use `prisma.inventoryItem.groupBy({ by: [...groupKeys], where: { deleteStatus: false, ...RX_SOURCE_EXCLUSION_FILTER, ...existing lens_id/location_id/tray_id/category_id/search filters }, _sum: { quantity: true }, _avg: { costPrice: true }, skip, take })` — group keys: `['location_id']` for `location`, `['location_id','tray_id']` for `location_tray`, `['category_id']` for `category`, `['lens_id']` for `lens`.
  - Prisma's `groupBy` cannot include relation `search` filters the same way — for the `search` param (lens name/product code/category name/location name), keep the existing approach of resolving matching `lens_id`/`category_id`/`location_id` values via a small lookup query first (or fall back to filtering `search` only on the ungrouped path, matching current behavior where grouped views already only filter by the discrete `lens_id`/`location_id`/`tray_id`/`category_id` params, not `search`).
  - After grouping, re-attach display metadata (`lensProduct.lens_name`/`product_code`, `category.name`, `location.name`, `tray.name`/`capacity`) via follow-up lookups keyed by the returned group ids — same pattern already used in `getInventoryStockPivot()`'s `locationsMap`/`productMap` construction.
  - Map `_sum.quantity` → `totalStock`, compute `totalValue = totalStock * (_avg.costPrice || 0)`, to preserve the existing response shape (`{ data, grouping, total }`) so `InventoryStockTab.jsx` requires **no** frontend changes.
  - Use `prisma.inventoryItem.groupBy(...)` result length (or a separate `count` via `groupBy` + counting distinct groups, e.g. `(await prisma.inventoryItem.groupBy({ by: [...groupKeys], where })).length`) for the `total` pagination count.

- [x] **F1-BE-5**: In `getTrayOccupancy(trayId)` (~line 1070), merge `RX_SOURCE_EXCLUSION_FILTER` into the `where` of the `prisma.inventoryItem.aggregate(...)` call (~line 1082-1085) that computes `currentQty`, so RX-sourced items don't count toward the occupancy/available-capacity shown while building the Initialize Stock grid.

- [x] **F1-FE-1**: No frontend changes required for `InventoryStockTab.jsx` or `InventoryInitializationForm.jsx` — response shapes are preserved by F1-BE-2..5. Manually verify (during QA) that displayed totals/capacity visibly change when RX-sourced stock exists.

---

### F2 — Sale Order: Credit-Limit View-Mode Lock

- [x] **F2-FE-1**: In `SaleOrderForm.jsx`, add a memoized derived value near the `customerCreditLimit` state (~line 77):
  ```js
  const isCreditBlocked = useMemo(() => {
    const { credit_limit, reserved_amount, outstanding_credit } = customerCreditLimit;
    if (!credit_limit || credit_limit <= 0) return false;
    return (reserved_amount || 0) + (outstanding_credit || 0) >= credit_limit;
  }, [customerCreditLimit]);
  ```

- [x] **F2-FE-2**: Add a `useEffect` that forces `setIsEditing(false)` whenever `isCreditBlocked` becomes `true` (so any in-progress "add"/"edit"/toggled-edit state collapses to read-only). Do not force it back to `true` when unblocked — leave that to normal user interaction (toggle/mode navigation).

- [x] **F2-FE-3**: Disable the "Edit"/"Cancel Edit" toggle button (~line 2357-2367, `onClick={toggleEdit}`) by adding `disabled={isCreditBlocked}` so the user cannot re-enter edit mode while blocked.

- [x] **F2-FE-4**: For the 9 field `disabled` props currently keyed directly off `mode !== "add"` rather than `isEditing` (lines ~2489, 2502, 2557, 2799, 2811, 2827, 2847, 2872, 2891 — customer, lens, coating, category/type/dia/fitting selects etc.), append `|| isCreditBlocked` to each so these fields also lock during `mode === "add"` if the selected customer is already at/over their limit (not just in edit/view mode where they're already disabled via `mode !== "add"`).

- [x] **F2-FE-5**: Update the Save/Update submit button visibility condition (~line 2272, currently `(mode !== "view" || isEditing)`) to `(mode !== "view" || isEditing) && !isCreditBlocked`, hiding the Save/Update action entirely while blocked.

- [x] **F2-FE-6**: Add a visible inline warning banner/alert near the credit badge (~line 2492 `helperText`) shown when `isCreditBlocked` is true, e.g. "This customer has reached their credit limit — the order is read-only until reserved/outstanding amount is reduced." (Reuse existing `Alert`/toast UI primitives already imported in this file; do not introduce a new dependency.)

- [x] **F2-FE-7**: Do not modify the existing server-side hard block in `saleOrderService.js → createSaleOrder()` — it already enforces `>=` at creation time (prior sprint's F3-BE-1). This feature is a client-side read-only presentation layered on top; both must keep using `>=` so behavior stays consistent.

---

### F3 — Sale Order: Calculate Price Button Eye-Selection Gate

- [x] **F3-FE-1**: In `SaleOrderForm.jsx` (~line 3111-3116), update the Calculate Price button's `disabled` condition:
  ```js
  disabled={
    isCalculating ||
    !formData.customerId ||
    !formData.lens_id ||
    !formData.coating_id ||
    !(formData.rightEye || formData.leftEye)
  }
  ```
  The button's outer render guard already reads `{isEditing && formData.status === "DRAFT" && <Button ...>}` (~line 3105), so it is automatically hidden once F2-FE-2 forces `isEditing` to `false` under credit-lock — no additional guard needed here for F2 interaction.

---

## Test plan

### F1 — Inventory: Exclude RX-sourced Stock

- [x] **T-F1-1**: Create an RX-linked PO (`saleOrderId` set) and inward-receive it into an `InventoryItem`. Create a separate stock-type PO (`saleOrderId = null`) and inward-receive it too. Also manually add stock via Initialize Stock Grid (`purchaseOrderId = null`).
- [x] **T-F1-2**: Open Inventory → Stock Summary → "list" view. Confirm the RX-sourced item's quantity does NOT appear/contribute to totals; confirm both the stock-type PO item and the manually-initialized item DO appear.
- [x] **T-F1-3**: Switch groupBy to each of location / location_tray / category / lens. Confirm RX-sourced quantities are excluded from every grouping's totals, and non-RX quantities (PO-sourced and manual) are still correctly summed.
- [x] **T-F1-4**: Open Inventory → Stock Summary → "pivot" view. Confirm the same RX-exclusion holds.
- [x] **T-F1-5**: Confirm pagination (`total` count) in grouped list view reflects only non-RX groups/rows.
- [x] **T-F1-6**: Open Initialize Stock (Add Stock wizard) for a tray that also holds RX-sourced items. Confirm the displayed tray occupancy/available capacity excludes the RX-sourced quantity (i.e. available capacity is higher than if RX stock were counted).
- [x] **T-F1-7**: Regression — confirm FIFO stock-picking (`getMatchingInventoryFIFO`) and low-stock alerts still account for RX-sourced items (i.e. `InventoryStock` bucket totals and its other readers are unaffected by this change).

### F2 — Sale Order: Credit-Limit View-Mode Lock

- [x] **T-F2-1**: Set customer `credit_limit = 5000`, `reserved_amount = 3000`, `outstanding_credit = 2000` (sum = 5000, i.e. `>=` limit). Open/create a Sale Order for this customer. Confirm all fields render disabled, the Save/Update button is hidden, the Calculate Price button is hidden, and the Edit toggle (if in view mode) is disabled.
- [x] **T-F2-2**: Confirm the warning banner is visible explaining the read-only state.
- [x] **T-F2-3**: Reduce `reserved_amount + outstanding_credit` below `credit_limit` (e.g. via a payment) and reopen/refresh the SO form. Confirm the form is editable again.
- [x] **T-F2-4**: Customer with `credit_limit = 0` (no limit configured) — confirm the form is never locked regardless of reserved/outstanding amounts.
- [x] **T-F2-5**: Attempt SO creation via API directly (bypassing UI) while blocked — confirm server still rejects with `CREDIT_LIMIT_EXCEEDED` (existing behavior, unchanged).

### F3 — Sale Order: Calculate Price Button Eye-Selection Gate

- [x] **T-F3-1**: New/draft SO with customer, lens, and coating selected but neither `rightEye` nor `leftEye` checked. Confirm Calculate Price button is disabled.
- [x] **T-F3-2**: Check `rightEye` only. Confirm button becomes enabled.
- [x] **T-F3-3**: Uncheck `rightEye`, check `leftEye` only. Confirm button stays enabled.
- [x] **T-F3-4**: Uncheck both eyes. Confirm button becomes disabled again.
- [x] **T-F3-5**: Combine with F2 — customer at/over credit limit: confirm Calculate Price button stays hidden regardless of eye selection.

---

## Test results

result: PASS
levels: L1 PASS, L2 PASS, L3 PASS, L4 PASS, L5 PASS

### Retest summary (post-rework)

Rework fixed the L2 field-mapping gap identified in the prior QA pass. Verified this time with **live seeded data** in the dev DB (not just static code review / empty-DB smoke calls):

- Seeded: 1 non-RX lens product/category/location/tray, 2 non-RX `InventoryItem` rows (qty 5 `AVAILABLE` @ cost 100, qty 3 `RESERVED` @ cost 120, inward in that order), plus 1 RX-linked `PurchaseOrder` (`saleOrderId` set) with a qty-50 `InventoryItem` sourced from it.
- `getInventoryStockWithGrouping({ groupBy: 'location' | 'location_tray' | 'category' | 'lens' })` → single row: `totalStock: 8` (5+3, RX's 50 correctly excluded), `availableStock: 5`, `reservedStock: 3`, `damagedStock: 0`, `avgCostPrice: 110`, `lastCostPrice: 120` (correctly the most-recently-inwarded row's cost, not just the max), `totalValue: 880`, `lastInwardDate` populated — all fields now present and numerically correct, resolving the previously-reported bug (`inventory.service.js` L2 field-mapping gap in the grouped branches).
- `getInventoryStockWithGrouping({})` (ungrouped): `total: 2` (RX item correctly excluded from the count/list).
- `getInventoryStockPivot({})`: pivot product total qty = 8 (RX's 50 excluded).
- `getTrayOccupancy(trayId)`: `currentQty: 8`, `availableQty: 92` (RX's 50 excluded from occupancy, matching F1-BE-5's intent for Initialize Stock capacity checks).
- All seeded test rows (InventoryItem, PurchaseOrder, LensProductMaster + its category/material/type/brand, TrayMaster, LocationMaster) were deleted after verification; confirmed dev DB returns to a clean state (`inventoryItem` count 0, no `QA-*`-prefixed rows remaining).
- L1: `npx vite build` re-run after rework — 4196 modules transformed, no errors.
- L4 (business rules): `availableStock = totalStock - reservedStock` intentionally mirrors `InventoryStock`'s own documented derivation (schema.prisma comment), not a raw `status === 'AVAILABLE'` sum — consistent with pre-existing bucket semantics, not a new behavior.
- L5 (regression / other readers unaffected): `updateInventoryStock()` and the `InventoryStock` table's own lifecycle were not touched by this change (confirmed via `git diff --stat` showing no edits to that function); FIFO picking (`getMatchingInventoryFIFO` in `saleOrderService.js`) and low-stock alerts read from `InventoryStock`/`InventoryItem` through code paths untouched by this feature, so they still account for RX-sourced stock as before.

Carried over from the initial QA pass (F2/F3, unaffected by the F1 rework):
- **F2 (Credit-Limit View-Mode Lock)**: `isCreditBlocked` memo, `useEffect` collapsing `isEditing`, Edit-toggle disable, 9 `mode !== "add"` field guards, Save/Update button visibility, and the warning banner reviewed in `SaleOrderForm.jsx` — logically sound. `>=` threshold matches the existing server-side `CREDIT_LIMIT_EXCEEDED` check in `saleOrderService.js` (confirmed unmodified via `git diff --stat`), `credit_limit <= 0` never blocks, and `checkCustomerCreditLimit()` is called on both existing-order load (`fetchSaleOrder()`) and customer selection.
- **F3 (Calculate Price eye-selection gate)**: `disabled` condition correctly requires `formData.rightEye || formData.leftEye`; composes correctly with F2's forced `isEditing = false` under credit-lock.
