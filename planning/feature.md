# Active Feature Spec

This is the single shared feature document (`planning/feature.md`). Each phase owns exactly one section below.

---

## Requirement

### Feature: Partial Reserve SO-Link Split (2026-07-27)

**Source:** Bug on `SO-2026-051` — after Issue from multi-qty stock then one-eye Pre-QC reject → Confirm Reset, SO Request Queue showed **both** eyes as Issue stock (accepted eye not retained).  
**Prior feature:** COMPLETED — Reuse Stock Power Bucketing Fix.

**Docs alignment:** Per-eye QC (`KB-041`, `ARCHITECTURE` Per-eye QC / Reservation) requires SO-linked `InventoryItem` rows with `issuedEye`. `reserveInventoryForSale` today only sets `saleOrderId`/`RESERVED`/`issuedEye` when the **entire** source row qty is consumed (`KB-021`). Partial Issue leaves the row `AVAILABLE` with `saleOrderId: null` → reject finds zero linked items → orphan QcReturn (`inventoryItemId: null`) → both eyes `needsIssue`. Touches **Inventory** reserve + **Sales** `issueToPreQc`.

---

### Problem (confirmed on SO-2026-051)

1. Issue reserved qty `2` from `InventoryItem` #3 (remaining qty &gt; 0 after reserve).
2. Source row stayed `AVAILABLE`, `saleOrderId: null`, `issuedEye: null` (partial-consume path).
3. Pre-QC reject found no linked reserved rows → created PENDING `InventoryQcReturn` with `inventoryItemId: null`.
4. After Reset → `DRAFT`, `getIssueEyeReadiness` saw no retained lens → R and L both **Issue stock**.

Secondary gap: when both eyes pick the same `inv_*` row, `issueToPreQc` reserves qty≥2 in one call and **leaves `issuedEye` null** (legacy pair), which also blocks reliable per-eye reject/retain.

---

### Locked decisions (proposed — confirm on approve)

1. **Partial reserve must create SO-linked reserved unit row(s).** When reserving qty `Q` from an AVAILABLE row whose remaining qty stays &gt; 0: decrement source qty; create **new** `InventoryItem` row(s) with `status: RESERVED`, `saleOrderId` set, `quantity: 0` (KB-021), copy product/location/tray/optical identity from source, stamp `issuedEye` when provided; keep `InventoryStock` RESERVE behavior; `OUTWARD_SALE` txn should reference the **reserved** item id (or document if source id is kept — prefer reserved row id).
2. **Full consume** (remaining ≈ 0): keep current behavior — flip source row to `RESERVED` + link SO + optional `issuedEye`.
3. **`issueToPreQc` per-eye stamping:** never reserve both eyes as one unstamped qty≥2 call when eyes need issue. Reserve **one unit per eye** with `issuedEye: RIGHT` / `LEFT` (even if both picks resolve to the same source `inv_*` id — first reserve may split a child; second reserve uses remaining source or the same source id after decrement).
4. **Reject filter hardening:** do **not** treat a single unstamped dual-eye reserved row as fully rejectable on one-eye reject when that would drop the accepted eye (prefer split/stamp so this case is rare; if one unstamped RESERVED qty-pair still exists, refuse partial reject or split before release — Contract to choose safest minimal rule).
5. **Out of scope:** backfill historical orphan QcReturns / already-broken SOs; changing Stock Summary grain; PO inward dual-eye rewrite; UI redesign beyond readiness correctness.

---

### Business rules

1. After Issue & Pre-QC for a dual-eye STOCK/RX SO from shelf stock with qty &gt; eyes needed, each issued eye has a distinct SO-linked `RESERVED` item with `issuedEye` set (or one fully-consumed source row stamped when only one unit was taken and row emptied).
2. Reject Left only → release/return only `issuedEye: LEFT` (or that eye’s row); Right stays `RESERVED` + `saleOrderId` through Confirm Reset.
3. After Reset → `DRAFT`, Request Queue / Stock Pick show **R: Has lens**, **L: Issue stock** (or mirror).
4. Auto-inward `rec_*` path already reserves qty 1 with `issuedEye` — remain correct; no regression.

---

### Acceptance

- Reproduce pattern of SO-2026-051 (Issue 2 from multi-qty row → reject one eye → Reset): accepted eye remains linked; queue shows Issue stock only for rejected eye.
- Reject creates `InventoryQcReturn` with non-null `inventoryItemId` for the rejected unit.
- Partial reserve leaves source row AVAILABLE with decremented qty and FIFO-visible; reserved child is SO-linked.
- Full-row consume (reserve all remaining qty) still flips source to RESERVED without requiring an extra split row.

---

## Contract

- [x] **No schema migration:** Reuse existing `InventoryItem.issuedEye` / `saleOrderId` / `status` / `quantity` and `InventoryQcReturn.inventoryItemId`. Do not add tables or columns for this feature.
- [x] **`reserveInventoryForSale` — partial consume (remainingQty > 0.001):** Decrement source `quantity` only; keep source `status: AVAILABLE`, `saleOrderId: null`, `issuedEye: null`, `reservedDate: null`. Create **one new `InventoryItem` child per reserved unit** (`Q` children for reserve qty `Q`), each with `status: RESERVED`, `saleOrderId` set, `reservedDate` set, `quantity: 0` (KB-021), and `issuedEye` stamped when `options.issuedEye` is `RIGHT` or `LEFT` (only valid / expected with `Q === 1` from Issue path).
- [x] **Partial child identity copy:** Each reserved child copies from source: product FKs (`lens_id`, `category_id`, `Type_id`, `coating_id`, `dia_id`, `fitting_id`, `tinting_id`), location/tray, optical fields (`rightEye`/`leftEye` + SPH/CYL/ADD/Axis), `costPrice` / `sellingPrice`, `batchNo` / `serialNo`, PO/receipt/vendor links, `isReused`, and other non-status identity fields needed for FIFO/QC identity. Set audit `createdBy`/`updatedBy` from `userId`.
- [x] **Partial — `InventoryStock`:** Keep a single `updateInventoryStock(sourceItem, Q, 'RESERVE', dbClient)` using the source row’s bucket identity (same product/location/tray as children). Do not double-count RESERVE on children.
- [x] **Partial — `OUTWARD_SALE`:** Prefer one `OUTWARD_SALE` txn per reserved **child** (`inventoryItemId` = child id, `quantity: -1`, `saleOrderId` set, `balanceAfter` consistent with that child). Do not leave the only outward txn pointing solely at the still-AVAILABLE source when a child was created.
- [x] **`reserveInventoryForSale` — full consume (remainingQty ≤ 0.001):** Keep current behavior — flip **source** to `RESERVED`, set `saleOrderId` / `reservedDate`, stamp `issuedEye` when provided, `quantity: 0`; no extra split child. Keep existing `InventoryStock` RESERVE + `OUTWARD_SALE` on the source id.
- [x] **`reserveInventoryForSale` return:** Partial path returns the reserved child item when `Q === 1`, or the list/primary reserved children when `Q > 1` (document in code); full-consume path continues to return the flipped source. Preserve `dbClient` / self-`$transaction` threading (KB-018).
- [x] **`issueToPreQc` — no unstamped pair reserve:** Remove the branch that reserves `quantity >= 2` with `issuedEyes.length >= 2` in one call and leaves `issuedEye` null. Always reserve **one unit per eye** with `{ issuedEye: 'RIGHT' | 'LEFT' }`, even when both picks resolve to the same `inv_*` source id (sequential calls: first may create a reserved child + decrement source; second reserves from remaining source or fully consumes it).
- [x] **`issueToPreQc` — `rec_*` path:** Leave auto-inward + per-eye `reserveInventoryForSale(..., 1, { issuedEye })` as-is; no regression (already qty-1 + stamped).
- [x] **Reject hardening (safest minimal):** In `filterItemsForRejectedEyes`, on a dual-eye SO with a **one-eye** reject, do **not** treat a single unstamped (`issuedEye: null`) linked reserved row as rejectable (remove/stop the `items.length === 1 && rejectedSides.length === 1` include for unstamped dual-eye). Prefer stamped children from Issue so this case is rare.
- [x] **Reject hardening — fail closed:** If a one-eye Pre-QC/Post-QC reject finds no stamped matching `issuedEye` row and would otherwise create orphan `InventoryQcReturn` with `inventoryItemId: null` while an unstamped SO-linked `RESERVED` row still exists, **refuse** the transition with a clear API error (do not release the unstamped pair; do not create null-item QcReturn). Both-eye reject / single-eye SO legacy unstamped behavior may remain.
- [x] **Out of scope (do not implement):** Historical backfill of orphan QcReturns / already-broken SOs; Stock Summary grain changes; PO inward dual-eye rewrite; UI redesign beyond readiness correctness after Reset.

---

## Test plan

- [x] Test Case 1: Partial reserve creates SO-linked reserved child
  - **Test Data:** AVAILABLE `InventoryItem` with `quantity >= 3`, no `saleOrderId`; reserve qty `1` with `issuedEye: 'RIGHT'` for a dual-eye SO.
  - **Steps:** Call `reserveInventoryForSale` (or Issue one eye from that row). Inspect source + new rows + `InventoryStock` + `OUTWARD_SALE`.
  - **Expected:** Source stays `AVAILABLE`, qty decremented by 1, `saleOrderId` null. One child: `RESERVED`, `saleOrderId` set, `quantity: 0`, `issuedEye: RIGHT`, product/location/tray/optical copied. Bucket available↓ reserved↑ by 1. `OUTWARD_SALE.inventoryItemId` is the **child** id.

- [x] Test Case 2: Full-row consume still flips source (no split)
  - **Test Data:** AVAILABLE row with `quantity: 1` (or reserve exact remaining qty).
  - **Steps:** `reserveInventoryForSale` qty = remaining with `issuedEye: 'LEFT'`.
  - **Expected:** Same row becomes `RESERVED`, `saleOrderId` set, `quantity: 0`, `issuedEye: LEFT`. No extra child row. `OUTWARD_SALE` references that source id.

- [x] Test Case 3: Same `inv_*` for both eyes → two stamped reserves
  - **Test Data:** Dual-eye DRAFT STOCK/RX SO; one FIFO row with `quantity >= 2`; Stock Pick selects same `inv_*` for R and L.
  - **Steps:** `issueToPreQc` with both eyes needing issue.
  - **Expected:** Two SO-linked `RESERVED` units with `issuedEye` RIGHT and LEFT (two children and/or full consume of remainder). No single unstamped qty≥2 reserve. SO → `PRE_QC`.

- [x] Test Case 4: SO-2026-051 pattern — one-eye reject retains accepted eye
  - **Test Data:** After Test Case 3 (or Issue 2 from multi-qty row with per-eye stamps). Pre-QC reject Left only (reusable, not scrap).
  - **Steps:** Reject Left → Confirm Reset → `DRAFT`. Check linked items, QcReturn, Request Queue / `getIssueEyeReadiness`.
  - **Expected:** Left released/returned; `InventoryQcReturn.inventoryItemId` non-null for Left. Right stays `RESERVED` + `saleOrderId`. Queue: R Has lens / L Issue stock (or mirror).

- [x] Test Case 5: Unstamped dual-eye leftover — refuse one-eye reject
  - **Test Data:** Dual-eye SO with exactly one linked `RESERVED` row, `issuedEye: null` (simulate legacy). Attempt one-eye reject.
  - **Steps:** Transition Pre-QC reject with only one of `{ rightEye, leftEye }`.
  - **Expected:** API error; row remains SO-linked `RESERVED`; no PENDING QcReturn with `inventoryItemId: null` for that attempt. Both-eye reject still allowed to process the unstamped row.

- [x] Test Case 6: Auto-inward `rec_*` regression
  - **Test Data:** Dual-eye SO; picks `rec_*` for an eye needing issue (pending receipt qty).
  - **Steps:** `issueToPreQc` for that eye (or both via receipts).
  - **Expected:** Auto-inward creates AVAILABLE then reserves qty 1 with correct `issuedEye`; no change to inward txn/`inwardedQty` behavior beyond reserve child/full-consume rules.

- [x] Test Case 7: Partial reserve FIFO visibility
  - **Test Data:** Source row after partial reserve still has remaining qty > 0.
  - **Steps:** Run FIFO / Stock Pick match for another SO needing the same spec.
  - **Expected:** Decremented source remains matchable (`AVAILABLE`, `saleOrderId` null). Reserved child is not double-picked as AVAILABLE.

---


## Test results

result: PASS
levels: L1 PASS, L2 PASS, L3 PASS, L4 PASS, L5 PASS

method: Code-path review of `inventory.service.js` / `saleOrderWorkflowService.js` / `saleOrderStatusService.js` + `node --check` syntax + live DB rolled-back smoke via real `InventoryService.reserveInventoryForSale` / `SaleOrderStatusService.filterItemsForRejectedEyes` (fixtures: AVAILABLE item id=1 qty≥3, dual-eye SO-2026-051). All smoke mutations rolled back (`QA_SMOKE_ROLLBACK`); source qty unchanged after.

- L1: Syntax OK on three focus modules; Prisma schema already has `issuedEye` / `InventoryQcReturn.inventoryItemId` (no new migration required per Contract).
- L2: Partial path maps child `saleOrderId`/`issuedEye`/`quantity:0`; `OUTWARD_SALE.inventoryItemId` = child id; full consume keeps source id.
- L3: Partial children set `createdBy`/`updatedBy` from `userId`; reserved rows get new PKs; QcReturn links non-null `inventoryItemId` when stamped item processed.
- L4: Partial vs full branch; one-unit-per-eye Issue loop (no unstamped qty≥2); `filterItemsForRejectedEyes` excludes unstamped on one-eye dual-eye reject; `PARTIAL_REJECT_UNSTAMPED_PAIR` fail-closed; Confirm Reset keeps retained eyes; FIFO `AVAILABLE`+qty>0 excludes reserved children; `dbClient`/self-`$transaction` threading preserved (KB-018).
- L5: KB-021 (RESERVED qty≈0; stock via `updateInventoryStock` RESERVE on source only for partial); KB-041 (per-eye stamp/release/retain; readiness by `issuedEye`); KB-042 (`rec_*` still stamps issued-eye powers only before qty-1 reserve).

---

## Delivery note

### Closed: Partial Reserve SO-Link Split (2026-07-27)

**Status:** DONE — QA PASS (L1–L5; live DB rolled-back smoke).

**Shipped:**
1. `reserveInventoryForSale` partial consume → SO-linked `RESERVED` child unit(s) with `issuedEye`; full consume still flips source.
2. `issueToPreQc` always reserves one unit per eye with `issuedEye` (no unstamped qty≥2 pair).
3. One-eye reject on unstamped dual-eye reserved stock fails closed (`PARTIAL_REJECT_UNSTAMPED_PAIR`).

**Docs updated:** `Project_doc.md`, `ARCHITECTURE.md`, `DATABASE_ERD.md`, `Modules/Inventory.md`, `Modules/Sales.md`, KB-043.

### Closed: Reuse Stock Power Bucketing Fix (2026-07-27)

**Status:** DONE — QA PASS (L1–L5; RETEST after cross-match LEFT rework).

**Shipped:**
1. `dispositionQcReturn` REUSE canonicalizes to single-eye SPH/CYL/ADD (`eyeSide` / `issuedEye`; FIFO left cross-match right→left copy).
2. Auto-inward `rec_*` stamps only `issuedEye` powers/flags.
3. Shared eye-aware `coalescePower` for Stock Summary list/group/pivot.

**Docs updated:** `Project_doc.md`, `ARCHITECTURE.md`, `DATABASE_ERD.md`, `Modules/Inventory.md`, `Modules/Sales.md`, KB-042.

### Closed: Per-Eye QC Rejection & Reprocess (2026-07-26)

**Status:** DONE — QA PASS (L1–L5, static/code-path; migration must be applied for live runtime).

**Shipped:**
1. Schema: `IssuedEyeSide`, `InventoryItem.issuedEye` / `isReused`, `InventoryQcReturn.eyeSide` (+ migration `20260726120000_per_eye_qc_rejection`).
2. Pre/Post QC per-eye Reject → Inventory or Scrap; accepted eye stays reserved through Confirm Reset.
3. Scrap = immediate write-off (no Inward Queue); reusable = PENDING QcReturn filtered by SO `procurementType`.
4. Reuse requires location+tray + REUSED tag; Issue / Raise PO only for missing eyes.

**Docs updated:** `Project_doc.md`, `ARCHITECTURE.md`, `DATABASE_ERD.md`, `Modules/Sales.md`, `Modules/Inventory.md`, KB-041.

### Closed: Invoice Numeric Empty → Show 0 (2026-07-26)

**Status:** DONE — QA PASS (L1–L5).

**Shipped:**
1. `fmt` coerces null/empty/non-numeric → `₹0.00`.
2. Tax Invoice line Discount / totals Discount / Round Off show `0.00` / `₹0.00` when empty (not `—`).
3. Text/identity placeholders still use `dash()` → `—`.

**Docs updated:** `Project_doc.md`, `Modules/Sales.md`, KB-040.
