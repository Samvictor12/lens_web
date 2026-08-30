# KB-003 — Customer 360 view

**Refs:** PRD-4.3, DD-2.1, FD-2.3, req-003  
**Date:** 2026-08-30

## Pattern
Read-only customer analytics workspace: one overview API aggregates Section 1–3 metrics; card drill-downs use a separate paginated `cardKey` endpoint (page size 5). Section 4 tabs reuse existing invoice/payment/CN/ledger list APIs — no new posting or write paths.

## APIs
- `GET /api/customer-360/:customerId/overview` — details, month KPIs, card counts, top lens chart, 30/60/90 aging
- `GET /api/customer-360/:customerId/cards/:cardKey?page&limit` — `ordersMonth|inProduction|inDispatch|delivered|collectionTarget|collectionActual`
- Section 4: reuse `/api/invoices`, `/api/customer-payments`, `/api/accounting/customer-notes`, `/api/financial-reports/ledger-statement`

## Gotchas
- Customer must be selected before any data loads; empty state until picker resolves.
- Month scope uses calendar month (server-local, consistent with existing accounting filters).
- Pipeline card status sets differ per card (e.g. inProduction excludes dispatch/delivered/invoiced terminal states).
- Card counts come from overview; list endpoint only paginates rows — keep both in sync when changing status filters.
