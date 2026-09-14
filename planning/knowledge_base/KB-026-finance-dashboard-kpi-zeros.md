# KB-026 — Finance dashboard KPI zeros and inventory value

**Refs:** PRD-4.6, PRD-4.12, DD-1.1, DD-2.1, FD-2.4, req-001 (2026-09-15)

## Pattern

- **Unwrap once:** `apiClient` already returns `{ success, data }`. Binding `res` as dashboard (or `res.data.data`) zeros `today`/`position`. Use `unwrapDashboardPayload`.
- **Document dates:** Today Sales uses `Invoice.billDate` (null → `createdAt`). Do not use `createdAt`-only or `getTodaySummary` for an as-of day.
- **Decimal:** Coerce Prisma `_sum` / `currentBalance` with `parseFloat` before add/`round2` (NaN → ₹0).
- **Inventory value:** `totalStockUnits` = specQty from items; `totalValue` = Stock Summary grouping cost×qty. Do not value from empty `InventoryStock` buckets.

## Reuse

- Finance `getInventoryDashboardEnhanced({})` company-wide; godown `STOCK`|`RX` stays scoped on inventory UI.
