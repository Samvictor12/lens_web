# KB-024 — Inventory tray transfer and cycle-count audit

**Refs:** PRD-4.14, DD-1.1, SD-1.1, FD-2.5, req-001 (2026-09-14)

## Pattern

- **Audit transfer:** Reuse `POST /api/inventory/transactions` `type=TRANSFER`. Dest tray ≠ source tray; same godown. Do not invent a second transfer API.
- **Cycle count is verification-only:** Snapshot `bookQty` at count time. Never write ADJUSTMENT/DAMAGE/INWARD on count, recount, accept-variance, or post (KB-019).
- **Outcomes:** First |variance| > `recountThreshold` → `PENDING_RECOUNT`. Recount match → `MATCH`; still off or accept-variance → `SHORTAGE`/`OVERAGE`.
- **Statuses:** `PLANNED` → `IN_PROGRESS` on first count → `PENDING_REVIEW` if any `PENDING_RECOUNT` else stay `IN_PROGRESS` → `POSTED`. Post only if counted trays have no `PENDING_RECOUNT`/`UNCOUNTED` lines.
- **Dashboard KPIs:** Open session if any, else latest `POSTED` in calendar month. Completion = distinct trays counted / trays in scope. Accuracy = MATCH lines / counted lines. Card click → `/inventory/{slug}/audit#cycle-count`.

## Reuse

- Godown isolation: `inventoryItemGodownWhere` / `location.godownType` (KB-016).
- Unit TRANSFER ledger: qty N → N tagged rows + `parentTransactionId` (KB-019).
