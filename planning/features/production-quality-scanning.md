## Meta

- id: production-quality-scanning
- title: Barcode/QR scanning in Production and Quality modules
- type: feature
- status: DONE
- contract_version: 1
- last_updated: 2026-06-21

## 1 Requirement

Production (`src/pages/ProductionOperator`) and Quality (`src/pages/QualityOperator`, `src/pages/CheckSheet`) operators currently select items/trays/orders manually (search/dropdown). The user wants a scanning option (barcode/QR, likely via device camera or a handheld/USB scanner emitting keystrokes) to identify the item/tray/order instead of manual lookup, to speed up shop-floor data entry.

Add a scan-to-select input on the relevant Production and Quality screens that accepts a scanned barcode/QR value and resolves it to the matching item/tray/order, falling back to the existing manual search.

## 2 Contract

- Entity scanned: `SaleOrder`, identified by its existing unique `orderNo` field (`prisma/schema.prisma:870`, e.g. `SO-2025-001`). Investigation findings: Production/Quality operators don't select a Tray, Item, or CheckSheet — `TrayMaster` (`prisma/schema.prisma:987`) is an inventory bin/location master with no order linkage and is unrelated to these screens; `CheckSheet` (`src/pages/CheckSheet/CheckSheetMain.jsx`) is a master/template CRUD list, not part of the operator workflow. Both `ProductionOperatorList.jsx` and `QualityOperatorList.jsx` only ever search/select a `SaleOrder` row, then navigate to its detail by `id`. So scope is Production + Quality only; CheckSheet is excluded.
- Mechanism: keystroke-wedge (handheld/USB scanner typing into a focused input + Enter), NOT camera scanning. `package.json` has no barcode/QR JS library (verified via grep — none of `barcode|qrcode|zxing|html5-qrcode|jsqr|quagga` present), so camera scanning would add a new dependency. The existing manual search already does a substring match on `orderNo` server-side (`src/backend/services/saleOrderService.js:392-399`, `where.OR` includes `orderNo: { contains: search, mode: 'insensitive' }`), so a scanner emitting the full `orderNo` into the search box + Enter already resolves via the existing `getSaleOrders` call — no new backend endpoint needed.
- Gap to close: today Enter just re-runs the list search (`handleSearchSubmit` in both list files), so a scanned exact `orderNo` match still leaves the operator looking at a filtered list/card grid instead of jumping straight into the order. Contract is to auto-navigate when the scan yields exactly one match.
- New component: add `src/components/ui/ScanInput.jsx` — a thin wrapper around the existing `Input` (`src/components/ui/input.jsx`) that: (a) looks like a normal text input with a scan icon, (b) on Enter (or optionally after a configurable min-length pause) calls an `onScan(value)` callback and clears itself, (c) is otherwise uncontrolled/stateless so it can sit next to the existing manual search box rather than replacing it.
- Frontend wiring (no backend changes):
  - `src/pages/ProductionOperator/ProductionOperatorList.jsx`: replace the existing search `Input` (lines 146-151) usage — keep manual search as-is, but on scan (`ScanInput`'s `onScan`) call `getSaleOrders(1, 1, scannedOrderNo, { statuses: "CONFIRMED,IN_PRODUCTION,ON_HOLD" }, ...)`; if exactly one result and its `orderNo` matches the scanned value exactly, `navigate(`/production/operator/${order.id}`)` directly; otherwise fall back to populating `searchInput`/`search` (existing behavior) so the operator sees the filtered list.
  - `src/pages/QualityOperator/QualityOperatorList.jsx`: same pattern, using its own `statuses: "AWAITING_QUALITY"` filter, navigating to `/quality/operator/${order.id}`.
  - Both list files import and render `ScanInput` next to/below the existing search `form` (around line 142-156 / 130-142 respectively); no changes to `ProductionOrderDetail.jsx` or `QualityOrderDetail.jsx` are needed since they only consume an `id` from the route.
- Out of scope: `CheckSheet` module (master-data CRUD, not a shop-floor scan target), `TrayMaster` (unrelated inventory entity), any backend route/controller/service change (existing `GET /sale-orders` with `search` is sufficient), camera/video-based scanning.
- File touch-list: new `src/components/ui/ScanInput.jsx`; edits to `src/pages/ProductionOperator/ProductionOperatorList.jsx` and `src/pages/QualityOperator/QualityOperatorList.jsx`.

## 3 Test plan

**Changes made:**
- New `src/components/ui/ScanInput.jsx`: wraps `Input` with a `ScanLine` icon (lucide-react), positioned absolute-left like the existing `Search` icon convention. Uncontrolled (uses an internal ref, not React state) — on `Enter` it reads the DOM input's trimmed value, calls `onScan(value)`, and clears the field by setting `input.value = ""` directly; otherwise behaves like a normal `Input`.
- `src/pages/ProductionOperator/ProductionOperatorList.jsx`: imports `ScanInput`, renders it directly below the existing search `form` (no changes to the existing `Input`/`form`/`handleSearchSubmit`). Added `handleScan(scannedOrderNo)`: calls `getSaleOrders(1, 1, scannedOrderNo, { statuses: "CONFIRMED,IN_PRODUCTION,ON_HOLD" }, "orderDate", "desc")`. If the response is successful, returns exactly one row, and that row's `orderNo` exactly equals the scanned value, calls `navigate(`/production/operator/${results[0].id}`)`. Otherwise (0 or >1 results, non-exact match, or API error) falls back to `setSearchInput(scannedOrderNo); setSearch(scannedOrderNo)`, reusing the existing list-filter state/effect.
- `src/pages/QualityOperator/QualityOperatorList.jsx`: identical pattern — `getSaleOrders(1, 1, scannedOrderNo, { statuses: "AWAITING_QUALITY" }, "orderDate", "desc")`, navigates to `/quality/operator/${results[0].id}` on exact single match, else falls back to `setSearchInput`/`setSearch`.
- No backend, `CheckSheet`, or `TrayMaster` changes. No new dependency added (icon comes from the already-installed `lucide-react`).
- Verified `npx vite build` completes with no errors (3352 modules transformed, build succeeded).

**Manual verification steps:**
1. Production screen (`/production/operator`):
   - Note an existing order's exact `orderNo` (e.g. `SO-2025-001`) that is currently in status `CONFIRMED`, `IN_PRODUCTION`, or `ON_HOLD`.
   - Click into the new "Scan order barcode/QR…" field, type the full exact `orderNo`, press Enter (simulating a keystroke-wedge scanner). Expect: immediate navigation to `/production/operator/<that order's id>` (the order detail page), with no intermediate list/filter step.
   - Go back to the list. In the scan field, type a partial value (e.g. just `SO-2025`) or a value that matches zero/multiple orders, press Enter. Expect: no navigation; instead the page falls back to normal behavior — the manual search input now shows that typed value and the grid filters to matching orders (same as if it had been typed into the manual search box and submitted).
   - Type a value with no matches at all, press Enter. Expect: falls back to search/filter state, grid shows "No active production orders found."
   - Confirm the scan field clears itself back to empty immediately after each Enter press (uncontrolled clear), regardless of which branch was taken.
   - Confirm the original manual search `Input` + "Search" button still work exactly as before: typing into it and clicking Search (or its own Enter-triggered submit via the form) updates `search`/the grid without touching the scan field, and is unaffected by the new component being present.
2. Quality screen (`/quality/operator`): repeat the same three scan scenarios (exact match navigates to `/quality/operator/<id>`, partial/no match falls back to filter, manual search box unaffected) against an order in `AWAITING_QUALITY` status.
3. Confirm neither `CheckSheet` nor `TrayMaster` screens were touched (no `ScanInput` usage, no behavior change) — visually spot-check both still render and function as before.
4. Confirm no new runtime dependency was introduced: `package.json`/`package-lock.json` unchanged aside from this feature's own files; icon used is `ScanLine` from the already-installed `lucide-react`.

## 4 Test results

- result: PASS
- rework_tag: —
- next: ship as-is; no rework needed.

<findings>
Verified independently by reading actual code (not the implementer's summary):

1. `src/components/ui/ScanInput.jsx` — sensible uncontrolled wrapper around `Input`. Uses an internal ref + DOM `.value` read/clear, doesn't fight the controlled manual-search `Input`. Fires `onScan(value)` only on Enter with a non-empty trimmed value (`if (value) onScan?.(value)`), clears the field unconditionally after Enter. Safe with `onScan` undefined via `onScan?.(value)`. Ref-forwarding merges correctly with the existing `Input`'s own `ref={ref}` passthrough.

2. `ProductionOperatorList.jsx` — `handleScan` calls `getSaleOrders(1, 1, scannedOrderNo, { statuses: "CONFIRMED,IN_PRODUCTION,ON_HOLD" }, "orderDate", "desc")`, matching the real signature `getSaleOrders(page, limit, search, filters, sortField, sortDirection)` in `src/services/saleOrder.js:6-13`. Exact-match guard `results.length === 1 && results[0].orderNo === scannedOrderNo` is strict string equality, not substring — a partial scan (e.g. `SO-2025`) cannot false-positive navigate even though the backend search is substring-based, because equality against the full scanned string fails for a longer real `orderNo`. Fallback `setSearchInput(scannedOrderNo); setSearch(scannedOrderNo)` populates `searchInput` (bound to the visible `Input`'s `value`) and `search` (the actual dependency driving `fetchOrders` via `useCallback`/`useEffect`) — traced and both are genuinely read by render/effect logic, not orphaned state. The original manual search `form`/`Input`/`handleSearchSubmit` (lines 122-125, 170-183) are byte-for-byte present and untouched by the scan addition.

3. `QualityOperatorList.jsx` — identical pattern verified: `getSaleOrders(1, 1, scannedOrderNo, { statuses: "AWAITING_QUALITY" }, "orderDate", "desc")`, same exact-match guard, same fallback into `searchInput`/`search` which drives the same `fetchOrders` effect. Manual search form untouched.

4. Routes confirmed in `src/App.jsx:160` (`/production/operator/:id` → `ProductionOrderDetail`) and `:162` (`/quality/operator/:id` → `QualityOrderDetail`) — exact string matches to what both `handleScan` functions navigate to.

5. No backend files touched. `package.json` diff (`git diff -- package.json`) contains only unrelated pre-existing seed-script additions (`db:seed:ledgers`, `db:seed:accounting`, etc.) — no new runtime dependency; `lucide-react` (source of `ScanLine`) was already a dependency. `git diff`/`git status --porcelain` for `src/pages/CheckSheet` and `src/pages/TrayMaster` show zero changes.

6. `npx vite build` succeeds: 3352 modules transformed, built in 8.19s, no errors (one pre-existing unrelated chunk-size warning).

7. UX footgun check: accidental Enter while typing produces no effect when the field is empty (guarded by `if (value)`), and a real but non-matching value just populates the existing manual-search/filter state (same outcome as typing it into the manual box and clicking Search) — not a destructive or surprising action, consistent with what the contract accepted.

No deviations from contract found. All file-touch-list items match exactly: new `ScanInput.jsx`, edits confined to `ProductionOperatorList.jsx` and `QualityOperatorList.jsx`.
</findings>

## 5 Delivery note

**Shipped**: Production and Quality operator screens (`ProductionOperatorList.jsx`, `QualityOperatorList.jsx`) get a scan-to-jump input alongside the existing manual search. Scanning (typing + Enter, via a keystroke-wedge USB/Bluetooth scanner or manual typing) a full, exact `SaleOrder.orderNo` navigates straight to that order's detail page; anything else (partial value, no match, multiple matches) falls back to the existing manual search/filter behavior unchanged.

**Scope decision**: investigated the actual workflow rather than guessing — these screens select `SaleOrder`s, not `Tray`/`Item`/`CheckSheet` as the original request loosely implied. No camera/QR library added (none existed in the stack); reuses the existing search-by-`orderNo` API as-is. `CheckSheet` and `TrayMaster` are unrelated and untouched.

**No backend changes** — the existing `GET /sale-orders?search=` substring match on `orderNo` was already sufficient.
