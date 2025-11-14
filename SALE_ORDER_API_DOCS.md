# Sale Order CRUD APIs - Implementation Summary

## Overview
Complete CRUD API implementation for the SaleOrder model with dedicated endpoints for status updates and dispatch information management.

---

## Files Created/Updated

### 1. Service Layer
**File:** `src/backend/services/saleOrderService.js` ✅ CREATED

**Methods:**
- `generateOrderNumber()` - Auto-generates unique order numbers (SO-2025-001 format)
- `createSaleOrder(orderData, userId)` - Create with full validation of related entities
- `getSaleOrders(queryParams)` - Paginated list with filtering (status, customer, dispatch status, date range, search)
- `getSaleOrderById(id)` - Get single order with all relations
- `updateSaleOrder(id, updateData, userId)` - Update all fields
- `updateStatus(id, status, userId)` - **Dedicated status update**
- `updateDispatchInfo(id, dispatchData, userId)` - **Dedicated dispatch update**
- `deleteSaleOrder(id, userId)` - Soft delete with validation
- `getStatistics(filters)` - Get order stats by status, dispatch status, revenue

**Validations:**
- Customer existence check
- Lens product/category/coating/type/fitting/dia/tinting validation
- Assigned person validation
- Status enum validation (DRAFT, CONFIRMED, IN_PRODUCTION, READY_FOR_DISPATCH, DELIVERED)
- Cannot delete orders with invoices or purchase orders
- Cannot delete delivered orders

---

### 2. Controller Layer
**File:** `src/backend/controllers/saleOrderController.js` ✅ UPDATED

**Endpoints:**
1. `create(req, res, next)` - POST /api/sale-orders
2. `list(req, res, next)` - GET /api/sale-orders
3. `getById(req, res, next)` - GET /api/sale-orders/:id
4. `update(req, res, next)` - PUT /api/sale-orders/:id
5. **`updateStatus(req, res, next)`** - PATCH /api/sale-orders/:id/status ⭐
6. **`updateDispatchInfo(req, res, next)`** - PATCH /api/sale-orders/:id/dispatch ⭐
7. `delete(req, res, next)` - DELETE /api/sale-orders/:id
8. `getStats(req, res, next)` - GET /api/sale-orders/stats

---

### 3. Routes Layer
**File:** `src/backend/routes/saleOrders.js` ✅ UPDATED

**New Routes:**
- **PATCH /api/sale-orders/:id/status** - Update order status only
- **PATCH /api/sale-orders/:id/dispatch** - Update dispatch information only
- GET /api/sale-orders/stats (renamed from /summary)

**Validation Schemas:**
- `updateStatusSchema` - Validates status enum
- `updateDispatchSchema` - Validates dispatch fields

---

## API Endpoints Reference

### 1. Create Sale Order
```http
POST /api/sale-orders
Content-Type: application/json

{
  "customerId": 1,
  "customerRefNo": "CUST-REF-001",
  "type": "Normal Processing",
  "deliverySchedule": "2025-12-01T10:00:00Z",
  "lens_id": 5,
  "category_id": 1,
  "coating_id": 2,
  "Type_id": 1,
  "fitting_id": 1,
  "dia_id": 1,
  "tinting_id": 1,
  "rightEye": true,
  "leftEye": true,
  "rightSpherical": "-2.00",
  "rightCylindrical": "-0.50",
  "rightAxis": "180",
  "leftSpherical": "-2.25",
  "leftCylindrical": "-0.75",
  "leftAxis": "90",
  "lensPrice": 2500,
  "discount": 10
}

Response: 201 Created
{
  "success": true,
  "message": "Sale order created successfully",
  "data": {
    "id": 1,
    "orderNo": "SO-2025-001",
    "status": "DRAFT",
    "customer": {...},
    "lensProduct": {...},
    ...
  }
}
```

### 2. Get All Sale Orders (Paginated)
```http
GET /api/sale-orders?page=1&limit=10&status=CONFIRMED&search=customer

Query Parameters:
- page: 1 (default)
- limit: 10 (default)
- status: DRAFT | CONFIRMED | IN_PRODUCTION | READY_FOR_DISPATCH | DELIVERED
- customerId: Filter by customer ID
- dispatchStatus: Pending | Assigned | In Transit | Delivered
- search: Search in orderNo, customerRefNo, itemRefNo, customer name/code
- startDate: Filter from date (ISO string)
- endDate: Filter to date (ISO string)
- sortBy: createdAt (default)
- sortOrder: desc (default)

Response: 200 OK
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "pages": 5
  }
}
```

### 3. Get Single Sale Order
```http
GET /api/sale-orders/1

Response: 200 OK
{
  "success": true,
  "data": {
    "id": 1,
    "orderNo": "SO-2025-001",
    "customer": {full customer details},
    "lensProduct": {full lens product with relations},
    "category": {...},
    "coating": {...},
    "fitting": {...},
    "dia": {...},
    "tinting": {...},
    "assignedPerson": {...},
    "invoice": {...},
    "dispatch": {...},
    "createdByUser": {...},
    "updatedByUser": {...}
  }
}
```

### 4. Update Sale Order
```http
PUT /api/sale-orders/1
Content-Type: application/json

{
  "customerRefNo": "UPDATED-REF",
  "deliverySchedule": "2025-12-15T10:00:00Z",
  "lensPrice": 2800,
  "discount": 15,
  "remark": "Updated order details"
}

Response: 200 OK
{
  "success": true,
  "message": "Sale order updated successfully",
  "data": {...}
}
```

### 5. ⭐ Update Status (Dedicated Endpoint)
```http
PATCH /api/sale-orders/1/status
Content-Type: application/json

{
  "status": "CONFIRMED"
}

Valid Status Values:
- DRAFT
- CONFIRMED
- IN_PRODUCTION
- READY_FOR_DISPATCH
- DELIVERED

Response: 200 OK
{
  "success": true,
  "message": "Sale order status updated to CONFIRMED",
  "data": {
    "id": 1,
    "orderNo": "SO-2025-001",
    "status": "CONFIRMED",
    "customer": {...},
    "updatedByUser": {...}
  }
}
```

### 6. ⭐ Update Dispatch Information (Dedicated Endpoint)
```http
PATCH /api/sale-orders/1/dispatch
Content-Type: application/json

{
  "dispatchStatus": "Assigned",
  "assignedPerson_id": 5,
  "dispatchId": "DISPATCH-001",
  "estimatedDate": "2025-12-10T10:00:00Z",
  "estimatedTime": "10:00 AM",
  "dispatchNotes": "Handle with care"
}

All fields are optional:
- dispatchStatus: string (Pending | Assigned | In Transit | Delivered)
- assignedPerson_id: integer (user ID)
- dispatchId: string
- estimatedDate: ISO datetime string
- estimatedTime: string
- actualDate: ISO datetime string
- actualTime: string
- dispatchNotes: string

Response: 200 OK
{
  "success": true,
  "message": "Dispatch information updated successfully",
  "data": {
    "id": 1,
    "orderNo": "SO-2025-001",
    "dispatchStatus": "Assigned",
    "assignedPerson": {
      "id": 5,
      "name": "John Doe",
      "email": "john@example.com",
      "phonenumber": "1234567890"
    },
    "dispatchId": "DISPATCH-001",
    "estimatedDate": "2025-12-10T10:00:00Z",
    "estimatedTime": "10:00 AM",
    "dispatchNotes": "Handle with care",
    ...
  }
}
```

### 7. Delete Sale Order
```http
DELETE /api/sale-orders/1

Response: 200 OK
{
  "success": true,
  "message": "Sale order deleted successfully"
}

Error Cases:
- 400: Cannot delete order with invoice
- 400: Cannot delete order with purchase orders
- 400: Cannot delete delivered orders
```

### 8. Get Statistics
```http
GET /api/sale-orders/stats?startDate=2025-01-01T00:00:00Z&endDate=2025-12-31T23:59:59Z

Response: 200 OK
{
  "success": true,
  "data": {
    "total": 150,
    "byStatus": {
      "DRAFT": 20,
      "CONFIRMED": 35,
      "IN_PRODUCTION": 45,
      "READY_FOR_DISPATCH": 30,
      "DELIVERED": 20
    },
    "byDispatchStatus": {
      "Pending": 40,
      "Assigned": 35,
      "In Transit": 30,
      "Delivered": 45
    },
    "totalRevenue": 375000
  }
}
```

---

## Sale Order Model Fields

### Basic Information
- `id` - Auto-increment
- `orderNo` - Unique (SO-2025-001) - **Auto-generated**
- `customerId` - Foreign key to Customer
- `status` - Enum (DRAFT, CONFIRMED, IN_PRODUCTION, READY_FOR_DISPATCH, DELIVERED)
- `customerRefNo` - Customer's reference number
- `orderDate` - Order placement date
- `type` - Processing type (Normal/Rush/Premium)
- `deliverySchedule` - Expected delivery date
- `remark` - General notes
- `itemRefNo` - Item reference number
- `freeLens` - Boolean flag

### Lens Details
- `lens_id` - Foreign key to LensProductMaster
- `category_id` - Foreign key to LensCategoryMaster
- `Type_id` - Foreign key to LensTypeMaster
- `dia_id` - Foreign key to LensDiaMaster
- `fitting_id` - Foreign key to LensFittingMaster
- `coating_id` - Foreign key to LensCoatingMaster
- `tinting_id` - Foreign key to LensTintingMaster

### Eye Selection
- `rightEye` - Boolean
- `leftEye` - Boolean

### Right Eye Specifications
- `rightSpherical`, `rightCylindrical`, `rightAxis`, `rightAdd`
- `rightDia`, `rightBase`, `rightBaseSize`, `rightBled`

### Left Eye Specifications
- `leftSpherical`, `leftCylindrical`, `leftAxis`, `leftAdd`
- `leftDia`, `leftBase`, `leftBaseSize`, `leftBled`

### Dispatch Information
- `dispatchStatus` - String (Pending/Assigned/In Transit/Delivered)
- `assignedPerson_id` - Foreign key to User
- `dispatchId` - Dispatch identifier
- `estimatedDate`, `estimatedTime` - Estimated delivery
- `actualDate`, `actualTime` - Actual delivery
- `dispatchNotes` - Dispatch notes

### Billing
- `lensPrice` - Float
- `discount` - Float (percentage 0-100)

### Relations
- `items` - SaleOrderItem[]
- `invoice` - Invoice
- `purchaseOrders` - PurchaseOrder[]
- `dispatch` - DispatchCopy

### Audit Fields
- `activeStatus`, `deleteStatus`
- `createdAt`, `updatedAt`
- `createdBy`, `updatedBy`

---

## Key Features

### ✅ Auto-Generated Order Numbers
Orders automatically get unique sequential numbers: SO-2025-001, SO-2025-002, etc.

### ✅ Comprehensive Validation
- All related entities validated before creation/update
- Status enum validation
- Cannot delete orders with dependencies

### ✅ Dedicated Status Update
Separate endpoint for status-only updates - lightweight and fast

### ✅ Dedicated Dispatch Update
Separate endpoint for dispatch information - useful for dispatch team workflows

### ✅ Advanced Filtering
- Search across multiple fields
- Filter by status, customer, dispatch status
- Date range filtering
- Pagination support

### ✅ Soft Delete
Orders are never permanently deleted - marked as deleted instead

### ✅ Full Relation Loading
All related entities loaded with proper includes for complete data

### ✅ Statistics Dashboard
Get order counts by status, dispatch status, and revenue calculations

---

## Testing Examples

### Test 1: Create Order
```bash
curl -X POST http://localhost:3001/api/sale-orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": 1,
    "lens_id": 1,
    "category_id": 1,
    "lensPrice": 2500
  }'
```

### Test 2: Update Status
```bash
curl -X PATCH http://localhost:3001/api/sale-orders/1/status \
  -H "Content-Type: application/json" \
  -d '{"status": "CONFIRMED"}'
```

### Test 3: Update Dispatch
```bash
curl -X PATCH http://localhost:3001/api/sale-orders/1/dispatch \
  -H "Content-Type: application/json" \
  -d '{
    "dispatchStatus": "Assigned",
    "assignedPerson_id": 5,
    "estimatedDate": "2025-12-10T10:00:00Z"
  }'
```

### Test 4: Get with Filters
```bash
curl "http://localhost:3001/api/sale-orders?status=CONFIRMED&dispatchStatus=Pending&page=1&limit=10"
```

---

## Implementation Status

| Component | Status | File |
|-----------|--------|------|
| Service Layer | ✅ Complete | src/backend/services/saleOrderService.js |
| Controller Layer | ✅ Complete | src/backend/controllers/saleOrderController.js |
| Routes | ✅ Complete | src/backend/routes/saleOrders.js |
| Status Update Endpoint | ✅ Complete | PATCH /:id/status |
| Dispatch Update Endpoint | ✅ Complete | PATCH /:id/dispatch |
| Validation | ✅ Complete | Zod schemas |
| Error Handling | ✅ Complete | APIError class |

---

## Next Steps

1. **Start Server:**
   ```bash
   npm run dev:server
   ```

2. **Test Endpoints:**
   - Use Swagger UI: http://localhost:3001/api-docs
   - Use Postman or curl

3. **Create Sample Data:**
   - Create customers first
   - Create lens products
   - Create sale orders

4. **Test Workflows:**
   - Create order → Update status → Update dispatch → Track order

---

## Notes

- All endpoints require authentication (defaults to userId=1 if no auth)
- Role-based access control is in place
- Soft delete ensures data integrity
- Order numbers are unique and auto-generated
- Full audit trail with createdBy/updatedBy fields
- All dates use ISO 8601 format
- Pagination defaults: page=1, limit=10
- Search is case-insensitive across multiple fields
