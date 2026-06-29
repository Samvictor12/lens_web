# Lens Web — Database ERD

This document details the database schema, models, and entity relationships of the Lens Web application.

## Entity Relationship Diagram

```mermaid
erDiagram
    USER ||--o{ CUSTOMER : "creates / updates / sells"
    USER ||--o{ VENDOR : "creates / updates"
    USER ||--o{ SALE_ORDER : "creates / updates / assigns"
    USER ||--o{ LOCATION_MASTER : "creates"
    USER ||--o{ TRAY_MASTER : "creates"

    DEPARTMENT_DETAILS ||--o{ USER : "groups"

    LOCATION_MASTER ||--o{ TRAY_MASTER : "contains"
    LOCATION_MASTER ||--o{ INVENTORY_ITEM : "stores"
    TRAY_MASTER ||--o{ INVENTORY_ITEM : "bins"

    LENS_PRODUCT_MASTER ||--o{ INVENTORY_ITEM : "catalog item"
    LENS_COATING_MASTER ||--o{ INVENTORY_ITEM : "spec coating"

    CUSTOMER ||--o{ SALE_ORDER : "places"
    VENDOR ||--o{ PURCHASE_ORDER : "supplies"

    INVENTORY_ITEM ||--o{ INVENTORY_TRANSACTION : "records"
    SALE_ORDER ||--o{ INVENTORY_TRANSACTION : "references"

    INVENTORY_ITEM {
        Int id PK
        Int lens_id FK
        Int category_id FK
        Int Type_id FK
        Int coating_id FK
        Int location_id FK
        Int tray_id FK
        Float quantity
        Float costPrice
        String status "AVAILABLE | RESERVED"
    }

    INVENTORY_TRANSACTION {
        Int id PK
        DateTime transactionDate
        String type "INWARD | OUTWARD_SALE"
        Float quantity
        Float totalValue
        Int inventoryItemId FK
    }

    TRAY_MASTER {
        Int id PK
        String trayNo
        Int capacity
        Int location_id FK
    }

    SALE_ORDER {
        Int id PK
        String orderNo
        Int customerId FK
        String status
        Int createdBy FK
    }

    LENS_PRODUCT_MASTER ||--o{ LENS_OFFERS : "promotes / exchanges"
    LENS_COATING_MASTER ||--o{ LENS_OFFERS : "promotes / exchanges"
    LENS_OFFERS ||--o{ SALE_ORDER : "applies discount"

    LENS_OFFERS {
        Int id PK
        String offerName
        String offerType
        Int lens_id FK "nullable filter"
        Int coating_id FK "nullable filter"
        Int exchange_lens_id FK "nullable target"
        Int exchange_coating_id FK "nullable target"
        Float discountValue
        Float discountPercentage
        Float offerPrice
        Boolean withDiscount
    }
```
```

---

## Core Entities Description

### 1. InventoryItem
Stores physical stock rows. Note that a single row can hold multiple units of identical specs (Sph, Cyl, Add, Coating, etc.) in a specific Tray and Location. Status flips to `RESERVED` when quantity is consumed by a Sale Order.

### 2. InventoryTransaction
Records all inward movements (Manual or PO Inward) and outward movements (Sale Order dispatch). Keeps track of historical unit prices and values.

### 3. LocationMaster & TrayMaster
Represents the physical organization. A Location (warehouse/room) contains multiple Trays (bins). Each Tray has a max capacity limit.

### 4. SaleOrder
Represents sales orders placed by Customers. Triggers stock reservations via `reserveInventoryForSale()` during the Pre-QC workflow transition.

### 5. Customer
Represents customer accounts. Tracks credit limits and exposure dynamically using `credit_limit`, `outstanding_credit`, and the new `reserved_amount` field (which stores reserved amounts for active/uninvoiced Sale Orders).
