# KB-029 — Finance dashboard month-start Row-1 KPIs

**Refs:** PRD-4.6, DD-2.1, FD-2.4, req-004 (2026-09-15)

## Pattern

- Row-1 Sales / Collection / Purchases / Expenses / Gross / Net = **1st of As-of month 00:00 local → As-of EOD**, not FY 1 Apr (KB-028 superseded for this window).
- Reuse `monthStart(asOf)` + `localDayBounds(asOf).end`. JSON `today.*`. Labels without “Today”.
- `getProfitLoss({ from: month-start ISO, to: asOf ISO })`.
- `fyTrend` still Apr–Mar via `fyMonthsThrough`. Row-2 snapshots unchanged.

## Reuse

- KB-027 document date **OR** `createdAt`; local calendar parse.
