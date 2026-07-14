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

---

### Closed: SO Request Queue false Out of Stock — SPH/CYL/ADD null≡0 match (2026-07-14)

**Status:** DONE — QA PASS (TC1–TC5), docs synced. Pass L.

**Shipped:**
1. **FIFO optical-spec null≡0** — SPH/CYL/ADD treat `null` / empty as `"0"` via `normalizeOpticalSpecValue`.
2. **SQL NULL on zero** — effective 0 matches string zero variants **or** column `NULL` in Prisma where.
3. **Regression tests** — `stockCheckAPI.test.js` covers SO↔Inv null/0 symmetry, non-zero mismatch, progressive ADD, Pass K scope unchanged.

**Docs updated:** `Project_doc.md`, `ARCHITECTURE.md`, `Modules/Inventory.md` (Pass L), `knowledge_base/lessons_learned.md` (KB-029). No schema/ERD changes.

**Code touchpoints:** `saleOrderService.js`, `stockCheckAPI.test.js`.

---

### Closed: Inventory Workflow Corrections & Gap Resolution (2026-07-14)

**Status:** DONE — QA PASS (T1–T4), docs synced.

**Shipped:**
1. **Inward Queue filtering** — stock-type POs only (direct + STOCK SO); RX excluded; PO receive `isStockPO` aligned via `procurementType`.
2. **Tray-to-tray TRANSFER** — same-location allowed when trays differ; full relocate + partial qty split; atomic stock bucket updates.
3. **FIFO matching** — STOCK-linked PO items treat as general stock; RX reserved to originating SO.

**Docs updated:** `Project_doc.md`, `ARCHITECTURE.md`, `Modules/Inventory.md` (Pass K), `knowledge_base/lessons_learned.md` (KB-028). No schema/ERD changes.

**Code touchpoints:** `inventory.service.js`, `purchaseOrderService.js`, `saleOrderService.js`, `InventoryTransactionForm.jsx`, `PurchaseOrderReceive.jsx`.
