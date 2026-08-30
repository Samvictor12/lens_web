# KB-008 — Customer 360 UI corrections

**Refs:** PRD-4.3, DD-2.1, FD-2.3, req-005  
**Date:** 2026-08-30

## Pattern
Section 1 uses a two-column identity vs financial split. Section 2 drill-down is inline below KPI cards (no Sheet). Top lens groups by lens product + per-eye SPH/CYL/ADD. Overview extends `deliveryPerson`, `discountTotal`, ISSUED-only open credit notes.

## Rules
- `discountTotal` = Σ `lensPrice × (discount / 100)` on non-cancelled SOs (not price-mapping avg %).
- Open credit notes = `CreditNote.status = ISSUED` only.
- Top lens: one bucket per selected eye; label `{lens_name} SPH … CYL … ADD …`.
- Section 4 must scroll with main page — avoid nested `flex-1 overflow-hidden` traps.

## Files
- `customer360Service.js` — overview aggregation
- `Customer360Metrics.jsx`, `Customer360Cards.jsx`, `Customer360Charts.jsx`, `Customer360Tabs.jsx`, `Customer360Main.jsx`
