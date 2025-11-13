# Lens Masters API Documentation

## Overview
This document provides a comprehensive overview of the newly created Lens Master APIs for managing lens products, categories, materials, coatings, brands, types, and pricing in the Lens Management System.

## Created Files Summary

### Service Layer (7 files)
1. **lensCategoryMasterService.js** - Lens category management
2. **lensMaterialMasterService.js** - Lens material management
3. **lensCoatingMasterService.js** - Lens coating management
4. **lensBrandMasterService.js** - Lens brand management
5. **lensTypeMasterService.js** - Lens type management
6. **lensProductMasterService.js** - Lens product management (complex, with 4 foreign keys)
7. **lensPriceMasterService.js** - Lens pricing management

### Controller Layer (7 files)
1. **lensCategoryMasterController.js**
2. **lensMaterialMasterController.js**
3. **lensCoatingMasterController.js**
4. **lensBrandMasterController.js**
5. **lensTypeMasterController.js**
6. **lensProductMasterController.js**
7. **lensPriceMasterController.js**

### DTO/Validation Layer (1 file)
1. **lensMastersDto.js** - Consolidated validation functions for all lens masters

### Route Layer (7 files)
1. **lensCategories.js** - `/api/v1/lens-categories`
2. **lensMaterials.js** - `/api/v1/lens-materials`
3. **lensCoatings.js** - `/api/v1/lens-coatings`
4. **lensBrands.js** - `/api/v1/lens-brands`
5. **lensTypes.js** - `/api/v1/lens-types`
6. **lensProducts.js** - `/api/v1/lens-products`
7. **lensPrices.js** - `/api/v1/lens-prices`

### Utility Files (1 file)
1. **errors.js** - Re-exports APIError for easier imports

### Updated Files (1 file)
1. **server.js** - Integrated all 7 new route modules

## API Endpoints

### 1. Lens Categories API
**Base URL:** `/api/v1/lens-categories`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/` | Create new category | Yes |
| GET | `/` | Get all categories (paginated) | Yes |
| GET | `/:id` | Get category by ID | Yes |
| PUT | `/:id` | Update category | Yes |
| DELETE | `/:id` | Soft delete category | Yes |
| GET | `/dropdown` | Get categories for dropdown | Yes |
| GET | `/statistics` | Get category statistics | Yes |

### 2. Lens Materials API
**Base URL:** `/api/v1/lens-materials`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/` | Create new material | Yes |
| GET | `/` | Get all materials (paginated) | Yes |
| GET | `/:id` | Get material by ID | Yes |
| PUT | `/:id` | Update material | Yes |
| DELETE | `/:id` | Soft delete material | Yes |
| GET | `/dropdown` | Get materials for dropdown | Yes |
| GET | `/statistics` | Get material statistics | Yes |

### 3. Lens Coatings API
**Base URL:** `/api/v1/lens-coatings`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/` | Create new coating | Yes |
| GET | `/` | Get all coatings (paginated) | Yes |
| GET | `/:id` | Get coating by ID | Yes |
| PUT | `/:id` | Update coating | Yes |
| DELETE | `/:id` | Soft delete coating | Yes |
| GET | `/dropdown` | Get coatings for dropdown | Yes |
| GET | `/statistics` | Get coating statistics | Yes |

**Note:** Coatings have both `name` and `short_name` fields.

### 4. Lens Brands API
**Base URL:** `/api/v1/lens-brands`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/` | Create new brand | Yes |
| GET | `/` | Get all brands (paginated) | Yes |
| GET | `/:id` | Get brand by ID | Yes |
| PUT | `/:id` | Update brand | Yes |
| DELETE | `/:id` | Soft delete brand | Yes |
| GET | `/dropdown` | Get brands for dropdown | Yes |
| GET | `/statistics` | Get brand statistics | Yes |

### 5. Lens Types API
**Base URL:** `/api/v1/lens-types`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/` | Create new type | Yes |
| GET | `/` | Get all types (paginated) | Yes |
| GET | `/:id` | Get type by ID | Yes |
| PUT | `/:id` | Update type | Yes |
| DELETE | `/:id` | Soft delete type | Yes |
| GET | `/dropdown` | Get types for dropdown | Yes |
| GET | `/statistics` | Get type statistics | Yes |

### 6. Lens Products API
**Base URL:** `/api/v1/lens-products`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/` | Create new product | Yes |
| GET | `/` | Get all products (paginated, filterable) | Yes |
| GET | `/:id` | Get product by ID | Yes |
| PUT | `/:id` | Update product | Yes |
| DELETE | `/:id` | Soft delete product | Yes |
| GET | `/dropdown` | Get products for dropdown (with filters) | Yes |
| GET | `/statistics` | Get product statistics | Yes |
| GET | `/by-category/:categoryId` | Get products by category | Yes |

**Query Parameters for GET /:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `brand_id` - Filter by brand
- `category_id` - Filter by category
- `material_id` - Filter by material
- `type_id` - Filter by type
- `search` - Search by product code or lens name

**Query Parameters for GET /dropdown:**
- `brand_id` - Filter by brand
- `category_id` - Filter by category
- `material_id` - Filter by material
- `type_id` - Filter by type

### 7. Lens Prices API
**Base URL:** `/api/v1/lens-prices`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/` | Create new price | Yes |
| GET | `/` | Get all prices (paginated, filterable) | Yes |
| GET | `/:id` | Get price by ID | Yes |
| PUT | `/:id` | Update price | Yes |
| DELETE | `/:id` | Soft delete price | Yes |
| GET | `/dropdown` | Get prices for dropdown | Yes |
| GET | `/statistics` | Get price statistics (min/max/avg) | Yes |
| GET | `/by-lens-coating` | Get price by lens and coating | Yes |
| GET | `/by-lens/:lensId` | Get all prices for a lens | Yes |

**Query Parameters for GET /:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `lens_id` - Filter by lens
- `coating_id` - Filter by coating
- `minPrice` - Minimum price filter
- `maxPrice` - Maximum price filter

**Query Parameters for GET /by-lens-coating:**
- `lens_id` - Lens ID (required)
- `coating_id` - Coating ID (required)

## Data Models

### LensCategoryMaster
```json
{
  "id": "integer",
  "name": "string (max 200)",
  "description": "string (max 500, optional)",
  "activeStatus": "boolean",
  "deleteStatus": "boolean",
  "createdBy": "integer",
  "updatedBy": "integer (optional)",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### LensMaterialMaster
```json
{
  "id": "integer",
  "name": "string (max 200)",
  "description": "string (max 500, optional)",
  "activeStatus": "boolean",
  "deleteStatus": "boolean",
  "createdBy": "integer",
  "updatedBy": "integer (optional)",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### LensCoatingMaster
```json
{
  "id": "integer",
  "name": "string (max 200)",
  "short_name": "string (max 50)",
  "description": "string (max 500, optional)",
  "activeStatus": "boolean",
  "deleteStatus": "boolean",
  "createdBy": "integer",
  "updatedBy": "integer (optional)",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### LensBrandMaster
```json
{
  "id": "integer",
  "name": "string (max 200)",
  "description": "string (max 500, optional)",
  "activeStatus": "boolean",
  "deleteStatus": "boolean",
  "createdBy": "integer",
  "updatedBy": "integer (optional)",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### LensTypeMaster
```json
{
  "id": "integer",
  "name": "string (max 200)",
  "description": "string (max 500, optional)",
  "activeStatus": "boolean",
  "deleteStatus": "boolean",
  "createdBy": "integer",
  "updatedBy": "integer (optional)",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### LensProductMaster
```json
{
  "id": "integer",
  "brand_id": "integer (FK)",
  "category_id": "integer (FK)",
  "material_id": "integer (FK)",
  "type_id": "integer (FK)",
  "product_code": "string (max 100)",
  "lens_name": "string (max 200)",
  "sphere_from": "decimal (optional)",
  "sphere_to": "decimal (optional)",
  "cylinder_from": "decimal (optional)",
  "cylinder_to": "decimal (optional)",
  "add_from": "decimal (optional)",
  "add_to": "decimal (optional)",
  "range_text": "string (max 500, optional)",
  "activeStatus": "boolean",
  "deleteStatus": "boolean",
  "createdBy": "integer",
  "updatedBy": "integer (optional)",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### LensPriceMaster
```json
{
  "id": "integer",
  "lens_id": "integer (FK)",
  "coating_id": "integer (FK)",
  "price": "decimal",
  "activeStatus": "boolean",
  "deleteStatus": "boolean",
  "createdBy": "integer",
  "updatedBy": "integer (optional)",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

## Features Implemented

### Common Features (All APIs)
1. **CRUD Operations** - Complete Create, Read, Update, Delete functionality
2. **Soft Delete** - All deletes are soft deletes (sets `deleteStatus: true`, `activeStatus: false`)
3. **Pagination** - All list endpoints support pagination with `page` and `limit` parameters
4. **Search** - Text-based search where applicable
5. **Dropdown Data** - Dedicated endpoints for dropdown/select components
6. **Statistics** - Count endpoints for dashboard/analytics
7. **Authentication** - JWT-based authentication on all endpoints
8. **Error Handling** - Comprehensive error handling with APIError class
9. **Validation** - Input validation using DTO layer
10. **Swagger Documentation** - Complete OpenAPI/Swagger documentation

### Unique Features

#### Lens Products API
- **Multi-filter Support** - Filter by brand, category, material, and type
- **Foreign Key Validation** - Validates existence of brand, category, material, and type before creation
- **Filtered Dropdown** - Dropdown endpoint supports filtering by multiple criteria
- **Category Statistics** - Statistics grouped by category

#### Lens Prices API
- **Unique Combination Validation** - Ensures lens-coating combinations are unique
- **Price Range Filtering** - Filter by minimum and maximum price
- **Specialized Queries**:
  - Get price for specific lens-coating combination
  - Get all prices for a specific lens
- **Aggregate Statistics** - Min, max, average price calculations

## Validation Rules

### Common Validations
- All IDs must be positive integers
- `page` must be >= 1
- `limit` must be between 1 and 100
- `createdBy`/`updatedBy` required for mutations

### Field-Specific Validations

#### Name Fields
- Required for all entities
- Maximum 200 characters
- Must not be empty

#### Short Name (Coatings only)
- Required
- Maximum 50 characters

#### Description
- Optional
- Maximum 500 characters

#### Product Code
- Required
- Maximum 100 characters

#### Lens Name
- Required
- Maximum 200 characters

#### Price
- Required
- Must be a positive number
- Cannot be negative

#### Range Text
- Optional
- Maximum 500 characters

## Error Responses

### Standard Error Format
```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    {
      "field": "fieldName",
      "message": "Specific error message"
    }
  ]
}
```

### Common Error Codes
- **400** - Validation error or bad request
- **401** - Unauthorized (missing or invalid JWT token)
- **404** - Resource not found
- **409** - Conflict (duplicate entry)
- **500** - Internal server error

## Usage Examples

### Create Lens Category
```bash
POST /api/v1/lens-categories
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Single Vision",
  "description": "Basic single vision lenses"
}
```

### Get All Products with Filters
```bash
GET /api/v1/lens-products?page=1&limit=10&brand_id=1&category_id=2
Authorization: Bearer <token>
```

### Get Price for Lens-Coating Combination
```bash
GET /api/v1/lens-prices/by-lens-coating?lens_id=5&coating_id=3
Authorization: Bearer <token>
```

### Create Lens Product
```bash
POST /api/v1/lens-products
Authorization: Bearer <token>
Content-Type: application/json

{
  "brand_id": 1,
  "category_id": 2,
  "material_id": 3,
  "type_id": 4,
  "product_code": "SV-CR39-001",
  "lens_name": "Standard CR39 Single Vision",
  "sphere_from": -6.0,
  "sphere_to": 6.0,
  "cylinder_from": -2.0,
  "cylinder_to": 0.0,
  "range_text": "Standard range for most prescriptions"
}
```

### Update Lens Price
```bash
PUT /api/v1/lens-prices/123
Authorization: Bearer <token>
Content-Type: application/json

{
  "price": 2999.99
}
```

## Database Relationships

```
LensBrandMaster (1) ----< (Many) LensProductMaster
LensCategoryMaster (1) ----< (Many) LensProductMaster
LensMaterialMaster (1) ----< (Many) LensProductMaster
LensTypeMaster (1) ----< (Many) LensProductMaster

LensProductMaster (1) ----< (Many) LensPriceMaster
LensCoatingMaster (1) ----< (Many) LensPriceMaster
```

## Testing Checklist

### For Each API
- [ ] Create new record
- [ ] Get all records (test pagination)
- [ ] Get by ID
- [ ] Update record
- [ ] Soft delete record
- [ ] Get dropdown data
- [ ] Get statistics
- [ ] Test validation errors
- [ ] Test authentication

### Specific Tests
- [ ] Test duplicate prevention (categories, materials, coatings, brands, types)
- [ ] Test foreign key validation (products, prices)
- [ ] Test lens-coating combination uniqueness (prices)
- [ ] Test filtered dropdowns (products)
- [ ] Test price range filtering (prices)
- [ ] Test search functionality (products)
- [ ] Test relationship constraints (e.g., cannot delete category with products)

## Next Steps

1. **Run Database Migration**
   ```bash
   npx prisma migrate dev
   ```

2. **Start the Server**
   ```bash
   npm run dev
   # or
   node src/backend/server.js
   ```

3. **Access Swagger Documentation**
   Navigate to: `http://localhost:5000/api-docs`

4. **Test APIs**
   - Use Swagger UI for interactive testing
   - Use Postman or similar tools
   - Implement frontend integration

5. **Seed Initial Data** (Optional)
   Create seed scripts for:
   - Basic categories
   - Common materials
   - Standard coatings
   - Popular brands
   - Lens types

## Security Considerations

1. All endpoints require JWT authentication
2. User ID is automatically extracted from JWT token
3. Soft delete prevents accidental data loss
4. Input validation prevents SQL injection
5. Error messages don't expose sensitive information

## Performance Considerations

1. Pagination limits large result sets
2. Dropdown endpoints return minimal fields (id, name)
3. Statistics are calculated efficiently using Prisma aggregations
4. Indexes on foreign keys for better query performance
5. Soft delete filters applied at query level

## Maintenance

### Adding New Fields
1. Update Prisma schema
2. Run migration
3. Update service layer methods
4. Update DTO validation
5. Update Swagger documentation

### Modifying Validation Rules
1. Update DTO validation functions
2. Update Swagger documentation
3. Test thoroughly

## Support

For issues or questions:
1. Check Swagger documentation at `/api-docs`
2. Review this documentation
3. Check error responses for detailed messages
4. Enable debug logging in development

---

**Created:** 2025
**Last Updated:** 2025
**Version:** 1.0.0
