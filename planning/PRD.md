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
  - id: PRD-4.9
    title: Inventory unit-cost transaction ledger
    status: shipped
    module: inventory
    tsd: [TSD-1.1]
    dd: [DD-1.1]
    sd: [SD-1.1]
    fd: [FD-2.5]
  - id: PRD-4.10
    title: Document-dated GL and sale inventory credit
    status: shipped
    module: accounting
    tsd: [TSD-1.1]
    dd: [DD-1.1, DD-2.1]
    sd: [SD-1.1, SD-2.1]
    fd: [FD-2.1]
  - id: PRD-4.11
    title: Capital Loans COA and expense dates
    status: shipped
    module: accounting
    tsd: [TSD-1.1]
    dd: [DD-1.1, DD-2.1]
    sd: [SD-1.1, SD-2.2]
    fd: [FD-2.2]
  - id: PRD-4.12
    title: Inventory dashboard KPI and chart corrections
    status: shipped
    module: inventory
    tsd: [TSD-1.1]
    dd: [DD-1.1]
    sd: [SD-1.1]
    fd: [FD-2.5]
  - id: PRD-4.13
    title: Inventory dashboard layout and navigation polish
    status: shipped
    module: inventory
    tsd: [TSD-1.1]
    dd: [DD-1.1]
    sd: [SD-1.1]
    fd: [FD-2.5]
  - id: PRD-4.14
    title: Inventory tray transfer and cycle-count audit
    status: shipped
    module: inventory
    tsd: [TSD-1.1]
    dd: [DD-1.1]
    sd: [SD-1.1]
    fd: [FD-2.5]
  - id: PRD-4.15
    title: Finance dashboard collection report and statutory reports
    status: shipped
    module: accounting
    tsd: [TSD-1.1]
    dd: [DD-2.1]
    sd: [SD-1.1, SD-2.1]
    fd: [FD-2.4]
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

**Status:** shipped (`req-006`, 2026-08-31; KPI zeros / calendar-day 2026-09-15; Row-1 month-start→As-of 2026-09-15).

- Route: `/accounts/finance-dashboard` (first item under Accounting sidebar).
- Row 1 KPIs (month start → As-of): Sales, Collection, Purchases, Expenses, Gross Profit, Net Profit. Window = **1st of As-of month 00:00 local** through **As-of 23:59:59.999** (not FY 1 Apr). Sales = non-cancelled invoice `totalAmount` where `billDate` **or** `createdAt` in window. Purchases = vendor `invoiceDate` **or** `createdAt`. JSON keys remain `today.*`.
- Row 2 KPIs (position): Cash & Bank Total, Collection Target (month), Receivable Outstanding, Payables Pending, Inventory Value — snapshots as of As-of, not FYTD (`inventoryValue` = stock-summary cost×qty / specQty).
- UI binds `unwrapDashboardPayload` (`{ success, data }` → inner `{ today, position }`); KPI numbers `parseFloat` Prisma Decimal/`_sum`.
- FY income vs expense trend chart (India Apr–Mar); portfolio receivables >90d risk table.
- Expense breakup (month, 40%) + collection Target vs Actual table (60%) — PRD-4.15 replaced MTD P&L snapshot.
- Report sub-tabs: see PRD-4.15 (TB, BS, P&L, Day Book, General Ledger, Cash & Bank, GST register).
- `GET /api/financial-reports/dashboard` (`collectionByCustomer`), `GET /api/financial-reports/trial-balance-grouped`.
- Legacy `/accounts/reports` redirects to Finance Dashboard.

## PRD-4.9 Inventory unit-cost transaction ledger

**Status:** shipped (`req-001`, 2026-09-08).

Close the gap between operational stock and unit-cost traceability. Inward (PO / Direct) and transfer transactions carry unit price and remain OPEN until fully tagged by outward/damage/transfer. Outward (Sale / Return / Damage) and transfer consume source inward/transfer rows one unit at a time (qty N → N rows), each tagged to one source. Fully tagged source rows become Consumed. Remove Adjustment as a user type. Inward unit price is finalized when the vendor bill is generated (not at PO receipt).

### Acceptance
- PO Inward and Direct Inward create tray-level transactions with value; bulk and single PO both persist per tray.
- Sale Outward / Return Outward / Damage must tag one or more OPEN inward/transfer rows for unit price; qty N splits into N transactions.
- Transfer between trays/racks/godowns consumes the tagged source (same unit price on the new transfer row); qty N → N transfer rows. Adjustment type removed from operator UI.
- Source inward/transfer status becomes Consumed when remaining qty is zero.

## PRD-4.10 Document-dated GL and sale inventory credit

**Status:** shipped (`req-002`, 2026-09-08).

Finance transactions use the document date the operator sets (vendor invoice date, customer bill date, payment date, expense date, income date), defaulting to today. Customer Create Invoice / Bill gains an editable Bill Date. On customer bill, Inventory / Stock (AC-1004) is credited from Sale Outward unit cost connected to that sale order, in addition to existing Customer Dr / Sales + GST Cr.

### Acceptance
- Vendor bill GL remains Dr Inventory / Cr Vendor; FT date = invoice date (editable, default today). Vendor payment FT date = payment date.
- Customer invoice has Bill Date (editable, default today); FT date = bill date. Payment FT date = payment date.
- Sale bill also Cr Inventory / Stock from connected Sale Outward unit cost (Customer Dr, Sales Revenue + GST Cr unchanged).

## PRD-4.11 Capital Loans COA and expense dates

**Status:** shipped (`req-003`, 2026-09-08).

Reclassify Capital from Equity to Liability. Liability parent groups are Capital, Loans, and Current Liability. Income From is Capital → Bank (asset); Loan From is Loans → Bank. Mark expense records against Expense for (liability) and Expense Category; pay expense bill records Expense for and Bank. Expense Date auto-fills today, is editable, is the GL transaction date, and must be on or before due date.

### Acceptance
- Capital ledgers/groups are LIABILITY (not EQUITY). Liability has three parent groups: Capital, Loans, Current Liability.
- Income picker From = Capital group; Loan picker From = Loans group; To = Bank/Cash (asset). GL posts Dr To / Cr From.
- Mark expense: Expense Date field (default today, before due date); GL date = expense date. Pay expense: Dr liability / Cr bank using payment date.

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

## PRD-4.12 Inventory dashboard KPI and chart corrections

**Status:** shipped (`req-001`, 2026-09-09). Extends PRD-4.8.

- **KPIs:** Total Products, Total Stock (units = specQty sum), Total Value (₹ = stock-summary grouping cost×qty, not `InventoryStock` bucket), calendar-month Inward/Outward qty and value. Low/Out/Over are not KPI cards.
- **Stock status:** Pie of High / Low / Out (High = OVER: `specQty > maxQty`) plus progress bars sorted by share of (High+Low+Out). Click bar → spec popup grouped by product; selecting a product selects all its specs. Low and Out: Raise PO → bulk PO qty = each spec’s `minQty` (same `lens_id` only).
- **Trend:** inward/outward quantity chart (godown-scoped).
- **Top 10 / Low 10:** `OUTWARD_SALE` by product + SPH/CYL/ADD; 30/60/90 days; bar % = unitsSold / sum of those 10.
- **Donut:** pending Inward vs SO Request Queue counts; click slice → 10 oldest FIFO rows.
- APIs: enhanced `GET /api/inventory/dashboard`, spec-grain `GET /api/inventory/reports/top-low-selling`, reuse `GET /spec-alerts` and `GET /reports/value`.

## PRD-4.13 Inventory dashboard layout and navigation polish

**Status:** shipped (`req-001`, 2026-09-09). Extends PRD-4.12.

- **KPIs:** five cards — Total Products, Total Stock, Total Value, this-month Inward/Outward qty as one card (`inward / outward`), this-month Inward/Outward value as one card (`₹in / ₹out`).
- **Stock status / trend row:** Stock status (High / Low / Out) **40%** + Inward / Outward Quantity Trend **60%**.
- **Inward vs SO Queue:** donut + Stock-status-style progress bars (share of Inward+SO). Click Inward → Inward Queue tab; click SO Queue → SO Request Queue tab. No FIFO popup.
- **Bottom row:** Inward vs SO Queue 60% + Stock Summary 40% (Products, Locations, Trays, Stock units, Total value only).
- Dashboard payload adds `locationCount` and `trayCount` (distinct non-null ids). No schema change.

## PRD-4.14 Inventory tray transfer and cycle-count audit

**Status:** shipped (`req-001`, 2026-09-14). Extends PRD-4.8 (Audit tab) and PRD-4.13 (Dashboard).

- **Audit — tray transfer:** On `/inventory/{stock|rx}/audit`, operators move items from one tray to another (same godown). Full or partial qty. Each move writes `TRANSFER` `InventoryTransaction` rows (source tray → destination tray), updates `InventoryItem` location/tray, and updates stock buckets in one transaction. Godown isolation unchanged.
- **Audit — physical cycle count:** Cycle-count sessions scoped by godown, location (rack), and tray. Operator compares book quantity (system) to counted physical quantity per spec in the tray. Record match / variance / recount. Session lifecycle: planned → in progress → pending review (if variance over threshold) → posted. Cycle count is verification-only (no ADJUSTMENT/DAMAGE/INWARD writes). Accuracy and completion metrics come from the open session if any, else the latest POSTED session in the calendar month.
- **Dashboard:** One card showing cycle-count **completion** (trays counted vs in-scope), **accuracy** (matched lines vs counted), and **outcomes** (matched / variance / pending recount). Click-through to Audit cycle-count section. Godown-scoped.

## PRD-4.15 Finance dashboard collection report and statutory reports

**Status:** shipped (`req-001`, 2026-09-14). Extends PRD-4.6 / FD-2.4.

Replace the MTD P&L snapshot with a customer Target vs Actual collection table (Customer, Target, Actual, Balance) for the current month. Cash & Bank KPI scrolls to an embedded Cash & Bank accounts list with current balances and Add; Accounting sidebar Bank Accounts removed (`/accounts/bank-accounts` redirects). Report tabs: Trial Balance, two-column detailed Balance Sheet, industrial MTD P&L, Day Book, General Ledger, Cash & Bank, GST invoice register (Excel template). Excel + PDF (print-to-PDF) on all report tabs.

### Acceptance
- Dashboard P&L Snapshot (MTD) is replaced by customer collection Target / Actual / Balance for the current month.
- Cash & Bank Total is clickable and scrolls to Cash & Bank report; operators can add cash/bank ledgers there; sidebar Bank Accounts is removed.
- Reports tab set: Trial Balance, Balance Sheet (assets left / liabilities right, detailed), Profit & Loss (current month, detailed), Day Book, General Ledger, Cash & Bank, GST Report (Excel template columns).
- Every report tab exports Excel and PDF. GST Excel layout matches `GST Report Format.xlsx` (SlNo through Postage).

## PRD-5.1 Authentication session continuity

**Status:** shipped (`req-001`, 2026-09-06).

Operators stay signed in for the configured access + refresh TTL while they are using the app. A login on another browser or machine does not instantly evict an existing valid session or present it as a session timeout. Session-expired UI is reserved for a truly expired or revoked token on that device. One `RefreshToken` row per device (`User.refreshTokens` 1:n).

## Shipped index (legacy)

See `docs/planning-archive/Project_docs.md` and `docs/planning-archive/features/` for historical feature files. Do not treat archive as live contract.
