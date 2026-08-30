# KB-013 — Finance Dashboard reports polish

**Refs:** PRD-4.6, DD-2.1, FD-2.4, req-005 (2026-08-31)

## UI

- **FY trend chart:** Income `#16a34a`, Expenses `#dc2626` (semantic colors, not chart theme tokens).
- **Reports panel:** `min-h-[28rem]`; `defaultValue="trial"` on load.
- **Flat tabs:** Trial Balance, Balance Sheet, Day Book, Monthly Sales, GST Collection — no nested GstReports wrapper on dashboard.

## GST Collection detail

- `GET /api/accounting/gst-reports/gst-collection` returns `outputInvoices[]` (invoice no, date, customer, taxable, GST, total; optional CGST/SGST when `companyState` set).
- UI: summary cards + detail table; print includes summary and invoice rows.
- Shared components: `GstReports/MonthlySalesReport.jsx`, `GstReports/GstCollectionReport.jsx`.

## Financial Reports retirement

- Standalone `/accounts/reports` page removed; redirect → `/accounts/finance-dashboard`.
- Sidebar entry removed; `financial_reports` home route points to finance dashboard.
- `FinancialReports/` subcomponents retained for embedded dashboard tabs.
- Retired surfaces: P&L, Group Summary, Ledger Statement, Cash/Bank Book standalone tabs (not on dashboard).
