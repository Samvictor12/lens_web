## Meta

- id: pnl-asset-liability-fix
- title: Keep Asset/Liability ledgers out of the P&L
- type: bug
- status: DONE
- contract_version: 1
- last_updated: 2026-06-21

## 1 Requirement

The Profit & Loss report (`FinancialReports.jsx` → `ProfitLoss()`, backed by `financialReports.routes.js`) is built from Revenue / COGS / Operating Expenses sections. The user reports that Asset and Liability ledgers are not being correctly kept out of (or distributed away from) the P&L — i.e. balances that belong on a Balance Sheet are leaking into / distorting the Income & Expense statement, throwing off Net Profit/Loss.

Investigate how the P&L's COGS/Operating Expenses breakdown selects ledgers (likely by `ledgerType` from Chart of Accounts) and fix the classification so only INCOME/EXPENSE-type ledgers contribute to the P&L; ASSET/LIABILITY-type ledgers must be excluded from it and should instead be reflected correctly wherever Balance Sheet-style figures are reported (Trial Balance is the closest existing report). Related to [[coa-hide-balance-values]] since both trace back to ledger-type classification on Chart of Accounts.

## 2 Contract

**Root cause** — `src/backend/services/financialReportService.js`, `getProfitLoss()`:
The main ledger fetch (line 33) correctly restricts to `ledgerType: { in: ['INCOME', 'EXPENSE'] }`, and `incomeLedgers`/`expenseLedgers`/COGS (`AC-4001`, EXPENSE) all derive from that filtered set — these are fine. The bug is the GST lines: `gstInputLedger` (`AC-1005`, seeded `ledgerType: ASSET`) and `gstOutputLedger` (`AC-2003`, seeded `ledgerType: LIABILITY`) are fetched by hardcoded `ledgerCode` lookup (lines 36-37), completely bypassing the INCOME/EXPENSE type guard. Their balances are then folded directly into the P&L math: `netRevenue = totalIncome - gstOutput` (line 77) and `grossProfit = netRevenue - cogsAmount` with `gstInput` shown as a P&L add-back (lines 76, 101). This pulls ASSET/LIABILITY ledger balances straight into Revenue/Gross Profit/Net Profit, which is the reported leak.

**No schema change needed** — `ledgerType` enum (`ASSET, LIABILITY, EQUITY, INCOME, EXPENSE`) already exists on `Ledger` (`prisma/schema.prisma` ~line 1295/1308) and is seeded correctly (`prisma/seed/financial-ledgers-seed.js`: AC-1005=ASSET, AC-2003=LIABILITY, AC-4001=EXPENSE).

**Fix** — Remove GST Input/Output from the Income/COGS/Opex/Net-Profit computation entirely; keep them only as informational, non-summed display fields (already returned separately as `gstOutput`/`gstInput` objects), i.e.:
- Before: `netRevenue = totalIncome - gstOutput` ; `grossProfit = netRevenue - cogsAmount`
- After: `netRevenue = totalIncome` ; `grossProfit = netRevenue - cogsAmount` (GST no longer nets into Revenue/Gross Profit/Net Profit; `gstOutput`/`gstInput` stay in the response purely as reference figures, not added/subtracted into any total)
- No change needed to the INCOME/EXPENSE ledger filter itself — it was already correct.

**Touch-list**: `src/backend/services/financialReportService.js` only (`getProfitLoss` method). No frontend, route, or schema changes required — `FinancialReports.jsx` just renders whatever fields the service returns.

## 3 Test plan

**Change made** — `src/backend/services/financialReportService.js`, `getProfitLoss()`:
- Before: `const netRevenue = totalIncome - gstOutput;`
- After: `const netRevenue = totalIncome;` (with a comment noting GST Input/Output are ASSET/LIABILITY ledgers and are informational only, not netted into P&L totals)
- `grossProfit = netRevenue - cogsAmount` and `netProfit = grossProfit - totalOpex` are unchanged as expressions; they now naturally flow from the corrected `netRevenue`.
- The `gstOutput` / `gstInput` objects (`{ total, ledgerName }`) remain in the returned JSON unchanged in shape — still computed from `AC-2003`/`AC-1005` aggregates — just no longer subtracted/added into `netRevenue`/`grossProfit`/`netProfit`.
- No changes to the INCOME/EXPENSE ledger filter, COGS logic, route, controller, or frontend.

**Manual verification steps**:
1. Using the existing accounting seed/flow (e.g. `prisma/seed/financial-ledgers-seed.js` plus a created Sales Invoice or similar transaction via `accountingService.js`), create:
   - An INCOME-ledger CREDIT entry of e.g. ₹10,000 (e.g. Sales/Service Income).
   - An EXPENSE-ledger DEBIT entry of e.g. ₹2,000 that is not COGS (operating expense).
   - A GST Output entry (AC-2003, CREDIT) of e.g. ₹1,800 and/or a GST Input entry (AC-1005, DEBIT) of e.g. ₹900, via the normal invoice/expense posting flow that already creates these entries (see `accountingService.js` lines ~137-170).
2. Call `GET /api/financial-reports/profit-loss` (mounted via `financialReports.routes.js` → `financialReportController.getProfitLoss` → `service.getProfitLoss`), optionally with `?from=&to=` matching the transaction date.
3. Confirm in the response:
   - `income.total` reflects the ₹10,000 INCOME ledger sum.
   - `netRevenue` === `income.total` exactly (no GST subtraction) — i.e. NOT `income.total - gstOutput.total`.
   - `gstOutput.total` (≈ ₹1,800) and `gstInput.total` (≈ ₹900) are present as separate fields with their `ledgerName`, but do not appear added/subtracted anywhere in `netRevenue`, `grossProfit`, or `netProfit`.
   - `grossProfit` === `netRevenue - costOfGoodsSold.total`.
   - `netProfit` === `grossProfit - operatingExpenses.total`, and `isProfit` matches the sign of `netProfit`.
4. In the UI, open Accounting → Financial Reports → Profit & Loss tab and confirm "GST Output Payable" and "GST Input Credit" still render as their own highlighted rows (yellow/green) between Net Revenue and Gross Profit, visually separate from the summed totals, and that Net Revenue / Gross Profit / Net Profit no longer move when GST-only entries are added without any new INCOME/EXPENSE entries.
5. Sanity-check Trial Balance (`getTrialBalance`) still shows AC-1005 (ASSET) and AC-2003 (LIABILITY) balances correctly — confirms this fix didn't touch Balance-Sheet-side reporting, only stopped it from leaking into P&L.

## 4 Test results

- result: PASS
- rework_tag: —
- next: Ready for delivery note / merge.

Verified `src/backend/services/financialReportService.js` `getProfitLoss()` (lines 74-90): `netRevenue` is now `totalIncome` only (line 78, comment confirms GST is informational), with no residual GST subtraction/addition anywhere downstream — `grossProfit = netRevenue - cogsAmount` (line 83) and `netProfit = grossProfit - totalOpex` (line 90) derive cleanly from the corrected `netRevenue`. Main ledger query (line 33) still filters `ledgerType: { in: ['INCOME', 'EXPENSE'] }`, untouched. `gstOutput`/`gstInput` objects (lines 95, 102) remain in the JSON response with `{ total, ledgerName }` shape, unchanged, positioned between `income`/`netRevenue` and `costOfGoodsSold`/`grossProfit` respectively — purely informational, never summed into totals.

`git diff -- src/backend/services/financialReportService.js` shows exactly the intended 2-line change (1 line replaced with a comment + corrected assignment) — no other logic in the function touched. `FinancialReports.jsx` diff (1 line) is an unrelated pre-existing fix (`ledgerType`→`type` param rename in the Cash/Bank Book ledger dropdown, in the working tree before this review), not part of this contract's scope; the P&L tab's GST rows (lines 80-81, 97-98) and Net Revenue/Gross Profit/Net Profit rows (lines 85, 93, 107) still render the same response fields, no frontend changes were needed or made for this fix.

Grepped repo for `getProfitLoss`/`profit-loss` callers: route `financialReports.routes.js` → `financialReportController.js` → `FinancialReportService` (the fixed one) — confirmed wired correctly. Found an unrelated, pre-existing second `getProfitLoss` in `src/backend/services/financialService.js` (line 519) that computes its own simple `totalIncome - totalExpenses` and is NOT routed anywhere (route uses `FinancialReportController`, not this legacy service) — correctly out of scope and untouched, no GST logic there to begin with.

Hand-checked arithmetic using contract's example (Income ₹10,000, GST Output ₹1,800, GST Input ₹900, Opex ₹2,000): `netRevenue` = 10,000 (previously would have been 8,200 — bug confirmed fixed), `grossProfit` = 10,000 − cogsAmount, `netProfit` = grossProfit − 2,000; `gstOutput.total`/`gstInput.total` stay separate and never enter the totals. Internally consistent, no ASSET/LIABILITY contribution remains in Revenue/Gross Profit/Net Profit.

Confirmed via `git diff --stat` that `financialReportService.js` shows only `3 +/- 1` lines changed (the targeted fix). Other modified files in the working tree (seed scripts, Dispatch/Expenses/VendorPayments pages, package.json) are pre-existing unrelated changes already present in git status before this review and outside this feature's touch-list — no additional unrelated edits were introduced by this fix.

## 5 Delivery note

**Shipped**: P&L (Accounting → Financial Reports → Profit & Loss) no longer nets GST Input/Output ledger balances into Net Revenue / Gross Profit / Net Profit. GST Input (AC-1005, ledgerType ASSET) and GST Output (AC-2003, ledgerType LIABILITY) were being fetched by hardcoded ledger code and subtracted/added directly into the P&L's profit math, bypassing the report's own INCOME/EXPENSE ledger-type filter — the Balance-Sheet leak the user reported.

**Fix**: one-line change in `src/backend/services/financialReportService.js` `getProfitLoss()` — `netRevenue = totalIncome` (was `totalIncome - gstOutput`). GST fields stay in the API response and UI as separate informational rows ("GST Output Payable" / "GST Input Credit"); they just no longer move Net Revenue/Gross Profit/Net Profit.

**Verified**: QA confirmed the diff is exactly this 1-line fix, traced the arithmetic by hand, confirmed Trial Balance (Balance-Sheet side) is untouched, and confirmed no other code path reads `getProfitLoss()`'s totals.

**Follow-up noted, not in scope**: an unrelated, unrouted legacy `getProfitLoss` exists in `src/backend/services/financialService.js` (line ~519) — dead code, not wired to any route. Flagged in KB for cleanup if anyone touches that file later, not actioned here.

**Related backlog item**: `coa-hide-balance-values` (Chart of Accounts major-category balance display) was drafted alongside this but is a separate, still-DRAFT feature — not part of this fix.
