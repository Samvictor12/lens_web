# KB-027 — Finance dashboard local calendar-day sales/purchases

**Refs:** PRD-4.6, PRD-4.10, DD-2.1, FD-2.4, req-002 (2026-09-15)

## Pattern

- **Never** parse operator `YYYY-MM-DD` with `new Date('YYYY-MM-DD')` (UTC midnight). Use local noon / local 00:00–23:59 like `parseInvoiceCalendarDate`.
- **Never** default date inputs with `toISOString().split('T')[0]` (UTC calendar). Use `todayInputDate` / `formatLocalDate`.
- Today Sales / Purchases = documents whose **document date or createdAt** falls on As-of local day. Not ledger `currentBalance` (AC-3001, Sundry Creditors).

## Reuse

- Invoice billDate already uses `${date}T12:00:00` local. Vendor `invoiceDate` create/update must use the same helper.
