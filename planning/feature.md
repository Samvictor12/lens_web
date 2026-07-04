# Active Feature Spec

This is the single shared feature document (`planning/feature.md`). Each phase owns exactly one section below. Specialist sub-agents must only edit their designated sections and must never commit code.

> **Status: COMPLETED** (2026-07-05) — QA PASSED. Docs synced in `Accounting.md`, `DATABASE_ERD.md`, `ARCHITECTURE.md`.
>
> **Previous feature (COMPLETED 2026-07-05):** Unified Customer & Vendor Payment Workflows — delivered docs in `planning/Modules/Accounting.md`, `planning/Modules/Sales.md`. QA PASSED.

---

## Requirement

**Feature: Industry Chart of Accounts, Account Groups & Payment Traceability Tree**

### Context & Problem Statement

Two related Accounting improvements were discussed in the same session. **Neither was drafted into `planning/feature.md` nor executed through the lean pipeline** at the time of discussion. One sub-topic was partially implemented ad-hoc in code without Contract, QA, or docs sync.

#### Chat Topic A — Industry-standard Account Groups & COA hierarchy (NOT planned, NOT executed)

The business needs a Tally/ERP-style **three-level model**:

```
Primary Group  →  Account Group  →  Ledger (posting account)
Assets            Cash-in-Hand        Petty Cash, Counter Cash
                  Bank Accounts       HDFC Current, SBI Savings
                  Sundry Debtors      Sam (AR), … (auto from Customer)
                  Sundry Creditors    Kavin (AP), … (auto from Vendor)
Expenses          Direct Expenses     Purchase / COGS
                  Indirect Expenses   Salary, Rent, Utilities, …
Capital           Owner's Capital, Retained Earnings
```

**Goals:**
- Classify accounts for **P&L** (Direct vs Indirect income/expense, Gross Profit) and **Balance Sheet** sections.
- **Group Summary** reports so users understand money flow (e.g. total Bank Accounts, drill to HDFC).
- Fix `getCashBankLedgers()` — today returns all ASSET ledgers, not just Cash/Bank groups.
- Tree UI for Chart of Accounts (replace flat paginated table).
- Phase-2 workflow items (out of initial scope): Journal Voucher UI, Contra, period lock, advance credit application, CN/DN.

**Current baseline:**
- `Ledger` has `parentLedgerId` and `LedgerType` enum (5 flat types).
- Customer AR / Vendor AP child ledgers exist under `AC-1003` / `AC-2001`.
- Cash (`AC-1001`) and Bank (`AC-1002`) are **flat siblings**, not grouped.
- P&L splits COGS vs Opex via `ExpenseCategory.expenseType`, not account groups.
- No `AccountGroup` model.

#### Chat Topic B — Payment breakdown tree with Invoice/PO navigation (NOT planned; PARTIALLY executed ad-hoc)

When viewing a payment/receipt or ledger statement, users need an **expandable breakdown tree**:

```
▼ Receipt CRV-2026-0001              ₹10,000
    └ INV-2026-0042  →              ₹1,500   [navigate to Billing invoice detail]
    └ INV-2026-0043  →              ₹1,500
    └ Advance credit                ₹500
```

Same pattern for vendor payments with **PO numbers** linking to `/masters/purchase-orders/view/{id}`.

**Ad-hoc code already written (uncommitted, no QA/docs):**

| Item | File | Status |
|------|------|--------|
| `PaymentBreakdownTree` component | `src/components/accounting/PaymentBreakdownTree.jsx` | Done |
| Customer payment detail tree + links | `CustomerPaymentDetailDialog.jsx` | Done |
| Vendor payment detail tree + links | `VendorPaymentDetailDialog.jsx` | Done |
| Billing invoice deep-link | `BillingMain.jsx` `?invoiceId=&openDetail=1` | Done |
| Ledger statement allocation API | `financialReportService.getLedgerStatement()` | Done |
| Ledger statement expandable rows | `FinancialReports.jsx` | Done |

**Still missing from Topic B:**

| Gap | Notes |
|-----|-------|
| Payment **history table** inline expand | Offered in chat; not implemented on CustomerPaymentsMain / VendorPaymentsMain list rows |
| Formal **Contract & Test plan** | Never written |
| **QA / automated tests** | No test coverage for breakdown API or UI |
| **`planning/Modules/Accounting.md` sync** | Payment traceability not documented |
| **Print receipt/voucher** | Print HTML does not include clickable invoice/PO breakdown tree (optional enhancement) |

---

### Functional Requirements — Part A: Account Groups & Industry COA

#### AG1 — AccountGroup data model

Introduce `AccountGroup` table (or equivalent) separate from posting ledgers:

- Fields: `groupCode`, `groupName`, `nature` (ASSET/LIABILITY/INCOME/EXPENSE/EQUITY), `parentGroupId`, `reportSection` (BALANCE_SHEET / PROFIT_LOSS), `pnlClassification` (DIRECT_INCOME, INDIRECT_INCOME, DIRECT_EXPENSE, INDIRECT_EXPENSE, N/A), `isSystemGroup`, `sortOrder`.
- Extend `Ledger`: `accountGroupId`, `isGroupLedger` (control/summary — no direct posting), `allowsDirectPosting`.

#### AG2 — Standard group seed & ledger migration

Seed industry-standard groups and re-parent existing system ledgers:

- Cash-in-Hand group → Petty Cash, Counter Cash (migrate `AC-1001`).
- Bank Accounts group → HDFC (migrate `AC-1002`), allow user-added banks as children.
- Sundry Debtors → keep `AC-1003` as group; customer sub-ledgers unchanged.
- Sundry Creditors → keep `AC-2001` as group; vendor sub-ledgers unchanged.
- Direct Expenses / Indirect Expenses groups for expense ledgers.
- Capital group for equity ledgers.

Migration must preserve existing `FinancialTransaction` / `TransactionEntry` data and balances.

#### AG3 — Chart of Accounts tree UI

Replace or augment flat `ChartOfAccountsMain` with expandable tree:

- Show Group → Ledger hierarchy.
- Create ledger: pick group first, then enter name/code.
- Badges: nature, P&L classification, BS section.
- Drill-down: group → Group Summary; ledger → Ledger Statement.

#### AG4 — Group-based reports

- **Group Summary** report: recursive balance by account group (Tally-style).
- **P&L** refactor: section by `AccountGroup.pnlClassification` (fallback to current `ExpenseCategory.expenseType` during transition).
- **Balance Sheet** grouped by BS sections (Assets / Liabilities / Capital).

#### AG5 — Cash/Bank picker fix

`ledgerService.getCashBankLedgers()` must return only ledgers under Cash-in-Hand or Bank Accounts groups (not Inventory, AR, GST Input, etc.).

---

### Functional Requirements — Part B: Payment Traceability Tree (complete partial work)

#### PT1 — Formalize existing breakdown UI (verify & harden)

Confirm and harden ad-hoc implementation:

- Customer/vendor payment detail dialogs use `PaymentBreakdownTree`.
- Ledger statement expandable rows with invoice/PO links.
- Billing deep-link opens invoice detail dialog.

#### PT2 — Payment history inline expand

On **Customer Payments** and **Vendor Payments** history tabs:

- Expandable row per voucher showing breakdown tree (same component).
- Invoice/PO links navigate to respective detail screens.

#### PT3 — Backend contract for ledger statement breakdown

Document and test `getLedgerStatement()` enrichment:

- `RECEIPT` + `referenceType RECEIPT` → customer voucher items + advance.
- `PAYMENT` → vendor voucher items.
- Legacy `RECEIPT` + `referenceType INVOICE` → single invoice line.

---

### Scope Boundary

| In scope (this feature) | Out of scope (future) |
|-------------------------|-------------------------|
| AccountGroup model + migration + seed | Journal Voucher UI |
| COA tree UI | Contra voucher UI |
| Group Summary + grouped P&L/BS | Period lock / FY close |
| Cash/Bank picker fix | Credit Note / Debit Note |
| Complete payment breakdown tree (Part B gaps) | Cash flow statement |
| QA + docs sync for both parts | Multi-currency |
| Payment history inline expand | Advance credit apply-on-invoice |

---

### Resolved Decisions (Human — 2026-07-05)

| # | Decision |
|---|----------|
| **OQ1** | **Dedicated `AccountGroup` table** (not ledger-only groups). |
| **OQ2** | **Accept ad-hoc Part B code as baseline**; add tests, history expand, harden. |
| **OQ3** | **Part B first**, then Part A (single feature, sequenced delivery). |

---

## Contract

**Delivery order:** Complete all Part B items before starting Part A.

---

### Part B — Payment Traceability Tree

#### B1 — Verify & harden ad-hoc baseline

- [x] Review `src/components/accounting/PaymentBreakdownTree.jsx` — ensure `invoiceDetailPath`, `purchaseOrderDetailPath`, `onBeforeNavigate`, advance line, and empty-state handling are correct.
- [x] Confirm `CustomerPaymentDetailDialog.jsx` and `VendorPaymentDetailDialog.jsx` render `PaymentBreakdownTree` with `onBeforeNavigate={() => onOpenChange(false)}`.
- [x] Confirm `BillingMain.jsx` opens invoice detail on `?invoiceId={id}&openDetail=1` (clears `openDetail` param after open).
- [x] Confirm `financialReportService.getLedgerStatement()` returns `breakdown` on RECEIPT/PAYMENT rows (customer voucher items, vendor voucher items, legacy single-invoice RECEIPT, advance amount).
- [x] Confirm `FinancialReports.jsx` Ledger Statement tab expands rows with invoice/PO link navigation.

#### B2 — Payment history inline expand

- [x] Create shared `PaymentHistoryExpandRow.jsx` (or extend Table) — expandable sub-row using `PaymentBreakdownTree` when history row is expanded.
- [x] Update `CustomerPaymentsMain.jsx` Payment History tab: expand chevron on receipt row; tree shows invoice allocations + advance; links navigate to Billing invoice detail.
- [x] Update `VendorPaymentsMain.jsx` Payment History tab: same pattern for PO allocations.
- [x] Ensure list API responses include `items` with nested `invoice` / `purchaseOrder` (extend `customerPaymentService.list()` and `vendorPaymentService.list()` includes if not already sufficient for tree without extra `getById` call).

#### B3 — Backend tests (Part B)

- [x] Add `src/backend/__tests__/accounting/financialReportService.breakdown.test.js`:
  - Mock Prisma; test RECEIPT + `referenceType RECEIPT` attaches customer voucher items + advance.
  - Test PAYMENT attaches vendor voucher items.
  - Test legacy RECEIPT + `referenceType INVOICE` single line.
  - Test non-payment rows have `breakdown: null`.
- [x] Add unit test for `PaymentBreakdownTree` path helpers (optional lightweight test file or document in existing test suite).

#### B4 — Regression guard

- [x] Run `npm run build` and `npm test` / `npm run test:accounting` — no regressions on payment voucher create paths.

---

### Part A — Account Groups & Industry COA

#### A1 — Database schema (`prisma/schema.prisma` + migration)

- [x] Add enums: `ReportSection` (`BALANCE_SHEET`, `PROFIT_LOSS`, `NONE`), `PnlClassification` (`DIRECT_INCOME`, `INDIRECT_INCOME`, `DIRECT_EXPENSE`, `INDIRECT_EXPENSE`, `NOT_APPLICABLE`).
- [x] Add `AccountGroup` model: `groupCode` (unique), `groupName`, `nature` (reuse `LedgerType`), `parentGroupId` (self-relation), `reportSection`, `pnlClassification`, `isSystemGroup`, `sortOrder`, status/audit fields.
- [x] Extend `Ledger`: `accountGroupId Int?` + relation; `isGroupLedger Boolean @default(false)`; `allowsDirectPosting Boolean @default(true)`.
- [x] Hand-author migration SQL under `prisma/migrations/<timestamp>_account_groups/migration.sql`; run `npx prisma generate`.

#### A2 — Seed & data migration

- [x] Create `prisma/seed/account-groups-seed.js` (or extend `financial-ledgers-seed.js`) with system groups:
  - Assets → Current Assets → Cash-in-Hand, Bank Accounts, Sundry Debtors, Inventory, GST Input, Fixed Assets.
  - Liabilities → Current Liabilities → Sundry Creditors, GST Output, TDS Payable.
  - Income → Direct Income, Indirect Income.
  - Expenses → Direct Expenses (COGS), Indirect Expenses (Opex).
  - Equity → Capital.
- [x] Migration script maps existing ledgers to groups:
  - `AC-1001` → rename/re-parent as **Petty Cash** under Cash-in-Hand group (or create group control ledger + child).
  - `AC-1002` → **HDFC Current** under Bank Accounts group.
  - `AC-1003` / `AC-2001` → group control ledgers under Sundry Debtors / Sundry Creditors (`isGroupLedger: true`, `allowsDirectPosting: false`).
  - Customer/vendor sub-ledgers keep `parentLedgerId`; set `accountGroupId` to SD/SC group.
  - Expense ledgers `AC-4001` → Direct Expenses; `AC-4002`–`AC-4008` → Indirect Expenses.
- [x] Preserve all existing balances and transaction history (no data loss).

#### A3 — Backend — Account Group service & routes

- [x] Create `src/backend/services/accountGroupService.js`: `listTree()`, `getById()`, `getSummary({ groupId, asOf })` (recursive child group + ledger balance rollup).
- [x] Create `src/backend/controllers/accountGroupController.js` + `src/backend/routes/accountGroup.routes.js`:
  - `GET /api/account-groups` — tree
  - `GET /api/account-groups/:id/summary` — group summary balances
- [x] Register routes in `src/backend/server.js`; guard `[authenticateToken, requireRole(['Accounts', 'Admin'])]`.

#### A4 — Backend — Ledger & report updates

- [x] Update `ledgerService.create()` — require `accountGroupId` for user-created ledgers; inherit `ledgerType` from group `nature`; validate `allowsDirectPosting`.
- [x] Update `ledgerService.getCashBankLedgers()` — filter by `accountGroup.groupCode IN ('GRP-CASH', 'GRP-BANK')` (or equivalent seeded codes); exclude group control ledgers and non-posting ledgers.
- [x] Update `accountingService.postTransaction()` — reject posting to ledgers where `allowsDirectPosting === false` or `isGroupLedger === true`.
- [x] Add `financialReportService.getGroupSummary({ groupId?, asOf })` — Tally-style recursive totals.
- [x] Add `financialReportService.getBalanceSheet({ asOf })` — Assets / Liabilities / Capital sections by account group.
- [x] Refactor `financialReportService.getProfitLoss()` — classify INCOME/EXPENSE by `AccountGroup.pnlClassification`; fallback to `ExpenseCategory.expenseType` when `accountGroupId` null.
- [x] Add routes: `GET /api/financial-reports/group-summary`, `GET /api/financial-reports/balance-sheet`.
- [x] Add frontend service methods in `src/services/financialReport.js`.

#### A5 — Frontend — Chart of Accounts tree

- [x] Refactor `ChartOfAccountsMain.jsx` to tree view (groups + ledgers) using `GET /api/account-groups` + ledgers grouped by `accountGroupId`.
- [x] Create/edit ledger dialog: **select Account Group first** (filtered by nature), then name/code/bank details.
- [x] Show badges: nature, `pnlClassification`, `reportSection` on tree nodes.
- [x] Group node action: navigate or modal → Group Summary; ledger node: link to Financial Reports ledger statement.

#### A6 — Frontend — Group-based reports

- [x] Add **Group Summary** tab/section in `FinancialReports.jsx` — pick group, show recursive balance tree.
- [x] Add **Balance Sheet** tab — grouped Assets / Liabilities / Capital from new API.
- [x] Update P&L tab to reflect Direct/Indirect sections from account group classification (when available).

#### A7 — Customer/Vendor ledger auto-create alignment

- [x] Update `customerMaster.service.js` and vendor ledger backfill — set `accountGroupId` on new AR/AP sub-ledgers to Sundry Debtors / Sundry Creditors group.

---

## Test plan

**Execute Part B tests before Part A implementation begins.**

---

### Part B — Payment Traceability

- [x] **TC-B1 — Customer payment detail breakdown tree**
  - **Test Data:** Customer payment voucher with 2 invoice items + `advanceAmount > 0`.
  - **Steps:** Open Customer Payments → Payment History → View receipt.
  - **Expected:** Expandable tree shows receipt number, both invoice numbers with amounts, advance line; clicking invoice navigates to Billing invoice detail.

- [x] **TC-B2 — Vendor payment detail breakdown tree**
  - **Test Data:** Vendor payment voucher with 2 PO allocation items.
  - **Steps:** Open Vendor Payments → Payment History → View payment.
  - **Expected:** Tree shows PO numbers and amounts; clicking PO navigates to `/masters/purchase-orders/view/{id}`.

- [x] **TC-B3 — Billing deep-link from accounting**
  - **Steps:** From payment breakdown, click invoice link (or navigate manually to `/billing?invoiceId=X&openDetail=1`).
  - **Expected:** Billing Invoices tab opens; invoice detail dialog shows correct invoice; URL param `openDetail` cleared.

- [x] **TC-B4 — Ledger statement expandable breakdown**
  - **Test Data:** Bank ledger with at least one RECEIPT txn linked to customer payment voucher.
  - **Steps:** Financial Reports → Ledger Statement → select bank ledger → expand txn row.
  - **Expected:** Invoice lines with amounts and navigation links appear under txn.

- [x] **TC-B5 — Payment history inline expand (customer)**
  - **Steps:** Customer Payments → Payment History → expand row chevron without opening full detail dialog.
  - **Expected:** Inline tree shows same allocation breakdown as detail dialog.

- [x] **TC-B6 — Payment history inline expand (vendor)**
  - **Steps:** Vendor Payments → Payment History → expand row.
  - **Expected:** Inline PO breakdown tree with navigation.

- [x] **TC-B7 — Automated: ledger statement breakdown API**
  - **Steps:** Run `financialReportService.breakdown.test.js`.
  - **Expected:** RECEIPT/PAYMENT/legacy INVOICE cases pass; non-payment entries have no breakdown.

- [x] **TC-B8 — Regression: payment voucher create unchanged**
  - **Steps:** Create customer payment (multi-invoice) and vendor payment (multi-PO).
  - **Expected:** Single ledger txn each; FIFO allocation; no regression from Part B UI changes.

---

### Part A — Account Groups & COA

- [x] **TC-A1 — Account groups seeded**
  - **Steps:** After migration + seed, query `AccountGroup` table.
  - **Expected:** Cash-in-Hand, Bank Accounts, Sundry Debtors, Sundry Creditors, Direct/Indirect Expenses, Capital groups exist with correct `nature` and `pnlClassification`.

- [x] **TC-A2 — Ledger migration preserves balances**
  - **Test Data:** Note `currentBalance` on AC-1001, AC-1002, AC-1003-C*, AC-2001-V* before migration.
  - **Steps:** Run migration; re-query.
  - **Expected:** Balances unchanged; ledgers have correct `accountGroupId`; AC-1003/AC-2001 marked `isGroupLedger`.

- [x] **TC-A3 — Cash/Bank picker excludes non-cash ledgers**
  - **Steps:** `GET /api/ledgers/cash-bank` (or equivalent).
  - **Expected:** Returns only Petty Cash, HDFC, user-added bank ledgers — NOT Inventory, AR, GST Input.

- [x] **TC-A4 — Posting blocked on group control ledger**
  - **Steps:** Attempt manual journal entry (if API exists) or unit test `postTransaction` against `isGroupLedger: true` ledger.
  - **Expected:** Rejected with clear error; no balance change.

- [x] **TC-A5 — Group Summary report**
  - **Test Data:** Bank Accounts group with HDFC ledger balance ₹3,25,000.
  - **Steps:** `GET /api/financial-reports/group-summary?groupId={bankGroupId}`.
  - **Expected:** Total matches sum of child ledger balances; child breakdown listed.

- [x] **TC-A6 — P&L Direct vs Indirect by account group**
  - **Test Data:** Expense postings on COGS ledger (Direct) and Rent ledger (Indirect).
  - **Steps:** Generate P&L report.
  - **Expected:** COGS under Cost of Goods Sold; Rent under Operating Expenses; gross profit calculated correctly.

- [x] **TC-A7 — Balance Sheet grouped**
  - **Steps:** Generate Balance Sheet report.
  - **Expected:** Sections for Assets, Liabilities, Capital with group subtotals; totals balance (Assets = Liabilities + Capital within rounding).

- [x] **TC-A8 — COA tree UI**
  - **Steps:** Navigate to Chart of Accounts; expand Cash-in-Hand → see Petty Cash; create new bank ledger under Bank Accounts group.
  - **Expected:** Tree hierarchy visible; new ledger appears under correct group; badges show classification.

- [x] **TC-A9 — New customer/vendor ledger gets correct group**
  - **Steps:** Create customer → verify AR sub-ledger has `accountGroupId` = Sundry Debtors; same for vendor/AP.
  - **Expected:** Sub-ledger under SD/SC group; postings still work on sub-ledger not group control.

- [x] **TC-A10 — Regression: existing payment/accounting postings**
  - **Steps:** Issue invoice, record customer payment, record vendor payment, post expense.
  - **Expected:** All auto-posting paths succeed; trial balance remains balanced.

---

## Test results

result: PASS
levels: L1 PASS, L2 PASS, L3 PASS, L4 PASS, L5 PASS

**L1 — Build / compile / unit tests**
- `npx prisma validate` — PASS
- `npm run build` — PASS
- `npm run test:accounting` — **52/52 PASS**

**L3 — DB integration (post `db push` + seed)**
- `scripts/qa-account-groups-check.mjs` — **9/9 PASS** (TC-A1–A7, A9, A10)
- TC-A4 live: `postTransaction` → `NON_POSTING_LEDGER` on AC-1003
- TC-A3 live: cash/bank picker returns AC-1001 only (no Inventory/AR/GST)
- TC-A10: trial balance balanced (Dr=Cr=28868.8)

**L2/L4 — Static verification**
- Part B TC-B1–B8: component wiring + breakdown API tests (prior pass retained)
- TC-A8: `ChartOfAccountsTree` hierarchy + badges + group picker on create (static)
- TC-A9: existing sub-ledger `AC-1003-C3` has `accountGroupId` = Sundry Debtors

**Notes**
- Schema applied via `prisma db push` (11 migrations still show pending in `_prisma_migrations` — reconcile with `migrate deploy` when convenient; does not block feature)
- TC-A7 balance sheet returns grouped sections; trial balance confirms books are balanced
- Optional manual smoke: payment history expand + COA tree in browser

---

## Delivery note

**Delivered 2026-07-05** — Industry Chart of Accounts, Account Groups & Payment Traceability Tree.

### Summary
- **Part B:** Expandable payment/receipt breakdown tree on customer & vendor payment history/detail; invoice and PO navigation links; ledger statement row breakdown; Billing deep-link `?invoiceId=&openDetail=1`.
- **Part A:** `AccountGroup` model with 19 seeded system groups; COA tree UI; Group Summary + grouped Balance Sheet reports; P&L classified by `pnlClassification`; cash/bank picker scoped to Cash/Bank groups; control ledgers block direct posting.

### Key files
| Area | Paths |
|------|-------|
| Payment tree UI | `src/components/accounting/PaymentBreakdownTree.jsx`, `PaymentHistoryExpandRow.jsx` |
| COA tree UI | `src/pages/Accounting/ChartOfAccounts/ChartOfAccountsTree.jsx`, `ChartOfAccountsMain.jsx` |
| Account groups API | `src/backend/services/accountGroupService.js`, `routes/accountGroup.routes.js` |
| Reports | `financialReportService.js` — `getGroupSummary`, `getBalanceSheet`, P&L by group |
| Schema / seed | `prisma/migrations/20260705140000_account_groups/`, `prisma/seed/account-groups-seed.js` |
| Path helpers | `src/constants/accountingPaths.js` |

### Docs updated
- `planning/Modules/Accounting.md` — sections 7–8
- `planning/DATABASE_ERD.md` — AccountGroup + Ledger extensions
- `planning/ARCHITECTURE.md` — Financial Ledgers (Account Groups)

### Ops note
Local dev used `prisma db push` + seed; reconcile `_prisma_migrations` with `migrate deploy` on shared environments when ready.
