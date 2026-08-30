# KB-011 — Vendor Payments hub UAT fixes

**Refs:** PRD-4.4, PRD-4.5, req-005

## Awaiting Bills — no date filter

`listAwaitingBills` lists POs with status `PO_PARTIAL_RECEIVED` or `RECEIVED` not yet on a vendor invoice. Hub month/date filters must **not** constrain `orderDate`; only `vendorId` and `productId` apply.

## Mark Indirect Expense — vendor ledgerId

`postVendorExpenseAccrual` requires `vendor.ledgerId`. Load vendor with `select: { id, code, ledgerId, ledger: { select: { id } } }` and pass `{ ...vendor, ledgerId: vendor.ledgerId || vendor.ledger?.id }`.

## Debit Note — invoice number text

Optional link uses `invoiceNumber` (text, e.g. `VINV-2026-0001`), not numeric DB id. Backend: `VendorInvoice.findFirst({ invoiceNumber, vendorId })`.

## Vendor Ledger — mapFromBackend

`src/services/vendor.js` `mapFromBackend` must include `ledgerId: backendData.ledgerId || backendData.ledger?.id` (mirror `customer.js`) for `VendorLedgerTab` Generate.
