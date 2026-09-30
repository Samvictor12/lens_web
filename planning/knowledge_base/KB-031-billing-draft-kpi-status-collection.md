# KB-031 — Billing draft KPI, invoice status, collection list

**Refs:** PRD-4.16, PRD-4.1, DD-2.1, FD-2.1, req-031 (2026-09-16)

## Drafted Invoice KPI

- `GET /api/invoices/stats` returns `draftedInvoiceCount` from the same `invoiceBase` as `byStatus.DRAFT` (customer/product, `deleteStatus=false`).
- Month `startDate`/`endDate` do **not** hide open drafts; they still scope billed/collection money KPIs.

## Invoices Status filter

- Toolbar Status sits next to Group by. Default All = `DRAFT+ISSUED+PARTIALLY_PAID` (omit `status` query).
- Optional `status` on `GET /api/customer-payments/outstanding` filters the Invoices tab only, not KPIs or Collection.

## Collection tab

- One table: Customer, Target, Actual, Balance to collect.
- Remaining = collectible outstanding (KB-004); Actual = non-cancelled receipts in the shared month; Target = Remaining + Actual; Balance = Remaining.
