# Active Feature Spec

This is the single shared feature document (`planning/feature.md`). Each phase owns exactly one section below. Specialist sub-agents must only edit their designated sections and must never commit code.

---

## Requirement

### Bug (Pass G — follow-on to Pass F): Inward/Outward Quantity Trend chart still drops "today" (27 Jun) — frontend computes "today" in UTC, not local calendar date

**Reported symptom:** After Pass F's backend end-of-day fix, 25 and 26 Jun now show correctly, but 27 Jun ("today") still never appears on the chart.

**Confirmed root cause (live-reproduced):** `dateRangeToParams()` in `InventoryDashboard.jsx:33-44` computes `endDate: now.toISOString().slice(0,10)`. `Date.prototype.toISOString()` always renders in **UTC**, not local time. The server/app's local timezone is IST (UTC+5:30) — confirmed via `date` showing `Sat Jun 27 2026 04:15 IST`, while `new Date().toISOString().slice(0,10)` evaluates to `"2026-06-26"` at that exact same instant. So during the ~5.5-hour window between IST midnight and 5:30 AM, the frontend sends `endDate` as **yesterday's** date, not today's — the backend's Pass F fix (extending `lte` to end-of-day for whatever `endDate` it receives) cannot help, because the `endDate` value itself already excludes "today" before the backend ever sees it.

**Expected behavior:** `dateRangeToParams()` must compute "today" (and the "N days ago" start date) using the **local** calendar date, not a UTC-shifted one — so the chart always includes the full current local day, at any time of day.

**Scope:** Frontend only — `src/pages/Inventory/InventoryDashboard.jsx`'s `dateRangeToParams()`. No backend change expected (Pass F's end-of-day `lte` handling is correct once it receives the right `endDate`/`startDate` strings).

**Out of scope:** Re-touching Pass F's backend `lte` logic, the chart's quantity metric, stat cards, or export — all unaffected by this bug.

---

## Contract

No backend, Prisma, or API changes — Pass F's server-side end-of-day `lte` handling is correct once it receives the right date strings. This is a pure frontend date-arithmetic fix.

### Frontend (`src/pages/Inventory/InventoryDashboard.jsx`)
- [x] Added `toLocalDateStr(d)` helper next to `fmtDate` (`InventoryDashboard.jsx:30-38`) — builds `YYYY-MM-DD` from `d.getFullYear()`/`getMonth()`/`getDate()` (local components), not UTC.
- [x] `dateRangeToParams()`'s `"7d"`/`"30d"` branches now use `toLocalDateStr(now)` for `endDate` instead of `now.toISOString().slice(0, 10)`.
- [x] Same branches' `startDate` now use `toLocalDateStr(s)` instead of `s.toISOString().slice(0, 10)` — consistent local-date handling for both bounds.
- [x] `customFrom`/`customTo` branch left untouched, as scoped.

### Regression guard
- [x] No backend changes made — `getStockValueReport()`/`getInventoryTransactions()` (Pass F) untouched.
- [x] No change to chart rendering, legend, export, labels, or aggregation logic.

## Test plan

- [x] Test Case 1: "Today" is correctly included when queried during the IST early-morning UTC-date-mismatch window
  - **Test Data:** An `InventoryTransaction` dated "today" (real calendar date in IST), queried at a real-world time between IST midnight and 5:30 AM (the window where `toISOString()` previously under-reported the date by one day).
  - **Steps:** Open Inventory Dashboard → "Inward / Outward Quantity Trend" → "Last 7 Days", during that time window (or simulate via a Node check of `dateRangeToParams()`'s output at that instant).
  - **Expected:** `endDate` sent to the backend equals today's actual IST calendar date, not yesterday's — today's transaction quantity appears on the chart.

- [x] Test Case 2: "Today" still correct outside the mismatch window (no regression for the common case)
  - **Test Data:** Same transaction, queried at a normal daytime IST hour (e.g. 3 PM IST).
  - **Steps:** Load the trend chart at that time.
  - **Expected:** `endDate` still equals today's correct calendar date (this already worked before the fix at this hour — confirm the fix doesn't break it).

- [x] Test Case 3: `startDate` ("N days ago") uses the same correct local-date logic
  - **Test Data:** A transaction dated exactly 7 (or 30) days before today.
  - **Steps:** Load "Last 7 Days" / "Last 30 Days".
  - **Expected:** That boundary-day transaction is included (`gte`), consistent with local calendar days, not shifted by a UTC slice.

- [x] Test Case 4: Custom date range (`customFrom`/`customTo`) unaffected
  - **Test Data:** N/A — code-path check only.
  - **Steps:** Confirm `dateRangeToParams()`'s custom-range branch (`return { startDate: customFrom || "", endDate: customTo || "" }`) was not modified.
  - **Expected:** Custom range still passes through user-supplied strings unchanged.

- [x] Test Case 5: End-to-end regression — full 25/26/27 Jun scenario now complete
  - **Test Data:** Transactions on 25, 26, and 27 Jun (same dataset used for Pass F's Test Case 1).
  - **Steps:** Load "Last 7 Days" trend chart.
  - **Expected:** All three dates now appear with correct quantities — this is the original bug report's full resolution (Pass F fixed the backend boundary; this Pass G fixes the frontend's "today" computation that was still excluding 27 Jun).

---

## Test plan

*(To be filled by planner-architect)*

---

## Test results

- result: PASS
- levels: L1 PASS, L2 N/A (no API payload/field shape changes), L3 N/A (no new records), L4 PASS, L5 PASS

**Verification method:** Static code review + Node simulation of `dateRangeToParams()`'s actual logic, plus a real `vite build` (no live DB/browser run — same caveat as prior passes in this module).

- **L1 (build):** `npx vite build --mode development` succeeds (4183 modules transformed, no errors) — confirms no syntax/JSX issues introduced.
- **Test Case 1 (mismatch-window correctness):** Simulated `dateRangeToParams('7d', now)` with `now = 2026-06-27T04:15:00` (local) → `{ startDate: '2026-06-20', endDate: '2026-06-27' }`. `endDate` is correctly today (27th), not yesterday (26th) — confirms the exact reported symptom is fixed.
- **Test Case 2 (normal-hour, no regression):** Same simulation at `15:00` local → identical correct output `{ startDate: '2026-06-20', endDate: '2026-06-27' }` — confirms the fix doesn't change behavior outside the mismatch window.
- **Test Case 3 (30d / start boundary):** Simulated `'30d'` branch at `15:00` → `{ startDate: '2026-05-28', endDate: '2026-06-27' }`, a correct 30-calendar-day local span.
- **Test Case 4 (custom range untouched):** Confirmed via diff — the `return { startDate: customFrom || "", endDate: customTo || "" }` line is unchanged.
- **Test Case 5 (end-to-end 25/26/27 Jun):** With Pass F's backend end-of-day `lte` fix already in place and this Pass G fix now sending the correct local `endDate`, the two fixes compose correctly: `endDate` now resolves to `"2026-06-27"` (this pass), and the backend extends that to `2026-06-27T23:59:59.999` local before comparing (Pass F) — so 27 Jun's transactions are no longer excluded by either layer. Logically complete; not exercised against a live Postgres/browser session.
- **L5 (KB regression):** Checked `lessons_learned.md` (KB-001–KB-022) — `KB-022` (added for Pass F) covers the backend half of this exact bug class; recommend Orchestrator extend that KB entry (or add a companion note) to also cover the frontend half: `toISOString().slice(0,10)` for "today"/date-math is UTC-based and must not be used for local-calendar-date computations — use explicit `getFullYear()/getMonth()/getDate()` instead. No other KB items implicated.

**Caveat:** Not exercised against a live browser session at an actual IST early-morning wall-clock time with real `InventoryTransaction` rows — verification is Node-simulated logic + a successful production-mode build. Recommend a live spot-check (can be simulated any time of day by checking the Network tab's request params for `startDate`/`endDate` against the actual local date).

---

## Delivery note

- Follow-on to Pass F: after fixing the backend's `lte` end-of-day boundary, the user reported 27 Jun ("today") was still missing from the trend chart even though 25/26 Jun now showed correctly.
- Root cause (live-reproduced at `Sat Jun 27 2026 04:15 IST`): `InventoryDashboard.jsx`'s `dateRangeToParams()` computed `endDate` via `now.toISOString().slice(0, 10)`, which renders in UTC. At that exact instant, this returned `"2026-06-26"` instead of `"2026-06-27"` — the frontend was sending the wrong calendar day as "today" during the ~5.5-hour IST midnight-to-5:30AM window, so Pass F's backend fix had no effect because the `endDate` it received already excluded the current day.
- Fix: added a `toLocalDateStr(d)` helper (`InventoryDashboard.jsx:33-40`) using `d.getFullYear()/getMonth()/getDate()` (local components), and swapped both the `startDate` and `endDate` computations in the `"7d"`/`"30d"` branches of `dateRangeToParams()` to use it instead of `toISOString().slice(0,10)`.
- No backend changes in this pass — Pass F's `lte` end-of-day handling was already correct once given the right date string.
- Verified via Node simulation of the actual function logic (confirmed `endDate` now correctly resolves to today at the exact previously-broken instant) plus a successful `vite build --mode development`. **No live DB/browser run** — recommend a live spot-check.
- Docs updated: `planning/Modules/Inventory.md` (Pass G row), `planning/knowledge_base/lessons_learned.md` (extended `KB-022` with the frontend companion bug + the general lesson: date-range bugs can span both layers, fix/verify both before declaring done).
- `git status` still shows uncommitted changes across Pass E/F/G in the same two files (`inventory.service.js`, `InventoryDashboard.jsx`) — nothing committed yet this session.

---

*(Section cleared and ready for the next feature.)*
