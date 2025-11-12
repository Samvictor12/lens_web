# Quick Testing Guide for Lens Masters APIs

## Prerequisites

1. **Server Running**
   ```bash
   npm run dev
   ```

2. **JWT Token**
   - Login first to get a valid JWT token
   - Use token in Authorization header: `Bearer YOUR_TOKEN`

## Test Sequence (Recommended Order)

### Step 1: Test Simple Masters First

#### 1.1 Lens Categories
```bash
# Create
POST /api/v1/lens-categories
{
  "name": "Single Vision",
  "description": "Basic single vision lenses"
}

# Get All
GET /api/v1/lens-categories?page=1&limit=10

# Get Dropdown
GET /api/v1/lens-categories/dropdown

# Get Statistics
GET /api/v1/lens-categories/statistics
```

#### 1.2 Lens Materials
```bash
# Create
POST /api/v1/lens-materials
{
  "name": "CR39",
  "description": "Standard plastic lens material"
}

# Get All
GET /api/v1/lens-materials
```

#### 1.3 Lens Coatings
```bash
# Create
POST /api/v1/lens-coatings
{
  "name": "Anti-Reflective",
  "short_name": "AR",
  "description": "Reduces glare and reflections"
}

# Get All
GET /api/v1/lens-coatings
```

#### 1.4 Lens Brands
```bash
# Create
POST /api/v1/lens-brands
{
  "name": "Essilor",
  "description": "Leading lens manufacturer"
}

# Get All
GET /api/v1/lens-brands
```

#### 1.5 Lens Types
```bash
# Create
POST /api/v1/lens-types
{
  "name": "Progressive",
  "description": "Multi-focal lens type"
}

# Get All
GET /api/v1/lens-types
```

### Step 2: Test Lens Products (Complex)

```bash
# First, get IDs from dropdowns
GET /api/v1/lens-brands/dropdown
GET /api/v1/lens-categories/dropdown
GET /api/v1/lens-materials/dropdown
GET /api/v1/lens-types/dropdown

# Create Product (use actual IDs from above)
POST /api/v1/lens-products
{
  "brand_id": 1,
  "category_id": 1,
  "material_id": 1,
  "type_id": 1,
  "product_code": "ESS-SV-CR39-001",
  "lens_name": "Essilor Single Vision CR39",
  "sphere_from": -6.0,
  "sphere_to": 6.0,
  "cylinder_from": -2.0,
  "cylinder_to": 0.0,
  "range_text": "Standard range"
}

# Get All Products
GET /api/v1/lens-products

# Filter Products
GET /api/v1/lens-products?brand_id=1&category_id=1

# Search Products
GET /api/v1/lens-products?search=Essilor

# Get Products Dropdown (filtered)
GET /api/v1/lens-products/dropdown?brand_id=1

# Get Statistics
GET /api/v1/lens-products/statistics

# Get by Category
GET /api/v1/lens-products/by-category/1
```

### Step 3: Test Lens Prices (Complex)

```bash
# Get lens and coating IDs
GET /api/v1/lens-products/dropdown
GET /api/v1/lens-coatings/dropdown

# Create Price (use actual IDs)
POST /api/v1/lens-prices
{
  "lens_id": 1,
  "coating_id": 1,
  "price": 2999.99
}

# Get All Prices
GET /api/v1/lens-prices

# Filter by Price Range
GET /api/v1/lens-prices?minPrice=1000&maxPrice=5000

# Get Price for Lens-Coating Combination
GET /api/v1/lens-prices/by-lens-coating?lens_id=1&coating_id=1

# Get All Prices for a Lens
GET /api/v1/lens-prices/by-lens/1

# Get Statistics
GET /api/v1/lens-prices/statistics
```

## Sample Test Data

### Categories
```json
[
  {"name": "Single Vision", "description": "Basic single focal lenses"},
  {"name": "Progressive", "description": "Multi-focal lenses"},
  {"name": "Bifocal", "description": "Two focal point lenses"},
  {"name": "Reading", "description": "Near vision only"}
]
```

### Materials
```json
[
  {"name": "CR39", "description": "Standard plastic"},
  {"name": "Polycarbonate", "description": "Impact resistant"},
  {"name": "High Index 1.67", "description": "Thin lenses"},
  {"name": "Trivex", "description": "Lightweight and impact resistant"}
]
```

### Coatings
```json
[
  {"name": "Anti-Reflective", "short_name": "AR", "description": "Reduces glare"},
  {"name": "Blue Light Filter", "short_name": "BLF", "description": "Blocks blue light"},
  {"name": "Transitions", "short_name": "TRN", "description": "Photochromic"},
  {"name": "Scratch Resistant", "short_name": "SR", "description": "Hard coating"}
]
```

### Brands
```json
[
  {"name": "Essilor", "description": "French lens manufacturer"},
  {"name": "Zeiss", "description": "German optics company"},
  {"name": "Hoya", "description": "Japanese optical company"},
  {"name": "Nikon", "description": "Japanese lens manufacturer"}
]
```

### Types
```json
[
  {"name": "Single Vision", "description": "One prescription throughout"},
  {"name": "Progressive", "description": "Gradual change in prescription"},
  {"name": "Bifocal", "description": "Two distinct prescriptions"},
  {"name": "Trifocal", "description": "Three distinct prescriptions"}
]
```

## Validation Testing

### Test Invalid Data

```bash
# Missing required field
POST /api/v1/lens-categories
{
  "description": "Test"
}
# Expected: 400 error - name is required

# Name too long (>200 chars)
POST /api/v1/lens-categories
{
  "name": "A".repeat(201)
}
# Expected: 400 error - name too long

# Invalid coating (missing short_name)
POST /api/v1/lens-coatings
{
  "name": "Test Coating"
}
# Expected: 400 error - short_name is required

# Invalid product (missing foreign keys)
POST /api/v1/lens-products
{
  "product_code": "TEST-001",
  "lens_name": "Test Lens"
}
# Expected: 400 error - foreign keys required

# Negative price
POST /api/v1/lens-prices
{
  "lens_id": 1,
  "coating_id": 1,
  "price": -100
}
# Expected: 400 error - price must be positive
```

## Update Testing

```bash
# Update Category
PUT /api/v1/lens-categories/1
{
  "name": "Single Vision Updated",
  "description": "Updated description"
}

# Update Product
PUT /api/v1/lens-products/1
{
  "lens_name": "Updated Lens Name"
}

# Update Price
PUT /api/v1/lens-prices/1
{
  "price": 3499.99
}
```

## Delete Testing (Soft Delete)

```bash
# Delete Category
DELETE /api/v1/lens-categories/1
# Check: deleteStatus should be true, activeStatus should be false

# Delete Product
DELETE /api/v1/lens-products/1

# Verify soft delete
GET /api/v1/lens-categories/1
# Should still return the record but with deleteStatus: true
```

## Relationship Testing

```bash
# Create Product with non-existent brand
POST /api/v1/lens-products
{
  "brand_id": 999999,
  "category_id": 1,
  "material_id": 1,
  "type_id": 1,
  "product_code": "TEST",
  "lens_name": "Test"
}
# Expected: 404 error - Brand not found

# Create Price with non-existent lens
POST /api/v1/lens-prices
{
  "lens_id": 999999,
  "coating_id": 1,
  "price": 100
}
# Expected: 404 error - Lens not found

# Duplicate lens-coating combination
POST /api/v1/lens-prices
{
  "lens_id": 1,
  "coating_id": 1,
  "price": 100
}
# Then try again with same IDs
# Expected: 409 error - Combination already exists
```

## Pagination Testing

```bash
# Page 1
GET /api/v1/lens-categories?page=1&limit=5

# Page 2
GET /api/v1/lens-categories?page=2&limit=5

# Large limit
GET /api/v1/lens-categories?limit=100

# Invalid page
GET /api/v1/lens-categories?page=0
# Expected: 400 error

# Invalid limit
GET /api/v1/lens-categories?limit=101
# Expected: 400 error
```

## Authentication Testing

```bash
# No token
GET /api/v1/lens-categories
# Expected: 401 Unauthorized

# Invalid token
GET /api/v1/lens-categories
Authorization: Bearer invalid_token
# Expected: 401 Unauthorized

# Expired token
GET /api/v1/lens-categories
Authorization: Bearer expired_token
# Expected: 401 Unauthorized
```

## Using Swagger UI

1. Navigate to `http://localhost:5000/api-docs`
2. Click "Authorize" button
3. Enter JWT token: `Bearer YOUR_TOKEN`
4. Test endpoints interactively

## Using Postman

### Setup Environment Variables
```
BASE_URL: http://localhost:5000
JWT_TOKEN: your_actual_jwt_token
```

### Collection Structure
```
Lens Masters APIs
├── Authentication
│   └── Login
├── Lens Categories
│   ├── Create
│   ├── Get All
│   ├── Get By ID
│   ├── Update
│   ├── Delete
│   ├── Dropdown
│   └── Statistics
├── Lens Materials
│   └── (same as above)
├── ... (repeat for all masters)
```

## Automated Testing Script

```javascript
// test-lens-apis.js
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
let token = '';

async function login() {
  const response = await axios.post(`${BASE_URL}/api/auth/login`, {
    email: 'admin@example.com',
    password: 'password'
  });
  token = response.data.token;
}

async function testCategories() {
  // Create
  const created = await axios.post(
    `${BASE_URL}/api/v1/lens-categories`,
    { name: 'Test Category', description: 'Test' },
    { headers: { Authorization: `Bearer ${token}` }}
  );
  console.log('✅ Category created:', created.data.data.id);
  
  // Get All
  const all = await axios.get(
    `${BASE_URL}/api/v1/lens-categories`,
    { headers: { Authorization: `Bearer ${token}` }}
  );
  console.log('✅ Categories retrieved:', all.data.data.length);
  
  return created.data.data.id;
}

// Run tests
(async () => {
  await login();
  await testCategories();
  // Add more tests...
})();
```

## Expected Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { /* result data */ }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    {
      "field": "fieldName",
      "message": "Specific error"
    }
  ]
}
```

### List Response
```json
{
  "success": true,
  "message": "Items retrieved successfully",
  "data": [ /* array of items */ ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 50,
    "itemsPerPage": 10
  }
}
```

## Troubleshooting

### Server not starting
- Check if port 5000 is available
- Verify DATABASE_URL in .env
- Check for syntax errors

### 401 Unauthorized
- Verify JWT token is valid
- Check token expiration
- Ensure Authorization header format: `Bearer TOKEN`

### 404 Not Found
- Verify endpoint URL
- Check if routes are registered in server.js
- Ensure ID exists in database

### Validation errors
- Check required fields
- Verify field lengths
- Check data types

## Success Checklist

- [ ] All 7 master APIs created successfully
- [ ] Can create records in all masters
- [ ] Can retrieve records with pagination
- [ ] Dropdowns return data correctly
- [ ] Statistics endpoints work
- [ ] Validation catches invalid data
- [ ] Soft delete works correctly
- [ ] Products validate foreign keys
- [ ] Prices enforce unique combinations
- [ ] Filters work on products and prices
- [ ] Authentication works on all endpoints
- [ ] Swagger documentation displays correctly

---

Happy Testing! 🚀
