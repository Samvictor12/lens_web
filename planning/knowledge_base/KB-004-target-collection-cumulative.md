# KB-004 — Target Collection cumulative balance

**Refs:** PRD-4.1, DD-2.1, req-003 (2026-08-30)

## Problem

Target Collection KPI used `dueDate` between `startDate` and `endDate`, excluding prior-month overdue invoices operators still need to collect.

## Fix

- `invoiceService.getStats`: `targetWhere.dueDate.lte = LEAST(today, filter.endDate)` only; no `startDate` on due date.
- `customerPaymentService.getOutstanding({ collectible: true })`: same cap for per-customer listing; status `ISSUED`/`PARTIALLY_PAID` only (exclude `DRAFT`).
- Collection tab: **Balance to Collect** (target) separate from **Collections Received** (period receipts).

## Gotcha

Outstanding KPI still shows all open AR (any due date). Target Collection is a subset: due on or before cap date.
