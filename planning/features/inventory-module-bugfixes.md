<!--
Template for a single feature/bug file. Copy to planning/features/{feature-id}.md.
Each phase owns exactly one section below — do not edit another phase's section.
-->

## Meta

- id: inventory-module-bugfixes
- title: Inventory module — fix dashboard crash, broken reserve/transfer flows, dead stock columns, missing validations
- type: bug
- status: DONE
- contract_version: 2
- last_updated: 2026-06-24

## 1 Requirement

QA pass on the Inventory module (`src/pages/Inventory`, `src/backend/services/inventory.service.js`, `src/backend/controllers/inventoryController.js`) traced the full flow (inward → reserve → transfer → dashboard/stock reporting) and live-reproduced 9 bugs against a seeded dev DB. All 9 to be fixed in this pass.

**Critical**
1. **Dashboard 500s on every load.** `getInventoryDashboardEnhanced()` (inventory.service.js:1296,1314) calls `prisma.raw(...)` inside a normal `where` filter — `prisma.raw` is not a method on a `PrismaClient` instance (only `Prisma.raw()` exists, and only valid inside `$queryRaw`/`$executeRaw`). Confirmed live: `TypeError: prisma.raw is not a function`. Same function also aggregates `InventoryStock` on `deleteStatus`/`totalValue` (line 1283-1288) — neither field exists on that model. Frontend (`InventoryMain.jsx:141`) swallows the failure silently (console.error only, no toast) so the Dashboard tab just shows permanent zeros.
2. **Reserving stock for a sale order doesn't reduce stock.** `reserveInventoryForSale()` (inventory.service.js:680-737) sets `status: 'RESERVED'` and writes a transaction row claiming a reduced balance, but never updates `InventoryItem.quantity` and never calls `updateInventoryStock()`. Live repro: reserved 4 of 10 units → item.quantity stayed 10, Stock Summary still showed availableStock=10/reservedStock=0, transaction log shows a fabricated balanceAfter=6 that matches nothing in the DB.
3. **TRANSFER transactions don't relocate stock and corrupt quantity.** The generic `createInventoryTransaction()` (inventory.service.js:541-598) is the only endpoint behind TRANSFER but always does `newBalance = currentBalance + quantity` and never touches `location_id`/`tray_id`. Live repro: transferred 5 units between two locations → item's location/tray never changed, and quantity went 5→10 (doubled) instead of being relocated.

**High**
4. `InventoryStock.reservedStock` / `.damagedStock` are real schema columns rendered live in `InventoryStockTab.jsx` ("Reserved"/"Damaged" badges) but `updateInventoryStock()` never writes either — confirmed always 0.
5. `InventoryStock` has no `totalValue` field, yet `InventoryStockTab.jsx:254-257` renders a "Total Value" column from `item.totalValue` — always blank/₹0.
6. `avgCostPrice`/`lastCostPrice`/`sellingPrice` on `InventoryStock` are set only when a stock bucket is first created, never recalculated on later inwards into the same bucket.

**Medium**
7. README-documented validations missing from `inventoryDto.js`: no `sellingPrice >= costPrice` check, no `expiryDate > manufactureDate` check.
8. `updateInventoryStock()` does find-then-write on a composite key with no upsert/locking; nullable key columns mean the `@@unique` constraint can't prevent duplicate `InventoryStock` rows under concurrent inwards.

**Low**
9. `getInventoryInwardQueue()` loads all non-deleted PO receipts into memory and paginates in JS rather than at the DB level — performance only, no functional bug.

**Acceptance criteria**
- `/api/inventory/dashboard` returns 200 with correct counts (no prisma.raw, no invalid InventoryStock fields).
- Reserving an item for a sale order reduces `InventoryItem.quantity` and `InventoryStock.availableStock`/`reservedStock` consistently with the transaction log's `balanceAfter`.
- A TRANSFER transaction moves the item's `location_id`/`tray_id` to the destination and leaves quantity unchanged (net zero), while `InventoryStock` totals shift from the source bucket to the destination bucket.
- Stock Summary's Reserved/Damaged/Total Value columns reflect real data, not permanent zeros.
- avgCostPrice/lastCostPrice/sellingPrice update on every inward, not just the first.
- Selling price < cost price and expiry <= manufacture date are rejected with a validation error.
- Concurrent inward entries for the same lens/location/tray bucket don't create duplicate `InventoryStock` rows (upsert or equivalent locking).
- Inward queue pagination moves to the DB query (low priority, can be deferred if it risks scope creep — flag to orchestrator if so).

Dev environment note: `Dev_lens` Docker stack is running with test data seeded (1 lens product, 2 locations, 2 trays, 1 customer, 1 sale order, 2 inventory items) — usable for QA verification of this fix.

## 2 Contract

<!-- planner-architect. API/DB/component contract: endpoints, schemas, types, file touch-list. Locked after CONTRACT_COMPLETE. -->

No Prisma migration in this pass. All fixes are computed-in-JS / logic-only against the current `prisma/schema.prisma` (`InventoryItem` L1034-1114, `InventoryTransaction` L1117-1164, `InventoryStock` L1167-1207, `PurchaseOrderReceipt` L733-779). `InventoryStock` has no `deleteStatus`/`totalValue` columns and none are added — `totalValue` is computed on read.

### BUG-1 — `getInventoryDashboardEnhanced()` (inventory.service.js:1243-1337)

- Remove the `prisma.raw(...)` usage entirely (lines 1296, 1314) — it is not a valid call on a `PrismaClient` instance.
- Replace the "pending inwards" `Promise.all` entry (lines 1292-1306) and the standalone `pendingCount` query (lines 1310-1317) with a single fetch + JS filter:
  ```js
  const pendingReceipts = await prisma.purchaseOrderReceipt.findMany({
    where: { deleteStatus: false },
    include: { purchaseOrder: { select: { id: true, poNumber: true, vendor: true } } },
    orderBy: { createdAt: 'desc' },
  });
  const pendingFiltered = pendingReceipts.filter(
    (r) => (r.totalReceivedQty || 0) > (r.inwardedQty || 0)
  );
  const pendingCount = pendingFiltered.length;
  const pendingInwardsList = pendingFiltered.slice(0, 5);
  ```
  Run this as one of the `Promise.all` entries (replacing the old "Pending inwards" entry); drop the second separate `pendingCount` query block (lines 1309-1317) entirely since `pendingCount`/`pendingInwardsList` are now derived from the same fetch.
- Replace the `totalValue` aggregate (lines 1282-1288, `prisma.inventoryStock.aggregate({ where: { deleteStatus: false }, _sum: { totalValue: true } })`) — both `deleteStatus` and `totalValue` are invalid fields on `InventoryStock`. Replace with:
  ```js
  const allStock = await prisma.inventoryStock.findMany({
    select: { totalStock: true, avgCostPrice: true },
  });
  const totalValue = allStock.reduce(
    (sum, s) => sum + (s.totalStock || 0) * (s.avgCostPrice || 0),
    0
  );
  ```
  Run as one `Promise.all` entry; remove `totalValue._sum.totalValue || 0` usage at line 1325 — return the computed `totalValue` number directly.
- Function signature (`getInventoryDashboardEnhanced()`, no params) and return shape (`{ totalItems, availableItems, reservedItems, damagedItems, lowStockItems, totalValue, pendingInwardsCount, pendingInwardsList }`) stay unchanged — only internals change.
- No frontend change required for the 500 fix itself, but separately add a toast/error surface in `src/pages/Inventory/InventoryMain.jsx:141` (replace silent `console.error` with the existing toast/notify utility already used elsewhere in that file) so future dashboard failures aren't silently swallowed.

### BUG-2 — `reserveInventoryForSale()` (inventory.service.js:680-737)

- Inside the same `prisma.$transaction`, after the `inventoryItem.update` that sets `status: 'RESERVED'` (lines 700-709), add a decrement of `quantity`:
  ```js
  const updatedItem = await prisma.inventoryItem.update({
    where: { id: inventoryItemId },
    data: {
      status: 'RESERVED',
      quantity: inventoryItem.quantity - quantity,
      saleOrderId, reservedDate: new Date(),
      updatedBy: userId, updatedAt: new Date(),
    },
  });
  ```
- Extend `updateInventoryStock(inventoryItem, quantity, operation)` (inventory.service.js:778-828) with a new `operation === 'RESERVE'` branch (and symmetrical `'UNRESERVE'` for future cancel/return flows) rather than writing a dedicated inline adjustment — keeps all `InventoryStock` writes centralized in one helper. In the `existingStock` branch add:
  ```js
  } else if (operation === 'RESERVE') {
    updateData.availableStock = Math.max(0, existingStock.availableStock - Math.abs(quantity));
    updateData.reservedStock = existingStock.reservedStock + Math.abs(quantity);
  } else if (operation === 'UNRESERVE') {
    updateData.availableStock = existingStock.availableStock + Math.abs(quantity);
    updateData.reservedStock = Math.max(0, existingStock.reservedStock - Math.abs(quantity));
  }
  ```
  `totalStock` is untouched for both (item stays physically in stock). If `existingStock` is missing for a RESERVE call, log and skip creation (a stock bucket should already exist from the original inward — do not fabricate one with reservedStock but zero totalStock).
- Call site: in `reserveInventoryForSale`, replace the absent stock-update call with `await this.updateInventoryStock(inventoryItem, quantity, 'RESERVE');` right after the item update.
- Leave the `InventoryTransaction` create block (lines 712-724) as-is — `balanceAfter: inventoryItem.quantity - quantity` already matches the new actual balance once BUG-2's quantity decrement above is applied.

### BUG-3 — `createInventoryTransaction()` (inventory.service.js:541-598)

- Add a branch for `transactionData.type === 'TRANSFER'` inside the existing function (not a separate method — keeps the single generic endpoint the frontend already calls per `InventoryTransactionForm.jsx`). Structure:
  ```js
  if (transactionData.type === 'TRANSFER') {
    const transaction = await prisma.inventoryTransaction.create({
      data: {
        ...transactionData,
        transactionNo,
        quantity: Math.abs(transactionData.quantity),
        balanceAfter: inventoryItem.quantity, // unchanged
        totalValue: null,
      },
    });

    await prisma.inventoryItem.update({
      where: { id: transactionData.inventoryItemId },
      data: {
        location_id: transactionData.toLocationId,
        tray_id: transactionData.toTrayId,
        updatedAt: new Date(),
        updatedBy: transactionData.createdBy,
      },
    });

    // Move totals from source bucket to destination bucket
    await this.updateInventoryStock(inventoryItem, Math.abs(transactionData.quantity), 'SUBTRACT');
    await this.updateInventoryStock(
      { ...inventoryItem, location_id: transactionData.toLocationId, tray_id: transactionData.toTrayId },
      Math.abs(transactionData.quantity),
      'ADD'
    );

    return transaction;
  }
  // else: existing logic (lines 556-587) unchanged
  ```
  Place this branch immediately after the `inventoryItem` fetch/null-check (after line 554), before the existing `currentBalance`/`newBalance` computation, so the existing path is untouched for all non-TRANSFER types.
- `InventoryTransaction.quantity` for a TRANSFER row stores the positive magnitude moved (`Math.abs(transactionData.quantity)`), matching what the frontend already sends (`InventoryTransactionForm.jsx` sends `Math.abs(value)` for non-ADJUSTMENT types). `balanceAfter` stores the item's unchanged on-hand quantity (net zero movement), not a recomputed balance.
- `fromLocationId`/`fromTrayId`/`toLocationId`/`toTrayId` are already part of `transactionData` (validated by `validateCreateInventoryTransaction` in inventoryDto.js) and pass through via the `...transactionData` spread — no DTO change needed for BUG-3.

### BUG-4/5/6 — `updateInventoryStock()` (inventory.service.js:778-828)

- `existingStock` ADD branch: add weighted-average cost recompute and refresh `lastCostPrice`/`sellingPrice` on every inward (currently only set at bucket creation, lines 812-822):
  ```js
  if (operation === 'ADD') {
    const newQty = Math.abs(quantity);
    const priorTotal = existingStock.totalStock;
    const newAvgCost = inventoryItem.costPrice != null && priorTotal + newQty > 0
      ? ((existingStock.avgCostPrice || 0) * priorTotal + inventoryItem.costPrice * newQty) / (priorTotal + newQty)
      : existingStock.avgCostPrice;
    updateData.totalStock = priorTotal + newQty;
    updateData.availableStock = existingStock.availableStock + newQty;
    updateData.avgCostPrice = newAvgCost;
    if (inventoryItem.costPrice != null) updateData.lastCostPrice = inventoryItem.costPrice;
    if (inventoryItem.sellingPrice != null) updateData.sellingPrice = inventoryItem.sellingPrice;
    updateData.lastInwardDate = new Date();
  }
  ```
- Add a `DAMAGE` operation branch (used when `createInventoryTransaction` is called with `type: 'DAMAGE'`, existing generic path already calls `updateInventoryStock(..., 'SUBTRACT')` today for any negative-quantity type — change the call site at line 585 so `DAMAGE` routes to a dedicated branch instead of plain `SUBTRACT`):
  ```js
  } else if (operation === 'DAMAGE') {
    updateData.totalStock = Math.max(0, existingStock.totalStock - Math.abs(quantity));
    updateData.availableStock = Math.max(0, existingStock.availableStock - Math.abs(quantity));
    updateData.damagedStock = existingStock.damagedStock + Math.abs(quantity);
  }
  ```
  In `createInventoryTransaction`'s non-TRANSFER branch (line 585), change `transactionData.quantity > 0 ? 'ADD' : 'SUBTRACT'` to: `transactionData.type === 'DAMAGE' ? 'DAMAGE' : (transactionData.quantity > 0 ? 'ADD' : 'SUBTRACT')`.
- `totalValue` (BUG-5): no schema column added. Add a computed field in JS on every `InventoryStock` row returned by:
  - `getInventoryStock()` (inventory.service.js:605-670) — map `stockItems` before return: `stockItems.map(s => ({ ...s, totalValue: (s.totalStock || 0) * (s.avgCostPrice || 0) }))`.
  - `getInventoryStockWithGrouping()` (inventory.service.js:1015-1188) — apply the same map to the `stocks` array in each of the `location`/`location_tray`/`category`/`lens` branches before returning `{ data: stocks, ... }` (the ungrouped `else` branch returns `InventoryItem` rows, not `InventoryStock`, so no `totalValue` mapping there — `InventoryItem` has no stock-value concept at the row level).
  This satisfies `InventoryStockTab.jsx:254-257`'s existing `item.totalValue` read with no frontend change.

### BUG-7 — `inventoryDto.js` `validateCreateInventoryItem` (lines 42-173)

Add two cross-field checks after the existing `sellingPrice` number check (after line 86), in the same `errors.push({ field, message })` style:

```js
if (data.sellingPrice !== undefined && data.sellingPrice !== null && data.costPrice !== undefined) {
  const sp = parseFloat(data.sellingPrice);
  const cp = parseFloat(data.costPrice);
  if (!isNaN(sp) && !isNaN(cp) && sp < cp) {
    errors.push({ field: 'sellingPrice', message: 'sellingPrice must be greater than or equal to costPrice' });
  }
}

if (data.expiryDate && data.manufactureDate) {
  const expiry = new Date(data.expiryDate);
  const manufacture = new Date(data.manufactureDate);
  if (!isNaN(expiry.getTime()) && !isNaN(manufacture.getTime()) && expiry <= manufacture) {
    errors.push({ field: 'expiryDate', message: 'expiryDate must be after manufactureDate' });
  }
}
```
Both are guarded so they only fire when the relevant fields are present (matches the file's existing "optional unless provided" convention).

### BUG-8 — `updateInventoryStock()` race (inventory.service.js:778-828)

**Revision 2 (contract_version: 2) — see below.** The `upsert()` design specified in revision 1 is wrong and must be discarded — see rationale, then the corrected design.

**Why upsert doesn't work here, and why no upsert variant can work without a migration.** `InventoryStock.category_id` / `Type_id` / `coating_id` / `location_id` / `tray_id` are all nullable (`Int?`); only `lens_id` is required. Prisma 6 generates the compound-unique `WhereUniqueInput` (`lens_id_category_id_Type_id_coating_id_location_id_tray_id`) with **non-nullable** field types, so any `upsert`/`update` call whose `where` includes a null component throws `PrismaClientValidationError: Argument <field> must not be null` — confirmed live, and true for the majority of this dataset (`Type_id`/`coating_id` null on every seeded item; `category_id` null on some). This is not a code-level mistake to patch around: it is a fundamental mismatch between Prisma's compound-unique `where` input (which requires non-null) and the schema's nullable key columns, and it holds for *any* upsert-shaped write (Prisma client upsert, or raw-SQL `INSERT ... ON CONFLICT` — Postgres itself treats `NULL <> NULL` for unique-constraint/conflict matching purposes, so `ON CONFLICT` would silently fail to match existing null-keyed rows and insert duplicates instead, which is worse than the current behavior). A real fix requires either (a) a migration adding non-null sentinel values or a generated/coalesced key column, or (b) a partial/expression unique index — both out of scope for this no-migration bugfix pass.

**Decision: revert to find-then-write (findFirst by composite fields, then create or update-by-primary-id), explicitly downgrading BUG-8's scope to "best-effort race reduction," not true atomicity.** This is the pattern that existed before the revision-1 upsert change. Do **not** attempt a partial upsert (e.g. upsert only when all key fields happen to be non-null, find-then-write otherwise) — that branches the persistence mechanism on data shape, doubles the code paths to maintain/test, and buys negligible practical protection since concurrent-write collisions on a single bucket are rare in this app's actual usage pattern (one inward/reserve/transfer operation at a time per item, no bulk concurrent writers identified). A single, simple, well-understood mechanism is preferable to a partially-atomic hybrid that's harder to reason about and still doesn't close the gap.

Replace the current `findFirst` + `upsert` (inventory.service.js:821-898, as actually implemented — note the implementer's current code already does a `findFirst` *and* an `upsert`, which is both redundant and still broken) with the single find-then-write pattern below. Keep every existing operation branch (`ADD`/`SUBTRACT`/`RESERVE`/`UNRESERVE`/`DAMAGE`) and their `updateData` computation (lines 849-877) byte-for-byte as-is — only the persistence call at the bottom changes:

```js
const stockKey = {
  lens_id: inventoryItem.lens_id,
  category_id: inventoryItem.category_id,
  Type_id: inventoryItem.Type_id,
  coating_id: inventoryItem.coating_id,
  location_id: inventoryItem.location_id,
  tray_id: inventoryItem.tray_id,
};

const existingStock = await prisma.inventoryStock.findFirst({ where: stockKey });

if (!existingStock && (operation === 'RESERVE' || operation === 'UNRESERVE')) {
  console.error(/* unchanged guard, as currently implemented */);
  return;
}

// ...compute updateData per the ADD/SUBTRACT/RESERVE/UNRESERVE/DAMAGE branches,
// unchanged from current code (lines 849-877)...

if (existingStock) {
  await prisma.inventoryStock.update({
    where: { id: existingStock.id },
    data: updateData,
  });
} else {
  await prisma.inventoryStock.create({
    data: {
      ...stockKey,
      totalStock: operation === 'ADD' ? Math.abs(quantity) : 0,
      availableStock: operation === 'ADD' ? Math.abs(quantity) : 0,
      avgCostPrice: inventoryItem.costPrice,
      lastCostPrice: inventoryItem.costPrice,
      sellingPrice: inventoryItem.sellingPrice,
      lastInwardDate: new Date(),
    },
  });
}
```
`findFirst` by the plain `stockKey` object (not the compound-unique `where`) works fine with nulls — Prisma's regular `where` filter (as opposed to a `WhereUniqueInput`) matches `null` columns correctly (`category_id: null` filters for rows where `category_id IS NULL`), which is exactly the pattern the pre-revision-1 code already used successfully. `update` keyed on `existingStock.id` (the primary key, always non-null) sidesteps the compound-unique `where` restriction entirely. This is what makes find-then-write viable here when upsert is not.

**What this does and doesn't fix.** This keeps `updateInventoryStock()` callable for every null-FK item in the dataset (closing the actual blocking bug — the silent no-op/swallowed-error path that broke BUG-2/3/4/5/6 verification), and it is no worse than the pre-revision-1 code at race safety. It does **not** achieve true atomicity: two concurrent calls for the same `stockKey` can both pass the `findFirst` check before either writes, and both then attempt a `create`, racing against the `@@unique` constraint — except, per the rationale above, that constraint doesn't even reliably reject duplicates when any key field is null, since Postgres treats `NULL` as distinct from `NULL`. So for null-FK buckets, true duplicate-row prevention is **not achievable without a migration**, full stop.

**Explicitly deferred (no further action this pass):** true atomic/duplicate-proof concurrent writes for `InventoryStock` buckets with any null key component. Real fix requires a migration — e.g. backfilling nullable FK columns with a sentinel value (such as `0` mapped to "none") and making them non-null so Prisma's compound-unique `where`/`upsert` works as originally intended, or adding a unique expression index using `COALESCE(category_id, -1)` etc. Tracked as a follow-up alongside BUG-9. The acceptance criterion "Concurrent inward entries for the same lens/location/tray bucket don't create duplicate `InventoryStock` rows" is **only fully met for buckets where all five nullable key fields happen to be non-null**; for any bucket with a null component it is best-effort (same window as pre-existing code, not regressed, not closed).

### BUG-9 — `getInventoryInwardQueue()` (inventory.service.js:204-328)

Defer to a follow-up pass. Rationale: pagination here is coupled to a derived field (`pendingQty = totalReceivedQty - inwardedQty`, filtered to `> 0`) that has no DB column to filter/sort on directly — moving pagination to the DB query would require either a generated/computed column migration or a raw SQL `HAVING` clause, both out of scope for a no-migration bugfix pass. Current data volume (per dev seed: single-digit receipts) makes the in-memory approach safe for now. Flag to orchestrator as explicitly deferred, not fixed.

### File touch-list

- `src/backend/services/inventory.service.js` — `getInventoryDashboardEnhanced()` (~1243-1337), `reserveInventoryForSale()` (~680-737), `createInventoryTransaction()` (~541-598), `updateInventoryStock()` (~778-828), `getInventoryStock()` (~605-670), `getInventoryStockWithGrouping()` (~1015-1188).
- `src/backend/dto/inventoryDto.js` — `validateCreateInventoryItem()` (~42-173): add sellingPrice/expiryDate cross-field checks.
- `src/pages/Inventory/InventoryMain.jsx` — line ~141: replace silent `console.error` on dashboard fetch failure with existing toast/notify call.
- No changes to `prisma/schema.prisma`, no new migration.
- BUG-9 (`getInventoryInwardQueue()`, inventory.service.js:204-328): explicitly deferred, no code change in this pass.

## 3 Test plan

<!-- implementer-fullstack. What was built + how to verify it (manual steps / test files). -->

### What was built (per contract, function-by-function)

- **BUG-1** `getInventoryDashboardEnhanced()`: removed both `prisma.raw(...)` calls; `totalValue` now computed in JS from `prisma.inventoryStock.findMany({ select: { totalStock, avgCostPrice } })`; "pending inwards" now one `findMany` + JS filter (`totalReceivedQty > inwardedQty`), `pendingCount`/`pendingInwardsList` derived from the same fetch (no second query).
- **BUG-2** `reserveInventoryForSale()`: `inventoryItem.update` now decrements `quantity` by the reserved amount; added `await this.updateInventoryStock(inventoryItem, quantity, 'RESERVE')` call. `updateInventoryStock` got new `RESERVE`/`UNRESERVE` branches (moves availableStock → reservedStock and back); guarded against fabricating a bucket when none exists yet.
- **BUG-3** `createInventoryTransaction()`: added a `TRANSFER` branch (before the existing balance-calc logic) that creates the transaction row with `balanceAfter = inventoryItem.quantity` (unchanged) and positive `quantity`, updates the item's `location_id`/`tray_id` to the destination, and calls `updateInventoryStock` twice (SUBTRACT on source bucket, ADD on destination bucket).
- **BUG-4/5/6** `updateInventoryStock()`: `ADD` branch now recomputes weighted-average `avgCostPrice` and refreshes `lastCostPrice`/`sellingPrice` on every inward (not just bucket creation). Added a `DAMAGE` branch (moves totalStock/availableStock down, damagedStock up); `createInventoryTransaction`'s non-TRANSFER call site routes `type === 'DAMAGE'` to the new branch instead of generic `SUBTRACT`. `totalValue` (BUG-5) is computed in JS (`totalStock * avgCostPrice`) and mapped onto every row returned by `getInventoryStock()` and onto the `location`/`location_tray`/`category`/`lens` branches of `getInventoryStockWithGrouping()` (the ungrouped `else` branch returns raw `InventoryItem` rows, untouched, per contract).
- **BUG-7** `inventoryDto.js` `validateCreateInventoryItem()`: added `sellingPrice >= costPrice` and `expiryDate > manufactureDate` cross-field checks, guarded so they only fire when the relevant fields are present.
- **BUG-8 (revision 2, contract_version 2)** `updateInventoryStock()`: the revision-1 `upsert()` design was discarded per the corrected contract — reverted to find-then-write: `findFirst` by the plain `stockKey` object (matches `null` FK columns correctly via a normal `where` filter, unlike the compound-unique `WhereUniqueInput` which rejects nulls), then `update` keyed on `existingStock.id` (primary key, always non-null) if found, else `create`. The `ADD`/`SUBTRACT`/`RESERVE`/`UNRESERVE`/`DAMAGE` operation branches and their `updateData` computation were left byte-for-byte unchanged — only the persistence call at the bottom of the function changed. This is explicitly downgraded to "best-effort race reduction" (not true atomicity); true duplicate-row prevention for null-FK buckets is deferred pending a future migration (sentinel values or a `COALESCE`-based expression unique index), same treatment as BUG-9.
- **BUG-9**: left untouched, as instructed (deferred).
- `InventoryMain.jsx`: dashboard-load `catch` block now calls the existing `toast(...)` (same pattern used by the items-tab loader a few lines above) instead of `console.error` only; added `toast` to the effect's dependency array.

### Manual verification (live Dev_lens stack, backend rebuilt + recreated via `docker compose build backend && docker compose up -d backend`, confirmed via `docker logs lens_dev_backend` and `/api/health`)

**BUG-1 — dashboard.** `GET /api/inventory/dashboard` →
```
{"success":true,"data":{"totalItems":2,"availableItems":1,"reservedItems":1,"damagedItems":0,"lowStockItems":[],"totalValue":2000,"pendingInwardsCount":0,"pendingInwardsList":[]}}
```
200 OK, real numbers, no `prisma.raw` TypeError. PASS.

**BUG-7 — validation.**
- `sellingPrice(50) < costPrice(100)` → `400 {"success":false,"message":"Validation failed","errors":[{"field":"sellingPrice","message":"sellingPrice must be greater than or equal to costPrice"}]}`. PASS.
- `expiryDate(2025-01-01) <= manufactureDate(2026-01-01)` → `400 {"success":false,"message":"Validation failed","errors":[{"field":"expiryDate","message":"expiryDate must be after manufactureDate"}]}`. PASS.

**BUG-8 (revision 2) — find-then-write, blocker resolved.** After applying the corrected contract (findFirst-by-plain-object + create/update-by-id), rebuilt and recreated `lens_dev_backend` (`docker compose build backend && docker compose up -d backend`). Created fresh item id=5 (lens_id=1, category_id=null, Type_id=null, coating_id=null, location_id=3, tray_id=5, qty=10, costPrice=100) — i.e. the exact null-FK shape that previously threw `PrismaClientValidationError`. Result: `201` success, **no error in `docker logs lens_dev_backend`**, and a new `InventoryStock` row (id=2) was created with `totalStock=10, availableStock=10, avgCostPrice=100` — confirmed via `SELECT * FROM "InventoryStock" WHERE id=2`. The blocker (silent no-op on every null-FK write) is resolved. PASS.

**BUG-2 — reserve, full verification (item + InventoryStock).** Reserved 4 of item 5's 10 units: `POST /api/inventory/reserve {inventoryItemId:5, quantity:4, saleOrderId:1}` → item `quantity` 10→6, `status=RESERVED`, `saleOrderId=1`. `InventoryStock` bucket id=2: `availableStock` 10→6, `reservedStock` 0→4, `totalStock` unchanged at 10 (physically still in stock, per contract) — confirmed via direct DB query:
```
id | totalStock | availableStock | reservedStock
 2 |         10 |              6 |             4
```
Consistent with the transaction log's `balanceAfter=6`. PASS — fully verified, including the `InventoryStock` side that was previously blocked.

**BUG-3 — TRANSFER, full verification (item + both InventoryStock buckets).** Created fresh item id=6 (qty=5, location_id=3/tray_id=5, same null-FK shape as item 5 → shares bucket id=2, which grew to totalStock=15/availableStock=11 after this inward). Transferred item 6's 5 units to location_id=4/tray_id=6: `POST /api/inventory/transactions {type:TRANSFER, inventoryItemId:6, quantity:5, fromLocationId:3, fromTrayId:5, toLocationId:4, toTrayId:6}` → transaction `balanceAfter:5, quantity:5` (unchanged/positive). `GET /api/inventory/items/6` after → `quantity=5, location_id=4, tray_id=6`. `GET /api/inventory/stock` afterward shows three buckets:
```
id=1 loc=3 tray=5 total=20 avail=20 reserved=0  damaged=0 avgCost=100 totalValue=2000
id=2 loc=3 tray=5 total=10 avail=6  reserved=4  damaged=0 avgCost=100 totalValue=1000
id=3 loc=4 tray=6 total=5  avail=5  reserved=0  damaged=0 avgCost=100 totalValue=500
```
Source bucket id=2 dropped from totalStock=15/availableStock=11 (post-item-6-inward) to totalStock=10/availableStock=6 (-5, matching the transfer), and a new destination bucket id=3 (location_id=4/tray_id=6) was created with totalStock=5/availableStock=5. Two distinct rows, source reduced, destination increased — the full BUG-3 acceptance criterion (item-level AND stock-bucket-level) is now met. PASS.

**BUG-4/5/6 — totalValue / avgCostPrice recompute / damagedStock, full verification.**
- `totalValue` (BUG-5): all three buckets above show correct `totalStock * avgCostPrice` (2000, 1000, 500). PASS.
- `avgCostPrice` weighted-average recompute (BUG-6): created item id=7 (qty=5, costPrice=200, location_id=4/tray_id=6 — same key as bucket id=3, which had totalStock=5 @ avgCostPrice=100). Expected new average: `(100*5 + 200*5)/10 = 150`. Actual result after the inward:
```
id=3 totalStock=10 availableStock=10 avgCostPrice=150 lastCostPrice=200 sellingPrice=250
```
Exact match. `lastCostPrice`/`sellingPrice` also correctly refreshed to the latest inward's values (200/250). PASS.
- `damagedStock` write (BUG-4, DAMAGE branch): damaged 3 of item 7's 5 units: `POST /api/inventory/transactions {type:DAMAGE, inventoryItemId:7, quantity:-3}` → transaction `balanceAfter:2`. Bucket id=3 after:
```
id=3 totalStock=7 availableStock=7 damagedStock=3
```
totalStock/availableStock reduced by 3, damagedStock increased by 3 — matches the DAMAGE formula exactly. PASS.

Final sanity check: `GET /api/inventory/dashboard` → `totalValue:4050` = bucket 1 (2000) + bucket 2 (10*100=1000) + bucket 3 (7*150=1050) = 4050, confirming BUG-1's dashboard total stays consistent with the now-correct per-bucket values. `docker logs lens_dev_backend` showed zero unexpected errors across this entire verification run (only the intentional `RESERVE`-on-missing-bucket guard log, which did not fire here since all buckets pre-existed).

### Files changed
- `src/backend/services/inventory.service.js`
- `src/backend/dto/inventoryDto.js`
- `src/pages/Inventory/InventoryMain.jsx`

## 4 Test results

- result: PASS
- rework_tag: —
- next: Ship. Orchestrator should record BUG-8/BUG-9 as explicitly deferred/best-effort (approved gap, not oversight) in the delivery note, and optionally backlog: (a) a future migration for null-FK sentinel values to close the BUG-8 atomicity gap, (b) DB-level pagination for BUG-9, (c) wiring an UNRESERVE caller (cancel/return sale-order flow) since it is currently dead code, (d) optionally setting `InventoryItem.status = 'DAMAGED'` on DAMAGE transactions for dashboard `damagedItems` consistency (pre-existing gap, not introduced by this pass, not in original bug list).

<!-- reviewer-qa. Findings, what failed, why. -->

**Independent verification performed** (own fresh data, not implementer's leftover items 1-7/test buckets 1-3; created items 8-11 across new/shared buckets) against the live Dev_lens stack (lens_dev_backend on :6201, lens_dev_postgres). Did not just trust the implementer's self-reported numbers — re-derived every figure from raw API responses.

**Code review (diff matches contract_version 2 exactly):**
- BUG-1: `getInventoryDashboardEnhanced()` (inventory.service.js:1316-1400) — no `prisma.raw`, single `findMany`+JS-filter for pending inwards, `totalValue` computed via reduce over `{totalStock, avgCostPrice}`. Matches contract byte-for-byte. `InventoryMain.jsx:141-146` now calls `toast(...)` instead of bare `console.error`, `toast` added to effect deps (line 153). Confirmed.
- BUG-2/RESERVE: item quantity decrement + `updateInventoryStock(item, qty, 'RESERVE')` call present (lines 739-752). `RESERVE` branch correctly moves availableStock→reservedStock, leaves totalStock untouched. Guard against fabricating a bucket on missing-bucket RESERVE confirmed present (lines 836-844).
- BUG-3/TRANSFER: branch at lines 556-586 creates transaction with unchanged `balanceAfter`/positive quantity, moves `location_id`/`tray_id`, then correctly does SUBTRACT on source bucket (passing the pre-update `inventoryItem` snapshot) and ADD on destination bucket (passing a shallow-merged object with new location/tray) — correct sign/operation pairing for source vs. destination, confirmed both by code reading and live test.
- BUG-4/5/6: `ADD` branch (lines 850-861) implements weighted-average cost correctly: `(oldAvg*priorTotal + costPrice*newQty)/(priorTotal+newQty)`, refreshes lastCostPrice/sellingPrice only when provided (`!= null` guards) — confirmed this means a null-sellingPrice inward does NOT clobber a previously-set sellingPrice (verified live). `DAMAGE` branch (lines 872-876) correctly reduces totalStock/availableStock and increases damagedStock; call site (line 620) correctly routes `type === 'DAMAGE'` to the dedicated branch instead of generic SUBTRACT. `totalValue` mapping confirmed present and correct on `getInventoryStock()` (line 688-691) and on all four grouped branches of `getInventoryStockWithGrouping()` (location/location_tray/category/lens, lines 1156/1179/1202/1225); the ungrouped `else` branch (line 1229-1251) correctly returns raw `InventoryItem` rows with no totalValue mapping, per contract.
- BUG-7: `inventoryDto.js` lines 81-102 — both new checks are properly guarded (`!== undefined && !== null` / truthy-date checks) so they only fire when the relevant fields are supplied; matches the file's existing optional-field convention.
- BUG-8 (rev 2): `updateInventoryStock()` (lines 821-901) now does plain-object `findFirst` (not compound-unique `where`) then `update`-by-`existingStock.id` or `create` — matches the corrected contract exactly, byte-for-byte against the spec's code block, including the unchanged ADD/SUBTRACT/RESERVE/UNRESERVE/DAMAGE branches.
- **UNRESERVE is dead code**: grepped the full backend/frontend tree — `'UNRESERVE'` is referenced only inside `updateInventoryStock()`'s own branch definitions; no controller, route, or service call ever passes it. This matches the contract's own framing ("symmetrical UNRESERVE for *future* cancel/return flows") so it is intentional, not a defect — but it means RESERVE/UNRESERVE symmetry is unexercised in this pass; flagging for visibility, not blocking.

**Live re-test results (fresh items 8-11, independent of implementer's items 1-7):**
- Dashboard: `GET /api/inventory/dashboard` → 200, `totalValue:6204.244...` verified to equal the exact sum of all 4 live `InventoryStock` bucket totalValues (2896.55+1000+1200+1107.69). Confirmed consistent end-to-end, not just internally self-consistent.
- Double-inward weighted avg cost: item 8 (qty8@cost100) + item9 (qty5@cost200) into same bucket → avgCostPrice computed as 138.4615384615385 = 1800/13 exactly. sellingPrice correctly NOT overwritten by item 9 (which had no sellingPrice) — stayed at item 8's value (150). lastCostPrice correctly updated to 200 (latest inward).
- RESERVE: reserved 3 of item 8's 8 units → item quantity 8→5, status RESERVED; bucket totalStock unchanged at 13, availableStock 13→10, reservedStock 0→3. Transaction balanceAfter=5 consistent.
- TRANSFER: moved item 9 (qty5) from loc4/tray6 to loc3/tray5 → item location/tray updated, quantity unchanged at 5 (net zero); source bucket totalStock -5/availableStock -5; destination bucket (pre-existing, totalStock 20) merged via ADD with correct weighted-avg recompute (100*20+200*5)/25=120. Source/destination sign and operation correctly paired.
- DAMAGE: damaged 2 of item 9's 5 units → totalStock -2, availableStock -2, damagedStock +2. Exact match.
- Validation rejections: sellingPrice(50)<costPrice(100) → 400 with correct field/message. expiryDate<=manufactureDate (both strict-less and equal-boundary cases) → 400 with correct field/message. Confirmed boundary (`<=`) behaves as specified, not just strict `<`.
- Validation opt-in confirmed: created an item with NO sellingPrice and NO expiryDate/manufactureDate → 201 success, no validation error. New checks are properly optional, not mandatory — matches BUG-7's "guarded" requirement.
- BUG-8 null-FK case: created a fresh item with category_id/Type_id/coating_id all null (the exact shape that previously threw `PrismaClientValidationError`) → 201 success, zero errors in `docker logs lens_dev_backend`. Independently confirms the blocker is resolved.

**Regression checks (all passed):**
- Plain INWARD_DIRECT item creation: unaffected, still works (multiple fresh items created successfully throughout this session).
- Plain OUTWARD_SALE (non-TRANSFER, non-RESERVE): item quantity and bucket totalStock/availableStock both decremented correctly; avgCostPrice unaffected by SUBTRACT (as expected — SUBTRACT branch doesn't touch avgCostPrice).
- `getInventoryStockWithGrouping` for all 5 `groupBy` values (location/location_tray/category/lens/none) tested live via the actual route (`/api/inventory/stock-grouped`, not `/stock/grouped` as I initially guessed) — all 200, `totalValue` present and correct on the four grouped variants, absent (by design) on `none`.
- Insufficient-stock guard on RESERVE (reserving more than available) still correctly returns 400 `INSUFFICIENT_STOCK`.
- Already-RESERVED item correctly rejected on a second RESERVE attempt (400 `ITEM_NOT_AVAILABLE`) — unaffected by BUG-2's changes.

**Acceptance criteria checked line-by-line (## 1 Requirement):**
1. Dashboard 200, no prisma.raw, no invalid fields — MET.
2. Reserve reduces quantity + availableStock/reservedStock consistent with balanceAfter — MET.
3. TRANSFER moves location/tray, quantity net-zero, InventoryStock totals shift source→destination — MET.
4. Reserved/Damaged/Total Value columns reflect real data — MET.
5. avgCostPrice/lastCostPrice/sellingPrice update on every inward — MET.
6. sellingPrice<costPrice and expiry<=manufacture rejected — MET.
7. Concurrent inward dedup — **PARTIALLY MET, by design/approved contract revision 2**: only guaranteed for buckets where all 5 nullable key fields are non-null; for any null-FK bucket it is best-effort only (same race window as before, not regressed, not closed) — this is the explicitly-approved BUG-8 downgrade, not an oversight.
8. Inward queue pagination to DB — **NOT MET, explicitly deferred (BUG-9)** per contract, approved, no code change made, flagged to orchestrator as instructed.

No discrepancies found between the implementer's self-reported test plan and my independent re-verification — all of their claimed PASS results reproduced correctly with my own data, and the diff matches the contract precisely. No regressions found.

## 5 Delivery note

Shipped 7 of 9 bugs found in the Inventory QA pass; 2 (BUG-8, BUG-9) explicitly downgraded to deferred/best-effort by contract revision 2, not regressions.

- **BUG-1 (dashboard 500)**: fixed — `prisma.raw()` misuse and invalid `InventoryStock` field references removed from `getInventoryDashboardEnhanced()`; pending-inwards count and total inventory value now computed in JS. Dashboard load failures now surface via toast instead of a silent `console.error`.
- **BUG-2 (reserve doesn't reduce stock)**: fixed — `reserveInventoryForSale()` now decrements `InventoryItem.quantity` and shifts `InventoryStock.availableStock`→`reservedStock`.
- **BUG-3 (TRANSFER broken)**: fixed — moves `location_id`/`tray_id`, leaves quantity net-zero, shifts `InventoryStock` totals from source to destination bucket.
- **BUG-4/5/6 (dead stock columns)**: fixed — `damagedStock` now written on DAMAGE transactions, `totalValue` computed on read, `avgCostPrice`/`lastCostPrice`/`sellingPrice` recompute (weighted average) on every inward.
- **BUG-7 (missing validations)**: fixed — `sellingPrice >= costPrice` and `expiryDate > manufactureDate` checks added, both opt-in (only fire when the fields are provided).
- **BUG-8 (race condition)**: contract revised mid-build — Prisma's compound-unique `upsert()` can't target nullable FK columns (neither can a raw-SQL upsert, Postgres treats `NULL <> NULL` in unique constraints too). Reverted to find-then-write; true dedup for null-keyed buckets still possible but not guaranteed, needs a future migration. See KB-015.
- **BUG-9 (inward queue perf)**: deferred, no code change — low data volume currently, fix needs a migration to be worth doing well.

Files touched: `src/backend/services/inventory.service.js`, `src/backend/dto/inventoryDto.js`, `src/pages/Inventory/InventoryMain.jsx`. No Prisma migration. Independently re-verified by reviewer-qa with fresh data on the live `Dev_lens` Docker stack — no regressions found in plain inward/outward/grouping flows. `Dev_lens` stack and its test data are still running/present; stop with `docker compose down` in `Dev_lens/` if no longer needed. KB-014 and KB-015 added for the two reusable Prisma gotchas found.
