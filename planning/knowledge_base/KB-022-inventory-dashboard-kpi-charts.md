# KB-022 — Inventory dashboard KPI and chart corrections

**Refs:** PRD-4.12, PRD-4.8, DD-1.1, SD-1.1, FD-2.5, req-001 (2026-09-09)

## Pattern

- **KPI vs status:** Product/stock/value + calendar-month movement are KPI cards. High/Low/Out stay on pie + % bars (High = OVER from `classifySpecAlert`). Do not put Low/Out/Over on the KPI row.
- **Share-of-N bars:** Top/Low 10 selling bars use `unitsSold / sum(those 10)`, not vs the first row. Grain is product + `coalescePower` spec, `OUTWARD_SALE` only.
- **Low/Out Raise PO:** Group popup by product. Selecting a product selects all its specs (and clears other products). Navigate `/masters/purchase-orders/add` with `fromLowStockAlert`, Bulk `lensBulkSelection`; cell qty = `minQty`. High (OVER) has no Raise PO.
- **FIFO donut:** Dashboard lists 10 oldest pending inwards / SO queue only. Do not change Inward Queue or SO Queue tab default sort.

## Reuse

- Spec engine + `GET /spec-alerts` (High → `type=over`).
- `GET /reports/value` for trend; extend `GET /dashboard` and `GET /reports/top-low-selling`.
- Always pass `godownType` (KB-016).
