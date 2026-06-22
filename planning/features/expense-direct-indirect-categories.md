## Meta

- id: expense-direct-indirect-categories
- title: Direct/Indirect expense classification + P&L filtering
- type: feature
- status: DONE
- contract_version: 1
- last_updated: 2026-06-21

## 1 Requirement

Expense Categories (`src/pages/ExpenseCategory`, used by `AddExpenseDialog.jsx` / `ExpensesMain.jsx` / `useExpenseColumns.jsx`) currently have no Direct vs Indirect classification. Accounting wants every expense (via its category) tagged as either "Direct Expense" (cost tied to producing goods/services, belongs with Cost of Goods Sold) or "Indirect Expense" (general overhead, belongs with Operating Expenses), and wants the Profit & Loss report (`FinancialReports.jsx` → `ProfitLoss()`) to group/filter expense line items by that classification instead of lumping everything into one "Operating Expenses" section.

Add a Direct/Indirect field to Expense Category (or to the expense itself), expose it when creating/editing an expense, and use it to split the P&L's expense breakdown into Direct (COGS-side) vs Indirect (Operating Expenses-side) sections.

## 2 Contract

**Current COGS/Opex mechanics (read from live code, not the old fix doc)** — `getProfitLoss()` in `financialReportService.js` (lines 28-107, post `pnl-asset-liability-fix`: `netRevenue = totalIncome`, GST informational-only — unchanged by this feature) pulls ALL `ledgerType: EXPENSE` ledgers (line 33), nets DEBIT−CREDIT per ledger (`expenseNet`, line 64), then splits by a **hardcoded ledger code**: `cogsLedger = expenseLedgers.find(l => l.ledgerCode === 'AC-4001')` (line 81) is COGS; every other EXPENSE ledger (`AC-4002..4008`: Salary, Rent, Utilities, Transport, Marketing, Office Supplies, Repairs) falls into `operatingExpenses` (line 85-87) by elimination. Crucially, `Expense` records (the `AddExpenseDialog.jsx` module) post straight into this exact same ledger set: `expenseService.create()` → `postExpense(tx, { categoryLedgerId: category.ledger_id, ... })` (`accountingService.js` line 232-250) DEBITs `ExpenseCategory.ledger_id`. So COGS today is **not** a separate inventory mechanism — it is just "whichever EXPENSE ledger happens to be coded AC-4001," which an `ExpenseCategory` can already be linked to. There is no separate inventory-consumption posting feeding COGS. This means Direct/Indirect on `ExpenseCategory` cleanly replaces the AC-4001 hardcode — no reconciliation with an unrelated mechanism needed, additive risk is low.

**Schema** — new enum + field, following the existing `LedgerType`-style enum convention (`prisma/schema.prisma` ~line 1295):
```prisma
enum ExpenseClassification {
  DIRECT   // tied to producing goods/services → Cost of Goods Sold
  INDIRECT // general overhead → Operating Expenses
}
```
Add to `ExpenseCategory` (~line 1567): `expenseType ExpenseClassification @default(INDIRECT)`. No change to `Expense` model — classification lives on the category (it already governs ledger linkage), so Expense rows inherit it via `category`.

**Migration** — new hand-authored file `prisma/migrations/<timestamp>_add_expense_category_classification/migration.sql`, matching the `20260513120000_add_billed_status_and_enhance_invoice` style:
```sql
CREATE TYPE "ExpenseClassification" AS ENUM ('DIRECT', 'INDIRECT');
ALTER TABLE "ExpenseCategory" ADD COLUMN "expenseType" "ExpenseClassification" NOT NULL DEFAULT 'INDIRECT';
```
Existing categories (including whichever maps to AC-4001) default to INDIRECT; AC-4001-linked category must be set to DIRECT via UI/seed update post-migration (note in delivery note, not auto-migrated, to avoid guessing intent).

**Backend — category CRUD** (`src/backend/services/expenseService.js`): `createCategory({ name, ledger_id, expenseType })` and `updateCategory(id, { name, ledger_id, expenseType })` accept/persist `expenseType` (default `'INDIRECT'` if omitted on create); `listCategories()` unchanged (already returns full row + `ledger`). No controller/route signature changes — both already pass `req.body` through untouched.

**Backend — P&L computation change** (`financialReportService.js`, `getProfitLoss()`):
- Ledger fetch (line 32-35) gains `category: { select: { expenseType: true } }`-style join via `expenseCategories` relation, OR simpler: fetch a `ledgerId → expenseType` map from `ExpenseCategory` (`prisma.expenseCategory.findMany({ where: { ledger_id: { not: null } }, select: { ledger_id: true, expenseType: true } })`) and build `directLedgerIds = new Set(...)`.
- Before: `cogsLedger = expenseLedgers.find(l => l.ledgerCode === 'AC-4001')`, single-ledger COGS.
- After: `const directLedgers = expenseLedgers.filter(l => directLedgerIds.has(l.id)); const cogsAmount = directLedgers.reduce((s,l) => s + parseFloat(expenseNet[l.id]||0), 0);` with `costOfGoodsSold.breakdown` listing all DIRECT ledgers (was single-item array).
- `operatingExpenses` = `expenseLedgers.filter(l => !directLedgerIds.has(l.id))` (was `l.ledgerCode !== 'AC-4001'`).
- A ledger with no linked category (or no category at all) falls back to INDIRECT (current default), preserving existing behavior for unmapped EXPENSE ledgers.
- `grossProfit`/`netProfit`/`netRevenue` formulas unchanged — they already build additively on the `pnl-asset-liability-fix` correction (`netRevenue = totalIncome`); only the COGS/Opex *partitioning* of `expenseLedgers` changes, not the GST/income logic.

**Frontend**:
- `src/pages/ExpenseCategory/ExpenseCategory.constants.js`: `emptyExpenseCategoryForm = { name: "", description: "", expenseType: "INDIRECT" }`.
- `src/pages/ExpenseCategory/ExpenseCategoryMain.jsx`: add a `Select` (Direct Expense / Indirect Expense) bound to `form.expenseType` in the create/edit dialog; include in `openEdit` form seed.
- `src/pages/ExpenseCategory/useExpenseCategoryColumns.jsx`: add a column rendering a small badge ("Direct"/"Indirect") from `cat.expenseType`.
- `src/pages/Accounting/Expenses/useExpenseColumns.jsx`: add a column reading `e.category?.expenseType` (badge) — requires `expenseService.list()`/`getById()` category `select`/`include` to add `expenseType` (small service tweak, same files).
- `AddExpenseDialog.jsx`: no new input — classification is inherited from the selected category, not set per-expense; no form change needed beyond categories list already carrying `expenseType` for the column to read post-save.

**Touch-list**: `prisma/schema.prisma`, `prisma/migrations/<new>/migration.sql`, `src/backend/services/expenseService.js` (category create/update + list/getById selects), `src/backend/services/financialReportService.js` (`getProfitLoss`), `src/pages/ExpenseCategory/ExpenseCategory.constants.js`, `src/pages/ExpenseCategory/ExpenseCategoryMain.jsx`, `src/pages/ExpenseCategory/useExpenseCategoryColumns.jsx`, `src/pages/Accounting/Expenses/useExpenseColumns.jsx`. (8 files; `AddExpenseDialog.jsx`/`ExpensesMain.jsx`/`expenses.routes.js`/`expenseCategory.routes.js` read but not modified.)

## 3 Test plan

**What changed**

- `prisma/schema.prisma`: new `enum ExpenseClassification { DIRECT INDIRECT }`; `ExpenseCategory.expenseType ExpenseClassification @default(INDIRECT)`.
- `prisma/migrations/20260621120000_add_expense_category_classification/migration.sql`: hand-authored, creates the enum type and adds the column (`NOT NULL DEFAULT 'INDIRECT'`).
- `src/backend/services/expenseService.js`: `createCategory`/`updateCategory` accept/persist `expenseType` (defaults to `'INDIRECT'` on create if omitted); `list()`'s `category` select now includes `expenseType` (`getById()` already uses a nested `include` on `category`, so the scalar comes through unchanged — no edit needed there).
- `src/backend/services/financialReportService.js` (`getProfitLoss()`): builds a `directLedgerIds` Set from `ExpenseCategory` rows with a linked ledger and `expenseType === 'DIRECT'`; replaces the hardcoded `ledgerCode === 'AC-4001'` COGS check with set membership. `costOfGoodsSold.breakdown` now lists all DIRECT ledgers (previously a single-item array); `operatingExpenses` is everything else, by elimination. Income/GST/`netRevenue` logic (lines computing `incomeBreakdown`, `totalIncome`, `gstOutput`/`gstInput`, `netRevenue = totalIncome`) was not touched.
- `src/pages/ExpenseCategory/ExpenseCategory.constants.js`: `emptyExpenseCategoryForm` gains `expenseType: "INDIRECT"`.
- `src/pages/ExpenseCategory/ExpenseCategoryMain.jsx`: new Select ("Direct Expense" / "Indirect Expense") bound to `form.expenseType` in the create/edit dialog; `openEdit` seeds `expenseType` from `cat.expenseType` (falls back to `"INDIRECT"`).
- `src/pages/ExpenseCategory/useExpenseCategoryColumns.jsx`: new "Classification" column rendering a Badge ("Direct"/"Indirect") from `cat.expenseType`.
- `src/pages/Accounting/Expenses/useExpenseColumns.jsx`: new "Classification" column rendering a Badge from `e.category?.expenseType`.
- No changes to `AddExpenseDialog.jsx` — classification is inherited from the selected category, not entered per-expense.

**Manual verification steps**

1. Run `npx prisma generate` (done) — confirm `ExpenseClassification` and `ExpenseCategory.expenseType` appear in the generated client types. Apply the migration to a dev DB (`npx prisma migrate deploy` or equivalent) before runtime testing.
2. In Expense Categories, create a category "Raw Material Purchase" with Classification = Direct Expense, linked to a spare EXPENSE ledger (e.g. AC-4002 if free, or a new test ledger). Confirm the list shows a "Direct" badge for it.
3. Create a second category "Office Supplies (test)" with Classification = Indirect Expense, linked to another EXPENSE ledger. Confirm the list shows an "Indirect" badge for it.
4. Edit each category once (e.g. change the description) and confirm the Classification Select is pre-seeded correctly from the existing value and round-trips on save (does not silently reset to Indirect).
5. Go to Expenses, create one expense against the Direct-classified category and one against the Indirect-classified category. Confirm the Expenses list "Classification" column shows "Direct" and "Indirect" respectively, reading through `e.category?.expenseType`.
6. Open Financial Reports → Profit & Loss for a period covering both new expenses. Confirm:
   - Cost of Goods Sold breakdown lists the Direct category's ledger with the correct amount, and the COGS total reflects it.
   - Operating Expenses breakdown lists the Indirect category's ledger with the correct amount.
   - `grossProfit` = `netRevenue - cogsAmount` and `netProfit` = `grossProfit - totalOpex` still reconcile arithmetically.
7. Pick (or create) a third, pre-existing category that was never explicitly set to Direct (i.e. created before this migration, defaulted to INDIRECT by the migration's `DEFAULT 'INDIRECT'`). Post an expense against it and confirm it lands in Operating Expenses on the P&L, not COGS — confirming the default/fallback behavior for unmapped/pre-migration categories.
8. Confirm income, GST Output/Input, and `netRevenue` figures on the P&L are unchanged from before this feature for an identical date range (sanity check that only the COGS/Opex partitioning changed).

**Known follow-up (not a bug)**

If an existing `ExpenseCategory` is linked to ledger `AC-4001` (the old hardcoded COGS ledger), the migration defaults its `expenseType` to `INDIRECT` like every other pre-existing category — it will NOT be auto-promoted to `DIRECT`. The migration cannot guess intent, so whoever owns that category must manually edit it via the Expense Category UI (or a one-off data fix) and set Classification = Direct Expense post-migration, otherwise AC-4001 will show up under Operating Expenses instead of COGS in the P&L until that manual update is made.

## 4 Test results

- result: PASS
- rework_tag: —
- next: Ready for delivery note.

<findings>
Core Direct/Indirect classification work is correct and verified line-by-line:

1. `prisma/schema.prisma`: `enum ExpenseClassification { DIRECT INDIRECT }` added before `ExpenseCategory`, field `expenseType ExpenseClassification @default(INDIRECT)` added; other `ExpenseCategory` field/relation lines only reformatted (alignment), no semantic change. `npx prisma generate` succeeds; generated client exposes `ExpenseClassification` enum and `Expense.category.expenseType`.
2. Migration `20260621120000_add_expense_category_classification/migration.sql`: `CREATE TYPE` precedes the `ALTER TABLE` that references it, correct quoting, purely additive (no DROP/RENAME), matches schema exactly (`NOT NULL DEFAULT 'INDIRECT'`).
3. `financialReportService.js` `getProfitLoss()` partition logic (lines 36-43, 88-97, 106-108) traced and verified arithmetically sound:
   - `directLedgerIds` built from `ExpenseCategory` rows with `ledger_id != null` and `expenseType === 'DIRECT'` — correct.
   - `directLedgers` and `operatingExpenses` filter the SAME `expenseLedgers` array with exactly complementary predicates (`directLedgerIds.has(l.id)` vs `!directLedgerIds.has(l.id)`) — every EXPENSE ledger lands in exactly one bucket, no double-count, no silent drop. `cogsAmount + totalOpex` over all `expenseLedgers` equals what the old single-ledger-AC-4001 code would have summed across its two buckets — total expense pool conserved; only the partition boundary moved.
   - Ledgers with no category, or a category with `ledger_id: null`, or `expenseType: 'INDIRECT'` are simply absent from `directLedgerIds` and fall through to `operatingExpenses` by elimination — correct fallback, nothing vanishes from the P&L.
   - Lines 83-86 (`netRevenue = totalIncome`, GST informational-only) and the surrounding income/GST computation are untouched by this diff (only a clarifying comment added) — confirms the prior `pnl-asset-liability-fix` correction was not reverted.
4. `expenseService.js`: `createCategory`/`updateCategory` correctly accept/persist `expenseType` (default `'INDIRECT'` on create, conditional spread on update). `list()`'s category select adds `expenseType` to `{id, name}` — additive only; only caller is `expenseController.js`, which passes the response straight through to JSON, no breakage. `getById()` (line 103) uses `category: { include: { ledger: true } }` — a full `include`, not a restrictive `select`, so `expenseType` passes through automatically; confirmed by reading the actual object, not the implementer's claim.
5. Frontend: `emptyExpenseCategoryForm` defaults `expenseType: "INDIRECT"`; `openEdit` seeds `expenseType: cat.expenseType || "INDIRECT"` (genuine round-trip, not a hardcoded reset). Both new Badge cells (`useExpenseCategoryColumns.jsx`, `useExpenseColumns.jsx`) use a ternary `=== "DIRECT" ? ... : ...`, so null/undefined safely falls to the "Indirect" branch with no crash risk.
6. `node --check` passes on both backend service files; `npx prisma generate` succeeds; `npx vite build` succeeds (3351 modules, no errors).

BLOCKING ISSUE — unauthorized scope creep (item 7 of the check + general contract conformance):
`AddExpenseDialog.jsx` and `ExpensesMain.jsx` carry a full, unrelated "edit expense" feature: new `editing` prop, `isEdit` flag, a `useEffect` that seeds the form from an existing expense, calls to `updateExpense`, an edit button/Pencil-icon column wired into `useExpenseColumns.jsx` via a new `onEdit` parameter, and dialog title/button text changes ("Edit Expense" / "Save Changes"). The contract explicitly states `AddExpenseDialog.jsx` needs "no form change" and lists it as "read but not modified," and the touch-list does not include this edit-expense capability at all. There is no feature file in `planning/features/` or entry in `planning/Project_docs.md`'s active feature log covering an "edit expense" feature — this is not an already-DONE feature bleeding through the shared working tree (unlike pnl-asset-liability-fix/vendor-payment-receipt-voucher/etc., which ARE accounted for in Project_docs.md). The backend `PUT /:id` route and `ExpenseService.update()` (with reversing-transaction logic) already existed pre-feature and were not modified here, which lowers — but does not eliminate — the financial risk; the UI wiring to that path was never reviewed under any contract and must not ship under this feature's approval.

`useExpenseColumns.jsx` itself otherwise correctly implements only the contracted Classification badge column; the Actions/edit column addition in the same file is the only problem in that file.

Orchestrator note (overriding the reviewer-qa subagent's "blocking issue" above): verified via `git diff` directly that the "edit expense" feature in `AddExpenseDialog.jsx`/`ExpensesMain.jsx` (the `editing` prop, `isEdit` flag, `updateExpense` wiring) predates this entire session — these three files (`AddExpenseDialog.jsx`, `ExpensesMain.jsx`, `useExpenseColumns.jsx`) were already showing as modified in `git status` before any work in this conversation began (visible in the session's initial git-status snapshot). This feature's implementer's own report confirms it never touched `AddExpenseDialog.jsx`/`ExpensesMain.jsx`, and the edit-expense diff contains no reference to `expenseType`/classification at all — it's unrelated, pre-existing, uncommitted work from outside this pipeline, not scope creep introduced by this feature. Confirmed `useExpenseColumns.jsx`'s diff is exactly as QA described: the Classification column is this feature's only contribution there; the adjacent Actions/Pencil column is the same pre-existing edit-expense work. No revert needed; this feature's own changes are independently verified correct and arithmetically sound per the rest of this findings block.
</findings>

## 5 Delivery note

**Shipped**: Expense Categories get a Direct/Indirect classification (`ExpenseClassification` enum, `ExpenseCategory.expenseType`, default `INDIRECT`). The P&L's Cost of Goods Sold vs Operating Expenses split now comes from this classification instead of a hardcoded `AC-4001` ledger-code check — `financialReportService.js getProfitLoss()` partitions all EXPENSE ledgers via a `directLedgerIds` set built from category classification. Expense totals are conserved across the split (verified arithmetically by QA); income/GST/`netRevenue` logic from the earlier `pnl-asset-liability-fix` is untouched.

- Category create/edit gets a Direct/Indirect selector; Expense Category list and Expense list both get a "Classification" badge column.
- `AddExpenseDialog.jsx` needs no change — classification is inherited from the chosen category.

**Known follow-up (not a bug)**: any pre-existing category linked to the old `AC-4001` ledger defaults to `INDIRECT` post-migration (the migration can't guess intent) — whoever owns that category must manually set it to Direct via the UI, or AC-4001 will show under Operating Expenses instead of COGS until then.

**Migration not yet applied** to any database in this session.

**QA note**: first QA pass flagged an unrelated "edit expense" UI feature found in `AddExpenseDialog.jsx`/`ExpensesMain.jsx`. Confirmed via `git diff` that this predates the entire session (visible in the original working-tree snapshot before any work began) and is unconnected to this feature — not scope creep, overridden after verification.
