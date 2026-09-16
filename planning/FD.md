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
  - id: FD-2.4
    title: Finance dashboard operator flow
  - id: FD-2.5
    title: Inventory Audit and dashboard operator flow
---

# Flow Document

## FD-1.1 Primary operator journey

Lab ERP path: Sale Order → Production/QC → Dispatch → Billing → Customer Payment → Ledger. Procurement: PO → Inward → Vendor Invoice → Vendor Payment.

## FD-2.1 Billing and invoicing operator flow

1. Open **Billing and invoicing** (Accounting sidebar).
2. Set filters (default current month; optional customer / product).
3. Review KPI cards (billing, outstanding, awaiting, target/total/today collection).
4. **Awaiting Invoices:** select delivered unbilled SOs → Create Invoice. Set **Bill Date** (default today); Due Date defaults to bill date + customer credit days. GL posts on Issue using bill date; inventory cost credits AC-1004 when Sale Outward unit cost exists.
5. **Invoices:** customer-grouped outstanding → select invoices → Record Payment.
6. **Record Payment page:** choose customer → review dues → enter payment (+ optional advance apply) → FIFO allocate → confirm summary → save voucher.
7. **Payments / Credit Notes / Collection / Customer Ledger** tabs for history and analysis.

Legacy deep-link `/accounts/customer-payments?...` should redirect or open the merged Record Payment flow.

## FD-2.2 Income and loans operator flow

**Status:** shipped (req-003 update 2026-09-08).

1. Open **Income and loans**.
2. Review total / this-month income and loan cards.
3. Tab Income → Add → From (Capital) / To (Cash or Bank), amount, date, description, reference → save (Dr To / Cr From).
4. Tab Loans → Add → From (Loans) / To (Cash or Bank) → save.
5. Mark Expense (Vendor & payments): set Expense Date (default today, on or before due date) — that date is the GL date. Pay Expense Bill uses payment date vs Expense-for and Bank.

## FD-2.3 Customer 360 operator flow

**Status:** shipped (`req-003`, 2026-08-30).

1. Open **Customer 360** (Accounting sidebar → `/accounts/customer-360`).
2. Select customer.
3. Review Section 1 two-column details (identity left, financial right); click Section 2 KPI cards to load inline 5-row lists below; review spec-grouped top lens chart (Section 3); scroll to Section 4 tabs for invoices/payments/CN/ledger.

## FD-2.4 Finance dashboard operator flow

**Status:** shipped (`req-006`, 2026-08-31; PRD-4.15 collection + reports, 2026-09-14).

1. Open **Finance Dashboard** (Accounting sidebar → `/accounts/finance-dashboard`).
2. Review Row 1 period KPIs (**1st of As-of month → As of**) and Row 2 position KPIs (snapshot). Sales / Purchases include documents **created or dated** in that month window. FY chart is still Apr–Mar. Click **Cash & Bank Total** to scroll to Reports Cash & Bank (`#cash-bank`). Inventory Value should match Inventory Stock Summary total value (spec qty × cost).
3. Scan FY income vs expense trend and receivables >90d risk table; drill to Customer 360 or invoice from risk rows.
4. Review month expense breakup and **Collection — Target vs Actual** (Customer, Target, Actual, Balance).
5. Use report sub-tabs: Trial Balance, two-column Balance Sheet, MTD Profit & Loss, Day Book, General Ledger, Cash & Bank (list + Add account), GST invoice register. Export Excel or PDF on each tab.
6. Bookmarks to `/accounts/reports` and `/accounts/bank-accounts` redirect to Finance Dashboard (Cash & Bank hash for the latter). Sidebar has no Bank Accounts item.

## FD-2.5 Inventory Audit and dashboard operator flow

**Status:** shipped (`req-013`, 2026-08-31; PRD-4.14 tray transfer + cycle count, 2026-09-14).

1. Open **Inventory** → select **RX Godown** or **STOCK Godown** (left switcher).
2. **Dashboard tab:** review five KPI cards (Total Products, Total Stock, Total Value, this-month Inward/Outward qty as `inward / outward`, this-month value as `₹in / ₹out`) and the **cycle count** card (completion, accuracy, matched/variance/pending recount). Click the cycle-count card to open Audit `#cycle-count`. Use the High/Low/Out pie and sorted progress bars; click a bar for the spec popup. On Low or Out of Stock, select a product (all specs) and Raise PO (bulk grid qty = min). Review inward/outward trend (7/15/30/60/90 days), Top/Low 10 selling specs (30/60/90). Click Inward vs SO Queue bars or donut to open Inward Queue or SO Request Queue (no FIFO popup). Stock Summary sits in the 40% column (Products, Locations, Trays, Stock units, Total value).
3. **Audit tab:** **Tray Transfer** — pick source tray, destination tray (same godown, different trays), item, qty; submit writes TRANSFER ledger rows. **Cycle Count** — start/continue a session, pick rack/tray, enter physical qty vs book, recount or accept variance, post when counted trays have no pending recount/uncounted lines. Also configure spec thresholds (product, SPH/CYL/ADD range + step, generate grid, save). Use **Manual Add Stock** for single-spec inward or **Initialize Stock** for bulk grid inward.
4. After inward or threshold changes, return to Dashboard to verify alert counts and drill-down lists.
5. **Unit-cost movements (req-001):** Transactions tab — Sale/Return/Damage/Transfer consume OPEN inward/transfer sources (qty N splits to N tagged rows). Adjustment is not offered. PO inward stays unpriced until the vendor bill is registered.
