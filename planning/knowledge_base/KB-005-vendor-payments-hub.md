# KB-005 — Vendor & payments hub (Option A)

**Refs:** PRD-4.4, PRD-4.5, DD-2.1, KB-004, req-004 (2026-08-30)

## Model

- **Direct** = PO → `VendorInvoice` → `VendorPaymentVoucher` (M5, unchanged GL).
- **Indirect** = mark `Expense` with `vendorId` + `vendorExpenseStatus: MARKED` → accrual Dr category / Cr vendor AP → pay via voucher `expenseId` items.

## Target Payment

Same cumulative cap as KB-004: `dueDate <= LEAST(today, filter.endDate)` on vendor bills + marked indirect for KPI `targetPayment`.

## Gotchas

- Record Payment dialog is vendor-bills FIFO only today; backend `createFromInvoices` already accepts indirect items + advance.
- Target Payment **tab** balance cards are invoice-only; KPI includes indirect.
- Run migration `20260830120000_vendor_payments_hub` before deploy.
