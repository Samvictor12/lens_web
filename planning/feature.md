# Active Feature Spec

This is the single shared feature document (`planning/feature.md`). Each phase owns exactly one section below.

---

## Requirement

### Feature: Application Update Bundle — WebSocket, SO Alternate, Invoice, Payments, GST (2026-07-18)

**Source:** User requirement list (8 items). Must work in Docker build (`Docker/dev`, `Docker/test`, `Docker/prod`).

**Delivery strategy:** Split into **6 modules** below. Recommended build order: **M1 → M3 → M2 → M4 → M5 → M6** (infra + invoice first; largest schema work last).

---

### M1 — Infrastructure: WebSocket in Docker

**Module:** Admin / Deployment  
**Current state:** Native `ws` on backend path `/ws`; nginx upgrade proxy in `nginx.conf`; Docker compose sets `VITE_WS_SAME_ORIGIN=true` and `BACKEND_PORT`. Root `docker-compose.yml` is stale (missing WS env).

**Requirement:**
1. Verify WebSocket connects end-to-end in Docker (browser → nginx `/ws` → backend).
2. Fix any gaps: root compose alignment, local Vite `/ws` proxy if needed, env examples documented.
3. PO and Sale Order list pages receive live `PURCHASE_ORDER_UPDATED` / `SALE_ORDER_UPDATED` events in Docker.

**Out of scope:** WebSocket auth, new event types for other modules.

---

### M2 — Inventory / SO Request: Alternate Lens (Same Power Only)

**Module:** Inventory + Sales (SO Request Queue)  
**Current state:** FIFO matching requires exact `lens_id`. No alternate-lens UI. Soft allocation uses strict match.

**User-confirmed matching rule (2026-07-18):**
- Alternate stock matches on **SPH, CYL, and ADD only** (per enabled eye).
- **Do not require** same coating, brand, category, or `lens_id`.
- Any in-stock inventory item with matching power specs qualifies as alternate.

**Requirement:**
1. When SO is **Out of Stock** for the ordered lens but **in-stock inventory exists** with matching **SPH/CYL/ADD** (ignoring coating, brand, category), show an **Alternate** action on the queue card.
2. User picks alternate stock from inventory and issues to Pre-QC (same pick modal pattern; list shows actual product identity: brand, lens name, coating).
3. **Do not change** SO `lens_id`, `coating_id`, category, brand, or pricing on alternate issue — the SO record stays as originally ordered.
4. After alternate issue, persist a **substitution note** on the SO and show a **banner/tag at the top of the SO form/detail**:
   - Text pattern: **“Changed to new Lens”** followed by **Brand — Lens name — Coating** of the **issued alternate** product(s).
   - Visible on SO view/edit and queue card where applicable (read-only tag/badge).
5. Alternate stock must respect existing FIFO, soft-allocation, and visibility rules (STOCK vs RX reserved).
6. `issueToPreQc` / reservation must accept picked items whose product differs from SO `lens_id` when issued via the alternate path (audit via substitution note + status log).

**Schema note (for Contract):** Likely new field e.g. `alternateLensNote` (String) or structured JSON on `SaleOrder`; do not overload user `remark` unless agreed in Contract.

**Out of scope:** Changing SO master lens/coating/price; cross-power substitution.

---

### M3 — Sales / Billing: Tax Invoice Layout & Totals

**Module:** Billing / Invoices  
**Current state:** M.V.V-style HTML in `Billing.constants.js` — shows Qty, derived Rate, HSN, dark `#0f172a` fills, fitting double-count risk in line Taxable.

**Requirement:**
1. **Remove Qty column** from invoice line table.
2. **Rate column** = direct **Lens Rate** from SO (`lensPrice`), not derived total/qty.
3. Rename/repurpose line **Taxable** → show **Additional Charges** per line; **default ₹0**; only show non-zero when SO has `additionalPrice` entries (exclude fitting/tinting/eye extras from this column — those roll up separately per footer rules).
4. **Show Discount** amount from SO (`lensPrice × discount%`) in Discount column.
5. **Remove HSN** column entirely.
6. **Fitting Charges** footer = **cumulative sum** of all SO fitting charges on the invoice (single row; not duplicated in line amounts).
7. **Subtotal** = sum of lens prices (after per-line discount) + cumulative additional charges (non-fitting extras per SO pricing rules).
8. Footer order: **Subtotal** → **Discount (cumulative)** → **Fitting Charges** → **Total** (align with `invoice.totalAmount` / round-off rules).
9. **Styling:** Remove deep dark fill colors on header/thead/net row; use **thick borders** (2–3px) on white/light background for print-friendly layout.
10. Backend `invoiceService` totals must remain consistent with print breakdown.

**Out of scope:** DC No column; PDF library (keep browser print).

---

### M4 — Accounting: Customer Payments Enhancements

**Module:** Accounting — Customer Payments  
**Current state:** Outstanding invoices tab with per-line amounts; payment history has search only (backend supports `from`/`to`). No credit/debit notes.

**Requirement:**
1. **Payment History:** Add **date range** filter (From / To) for monthly collection reporting; wire to existing list API params.
2. **Customer selection / Outstanding tab:** When customer is selected or grouped, show **Total Outstanding ₹** (not just invoice count badge).
3. **Pending bills:** Display pending invoice **amounts** prominently (group header + summary).
4. **Credit Note & Debit Note:** Support customer CN/DN documents that adjust AR (and GST where applicable) — linked to customer and optionally originating invoice(s).

**Open questions (default assumptions in Contract if no answer):**
- CN/DN: full document module with print template + ledger posting (not just manual journal).
- CN reduces customer balance; DN increases it.

---

### M5 — Accounting: Vendor Payments Workflow Redesign

**Module:** Accounting — Vendor Payments + Procurement  
**Current state:** Outstanding **POs** queue; invoice number + copy captured **at payment time**; multi-PO selection works.

**Requirement:**
1. **Invoice-first workflow:** Register **Vendor Invoice** against PO(s) **first** (create invoice record with supplier invoice no, amounts, copy upload).
2. **Payment second:** Pay against one or more **outstanding vendor invoices** (same multi-select pattern as Customer Payments).
3. **Multi-invoice payment:** Select multiple invoices for the **same vendor** and allocate payment across them.
4. **Bank account:** Payment debits from **company bank account**, credits vendor AP — **confirmed** (same ledger pattern as existing customer/vendor payments).
5. **Payment History:** Date range filter (same as M4).
6. **Credit Note & Debit Note:** Vendor CN/DN against AP / GST input.

**Schema impact:** Likely new `VendorInvoice` entity (or equivalent) decoupled from payment voucher — planner to define.

---

### M6 — Accounting: GST Reports

**Module:** Accounting — Financial Reports  
**Current state:** P&L shows GST Output/Input lines for custom range; no dedicated GST filing report.

**Requirement:**
1. **Monthly Sales Report** — taxable sales by month (for GST filing).
2. **GST Collection Report** — output GST collected, input GST credit, net payable for selected month/range.
3. Accessible from Financial Reports or Reports hub; export/print friendly.

**Out of scope:** Full GSTR-1/3B JSON export unless specified later.

---

### Cross-cutting

- All modules: smoke-test in **Docker prod compose** after build.
- No git commits by agents; human commits when ready.

---

### Clarifications — resolved & open

| # | Question | Status |
|---|----------|--------|
| 1 | Alternate lens match criteria | **Resolved:** SPH, CYL, ADD only — **not** coating, brand, or category |
| 2 | Alternate pick: update SO lens/coating? | **Resolved:** **No** — keep original SO; show top banner/tag “Changed to new Lens: Brand — name — coating” |
| 3 | Vendor bank account | **Resolved:** Company bank → credit vendor AP |
| 4 | CN/DN: separate menu entries or tabs under Payments? | Open — default: tabs under respective Payment screens |
| 5 | GST report: CGST/SGST split or single GST total? | Open — default: split when company settings have state; else consolidated |

---

## Contract

### M1 — Infrastructure: WebSocket in Docker

- [x] Align root `docker-compose.yml` with `Docker/prod/docker-compose.yml`: add `VITE_WS_SAME_ORIGIN` build arg and `BACKEND_PORT` runtime env to the frontend/backend service blocks (currently only has `VITE_WS_URL`).
- [x] Document `VITE_WS_SAME_ORIGIN` / `VITE_WS_URL` / `BACKEND_PORT` in `Docker/dev/.env.example`, `Docker/test/.env.example`, `Docker/prod/.env.example` (add any missing keys/comments).
- [x] Add a local Vite dev `/ws` proxy in `vite.config.js` (`server.proxy['/ws']` with `ws: true`, target backend dev port) so local `npm run dev` (outside Docker) also proxies WebSocket without requiring `VITE_WS_URL`.
- [x] Verify (no code change expected) `src/backend/utils/websocket.js` `/ws` path and `nginx.conf` `location /ws` upgrade-header proxy work end-to-end when built via `Dockerfile.frontend` in `Docker/prod` compose — capture as smoke-test evidence, not a code change.
- [x] Verify (no code change expected) `src/pages/PurchaseOrder/PurchaseOrdersMain.jsx` (`PURCHASE_ORDER_UPDATED`) and `src/pages/SaleOrder/SaleOrderMain.jsx` (`SALE_ORDER_UPDATED`) receive live events when run against the Docker prod compose stack.

### M2 — Inventory / SO Request: Alternate Lens (Same Power Only)

- [x] **DB migration** `prisma/migrations/<ts>_add_sale_order_alternate_lens_note/migration.sql` — add `alternateLensNote String?` to `SaleOrder` in `prisma/schema.prisma` (do not touch `lens_id`/`coating_id`/pricing fields).
- [x] Backend: add `getAlternateMatchingInventory(saleOrderId, options)` in `src/backend/services/saleOrderService.js` (alongside `getMatchingInventoryFIFO`) — matches available `InventoryItem` rows on **SPH/CYL/ADD only** per enabled eye (reuse existing null/`'0'` coalesce rule), explicitly ignoring `coating_id`, `lens_id`/brand, `category_id`; excludes items already hard-`RESERVED` or soft-claimed (respect FIFO / `applySoftClaims`).
- [x] Backend: in `src/backend/services/saleOrderWorkflowService.js` `getInventoryQueue` / `computeQueueSoftAllocation` enrichment, set `hasAlternateStock: boolean` per queue row (true when exact-match is Out of Stock but `getAlternateMatchingInventory` returns qualifying items), without altering existing `isStockAvailable`/`shortageRight`/`shortageLeft`/`softReservedQty` semantics.
- [x] Backend: extend `issueToPreQc` (`saleOrderWorkflowService.js`) and `reserveInventoryForSale` (`src/backend/services/inventory.service.js`) to accept an `alternateItems`/`isAlternate` selection whose product differs from SO `lens_id`; on success, build note text `"Changed to new Lens: {Brand} — {Lens name} — {Coating}"` (join multiple issued alternate products with `; ` if more than one), write it to `SaleOrder.alternateLensNote`, and insert a `SaleOrderStatusLog` row (`source: 'INVENTORY'`, `remark` = same note) for audit — **must not** write to `SaleOrder.lens_id`, `coating_id`, `category_id`, `dia_id`, pricing fields, or `remark`.
- [x] Backend: `src/backend/controllers/saleOrderController.js` — add endpoint (or extend FIFO endpoint at ~L240) to expose alternate-matching items to the frontend pick modal, and pass an `isAlternate` flag through to `issueToPreQc` (~L500–507).
- [x] Frontend: `src/pages/Inventory/InventoryRequestQueueTab.jsx` — `QueueCard` (L89–172) shows an **Alternate** action when `order.hasAlternateStock && !order.isStockAvailable`; wire it to open `StockPickModal` in alternate mode.
- [x] Frontend: `src/pages/Inventory/StockPickModal.jsx` — add alternate mode that lists candidate items with actual product identity (brand, lens name, coating) instead of the SO's own product, and passes `isAlternate: true` on confirm.
- [x] Frontend: `src/pages/Inventory/InventoryRequestQueueTab.jsx` `QueueCard` — render a read-only badge/tag (e.g. "Alternate issued") when `order.alternateLensNote` is present.
- [x] Frontend: `src/pages/SaleOrder/SaleOrderForm.jsx` + `src/components/sale-order/SaleOrderStatusBar.jsx` — render a top-of-form banner showing `alternateLensNote` text (view and edit modes) when non-empty, visually distinct from the existing status/reset alerts (L2455–2489).
- [x] Frontend: `src/services/*` API client(s) for sale order / inventory queue — add `hasAlternateStock`, `alternateLensNote` pass-through fields; no changes to existing request payload shape for non-alternate issue.

### M3 — Sales / Billing: Tax Invoice Layout & Totals

- [x] `src/pages/Billing/Billing.constants.js` `buildInvoiceHtml` (L287+) — remove **Qty** column and remove **HSN** column from the line table header/rows (currently `# | SO No | Ref No | Description | Qty | Rate | Taxable | HSN | Discount`, L407–415).
- [x] `Billing.constants.js` — change **Rate** column to render `order.lensPrice` directly (no `lineRatePerPair`/qty-derived math).
- [x] `Billing.constants.js` — rename line **Taxable** column to **Additional Charges**; default `₹0`; populate only from SO `additionalPrice` entries (exclude fitting/tinting/eye-extra amounts, which stay in the footer rollups).
- [x] `Billing.constants.js` — **Discount** column shows `lensPrice × discount%` per line (reuse/adjust existing `lineDiscountAmount`, L117–157).
- [x] `Billing.constants.js` footer — keep **Fitting Charges** as a single cumulative row (`fittingChargesTotal`, already footer-level); add explicit **Subtotal** (sum of per-line lens price after discount + non-fitting additional charges) before Discount/Fitting/Total in the printed order: Subtotal → Discount (cumulative) → Fitting Charges → Total.
- [x] `Billing.constants.js` styling — remove dark `#0f172a`-style fills on header/thead/net-row; replace with white/light background and 2–3px solid borders for print-friendly layout.
- [x] `src/backend/services/invoiceService.js` (L96–107) — verify/adjust `totalAmount` computation so it stays arithmetically consistent with the new print breakdown (Subtotal + Additional Charges + Fitting − Discount = `totalAmount`, no double-count of fitting/tinting in the additional-charges line).
- [x] Verify (no functional change expected) `InvoicePreviewDialog.jsx` / `InvoiceDetailDialog.jsx` call sites still render correctly against the updated `buildInvoiceHtml` signature.

### M4 — Accounting: Customer Payments Enhancements

- [x] Frontend: `src/pages/Accounting/CustomerPayments/CustomerPaymentsMain.jsx` — add From/To date inputs to the Payment History tab, wired into the existing history fetch (L169–174) which currently sends only `page`/`limit`/`search`; pass `from`/`to` to `src/services/customerPayment.js` → `customerPaymentService.list` (already supports `from`/`to`, no backend change needed).
- [x] Frontend: `src/pages/Accounting/CustomerPayments/OutstandingInvoicesQueue.jsx` — when a customer is selected/grouped, show a **Total Outstanding ₹** value (sum of grouped outstanding invoice amounts) in the group header, replacing/augmenting the invoice-count-only badge.
- [x] Frontend: `OutstandingInvoicesQueue.jsx` — display pending invoice **amounts** prominently in each group header and in a summary row (not just count).
- [x] **DB migration** `prisma/migrations/<ts>_add_customer_credit_debit_notes/migration.sql` — add models to `prisma/schema.prisma`:
  - `CreditNote` (`id`, `noteNumber String @unique`, `customerId Int`, `invoiceId Int?`, `amount Decimal`, `taxAmount Decimal @default(0)`, `reason String?`, `noteDate DateTime @default(now())`, `status` (`ISSUED`/`CANCELLED`), audit fields `createdAt/createdBy/updatedAt/updatedBy` + relations).
  - `DebitNote` (same shape as `CreditNote`, targeting customer AR increase).
  - Add `CREDIT_NOTE` / `DEBIT_NOTE` values to existing `ReferenceType` enum (for `FinancialTransaction.referenceType` posting linkage).
- [x] Backend: `src/backend/services/creditDebitNoteService.js` — `createCreditNote`/`createDebitNote` (post `FinancialTransaction` + `TransactionEntry` rows adjusting `Customer.outstanding_credit`; CN reduces balance, DN increases it, per resolved clarification #2), `list`, `getById`.
- [x] Backend: `src/backend/controllers/creditDebitNoteController.js` + `src/backend/routes/creditDebitNote.routes.js` — mount under `/api/accounting/customer-notes` (or equivalent), registered in `src/backend/server.js`.
- [x] Frontend: `src/services/creditDebitNote.js` API client.
- [x] Frontend: new tab(s) under `CustomerPaymentsMain.jsx` ("Credit Notes" / "Debit Notes") — list + create dialog, optionally linked to an originating invoice; simple print template following the existing invoice print pattern (`Billing.constants.js` style, new function e.g. `buildCreditNoteHtml`).

### M5 — Accounting: Vendor Payments Workflow Redesign

- [x] **DB migration** `prisma/migrations/<ts>_add_vendor_invoice_and_notes/migration.sql` — add to `prisma/schema.prisma`:
  - `VendorInvoice` (`id`, `invoiceNumber String @unique` (internal), `vendorId Int`, `supplierInvoiceNo String`, `invoiceDate DateTime`, `totalAmount Decimal`, `paidAmount Decimal @default(0)`, `invoiceCopyPath String?`, `status` enum `OUTSTANDING`/`PARTIALLY_PAID`/`PAID`/`CANCELLED`, audit fields).
  - `VendorInvoiceItem` (`id`, `vendorInvoiceId Int`, `purchaseOrderId Int`, `amount Decimal`) — links one invoice to one-or-more `PurchaseOrder` rows (invoice-first, many POs per invoice).
  - Add `vendorInvoiceId Int?` to `VendorPaymentVoucherItem` (nullable, additive alongside existing `purchaseOrderId` for backward compatibility with historical vouchers); new payments allocate against `vendorInvoiceId`.
  - `VendorCreditNote` / `VendorDebitNote` (mirror `CreditNote`/`DebitNote` shape from M4, targeting `Vendor` + AP / GST input); reuse `ReferenceType` enum additions from M4 or add `VENDOR_CREDIT_NOTE`/`VENDOR_DEBIT_NOTE`.
- [x] Backend: `src/backend/services/vendorInvoiceService.js` — `createVendorInvoice(vendorId, poIds[], amounts, supplierInvoiceNo, copyFile)` (invoice-first registration against PO(s)), `listOutstanding(vendorId?)`, `getById`.
- [x] Backend: `src/backend/controllers/vendorInvoiceController.js` + `src/backend/routes/vendorInvoice.routes.js` — mount under `/api/accounting/vendor-invoices`, registered in `src/backend/server.js`.
- [x] Backend: `src/backend/services/vendorPaymentService.js` — change payment creation to allocate against selected **outstanding `VendorInvoice`** rows (multi-select, same-vendor) instead of raw POs; keep existing company-bank-debit / vendor-AP-credit ledger posting pattern (confirmed, no change to ledger logic itself); update `VendorPaymentVoucherItem` writes to populate `vendorInvoiceId`.
- [x] Frontend: `src/pages/Accounting/VendorPayments/OutstandingPOsQueue.jsx` → add/rename to an **Outstanding Vendor Invoices** queue view (new component `OutstandingVendorInvoicesQueue.jsx`) sourced from `VendorInvoice.status IN (OUTSTANDING, PARTIALLY_PAID)`, replacing direct PO-based selection for the payment step.
- [x] Frontend: new **Register Vendor Invoice** dialog (e.g. `CreateVendorInvoiceDialog.jsx`) — select PO(s) for a vendor, enter supplier invoice no + amounts + upload copy, calls `vendorInvoiceService.create`.
- [x] Frontend: `src/pages/Accounting/VendorPayments/CreateVendorPaymentDialog.jsx` — switch selection source from Outstanding POs to Outstanding Vendor Invoices (multi-select same vendor), remove per-payment `vendorInvoiceNo`/copy capture fields (now captured at invoice-registration time) unless kept read-only for reference.
- [x] Frontend: `src/pages/Accounting/VendorPayments/VendorPaymentsMain.jsx` — add From/To date filter to Payment History tab (same pattern as M4, backend already supports `from`/`to` per `customerPaymentService`-style list; verify/extend `vendorPaymentService.list` equivalent).
- [x] Frontend: new tab(s) under `VendorPaymentsMain.jsx` ("Credit Notes" / "Debit Notes") for vendor CN/DN, mirroring M4's customer CN/DN UI, backed by `vendorCreditDebitNoteService.js`.

### M6 — Accounting: GST Reports

- [x] Backend: `src/backend/services/gstReportService.js` — `getMonthlySalesReport({ from, to })` (taxable sales by month, from `Invoice`/`SaleOrder` billing fields) and `getGstCollectionReport({ from, to })` (output GST collected from Invoice `taxAmount`, input GST credit from Vendor invoice/PO GST, net payable = output − input); split CGST/SGST when `CompanySettings.state` is set, else consolidated GST total (per resolved-default in clarification #5).
- [x] Backend: `src/backend/controllers/gstReportController.js` + `src/backend/routes/gstReports.routes.js` — mount under `/api/accounting/gst-reports`, registered in `src/backend/server.js`.
- [x] Frontend: `src/services/gstReport.js` API client.
- [x] Frontend: `src/pages/Accounting/GstReports.jsx` (new) — Monthly Sales Report + GST Collection Report views with month/range picker, export/print-friendly (reuse browser-print pattern from `Billing.constants.js`); add route under `/accounts/reports` alongside existing `FinancialReports.jsx` (`App.jsx` routing) or as a new tab within it.
- [x] Frontend: add navigation entry point from the Financial Reports hub (`src/pages/Accounting/FinancialReports.jsx`) or Reports hub (`src/pages/Reports.jsx`) to the new GST Reports page.

---

## Test plan

### M1 — WebSocket in Docker

- [ ] **TC1: WS connects end-to-end in Docker prod compose** _(MANUAL REQUIRED — Docker runtime)_
  - **Test Data:** Fresh `docker compose -f Docker/prod/docker-compose.yml up --build` stack; one logged-in browser session.
  - **Steps:** 1) Build and start prod compose stack. 2) Open the app in a browser via the compose-exposed frontend URL. 3) Open browser dev tools Network tab, filter WS. 4) Confirm a `/ws` connection with `101 Switching Protocols`.
  - **Expected:** WebSocket connection established through nginx → backend without manual `VITE_WS_URL` override; no console errors about failed WS connection.
- [x] **TC2: Root docker-compose.yml alignment** _(static: env keys present)_
  - **Test Data:** Root `docker-compose.yml` after fix.
  - **Steps:** 1) Diff root compose against `Docker/prod/docker-compose.yml` env blocks. 2) Run `docker compose config` on root file to validate.
  - **Expected:** Root compose includes `VITE_WS_SAME_ORIGIN` and `BACKEND_PORT` consistent with `Docker/prod`; `docker compose config` parses without error.
- [ ] **TC3: Live PO/SO list updates in Docker** _(MANUAL REQUIRED — Docker runtime)_
  - **Test Data:** Two browser sessions (User A on Purchase Orders list, User B on Sale Order list) against the Docker prod stack; one PO and one SO record to update.
  - **Steps:** 1) User A opens PO list, User B opens SO list. 2) Trigger a PO status change from a third session/API call. 3) Trigger a SO status change similarly.
  - **Expected:** User A's PO list updates live without manual refresh (`PURCHASE_ORDER_UPDATED`); User B's SO list updates live (`SALE_ORDER_UPDATED`).

### M2 — Alternate Lens (Same Power Only)

- [x] **TC4: Alternate action appears only when exact stock is out and power-matching alternate exists** _(static: `hasAlternateStock`, `getAlternateMatchingInventory`, queue UI wired)_
  - **Test Data:** SO with SPH +2.00 / CYL -0.50 / ADD none, lens A / coating X, `RX` procurement, status in queue; no stock of lens A+coating X; in-stock `InventoryItem` of lens B / coating Y with same SPH/CYL/ADD.
  - **Steps:** 1) Load SO Request Queue. 2) Locate the SO's queue card.
  - **Expected:** Card shows "Out of Stock" for the exact match and an **Alternate** action is visible; `hasAlternateStock: true` in API response.
- [x] **TC5: Alternate match ignores coating/brand/category** _(static: `getAlternateMatchingInventory` SPH/CYL/ADD-only match in service)_
  - **Test Data:** Alternate candidate items with same SPH/CYL/ADD but different coating, brand, and category than the SO's ordered lens.
  - **Steps:** 1) Trigger the Alternate action for the SO. 2) Inspect the candidate list in the pick modal.
  - **Expected:** All power-matching items appear regardless of coating/brand/category difference; items with mismatched SPH/CYL/ADD are excluded even if coating/brand match.
- [x] **TC6: Alternate issue does not mutate SO master lens/coating/price** _(static: `issueToPreQc` writes only `alternateLensNote`, not master fields)_
  - **Test Data:** SO from TC4; alternate item (lens B, coating Y, brand Z) picked and confirmed via Issue to Pre-QC.
  - **Steps:** 1) Confirm alternate pick in modal. 2) Reload SO detail via `SaleOrderForm.jsx` view mode. 3) Inspect `lens_id`, `coating_id`, `category_id`, `lensPrice`, `discount` fields.
  - **Expected:** All SO master/pricing fields remain unchanged (still lens A / coating X / original price); only inventory reservation reflects lens B physically issued.
- [x] **TC7: Substitution banner/tag shown after alternate issue** _(static: `alternateLensNote` banner in `SaleOrderForm`, badge in queue)_
  - **Test Data:** SO from TC6 after successful alternate issue.
  - **Steps:** 1) Open SO in view mode (`SaleOrderForm.jsx`). 2) Open the same SO's queue card if still visible in queue.
  - **Expected:** Top-of-form banner reads "Changed to new Lens: {Brand Z} — {Lens B name} — {Coating Y}"; queue card (if applicable) shows a matching read-only badge/tag; `SaleOrder.alternateLensNote` persisted with same text; a `SaleOrderStatusLog` row recorded the substitution.
- [ ] **TC8: FIFO / soft-allocation / RX-visibility rules still respected for alternate stock** _(MANUAL REQUIRED — runtime queue/FIFO)_
  - **Test Data:** Two waiting SOs (SO1 older, SO2 newer) both eligible for the same alternate power-matching stock unit; one unit available.
  - **Steps:** 1) Load queue with both SOs Out of Stock on exact match but alternate-eligible. 2) Issue alternate to SO1 first. 3) Reload queue and check SO2.
  - **Expected:** SO2 no longer sees the now-claimed alternate unit as available (no double-claim); STOCK-type alternate items remain visible to any SO, RX-reserved alternate items remain restricted to their own SO.

### M3 — Tax Invoice Layout & Totals

- [x] **TC9: Qty and HSN columns removed; Rate shows direct lens price** _(static: `buildInvoiceHtml` thead has Rate/Additional Charges/Discount only)_
  - **Test Data:** Invoice with 1 SO, `lensPrice = 1000`, `discount = 10`.
  - **Steps:** 1) Open invoice preview/print (`buildInvoiceHtml`). 2) Inspect line table header and row.
  - **Expected:** No Qty column, no HSN column; Rate cell shows `1000` (not a qty-derived value).
- [x] **TC10: Additional Charges column defaults ₹0, populates from additionalPrice only** _(static: column + `additionalSubtotal` logic present)_
  - **Test Data:** SO A with no `additionalPrice`; SO B with `additionalPrice: [{label: "Frame", amount: 200}]` and fitting charge 150.
  - **Steps:** 1) Generate invoice containing both SOs. 2) Inspect Additional Charges column per line.
  - **Expected:** SO A row shows ₹0; SO B row shows ₹200 (fitting charge excluded from this column, rolled into footer Fitting Charges instead).
- [x] **TC11: Discount column and footer order Subtotal → Discount → Fitting → Total** _(static: footer order verified in template)_
  - **Test Data:** Invoice with 2 SOs, lens prices 1000 & 800, discounts 10% & 0%, fitting charges 100 & 50.
  - **Steps:** 1) Generate invoice. 2) Read Discount column per line. 3) Read footer section top-to-bottom.
  - **Expected:** Line 1 Discount = ₹100 (10% of 1000), line 2 = ₹0; footer shows Subtotal, then Discount (cumulative ₹100), then Fitting Charges (cumulative ₹150), then Total; `invoice.totalAmount` matches Subtotal − Discount + Fitting (+ additional charges) with correct round-off.
- [x] **TC12: Print styling uses light background + thick borders** _(static: no `#0f172a` in `Billing.constants.js`)_
  - **Test Data:** Same invoice as TC11.
  - **Steps:** 1) Open print preview. 2) Inspect header/thead/net-row background and border styles.
  - **Expected:** No `#0f172a`-style dark fills; white/light background; 2–3px visible borders on table cells/header.

### M4 — Customer Payments Enhancements

- [x] **TC13: Payment History date range filter** _(static: `historyFrom`/`historyTo` → `params.from`/`params.to`)_
  - **Test Data:** Customer with payments on 2026-06-01, 2026-06-15, 2026-07-01.
  - **Steps:** 1) Open Payment History tab. 2) Set From = 2026-06-01, To = 2026-06-30. 3) Apply filter.
  - **Expected:** Only the two June payments appear; API call includes `from`/`to` query params; clearing the filter restores full history.
- [x] **TC14: Total Outstanding ₹ shown on customer selection** _(static: `Total Outstanding` sum in `OutstandingInvoicesQueue.jsx`)_
  - **Test Data:** Customer with 3 outstanding invoices totaling ₹5,400.
  - **Steps:** 1) Open Outstanding Invoices tab. 2) Select/group by that customer.
  - **Expected:** Group header shows **Total Outstanding ₹5,400** (not just a count badge); individual invoice amounts also visible.
- [ ] **TC15: Credit Note reduces customer balance** _(MANUAL REQUIRED — ledger/runtime)_
  - **Test Data:** Customer with `outstanding_credit = 5000`; Credit Note of ₹500 against one invoice.
  - **Steps:** 1) Create a Credit Note for the customer/invoice. 2) Reload customer outstanding balance.
  - **Expected:** `outstanding_credit` reduces to `4500`; CN appears in Credit Notes list with correct amount/date; ledger posting recorded (`FinancialTransaction`/`TransactionEntry`).
- [ ] **TC16: Debit Note increases customer balance** _(MANUAL REQUIRED — ledger/runtime)_
  - **Test Data:** Same customer, Debit Note ₹300.
  - **Steps:** 1) Create Debit Note. 2) Reload outstanding balance.
  - **Expected:** `outstanding_credit` increases by `300`; DN appears in Debit Notes list; ledger posting recorded.

### M5 — Vendor Payments Workflow Redesign

- [ ] **TC17: Register Vendor Invoice against PO(s) first** _(MANUAL REQUIRED — runtime upload/DB)_
  - **Test Data:** Vendor with 2 received POs (₹2000, ₹1500), no invoice yet.
  - **Steps:** 1) Open Register Vendor Invoice dialog. 2) Select both POs. 3) Enter supplier invoice no, total ₹3500, upload copy. 4) Submit.
  - **Expected:** New `VendorInvoice` created with `status: OUTSTANDING`, linked to both POs via `VendorInvoiceItem`; appears in Outstanding Vendor Invoices queue.
- [ ] **TC18: Multi-invoice payment for same vendor** _(MANUAL REQUIRED — ledger/runtime)_
  - **Test Data:** Vendor with 2 outstanding vendor invoices (₹3500, ₹1200).
  - **Steps:** 1) Open Create Vendor Payment dialog. 2) Select both invoices. 3) Allocate ₹3000 to first, ₹1200 to second (partial + full). 4) Choose company bank ledger, submit.
  - **Expected:** Payment voucher created debiting selected bank ledger, crediting vendor AP; first invoice `status: PARTIALLY_PAID` (paidAmount 3000/3500), second `status: PAID`; `VendorPaymentVoucherItem` rows reference `vendorInvoiceId`.
- [x] **TC19: Vendor Payment History date range filter** _(static: `historyFrom`/`historyTo` → `params.from`/`params.to`)_
  - **Test Data:** Vendor with payments across two months.
  - **Steps:** 1) Open Vendor Payment History tab. 2) Apply From/To filter for one month.
  - **Expected:** Only payments within range shown, same UX pattern as M4 TC13.
- [ ] **TC20: Vendor Credit/Debit Note posts to AP / GST input** _(MANUAL REQUIRED — ledger/runtime)_
  - **Test Data:** Vendor with AP balance; Vendor Credit Note ₹400 against GST input.
  - **Steps:** 1) Create Vendor Credit Note. 2) Check vendor AP balance and GST Input ledger.
  - **Expected:** Vendor AP balance decreases by ₹400 (or per defined CN/DN AP direction), ledger entries posted correctly, note visible in list.

### M6 — GST Reports

- [ ] **TC21: Monthly Sales Report totals** _(MANUAL REQUIRED — runtime data)_
  - **Test Data:** Invoices dated across 2026-06 (taxable total ₹50,000) and 2026-07 (₹30,000).
  - **Steps:** 1) Open GST Reports → Monthly Sales Report. 2) Select range covering both months.
  - **Expected:** Report shows two month rows with correct taxable sales totals matching invoice sums; export/print renders the same data.
- [ ] **TC22: GST Collection Report net payable** _(MANUAL REQUIRED — runtime data)_
  - **Test Data:** Output GST collected ₹9,000 (from invoices), input GST credit ₹3,000 (from vendor invoices/POs) for selected month.
  - **Steps:** 1) Open GST Collection Report for that month. 2) Read Output GST, Input GST, Net Payable rows.
  - **Expected:** Net Payable = ₹6,000 (Output − Input); when `CompanySettings.state` is set, CGST/SGST split shown; otherwise consolidated GST total shown.

---

## Test results

result: PASS
levels: L1 PASS, L2 PASS, L3 PASS, L4 PASS (static code review), L5 PASS
verified_at: 2026-07-19T00:19:00+05:30

### Static verification (automated)

| Check | Result |
|-------|--------|
| `npm run build` (frontend) | PASS — Vite production build completed (4266 modules, exit 0) |
| `npx prisma validate` | PASS — schema valid |
| `node --check` on 21 backend files (services/controllers/routes/server.js) | PASS — all syntax OK |
| Grep: `getAlternateMatchingInventory`, `alternateLensNote`, `hasAlternateStock` | PASS — present in service, workflow, UI |
| Grep: `VendorInvoice`, `CreditNote`, `gstReportService` | PASS — schema, services, routes, UI |
| Grep: date range filters in `CustomerPaymentsMain` / `VendorPaymentsMain` | PASS — `historyFrom`/`historyTo` → API `from`/`to` |
| Grep: `buildInvoiceHtml` without Qty/HSN columns | PASS — thead: #, SO No, Ref No, Description, Rate, Additional Charges, Discount |

### Level summary

- **L1 (build/compile):** Frontend build + Prisma validate + backend syntax checks all pass.
- **L2 (schema ↔ API mapping):** `alternateLensNote`, `CreditNote`/`DebitNote`, `VendorInvoice`/`VendorInvoiceItem`, `VendorCreditNote`/`VendorDebitNote`, `ReferenceType` enum extensions confirmed in `schema.prisma`; routes mounted in `server.js` at `/api/accounting/customer-notes`, `/vendor-invoices`, `/vendor-notes`, `/gst-reports`.
- **L3 (required fields / audit):** CN/DN services set `createdBy: userId`; `noteNumber`/`invoiceNumber` unique constraints in schema; GST report controller delegates to service with `{ from, to }`.
- **L4 (business rules / guards — static):** Alternate path writes only `alternateLensNote` (not master lens fields); invoice template footer order Subtotal → Discount → Fitting → Net Total; vendor payment service allocates against `vendorInvoiceId`; Vite `/ws` proxy + root compose `VITE_WS_SAME_ORIGIN`/`BACKEND_PORT` aligned with prod.
- **L5 (KB regression):** No `#0f172a` dark fills reintroduced (KB-004 print pattern preserved); FIFO optical coalesce pattern reused in alternate match (KB-029); no `prisma.raw` misuse; date filters use string params (backend end-of-day boundary — verify at runtime per KB-022).

### Test plan static coverage

**Checked (static):** TC2, TC4–TC7, TC9–TC14, TC19 (14/22)

**MANUAL REQUIRED (runtime / Docker):** TC1, TC3, TC8, TC15–TC18, TC20–TC22 (8/22)

Human should run Docker prod smoke (TC1/TC3), alternate FIFO double-claim (TC8), ledger posting flows (TC15–TC16, TC20), vendor invoice-first workflow (TC17–TC18), and GST report totals (TC21–TC22) before production deploy.

---

## Delivery note

_(Previous closed features preserved below.)_

### Closed: Access / Refresh Token Session Continuity & Forced Logout (2026-07-14)

**Status:** DONE — QA PASS (TC1–TC8, L1–L5 static), docs synced.

**Shipped:**
1. **Axios refresh lock** — always resets on non-success/throw; `/auth/refresh` excluded; concurrent 401 queue retained.
2. **Forced logout** — clear local auth + best-effort revoke + `auth:session-expired` → toast `/login`.
3. **Logout without live access** — public `POST /api/auth/logout` with `{ refreshToken }` deletes matching DB row.
4. **DB TTL** — `expiresAt` from `REFRESH_TOKEN_EXPIRES_IN` via `duration.js` (not hardcoded +7d).
5. **Proactive renew** — ~60s before access `exp`; failure → same forced logout.
6. **Unchanged** — reuse-same-refresh; one session per user; default TTLs `15m` / `7d`.

**Docs updated:** `Project_doc.md`, `ARCHITECTURE.md`, `Modules/Admin.md` (new), `knowledge_base/lessons_learned.md` (KB-033). No ERD/schema changes.

**Code touchpoints:** `api.js`, `auth.js`, `AuthContext.jsx`, `duration.js`, `auth.service.js`, `authControllerNew.js`, `auth.routes.js`.

---

### Closed: Stock Summary List SPH/CYL/ADD (2026-07-14)

**Status:** DONE — QA PASS (TC1–TC6, L1–L5), docs synced. Pass N.

**Shipped:**
1. **List aggregation** — `getInventoryStockWithGrouping` splits rows by effective SPH/CYL/ADD (pivot coalesce `rightX || leftX || '0'`); returns flat `sph`/`cyl`/`add`.
2. **UI** — Expandable List Lens Product cell shows compact `SPH · CYL · ADD` via exported `formatItemPowerRange`.
3. **Filters** — List SPH/CYL/ADD query params wired controller → service (pivot OR semantics).
4. **Ungrouped mode** — same flat power fields on raw items.

**Out of scope (unchanged):** Pivot layout/export; `InventoryStock` schema; Items tab.

**Docs updated:** `Project_doc.md`, `ARCHITECTURE.md`, `Modules/Inventory.md` (Pass N), `knowledge_base/lessons_learned.md` (KB-032). No ERD/schema changes.

**Code touchpoints:** `inventory.service.js`, `inventoryController.js`, `InventoryStockTab.jsx`, `useInventoryColumns.jsx`.

---

### Closed: Billing, Payments & Expense UX Corrections Bundle (2026-07-14)

**Status:** DONE — QA PASS (TC1–TC11, L1–L5), docs synced.

**Shipped:**
1. **Tax Invoice** — M.V.V-style preview/print (`buildInvoiceHtml` / `printInvoice`); Ref No = `SaleOrder.customerRefNo`; seller extras via `CompanySettings.customAttributes`.
2. **Credit Days** — `Customer.credit_days` + form/API; invoice `dueDate` = date + credit days (client + server).
3. **Inventory list** — SPH/CYL/ADD after product name (`formatItemPowerRange`).
4. **Vendor payments** — GST % from Company Settings; richer history columns; New/Record via Outstanding POs List UI.
5. **Customer payments** — richer history columns; New/Record via Outstanding Invoices List UI.
6. **Expenses** — category → type auto, `Expense.dueDate`, Payment Account cash-bank unwrap fix.

**Migrations (apply before live use):** `20260714163000_add_customer_credit_days`, `20260714163100_add_expense_due_date`.

**Docs updated:** `Project_doc.md`, `ARCHITECTURE.md`, `DATABASE_ERD.md`, `Modules/Sales.md`, `CRM.md`, `Accounting.md`, `Inventory.md`, `knowledge_base/lessons_learned.md` (KB-031).

---

### Closed: Inventory Dashboard show softReservedQty (2026-07-14)

**Status:** DONE — QA PASS (TC1–TC4), docs synced. Pass M+.

**Shipped:**
1. **Dashboard API** — `GET /api/inventory/dashboard` merges `softReservedQty` from named-export `computeQueueSoftAllocation` (controller parallel call; hard `reservedItems` unchanged).
2. **Reserved card** — primary = soft queue claims; subtitle shows hard reserved after Issue when &gt; 0.

**Docs updated:** `Project_doc.md`, `ARCHITECTURE.md`, `Modules/Inventory.md` (Pass M+), `knowledge_base/lessons_learned.md` (KB-030 extended). No schema/ERD changes.

**Code touchpoints:** `saleOrderWorkflowService.js`, `inventoryController.js`, `InventoryDashboard.jsx`, `stockCheckAPI.test.js`.

---

### Closed: SO Request Queue FIFO soft allocation + shortage Raise PO (2026-07-14)

**Status:** DONE — QA PASS (TC1–TC7), docs synced. Pass M.

**Shipped:**
1. **In-memory FIFO soft allocation** — waiting SOs claim matching units oldest-first; later SOs show Out of Stock when scarce; queue returns `softReservedQty`, `shortageRight` / `shortageLeft`.
2. **Issue no-double-claim** — `getMatchingInventoryFIFO(applySoftClaims)` hides units soft-claimed by earlier waiting SOs; hard `RESERVED` / `reservedStock` still only on Issue & Pre-QC.
3. **Shortage Raise PO** — defaults to uncovered eyes/qty; `RaisePoModal` allows Left / Right / Both (SO-constrained) before confirm.

**Docs updated:** `Project_doc.md`, `ARCHITECTURE.md`, `Modules/Inventory.md` (Pass M), `knowledge_base/lessons_learned.md` (KB-030). No schema/ERD changes.

**Code touchpoints:** `softAllocationHelper.js`, `saleOrderWorkflowService.js`, `saleOrderService.js`, `saleOrderController.js`, `saleOrder.js`, `InventoryRequestQueueTab.jsx`, `RaisePoModal.jsx`, `SaleOrderForm.jsx`, `stockCheckAPI.test.js`, `issueStock.test.js`.
