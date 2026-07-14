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

### Closed: Inventory Workflow Corrections & Gap Resolution (2026-07-14)

**Status:** DONE — QA PASS (T1–T4), docs synced.

**Shipped:**
1. **Inward Queue filtering** — stock-type POs only (direct + STOCK SO); RX excluded; PO receive `isStockPO` aligned via `procurementType`.
2. **Tray-to-tray TRANSFER** — same-location allowed when trays differ; full relocate + partial qty split; atomic stock bucket updates.
3. **FIFO matching** — STOCK-linked PO items treat as general stock; RX reserved to originating SO.

**Docs updated:** `Project_doc.md`, `ARCHITECTURE.md`, `Modules/Inventory.md` (Pass K), `knowledge_base/lessons_learned.md` (KB-028). No schema/ERD changes.

**Code touchpoints:** `inventory.service.js`, `purchaseOrderService.js`, `saleOrderService.js`, `InventoryTransactionForm.jsx`, `PurchaseOrderReceive.jsx`.
