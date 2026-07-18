# Active Feature Spec

This is the single shared feature document (`planning/feature.md`). Each phase owns exactly one section below.

---

## Requirement

_(Idle — awaiting next feature.)_

---

## Contract

_(Empty until CONTRACT phase.)_

---

## Test plan

_(Empty until CONTRACT phase.)_

---

## Test results

_(Empty until QA phase.)_

---

## Delivery note

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
