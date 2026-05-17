# Database Schema Reference

> All models are defined in `prisma/schema.prisma` using Prisma ORM targeting PostgreSQL 15.  
> All tables follow a consistent **soft-delete** pattern (`delete_status = false`) and carry full audit fields.

---

## 1. Common Audit Pattern

Every table includes the following standard fields:

```prisma
active_status  Boolean  @default(true)
delete_status  Boolean  @default(false)
createdAt      DateTime @default(now())
createdBy      Int       // FK → User.id
updatedAt      DateTime @updatedAt
updatedBy      Int?      // FK → User.id
```

---

## 2. Entity Relationship Overview

```
User ──────────────────────────────────────────────────────────────┐
  │                                                                │
  ├─── DepartmentDetails                                           │
  ├─── Role ─── Permission                                         │
  ├─── RefreshToken                                               │
  │                                                                │
Customer ──────────────────────────────────────────────────────────┤
  ├─── businessCategory                                            │
  ├─── SaleOrder ─── SaleOrderItem                                 │
  │         ├─── Invoice ─── Payment                              │
  │         ├─── DispatchCopy                                     │
  │         ├─── PurchaseOrder                                    │
  │         ├─── InventoryItem                                    │
  │         └─── InventoryTransaction                             │
  └─── PriceMapping ─── LensPriceMaster                          │
                                                                   │
Vendor ─────────────────────────────────────────────────────────── │
  ├─── PurchaseOrder                                               │
  │         ├─── PurchaseOrderReceipt ─── PurchaseReceiptLog       │
  │         └─── InventoryItem                                    │
  └─── InventoryItem                                               │
                                                                   │
LensProductMaster ──────────────────────────────────────────────── │
  ├─── LensBrandMaster                                             │
  ├─── LensCategoryMaster                                          │
  ├─── LensMaterialMaster                                          │
  ├─── LensTypeMaster                                              │
  ├─── LensPriceMaster ─── LensCoatingMaster                      │
  └─── LensOffers                                                 │
                                                                   │
Inventory ──────────────────────────────────────────────────────── │
  ├─── InventoryItem                                               │
  ├─── InventoryTransaction                                        │
  ├─── InventoryStock                                              │
  └─── InventoryAlert                                              │
                                                                   │
Financial ──────────────────────────────────────────────────────── │
  ├─── Ledger (Chart of Accounts)                                  │
  ├─── FinancialTransaction                                        │
  └─── TransactionEntry (Debit/Credit lines)                       │
                                                                   │
Observability ──────────────────────────────────────────────────── │
  ├─── AuditLog                                                    │
  └─── ErrorLog                                                    │
```

---

## 3. Domain Models

### 3.1 Identity & Access

| Model | Key Fields | Notes |
|---|---|---|
| `User` | name, email, username, password (hashed), usercode, role_id, department_id | Core user entity |
| `Role` | name (Admin/Sales/Inventory/Accounts) | Defines access tier |
| `Permission` | action, subject, role_id | Fine-grained CRUD permissions per role |
| `DepartmentDetails` | department | Organizational grouping |
| `RefreshToken` | userId (unique), token, expiresAt | One token per user, rotated on refresh |

### 3.2 Master Data — Lens

| Model | Key Fields | Notes |
|---|---|---|
| `LensCategoryMaster` | name | Single Vision, BiFocal, Progressive, Reading |
| `LensMaterialMaster` | name | Glass, Plastic, Polycarbonate, Trivex |
| `LensBrandMaster` | name | Vendor brand names |
| `LensTypeMaster` | name | Lens type classifications |
| `LensCoatingMaster` | name, short_name | AR, UV, Blue Light, Scratch, etc. |
| `LensFittingMaster` | name, short_name, fitting_price | Standard, Premium, Custom + price |
| `LensDiaMaster` | name, short_name | Diameter specifications |
| `LensTintingMaster` | name, short_name, tinting_price | Color tinting options + price |
| `LensProductMaster` | brand, category, material, type, product_code, lens_name, index_value, sphere_min/max, cyl_min/max, add_min/max | Full product definition with optical ranges |
| `LensPriceMaster` | lens_id, coating_id, price | Base price per lens+coating combination |

### 3.3 Customer & Vendor

| Model | Key Fields | Notes |
|---|---|---|
| `Customer` | code, name, shopname, phone, email, gstin, credit_limit, outstanding_credit, businessCategory_id, sale_person_id, delivery_person_id | Full customer profile |
| `businessCategory` | name | Customer business type classification |
| `Vendor` | code, name, shopname, phone, email, gstin | Supplier profile |
| `PriceMapping` | lensPrice_id, customer_id, discountRate, discountPrice | Per-customer lens discount override |

### 3.4 Sale Orders

| Model | Key Fields | Notes |
|---|---|---|
| `SaleOrder` | orderNo, customerId, status, lens_id, category_id, Type_id, dia_id, fitting_id, coating_id, tinting_id, rightEye, leftEye, eye specs (Sph/Cyl/Axis/Add), lensPrice, fittingPrice, tintingPrice, discount, offer_id | Core order entity |
| `SaleOrderItem` | saleOrderId, quantity, price, discount | Line items within a sale order |
| `Invoice` | invoiceNo, totalAmount, paidAmount, dueDate | Invoice linked to sale orders |
| `Payment` | invoiceId, amount, method (CASH/UPI/CARD/BANK_TRANSFER/CHECK), referenceNo | Payment records |

**SaleOrder Status Enum:**
```
DRAFT → CONFIRMED → IN_PRODUCTION → ON_HOLD → AWAITING_QUALITY → READY_FOR_DISPATCH → DELIVERED → CLOSED
                                                                                      └──► PROCESSING / PENDING
```

**Parent/Child SaleOrder:** A sale order can be closed and re-created as a child (`parentId` field), enabling order revision tracking.

### 3.5 Purchase Orders

| Model | Key Fields | Notes |
|---|---|---|
| `PurchaseOrder` | poNumber, reference_id, vendorId, saleOrderId, orderType (Single/Bulk), eye specs, quantity, unitPrice, subtotal, taxAmount, totalValue, lensBulkSelection (JSON), receivedQty, status | Supports single and bulk lens ordering |
| `PurchaseOrderReceipt` | receiptNumber, purchaseOrderId, receivedItems (JSON), totalReceivedQty, totalValue, inwardedQty, status (PARTIAL/COMPLETE) | Multi-receipt partial delivery |
| `PurchaseReceiptLog` | receiptNumber, purchaseOrderId, receivedItems, totalReceivedQty | Immutable audit log of receipt operations |

**PO Status Enum:** `DRAFT → RECEIVED → INVOICE_RECEIVED → CLOSED / CANCELLED`

### 3.6 Offers & Promotions

| Model | Key Fields | Notes |
|---|---|---|
| `LensOffers` | offerName, offerType, discountValue, discountPercentage, offerPrice, exchange_coating_id, withDiscount, lens_id, coating_id, startDate, endDate | Promotional engine |

**Offer Type Enum:**
```
VALUE                  — Fixed ₹ discount
PERCENTAGE             — % discount  
EXCHANGE_PRODUCT       — Replace price with offer price
EXCHANGE_COATING_PRICE — Use different coating's price
```

### 3.7 Dispatch

| Model | Key Fields | Notes |
|---|---|---|
| `DispatchCopy` | dcNumber, customerId, deliveryPersonId, expectedDeliveryDate, actualDeliveryDate, deliverySignature (Base64), status, vehicleNumber, driverName, driverContact | Dispatch with signature capture |

**Dispatch Status Enum:** `PENDING → IN_TRANSIT → DELIVERED / ON_HOLD`

### 3.8 Inventory

| Model | Key Fields | Notes |
|---|---|---|
| `LocationMaster` | name, description | Physical storage locations |
| `TrayMaster` | name, capacity, location_id | Storage trays within locations |
| `InventoryItem` | lens_id, category_id, coating_id, location_id, tray_id, quantity, costPrice, sellingPrice, status, purchaseOrderId, saleOrderId | Individual inventory unit tracking |
| `InventoryTransaction` | transactionNo, type, inventoryItemId, quantity, balanceAfter, fromLocation, toLocation | Complete movement history |
| `InventoryStock` | lens_id+category_id+Type_id+coating_id+location_id+tray_id (unique), totalStock, reservedStock, availableStock, damagedStock | Aggregated stock summary |
| `InventoryAlert` | alertType, lens_id, currentStock, thresholdLevel, priority, isResolved | Low stock and damage alerts |

**InventoryTransaction Types:**
```
INWARD_PO, INWARD_DIRECT, OUTWARD_SALE, OUTWARD_RETURN, 
TRANSFER, ADJUSTMENT, DAMAGE
```

**InventoryItem Status:**
```
AVAILABLE → RESERVED → IN_PRODUCTION → QUALITY_CHECK → (sold/RETURNED/DAMAGED)
```

### 3.9 Financial Accounting

| Model | Key Fields | Notes |
|---|---|---|
| `Ledger` | ledgerCode, ledgerName, ledgerType (ASSET/LIABILITY/INCOME/EXPENSE/EQUITY), parentLedgerId, openingBalance, currentBalance, isSystemLedger | Chart of Accounts with hierarchy |
| `FinancialTransaction` | transactionNumber, transactionDate, transactionType, referenceType, referenceId, description, totalAmount, isPosted, isReconciled | Double-entry transaction header |
| `TransactionEntry` | transactionId, ledgerId, entryType (DEBIT/CREDIT), amount, narration | Individual debit/credit line |

**TransactionType Enum:** `SALE, PURCHASE, PAYMENT, RECEIPT, JOURNAL, CONTRA, OPENING_BALANCE, ADJUSTMENT`

### 3.10 Observability

| Model | Key Fields | Notes |
|---|---|---|
| `AuditLog` | userId, action, entity, entityId, oldValues, newValues, changes, method, endpoint, statusCode | Full change trail |
| `ErrorLog` | userId, errorType, errorMessage, errorStack, severity, resolved, resolvedBy | Error tracking with resolution |

---

## 4. Migration History

| Migration | Date | Description |
|---|---|---|
| 20251114203416 | Nov 2025 | Make updatedBy optional |
| 20251115060618 | Nov 2025 | Price mapping + LensPriceMaster rename |
| 20251117170038 | Nov 2025 | Schema update |
| 20251122212203 | Nov 2025 | SaleOrder urgent + free fitting flags |
| 20251123170244 | Nov 2025 | Dispatch & discount fields |
| 20251126172459 | Nov 2025 | Fitting price field |
| 20251126191657 | Nov 2025 | Audit & error log tables |
| 20251127064900 | Nov 2025 | Initial reset (inittt) |
| 20251128064238 | Nov 2025 | Purchase order module |
| 20251205180956 | Dec 2025 | Order type on PO |
| 20251209174256 | Dec 2025 | Bulk lens selection on PO |
| 20251217180324 | Dec 2025 | Schema init |
| 20251217201055 | Dec 2025 | Tinting price on SaleOrder |
| 20251217210220 | Dec 2025 | Right/left eye extra fields |
| 20260322163701 | Mar 2026 | Update |
| 20260325000000 | Mar 2026 | Exchange coating price + offer type |
| 20260325120000 | Mar 2026 | Delivery signature + role fields |
| 20260329120000 | Mar 2026 | Remove location/tray codes |
| 20260414204133 | Apr 2026 | ON_HOLD status |
| 20260414210000 | Apr 2026 | AWAITING_QUALITY status |
| 20260507120000 | May 2026 | Financial ledger & transaction tables |

---

## 5. Indexing Strategy

Key composite indexes defined in schema:

```prisma
InventoryStock  @@unique([lens_id, category_id, Type_id, coating_id, location_id, tray_id])
FinancialTransaction @@index([transactionDate])
FinancialTransaction @@index([transactionType])
FinancialTransaction @@index([referenceType, referenceId])
FinancialTransaction @@index([isPosted])
Ledger          @@index([ledgerType])
Ledger          @@index([parentLedgerId])
PurchaseReceiptLog @@index([purchaseReceiptId])
```
