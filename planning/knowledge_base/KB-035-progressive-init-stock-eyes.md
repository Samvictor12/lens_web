# KB-035 — Progressive R/L in Initialize Stock and Stock Summary

**Refs:** req-progressive-init-stock-eyes (2026-09-28)

## Spec

- Only **Progressive** (category name contains "prog") is per-eye — same rule as
  `BulkLensSelection` and PO inward. Single Vision / Bifocal stay single-eye and are stored
  on the right slot by convention.
- **Initialize Stock:** Progressive powers generate two allocation rows (Eye=R, Eye=L); each
  row has its own Location / Bin / Qty / Price. **Copy R → L** fills L rows that have no bin
  yet from the matching R row. Rows submit `eye: "R" | "L"`; `bulkInwardFromGrid` stores
  one-eye rows (existing backend path).
- **Stock Summary:** pivot and list bucket by power **plus eye** for Progressive, so R and L
  of the same SPH/ADD no longer merge. Eye column (pivot, CSV, PDF) and "Eye R/L" in the list
  power line. Non-Progressive rows show no eye.
- Existing right-only Progressive init stock was left as-is (no migration). SO FIFO / Stock
  Pick suggestions unchanged; left SOs still cross-match right-slot legacy stock.

## Code

- `src/backend/services/inventory.service.js` — `stockEyeSide(item, categoryName)`; eye in
  `getInventoryStockWithGrouping` (grouped key + ungrouped rows) and `getInventoryStockPivot`;
  `categoryName` on `getInventoryDropdowns().lensProducts`
- `src/pages/Inventory/InventoryInitializationForm.jsx` — R/L row generation, Copy R → L
- `src/pages/Inventory/InventoryStockTab.jsx` — Eye column / exports / list tag
