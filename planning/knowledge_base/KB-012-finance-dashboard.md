# KB-012 — Finance Dashboard

**Refs:** PRD-4.6, DD-2.1, FD-2.4, req-006 (2026-08-31)

## Pattern

- **Single bundle API:** `GET /api/financial-reports/dashboard?asOf=` composes billing, vendor, inventory, and GL services — frontend must not re-aggregate KPIs.
- **FY:** India Apr–Mar via `fyMonthsThrough(asOf)`; trend uses same net income/expense logic as `getProfitLoss`.
- **Today profit:** `getProfitLoss({ from: today, to: today })` for gross/net (COGS split via `isDirectExpense`).

## Receivables risk

Portfolio-wide: open invoices (`ISSUED`/`PARTIALLY_PAID`, balance > 0) where `dueDate < asOf − 90 days`. Not scoped to Customer 360 selection.

## Trial Balance

`GET /api/financial-reports/trial-balance-grouped` expands `GRP-SUNDRY-DEBTORS` and `GRP-SUNDRY-CREDITORS`; other groups rolled up. Flat `trial-balance` kept for drill-down toggle.

## Reuse

- Report sub-tabs import extracted components from `FinancialReports/`; `GstReports` accepts `embedded` prop.
- Legacy `/accounts/reports` unchanged for power users.
