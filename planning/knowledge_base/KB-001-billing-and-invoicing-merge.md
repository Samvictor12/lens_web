# KB-001 — Billing and invoicing merge

**Refs:** PRD-4.1, DD-2.1, req-001  
**Date:** 2026-08-27

## Pattern
Compose Billing + Customer Payments into one Accounting workspace rather than parallel top-level modules. Keep POST `/api/customer-payments` + `paymentAllocation.js` authoritative; extend with `applyAdvanceAmount` for prior `Customer.advance_credit`.

## Gotchas
- Month filter should drive KPIs / collection / awaiting; outstanding Invoices tab may still show overdue outside the month so collection work is not hidden.
- Advance-only receipts (cash=0) may skip bank GL posting but voucher still needs a cash/bank ledger FK.
- Preserve legacy query deep-links (`openForm=1`, `customerId`, `invoiceId`) via redirect to Record Payment route.
