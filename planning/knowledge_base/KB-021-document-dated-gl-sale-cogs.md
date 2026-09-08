# KB-021 Document-dated GL and sale inventory credit

**Refs:** PRD-4.10, DD-2.1, SD-2.1, req-002 (2026-09-08)

Never use posting-clock `now()` for bill/payment FTs. Pass the operator document date: vendor `invoiceDate`, customer `Invoice.billDate`, voucher `paymentDate`.

`Invoice.billDate` is optional (legacy rows may be null) and distinct from `createdAt`. New invoices still default to today. Due date defaults to billDate + credit days. Issue FT date uses `billDate` or `createdAt`.

On customer invoice issue: keep Dr AR / Cr Sales / Cr GST. If sum of linked `OUTWARD_SALE.unitPrice` ≥ 0.01, also Dr AC-4001 / Cr AC-1004 (balanced pair). Skip both if cost is under 0.01. Reverse those lines on invoice cancel.

Do not change PO-receipt (still no GL) or inventory consume/tagging.
