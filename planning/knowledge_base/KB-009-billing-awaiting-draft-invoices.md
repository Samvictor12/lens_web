# KB-009 — Billing awaiting list & DRAFT invoices

**Refs:** PRD-4.1, DD-2.1, req-009 (2026-08-30)

## Awaiting tab (delivered un-billed SOs)

- Shared **From/To** date filter does **not** scope the Awaiting tab — only `customerId` and `productId`.
- Date filter still drives KPIs, Payments, Collection, and Customer Ledger.
- Backend `GET /api/invoices/dispatched-orders` ignores `startDate`/`endDate`; returns all `DELIVERED` un-billed orders.

## Invoices tab

- `GET /api/customer-payments/outstanding` includes **DRAFT** alongside ISSUED/PARTIALLY_PAID (positive balance).
- DRAFT rows show in the list with a Draft badge; checkboxes disabled via `canRecordPayment`.
- After Create Invoice, parent `onCreated` calls `fetchOutstanding()` + `setRefreshKey` so the new bill appears without manual refresh.
- Issue invoice (DRAFT → ISSUED) before Record Payment.

## Supersedes

KB-001 gotcha "month filter should drive … awaiting" — awaiting is now customer/product only.
