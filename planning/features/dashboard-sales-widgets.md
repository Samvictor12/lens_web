## Meta

- id: dashboard-sales-widgets
- title: Real sales widgets on Dashboard (today's sales, top 5, top product)
- type: feature
- status: DONE
- contract_version: 1
- last_updated: 2026-06-21

## 1 Requirement

`src/pages/Dashboard.jsx` is currently wired entirely to mock data (`dummySaleOrders`, `dummyCustomers`, `dummyLensVariants`, `dummyPurchaseOrders` from `@/lib/dummyData`) — none of it reflects real sales. The user wants real, live widgets: (1) Today's total sales, (2) Top 5 sales (highest-value sale/sale orders, or top customers by sales — to confirm during contract), (3) Top selling product.

Replace the relevant dummy-data sections of the Dashboard with real backend-driven widgets for today's sales total, a top-5 sales list, and the top-selling product, sourced from Sale Order / Billing data.

## 2 Contract

**Data source decision.** "Sales" = `Invoice` (not `SaleOrder`), consistent with `invoice-quick-close`/`pnl-asset-liability-fix`: `Invoice.totalAmount`/`paidAmount`/`createdAt`/`status` are the system of record for billed revenue. `SaleOrder` has no own total; its billable amount is derived from `lensPrice+fittingPrice+tintingPrice+rightEyeExtra+leftEyeExtra-discount%+additionalPrice[]` (formula already used in `invoiceService.js` lines 84-93). Product identity lives on `SaleOrder.lens_id → LensProductMaster.lens_name` — `Invoice` has no line items of its own, only `saleOrders[]` (1-to-many). `SaleOrderItem` exists but carries no product FK, so it is unused here.

**Assumption — "Today's total sales":** sum of `Invoice.totalAmount` where `createdAt` is today and `status != CANCELLED`. (Invoice creation date, not sale-order delivery date, since invoicing date is what "sale" means for revenue booking.)

**Assumption — "Top 5 sales":** the 5 highest-value individual invoices created today (`status != CANCELLED`, ordered by `totalAmount desc`, limit 5), each row showing invoice no., customer name, amount, status. Chosen over "top 5 customers" because invoices are the atomic "sale" unit and the dashboard already has a per-order list pattern (`recentOrders`) to replace 1:1. If today has <5 invoices, return however many exist (no padding/backfill to prior days).

**Assumption — "Top selling product":** single product (by `LensProductMaster.lens_name`) with the highest summed revenue across all `SaleOrder`s belonging to today's non-cancelled invoices, where per-order revenue = the formula above. Revenue (not quantity) chosen because it's directly comparable to the other two widgets (all ₹ amounts) and avoids double-counting partial-eye orders. Scope = today only, matching the other two widgets (keeps the whole dashboard one consistent "today" snapshot, no separate MTD/all-time toggle in this pass).

**Backend.** No existing endpoint covers this (`financialReportService.getDayBook`/`getSummary` operate on ledger `FinancialTransaction`/`TransactionEntry`, not `Invoice`/`SaleOrder`, so not reused). Add one new endpoint:
- `GET /api/dashboard/summary` → new `src/backend/routes/dashboard.routes.js` + `src/backend/controllers/dashboardController.js` + new method `DashboardService.getTodaySummary()` in new `src/backend/services/dashboardService.js`.
- Query: `prisma.invoice.findMany({ where: { createdAt: { gte: startOfToday, lte: endOfToday }, status: { not: 'CANCELLED' } }, include: { customer: { select: { name: true } }, saleOrders: { select: { lensPrice, fittingPrice, tintingPrice, rightEyeExtra, leftEyeExtra, discount, additionalPrice, lensProduct: { select: { lens_name } } } } } })`. Compute `todaySales` (sum totalAmount), `top5Sales` (sort by totalAmount desc, slice 5, map to `{invoiceNo, customerName, totalAmount, status}`), `topProduct` (flatten saleOrders across all invoices, group-reduce revenue by `lens_name`, pick max → `{name, revenue}`, null if no orders today).
- Response shape: `{ todaySales: number, top5Sales: [{invoiceNo, customerName, totalAmount, status}], topProduct: {name, revenue} | null }`.
- Register route in `src/backend/server.js`: `app.use('/api/dashboard', dashboardRoutes)`, auth-protected via `authenticateToken` (read-only, no `requireRole` module gate needed — same pattern as other read summary endpoints).
- Frontend client: add `getDashboardSummary()` to new `src/services/dashboard.js` (`apiClient("get", "/dashboard/summary")`), following `src/services/invoice.js` conventions.

**Frontend — Dashboard.jsx widget replacement (1:1 map):**
- `StatCard "Total Sales (MTD)"` → `StatCard "Today's Sales"`, value = `todaySales`, drop the static "12.5% vs last month" trend (no real comparator yet).
- `Card "Recent Orders"` (was `dummySaleOrders.slice(0,5)`) → repurposed to render `top5Sales` (invoice no., customer, amount, status badge using `InvoiceStatusBadge`-equivalent colors for `InvoiceStatus`, not the old `SaleOrderStatus` map).
- New small `StatCard` or inline card added for `topProduct` (name + revenue), placed in the stats grid or as a 3rd item near Today's Sales.
- Single `useQuery(["dashboard-summary"], getDashboardSummary)` call feeds all three; loading/empty states shown plainly (no skeleton component invented).

**Out of scope (stays mock, explicit follow-up):** `outstandingPayments` (StatCard), `lowStockItems` (StatCard + "Low Stock Alerts" card), `pendingPOs` (StatCard) — all remain wired to `dummyCustomers`/`dummyLensVariants`/`dummyPurchaseOrders`, untouched in this feature.

**File touch-list:**
- New: `src/backend/services/dashboardService.js`, `src/backend/controllers/dashboardController.js`, `src/backend/routes/dashboard.routes.js`, `src/services/dashboard.js`
- Edit: `src/backend/server.js` (mount route), `src/pages/Dashboard.jsx` (replace 2 widgets, add 1)
- No schema changes.

## 3 Test plan

**What changed/created:**
- New `src/backend/services/dashboardService.js` — `DashboardService.getTodaySummary()`; per-saleOrder revenue formula in `_saleOrderRevenue()` copied verbatim from `InvoiceService.createInvoice` (`invoiceService.js` lines 84-93: `base = lensPrice+fittingPrice+tintingPrice+rightEyeExtra+leftEyeExtra`, `discountAmt = base * (discount/100)`, `additional = sum(additionalPrice[].amount)`, `revenue = base - discountAmt + additional`).
- New `src/backend/controllers/dashboardController.js` — `getSummary(req, res, next)` → `{ success: true, data }`.
- New `src/backend/routes/dashboard.routes.js` — `GET /summary`, `authenticateToken` only (pattern matched from `logs.routes.js`, which also has plain authenticated GETs with no `requireRole` module gate).
- New `src/services/dashboard.js` — `getDashboardSummary()` via `apiClient("get", "/dashboard/summary")`.
- Edit `src/backend/server.js` — imported `dashboardRoutes` and mounted `app.use('/api/dashboard', dashboardRoutes)` after `financialReportRoutes`.
- Edit `src/pages/Dashboard.jsx` — single `useQuery(["dashboard-summary"], getDashboardSummary)` (object form, matching `BillingMain.jsx`); replaced `StatCard "Total Sales (MTD)"` with `"Today's Sales"` (value = `todaySales`, dropped static trend); added new `StatCard "Top Selling Product"` (name + revenue trend line, "No sales today" placeholder when `topProduct` is null); repurposed the "Recent Orders" card into "Top 5 Sales Today" rendering `top5Sales` with `InvoiceStatusBadge` (reused from `src/pages/Billing/InvoiceCard.jsx`, backed by `STATUS_CONFIG` in `Billing.constants.js` — no new colors invented). `outstandingPayments`/`lowStockItems`/`pendingPOs` widgets untouched, still mock.

**Manual verification steps:**
1. Start the backend, log in, and call `GET /api/dashboard/summary` with a valid Bearer token. Confirm response shape: `{ success: true, data: { todaySales: number, top5Sales: [{invoiceNo, customerName, totalAmount, status}], topProduct: {name, revenue} | null } }`.
2. Create/seed at least one non-CANCELLED invoice with `createdAt` = today (with one or more linked `saleOrders` that have a `lensProduct`). Confirm it appears in `top5Sales` and its `totalAmount` is included in `todaySales`.
3. Seed two invoices today with sale orders referencing different `lensProduct.lens_name`s with different price fields; confirm `topProduct` reflects whichever product's summed per-saleOrder revenue (via the reused formula) is highest, not just the highest single order or invoice total.
4. Create a CANCELLED invoice dated today; confirm it is excluded from `todaySales`, `top5Sales`, and `topProduct` revenue.
5. On a day/environment with zero qualifying invoices, confirm the endpoint returns `{ todaySales: 0, top5Sales: [], topProduct: null }` with HTTP 200, no 500/crash (verified by code inspection: `reduce` over `[]` → `0`, `slice(0,5)` over `[]` → `[]`, empty `Map` → `topProduct` stays `null`).
6. Load `/dashboard` in the browser: confirm "Today's Sales", "Top Selling Product", and "Top 5 Sales Today" render real data (or loading/"No sales today"/"No sales recorded today" placeholders), invoice status badges use the same colors as the Billing page, and the still-mock "Outstanding Payments", "Low Stock Alerts", and "Pending POs" widgets continue to render without errors.
7. Ran `node --check` on all 4 new/touched backend files (passed) and `npx vite build` (succeeded, no new errors/warnings beyond the pre-existing chunk-size notice).

## 4 Test results

- result: PASS
- rework_tag: —
- next: Merge / proceed to delivery note; no rework required.

<findings>
Verified by reading actual code (not implementer summary), cross-checked against `prisma/schema.prisma` and `invoiceService.js`.

1. Date boundaries (`dashboardService.js` getTodaySummary): `startOfToday`/`endOfToday` are built via `new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0/23, 0/59, 0/59, 0/999)`. The component-form `Date` constructor interprets arguments in local time, so both boundaries are correctly anchored to the server's local calendar day — no UTC/local mismatch, no reuse of `new Date()` for both ends. Correct.
2. `status: { not: 'CANCELLED' }` — confirmed against `enum InvoiceStatus { DRAFT ISSUED PARTIALLY_PAID PAID CANCELLED }` (schema.prisma:577-583). Exact case-sensitive match.
3. Revenue formula in `_saleOrderRevenue()` (dashboardService.js:14-23) compared line-by-line against the real, current `invoiceService.js:85-94` totalAmount formula: identical structure — `base = lensPrice+fittingPrice+tintingPrice+rightEyeExtra+leftEyeExtra`, `discountAmt = base*(discount/100)`, `additional = additionalPrice[].reduce(amount)`, `revenue = base - discountAmt + additional`. All field names (`lensPrice`, `fittingPrice`, `tintingPrice`, `rightEyeExtra`, `leftEyeExtra`, `discount`, `additionalPrice`) confirmed present on `SaleOrder` model (schema.prisma:933-939); `additionalPrice` is `Json?` matching the `[{label,amount}]` array-of-objects handling with `Array.isArray` guard.
4. `top5Sales`: sorts a copy (`[...invoices]`, doesn't mutate query result) by `totalAmount desc`, `.slice(0,5)`, maps to `{invoiceNo, customerName, totalAmount, status}` — `invoiceNo` confirmed as the real field name on `Invoice` model (schema.prisma:587), not `invoiceNumber`.
5. Zero-invoices case traced explicitly: `todaySales` uses `.reduce(..., 0)` (seeded, safe). `top5Sales` uses `.sort().slice(0,5)` on `[]` → `[]` (safe). `topProduct` is computed via a `for...of` loop over `Map.entries()` with `topProduct` pre-initialized to `null` — NOT a bare `.reduce()` without an initial value, so the classic empty-array-reduce-throws footgun does not apply here. With zero invoices the nested loops never execute and `topProduct` correctly stays `null`. No crash possible.
6. Route: `dashboard.routes.js` mounts `GET /summary` behind `authenticateToken` only (no `requireRole`), matching the `logs.routes.js` plain-auth pattern. `server.js:143` mounts `app.use('/api/dashboard', dashboardRoutes)` — prefix is unique among all ~35 existing mounts, no shadowing/collision.
7. `Dashboard.jsx`: `useQuery({queryKey, queryFn})` object form confirmed to match the real, current pattern in `BillingMain.jsx:159-164/170-174` (object-form `useQuery`, `res?.data` access). `InvoiceStatusBadge` confirmed exported from `src/pages/Billing/InvoiceCard.jsx:7` exactly as imported; it falls back to `STATUS_CONFIG.DRAFT` for unmatched status, so no crash on null/unexpected status. `topProduct: null` path renders "No sales today" text and `trend={undefined}` which `StatCard.jsx` guards with `{trend && (...)}` — no `undefined.name`/`undefined.revenue` crash. Loading state shown via `summaryLoading` ternary on all three widgets. Old `dummySaleOrders`/`Badge`/`statusColors` removed cleanly — grepped file, zero leftover references.
8. Confirmed `outstandingPayments`, `lowStockItems`, `pendingPOs` StatCards and the "Low Stock Alerts" card are byte-for-byte untouched (still reference `dummyCustomers`/`dummyLensVariants`/`dummyPurchaseOrders`) via full diff review of `Dashboard.jsx`.
9. `node --check` passed on all 4 new/touched backend files (`dashboardService.js`, `dashboardController.js`, `dashboard.routes.js`, `src/services/dashboard.js`). `npx vite build` succeeded (3353 modules, no new errors — only the pre-existing >500kB chunk-size warning).

No timezone bug, no wrong enum value, no wrong field name, no crash-on-empty case, no missing auth, no broken import found.
</findings>

## 5 Delivery note

**Shipped**: Dashboard gets 3 real widgets backed by a new `GET /api/dashboard/summary` endpoint — "Today's Sales" (sum of today's non-cancelled invoices), "Top 5 Sales Today" (the 5 highest-value invoices today, replacing the old mock "Recent Orders"), and "Top Selling Product" (highest-revenue lens product across today's sale orders, using the exact revenue formula already used in `invoiceService.js`).

**Assumptions made explicit in the contract** (none of these were specified by the user — confirm/correct if wrong):
- "Sales" = `Invoice`, not `SaleOrder` (consistent with this session's earlier P&L/invoice features).
- "Top 5 sales" = top 5 individual invoices by amount, not top 5 customers.
- "Top product" = by revenue (not quantity), scoped to today only (not MTD/all-time).

**Out of scope, still mock**: Outstanding Payments, Low Stock Alerts, Pending POs widgets — untouched, noted as a known follow-up if the user wants those wired to real data too.

**Verified**: QA independently checked timezone-correct date boundaries, the exact revenue-formula match against `invoiceService.js`, zero-invoice edge case safety (no empty-array-reduce crash), auth on the new route, and confirmed the other mock widgets are untouched.
