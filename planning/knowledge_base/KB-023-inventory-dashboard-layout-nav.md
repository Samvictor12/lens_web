# KB-023 — Inventory dashboard layout and navigation polish

**Refs:** PRD-4.13, PRD-4.12, DD-1.1, SD-1.1, FD-2.5, req-001 (2026-09-09)

## Pattern

- **Slash KPIs:** Month inward and outward belong on one card (`qty / qty`, `₹ / ₹`), not four cards.
- **Queue bars navigate tabs:** Inward → `/inventory/{stock|rx}/inward`; SO Queue → `.../request-queue`. Do not open a FIFO popup from the dashboard donut or bars. Spec-alert popup for High/Low/Out stays.
- **Trend windows:** Map 7/15/30/60/90 to `startDate`/`endDate` on `GET /reports/value`; do not hard-code only 7d vs 30d.
- **60/40 bottom row:** Queue section `lg:col-span-3`, Stock Summary `lg:col-span-2`. Summary rows only: Products, Locations, Trays, Stock units, Total value. `locationCount`/`trayCount` = distinct non-null ids on godown-scoped `InventoryStock`.

## Reuse

- `inventoryTabPath(slug, "inward"|"requestQueue")`.
- Same share-bar helper pattern as High/Low/Out (`count / sum`).
- Always pass `godownType` (KB-016).
