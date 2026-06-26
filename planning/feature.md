# Active Feature Spec

This is the single shared feature document (`planning/feature.md`). Each phase owns exactly one section below. Specialist sub-agents must only edit their designated sections and must never commit code.

---

## Requirement

### Summary
Enhance the **SO Request Query** (formerly Request Queue) tab in the Inventory Management module to support basic filtering and grouping of Sale Orders. Specifically:
1. **Filters**: Add fields to filter the list of orders by:
   - Customer (dropdown)
   - Lens Product (dropdown)
   - Customer Ref No (text search input)
   - SO Number (text search input)
2. **Grouping**: Add an option to group the list of orders by:
   - Customer
   - Lens Product
   - None (flat list view)

### Scope of Changes
- **Backend Service & Controller**:
  - Update `SaleOrderWorkflowService.getInventoryQueue` in `src/backend/services/saleOrderWorkflowService.js` to accept optional filter parameters: `customerId`, `lensProductId`, `customerRefNo`, and `orderNo`.
  - Pass these filters through to the Prisma query builder.
- **Frontend Page Component**:
  - Update `src/pages/Inventory/InventoryRequestQueueTab.jsx` to:
    - Add a collapsible or neat filter panel below the search bar containing Customer, Lens Product, Customer Ref No, and SO Number fields.
    - Fetch and populate the Customer and Lens Product dropdown values using the existing service functions (`getCustomersDropdown`, `getLensProductsDropdown`).
    - Add a Group By selector (`None`, `Customer`, `Product`) to group the list of orders.
    - If grouped, render headers for each group (e.g. customer name or product name) and show the corresponding Sale Order cards within those groups.
    - Pass the specific filters to the backend service call.

---

## Contract

- [x] Modify `src/backend/services/saleOrderWorkflowService.js`:
  - Extend `getInventoryQueue` to filter by `customerId`, `lensProductId`, `customerRefNo`, and `orderNo`.
- [x] Modify `src/pages/Inventory/InventoryRequestQueueTab.jsx`:
  - Fetch dropdown options for customers and products.
  - Implement a dense filter layout (Customer, Product, Customer Ref No, SO Number).
  - Add a Group By selection controls (`None`, `Customer`, `Product`).
  - Update backend fetch logic to send selected filters.
  - Render grouped/collapsible card sections when grouping is selected.

---

## Test plan

- [x] **Verify Filter Parameters on Backend**:
  - Send request to `/api/sale-orders/inventory-queue` with `customerId`, `lensProductId`, `customerRefNo`, or `orderNo` and verify the list is filtered correctly.
- [x] **Verify Grouping UI on Frontend**:
  - Load the tab, check that the filter options and Group By controls display correctly.
  - Group by Customer: verify orders are categorized under headers matching customer names.
  - Group by Product: verify orders are categorized under headers matching lens product names.
  - Select "None": verify orders return to a flat list.
- [x] **Verify Dropdowns & Live Fetching**:
  - Confirm Customer and Product dropdowns are populated.
  - Confirm selection triggers immediate refetch with correct filters.

---

## Test results

- **Backend Filters**: Verified using a scratch test script (`test_queue_filters.js`) that queries `GET /api/sale-orders/inventory-queue` with combinations of `customerId`, `lensProductId`, `orderNo`, and `customerRefNo`. All queries returned status 200 and the correctly filtered list of orders.
- **Frontend Dropdowns & Filtering**: Dropdowns load customer list and product list successfully. Toggling and selecting filters triggers immediate, reactive reload of the query.
- **Frontend Grouping UI**: Collapsible group headers render correctly when Group By Customer or Group By Product is active. The user can expand/collapse groups, and switching back to "None" displays a flat list of cards.

---

## Delivery note

No active delivery notes.
