---
v: 1
modules:
  - accounting
  - billing
  - sales
  - crm
  - inventory
  - procurement
  - quality
  - admin
requirements:
  - id: PRD-4.1
    title: Billing and invoicing merge
    status: shipped
    module: accounting
    tsd: [TSD-1.1]
    dd: [DD-1.1, DD-2.1]
    sd: [SD-1.1, SD-2.1]
    fd: [FD-2.1]
  - id: PRD-4.2
    title: Income and loans workspace
    status: shipped
    module: accounting
    tsd: [TSD-1.1]
    dd: [DD-1.1, DD-2.1]
    sd: [SD-1.1, SD-2.2]
    fd: [FD-2.2]
  - id: PRD-4.3
    title: Customer 360 view
    status: shipped
    module: accounting
    tsd: [TSD-1.1]
    dd: [DD-1.1, DD-2.1]
    sd: [SD-1.1]
    fd: [FD-2.3]
  - id: PRD-4.4
    title: Vendor and payments restructure
    status: shipped
    module: accounting
    tsd: [TSD-1.1]
    dd: [DD-1.1, DD-2.1]
    sd: [SD-1.1]
    fd: [FD-2.1]
  - id: PRD-4.5
    title: Vendor indirect expenses accrual
    status: shipped
    module: accounting
    tsd: [TSD-1.1]
    dd: [DD-1.1, DD-2.1]
    sd: [SD-1.1]
    fd: [FD-2.1]
  - id: PRD-4.6
    title: Finance dashboard
    status: draft
    module: accounting
    tsd: []
    dd: []
    sd: []
    fd: []
    note: HOLD — user briefs later (diagrams)
  - id: PRD-4.7
    title: Business intelligence Finance and Lab
    status: draft
    module: accounting
    tsd: []
    dd: []
    sd: []
    fd: []
    note: HOLD — user briefs later (diagrams)
---

# Project Requirements Document

## Triage

| Class | Criteria | Route |
|-------|----------|-------|
| **Trivial** | ≤3 lines, one file, no SD/schema/API change | Orchestrator fixes directly |
| **Standard bug** | Incorrect behaviour | `execution_state` request `type: bug` |
| **New feature** | New capability | New request `type: feature` |
| **Modification** | Extends shipped PRD section | New request; check `status: shipped` |

## PRD-0.1 Project summary

Lens Web is an ERP for an optical lens laboratory/warehouse: catalog, CRM, procurement, sales/dispatch, inventory, quality/shop floor, and financial accounting (COA, billing, customer/vendor payments, income, expenses, reports). Users: Accounts, Admin, sales, lab operators.

## PRD-0.2 Module inventory (shipped baseline)

Migrated from lean `Project_docs.md`. Shipped modules include Catalog, CRM, Procurement, Sales/Billing, Inventory, Accounting (COA, payments, income, expenses, bank rec, reports), Quality, Production, Admin. Legacy detail: `docs/planning-archive/`.

## PRD-4.1 Billing and invoicing merge

**Status:** shipped (`req-001`, 2026-08-27).

Merged top-level Billing and Accounting Customer Payments into **Billing and invoicing** under Accounting.

### Shipped
- Canonical UI: `/accounts/billing-and-invoicing`; Record Payment: `/accounts/billing-and-invoicing/record-payment`
- Redirects: `/billing`, `/accounts/customer-payments` (incl. `openForm=1`)
- Shared filters (default current month, customer, product) → KPIs + tabs
- KPIs: Total Billing, Outstanding, Awaiting Bills, Target Collection (cumulative collectible: unpaid on `ISSUED`/`PARTIALLY_PAID` where `dueDate <= LEAST(today, filter.endDate)` — includes prior-month overdue; no `startDate` lower bound), Total/Today Collection
- Tabs: Awaiting Invoices | Invoices (customer-grouped + multi-select) | Payments | Credit Notes | Collection (Balance to Collect + Collections Received) | Customer Ledger
- Record Payment page: 5 sections; apply prior `advance_credit` + FIFO; POST `/api/customer-payments`
- CN remains document-only

### Note
Invoices tab lists all outstanding (customer/product filtered); month filter emphasizes KPIs / Payments / Collection more than hiding overdue outside the month. **Awaiting tab (req-009):** lists all delivered un-billed SOs — customer/product filter only, not date. **DRAFT invoices** appear on Invoices tab; issue before Record Payment.

## PRD-4.2 Income and loans workspace

**Status:** shipped (`req-002`, 2026-08-27).

- Sidebar: **Income and loans** (`/accounts/income`)
- Cards: Total Income, Total Loans, Total Income this Month, Total Loans this Month (Loan = `IncomeCategory.name === 'Loan'`)
- Tabs: Income (exclude Loan) | Loans (Loan only) + Add (Loans locks Loan category)
- Form: From/To, amount, date, description, Reference No.; posting unchanged Dr To / Cr From
- Ledger deep-links: `/accounts/reports?tab=ledger&ledgerId=…`

## PRD-4.3 Customer 360 view

**Status:** shipped (`req-003`, 2026-08-30).

- Route: `/accounts/customer-360` (Accounting sidebar).
- Customer dropdown.
- Section 1: Two columns — left: customer identity (name, shop, email, phone, sales person, delivery person, address); right: billing cycle, credit limit, outstanding, open credit notes (ISSUED), last payment, discount total (₹ sum).
- Section 2: Clickable KPI cards with inline list below (5 rows + pagination, no side drawer): Orders this month, in Production, in Dispatch, Delivered, Collection target, Collection actual.
- Section 3: Top lens orders by product + SPH/CYL/ADD spec; Credit Analysis (30/60/90 days due count + amount).
- Section 4 tabs: Invoices (outstanding), Payments, Credit Notes, Customer Ledger.

## PRD-4.4 Vendor and payments restructure

**Status:** shipped (`req-004`, 2026-08-30). Option A hub — all vendor-linked payables.

### Shipped
- Canonical UI: `/accounts/vendor-payments` (sidebar **Vendor & payments**); Record Payment: `/accounts/vendor-payments/record-payment`
- Shared filters (default current month, vendor, product) → KPIs + tabs
- KPIs: Total Purchases, Outstanding, Awaiting Bills, Total Indirect Expenses, Target Payment (KB-004 cumulative cap), Total Payment
- Tabs: Awaiting Vendor Bills | Vendor Bills (vendor-grouped + multi-select) | Indirect Expenses | Payments | Debit Notes | Target Payment | Vendor Ledger
- Direct track: M5 PO → VendorInvoice → VendorPaymentVoucher (GL unchanged)
- `GET /api/vendor-payments/stats`, extended `outstanding-invoices` (groupBy, collectible, productId)

### Follow-up
- Record Payment UI: indirect allocation toggle + advance apply (backend ready)

## PRD-4.5 Vendor indirect expenses accrual

**Status:** shipped (`req-004`, 2026-08-30). Lives inside Vendor & payments hub (Option A).

### Shipped
- Mark-first: `POST /api/vendor-indirect-expenses` — Dr expense category / Cr vendor AP (`postVendorExpenseAccrual`)
- `Expense.vendorId` + `vendorExpenseStatus` (MARKED / PARTIALLY_PAID / PAID)
- Pay via `VendorPaymentVoucherItem.expenseId`; `Vendor.advance_credit` on schema
- Indirect Expenses tab in vendor hub; legacy `/accounts/expenses` for non-vendor overhead only

## PRD-4.6–4.7 Held

| ID | Title | Reason |
|----|-------|--------|
| PRD-4.4 | Vendor and payments | — |
| PRD-4.5 | Vendor indirect expenses | — |
| PRD-4.6 | Finance dashboard | User will brief later + diagrams |
| PRD-4.7 | Business intelligence | User will brief later + diagrams |

Do not create active `execution_state` work for these until briefed.

## Shipped index (legacy)

See `docs/planning-archive/Project_docs.md` and `docs/planning-archive/features/` for historical feature files. Do not treat archive as live contract.
