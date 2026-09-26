# KB-030 — Customer 360 Excel and dashboard Excel-only reports

**Refs:** PRD-4.3, PRD-4.15, DD-2.1, FD-2.3, FD-2.4, req-001 (2026-09-16)

## Customer 360

Section 4 (Documents & ledger) exports the **currently loaded** invoices, payments, credit notes, or ledger statement via `downloadExcel` SpreadsheetML. No extra pages, no backend `/export`. Disable when the tab has no loaded rows.

## Finance Dashboard reports

Statutory tabs keep Export Excel. `ReportExportButtons` shows Export PDF only when `onPdf` is passed; dashboard report consumers omit it.

GST register Excel still uses `GST_REGISTER_HEADERS` (SlNo through Postage).

## Gotcha

Standalone GstReports Monthly Sales / GST Collection print is out of scope; do not treat dashboard PDF removal as a global print deletion.
