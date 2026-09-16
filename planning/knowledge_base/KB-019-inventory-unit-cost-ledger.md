# KB-019 Inventory unit-cost transaction ledger

**Refs:** PRD-4.9, DD-1.1, SD-1.1, req-001 (2026-09-08)

OPEN sources are `INWARD_PO`, `INWARD_DIRECT`, and `TRANSFER` (`remainingQty`, `status`). Outward/damage/transfer qty N writes N unit rows tagged with `parentTransactionId`. Source `remainingQty` 0 → CONSUMED.

PO receipt does not lock unit price. Vendor bill sets `INWARD_PO.unitPrice` from line subtotal / inward qty (`inventoryUnitCostLedger.js`). Direct inward uses operator `costPrice` immediately.

Do not create new `ADJUSTMENT` rows. QC reuse writes `INWARD_DIRECT`. Keep the enum for legacy reads only.

Sale-invoice COGS / bill dates are req-002, not this layer.
