# Lens Product Pricing Management API

## Overview
Enhanced API endpoints for managing pricing data for lens products with specific coating combinations. This allows you to create, update, and manage prices for each lens-coating combination independently.

## New Features Added
✅ **One-to-Many Relationship**: One lens product can have multiple prices (one for each coating)
✅ **Individual Price Management**: Add/update price for specific lens-coating combination
✅ **Bulk Price Operations**: Add/update multiple prices at once
✅ **Price Validation**: Prevents duplicate coating IDs and validates foreign keys
✅ **Price Retrieval**: Get all prices for a specific lens product

---

## API Endpoints

### 1. Get All Prices for a Lens Product
**GET** `/api/v1/lens-products/:lensId/prices`

Get all pricing information for a specific lens product.

**Parameters:**
- `lensId` (path, required): Lens product ID

**Response Example:**
```json
{
  "success": true,
  "message": "Lens prices retrieved successfully",
  "data": [
    {
      "id": 1,
      "lens_id": 10,
      "coating_id": 1,
      "price": 2500.00,
      "activeStatus": true,
      "coating": {
        "id": 1,
        "name": "Anti-Reflective",
        "short_name": "AR"
      }
    },
    {
      "id": 2,
      "lens_id": 10,
      "coating_id": 2,
      "price": 3200.00,
      "activeStatus": true,
      "coating": {
        "id": 2,
        "name": "Blue Light Filter",
        "short_name": "BLF"
      }
    }
  ]
}
```

---

### 2. Add or Update Single Price
**POST** `/api/v1/lens-products/:lensId/prices/:coatingId`

Add a new price or update existing price for a specific lens-coating combination.

**Parameters:**
- `lensId` (path, required): Lens product ID
- `coatingId` (path, required): Coating ID

**Request Body:**
```json
{
  "price": 2500.00
}
```

**Response Example:**
```json
{
  "success": true,
  "message": "Lens price added/updated successfully",
  "data": {
    "id": 1,
    "lens_id": 10,
    "coating_id": 1,
    "price": 2500.00,
    "activeStatus": true,
    "createdAt": "2025-01-13T10:30:00.000Z",
    "updatedAt": "2025-01-13T10:30:00.000Z",
    "lens": {
      "id": 10,
      "lens_name": "Single Vision Premium",
      "product_code": "SV-001"
    },
    "coating": {
      "id": 1,
      "name": "Anti-Reflective",
      "short_name": "AR"
    }
  }
}
```

**Notes:**
- If price already exists for this lens-coating combination, it will be updated
- If no price exists, a new one will be created
- Validates that both lens and coating exist and are active

---

### 3. Bulk Add or Update Prices
**POST** `/api/v1/lens-products/:lensId/prices/bulk`

Add or update multiple prices for a lens product in a single request.

**Parameters:**
- `lensId` (path, required): Lens product ID

**Request Body:**
```json
{
  "prices": [
    {
      "coating_id": 1,
      "price": 2500.00
    },
    {
      "coating_id": 2,
      "price": 3200.00
    },
    {
      "coating_id": 3,
      "price": 2800.00
    }
  ]
}
```

**Response Example:**
```json
{
  "success": true,
  "message": "Bulk prices processed successfully. 3 prices updated.",
  "data": {
    "lens": {
      "id": 10,
      "lens_name": "Single Vision Premium",
      "product_code": "SV-001",
      "lensPriceMasters": [
        {
          "id": 1,
          "coating_id": 1,
          "price": 2500.00,
          "coating": {
            "id": 1,
            "name": "Anti-Reflective",
            "short_name": "AR"
          }
        },
        {
          "id": 2,
          "coating_id": 2,
          "price": 3200.00,
          "coating": {
            "id": 2,
            "name": "Blue Light Filter",
            "short_name": "BLF"
          }
        },
        {
          "id": 3,
          "coating_id": 3,
          "price": 2800.00,
          "coating": {
            "id": 3,
            "name": "UV Protection",
            "short_name": "UV"
          }
        }
      ]
    },
    "pricesProcessed": 3,
    "details": [
      { "id": 1, "coating_id": 1, "price": 2500.00, "operation": "updated" },
      { "id": 2, "coating_id": 2, "price": 3200.00, "operation": "created" },
      { "id": 3, "coating_id": 3, "price": 2800.00, "operation": "created" }
    ]
  }
}
```

**Validation:**
- All coating IDs must be unique (no duplicates)
- All coating IDs must exist and be active
- All prices must be positive numbers
- Lens product must exist and be active

---

### 4. Delete Price
**DELETE** `/api/v1/lens-products/:lensId/prices/:coatingId`

Delete (soft delete) a price for a specific lens-coating combination.

**Parameters:**
- `lensId` (path, required): Lens product ID
- `coatingId` (path, required): Coating ID

**Response Example:**
```json
{
  "success": true,
  "message": "Lens price deleted successfully"
}
```

---

## Enhanced Create Lens Product Endpoint

### Create Lens Product with Prices
**POST** `/api/v1/lens-products`

Now supports creating a lens product with initial pricing data.

**Request Body Example:**
```json
{
  "brand_id": 1,
  "category_id": 2,
  "material_id": 3,
  "type_id": 4,
  "product_code": "SV-PREM-001",
  "lens_name": "Single Vision Premium",
  "index_value": 167,
  "sphere_min": -6.0,
  "sphere_max": 6.0,
  "cyl_min": -2.0,
  "cyl_max": 0.0,
  "add_min": 0.0,
  "add_max": 3.0,
  "range_text": "Standard range for single vision",
  "prices": [
    {
      "coating_id": 1,
      "price": 2500.00
    },
    {
      "coating_id": 2,
      "price": 3200.00
    }
  ]
}
```

**Features:**
- `prices` array is optional
- If provided, prices will be created along with the lens product
- Validates all coating IDs exist and are unique
- Returns lens product with nested price information

---

## Error Handling

### Common Error Responses

**404 - Lens Not Found**
```json
{
  "success": false,
  "message": "Lens product not found",
  "error": {
    "code": "LENS_NOT_FOUND"
  }
}
```

**404 - Coating Not Found**
```json
{
  "success": false,
  "message": "Coating not found",
  "error": {
    "code": "COATING_NOT_FOUND"
  }
}
```

**400 - Invalid Coating IDs**
```json
{
  "success": false,
  "message": "One or more coating IDs are invalid",
  "error": {
    "code": "INVALID_COATING_IDS"
  }
}
```

**400 - Duplicate Coating IDs**
```json
{
  "success": false,
  "message": "Duplicate coating IDs found in prices",
  "error": {
    "code": "DUPLICATE_COATING_IDS"
  }
}
```

**400 - Price Not Found**
```json
{
  "success": false,
  "message": "Price not found for this lens-coating combination",
  "error": {
    "code": "PRICE_NOT_FOUND"
  }
}
```

---

## Usage Examples

### Example 1: Create Lens Product with Prices
```javascript
const response = await fetch('/api/v1/lens-products', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    brand_id: 1,
    category_id: 2,
    material_id: 3,
    type_id: 4,
    product_code: 'SV-001',
    lens_name: 'Single Vision Standard',
    prices: [
      { coating_id: 1, price: 2500 },
      { coating_id: 2, price: 3000 }
    ]
  })
});
```

### Example 2: Add Price for Specific Coating
```javascript
const response = await fetch('/api/v1/lens-products/10/prices/5', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    price: 2800.00
  })
});
```

### Example 3: Bulk Update All Prices for a Lens
```javascript
const response = await fetch('/api/v1/lens-products/10/prices/bulk', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prices: [
      { coating_id: 1, price: 2500 },
      { coating_id: 2, price: 3200 },
      { coating_id: 3, price: 2800 },
      { coating_id: 4, price: 3500 }
    ]
  })
});
```

### Example 4: Get All Prices for a Lens
```javascript
const response = await fetch('/api/v1/lens-products/10/prices', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { data } = await response.json();
console.log(`Lens has ${data.length} different coating prices`);
```

---

## Database Schema

### LensPriceMaster Table Structure
```prisma
model LensPriceMaster {
  id           Int               @id @default(autoincrement())
  lens_id      Int               // Foreign key to LensProductMaster
  coating_id   Int               // Foreign key to LensCoatingMaster
  price        Float             // Price value
  activeStatus Boolean           @default(true)
  deleteStatus Boolean           @default(false)
  createdAt    DateTime          @default(now())
  updatedAt    DateTime?         @updatedAt
  createdBy    Int
  updatedBy    Int?
  
  // Relationships
  coating      LensCoatingMaster @relation(fields: [coating_id], references: [id])
  lens         LensProductMaster @relation(fields: [lens_id], references: [id])
  Usercreated  User              @relation("priceUserCreate", fields: [createdBy], references: [id])
  Userupdated  User?             @relation("priceUserUpdate", fields: [updatedBy], references: [id])
}
```

---

## Testing with cURL

### Add Single Price
```bash
curl -X POST http://localhost:5000/api/v1/lens-products/10/prices/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"price": 2500.00}'
```

### Bulk Update Prices
```bash
curl -X POST http://localhost:5000/api/v1/lens-products/10/prices/bulk \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prices": [
      {"coating_id": 1, "price": 2500},
      {"coating_id": 2, "price": 3200}
    ]
  }'
```

### Get All Prices
```bash
curl -X GET http://localhost:5000/api/v1/lens-products/10/prices \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Delete Price
```bash
curl -X DELETE http://localhost:5000/api/v1/lens-products/10/prices/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Summary of Changes

### Files Modified
1. **lensProductMasterService.js** - Added 5 new methods for pricing management
2. **lensProductMasterController.js** - Added 4 new controller functions
3. **lensProducts.js (routes)** - Added 4 new routes with Swagger documentation

### New Methods Added to Service
- `addOrUpdateLensPrice()` - Single price add/update
- `bulkAddOrUpdateLensPrices()` - Bulk price operations
- `deleteLensPrice()` - Soft delete price
- `getLensPricesByLensId()` - Get all prices for a lens

### Enhanced Existing Methods
- `createLensProduct()` - Now validates coating IDs and includes prices in response
- `updateLensProduct()` - Enhanced with price validation

---

## Best Practices

1. **Always validate coating IDs** before bulk operations
2. **Use bulk operations** when updating multiple prices to reduce API calls
3. **Handle both create and update scenarios** - The single price endpoint automatically handles both
4. **Soft delete** - Deleted prices are marked as deleted, not removed from database
5. **Include prices in product creation** - More efficient than separate API calls

---

## Next Steps

Consider adding:
- [ ] Price history tracking
- [ ] Bulk price import/export (CSV)
- [ ] Price comparison across products
- [ ] Discount/promotion management
- [ ] Price approval workflow

