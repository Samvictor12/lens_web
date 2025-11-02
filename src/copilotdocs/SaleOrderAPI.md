# Sale Order API Documentation

## Overview
Complete CRUD API for managing sale orders in the Lens Management System. This API handles the creation, reading, updating, and deletion of sale orders along with their associated items.

## Base URL
```
/api/sale-orders
```

## Authentication & Authorization
All endpoints require authentication and specific role permissions:
- **Admin**: Full access to all operations
- **Sales**: Can create, read, update, and delete sale orders
- **Inventory**: Can read sale orders and update status

---

## Endpoints

### 1. Create Sale Order
**POST** `/api/sale-orders`

Creates a new sale order with items.

**Required Roles:** Sales, Admin

**Request Body:**
```json
{
  "customerId": 1,
  "fittingType": "Free Fitting", // optional
  "items": [
    {
      "lensVariantId": 5,
      "quantity": 2,
      "discount": 10 // percentage (0-100), optional, default: 0
    },
    {
      "lensVariantId": 8,
      "quantity": 1,
      "discount": 0
    }
  ]
}
```

**Response (201):**
```json
{
  "status": "success",
  "data": {
    "id": 123,
    "customerId": 1,
    "status": "CONFIRMED",
    "fittingType": "Free Fitting",
    "createdAt": "2025-11-02T10:00:00.000Z",
    "updatedAt": "2025-11-02T10:00:00.000Z",
    "customer": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com"
    },
    "items": [
      {
        "id": 456,
        "lensVariantId": 5,
        "quantity": 2,
        "price": 150.00,
        "discount": 10,
        "lensVariant": {
          "id": 5,
          "name": "Acuvue Oasys",
          "price": 150.00,
          "isRx": true
        }
      }
    ]
  }
}
```

**Business Logic:**
- Validates customer exists
- Checks stock availability for non-Rx items
- Sets initial status based on Rx requirements:
  - If has Rx items: `CONFIRMED` (needs purchase order)
  - If no Rx items: `IN_PRODUCTION` (uses inventory)
- For non-Rx items moving to production, automatically deducts stock

---

### 2. List Sale Orders
**GET** `/api/sale-orders`

Retrieves sale orders with optional filtering and pagination.

**Required Roles:** Sales, Admin, Inventory

**Query Parameters:**
- `status` (optional): Filter by status (`DRAFT`, `CONFIRMED`, `IN_PRODUCTION`, `READY_FOR_DISPATCH`, `DELIVERED`)
- `customerId` (optional): Filter by customer ID
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Example:**
```
GET /api/sale-orders?status=CONFIRMED&page=1&limit=5
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "customerId": 1,
      "status": "CONFIRMED",
      "fittingType": "Free Fitting",
      "totalAmount": 270.00,
      "createdAt": "2025-11-02T10:00:00.000Z",
      "customer": {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com"
      },
      "items": [...]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 5,
    "total": 25,
    "pages": 5
  }
}
```

---

### 3. Get Sale Order by ID
**GET** `/api/sale-orders/:id`

Retrieves a specific sale order with complete details.

**Required Roles:** Sales, Admin, Inventory

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "customerId": 1,
    "status": "CONFIRMED",
    "fittingType": "Free Fitting",
    "totalAmount": 270.00,
    "createdAt": "2025-11-02T10:00:00.000Z",
    "updatedAt": "2025-11-02T10:00:00.000Z",
    "customer": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890"
    },
    "items": [
      {
        "id": 456,
        "lensVariantId": 5,
        "quantity": 2,
        "price": 150.00,
        "discount": 10,
        "lensVariant": {
          "id": 5,
          "name": "Acuvue Oasys",
          "price": 150.00,
          "isRx": true,
          "lensType": {
            "id": 2,
            "name": "Daily Disposable"
          }
        }
      }
    ],
    "invoice": null,
    "dispatch": null
  }
}
```

---

### 4. Update Sale Order
**PUT** `/api/sale-orders/:id`

Updates a sale order (only allowed for DRAFT and CONFIRMED orders).

**Required Roles:** Sales, Admin

**Request Body:**
```json
{
  "customerId": 2, // optional
  "fittingType": "Premium Fitting", // optional
  "status": "CONFIRMED", // optional
  "items": [ // optional - if provided, replaces all items
    {
      "lensVariantId": 5,
      "quantity": 3,
      "discount": 15
    }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    // Updated sale order object
  }
}
```

**Business Logic:**
- Only DRAFT and CONFIRMED orders can be updated
- If items are updated, existing items are replaced
- Stock validation is performed for new items
- Customer validation if customerId is changed

---

### 5. Update Sale Order Status
**PATCH** `/api/sale-orders/:id/status`

Updates only the status of a sale order.

**Required Roles:** Sales, Admin, Inventory

**Request Body:**
```json
{
  "status": "IN_PRODUCTION"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    // Updated sale order object
  }
}
```

**Business Logic:**
- When status changes to `IN_PRODUCTION`, stock is deducted for non-Rx items
- Status transitions are logged for audit purposes

---

### 6. Delete Sale Order
**DELETE** `/api/sale-orders/:id`

Deletes a sale order (with restrictions).

**Required Roles:** Sales, Admin

**Response (200):**
```json
{
  "success": true,
  "message": "Sale order deleted successfully"
}
```

**Deletion Restrictions:**
- Cannot delete if sale order has an invoice
- Cannot delete if sale order has purchase orders
- Cannot delete orders with status `READY_FOR_DISPATCH` or `DELIVERED`
- If order was `IN_PRODUCTION`, stock is restored for non-Rx items

---

### 7. Get Sale Order Summary
**GET** `/api/sale-orders/summary`

Retrieves summary statistics for sale orders.

**Required Roles:** Sales, Admin

**Query Parameters:**
- `startDate` (optional): Start date filter (ISO format)
- `endDate` (optional): End date filter (ISO format)

**Example:**
```
GET /api/sale-orders/summary?startDate=2025-11-01T00:00:00.000Z&endDate=2025-11-30T23:59:59.999Z
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalOrders": 156,
    "totalRevenue": 125400.50,
    "ordersByStatus": {
      "DRAFT": 12,
      "CONFIRMED": 45,
      "IN_PRODUCTION": 67,
      "READY_FOR_DISPATCH": 23,
      "DELIVERED": 9
    }
  }
}
```

---

## Status Flow

```
DRAFT → CONFIRMED → IN_PRODUCTION → READY_FOR_DISPATCH → DELIVERED
```

**Status Descriptions:**
- `DRAFT`: Initial status, order can be modified
- `CONFIRMED`: Order confirmed, awaiting production/procurement
- `IN_PRODUCTION`: Items being manufactured or prepared
- `READY_FOR_DISPATCH`: Order ready for delivery
- `DELIVERED`: Order completed and delivered

---

## Error Responses

### Common Error Codes:

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "customerId",
      "message": "Customer ID is required"
    }
  ]
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Sale order not found",
  "code": "SALE_ORDER_NOT_FOUND"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "message": "Insufficient permissions",
  "code": "FORBIDDEN"
}
```

**Business Logic Errors:**
```json
{
  "success": false,
  "message": "Insufficient stock for Acuvue Oasys",
  "code": "INSUFFICIENT_STOCK",
  "details": {
    "available": 5,
    "requested": 10
  }
}
```

---

## Usage Examples

### Creating a Sale Order with Mixed Items
```javascript
const response = await fetch('/api/sale-orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-token'
  },
  body: JSON.stringify({
    customerId: 1,
    fittingType: "Free Fitting",
    items: [
      {
        lensVariantId: 5, // Rx item
        quantity: 1,
        discount: 0
      },
      {
        lensVariantId: 12, // Non-Rx item
        quantity: 2,
        discount: 5
      }
    ]
  })
});

const result = await response.json();
```

### Filtering Orders by Status
```javascript
const response = await fetch('/api/sale-orders?status=IN_PRODUCTION&page=1&limit=20', {
  headers: {
    'Authorization': 'Bearer your-token'
  }
});

const orders = await response.json();
```

### Updating Order Status
```javascript
const response = await fetch('/api/sale-orders/123/status', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-token'
  },
  body: JSON.stringify({
    status: 'READY_FOR_DISPATCH'
  })
});
```

---

## Integration Notes

1. **Inventory Management**: Non-Rx items automatically deduct from stock when status changes to `IN_PRODUCTION`
2. **Purchase Orders**: Rx items may trigger purchase order creation when confirmed
3. **Invoicing**: Sale orders can be linked to invoices for billing
4. **Dispatch**: Ready orders can be assigned to dispatch copies for delivery tracking
5. **Audit Trail**: All status changes and modifications are logged with timestamps

## Testing

Use the provided health check endpoint to verify API connectivity:
```
GET /api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-11-02T10:00:00.000Z"
}
```