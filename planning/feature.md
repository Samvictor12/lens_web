# Active Feature Spec

This is the single shared feature document (`planning/feature.md`). Each phase owns exactly one section below. Specialist sub-agents must only edit their designated sections and must never commit code.

---

## Requirement

### Exchange Coating Price Flow Alignment & Fixes

**Goal:** Ensure the `EXCHANGE_COATING_PRICE` offer flow functions exactly as designed in both the Offer Master and the Sale Order forms.

#### 1. Offer Master Form Changes (`src/pages/LensOffers/LensOffersForm.jsx`)
- Make the "Applies To" card (which contains the source `lens_id` and `coating_id` select inputs) visible when the `offerType` is `EXCHANGE_COATING_PRICE`.
- Enforce validations for both source and exchange product/coating fields to match backend requirements.

#### 2. Sale Order Form Price Calculation Integration (`src/pages/SaleOrder/SaleOrderForm.jsx`)
- Show helper text under the **Lens Price** input field to display the Exchange Product and Exchange Coating details when an exchange offer type (`EXCHANGE_COATING_PRICE` or `EXCHANGE_PRODUCT`) is selected.
- If the user selects a Product and Coating with an active exchange coating offer, display it in the Available Offers list.
- If the user selects an exchange offer, the Lens Price must change in the Calculate Price function. Selecting/clearing the offer should trigger the Calculate Price function automatically, showing the exchange product and exchange coating price as the lens price.

---

## Contract

### Frontend Pages
- [x] Render "Applies To" (source product and coating fields) in `LensOffersForm.jsx` when `offerType === "EXCHANGE_COATING_PRICE"`.
- [x] Trigger price calculation (`handleCalculatePrice`) in `SaleOrderForm.jsx` automatically when the selected `offer_id` changes.
- [x] Update `handleCalculatePrice` in `SaleOrderForm.jsx` to fetch the exchange price from the price master when an exchange offer is selected, using the exchange product and exchange coating price as the base price.
- [x] Ensure all submission payload builders (`handleSubmit`, `handleCreateAndRaisePO`, and `handleCreateAndPrint`) correctly send the offer-adjusted `lensPrice` and `discount` to the backend.
- [x] Add helper text to display exchange details under the read-only **Lens Price** input in `SaleOrderForm.jsx` when an exchange offer is selected.

---

## Test plan

- [ ] **Test Case 1**: In the Offer Form, choosing type "Exchange Coating Price" shows both the source product/coating dropdowns and exchange product/coating dropdowns.
- [ ] **Test Case 2**: In the Sale Order Form, selecting a product and coating with an active Exchange Coating Price offer displays the offer in the Available Offers list.
- [ ] **Test Case 3**: Selecting the Exchange Coating Price offer automatically triggers `handleCalculatePrice`, calculates the new price, and displays the exchange product/coating helper text under the Lens Price field.
- [ ] **Test Case 4**: Saving the Sale Order with the exchange offer saves the correct exchange price to the database.

---

## Test results

*(To be filled by QA)*

