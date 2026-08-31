# KB-015 — Vendor bill GL accrual (invoice-first timing)

**Refs:** PRD-4.4, DD-1.1, SD-1.1, req-014 (2026-08-31)

## Problem

Vendor AP was accruing at **PO receipt** (`postPurchaseReceipt` → `referenceType: PURCHASE_ORDER`) while Vendor Bill registration posted no GL — misaligned with M5 invoice-first payables.

## Fix

| Event | GL |
|-------|-----|
| PO receipt | **None** — operational/inventory only |
| Vendor Bill create | `postVendorInvoice` — Dr AC-1004 (+ AC-1005 if tax), Cr vendor AP; `referenceType: VENDOR_INVOICE` |
| Vendor Bill cancel (unpaid) | `postReversingTransaction` on accrual FT |
| Vendor Bill update (unpaid, amounts changed) | Reverse + re-post |
| Vendor payment | `postVendorPayment` — Dr AP, Cr Bank (unchanged) |

## Code

- `accountingService.postVendorInvoice`
- `vendorInvoiceService.create` / `cancel` / `update`
- `purchaseOrderService.receivePurchaseOrder` — no `postPurchaseReceipt`

## Idempotency

One accrual FT per `VendorInvoice` (lookup `referenceType: VENDOR_INVOICE`, `referenceId: invoice.id`).
