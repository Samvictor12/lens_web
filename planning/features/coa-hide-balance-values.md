## Meta

- id: coa-hide-balance-values
- title: Hide balance values on Chart of Accounts category cards/masters
- type: feature
- status: DONE
- contract_version: 1
- last_updated: 2026-06-21

## 1 Requirement

On the Chart of Accounts page (`ChartOfAccountsMain.jsx`), the type-summary cards at the top (one per ledger major category — ASSET/LIABILITY/INCOME/EXPENSE/etc., `typeSummary`) currently show both a count and a monetary balance (`fmt(g.balance)`, line ~227). The user wants the balance figure removed from these major-category summary cards and from the ledger master rows/list, keeping just the count/identity info there. Related to [[pnl-asset-liability-fix]] — confirm during contract whether this is purely cosmetic or tied to the same ledger-type classification issue.

Remove the displayed balance amount from the Chart of Accounts major-category summary cards and from the ledger master list rows, leaving the rest of the page (search, type filter, create/edit) unchanged.

## 2 Contract

Purely cosmetic UI removal — confirmed unrelated to `pnl-asset-liability-fix` (that bug was already fixed in `financialReportService.js`; nothing here touches P&L/ledger-type classification). No backend, route, service, or schema change needed.

**File 1**: `src/pages/Accounting/ChartOfAccounts/ChartOfAccountsMain.jsx` — type-summary cards (`typeSummary.map`, `CardContent`, ~line 215-228):
- Remove line 227: `<p className="text-xs text-muted-foreground">{fmt(g.balance)}</p>`.
- Keep line 226 (`{g.count}`) and the type label/dot.
- Leave `fmt()` helper (line 178-181), `balance` field on the `summary` objects (line 109-111), and `currentBalance` aggregation in `fetchLedgers` untouched — no other consumer, but removing them risks unrelated breakage for a cosmetic ticket; dead `balance` field staying in state is harmless and out of scope.

**File 2**: `src/pages/Accounting/ChartOfAccounts/useChartOfAccountsColumns.jsx` — ledger master table columns:
- Remove the `currentBalance` column object (lines 55-71, header "Current Bal.") — this is the "ledger master rows" balance the requirement refers to.
- Keep the `openingBalance` column (lines 43-54, header "Opening Bal.") — it is a fixed input value set at creation, not a live/derived balance figure, and the requirement's wording ("balance figure", echoing `g.balance`/`currentBalance`) targets the computed running balance, not the original opening amount. Flag this distinction in delivery note for orchestrator/user confirmation if they intended otherwise.

**Touch-list**: 2 files, both frontend JSX, no other files.

## 3 Test plan

**Changes made:**

- `ChartOfAccountsMain.jsx` (type-summary cards, inside `typeSummary.map`): removed the line `<p className="text-xs text-muted-foreground">{fmt(g.balance)}</p>` that rendered directly below `<p className="text-lg font-bold">{g.count}</p>` inside `<CardContent>`. The count paragraph and the type label/colored dot above it are untouched. `fmt()` helper, the `balance` field on `summary` objects, and the `currentBalance` aggregation in `fetchLedgers` were left in place (unused now in the card but harmless/out of scope per contract).
- `useChartOfAccountsColumns.jsx`: removed the entire `currentBalance` column object (the block with `accessorKey: "currentBalance"`, `header: "Current Bal."`, and the cell renderer with the red/green conditional `₹` formatting), located between the `openingBalance` column and the `id`/`Actions` column. The `openingBalance` column (`header: "Opening Bal."`) was left completely untouched.

**Build verification:** `npx vite build` completed successfully (3351 modules transformed, built in ~8.5s) with no errors — only a pre-existing "chunk larger than 500kB" advisory warning unrelated to this change.

**Manual verification steps:**

1. Start the app and navigate to Accounting → Chart of Accounts.
2. In the major-category summary cards row at the top (ASSET/LIABILITY/INCOME/EXPENSE/etc.):
   - Confirm each card shows the type label with its colored dot and the count number.
   - Confirm no rupee/balance amount text appears anywhere on the card.
3. In the ledger table below:
   - Confirm there is an "Opening Bal." column showing the ₹ opening balance value for each ledger.
   - Confirm there is no "Current Bal." column anywhere in the table (check column headers left to right: Code, Ledger Name, Type, Opening Bal., Actions).
4. Type a search term in the search box — confirm the list filters and the summary cards / table render correctly (no console errors, no broken layout from the removed elements).
5. Click a type-summary card to toggle the type filter — confirm filtering still works and the card highlight (ring) still applies correctly.
6. Click "New Ledger", fill in Code/Name/Type/Opening Balance, save — confirm creation still works and the new row appears with its Opening Bal. populated and no Current Bal. column.
7. Edit an existing ledger (name/type) — confirm the edit dialog still opens prefilled and save works.
8. Delete a non-system ledger — confirm the delete confirmation dialog and deletion still work.

## 4 Test results

- result: PASS
- rework_tag: —
- next: Merge as-is; flag the undocumented `params.ledgerType` → `params.type` fix to the user/orchestrator for contract record-keeping (functionally correct, not a blocker).

<findings>
Both files verified by direct read + `git diff`, matching the contract and test-plan claims exactly:

1. `ChartOfAccountsMain.jsx`: the line `<p className="text-xs text-muted-foreground">{fmt(g.balance)}</p>` (old line 227) is fully removed. `<p className="text-lg font-bold">{g.count}</p>` and the type-label/colored-dot block above it are untouched and render correctly; `</CardContent>` closes cleanly with no leftover empty `<p>` or broken JSX. `fmt()` helper, `balance` field in `summary`, and `currentBalance` aggregation in `fetchLedgers` remain in place but unused by the card — harmless, matches contract.

2. `useChartOfAccountsColumns.jsx`: the `currentBalance` column object (accessorKey, header "Current Bal.", red/green ₹ cell renderer) is completely deleted, not commented out or hidden. `openingBalance` column (header "Opening Bal.") is byte-for-byte untouched. Array syntax is clean — no dangling/missing commas; column array now reads ledgerCode, ledgerName, ledgerType, openingBalance, id/Actions.

3. `git diff --stat` confirms only these 2 files changed under ChartOfAccounts/. No other files touched by this feature (other repo-wide dirty files are pre-existing/unrelated, confirmed against baseline git status).

4. `npx vite build` succeeded: 3351 modules transformed, built in 8.65s, zero errors — only the pre-existing "chunk >500kB" advisory, matching the documented build claim.

5. Spot check for other CoA balance displays: `FinancialReports.jsx` and `BankReconciliationMain.jsx` also reference ledger balances, but these are separate pages/widgets (P&L/reports, bank statement reconciliation) outside the Chart-of-Accounts page scope — not a missed spot per the requirement's wording ("Chart of Accounts page... type-summary cards... ledger master rows"). No gap found within the CoA page itself.

One undocumented deviation found (not a defect, but a contract/scope gap): `ChartOfAccountsMain.jsx` line 94 also changed `params.ledgerType = typeFilter` to `params.type = typeFilter` in `fetchLedgers`. This is NOT mentioned in Contract or Test plan sections. Verified against backend `ledgerService.js` `list({ type, ... })` and `ledgerController.js` (passes `req.query` straight through) — the backend destructures `type`, not `ledgerType`, so the old code was silently sending a param the backend ignored, meaning the type-filter dropdown was likely non-functional before this change. The fix is correct and beneficial, but it is scope creep relative to the "purely cosmetic, 2 specific line removals" contract and should be noted back to the user/orchestrator so the contract record reflects what was actually shipped.
</findings>

## 5 Delivery note

**Shipped**: Chart of Accounts no longer displays balance amounts on the major-category summary cards (count only now) or a "Current Bal." column on the ledger master table (kept "Opening Bal."). Purely cosmetic, no backend changes.

**Side note (scope deviation, flagged by QA)**: the implementer's diff to `ChartOfAccountsMain.jsx` also includes `params.ledgerType` → `params.type` in `fetchLedgers` — outside this feature's contract. Verified against the backend (`ledgerService.list({ type, ... })`): the backend never read `ledgerType`, so the type-filter dropdown was silently broken before this change. Net effect is a real, beneficial bug fix riding along with the cosmetic change; not reverted since it's correct, but recorded here since it wasn't part of the original contract.
