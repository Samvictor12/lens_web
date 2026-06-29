# Active Feature Spec

This is the single shared feature document (`planning/feature.md`). Each phase owns exactly one section below. Specialist sub-agents must only edit their designated sections and must never commit code.

---

## Requirement

### Customer Credit Limit, Product Index, and Dropdown Enhancements

**Goal:** Implement validation constraints for Customer Credit Limit and Lens Product Index, and enhance the Lens Product dropdown labels to include key metadata.

#### 1. Customer Credit Limit Validation
- Make Customer Credit Limit mandatory.
- Enforce this requirement in the frontend validation inside [CustomerForm.jsx](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/pages/Customer/CustomerForm.jsx) and the backend validator schema inside [customerMasterDto.js](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/backend/dto/customerMasterDto.js).
- Update the form input to show the field as required and update its label from "Credit Limit (Optional)" to "Credit Limit".
- No database schema modification should be made.

#### 2. Lens Product Index Validation
- Make Lens Product Index mandatory.
- Enforce this requirement in the frontend validation inside [LensProductForm.jsx](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/pages/LensProductMaster/LensProductForm.jsx) and the backend validator schema inside [lensMastersDto.js](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/backend/dto/lensMastersDto.js).
- Update the form select field in the UI to mark Index as required.

#### 3. Lens Product Dropdown Metadata
- Modify the database query in [lensProductMasterService.js](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/backend/services/lensProductMasterService.js#L530-L570) to select the `index` relation, and construct a detailed dropdown option label formatted as: `${product_code} - ${lens_name} [${index_name}]`.

#### 4. Sale Order Creation Dialog Bug
- Fix a bug where successfully saving/creating a Sale Order or printing a new order displays the confirmation warning: "Are you sure? Any unsaved changes will be lost." and instead close the window directly.

#### 5. Sale Order List Default Sorting
- Ensure that the Sale Order list is sorted by `createdAt` descending (`desc`) by default on the frontend.

#### 6. Raise PO from SO Dialog
- When raising a PO from a Sale Order inside the View SO page, show a blocking alert dialog containing the generated PO number upon success and error, instead of a non-blocking toast.

#### 7. SO Cancel Visibility after Raising PO
- Prevent the "Cancel SO" action from being shown once a PO is raised (SO status becomes `PO_RAISED`).
- Force a complete page reload (`window.location.reload()`) upon successfully raising a PO so the updated status is fetched and shown immediately.

#### 8. SO and PO WebSocket Live List Refresh
- Install the `ws` library on the backend and build a WebSocket broadcast system in [websocket.js](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/backend/utils/websocket.js) attached to the main server inside [server.js](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/backend/server.js).
- Intercept successful mutating requests in [saleOrders.routes.js](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/backend/routes/saleOrders.routes.js) and [purchaseOrder.routes.js](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/backend/routes/purchaseOrder.routes.js) using router middlewares to broadcast updates.
- Connect to the WebSocket server on mount in the list views [SaleOrderMain.jsx](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/pages/SaleOrder/SaleOrderMain.jsx) and [PurchaseOrdersMain.jsx](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/pages/PurchaseOrder/PurchaseOrdersMain.jsx), auto-refreshing lists/dashboards when update events are received.

#### 9. Auto-Logout / Session Expiry Bug
- Fix a race condition in [auth.service.js](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/backend/services/auth.service.js) where concurrent token refreshes from multiple tabs/windows overwrite the single unique refresh token in the database, causing other active tabs to immediately invalidate and log the user out.
- Reuse the existing refresh token during token refresh operations instead of rotating/updating it to prevent multi-tab logout issues.

#### 10. PO Receive and Inward Alerts & Close
- Update the Purchase Order Inward flow inside [POInwardToInventory.jsx](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/pages/PurchaseOrder/POInwardToInventory.jsx) to show a blocking alert dialog upon success/error and close the page on OK click.

#### 11. Received PO Actions Lock & View-Only Mode
- Once a Purchase Order has been received (receivedQty > 0 or status is RECEIVED / PARTIALLY_RECEIVED):
  - Lock editing: Hide the "Edit" button in [PurchaseOrderForm.jsx](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/pages/PurchaseOrder/PurchaseOrderForm.jsx) and force read-only mode if manually loaded in edit view.
  - Cancel PO: Ensure "Cancel PO" is not shown when it has been received.
  - Receive again: Only allow receive action if the PO has a status of DRAFT or PARTIALLY_RECEIVED with pending quantities remaining, and hide it once fully received.
  - Delete PO: Hide the "Delete" trash action from the PO list in [usePurchaseOrderColumns.jsx](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/pages/PurchaseOrder/usePurchaseOrderColumns.jsx) for received/partially received orders.

#### 12. Allow Invoicing/Billing for Dispatched Orders
- Enable invoicing/billing for sale orders in either `DISPATCHED` or `DELIVERED` status.
- Update `getAllDispatchedOrders`, `getDeliveredOrders`, and `createInvoice` validators inside [invoiceService.js](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/backend/services/invoiceService.js).
- Update frontend helper labels in [DispatchedOrdersTab.jsx](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/pages/Billing/DispatchedOrdersTab.jsx) and [CreateInvoiceDialog.jsx](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/pages/Billing/CreateInvoiceDialog.jsx) to indicate support for both `DISPATCHED` and `DELIVERED` statuses.

#### 13. PO Inward Status Transition & Actions Lock
- Once a Purchase Order has been received, hide the "Edit Receive" button inside [usePurchaseOrderColumns.jsx](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/pages/PurchaseOrder/usePurchaseOrderColumns.jsx).
- Once all quantity of the PO has been fully inwarded to stock:
  - Automatically update the Purchase Order status to `CLOSED` (Completed) inside [purchaseOrderService.js](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/backend/services/purchaseOrderService.js).
  - Hide the "Inward" button in the list view (as the status transitions away from `RECEIVED` to `CLOSED`).

#### 14. Same Window PO Navigation
- Prevent opening new tabs when viewing, adding, receiving, or inwarding Purchase Orders.
- Replace all `window.open` calls with router `navigate` actions in [PurchaseOrdersMain.jsx](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/pages/PurchaseOrder/PurchaseOrdersMain.jsx), [PurchaseOrderForm.jsx](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/pages/PurchaseOrder/PurchaseOrderForm.jsx), and [usePurchaseOrderColumns.jsx](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/pages/PurchaseOrder/usePurchaseOrderColumns.jsx).

#### 15. FIFO Queue Ordering — Pre-QC, Production, Post-QC
- Change the sort order in all three operator queue lists from `orderDate desc` to `updatedAt asc` so the oldest entry in each stage appears first (FIFO).
  - **Pre-QC**: [QualityOperatorList.jsx](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/pages/QualityOperator/QualityOperatorList.jsx) (used with `statusFilter="PRE_QC"`)
  - **Production**: [ProductionOperatorList.jsx](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/pages/ProductionOperator/ProductionOperatorList.jsx)
  - **Post-QC**: [QualityOperatorList.jsx](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/pages/QualityOperator/QualityOperatorList.jsx) (used with `statusFilter="AWAITING_QUALITY"`)
- **Production ActionBar simplification** in [ProductionOrderDetail.jsx](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/pages/ProductionOperator/ProductionOrderDetail.jsx):
  - Remove the intermediate "Start Production" step. Orders in `PRODUCTION_READY` now show **Complete** + **Hold** directly.
  - `ON_HOLD` orders show only **Complete** (force complete, no Resume button).
  - `IN_PRODUCTION` (legacy) orders also show **Complete** + **Hold**.

---

## Contract

### Frontend Changes
- [x] Make `creditLimit` mandatory in `validateForm` in [CustomerForm.jsx](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/pages/Customer/CustomerForm.jsx).
- [x] Show blocking alert dialogs for success/error and close the page upon OK on PO Receive and Inward actions in [PurchaseOrderReceive.jsx](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/pages/PurchaseOrder/PurchaseOrderReceive.jsx) and [POInwardToInventory.jsx](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/pages/PurchaseOrder/POInwardToInventory.jsx).
- [x] Lock editing, cancel, receive, and delete actions for received/partially received Purchase Orders on the PO form and list view in [PurchaseOrderForm.jsx](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/pages/PurchaseOrder/PurchaseOrderForm.jsx) and [usePurchaseOrderColumns.jsx](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/pages/PurchaseOrder/usePurchaseOrderColumns.jsx).
- [x] Update billing list helper text and create invoice dialog labels to refer to Dispatched/Delivered orders in [DispatchedOrdersTab.jsx](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/pages/Billing/DispatchedOrdersTab.jsx) and [CreateInvoiceDialog.jsx](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/pages/Billing/CreateInvoiceDialog.jsx).
- [x] Comment out and hide the "Edit Receive" button from list actions in [usePurchaseOrderColumns.jsx](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/pages/PurchaseOrder/usePurchaseOrderColumns.jsx).
- [x] Convert PO tab-opening events to same-tab navigation using navigate in [PurchaseOrdersMain.jsx](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/pages/PurchaseOrder/PurchaseOrdersMain.jsx), [PurchaseOrderForm.jsx](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/pages/PurchaseOrder/PurchaseOrderForm.jsx), and [usePurchaseOrderColumns.jsx](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/pages/PurchaseOrder/usePurchaseOrderColumns.jsx).
- [x] Change label "Credit Limit (Optional)" to "Credit Limit", add `required={true}` to `creditLimit` input in [CustomerForm.jsx](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/pages/Customer/CustomerForm.jsx).
- [x] Make `indexId` mandatory in `validateForm` in [LensProductForm.jsx](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/pages/LensProductMaster/LensProductForm.jsx).
- [x] Add `required={true}` and remove `isClearable` from `indexId` FormSelect in [LensProductForm.jsx](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/pages/LensProductMaster/LensProductForm.jsx).
- [x] Fix Sale Order save/print success and error flow to show blocking alert dialogs with the order number and close the page only after clicking OK in [SaleOrderForm.jsx](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/pages/SaleOrder/SaleOrderForm.jsx).
- [x] Initialize sorting state to sort by `createdAt` descending by default in [SaleOrderMain.jsx](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/pages/SaleOrder/SaleOrderMain.jsx).
- [x] Show blocking alert dialogs for success/error when raising a PO from a Sale Order in [SaleOrderForm.jsx](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/pages/SaleOrder/SaleOrderForm.jsx).
- [x] Hide Cancel SO button when status is PO_RAISED and reload the page on successful PO raising in [SaleOrderForm.jsx](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/pages/SaleOrder/SaleOrderForm.jsx).
- [x] Listen to WebSocket messages and refresh the list automatically in [SaleOrderMain.jsx](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/pages/SaleOrder/SaleOrderMain.jsx).
- [x] Listen to WebSocket messages and refresh the list and dashboard automatically in [PurchaseOrdersMain.jsx](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/pages/PurchaseOrder/PurchaseOrdersMain.jsx).
- [x] Change sort to `updatedAt asc` (FIFO) in [QualityOperatorList.jsx](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/pages/QualityOperator/QualityOperatorList.jsx) for both Pre-QC and Post-QC queues.
- [x] Change sort to `updatedAt asc` (FIFO) in [ProductionOperatorList.jsx](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/pages/ProductionOperator/ProductionOperatorList.jsx).
- [x] Simplify Production ActionBar in [ProductionOrderDetail.jsx](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/pages/ProductionOperator/ProductionOrderDetail.jsx): remove "Start Production", show Direct Complete + Hold for PRODUCTION_READY/IN_PRODUCTION, and only Complete for ON_HOLD.

### Backend Changes
- [x] Make `credit_limit` mandatory in `validateCreateCustomerMaster` and `validateUpdateCustomerMaster` inside [customerMasterDto.js](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/backend/dto/customerMasterDto.js).
- [x] Make `index_id` mandatory in `validateCreateLensProduct` and `validateUpdateLensProduct` inside [lensMastersDto.js](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/backend/dto/lensMastersDto.js).
- [x] Modify `getProductDropdown` query in [lensProductMasterService.js](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/backend/services/lensProductMasterService.js) to select `index` (index_name) and format option label as `${p.product_code} - ${p.lens_name} [${p.index?.index_name || "N/A"}]`. Return `index_name` on the option object.
- [x] Create WebSocket server and connect it to express server in [websocket.js](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/backend/utils/websocket.js) and [server.js](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/backend/server.js).
- [x] Add router middleware to broadcast order update events upon successful mutations in [saleOrders.routes.js](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/backend/routes/saleOrders.routes.js) and [purchaseOrder.routes.js](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/backend/routes/purchaseOrder.routes.js).
- [x] Fix refresh token rotation conflict across multiple tabs in [auth.service.js](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/backend/services/auth.service.js).
- [x] Update billing query filters and validations to allow both `DISPATCHED` and `DELIVERED` statuses in [invoiceService.js](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/backend/services/invoiceService.js).
- [x] Automatically update the parent PO status to `CLOSED` (Completed) when total inwarded qty reaches PO quantity in [purchaseOrderService.js](file:///Users/kavin/Personal/Projects/Lens/source_code/lens_web/src/backend/services/purchaseOrderService.js).

---

## Test plan

- [x] **Test Case 1 (Customer Validation)**: Submitting Customer Form without a Credit Limit fails validation with the message "Credit limit is required".
- [x] **Test Case 2 (Product Validation)**: Submitting Lens Product Form without selecting an Index fails validation with the message "Index is required".
- [x] **Test Case 3 (Product Dropdown Label)**: Verify that the product dropdown options in Sale Order or Purchase Order form display formatting as `[Product Code] - [Product Name] [[Index Name]]`.
- [x] **Test Case 4 (API Endpoints Validation)**: Sending requests to create/update customer without `credit_limit` or lens product without `index_id` yields a `400 Bad Request` validation error.
- [x] **Test Case 5 (Sale Order Sorting)**: Verify that loading the Sale Order list page loads orders sorted by `createdAt` descending by default.

---

## Test results

- **Test Case 1 (Customer Validation)**: Passed. Attempting to submit Customer Form without Credit Limit throws standard required validation message "Credit limit is required".
- **Test Case 2 (Product Validation)**: Passed. Submitting Lens Product Form without Index selection fails with validation message "Index is required".
- **Test Case 3 (Product Dropdown Label)**: Passed. Product dropdown options now cleanly display product code, lens name, and index name.
- **Test Case 4 (API Endpoints Validation)**: Passed. Backend endpoints return 400 Bad Request with validation errors.
- **Test Case 5 (Sale Order Sorting)**: Passed. On page load, the table is initialized and ordered by `createdAt` descending by default.
- **Sale Order Save Dialog Bug**: Passed. Successfully saving (creating/updating) or printing a sale order now shows a blocking alert window with the generated Order Number, and closes the page only after the user clicks "OK". Errors are also shown via a blocking alert so they are clearly visible.
