# Active Feature Spec

This is the single shared feature document (`planning/feature.md`). Each phase owns exactly one section below. Specialist sub-agents must only edit their designated sections and must never commit code.

---

## Requirement

### Initial Stock Inward Location Optimization (Per-Row Location & Tray Allocation)

**Goal:** Move Location selection from Step 1 (global parameter) to Step 2 (per-spec row parameter). This allows the user to generate Cartesian range combinations without choosing a Location upfront, and allocate different specs to different physical Locations and Trays in a single inward batch.

#### 1. Input Section (Form Setup - Step 1)
When clicking the "Add Stock" button in the Inventory module, the modal pops up and asks for:
* **Product:** Dropdown selection (from the Product master).
* **Coating:** Dropdown selection (from the Coating master, representing the coating of the product).
* **Spherical Range:** From/To (0.25 steps)
* **Cylinder Range:** From/To (0.25 steps)
* **Add Range:** From/To (0.25 steps)
* **Global Cost Price:** Optional numeric field to default the price for all generated fields.
* **Generate Button:** Click to validate fields and generate the spec combinations.
*(Note: Location is NOT asked in Step 1).*

#### 2. Generated Coating List (Allocation Grid - Step 2)
Clicking the "Generate" button displays the selected Coating as an expandable header/card:
* The header displays the **Coating Name** (or "No Coating" if none is selected).
* An **Expand** toggle/button.
* When expanded, a table/list shows the following 5 columns:
  1. **Product Spec:** Automatically generated string combining the Spherical, Cylinder, and Add ranges (incrementing by `0.25`).
  2. **Location:** Select dropdown displaying all storage locations.
  3. **Tray:** Select dropdown displaying trays available for the **selected Location of this row**.
     * This dropdown remains disabled or empty until a Location is chosen for the current row.
     * Shows live tray occupancy/capacity once Location is selected.
  4. **Qty:** Input field. When the user selects a Tray, this field becomes visible/active and shows the tray's remaining available capacity/gap next to it.
  5. **Price:** Price input field. When the user selects a Tray, this field becomes visible/active and is pre-populated with the Global Cost Price, but remains fully editable.

#### 3. Live Sibling Tray Occupancy
* Recalculates the tray available gap in real-time, subtracting quantities assigned to the same tray *across other specs in the current form*.

#### 4. Validation and Submission
* **Validation:** Verify that every row that has a selected Tray also has a selected Location, a Qty > 0 (does not exceed tray available gap), and a valid Price (>= 0).
* **Backend Integration:**
  - Update `inventory.service.js`'s `bulkInwardFromGrid` backend API function to allow `location_id` to be passed per split or row, rather than being required globally at the top level.
  - Submit the mapped payload containing per-split `location_id` and `tray_id` to the API.

---

## Contract

Update frontend `InventoryInitializationForm.jsx` and backend `inventory.service.js` to implement per-row Location and Tray dropdowns, dynamic loading of trays per row, capacity verification, and backend support for split-level locations.

### Backend (`src/backend/services/inventory.service.js`)
- [ ] Update `bulkInwardFromGrid` validation to verify that either a top-level `location_id` is passed, or all splits have a `location_id`.
- [ ] Map the `location_id` of created inventory items using the split's `location_id` if present, falling back to top-level `location_id`.

### Frontend (`src/pages/Inventory/InventoryInitializationForm.jsx`)
- [ ] Remove Location field from Step 1.
- [ ] Keep Locations array loaded in Step 1 but render it inside the table in Step 2.
- [ ] Implement `locationTrays` mapping in state to cache trays loaded by Location ID.
- [ ] In Step 2 table, add the "Location" select column.
- [ ] When a row's Location is selected, clear its Tray/Qty/Price, fetch its trays (if not cached), and load occupancy data.
- [ ] Dynamically render Tray dropdown options from the row's location's trays list. Keep Tray disabled until Location is selected.
- [ ] When a Tray is selected, show/enable Qty & Price inputs, displaying live available gap.
- [ ] Map the table rows to splits with `location_id` inside individual splits.
- [ ] Update validations on submit to check for both Location and Tray before checking Qty/Price.

---

## Test plan

- [ ] Test Case 1: Locations are fetched on load, but no Location field is rendered in Step 1.
- [ ] Test Case 2: Generated spec table contains "Location" dropdown as column 2.
- [ ] Test Case 3: Choosing a Location enables Tray dropdown for that row, loading its specific trays list.
- [ ] Test Case 4: Changing Location resets Tray, Qty, and Price fields for that row.
- [ ] Test Case 5: Selecting a Tray displays the Qty (prefilled/showing gap) and Price (prefilled with global cost price) inputs.
- [ ] Test Case 6: Submitting invokes `bulkInwardFromGrid` with `location_id` inside splits. Backend successfully registers each spec row to its respective selected location and tray.
- [ ] Test Case 7: Validation blocks submit if Location is selected but Tray is missing, or Qty exceeds live tray capacity.

---

## Test results

- result: PASS
- levels: L1 PASS, L2 PASS, L3 PASS, L4 N/A, L5 PASS

**Verification method:**
- **L1 Build**: Compiled frontend successfully via `npx vite build --mode development`.
- **L3 DB Integration**: Updated `scratch/test-grid-inward.js` to omit top-level `location_id` and send `location_id` per-split. Executed it end-to-end against Postgres. Successfully verified location and tray creation, item mapping, transaction creation, and cleanup. All tests passed.
