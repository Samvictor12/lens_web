# Active Feature Spec

This is the single shared feature document (`planning/feature.md`). Each phase owns exactly one section below.

---

## Requirement

### Feature: Vendor Invoice PO Filter Fix, Income From/To Ledgers, CN/DN Tab Cleanup (2026-07-25)

**Source:** User follow-up after completed Payments/Income bundle.  
**Prior feature:** COMPLETED — this is a new DRAFT.

---

### M1 — Bug: Already-invoiced PO still in Register Vendor Invoice list

**Report:** PO `PO-2026-024` already has a vendor invoice but still appears in the new Register Vendor Invoice PO list.

**Likely cause:** `listEligiblePOs` reuses `PO_PAYMENT_ELIGIBLE_STATUSES`, which includes **`INVOICE_RECEIVED`**. After invoice registration the PO is set to `INVOICE_RECEIVED`. Exclusion relies only on `VendorInvoiceItem` links — if the PO was marked invoiced without a link (legacy payment / supplierInvoiceNo path), or link lookup misses, the PO stays listed.

**Requirement:**
1. Eligible POs for **new** Vendor Invoice must **never** include a PO that already has a non-cancelled `VendorInvoice` (via `VendorInvoiceItem`).
2. Also exclude POs whose status is already **`INVOICE_RECEIVED`** or **`PAID`** (and keep excluding CANCELLED/CLOSED/DRAFT as today).
3. Also exclude POs with a non-empty **`supplierInvoiceNo`** (legacy / Excel invoice mark).
4. Align create guard with the same rules so UI and API cannot disagree.
5. Verify with `PO-2026-024` (or equivalent): after one vendor invoice exists, PO must not appear in the create picker.

---

### M2 — Income: Bank Transfer / capital flows need From + To ledgers

**Current:** Income form has Category + single “Deposit Account” (cash/bank only). Posting is Dr Bank, Cr Income category ledger.

**User need:** When recording **Bank Transfer** (and similar capital/owner flows), choose **From** ledger and **To** ledger. Pickers must include:
- Cash in Hand (`GRP-CASH`)
- Bank Accounts (`GRP-BANK`)
- Capital accounts (`GRP-CAPITAL`) — e.g. Owner’s Capital, Partner accounts — for injecting capital into bank or sharing profit to owner/partner

**Requirement:**
1. On Income create (especially Bank Transfer / capital-style categories), require **From Ledger** and **To Ledger** (distinct).
2. From/To options = posting ledgers under **GRP-CASH**, **GRP-BANK**, and **GRP-CAPITAL** (active, allows direct posting).
3. Posting for these transfer-style incomes: **Dr To, Cr From** (amount), not Dr Bank / Cr Income P&L category — so capital→bank and bank→owner/partner profit share hit balance-sheet correctly.
4. Keep a clear UX: labels **From** / **To**; category still required for classification (Bank Transfer, Loan, etc.).
5. Seed/ensure capital ledgers usable (Owner’s Capital; allow additional partner capital ledgers via Bank Account / COA manage or Capital under same manage pattern if already possible via ledger CRUD).
6. History/detail show From and To ledger names.

**Default assumption:** All income categories use From/To among Cash/Bank/Capital for this redesign (simplest consistent UI). If Loan should stay P&L income (Cr Income ledger), say so on approve — otherwise From/To transfer posting applies to all.

---

### M3 — Notes UI: Customer Credit Note + Vendor Debit Note only

**Requirement:**
1. **Customer Payments:** Keep **Credit Notes** tab only — **remove Debit Notes** tab/UI (and create entry points).
2. **Vendor Payments:** Keep **Debit Notes** tab only — **remove Credit Notes** tab/UI (and create entry points).
3. Prefer hide/disable create APIs for removed types (`Customer Debit Note`, `Vendor Credit Note`) with clear error, or leave API unused but unreachable from UI — default: **UI removed + create endpoints reject** for the two removed types so they cannot be reintroduced casually.
4. Existing historical Customer DN / Vendor CN records: remain in DB; no migration delete. Optional read-only archive out of scope unless requested.

---

### Resolved defaults (edit on approve)

| # | Topic | Default |
|---|--------|---------|
| 1 | Eligible PO exclude | VendorInvoiceItem link **OR** status INVOICE_RECEIVED/PAID **OR** supplierInvoiceNo set |
| 2 | Income posting | From/To among Cash/Bank/Capital; Dr To / Cr From for all income categories |
| 3 | Notes | Customer CN only; Vendor DN only |

---

**Status:** APPROVED — 2026-07-25 (eligible-PO harden; Income From/To Cash/Bank/Capital; Customer CN + Vendor DN tabs only).

---

## Contract

### M1 — Vendor Invoice eligible PO filter harden
- [x] **M1.1** In `src/backend/utils/poPayable.js`, add `PO_VENDOR_INVOICE_ELIGIBLE_STATUSES = ['PO_PARTIAL_RECEIVED', 'RECEIVED']` (do **not** reuse `PO_PAYMENT_ELIGIBLE_STATUSES`, which includes `INVOICE_RECEIVED`). Include `supplierInvoiceNo` in `PO_PAYABLE_SELECT` (or a VI-specific select) so list/create can filter on it.
- [x] **M1.2** Update `listEligiblePOs` in `src/backend/services/vendorInvoiceService.js` so returned POs satisfy **all**: vendor match; `deleteStatus: false`; status ∈ `PO_VENDOR_INVOICE_ELIGIBLE_STATUSES`; **not** linked via `VendorInvoiceItem` to a non-cancelled (`status ≠ CANCELLED`, `deleteStatus: false`) `VendorInvoice`; **and** `supplierInvoiceNo` is null/empty. Effectively exclude status `INVOICE_RECEIVED` / `PAID` (and CANCELLED/CLOSED/DRAFT as today).
- [x] **M1.3** Align `create` guard in `vendorInvoiceService.js` with the same rules as M1.2 (status set, existing non-cancelled `VendorInvoiceItem` link, non-empty `supplierInvoiceNo`) so API rejects what the picker hides; keep clear error codes (`PO_NOT_ELIGIBLE` / `PO_ALREADY_INVOICED` or equivalent).
- [x] **M1.4** No UI change required beyond current `CreateVendorInvoiceDialog.jsx` consuming `GET …/eligible-pos` — verify picker only shows the hardened list (no separate status whitelist on FE).

### M2 — Income From + To ledgers (Cash / Bank / Capital)
- [x] **M2.1** Prisma `Income` model (`prisma/schema.prisma`): add required `fromLedgerId` + `toLedgerId` (FKs to `Ledger`, relations e.g. `incomeFromLedger` / `incomeToLedger`). Keep `bankLedgerId` nullable for historical rows **or** backfill `toLedgerId = bankLedgerId` then drop/deprecate `bankLedgerId` in the same migration — prefer backfill + dual-read during transition; new creates must persist From/To.
- [x] **M2.2** Add Prisma migration under `prisma/migrations/` for M2.1; update `Ledger` reverse relations accordingly.
- [x] **M2.3** Extend ledger picker: add `getCashBankCapitalLedgers()` (or extend `getCashBankLedgers`) in `src/backend/services/ledgerService.js` filtering active, `allowsDirectPosting: true`, `isGroupLedger: false`, groups **`GRP-CASH` | `GRP-BANK` | `GRP-CAPITAL`**. Expose via existing cash-bank route or bank-accounts/income helper (e.g. `GET /api/ledgers/cash-bank-capital` or reuse bank-accounts list with capital included for Income only — document chosen path).
- [x] **M2.4** Change `postIncome` in `src/backend/services/accountingService.js` to **Dr To ledger / Cr From ledger** for amount (all income categories per approved default). Stop Dr bank / Cr income-category P&L ledger. Validate both ledgers exist, allow direct posting, and belong to GRP-CASH/BANK/CAPITAL; reject identical From/To.
- [x] **M2.5** Update `incomeService.create` / list / getById in `src/backend/services/incomeService.js` (+ `incomeController.js` payload): require `fromLedgerId`, `toLedgerId`, `categoryId`, amount, description; From ≠ To; category still required for classification — **relax** `NO_LEDGER` (category `ledger_id` not required for posting). Soft-delete/reverse path unchanged aside from FT still keyed by `INCOME`.
- [x] **M2.6** Ensure capital pickers work: seed already has `AC-5001` Owner’s Capital under `GRP-CAPITAL` (`financial-ledgers-seed.js` / `account-groups-seed.js`). Confirm `allowsDirectPosting: true` for capital posting ledgers used in pickers; partner capital remains creatable via existing Ledger/COA manage (no mandatory Bank Accounts redesign — optional note only if capital create is missing).
- [x] **M2.7** UI — `AddIncomeDialog.jsx` + `Income.constants.js`: replace single “Deposit Account” with required **From** and **To** selects populated from Cash/Bank/Capital ledgers; client-validate distinct; POST `fromLedgerId` / `toLedgerId`.
- [x] **M2.8** UI — `IncomeMain.jsx` + `useIncomeColumns.jsx` (+ detail if any): load transfer ledgers; history columns show **From** and **To** ledger names (replace single “Account” column).

### M3 — Customer CN only / Vendor DN only
- [x] **M3.1** `CustomerPaymentsMain.jsx`: remove Debit Notes `TabsTrigger` + `TabsContent` (and any create entry points for customer DN). Keep Credit Notes tab wired to `CreditDebitNotesTab type="credit"`.
- [x] **M3.2** `VendorPaymentsMain.jsx`: remove Credit Notes `TabsTrigger` + `TabsContent` (and create entry points for vendor CN). Keep Debit Notes tab wired to `VendorCreditDebitNotesTab type="debit"`.
- [x] **M3.3** Reject create APIs: `POST /api/accounting/customer-notes/debit` (`creditDebitNoteController.createDebit` / `creditDebitNoteService.createDebitNote`) returns 4xx with clear message (e.g. customer debit notes disabled). `POST /api/accounting/vendor-notes/credit` (`vendorCreditDebitNoteController.createCredit` / `vendorCreditDebitNoteService.createCreditNote`) likewise rejects. Do **not** delete historical Customer DN / Vendor CN rows; list/get/cancel for legacy data may remain unused by UI.

---

## Test plan

- [x] **TC-M1-01: Eligible list excludes PO with VendorInvoiceItem on non-cancelled invoice**
  - **Test Data:** Vendor V with PO in `RECEIVED`; create Vendor Invoice linking that PO (status OUTSTANDING).
  - **Steps:** `GET /api/accounting/vendor-invoices/eligible-pos?vendorId=V`; open Register Vendor Invoice picker for V.
  - **Expected:** Linked PO absent from API and UI picker.

- [x] **TC-M1-02: Exclude status INVOICE_RECEIVED / PAID even without item link**
  - **Test Data:** PO status `INVOICE_RECEIVED` (and separately `PAID`) with no `VendorInvoiceItem` (legacy mark).
  - **Steps:** Call `listEligiblePOs` for that vendor.
  - **Expected:** Neither PO appears.

- [x] **TC-M1-03: Exclude non-empty supplierInvoiceNo**
  - **Test Data:** PO status `RECEIVED` with `supplierInvoiceNo` set (e.g. Excel/legacy), no VendorInvoiceItem.
  - **Steps:** Call `listEligiblePOs`.
  - **Expected:** PO excluded.

- [x] **TC-M1-04: Create guard matches list (API cannot register excluded PO)**
  - **Test Data:** PO already on non-cancelled VendorInvoice **or** `INVOICE_RECEIVED` **or** non-empty `supplierInvoiceNo`.
  - **Steps:** `POST` Vendor Invoice including that `purchaseOrderId`.
  - **Expected:** 400 with `PO_ALREADY_INVOICED` / `PO_NOT_ELIGIBLE` (or equivalent); no new invoice for that PO.

- [x] **TC-M1-05: Regression — PO-2026-024 style case**
  - **Test Data:** Use `PO-2026-024` (or equivalent already-invoiced PO that previously still listed).
  - **Steps:** Open Register Vendor Invoice for its vendor; confirm eligible-pos response.
  - **Expected:** PO does not appear after one vendor invoice exists (or after status/`supplierInvoiceNo` mark).

- [x] **TC-M1-06: Still-eligible received PO remains selectable**
  - **Test Data:** PO `RECEIVED` or `PO_PARTIAL_RECEIVED`, empty `supplierInvoiceNo`, no non-cancelled VendorInvoiceItem.
  - **Steps:** List eligible POs; register invoice successfully.
  - **Expected:** PO listed; create succeeds; PO then excluded on next list.

- [x] **TC-M2-01: From/To required and must differ**
  - **Test Data:** Valid category (Bank Transfer or Loan); same ledger id for From and To; missing From or To.
  - **Steps:** POST create income with invalid/missing From/To; then with distinct valid ledgers.
  - **Expected:** Validation errors when missing or equal; success when distinct.

- [x] **TC-M2-02: Picker includes Cash, Bank, Capital only**
  - **Test Data:** Seeded AC-1001 (cash), AC-1002 (bank), AC-5001 (Owner’s Capital); non-cash/bank/capital ledger exists.
  - **Steps:** Open Record Income; inspect From/To options (or picker API).
  - **Expected:** Options include GRP-CASH/GRP-BANK/GRP-CAPITAL posting ledgers; exclude AR/AP/income P&L/expense ledgers.

- [x] **TC-M2-03: Posting is Dr To / Cr From (all categories)**
  - **Test Data:** Amount ₹10,000; From = Owner’s Capital; To = Bank; category Bank Transfer (and repeat with Loan).
  - **Steps:** Create income; inspect `FinancialTransaction` / entries for `referenceType: INCOME`.
  - **Expected:** Debit To (Bank) ₹10,000; Credit From (Capital) ₹10,000; **no** credit to income-category P&L ledger.

- [x] **TC-M2-04: History shows From and To names**
  - **Test Data:** Income created per TC-M2-03.
  - **Steps:** Open Income list/history.
  - **Expected:** Columns (or cells) show From and To ledger names; not a single deposit-only account.

- [x] **TC-M2-05: Capital → bank and bank → capital flows**
  - **Test Data:** (A) From Capital → To Bank; (B) From Bank → To Capital (profit share / draw-style).
  - **Steps:** Record both incomes; check ledger balances move on BS accounts only.
  - **Expected:** Both succeed; balances update on From/To ledgers accordingly.

- [x] **TC-M3-01: Customer Payments UI — Credit Notes only**
  - **Test Data:** User with Accounts/Admin access.
  - **Steps:** Open Customer Payments; inspect tabs; try to find Debit Notes create UI.
  - **Expected:** Credit Notes tab present; Debit Notes tab and create entry points gone.

- [x] **TC-M3-02: Vendor Payments UI — Debit Notes only**
  - **Test Data:** Same access.
  - **Steps:** Open Vendor Payments; inspect tabs.
  - **Expected:** Debit Notes tab present; Credit Notes tab and create entry points gone.

- [x] **TC-M3-03: Create APIs reject removed types**
  - **Test Data:** Valid customer/vendor payloads for DN/CN.
  - **Steps:** `POST /api/accounting/customer-notes/debit`; `POST /api/accounting/vendor-notes/credit`.
  - **Expected:** Both rejected with clear 4xx error; no new rows.

- [x] **TC-M3-04: Allowed creates still work; history preserved**
  - **Test Data:** Existing historical Customer DN / Vendor CN if any; new Customer CN + Vendor DN.
  - **Steps:** Create Customer Credit Note and Vendor Debit Note via UI; confirm DB still holds old DN/CN rows.
  - **Expected:** Allowed creates succeed; historical removed-type records remain (no migration delete).

---

## Test results

result: PASS
levels: L1 PASS, L2 PASS, L3 PASS, L4 PASS, L5 PASS

Notes (QA 2026-07-25):
- L1: `prisma validate` OK; Vite build OK; migration `20260725100000_income_from_to_ledgers` SQL applied for local column check (`fromLedgerId`/`toLedgerId` present). Ensure `_prisma_migrations` / deploy path records this migration on shared envs (many older migrations still pending per KB-027 db-push history).
- L2: Income payload `fromLedgerId`/`toLedgerId` ↔ schema; ledger picker `GET /api/ledgers/cash-bank-capital`; VI eligible uses `PO_VENDOR_INVOICE_ELIGIBLE_STATUSES` + `supplierInvoiceNo`.
- L3: Income create requires category/amount/description/From/To + `createdBy`; note create rejects preserve IDs; no DN/CN wipe migration.
- L4: `listEligiblePOs` + create guards aligned (`PO_NOT_ELIGIBLE` / `PO_ALREADY_INVOICED`); smoke: linked `PO-2026-004` excluded; supplierInvoiceNo PO create rejected; income Dr To / Cr From (no P&L credit) for Bank Transfer + Loan; Capital↔Bank both succeed; customer DN / vendor CN → 400 `CUSTOMER_DEBIT_NOTE_DISABLED` / `VENDOR_CREDIT_NOTE_DISABLED`.
- L5: KB-031 array unwrap for cash-bank-capital OK in IncomeMain; KB-034 N/A (no new sidebar module); KB-003 scope limited to M1–M3; no historical note delete.
- TC-M1-05: `PO-2026-024` absent in local DB; equivalent covered via linked VI item + status/`supplierInvoiceNo` exclusions.
- TC-M3-04: UI tabs CN-only / DN-only; allowed `createCreditNote` / `createDebitNote` paths unchanged; DebitNote/VendorCreditNote tables intact.

---

## Delivery note

### Closed: Vendor Invoice PO Filter Fix, Income From/To Ledgers, CN/DN Tab Cleanup (2026-07-25)

**Status:** DONE — QA PASS (L1–L5).

**Shipped:**
1. **M1** — Eligible POs: `PO_PARTIAL_RECEIVED`|`RECEIVED` only; exclude VI links, INVOICE_RECEIVED/PAID, supplierInvoiceNo.
2. **M2** — Income From/To (Cash/Bank/Capital); posting Dr To / Cr From; migration `20260725100000_income_from_to_ledgers`.
3. **M3** — Customer Credit Notes only; Vendor Debit Notes only; create rejects for removed types.

**Docs updated:** `ARCHITECTURE.md`, `DATABASE_ERD.md`, `Modules/Accounting.md`, KB-035.

**Ops:** Apply migration; restart backend + `npx prisma generate` if client DLL was locked.

---

### Closed: Payments Reverse, Vendor Invoice PO Filter, Dispatch Sort, Docs Dia, Income & Bank, CN/DN Behavior (2026-07-25)

**Status:** DONE — QA PASS (L1–L5 after 1 REWORK for M6 role permissions / KB-026→KB-034).

**Shipped:** Cancel→reverse payments; vendor invoice-first pay; dispatch `createdAt` desc; eligible-pos (hardened in follow-up); DIA off prints; Income + Bank Accounts; Customer CN + Vendor DN document-only.

**Docs updated:** `Project_doc.md`, `ARCHITECTURE.md`, `DATABASE_ERD.md`, `Modules/Accounting.md`, `Modules/Sales.md`, KB-034.

---
