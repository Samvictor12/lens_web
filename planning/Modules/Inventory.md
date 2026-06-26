# Module Specification — Inventory

This document details the functional specifications, technical implementation, and cross-module linkages for the **Inventory** module.

---

## 1. Functional Overview

The Inventory module manages:

* **Initial Inward (Manual):** A 3-step wizard (`InventoryInitializationForm.jsx`) lets a user pick a Location → select Type/Category/Lens Product/Coating → enter Sph/Cyl/Add ranges (0.25-step cartesian product via `BulkLensSelection.jsx`) → allocate to trays with per-spec Qty (auto-fills to available gap) and per-spec Price (auto-fills from global cost price). Coating is required before the grid can be displayed. The generated spec list is shown as an expandable card grouped by Coating.
* **Inward by PO:** Purchase-order-driven receipt queue (`POInwardToInventory.jsx`). Confirmed working end-to-end. Live tray capacity badge reflects in-form sibling-row allocations via `siblingAllocatedQty()` — shows **"Tray Full — X/X"** immediately when another row fills the same tray, without waiting for submit.
* **Tray Master / Location Master:** Organizes stock into designated physical bins (trays) inside locations.
* **Request Queue (tab inside Inventory module):** `InventoryRequestQueueTab.jsx` — lists Sale Orders requiring stock allocation (driven by `INVENTORY_QUEUE_STATUSES`). "Issue & Pre-QC" button opens `StockPickModal.jsx` (FIFO-ordered selection) before transitioning the SO to `PRE_QC`. No standalone route; reachable only as a tab within the Inventory module.
* **Transactions Log:** Record of all stock updates for value auditing.
* **Stock Summary:** Pivot table view of stock by product attributes × tray/location, with AND-combined filters and Excel/PDF exports (Pass C — complete).
* **Dashboard:** Analytics cards, spec-count graphs, value trend, top/low selling products, and Excel/PDF export (Pass B — complete).

> **Nav:** Inventory module tab bar = `Dashboard | Inward Queue | Request Queue | Transactions | Stock Summary`. The "Items" tab and "Add Item" button have been removed — no manual inventory creation allowed except via Initial Inward or PO Inward.

---

## 2. Technical Design

### Key Frontend Files

| File | Role |
|------|------|
| `InventoryMain.jsx` | Top-level tab router (5 tabs) |
| `InventoryInitializationForm.jsx` | 3-step manual inward wizard |
| `BulkLensSelection.jsx` | Coating + range inputs + Sph×CYL/ADD grid + expandable spec list |
| `POInwardToInventory.jsx` | PO-receipt-driven inward with live tray badge (`siblingAllocatedQty`) |
| `InventoryRequestQueueTab.jsx` | SO queue tab with FIFO stock pick trigger |
| `StockPickModal.jsx` | FIFO allocation dialog reused for Request Queue |
| `InventoryDashboard.jsx` | Stat cards + charts + Excel/PDF export |
| `InventoryStockTab.jsx` | Stock summary pivot + AND-combined filters + Excel/PDF export |
| `InventoryInwardQueueTab.jsx` | PO inward queue listing |
| `InventoryTransactionsTab.jsx` | Transaction log tab |

### Key Backend Files

| File | Role |
|------|------|
| `inventory.service.js` | Core service: `bulkInwardFromGrid`, `reserveInventoryForSale` (qty-aware + `dbClient` threading), `updateInventoryStock`, `generateTransactionNumber`, `getInventorySpecCountTrend`, `getTopLowSellingProducts`, `getInventoryStockPivot` |
| `saleOrderWorkflowService.js` | `issueToPreQc()` — wraps `reserveInventoryForSale` in a `prisma.$transaction`; threads `tx` as `dbClient` so all eye reservations roll back together on failure |
| `inventory.routes.js` / `inventoryController.js` | REST API layer |

### Key Data Rules

* **`reserveInventoryForSale(inventoryItemId, quantity, saleOrderId, userId, dbClient = prisma)`:**
  - Quantity-aware status flip: if `remainingQty ≤ 0.001` → status = `RESERVED`, `saleOrderId` + `reservedDate` set. Otherwise stays `AVAILABLE` with decremented `quantity`.
  - Accepts optional `dbClient` (defaults to `prisma`). When called from `issueToPreQc`'s `prisma.$transaction`, the transaction's `tx` is passed through so all reservations in one call are atomic.
* **`bulkInwardFromGrid`:** Accepts `coating_id` at top level and optional `costPrice` per `splits[]` entry (falls back to form-level `costPrice` via `??`, not `||` — preserves explicit `0`).
* **Tray Live Badge (PO Inward):** `effectiveAvailable = trayOccupancy.availableQty - siblingAllocatedQty(trayId, excludeRowKey, excludeSplitIdx)`. Badge turns red with "Tray Full — X/X" when `effectiveAvailable ≤ 0`.

---

## 3. Linkages & Dependencies

```mermaid
graph LR
    Procurement[Procurement Module] -->|Inward by PO| Inventory(Inventory Module)
    CatalogMasters[Lens Masters] -->|LensCoatingMaster, LensProduct| Inventory
    Sales[Sales Module] -->|FIFO Allocation Queue - issueToPreQc| Inventory
    Inventory -->|OUTWARD_SALE transactions| Accounting[Accounting Module]
    Inventory -->|InventoryItem.saleOrderId| Sales
```

* **Procurement:** PO receipts feed `InventoryInwardQueueTab`; `POInwardToInventory.jsx` creates `InventoryItem` rows per spec+tray.
* **Lens Masters:** `getInventoryDropdowns()` returns `coatings` (from `LensCoatingMaster`), `lensProducts`, `lensTypes`, `categories` — used by both `BulkLensSelection` and `InventoryInitializationForm`.
* **Sales:** Sale Orders with `INVENTORY_QUEUE_STATUSES` appear in `InventoryRequestQueueTab`. `issueToPreQc()` call  `reserveInventoryForSale()` per selected `InventoryItem`, transitioning the SO to `PRE_QC`. `getMatchingInventoryFIFO(saleOrderId)` populates `StockPickModal` with FIFO-ordered matches.
* **Accounting:** `inventoryTransaction.create()` (type `OUTWARD_SALE`) is called inside `reserveInventoryForSale()`, feeding the cost-price valuation used in financial reporting.

---

## 4. Pass History

| Pass | Scope | Status | Shipped |
|------|-------|--------|---------|
| **Pass A** | Product Inward flows (1a/1b/1c) + Items tab removal | ✅ QA PASSED | 2026-06-27 |
| **Pass B** | Dashboard analytics (relabel, graphs, Top10/Low10, export) | ✅ QA PASSED | 2026-06-27 |
| **Pass C** | Stock Summary pivot + filters + export | ✅ QA PASSED | 2026-06-27 |
