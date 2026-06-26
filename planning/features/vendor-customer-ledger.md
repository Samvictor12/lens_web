## Meta

- id: vendor-customer-ledger-v1.0.0
- title: Per-vendor / per-customer subsidiary ledgers with live balance shown on Vendor & Customer forms
- type: bug
- status: DONE
- contract_version: 1
- last_updated: 2026-06-25

## 1 Requirement

**Immediate error (already fixed, no approval needed):** PO receipt was throwing `System ledger AC-1004 not found. Run seed script` because this environment's DB was missing the system Chart-of-Accounts ledgers. Ran the non-destructive `npm run db:seed:ledgers` (`prisma/seed/financial-ledgers-seed.js`, upsert-based) — 20 AC-* ledgers + 7 expense categories now exist. PO receipt should work immediately. (Deliberately did **not** run `npm run seed` / `prisma db seed` — that script truncates all transactional tables including Vendor/Customer/PO/Invoice data and was not appropriate here.)

**Underlying gap (this feature):** Vendor and Customer have no ledger of their own today.
- `accountingService.postPurchaseReceipt()` always credits the single shared `AC-2001 Accounts Payable` ledger, for every vendor.
- `accountingService.postInvoice()` / `postClientPayment()` always debit/credit the single shared `AC-1003 Accounts Receivable` ledger, for every customer.
- There is no way to see what one specific vendor is owed or one specific customer owes — Vendor and Customer forms have no ledger/balance field at all.

**What's wanted:**
1. Every Vendor and every Customer automatically gets its own ledger the moment the record is created — no manual step.
2. That ledger (code + running balance) is shown on the Vendor form and the Customer form.
3. Real postings move to the individual ledger (confirmed direction): PO receipts post against the specific vendor's ledger instead of the shared AC-2001; Invoices/payments post against the specific customer's ledger instead of the shared AC-1003. AC-2001/AC-1003 become parent "control" ledgers that existing reports (Trial Balance, Balance Sheet, etc.) must still reconcile to a single payable/receivable total — exact rollup mechanics (live aggregate query vs. parent balance kept in sync on every child posting) are for the Contract phase to pin down, since it touches `financialReportService.js` in several places that currently read AC-1003/AC-1004/AC-2001 by hardcoded code.
4. Existing vendors/customers created before this change need a one-off backfill so none are left without a ledger.

**Known touch points** (for planner-architect, not locked yet):
- `prisma/schema.prisma`: add `ledgerId` FK on `Vendor` and `Customer`, new child `Ledger` rows with `parentLedgerId` → AC-2001 / AC-1003.
- `src/backend/services/accountingService.js`: `postPurchaseReceipt`, `postVendorPayment` target the vendor's ledger; `postInvoice`, `postClientPayment` target the customer's ledger.
- `src/backend/controllers/vendorMasterController.js`, `customerMasterController.js`: create the child ledger alongside the vendor/customer row (same transaction).
- `src/backend/services/financialReportService.js`: reconcile AC-1003/AC-2001 rollup once postings move off the parent.
- Vendor/Customer React forms (`src/pages/Vendor`, `src/pages/Customer` or wherever the Vendor/Customer master form components live): read-only ledger code + balance display.
- One-off backfill script for existing vendors/customers.

Stop here for approval.

## 2 Contract

### 2.1 Schema changes (`prisma/schema.prisma`)

Add an optional, unique FK on both master tables — optional so the migration is non-destructive for existing rows; tightened to required only after backfill (tracked as a future cleanup, not part of this migration):

```prisma
model Vendor {
  ...
  ledgerId Int?    @unique
  ledger   Ledger? @relation("vendorLedger", fields: [ledgerId], references: [id])
  ...
}

model Customer {
  ...
  ledgerId Int?    @unique
  ledger   Ledger? @relation("customerLedger", fields: [ledgerId], references: [id])
  ...
}

model Ledger {
  ...
  vendor   Vendor?   @relation("vendorLedger")
  customer Customer? @relation("customerLedger")
  ...
}
```

`@unique` enforces a strict 1:1 — no two vendors can share a ledger, no ledger can back two vendors.

**Child ledger code scheme** (deterministic, collision-free, sorts under its parent in any ledgerCode-ordered list):
- Vendor child: `AC-2001-V{vendorId}` e.g. `AC-2001-V42`
- Customer child: `AC-1003-C{customerId}` e.g. `AC-1003-C17`

`{vendorId}`/`{customerId}` is the autoincrement PK, known only after the Vendor/Customer row exists — see §2.2 for the two-step create that resolves this without a chicken-and-egg problem.

**Child ledger field values:**
- `ledgerName`: `"{name} (Vendor AP)"` / `"{name} (Customer AR)"` — truncate `name` if needed to stay under reasonable length.
- `ledgerType`: `LIABILITY` for vendor child (matches parent AC-2001), `ASSET` for customer child (matches parent AC-1003).
- `parentLedgerId`: id of AC-2001 (vendor) / AC-1003 (customer).
- `isSystemLedger`: `false` (these are per-record, deletable only via vendor/customer soft-delete cascade rules — no new cascade behavior added here).
- `openingBalance` / `currentBalance`: `0`.
- `createdBy`: same `createdBy` passed for the Vendor/Customer row (the user performing the create), not a hardcoded system user.

**Migration plan (non-destructive, two-step):**
1. `npx prisma migrate dev --name add_vendor_customer_ledger_fk` — adds nullable `ledgerId` column + unique index + FK constraint to both `Vendor` and `Customer`. No data touched, no existing row invalidated.
2. Run `prisma/seed/backfill-vendor-customer-ledgers.js` (§2.5) to populate `ledgerId` for every pre-existing row.
3. Do **not** tighten `ledgerId` to non-null in this feature — leaving it optional keeps the column backward-compatible for any out-of-band inserts (e.g. raw SQL import) and avoids a destructive `NOT NULL` migration. Posting code (§2.3) treats a null `ledgerId` as a hard failure at write time instead, which is the enforcement point that matters.

### 2.2 Ledger creation on vendor/customer create

Both `VendorMasterService.createVendorMaster()` and `CustomerMasterService.createCustomerMaster()` change from a single `prisma.vendor.create(...)` / `prisma.customer.create(...)` call to a `prisma.$transaction(async (tx) => { ... })` block:

1. Inside the transaction, create the Vendor/Customer row first **without** `ledgerId` (it doesn't exist yet).
2. Resolve the parent ledger via `tx.ledger.findFirst({ where: { ledgerCode: 'AC-2001' / 'AC-1003', delete_status: false } })`. If not found, throw `APIError('System ledger AC-2001 not found. Run npm run db:seed:ledgers.', 500, 'LEDGER_NOT_FOUND')` — same pattern as `accountingService.getLedger()`, so vendor/customer creation fails loud instead of silently skipping the ledger.
3. Create the child `Ledger` row using the now-known vendor/customer `id` to build the code (`AC-2001-V{id}` / `AC-1003-C{id}`), with `parentLedgerId` set to the parent's id and `createdBy` set to the same `createdBy` as the vendor/customer.
4. `tx.vendor.update({ where: { id }, data: { ledgerId: ledger.id } })` (or `tx.customer.update(...)`) to link it back.
5. Return the vendor/customer re-fetched with `include: { ledger: true, ...existing includes }` so the controller's response already carries the ledger.

This keeps vendor/customer + ledger creation atomic — if ledger creation fails, the vendor/customer insert rolls back too, so there is never a vendor/customer left without a ledger after this feature ships (the only ledger-less rows are pre-existing ones, handled by backfill).

### 2.3 Posting changes (`src/backend/services/accountingService.js`)

New helper, added near `getLedger`:

```js
async function getOwnedLedger(tx, owner, label) {
  // owner = vendor or customer row (must include ledgerId)
  if (!owner.ledgerId) {
    throw new APIError(
      `${label} ${owner.code || owner.id} has no ledger. Run backfill-vendor-customer-ledgers.js.`,
      500,
      'LEDGER_NOT_FOUND'
    );
  }
  const ledger = await tx.ledger.findUnique({ where: { id: owner.ledgerId } });
  if (!ledger) throw new APIError(`Ledger id ${owner.ledgerId} not found for ${label} ${owner.code || owner.id}`, 500, 'LEDGER_NOT_FOUND');
  return ledger;
}
```

No silent fallback to AC-2001/AC-1003 — a missing `ledgerId` is always a hard `APIError`, surfaced to the caller, matching the existing `getLedger()` fail-loud convention.

Signature changes (all add a `vendor`/`customer` row — or just the resolved ledger — to the params the caller already has on hand from its own DB fetch):

- `postPurchaseReceipt(tx, { purchaseOrderId, poNumber, subtotal, taxAmount, totalValue, vendor }, userId)` — caller passes the `vendor` row (must include `ledgerId`, e.g. fetched via `tx.purchaseOrder.findUnique({ ..., include: { vendor: true } })` or already on hand). Replaces `getLedger(tx, 'AC-2001')` with `getOwnedLedger(tx, vendor, 'Vendor')`.
- `postVendorPayment(tx, { voucherId, voucherNumber, totalAmount, bankLedgerId, vendor }, userId)` — same pattern, replaces `getLedger(tx, 'AC-2001')`.
- `postInvoice(tx, { invoiceId, invoiceNo, totalAmount, taxAmount, customer }, userId)` — replaces `getLedger(tx, 'AC-1003')` with `getOwnedLedger(tx, customer, 'Customer')`.
- `postClientPayment(tx, { invoiceId, invoiceNo, amount, bankLedgerId, customer }, userId)` — same pattern, replaces `getLedger(tx, 'AC-1003')`.

Callers of these four functions (in `purchaseOrderService`/`invoiceService`/payment controllers — exact files to be located in Build phase) must be updated to fetch and pass the `vendor`/`customer` row (with `ledgerId`) alongside the data they already pass. AC-2001/AC-1003 are no longer read by these four functions at all; they remain valid standalone ledgers only for direct journal entries (`postExpense`, manual postings) and as the parent in the rollup below.

### 2.4 Parent rollup strategy — Option (a): live-sync parent balance on every child posting

**Decision: (a)** — `postTransaction()` (the shared low-level poster) also updates the parent ledger's `currentBalance` whenever it posts to a child ledger that has a non-null `parentLedgerId`. This keeps AC-2001/AC-1003's `currentBalance` always equal to the sum of their children in real time, in the same DB transaction as the child update — no read-time aggregation, no risk of report drift.

**Why (a) over (b):** `financialReportService.js`'s `getSummary()` (line ~284-285) reads `arLedger.currentBalance` / `apLedger.currentBalance` directly with zero awareness of children — changing that to a live `sum(children) + own balance` query would require touching every report function that ever reads a parent ledger's balance, including future ones, and risks silent drift if a new report is added without the rollup logic. Pushing the rollup into `postTransaction()` means every current and future report that reads AC-2001/AC-1003 (by code or by id) gets the correct rolled-up number for free, with **zero changes needed in `financialReportService.js`**.

**Implementation in `accountingService.js postTransaction()`:** in the existing "Update ledger running balances" loop (lines 107-113), after updating `entry.ledgerId`'s balance, check if that ledger has a `parentLedgerId`. If so, apply the same `calculateNewBalance()` delta to the parent using the parent's own `ledgerType` (LIABILITY for AC-2001, ASSET for AC-1003 — same type as the child by construction, so the same debit/credit sign rules apply identically):

```js
for (const entry of txn.entries) {
  const ledger = await tx.ledger.findUnique({ where: { id: entry.ledgerId } });
  if (!ledger) throw new APIError(`Ledger id ${entry.ledgerId} not found`, 500, 'LEDGER_NOT_FOUND');
  const newBalance = calculateNewBalance(ledger.ledgerType, ledger.currentBalance, entry.entryType, entry.amount);
  await tx.ledger.update({ where: { id: entry.ledgerId }, data: { currentBalance: newBalance } });

  if (ledger.parentLedgerId) {
    const parent = await tx.ledger.findUnique({ where: { id: ledger.parentLedgerId } });
    if (parent) {
      const parentNewBalance = calculateNewBalance(parent.ledgerType, parent.currentBalance, entry.entryType, entry.amount);
      await tx.ledger.update({ where: { id: parent.id }, data: { currentBalance: parentNewBalance } });
    }
  }
}
```

This is generic (works for any future parent/child ledger, not just AC-2001/AC-1003) and additive — it does not change `postTransaction()`'s signature or any existing caller.

**`financialReportService.js` impact: zero functional changes.** Specifically verified against the file as it stands today:
- `getSummary()` (lines 256-285): `arLedger.currentBalance` / `apLedger.currentBalance` already reflect the live rollup once (a) ships — no edit needed.
- `getTrialBalance()` (lines 166-203): iterates **all** ledgers including the new vendor/customer children (each child has its own `TransactionEntry` rows once postings move to it) — Dr/Cr totals still balance because double-entry is preserved per-transaction; AC-2001/AC-1003 rows show their rolled-up totals, child ledger rows show their own. No edit needed.
- `getProfitLoss()` (lines 28-116): only reads `INCOME`/`EXPENSE` ledger types — vendor/customer children are ASSET/LIABILITY, never included. No edit needed.
- `getLedgerStatement()` / `getCashBankBook()` (lines 120-162, 246-249): take an explicit `ledgerId` — works unchanged whether that id is AC-2001 itself or one of its new children (statement for a specific vendor's ledger becomes possible by passing the child's id, a bonus capability, not a required change).

No line in `financialReportService.js` is modified by this feature.

### 2.5 Backfill script

New file: `prisma/seed/backfill-vendor-customer-ledgers.js`, modeled on `financial-ledgers-seed.js`'s upsert-safe style:

- Exports `backfillVendorCustomerLedgers(client = prisma)` + a `main()` direct-run guard identical in shape to `financial-ledgers-seed.js`.
- Loads `AC-2001` and `AC-1003` once via `findFirst`. If either is missing, throws (operator must run `npm run db:seed:ledgers` first).
- `for (const vendor of await client.vendor.findMany({ where: { ledgerId: null, delete_status: false } }))`: creates the child `Ledger` (code `AC-2001-V{vendor.id}`, `parentLedgerId` = AC-2001.id, `ledgerType: 'LIABILITY'`, `createdBy: vendor.createdBy`), then `client.vendor.update({ where: { id: vendor.id }, data: { ledgerId: newLedger.id } })`. Wrapped in `client.$transaction([...])` per vendor row.
- Same loop for `client.customer.findMany({ where: { ledgerId: null, delete_status: false } })` → AC-1003 / `ASSET` / `AC-1003-C{customer.id}`.
- Idempotent / safe to re-run: the `where: { ledgerId: null }` filter means a second run is a no-op (touches 0 rows) once backfill is complete. Does not touch `delete_status: true` (soft-deleted) vendors/customers, any transaction table, or any other model.
- Add npm script `"db:backfill:vendor-customer-ledgers": "node prisma/seed/backfill-vendor-customer-ledgers.js"` to `package.json` (mirrors the existing `db:seed:ledgers` pattern) — exact script name to confirm against current `package.json` conventions in Build phase.

### 2.6 Frontend contract

- **Vendor**: `src/pages/Vendor/VendorForm.jsx` gains a new read-only "Ledger" card/section (placed after the existing form card, shown only when `mode === 'view'` or `mode === 'edit'` and `id` is present — never on `add` since the ledger doesn't exist until after save) displaying Ledger Code and Current Balance.
  - Backend: `VendorMasterService.getVendorMasterById()` (`src/backend/services/vendorMasterService.js` ~line 199-209) adds `ledger: { select: { id: true, ledgerCode: true, ledgerName: true, currentBalance: true } }` to its `include`.
  - Frontend mapping: `src/services/vendor.js` `mapFromBackend()` adds `ledgerCode: backendData.ledger?.ledgerCode || null` and `ledgerBalance: backendData.ledger?.currentBalance ?? null` to its returned object; `VendorForm.jsx`'s `fetchVendor()` reads `vendor.ledgerCode` / `vendor.ledgerBalance` into a small piece of local display state (not part of the editable `formData`, since it's never submitted back).
- **Customer**: same pattern — `src/pages/Customer/CustomerForm.jsx` read-only "Ledger" section; `CustomerMasterService.getCustomerMasterById()` (`src/backend/services/customerMaster.service.js` ~line 228+) adds the same `ledger` include; `src/services/customer.js` `mapFromBackend()` adds `ledgerCode` / `ledgerBalance`.
- No route changes in `vendorMaster.routes.js` / `customerMaster.routes.js` — `GET /api/vendor-master/:id` and `GET /api/customer-master/:id` carry the new field via the existing endpoint, confirmed by reading both route files (no new route needed).
- List/dropdown endpoints (`getVendorMasters`, `getVendorDropdown`, etc.) are **not** changed — ledger display is a detail-view-only concern per the requirement.

### 2.7 File touch-list (Build phase)

**Schema / DB:**
- `prisma/schema.prisma` — add `ledgerId`/`ledger` to `Vendor`, `Customer`; add `vendor`/`customer` back-relations to `Ledger`.
- New Prisma migration folder under `prisma/migrations/` (generated by `prisma migrate dev`).
- `prisma/seed/backfill-vendor-customer-ledgers.js` (new file).
- `package.json` — add `db:backfill:vendor-customer-ledgers` script.

**Backend services:**
- `src/backend/services/vendorMasterService.js` — `createVendorMaster()` → `$transaction`; `getVendorMasterById()` → add `ledger` include.
- `src/backend/services/customerMaster.service.js` — `createCustomerMaster()` → `$transaction`; `getCustomerMasterById()` → add `ledger` include.
- `src/backend/services/accountingService.js` — add `getOwnedLedger()`; update `postPurchaseReceipt`, `postVendorPayment`, `postInvoice`, `postClientPayment` signatures; update `postTransaction()`'s balance-update loop for parent rollup.
- Callers of the four updated `accountingService` functions (locate exact files in Build phase — likely `purchaseOrderService.js`/`purchaseOrderController.js` for receipts, `invoiceService.js`/`invoiceController.js` for invoices, `vendorPaymentVoucherService.js`/controller for vendor payments, a client-payment service/controller for receipts) — pass `vendor`/`customer` row through.

**Frontend:**
- `src/pages/Vendor/VendorForm.jsx` — read-only Ledger section.
- `src/pages/Customer/CustomerForm.jsx` — read-only Ledger section.
- `src/services/vendor.js` — `mapFromBackend()` adds `ledgerCode`/`ledgerBalance`.
- `src/services/customer.js` — `mapFromBackend()` adds `ledgerCode`/`ledgerBalance`.

**Not touched:**
- `src/backend/services/financialReportService.js` (per §2.4).
- `src/backend/routes/vendorMaster.routes.js`, `src/backend/routes/customerMaster.routes.js` (per §2.6).
- `prisma/seed/financial-ledgers-seed.js` (system ledgers unaffected, still the source of AC-2001/AC-1003 as parents).

## 3 Test plan

**Path corrections vs. contract's guesses:** none needed — every guessed path was already correct: `src/backend/services/vendorMasterService.js`, `src/backend/services/customerMaster.service.js`, `src/services/vendor.js`, `src/services/customer.js`, `src/pages/Vendor/VendorForm.jsx`, `src/pages/Customer/CustomerForm.jsx` all matched the live codebase exactly. Callers of the 4 posting functions were confirmed at `src/backend/services/purchaseOrderService.js` (`receivePurchaseOrder()`), `src/backend/services/invoiceService.js` (`createInvoice()` and `recordPayment()`), and `src/backend/services/vendorPaymentService.js` (`create()`).

**What was built:**
1. **Schema** — `Vendor.ledgerId`/`ledger`, `Customer.ledgerId`/`ledger`, `Ledger.vendor`/`Ledger.customer` back-relations added to `prisma/schema.prisma`. Migration `prisma/migrations/20260625120747_add_vendor_customer_ledger_fk/migration.sql` created (the environment is non-interactive so `prisma migrate dev` couldn't run directly — generated the SQL via `prisma migrate diff` instead, hand-placed it in a timestamped migration folder, then applied with `prisma migrate deploy`; verified it's byte-for-byte what `migrate dev` would have produced — nullable column, unique index, FK with `ON DELETE SET NULL`). `npx prisma generate` run (had to stop the running `node ./src/backend/server.js` dev process first — it held a file lock on the query engine binary; nodemon auto-restarted it afterward).
2. **Ledger creation on create** — `VendorMasterService.createVendorMaster()` and `CustomerMasterService.createCustomerMaster()` now wrap the row creation + parent-ledger lookup + child-ledger creation + back-link update + re-fetch in `prisma.$transaction()`, exactly per §2.2. `getVendorMasterById()` / `getCustomerMasterById()` now include `ledger: { select: { id, ledgerCode, ledgerName, currentBalance } }`.
3. **Posting changes** — `getOwnedLedger(tx, owner, label)` added to `accountingService.js` verbatim per §2.3. `postPurchaseReceipt`, `postVendorPayment` take a `vendor` param; `postInvoice`, `postClientPayment` take a `customer` param. Callers updated: `purchaseOrderService.receivePurchaseOrder()` now includes `vendor: { select: { id, code, ledgerId } }` on its PO fetch and passes `po.vendor`; `vendorPaymentService.create()` fetches the vendor row and passes it; `invoiceService.createInvoice()` fetches the customer row and passes it; `invoiceService.recordPayment()` now includes `customer: { select: { id, code, ledgerId } }` on its invoice fetch and passes `invoice.customer`.
4. **Parent rollup** — `postTransaction()`'s balance-update loop updates the parent ledger's `currentBalance` too when `ledger.parentLedgerId` is set, exact code block from §2.4.
5. **Backfill** — `prisma/seed/backfill-vendor-customer-ledgers.js` created, modeled on `financial-ledgers-seed.js` (upsert-safe style, `main()` direct-run guard, same console.log conventions). npm script `db:backfill:vendor-customer-ledgers` added to `package.json` next to `db:seed:ledgers`.
6. **Frontend** — `VendorForm.jsx` / `CustomerForm.jsx` each gained a read-only "Ledger" `Card` (Ledger Code + Current Balance via `FormInput` with `disabled`/`readOnly`, matching the existing card/section pattern), rendered only when `mode !== "add" && id && ledgerInfo`. `src/services/vendor.js` and `src/services/customer.js` `mapFromBackend()` add `ledgerCode` / `ledgerBalance`.

**Migration + backfill execution (dev DB):**
- `npx prisma migrate deploy` — applied cleanly, 33 → 34 migrations, no errors.
- `npm run db:backfill:vendor-customer-ledgers` — ran successfully: created 1 vendor ledger (`AC-2001-V1` for vendor "Sam") and 1 customer ledger (`AC-1003-C1` for customer "ABBAS OPTICALS"), the only two pre-existing rows in this dev DB. Re-ran a second time to confirm idempotency — 0/0 created, no errors. Verified via direct query that `Vendor.ledgerId` / `Customer.ledgerId` now point at the new `Ledger` rows with the correct `ledgerCode` and `parentLedgerId` pointing at AC-2001 (id 6) / AC-1003 (id 3) respectively.
- `npm run db:seed:ledgers` was **not** re-run in this session (already run in a prior session per `## 1 Requirement`); confirmed AC-2001/AC-1003 already existed and were found by both the create-time lookup and the backfill script.

**Manual verification steps:**
1. `POST /api/vendor-master` with a new vendor payload → confirm response includes `ledger: { ledgerCode: "AC-2001-V{newId}", currentBalance: "0", ... }`; confirm a `Ledger` row exists with that code and `parentLedgerId` = AC-2001's id.
2. `GET /api/vendor-master/:id` for that vendor → confirm `ledger` object present in response; open the Vendor form in `view` mode → confirm the "Ledger" card shows the code and ₹0.00 balance.
3. Receive a PO for that vendor (`PUT /api/purchase-orders/:id/receive` or equivalent) → confirm the vendor's own ledger balance increases (not the shared AC-2001), and that AC-2001's `currentBalance` also increases by the same amount (parent rollup).
4. Repeat steps 1–3 for Customer with an Invoice (`POST /api/invoices`) and a payment (`POST /api/invoices/:id/payments`), confirming `AC-1003-C{id}` and AC-1003 rollup.
5. Confirm Vendor/Customer "add" mode shows no Ledger card (ledger doesn't exist pre-save).

**Tests:** `src/backend/__tests__/accounting/accountingService.test.js` updated — `postInvoice`, `postClientPayment`, `postVendorPayment` test blocks now pass a `customer`/`vendor` object (`{ id, code, ledgerId }`) and mock `tx.ledger.findUnique` for that `ledgerId` instead of relying solely on `tx.ledger.findFirst` by code, matching the new `getOwnedLedger` lookup path. `src/backend/__tests__/accounting/ledgerService.test.js` needed no changes (no dependency on the 4 changed functions). Ran `npm run test:accounting` — all 45 tests pass. `npm run lint` is broken project-wide on a pre-existing flat-config/`extends` issue unrelated to this change (confirmed by running it on `main` before editing); ran `node --check` on every changed backend `.js` file instead — all syntax-valid.

**Rework (post-QA-FAIL fix):**
- **Bug fix** — `src/backend/services/financialReportService.js` `getSummary()`'s `bankLedgers` query (the dashboard "bank balances" list) excluded the AC-1003 parent by literal `ledgerCode`, but the new `AC-1003-C{id}` customer child ledgers (also `ledgerType: ASSET`) passed straight through and would have shown up as fake "bank accounts" once any invoice/payment posted a non-zero balance. Fixed by adding `parentLedgerId: null` to the where-clause (more robust than code pattern-matching, and future-proofs against any other parent/child pair). Re-verified directly against the dev DB with a throwaway script: the old filter returned `AC-1003-C1 "ABBAS OPTICALS (Customer AR)"` alongside the genuine `AC-1001`/`AC-1002` rows; the new filter returns only `AC-1001`/`AC-1002`. Checked the rest of `getSummary()` for a second instance of the same `ledgerType` + `ledgerCode not-in-list` shape (e.g. on the liability/AP side) — none exists; `totalReceivable`/`totalPayable` read `arLedger`/`apLedger` via exact-code `findFirst`, which was never affected.
- **Test-coverage gap closed** — added two new `postTransaction()` test cases in `accountingService.test.js`: one posts to a child ledger with `parentLedgerId` set and asserts `tx.ledger.update` is called for both the child (own balance math) and the parent (rolled-up balance math, using the parent's own `ledgerType` per contract §2.4), and a control case confirming no extra rollup call happens when `parentLedgerId` is null. `npm run test:accounting` now passes **47/47** (45 prior + 2 new).

## 4 Test results (retest after rework)

- result: PASS
- rework_tag: —
- next: ready for delivery note.

**Retest scope:** re-verified the fix described in `## 3`'s "Rework" subsection; did not re-check items already confirmed in the prior FAIL pass (schema, migration, backfill idempotency, posting-function callers, frontend conditionals — see findings below, retained for record).

**Fix confirmed (financialReportService.js `getSummary()`):** read the live file — `bankLedgers` where-clause at lines 260-266 now includes `parentLedgerId: null` alongside the original `ledgerType: 'ASSET'` / `delete_status: false` / `ledgerCode not-in` filters. Re-ran the exact same query against the dev DB with a fresh throwaway script (deleted after use): new filter returns only `AC-1001 "Cash in Hand"` and `AC-1002 "Bank Account (HDFC)"` — `AC-1003-C1` is now correctly excluded. Confirmed both `AC-1001` and `AC-1002` have `parentLedgerId: null` in the DB, so the fix does not affect them — no regression for genuine bank ledgers.

**Checked for a second leak pattern myself (not just accepting implementer's claim):** read the full `financialReportService.js` again. `getTrialBalance()` (line 169) intentionally includes all ledgers regardless of parent/child — correct by design (a trial balance must list every ledger). `getProfitLoss()` only queries `ledgerType: { in: ['INCOME','EXPENSE'] }` (line 33) — the only two child ledgers that exist (`AC-1003-C1` ASSET, `AC-2001-V1` LIABILITY) can never match that filter, so no leak there either. No other `findMany`-over-ledgers call in the file combines a `ledgerType` filter with a `ledgerCode not-in` exclusion list the way the buggy `bankLedgers` query did — confirmed via grep across the whole file. `totalReceivable`/`totalPayable` (lines 257-258, 289-290) read `arLedger`/`apLedger` via exact-code `findFirst`, unaffected by either the bug or the fix.

**New test coverage verified meaningful, not no-ops:** read both new test cases in `accountingService.test.js`. `'rolls up the parent ledger balance when the posted ledger has a parentLedgerId'` (line 210) sets a child ledger with `parentLedgerId: 10` and non-zero starting balances (child 500, parent 2000), posts a DEBIT 5000 entry, and asserts `tx.ledger.update` was called with the exact computed balances (child → 5500, parent → 7000) plus an exact total call count of 3 — this would fail if the rollup branch were missing, mis-wired, or used the wrong ledger's `ledgerType`. `'does not attempt a parent rollup when parentLedgerId is null'` (line 244) asserts exactly 2 update calls (not 3) as a negative control. Both are real assertions tied to actual arithmetic, not tautologies.

**Test run:** executed `npm run test:accounting` myself — real output: **47/47 tests passed** (2 test files), including the 2 new rollup tests by name in the output.

**Retained from prior FAIL pass (already independently verified then, unaffected by this rework):** schema/migration correctness, DB state (vendor/customer ledgerId linkage, parentLedgerId correctness), backfill idempotency (re-run produces 0/0), `getOwnedLedger()` and all 4 posting-function signatures, atomic fail-loud vendor/customer creation, all 4 real call sites passing `ledgerId`-inclusive rows, and the Vendor/CustomerForm `mode !== "add" && id && ledgerInfo` conditional. See below for the full original findings.

**Independently verified (confirmed correct, not just claimed):**
- Schema: `prisma/schema.prisma` lines 234-235 (`Customer.ledgerId`/`ledger`), 269-270 (`Vendor.ledgerId`/`ledger`), 1379-1380 (`Ledger.vendor`/`Ledger.customer`) — exact match to contract §2.1 (nullable, `@unique`).
- Migration `prisma/migrations/20260625120747_add_vendor_customer_ledger_fk/migration.sql` — nullable columns, unique indexes, FKs with `ON DELETE SET NULL ON UPDATE CASCADE`, no data touched. Matches contract.
- DB state (read-only query via temp script, deleted after use): `AC-2001` id 6, `AC-1003` id 3 exist. Vendor "Sam" (id 1) → `ledgerId` 21 → ledger `AC-2001-V1`, `parentLedgerId` 6. Customer "ABBAS OPTICALS" (id 1) → `ledgerId` 22 → ledger `AC-1003-C1`, `parentLedgerId` 3. Zero ledgerless active vendors/customers.
- Backfill idempotency: ran `npm run db:backfill:vendor-customer-ledgers` myself — output `0 vendor ledger(s) created` / `0 customer ledger(s) created`, confirming re-run is a true no-op. `backfill-vendor-customer-ledgers.js` only touches `Ledger`/`Vendor`/`Customer` models — confirmed by reading the full file.
- `accountingService.js`: `getOwnedLedger()` (lines 51-63) matches contract verbatim. `postPurchaseReceipt`/`postVendorPayment`/`postInvoice`/`postClientPayment` (lines 148, 233, 178, 210) all call `getOwnedLedger(tx, vendor/customer, label)` instead of `getLedger(tx, 'AC-2001'/'AC-1003')` — grepped the file myself, no leftover hardcoded AC-2001/AC-1003 lookups in these four functions. `postTransaction()`'s balance loop (lines 124-137) updates the parent ledger using **the parent's own** `ledgerType` (line 133: `calculateNewBalance(parent.ledgerType, ...)`), matching contract §2.4 exactly — note this means if a child's `ledgerType` is ever hand-edited to diverge from its parent's, the rollup sign would still follow the parent (correct per spec, but no validation prevents the divergence — low risk, no current path creates it).
- `vendorMasterService.createVendorMaster()` (lines 45-111) and `customerMaster.service.js createCustomerMaster()` (lines 47-128): both genuinely atomic via `prisma.$transaction()`, both throw `APIError('System ledger AC-2001/AC-1003 not found...')` inside the transaction if the parent is missing (causes rollback — verified the throw is inside the `tx` callback, not after), both `getById` methods include `ledger` (vendor: select id/ledgerCode/ledgerName/currentBalance at line 249; customer: same pattern confirmed at ~line 273-280).
- Callers of the 4 posting functions — grepped independently (not trusting the implementer's list): `purchaseOrderService.js` `receivePurchaseOrder()` line 1333, fetches `vendor: { select: { id, code, ledgerId } }` at line 1261, passes `po.vendor` at line 1339. `vendorPaymentService.js` `create()` line 155, fetches vendor with `select: { id, code, ledgerId }` at line 127. `invoiceService.js` `createInvoice()` line 126 fetches `customer` with `ledgerId` at line 83; `recordPayment()` line 286 fetches `customer: { select: { id, code, ledgerId } }` at line 229. No caller found passing `vendor`/`customer` without `ledgerId`, and no stale 2-arg-shorter callers remain (full-repo grep for the 4 function names returned only these call sites + the test file).
- Frontend: `VendorForm.jsx` line 617 / `CustomerForm.jsx` line 708 — conditional is exactly `mode !== "add" && id && ledgerInfo`, and `ledgerInfo` is only populated when `id && (mode === "view" || mode === "edit")` (line 55 / 71) — never in add mode, confirmed by reading the actual JSX, not the test-plan prose. `src/services/vendor.js` (lines 48-49) and `src/services/customer.js` (lines 65-66) `mapFromBackend()` both add `ledgerCode`/`ledgerBalance` exactly as specified.
- Tests: ran `npm run test:accounting` myself — real output shows **45/45 tests pass**, 2 test files (`ledgerService.test.js`, `accountingService.test.js`). Confirms the implementer's claim.

**Bug found — regression in `financialReportService.js` despite contract's "zero functional changes" claim (REWORK_BACKEND):**
`getSummary()` (`src/backend/services/financialReportService.js` lines 260-263) builds its dashboard "bank balances" list with:
```js
const bankLedgers = await prisma.ledger.findMany({
  where: { ledgerType: 'ASSET', delete_status: false, ledgerCode: { not: { in: ['AC-1003', 'AC-1004', 'AC-1005'] } } },
  ...
});
```
This excludes the parent `AC-1003` by exact code, but the new customer child ledgers (`AC-1003-C{id}`, also `ledgerType: ASSET`, created by this feature) are not excluded — they pass the `ledgerCode not in [...]` filter and the `ledgerType: 'ASSET'` filter. I reproduced this directly: querying with the real production filter against the dev DB returned `AC-1003-C1 "ABBAS OPTICALS (Customer AR)"` alongside the genuine `AC-1001 Cash in Hand` / `AC-1002 Bank Account (HDFC)` rows. Today the balance is 0 so it's invisible, but as soon as one invoice or customer payment posts (which this feature enables), that customer's AR sub-ledger balance will appear in the dashboard's `bankBalances` array as if it were a bank account — wrong UI surface, and it will grow without bound as more customers transact. This directly contradicts contract §2.4's claim that `getSummary()` needs zero changes — that section only checked `arLedger.currentBalance`/`apLedger.currentBalance` reads, not the `bankLedgers` query a few lines below in the same function, which the contract author missed. Fix: add `parentLedgerId: null` (or exclude `ledgerCode: { startsWith }` patterns, but `parentLedgerId: null` is more robust) to the `bankLedgers` where-clause.

**Test-coverage gap (contributing factor — not blocking alone, but worth fixing alongside the bug):**
No test in `accountingService.test.js` exercises the parent-rollup branch (`if (ledger.parentLedgerId)`, lines 130-136 of `accountingService.js`) — every `makeLedger()` fixture omits `parentLedgerId`, so it's always `undefined` and the branch is never taken in any of the 45 passing tests. This is the single most novel piece of logic the contract added (§2.4) and it has zero direct test coverage; the bug above would likely have been caught at code-review time if a test had asserted the parent's `currentBalance` after a child posting. Recommend adding a `postTransaction()` test case with a child ledger that has `parentLedgerId` set, asserting `tx.ledger.update` is called for both child and parent.

**Not investigated as bugs (confirmed fine):** `getTrialBalance()` (iterates all ledgers including children — both show correct independent Dr/Cr, no double counting since each transaction entry only posts to the child's `ledgerId`, the parent sync is a separate same-tx update to a different row) and `getProfitLoss()` (only reads INCOME/EXPENSE ledger types, vendor/customer children are ASSET/LIABILITY — never included) hold up as claimed; `getLedgerStatement()`/`getCashBankBook()` take explicit `ledgerId` and are unaffected. No `VendorPaymentVoucher`-named service exists separately from `vendorPaymentService.js`, which was already checked above.

## 5 Delivery note

Shipped: every Vendor and Customer now gets its own subsidiary ledger (`AC-2001-V{id}` / `AC-1003-C{id}`) created atomically at record-creation time, with a read-only Ledger card (code + balance) on both forms. Real postings — PO receipts, vendor payments, invoices, client payments — now hit the specific vendor's/customer's ledger instead of the shared `AC-2001`/`AC-1003`; those two ledgers stay live-synced as parent rollups inside `postTransaction()`, so existing reports needed zero changes except one fix below.

Immediate trigger (PO receipt `LEDGER_NOT_FOUND: AC-1004`) was a missing-seed issue, fixed by running `npm run db:seed:ledgers` — unrelated to the schema work, already resolved before the Contract phase started.

QA caught one real regression in the first pass: `financialReportService.js getSummary()`'s dashboard `bankLedgers` query excluded the AC-1003/AC-1004/AC-1005 parents by literal code but not the new ASSET-type customer child ledgers, which would have shown a customer's AR balance as a fake "bank account" once invoices posted. Fixed with `parentLedgerId: null` in that filter; retest confirmed clean plus closed a test-coverage gap (2 new `postTransaction()` rollup tests, 47/47 passing total).

Existing vendor/customer rows backfilled via `prisma/seed/backfill-vendor-customer-ledgers.js` (idempotent, re-runnable). Migration `add_vendor_customer_ledger_fk` applied to dev DB — nullable FK, non-destructive.

Follow-up not in scope: `ledgerId` stays nullable by design (enforcement is at write-time in `getOwnedLedger`/create-time in the controllers, not a DB constraint) — fine for now, revisit only if an out-of-band insert path ever bypasses both.
