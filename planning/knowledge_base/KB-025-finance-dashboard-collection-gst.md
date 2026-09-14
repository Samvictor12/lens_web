# KB-025 — Finance dashboard collection and GST register

**Refs:** PRD-4.15, PRD-4.6, DD-2.1, FD-2.4, SD-2.1, req-001 (2026-09-14)

## Dashboard

- Replaced MTD P&L snapshot with `CollectionByCustomerTable` (Customer, Target, Actual, Balance).
- `GET /api/financial-reports/dashboard` returns `collectionByCustomer[]`. Target = remaining collectible on ISSUED/PARTIALLY_PAID with `dueDate` ≤ month-end (same idea as `invoiceService.getStats` targetWhere). Actual = current-month `CustomerPaymentVoucher` receipts. Balance = Target − Actual. KPI `collectionTarget` stays the month-end collectible total.

## Cash & Bank

- Cash & Bank Total KPI scrolls to Reports `#cash-bank`.
- Tab lists GRP-CASH/GRP-BANK ledgers + Add via `POST /api/bank-accounts`.
- Sidebar Bank Accounts removed; `/accounts/bank-accounts` redirects to the dashboard hash.

## Reports

- Tabs: Trial Balance, two-column Balance Sheet, industrial MTD P&L, Day Book, General Ledger, Cash & Bank, GST register.
- Each tab: Export Excel (client SpreadsheetML) and Export PDF (print-to-PDF).
- GST: `GET /api/accounting/gst-reports/register` — invoice register, not GST Collection summary. Headers match operator Excel (SlNo through Postage). No Invoice schema change.

## Gotcha

Standalone `/accounts/gst-reports` may still expose Monthly Sales / GST Collection; dashboard default set does not.
