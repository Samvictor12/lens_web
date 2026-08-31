# KB-016 — Inventory Audit and dashboard overhaul

**Refs:** PRD-4.8, DD-1.1, SD-1.1, FD-2.5, req-013 (2026-08-31)

## Pattern

- **Spec-level thresholds:** `InventorySpecThreshold` per `lens_id + godownType + sph/cyl/add` (normalized via `normalizePowerValue`). Generate grid with `POST /spec-thresholds/generate` (step default 0.25).
- **Computed alerts only:** No writes to `InventoryAlert`. `specQty` from `InventoryItem` grouped by lens + `coalescePower`, godown-scoped via `inventoryItemGodownWhere`. OUT / LOW / OVER classification shared by dashboard KPIs and `GET /spec-alerts`.
- **Product-level legacy:** `LensProductMaster.minThresholdQty`/`maxThresholdQty` and `GET /low-stock-items` remain but dashboard KPIs use spec engine only.

## UI split

- **Audit tab** (`/inventory/{stock|rx}/audit`): Manual Add, Initialize Stock, threshold editor.
- **Dashboard tab:** Six KPIs; click Low/Out/Over for alert drill-down; trend chart when no KPI selected. Initialize Stock removed from Dashboard.

## Reuse

- Customer 360 clickable KPI card pattern for Low/Out/Over selection.
- `InventoryInitializationForm` consumed by Audit tab only.
- Godown isolation: always pass `godownType` query param on inventory APIs.
