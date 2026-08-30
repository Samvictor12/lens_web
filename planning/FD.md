---
v: 1
sections:
  - id: FD-1.1
    title: Primary operator journey
  - id: FD-2.1
    title: Billing and invoicing operator flow
  - id: FD-2.2
    title: Income and loans operator flow
  - id: FD-2.3
    title: Customer 360 operator flow
---

# Flow Document

## FD-1.1 Primary operator journey

Lab ERP path: Sale Order → Production/QC → Dispatch → Billing → Customer Payment → Ledger. Procurement: PO → Inward → Vendor Invoice → Vendor Payment.

## FD-2.1 Billing and invoicing operator flow

1. Open **Billing and invoicing** (Accounting sidebar).
2. Set filters (default current month; optional customer / product).
3. Review KPI cards (billing, outstanding, awaiting, target/total/today collection).
4. **Awaiting Invoices:** select delivered unbilled SOs → Create Invoice.
5. **Invoices:** customer-grouped outstanding → select invoices → Record Payment.
6. **Record Payment page:** choose customer → review dues → enter payment (+ optional advance apply) → FIFO allocate → confirm summary → save voucher.
7. **Payments / Credit Notes / Collection / Customer Ledger** tabs for history and analysis.

Legacy deep-link `/accounts/customer-payments?...` should redirect or open the merged Record Payment flow.

## FD-2.2 Income and loans operator flow

1. Open **Income and loans**.
2. Review total / this-month income and loan cards.
3. Tab Income or Loans → Add → From/To, amount, date, description, reference → save (posts ledgers).
4. Open ledger report for income or loan category as needed.

## FD-2.3 Customer 360 operator flow

**Status:** shipped (`req-003`, 2026-08-30).

1. Open **Customer 360** (Accounting sidebar → `/accounts/customer-360`).
2. Select customer.
3. Review Section 1 metrics; click Section 2 cards for 5-row lists; review charts (Section 3); use Section 4 tabs for invoices/payments/CN/ledger.
