# KB-007 — Billing & invoicing tab-context header actions

**Refs:** PRD-4.1, DD-2.1, KB-001, req-007 (2026-08-30)

## Header CTA map

Single primary action in `BillingAndInvoicingMain` header per tab:

| Tab | Button |
|-----|--------|
| Awaiting | Create Invoice |
| Invoices | Record Payment |
| Credit Notes | New Credit Note |
| Payments / Collection / Ledger | (none) |

## Tab body cleanup

- **Awaiting** (`DispatchedOrdersTab`): no per-row Bill buttons when `onBillCustomer` omitted; header Create Invoice prefills `filters.customerId`.
- **Credit Notes** (`CreditDebitNotesTab`): toolbar New button hidden when `createOpen` controlled from parent.
- **Invoices**: multi-select still pre-fills Record Payment dialog from header.

## Record Payment

Already in-page via `CreateCustomerPaymentDialog`. Legacy `/accounts/billing-and-invoicing/record-payment` redirects to `?tab=invoices&openPayment=1`.

## Legacy BillingMain

`BillingMain.jsx` still passes `onBillCustomer` to `DispatchedOrdersTab` — per-row Bill buttons remain on legacy `/billing` redirect target if used standalone.
