# KB-028 — Finance dashboard FYTD Row-1 KPIs

**Refs:** PRD-4.6, DD-2.1, FD-2.4, req-003 (2026-09-15)

## Pattern

- Row-1 Sales / Collection / Purchases / Expenses / Gross / Net = **India FY 1 Apr 00:00 local → As-of EOD**, not a single day.
- JSON keys stay `today.*` (FYTD values). UI labels drop “Today”.
- Jan–Mar As-of uses previous 1 Apr (`financialYearBounds`).
- Row-2 `position.*` stays a snapshot as of As-of.

## Reuse

- `financialYearBounds` + `localDayBounds(asOf).end`; document date **OR** `createdAt` (KB-027).
