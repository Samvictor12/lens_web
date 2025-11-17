# Price Mapping API Documentation

## Overview
The Price Mapping API provides bulk CRUD operations for managing customer-specific lens pricing and discount rates. This allows you to set custom discount rates for specific customers on specific lens prices (LensPriceMaster entries), with automatic calculation of the discounted price.

## Base URL
```
http://localhost:3001/api/price-mappings
```

## Model Structure

### PriceMapping
```javascript
{
  id: Integer (Auto-increment)
  lensPrice_id: Integer (Required) // References LensPriceMaster
  customer_id: Integer (Required)
  discountRate: Float (0-100, default: 0) // Percentage discount
  discountPrice: Float (Auto-calculated) // Final price after discount
  createdAt: DateTime
  updatedAt: DateTime
  createdBy: Integer
  updatedBy: Integer
}
```

**Key Changes:**
- Now linked to `LensPriceMaster` instead of `LensProductMaster`
- Added `discountPrice` field that stores the calculated discounted price
- `discountPrice` is automatically calculated: `basePrice - (basePrice × discountRate / 100)`

---

## API Endpoints

### 1. Bulk Create Price Mappings
Create multiple price mappings for a customer in one request.

**Endpoint:** `POST /api/price-mappings/bulk`

**Request Body:**
```json
{
  "customer_id": 1,
  "mappings": [
    {
      "lensPrice_id": 5,
      "discountRate": 10.5
    },
    {
      "lensPrice_id": 8,
      "discountRate": 15
    },
    {
      "lensPrice_id": 12,
      "discountRate": 20
    }
  ]
}
```

**Note:** `discountPrice` is automatically calculated based on the base price from LensPriceMaster and the provided discountRate.

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Price mappings created successfully",
  "data": {
    "count": 3,
    "mappings": [
      {
        "id": 1,
        "customer_id": 1,
        "lensPrice_id": 5,
        "discountRate": 10.5,
        "discountPrice": 2237.5,
        "createdAt": "2025-11-14T10:00:00.000Z",
        "updatedAt": "2025-11-14T10:00:00.000Z",
        "lensPrice": {
          "id": 5,
          "price": 2500,
          "lens": {
            "id": 3,
            "product_code": "LP-001",
            "lens_name": "Progressive Lens 1.56",
            "brand": { "id": 1, "name": "Essilor" },
            "category": { "id": 1, "name": "Progressive" }
          },
          "coating": {
            "id": 2,
            "name": "Anti-Reflection",
            "short_name": "AR"
          }
        },
        "customer": {
          "id": 1,
          "code": "CUST-001",
          "name": "John's Optical Store",
          "shopname": "Vision Center"
        }
      }
      // ... more mappings
    ]
  }
}
```

**Validations:**
- `customer_id` is required and must exist
- Each mapping must have `lensPrice_id` (reference to LensPriceMaster)
- `lensPrice_id` must exist and be active
- `discountRate` must be between 0 and 100
- Duplicate mappings (same customer + lens price) are not allowed
- `discountPrice` is automatically calculated and cannot be manually set

---

### 2. Bulk Update Price Mappings
Update discount rates for multiple existing price mappings.

**Endpoint:** `PUT /api/price-mappings/bulk`

**Request Body:**
```json
{
  "mappings": [
    {
      "id": 1,
      "discountRate": 12.5
    },
    {
      "id": 2,
      "discountRate": 18
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Price mappings updated successfully",
  "data": {
    "count": 2,
    "mappings": [
      {
        "id": 1,
        "customer_id": 1,
        "lensPrice_id": 5,
        "discountRate": 12.5,
        "discountPrice": 2187.5,
        "updatedAt": "2025-11-14T10:30:00.000Z",
        "lensPrice": { /* ... */ },
        "customer": { /* ... */ }
      }
      // ... more updated mappings
    ]
  }
}
```

---

### 3. Bulk Upsert Price Mappings
Create new mappings or update existing ones in a single operation.

**Endpoint:** `POST /api/price-mappings/bulk/upsert`

**Request Body:**
```json
{
  "customer_id": 1,
  "mappings": [
    {
      "lensPrice_id": 5,
      "discountRate": 15
    },
    {
      "lensPrice_id": 8,
      "discountRate": 20
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Price mappings upserted successfully",
  "data": {
    "created": 1,
    "updated": 1,
    "total": 2,
    "mappings": [
      // All affected mappings
    ]
  }
}
```

**Behavior:**
- If mapping exists for customer + lens price: UPDATE (recalculates discountPrice)
- If mapping doesn't exist: CREATE (calculates discountPrice)
- Perfect for updating an entire customer's price list
- Automatically recalculates `discountPrice` based on current base price

---

### 4. Get All Price Mappings (Paginated)
Retrieve price mappings with pagination and filtering.

**Endpoint:** `GET /api/price-mappings`

**Query Parameters:**
- `page` (integer, default: 1)
- `limit` (integer, default: 10)
- `customer_id` (integer, optional) - Filter by customer
- `lensPrice_id` (integer, optional) - Filter by lens price master
- `search` (string, optional) - Search in customer name, code, lens name, product code
- `sortBy` (string, default: "createdAt")
- `sortOrder` (string, default: "desc") - "asc" or "desc"

**Example Request:**
```
GET /api/price-mappings?page=1&limit=20&customer_id=1&search=progressive
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "customer_id": 1,
      "lensPrice_id": 5,
      "discountRate": 15,
      "discountPrice": 2125,
      "createdAt": "2025-11-14T10:00:00.000Z",
      "lensPrice": {
        "id": 5,
        "price": 2500,
        "lens": { /* full lens product details */ },
        "coating": { /* coating details */ }
      },
      "customer": { /* full customer details */ },
      "createdByUser": { "id": 1, "name": "Admin User" },
      "updatedByUser": { "id": 1, "name": "Admin User" }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

### 5. Get Price Mappings by Customer
Get all price mappings for a specific customer.

**Endpoint:** `GET /api/price-mappings/customer/:customer_id`

**Example Request:**
```
GET /api/price-mappings/customer/1
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "customer_id": 1,
      "lensPrice_id": 5,
      "discountRate": 15,
      "discountPrice": 2125,
      "lensPrice": { /* ... */ }
    }
  ],
  "count": 5
}
```

---

### 6. Get Single Price Mapping
Get detailed information about a specific price mapping.

**Endpoint:** `GET /api/price-mappings/:id`

**Example Request:**
```
GET /api/price-mappings/1
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "customer_id": 1,
    "lensPrice_id": 5,
    "discountRate": 15,
    "discountPrice": 2125,
    "createdAt": "2025-11-14T10:00:00.000Z",
    "updatedAt": "2025-11-14T10:30:00.000Z",
    "lensPrice": {
      "id": 5,
      "price": 2500,
      "lens": {
        "id": 3,
        "product_code": "LP-001",
        "lens_name": "Progressive Lens 1.56",
        "brand": { /* full brand details */ },
        "category": { /* full category details */ },
        "material": { /* full material details */ },
        "type": { /* full type details */ }
      },
      "coating": {
        "id": 1,
        "name": "Anti-Reflection",
        "short_name": "AR"
      }
    },
    "customer": { /* full customer details */ },
    "createdByUser": { /* ... */ },
    "updatedByUser": { /* ... */ }
  }
}
```

---

### 7. Bulk Delete Price Mappings
Delete multiple price mappings by their IDs.

**Endpoint:** `DELETE /api/price-mappings/bulk`

**Request Body:**
```json
{
  "ids": [1, 2, 3, 5, 8]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "count": 5,
  "message": "Successfully deleted 5 price mapping(s)"
}
```

---

### 8. Delete All Customer Price Mappings
Delete all price mappings for a specific customer.

**Endpoint:** `DELETE /api/price-mappings/customer/:customer_id`

**Example Request:**
```
DELETE /api/price-mappings/customer/1
```

**Response (200 OK):**
```json
{
  "success": true,
  "count": 12,
  "message": "Successfully deleted 12 price mapping(s) for customer"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Customer ID is required"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Customer not found",
  "code": "CUSTOMER_NOT_FOUND"
}
```

```json
{
  "success": false,
  "message": "One or more lens prices not found",
  "code": "LENS_PRICES_NOT_FOUND"
}
```

### 409 Conflict
```json
{
  "success": false,
  "message": "Price mappings already exist for lens prices: 5, 8",
  "code": "DUPLICATE_PRICE_MAPPING"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to create price mappings",
  "code": "CREATE_PRICE_MAPPING_ERROR"
}
```

---

## Use Cases

### Use Case 1: Set Up New Customer Pricing
When a new customer is added and you want to give them specific discounts on certain lens prices:

```javascript
// Create bulk price mappings for a new customer
POST /api/price-mappings/bulk
{
  "customer_id": 15,
  "mappings": [
    { "lensPrice_id": 1, "discountRate": 10 },  // 10% off on lens price ID 1
    { "lensPrice_id": 2, "discountRate": 12 },  // 12% off on lens price ID 2
    { "lensPrice_id": 3, "discountRate": 15 }   // 15% off on lens price ID 3
  ]
}
```
**Note:** The system automatically calculates and stores the discounted price.

### Use Case 2: Update Customer's Pricing Structure
Update all discount rates for an existing customer:

```javascript
// First, get customer's existing mappings
GET /api/price-mappings/customer/15

// Then upsert with new rates (creates new or updates existing)
POST /api/price-mappings/bulk/upsert
{
  "customer_id": 15,
  "mappings": [
    { "lensPrice_id": 1, "discountRate": 12 },  // Updated from 10, discountPrice recalculated
    { "lensPrice_id": 2, "discountRate": 15 },  // Updated from 12, discountPrice recalculated
    { "lensPrice_id": 4, "discountRate": 10 }   // New price mapping with calculated discountPrice
  ]
}
```

### Use Case 3: Remove All Discounts for a Customer
```javascript
DELETE /api/price-mappings/customer/15
```

### Use Case 4: Search and Filter Mappings
```javascript
// Find all progressive lens mappings across all customers
GET /api/price-mappings?search=progressive&limit=50

// Find all mappings for a specific customer with pagination
GET /api/price-mappings?customer_id=15&page=1&limit=20
```

---

## Integration Example (JavaScript/Node.js)

```javascript
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001/api/price-mappings';

// Bulk create price mappings
async function createPriceMappings(customerId, mappings) {
  const response = await fetch(`${API_BASE}/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer_id: customerId,
      mappings
    })
  });
  
  return await response.json();
}

// Usage
const result = await createPriceMappings(1, [
  { lensPrice_id: 5, discountRate: 10 },
  { lensPrice_id: 8, discountRate: 15 }
]);

console.log(`Created ${result.data.count} price mappings`);
result.data.mappings.forEach(mapping => {
  console.log(`Lens Price ID: ${mapping.lensPrice_id}, Discount: ${mapping.discountRate}%, Final Price: ${mapping.discountPrice}`);
});
```

---

## Best Practices

1. **Use Bulk Operations**: Always prefer bulk operations over individual creates/updates for better performance.

2. **Use Upsert for Updates**: When updating a customer's entire price list, use the upsert endpoint to handle both creates and updates in one call.

3. **Validate Discount Rates**: Always ensure discount rates are between 0-100 before sending to API.

4. **Handle Conflicts**: When creating mappings, check for duplicate mapping errors (409) and handle appropriately.

5. **Pagination**: Use appropriate page sizes for listing operations to avoid loading too much data.

6. **Search Optimization**: Use the search parameter to quickly find specific mappings by customer name, lens name, or codes.

7. **Automatic Price Calculation**: The `discountPrice` is automatically calculated - never try to set it manually. It's always: `basePrice - (basePrice × discountRate / 100)`

8. **Price Updates**: When the base price in LensPriceMaster changes, remember to update or recalculate the price mappings if needed by using the upsert endpoint with the same discount rates.

---

## Database Indexes

The following indexes are automatically created for optimal query performance:

- `lensPrice_id` - Fast lookup by lens price master
- `customer_id` - Fast lookup by customer

---

## Notes

- All discount rates are stored as percentages (0-100)
- `discountPrice` is automatically calculated and stored for quick access
- The API automatically includes related data (lens price, lens product details, coating details, customer details) in responses
- Bulk operations are transactional - all succeed or all fail
- Soft deletes are not used - deletions are permanent
- Timestamps (createdAt, updatedAt) are automatically managed
- Price mappings now reference `LensPriceMaster` (which includes lens + coating combination) instead of just `LensProductMaster`

---

## Testing

You can test the API using the provided Swagger documentation at:
```
http://localhost:3001/api-docs
```

Or use tools like Postman, Insomnia, or curl:

```bash
# Bulk create
curl -X POST http://localhost:3001/api/price-mappings/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "mappings": [
      {"lensPrice_id": 5, "discountRate": 10}
    ]
  }'

# Get all mappings for a customer
curl -X GET http://localhost:3001/api/price-mappings/customer/1

# Delete customer's mappings
curl -X DELETE http://localhost:3001/api/price-mappings/customer/1
```
