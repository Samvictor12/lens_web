## Meta

- id: dispatch-delivery-agent-filter
- title: Filter dispatches by delivery agent
- type: feature
- status: DONE
- contract_version: 1
- last_updated: 2026-06-21

## 1 Requirement

Users need to filter the Dispatch listing by the delivery agent assigned to each dispatch (the same "delivery person" concept used in `src/pages/Dispatch/DeliveryPersonView.jsx` / `CreateDispatchModal.jsx` / `ViewDispatchModal.jsx`). Today the dispatch list (`DispatchList.jsx`, `AdminDispatchView.jsx`) has no way to narrow records down to "everything assigned to agent X" — admins want this to track an agent's workload and follow up on their pending deliveries.

Add a delivery-agent filter (dropdown/select) to the Dispatch list/dashboard so results can be scoped to one delivery agent at a time, in addition to whatever filters already exist there.

## 2 Contract

- Model field: `DispatchCopy.deliveryPersonId` (Int?, relation `deliveryPerson` -> `User`) already exists in `prisma/schema.prisma` — **no schema/migration change needed**.
- Backend: `src/backend/services/dispatchService.js`, `getDispatchList(userId, roleName, filters)` (~line 222-259).
  - Destructure new `deliveryPersonId` from `filters`.
  - Add: `if (deliveryPersonId) where.deliveryPersonId = Number(deliveryPersonId);` placed after the existing `customerId` filter, before the date-range block. Do not override the existing delivery-person self-scoping (`isDeliveryPerson(roleName)` branch) — admin/staff-only filter in practice since that branch already locks delivery persons to their own id.
- Backend route/controller: no change needed — `src/backend/routes/dispatch.routes.js` `GET /dispatch/list` and `dispatchController.getDispatchList` already pass `req.query` through untouched to the service.
- Query param name: `deliveryPersonId` (matches existing field name and the `CreateDispatchModal.jsx` form field naming convention).
- Frontend data source for dropdown options: reuse `getDeliveryPersonsDropdown()` from `src/services/user.js` (`GET /user-master/delivery-persons/dropdown`) — same source already used in `src/pages/Dispatch/components/CreateDispatchModal.jsx`. Do not add a new endpoint.
- Frontend UI: `src/pages/Dispatch/components/DispatchList.jsx` — add the filter inside the existing `Sheet` filter panel (the "Filters" button/sheet, ~lines 184-219), as a new field between "Status" and "Dispatch Date From", following the same `Label` + `FormSelect` pattern used for Status (options loaded via `useEffect` + `getDeliveryPersonsDropdown()` into local state, with a leading `{ value: "", label: "All Delivery Agents" }` option).
- Wire into existing temp/committed filter state pattern: add `deliveryAgentFilter`/`tempDeliveryAgent` state alongside `statusFilter`/`tempStatus`; include in `handleApplyFilters`, `handleClearFilters`, `handleCancelFilters`, `hasActiveFilters`, and the `fetchList` params spread (`...(deliveryAgentFilter ? { deliveryPersonId: deliveryAgentFilter } : {})`).
- Files touched: `src/backend/services/dispatchService.js`, `src/pages/Dispatch/components/DispatchList.jsx`. No changes to `AdminDispatchView.jsx`, `DispatchDashboard.jsx`, `DeliveryPersonView.jsx`, `CreateDispatchModal.jsx`, `ViewDispatchModal.jsx`, routes, controller, or schema.

## 3 Test plan

### What changed

- `src/backend/services/dispatchService.js` — `getDispatchList(userId, roleName, filters)`: destructured `deliveryPersonId` from `filters` and added `if (deliveryPersonId) where.deliveryPersonId = Number(deliveryPersonId);` immediately after the `customerId` filter and before the `dateFrom`/`dateTo` block. The existing `isDeliveryPerson(roleName)` branch (which sets `where.deliveryPersonId = userId` for delivery-person-role users) runs first and is unaffected — it is only ever overwritten by the new line in practice for admin/staff roles, since delivery-person-role callers don't pass this query param from the UI.
- REWORK fix: changed the guard to `if (deliveryPersonId && !isDeliveryPerson(roleName)) where.deliveryPersonId = Number(deliveryPersonId);` so a delivery-person-role user passing a different `deliveryPersonId` query param is now ignored — their own self-scoping (`where.deliveryPersonId = userId`) still applies and can no longer be overridden.
- `src/pages/Dispatch/components/DispatchList.jsx`:
  - Imported `getDeliveryPersonsDropdown` from `@/services/user`.
  - Added `deliveryAgentFilter`/`setDeliveryAgentFilter` (committed) and `tempDeliveryAgent`/`setTempDeliveryAgent` (sheet-local) state, mirroring `statusFilter`/`tempStatus`.
  - Added `deliveryAgents` state populated via a `useEffect` on mount calling `getDeliveryPersonsDropdown()`, mapped to `{ value, label }` and prefixed with `{ value: "", label: "All Delivery Agents" }`.
  - Added a "Delivery Agent" `Label` + `FormSelect` block in the Filters `Sheet`, positioned between "Status" and "Dispatch Date From".
  - Wired `deliveryAgentFilter` into `fetchList`'s params spread (`...(deliveryAgentFilter ? { deliveryPersonId: deliveryAgentFilter } : {})`) and its `useCallback` deps, into `hasActiveFilters`, `handleApplyFilters`, `handleClearFilters`, `handleCancelFilters`, and the `Sheet`'s trigger `onClick` (which seeds temp state from committed state when the sheet opens).

### Manual verification steps

1. Log in as an admin/staff user and navigate to the Dispatch list.
2. Click "Filters" to open the Filters sheet; confirm a new "Delivery Agent" dropdown appears between "Status" and "Dispatch Date From", defaulted to "All Delivery Agents".
3. Confirm the dropdown options match the real delivery-person list (same names shown in `CreateDispatchModal`'s "Delivery Person" dropdown when creating a dispatch) — verifies it reuses `getDeliveryPersonsDropdown()` and not a separate/stale source.
4. Select a specific delivery agent and click "Apply Filters". Confirm the list reloads (page resets to 1) and only dispatches assigned to that agent are shown; confirm the "Filters" button shows the active-filter dot indicator.
5. Reopen the Filters sheet — confirm the previously selected agent is still shown as selected (temp state correctly seeded from committed state).
6. Click "Clear Filters". Confirm the dropdown resets to "All Delivery Agents" and the full (unfiltered) dispatch list returns.
7. Combine the delivery-agent filter with Status and/or date-range filters and Apply; confirm results satisfy all filters simultaneously (AND semantics, since all conditions land in the same Prisma `where`).
8. Log in as a delivery-person-role user and open their dispatch view. Confirm their list is unaffected by this change: it remains self-scoped to their own `deliveryPersonId` via the existing `isDeliveryPerson(roleName)` branch in the service, since the delivery-agent filter UI/param is only exercised from the admin-facing `DispatchList.jsx` filter sheet.
9. Run `npx vite build` (passes, 3350 modules transformed) and `node --check src/backend/services/dispatchService.js` (passes) to confirm no syntax/build errors.

## 4 Test results

- result: PASS
- rework_tag: —
- next: None — fix verified, ready to mark DONE.

Confirmed `src/backend/services/dispatchService.js` line 232 now reads exactly `if (deliveryPersonId && !isDeliveryPerson(roleName)) where.deliveryPersonId = Number(deliveryPersonId);`, immediately after the self-scoping branch (`if (isDeliveryPerson(roleName)) where.deliveryPersonId = userId;`, lines 227-229) which is unchanged and still runs first.

Scope/correctness of `isDeliveryPerson`/`roleName`: `isDeliveryPerson = (roleName) => roleName === 'Delivery Person'` (line 40) is a simple exact-match check used identically across every other branch in this file (`getDispatchDashboard`, `getReadyForDispatch`, `updateDispatchStatus`, `bulkMarkPickup`, `bulkMarkDelivered`) — no case-sensitivity or null-handling change was introduced by this fix; if it were broken, every one of those existing role checks would already be broken too, so this is not a new risk. `roleName` is sourced server-side in `dispatchController.js` (`getDispatchList`) as `req.user?.role?.name` — populated by auth middleware from the authenticated user's DB-backed role, not client-controllable, so it cannot be spoofed via query params and is reliably populated for any authenticated request.

Hand-traced both required scenarios against the live code:
- Delivery-person bypass attempt: roleName = `'Delivery Person'`, userId = 5, query `?deliveryPersonId=99` → line 227-229 sets `where.deliveryPersonId = 5`; at line 232, `!isDeliveryPerson(roleName)` evaluates `false`, so the new line is skipped entirely. Final `where.deliveryPersonId = 5`. The override is fully blocked — matches the contract requirement.
- Admin/staff filtering: roleName = `'Admin'` (any non-`'Delivery Person'` string), query `?deliveryPersonId=99` → self-scoping branch skipped (condition false); at line 232, `!isDeliveryPerson(roleName)` is `true`, so `where.deliveryPersonId = 99`. Filtering by arbitrary agent still works for admin/staff as intended.

`node --check src/backend/services/dispatchService.js` run directly — passes, no syntax errors.

Frontend spot-check: `git diff` for `src/pages/Dispatch/components/DispatchList.jsx` is byte-identical to the version already inspected and approved in the prior FAIL pass (delivery-agent dropdown wiring into temp/committed filter state, `fetchList` params spread, `hasActiveFilters`, `handleApplyFilters`/`handleClearFilters`/`handleCancelFilters` — all unchanged). The rework commit touched only the backend guard line; no frontend regression.

Out-of-scope note carried forward (not blocking): `git diff` still shows unrelated changes in `CreateDispatchModal.jsx`/`ViewDispatchModal.jsx` and other backend code (`getReadyForDispatch`/`createDispatch` fixes) outside this feature's two-file touch-list — pre-existing from other work in the same working tree, not introduced by this rework, and not re-flagged as a blocker here.

## 5 Delivery note

**Shipped**: Dispatch list (admin/staff Filters sheet in `DispatchList.jsx`) gets a "Delivery Agent" dropdown filter, reusing the existing `getDeliveryPersonsDropdown()` source. Backend: `dispatchService.js getDispatchList` accepts a `deliveryPersonId` query param.

**Rework note**: first QA pass caught a real authorization bug — the new filter could let a delivery-person-role user override their own self-scoping and view another agent's dispatches via the query param. Fixed by gating the new filter with `!isDeliveryPerson(roleName)`; delivery-person users are always locked to their own `userId` regardless of any `deliveryPersonId` param they pass. Re-verified clean on retest.

**No schema/route/controller changes** — `deliveryPersonId` already existed on the Dispatch model; route already passed `req.query` through untouched.
