# KB-014 — Indirect expense liability-ledger refactor

**Refs:** PRD-4.5, DD-2.1, SD-1.1, req-007 (2026-08-31)

## Problem

Indirect expenses were keyed on `vendorId` with accrual to vendor AP sub-ledger. Business needs accrual against any **liability posting ledger** (Salary Payable, Rent Payable, etc.) — not tied to a vendor master.

## Solution

| Step | GL | Identity |
|------|-----|----------|
| **Mark** | Dr expense category / Cr liability ledger | `Expense.liabilityLedgerId` |
| **Pay** | Dr liability / Cr bank | `IndirectExpensePaymentVoucher` (not `VendorPaymentVoucher`) |

## UI

- **Mark Indirect Expense:** "Expense for" = `GET /api/ledgers/liability-posting`
- **Indirect Expenses tab:** column + optional filter by liability ledger
- **Pay Expense Bill:** header action on indirect tab; mirror vendor Record Payment UX (FIFO by `dueDate`)

## APIs

- `POST /api/vendor-indirect-expenses` — `liabilityLedgerId` required; reject `vendorId`
- `GET /api/vendor-indirect-expenses` — `where liabilityLedgerId IS NOT NULL`
- `POST /api/vendor-indirect-expenses/pay` — liability + bank + FIFO items

## Migration

`20260831120000_indirect_expense_liability_ledger`: backfill `liabilityLedgerId` from `Vendor.ledgerId` where `vendorExpenseStatus` set; then `vendorId = null`. No GL reversal (vendor AP sub-ledgers are LIABILITY type).

## Unchanged

Vendor bill payment (`POST /api/vendor-payments/from-invoices`) — invoice-only; no indirect items.
