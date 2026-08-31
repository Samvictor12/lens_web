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
4. **Awaiting Invoices:** select delivered unbilled SOs → Create Invoice.
5. **Invoices:** customer-grouped outstanding → select invoices → Record Payment.
6. **Record Payment page:** choose customer → review dues → enter payment (+ optional advance apply) → FIFO allocate → confirm summary → save voucher.
7. **Payments / Credit Notes / Collection / Customer Ledger** tabs for history and analysis.

Legacy deep-link `/accounts/customer-payments?...` should redirect or open the merged Record Payment flow.

## FD-2.2 Income and loans operator flow

1. Open **Income and loans**.
2. Review total / this-month income and loan cards.
3. Tab Income or Loans → Add → From/To, amount, date, description, reference → save (posts ledgers; category assigned automatically).

## FD-2.3 Customer 360 operator flow

**Status:** shipped (`req-003`, 2026-08-30).

1. Open **Customer 360** (Accounting sidebar → `/accounts/customer-360`).
2. Select customer.
3. Review Section 1 two-column details (identity left, financial right); click Section 2 KPI cards to load inline 5-row lists below; review spec-grouped top lens chart (Section 3); scroll to Section 4 tabs for invoices/payments/CN/ledger.

## FD-2.4 Finance dashboard operator flow

**Status:** shipped (`req-006`, 2026-08-31).

1. Open **Finance Dashboard** (Accounting sidebar → `/accounts/finance-dashboard`).
2. Review Row 1 today KPIs and Row 2 position KPIs (single server bundle).
3. Scan FY income vs expense trend and receivables >90d risk table; drill to Customer 360 or invoice from risk rows.
4. Review month expense breakup and P&L snapshot (inventory + assets/liabilities summary).
5. Use report sub-tabs: grouped Trial Balance (SD/SC expanded; optional flat drill-down), Balance Sheet, Day Book, Monthly Sales, GST Collection (invoice-level output GST detail).
6. Bookmarks to `/accounts/reports` redirect to Finance Dashboard; standalone Financial Reports page removed.

## FD-2.5 Inventory Audit and dashboard operator flow

**Status:** shipped (`req-013`, 2026-08-31).

1. Open **Inventory** → select **RX Godown** or **STOCK Godown** (left switcher).
2. **Dashboard tab:** review six KPI cards (Total Products, Total Stock, Total Value, Low, Out, Over). Click Low/Out/Over to see filtered spec alert list; click again to deselect and restore inward/outward trend chart. Review Top 10 / Least 10 selling products below.
3. **Audit tab:** configure spec thresholds — select product, set SPH/CYL/ADD range + step (default 0.25), generate grid, edit per-cell min/max, save. Use **Manual Add Stock** for single-spec inward or **Initialize Stock** for bulk grid inward.
4. After inward or threshold changes, return to Dashboard to verify alert counts and drill-down lists.
