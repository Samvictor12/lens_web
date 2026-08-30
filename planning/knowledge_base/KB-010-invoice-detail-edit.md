# KB-010 — Invoice detail open & DRAFT edit

**Refs:** PRD-4.1, DD-2.1, req-010 (2026-08-30)

## Invoices tab

- Invoice number is a link → `InvoiceDetailDialog` via `onViewInvoice` on `OutstandingInvoicesQueue`.
- Checkbox column is separate — only selects ISSUED/PARTIALLY_PAID for Record Payment.

## DRAFT edit

- `PATCH /api/invoices/:id` — DRAFT only; `{ dueDate, notes, saleOrderIds }`.
- Recalculates tax/total; adjusts `Customer.reserved_amount` / `outstanding_credit` by delta.
- Removed SOs: `invoiceId` cleared, status `DELIVERED`.
- Dialog: Save, Issue, Cancel, Preview, Print, Share; Record Payment when issued.
