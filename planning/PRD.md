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
    status: shipped
    module: accounting
    tsd: [TSD-1.1]
    dd: [DD-1.1, DD-2.1]
    sd: [SD-1.1]
    fd: [FD-2.4]
  - id: PRD-4.7
    title: Business intelligence Finance and Lab
    status: draft
    module: accounting
    tsd: []
    dd: []
    sd: []
    fd: []
    note: HOLD — user briefs later (diagrams)
  - id: PRD-4.8
    title: Inventory Audit and dashboard overhaul
    status: shipped
    module: inventory
    tsd: [TSD-1.1]
    dd: [DD-1.1]
    sd: [SD-1.1]
    fd: [FD-2.5]
  - id: PRD-5.1
    title: Authentication session continuity
    status: shipped
    module: admin
    tsd: [TSD-1.1]
    dd: [DD-1.1]
    sd: [SD-1.1]
    fd: []
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
- Tabs: Income (exclude Loan) | Loans (Loan only) + Add
- Form: From/To, amount, date, description, Reference No.; posting unchanged Dr To / Cr From
- Category auto-assigned internally (Income: Bank Transfer else first non-loan; Loans: Loan category) — not shown in UI
- No ledger deep-link header buttons (req-017)

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
- Direct track: M5 PO → VendorInvoice → VendorPaymentVoucher; GL accrual on Vendor Bill (`postVendorInvoice`, KB-015), payment closes AP (req-014)
- `GET /api/vendor-payments/stats`, extended `outstanding-invoices` (groupBy, collectible, productId)

### Follow-up
- Record Payment UI: indirect allocation toggle + advance apply (backend ready)

## PRD-4.5 Vendor indirect expenses accrual

**Status:** shipped (`req-004`, 2026-08-30; liability-ledger refactor `req-007`, 2026-08-31). Lives inside Vendor & payments hub (Option A).

### Shipped
- Mark-first: `POST /api/vendor-indirect-expenses` — **Expense for** = liability posting ledger (`liabilityLedgerId`); Dr expense category / Cr liability (`postIndirectExpenseAccrual`)
- `Expense.liabilityLedgerId` + `vendorExpenseStatus` (MARKED / PARTIALLY_PAID / PAID); `vendorId` null on indirect track
- Pay via **Pay Expense Bill** dialog: `POST /api/vendor-indirect-expenses/pay` — Dr liability / Cr bank; `IndirectExpensePaymentVoucher` + items (FIFO by due date)
- `GET /api/ledgers/liability-posting` — picker for all active LIABILITY posting ledgers
- Indirect Expenses tab: Mark Expense + Pay Expense Bill header actions; optional liability filter
- Vendor bill payment unchanged (`POST /api/vendor-payments/from-invoices` invoice-only)
- Legacy `/accounts/expenses` for non-vendor overhead only

## PRD-4.6 Finance dashboard

**Status:** shipped (`req-006`, 2026-08-31).

- Route: `/accounts/finance-dashboard` (first item under Accounting sidebar).
- Row 1 KPIs (today): Today Sales, Today Collection, Today Purchases, Today Expenses, Gross Profit, Net Profit.
- Row 2 KPIs (position): Cash & Bank Total, Collection Target (month), Receivable Outstanding, Payables Pending, Inventory Value.
- FY income vs expense trend chart (India Apr–Mar); portfolio receivables >90d risk table.
- Expense breakup (month, 40%) + P&L snapshot with inventory and balance-sheet summary (60%).
- Report sub-tabs: Trial Balance (grouped SD/SC), Balance Sheet, Day Book, GST Reports (embedded).
- `GET /api/financial-reports/dashboard`, `GET /api/financial-reports/trial-balance-grouped`.
- Legacy `/accounts/reports` retained for full Financial Reports entry.

## PRD-4.7 Held

| ID | Title | Reason |
|----|-------|--------|
| PRD-4.7 | Business intelligence | User will brief later + diagrams |

Do not create active `execution_state` work for PRD-4.7 until briefed.

## PRD-4.8 Inventory Audit and dashboard overhaul

**Status:** shipped (`req-013`, 2026-08-31).

- Routes: `/inventory/{stock|rx}/audit` (new Audit tab); Dashboard tab updated for both godowns.
- **Audit tab:** Manual Add Stock (single-spec `INWARD_DIRECT`), Initialize Stock (bulk SPH/CYL/ADD grid), Spec Threshold editor (range/step generate + per-cell min/max), spec alert summary.
- **Spec thresholds:** `InventorySpecThreshold` per `lens_id` + `godownType` + normalized `sph/cyl/add`; min/max qty; godown-scoped (RX vs STOCK).
- **Alerts (computed-only):** OUT = threshold row + `specQty===0`; LOW = `0 < specQty < minQty`; OVER = `maxQty` set and `specQty > maxQty`. `InventoryAlert` table unchanged/unused for threshold alerts. Product-level `LensProductMaster.minThresholdQty`/`maxThresholdQty` deprecated for dashboard KPIs.
- **Dashboard KPIs:** Total Products, Total Stock (units), Total Value, Low Stock, Out of Stock, Over Stock — godown-scoped.
- **Dashboard sections:** Clickable Low/Out/Over KPI cards → filtered spec alert list (50%); no selection → inward/outward quantity trend (100%). Top 10 / Least 10 selling products side-by-side (50/50).
- Initialize Stock removed from Dashboard; accessible only via Audit tab.
- APIs: `GET /api/inventory/spec-alerts`, `GET|POST|DELETE /api/inventory/spec-thresholds`, `POST /api/inventory/spec-thresholds/generate`, enhanced `GET /api/inventory/dashboard`.

## PRD-5.1 Authentication session continuity

**Status:** shipped (`req-001`, 2026-09-06).

Operators stay signed in for the configured access + refresh TTL while they are using the app. A login on another browser or machine does not instantly evict an existing valid session or present it as a session timeout. Session-expired UI is reserved for a truly expired or revoked token on that device. One `RefreshToken` row per device (`User.refreshTokens` 1:n).

## Shipped index (legacy)

See `docs/planning-archive/Project_docs.md` and `docs/planning-archive/features/` for historical feature files. Do not treat archive as live contract.
