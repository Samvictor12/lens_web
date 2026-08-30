# KB-006 — Vendor Payments tab-context header & popup flows

**Refs:** PRD-4.4, PRD-4.5, DD-2.1, KB-005, req-006 (2026-08-30)

## Header CTA map

Single primary action in `VendorPaymentsMain` header per tab:

| Tab | Button |
|-----|--------|
| Awaiting Bills | Register Bill |
| Vendor Bills | Record Payment |
| Expenses | Mark Expense |
| Debit Notes | New Debit Note |
| Payments / Target / Ledger | (none) |

No duplicate flow triggers in tab bodies.

## Dialogs

- **Record Payment** — `CreateVendorPaymentFromInvoicesDialog` in-page (75vw, two-column like Register Bill). Vendor change → `GET outstanding-invoices?vendorId&groupBy=flat`. Checkbox invoice picker + FIFO allocation.
- **Mark Expense** — `MarkIndirectExpenseDialog` (extracted from `IndirectExpensesTab`).
- **Register Bill** — unchanged `CreateVendorInvoiceDialog`; header prefills `filters.vendorId`.

## Vendor Bills selection

Multi-select on outstanding invoices still pre-fills Record Payment when opened from header (vendor + invoice IDs + summed outstanding). Single-vendor guard + toast if mixed vendors.

## Awaiting Bills

PO list grouped by vendor; status badge via `getStatusLabel` (`PO_PARTIAL_RECEIVED` → Partial Received, `RECEIVED` → Full Received). Backend `listAwaitingBills` already filters eligible statuses.

## Legacy route

`/accounts/vendor-payments/record-payment` → redirect shim to `?tab=bills&openPayment=1` with query params preserved.
