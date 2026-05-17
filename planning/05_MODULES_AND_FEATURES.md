# Modules & Features Reference

> A complete description of every functional module in the Lens Management System.

---

## Module 1 — Authentication & User Management

### Authentication
- **Login** — username/password validation, bcrypt compare, JWT access + refresh token generation
- **Refresh Token** — token rotation on every refresh (old token invalidated)
- **Logout** — refresh token deleted from DB
- **Current User** — returns authenticated user profile

### User Management
- CRUD for system users
- Assign role, department, salary, contact info
- Soft delete and active status management
- Track `is_login` state

### Role & Permission Management
- Predefined roles: Admin, Sales, Inventory, Accounts
- Per-role permission records: `{ action: "create|read|update|delete", subject: "SaleOrder|..." }`
- Checked in `auth.middleware.js` before route execution

---

## Module 2 — Master Data Management

### Lens Category Master
- Types: Single Vision, BiFocal, Progressive, Reading
- Used to classify sale orders and purchase orders

### Lens Material Master
- Types: Glass, Plastic, Polycarbonate, Trivex
- Linked to lens products

### Lens Brand Master
- Manufacturer/brand names for lenses
- Linked to lens products

### Lens Type Master
- Lens type classifications
- Used across sale orders, purchase orders, and inventory

### Lens Coating Master
- Types: AR, UV Protection, Blue Light, Scratch Resistant, etc.
- Has `short_name` for compact display
- Central to pricing (LensPriceMaster links lens + coating → price)

### Lens Fitting Master
- Types: Standard, Premium, Custom
- Carries a `fitting_price` used in sale order billing
- Has `short_name`

### Lens Diameter (Dia) Master
- Diameter specifications for lenses

### Lens Tinting Master
- Color tinting options: Clear, Light Brown, Dark Brown, Gray, Green
- Carries a `tinting_price`

### Lens Product Master
- Full product definition linking: Brand + Category + Material + Type
- Defines optical power ranges: sphere (min/max), cylinder (min/max), add (min/max)
- Extra charge fields: `sphere_extra_charge`, `cylinder_extra_charge` for out-of-range prescriptions
- `product_code`, `lens_name`, `index_value`, `range_text`

### Lens Price Master
- Base price per lens + coating combination
- Used as the starting price in sale order calculation

---

## Module 3 — Customer Management

- Register customers with full contact, GSTIN, city, state
- Assign **business category** (businessCategory)
- Assign **sale person** and **delivery person** from Users
- Manage **credit limit** and **outstanding credit**
- Notes field for CRM context
- **Price Mapping** — per-customer discount rate on specific lens+coating prices, computed `discountPrice`

---

## Module 4 — Vendor Management

- Register vendors with full contact, GSTIN, category
- Link to purchase orders
- Link to inventory items (source vendor tracking)
- Notes field

---

## Module 5 — Pricing & Offers

### Price Mapping (Customer Discounts)
- Link: Customer ↔ LensPriceMaster
- Set `discountRate` (%) → auto-compute `discountPrice`
- Used in sale order price calculation for that customer

### Lens Offers
- Four offer types via `OfferType` enum:
  - **VALUE** — Fixed ₹ amount off (e.g., ₹100 off)
  - **PERCENTAGE** — Percentage discount (e.g., 20% off)
  - **EXCHANGE_PRODUCT** — Replace base price with special `offerPrice`
  - **EXCHANGE_COATING_PRICE** — Use a different coating's price, optionally apply customer discount
- Optionally scoped to a specific `lens_id` and/or `coating_id` (null = applies to all)
- Time-bounded: `startDate` / `endDate`
- Applied during sale order creation by referencing `offer_id`

---

## Module 6 — Sale Orders

### Order Creation
- Select customer, choose lens product, coating, fitting, tinting, dia, category, type
- Enter right eye and/or left eye optical specifications (Spherical, Cylindrical, Axis, Add, Dia)
- Apply offer (optional)
- Price auto-calculated: `lensPrice + fitting + tinting + rightEyeExtra + leftEyeExtra − discount`
- Flags: `urgentOrder`, `freeFitting`, `freeLens`
- Process types: Normal Processing, Rush Processing, Premium Processing

### Order Status Lifecycle
```
DRAFT → CONFIRMED → IN_PRODUCTION → ON_HOLD → AWAITING_QUALITY → READY_FOR_DISPATCH → DELIVERED → CLOSED
```
- Each status transition is controlled by role/permission
- ON_HOLD can pause processing at any stage
- AWAITING_QUALITY enforced before dispatch

### Print Feature
- A5 print format for lens specification sheet
- Two workflows: Create & Print (new order), Print Existing Order
- Browser print dialog integration

### Parent/Child Orders
- Orders can be cloned/revised using a parent-child relationship
- Enables tracking of order amendments without data loss

---

## Module 7 — Purchase Orders

### Order Types
- **Single** — One lens prescription per PO
- **Bulk** — Matrix of SPH × CYL combinations (stored as JSON in `lensBulkSelection`)

### PO Lifecycle
```
DRAFT → RECEIVED → INVOICE_RECEIVED → CLOSED / CANCELLED
```

### Multi-Receipt Partial Delivery
- A PO can have multiple `PurchaseOrderReceipt` records
- Each receipt records `receivedItems` (JSON) with `orderedQty` + `receivedQty` per cell
- `PurchaseOrder.receivedQty` is the cumulative total
- Receipts log every operation in `PurchaseReceiptLog` (immutable history)

### Excel Upload
- Bulk PO data can be parsed from Excel files using `exceljs`
- Supplier invoice details captured: `supplierInvoiceNo`, `purchaseType`, `placeOfSupply`

### Inventory Integration
- Each received PO receipt triggers inventory inward (`InventoryItem` creation)
- Tracked via `inventoryItems` and `inventoryTransactions` relations

---

## Module 8 — Inventory Management

### Stock Tracking
- `InventoryItem` — each individual lens unit with full eye specs, cost/selling price, quality grade
- `InventoryStock` — aggregated summary (totalStock, reservedStock, availableStock, damagedStock) keyed by `[lens, category, type, coating, location, tray]`
- Stock auto-updates with every transaction

### Transaction Types
| Type | Trigger |
|---|---|
| INWARD_PO | PO receipt processed |
| INWARD_DIRECT | Direct stock addition (no PO) |
| OUTWARD_SALE | Sale order fulfilled |
| OUTWARD_RETURN | Return to vendor |
| TRANSFER | Move between locations/trays |
| ADJUSTMENT | Manual stock correction |
| DAMAGE | Write-off of damaged stock |

### Location & Tray Management
- `LocationMaster` — physical storage locations
- `TrayMaster` — storage trays within locations, with capacity tracking
- Transactions record `fromLocation/Tray` → `toLocation/Tray` for transfers

### Alerts
- `InventoryAlert` — auto-generated for LOW_STOCK, EXPIRY, DAMAGE
- Priority levels: HIGH, MEDIUM, LOW
- Resolution tracking with `resolvedBy` and `resolvedAt`

---

## Module 9 — Dispatch & Delivery

### Dispatch Copy (DC)
- Groups multiple sale orders into a single delivery
- Assigns delivery person from Users
- Records vehicle number, driver name, driver contact
- `expectedDeliveryDate` and `actualDeliveryDate`
- Status: `PENDING → IN_TRANSIT → DELIVERED / ON_HOLD`

### Delivery Signature
- Captured as Base64 PNG (signature pad on delivery device)
- Stored on both `DispatchCopy.deliverySignature` and `SaleOrder.deliverySignature`

---

## Module 10 — Financial Accounting

### Chart of Accounts (Ledger Master)
- Hierarchical ledger structure (`parentLedgerId`)
- Ledger types: ASSET, LIABILITY, INCOME, EXPENSE, EQUITY
- System ledgers (Cash, Bank, Sales, etc.) cannot be deleted
- Bank ledgers store extra details as JSON (`bankDetails`)
- `openingBalance` and live `currentBalance` maintained

### Double-Entry Transactions
- Every financial event creates a `FinancialTransaction` (header) + 2+ `TransactionEntry` records (lines)
- Each line is either DEBIT or CREDIT to a ledger
- Balances are maintained: sum(DEBIT) = sum(CREDIT) per transaction
- Referenced to source documents: SaleOrder, PurchaseOrder, Invoice, Payment, Receipt

### Transaction Types
```
SALE, PURCHASE, PAYMENT, RECEIPT, JOURNAL, CONTRA, OPENING_BALANCE, ADJUSTMENT
```

### Reconciliation
- `isReconciled` flag and `reconciledDate` on FinancialTransaction for bank reconciliation
- `isPosted` flag differentiates drafts from posted transactions

### Financial Reports
- Available via `src/backend/routes/financialReports.routes.js`
- Reports include: trial balance, ledger-wise statement, income statement, expense report

---

## Module 11 — Reporting

| Report | Module | Route File |
|---|---|---|
| Sale Order Reports | Sales | saleOrders.routes.js |
| Purchase Order Reports | Purchase | purchaseOrder.routes.js |
| Inventory Reports | Inventory | inventory.routes.js |
| Dispatch Reports | Dispatch | dispatch.routes.js |
| Financial Reports | Finance | financialReports.routes.js |
| Expense Reports | Finance | expenses.routes.js |
| Invoice Reports | Finance | invoices.routes.js |

---

## Module 12 — Audit & Observability

### Audit Log
- Captures every CREATE/UPDATE/DELETE with `oldValues` and `newValues`
- Records HTTP method, endpoint, status code, IP address, user agent
- Linked to acting user (`userId`)

### Error Log
- Captures all application errors with full stack trace
- Severity levels: INFO, WARNING, ERROR, CRITICAL
- Resolution workflow: `resolved`, `resolvedAt`, `resolvedBy`, `resolution`
- Accessible via `LogsViewer.jsx` UI page

### API Documentation
- Swagger UI available at `/api-docs`
- All 28 route files annotated with JSDoc OpenAPI specs

---

## Module 13 — Department Management

- CRUD for organizational departments
- Users assigned to departments
- `createdBy` / `updatedBy` user tracking

---

## Module 14 — Business Category Management

- Customer business type classification
- Used for grouping/filtering customers in reports
