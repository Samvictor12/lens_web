# Products with Prices API Documentation

## Overview
This API endpoint provides a convenient way to fetch all lens products along with their associated price master data in a single request. This is particularly useful for displaying product catalogs with pricing information.

## Endpoint

### Get Products with Prices
**GET** `/api/v1/lens-products/with-prices`

Retrieves a paginated list of lens products with their associated price master entries.

---

## Request

### Authentication
Requires Bearer token authentication.

```
Authorization: Bearer <your-jwt-token>
```

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Page number for pagination |
| `limit` | integer | No | 10 | Number of items per page |
| `brand_id` | integer | No | - | Filter products by brand ID |
| `category_id` | integer | No | - | Filter products by category ID |
| `material_id` | integer | No | - | Filter products by material ID |
| `type_id` | integer | No | - | Filter products by type ID |
| `search` | string | No | - | Search in product name, code, or range text |
| `activeStatus` | string | No | - | Filter by status: `active`, `inactive`, or `all` |
| `sortBy` | string | No | `createdAt` | Field to sort by |
| `sortOrder` | string | No | `desc` | Sort order: `asc` or `desc` |

---

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Products with prices retrieved successfully",
  "data": [
    {
      "id": 1,
      "product_code": "LP-001",
      "lens_name": "Progressive Lens 1.56 Index",
      "brand": {
        "id": 1,
        "name": "Essilor"
      },
      "prices": [
        {
          "id": 1,
          "price": 2500.00,
          "coating": {
            "id": 1,
            "name": "Anti-Reflection",
            "short_name": "AR"
          },
          "createdAt": "2025-11-14T10:00:00.000Z",
          "updatedAt": "2025-11-14T10:00:00.000Z"
        },
        {
          "id": 2,
          "price": 3200.00,
          "coating": {
            "id": 2,
            "name": "Blue Light Protection",
            "short_name": "BLP"
          },
          "createdAt": "2025-11-14T10:05:00.000Z",
          "updatedAt": "2025-11-14T10:05:00.000Z"
        }
      ]
    },
    {
      "id": 2,
      "product_code": "LP-002",
      "lens_name": "Single Vision Lens 1.50 Index",
      "brand": {
        "id": 2,
        "name": "Zeiss"
      },
      "prices": [
        {
          "id": 3,
          "price": 1800.00,
          "coating": {
            "id": 1,
            "name": "Anti-Reflection",
            "short_name": "AR"
          },
          "createdAt": "2025-11-14T11:00:00.000Z",
          "updatedAt": "2025-11-14T11:00:00.000Z"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "pages": 5
  }
}
```

### Response Structure

#### Product Object
- `id` (integer): Product unique identifier
- `product_code` (string): Product code/SKU
- `lens_name` (string): Product name/description
- `brand` (object): Brand information
  - `id` (integer): Brand ID
  - `name` (string): Brand name
- `prices` (array): Array of price master entries for this product

#### Price Object
- `id` (integer): Price master entry ID
- `price` (number): Price value
- `coating` (object): Coating information
  - `id` (integer): Coating ID
  - `name` (string): Coating full name
  - `short_name` (string): Coating abbreviation
- `createdAt` (datetime): Creation timestamp
- `updatedAt` (datetime): Last update timestamp

#### Pagination Object
- `page` (integer): Current page number
- `limit` (integer): Items per page
- `total` (integer): Total number of products
- `pages` (integer): Total number of pages

---

## Example Requests

### Basic Request
```bash
curl -X GET "http://localhost:3001/api/v1/lens-products/with-prices" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### With Pagination
```bash
curl -X GET "http://localhost:3001/api/v1/lens-products/with-prices?page=2&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Filter by Brand
```bash
curl -X GET "http://localhost:3001/api/v1/lens-products/with-prices?brand_id=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Filter by Multiple Parameters
```bash
curl -X GET "http://localhost:3001/api/v1/lens-products/with-prices?brand_id=1&category_id=2&activeStatus=active&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Search Products
```bash
curl -X GET "http://localhost:3001/api/v1/lens-products/with-prices?search=progressive" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Combined Filters
```bash
curl -X GET "http://localhost:3001/api/v1/lens-products/with-prices?brand_id=1&category_id=2&search=progressive&activeStatus=active&page=1&limit=50" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## JavaScript/TypeScript Example

### Using Fetch API
```javascript
const getProductsWithPrices = async (filters = {}) => {
  const queryParams = new URLSearchParams(filters).toString();
  const url = `http://localhost:3001/api/v1/lens-products/with-prices?${queryParams}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${YOUR_JWT_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
  
  const result = await response.json();
  return result;
};

// Usage examples
const products = await getProductsWithPrices({ page: 1, limit: 20 });
const filteredProducts = await getProductsWithPrices({ 
  brand_id: 1, 
  category_id: 2,
  activeStatus: 'active' 
});
```

### Using Axios
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api/v1',
  headers: {
    'Authorization': `Bearer ${YOUR_JWT_TOKEN}`
  }
});

// Get products with prices
const getProductsWithPrices = async (params = {}) => {
  try {
    const response = await api.get('/lens-products/with-prices', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};

// Usage
const products = await getProductsWithPrices({ 
  page: 1, 
  limit: 20,
  brand_id: 1 
});

console.log(`Total products: ${products.pagination.total}`);
products.data.forEach(product => {
  console.log(`${product.lens_name} - ${product.brand.name}`);
  console.log(`Prices: ${product.prices.length}`);
  product.prices.forEach(price => {
    console.log(`  - ${price.coating.name}: ₹${price.price}`);
  });
});
```

---

## Error Responses

### 400 Bad Request
Invalid query parameters

```json
{
  "success": false,
  "message": "Invalid query parameters",
  "errors": [
    {
      "field": "page",
      "message": "Page must be a positive integer"
    }
  ]
}
```

### 401 Unauthorized
Missing or invalid authentication token

```json
{
  "success": false,
  "message": "Unauthorized",
  "code": "UNAUTHORIZED"
}
```

### 500 Internal Server Error
Server error occurred

```json
{
  "success": false,
  "message": "Failed to fetch products with prices",
  "code": "FETCH_PRODUCTS_WITH_PRICES_ERROR"
}
```

---

## Use Cases

### 1. Product Catalog Display
Display all products with their available coatings and prices on a catalog page.

```javascript
const displayCatalog = async () => {
  const result = await getProductsWithPrices({ 
    activeStatus: 'active',
    limit: 50 
  });
  
  result.data.forEach(product => {
    console.log(`${product.lens_name} (${product.product_code})`);
    console.log(`Brand: ${product.brand.name}`);
    console.log('Available prices:');
    product.prices.forEach(price => {
      console.log(`  ${price.coating.short_name}: ₹${price.price}`);
    });
  });
};
```

### 2. Price Comparison
Compare prices across different coatings for each product.

```javascript
const comparePrices = async (brandId) => {
  const result = await getProductsWithPrices({ 
    brand_id: brandId,
    activeStatus: 'active' 
  });
  
  result.data.forEach(product => {
    const prices = product.prices.map(p => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    console.log(`${product.lens_name}`);
    console.log(`Price range: ₹${minPrice} - ₹${maxPrice}`);
  });
};
```

### 3. Search and Filter
Search for specific products and filter by criteria.

```javascript
const searchProducts = async (searchTerm, filters) => {
  const result = await getProductsWithPrices({ 
    search: searchTerm,
    ...filters,
    activeStatus: 'active'
  });
  
  console.log(`Found ${result.pagination.total} products matching "${searchTerm}"`);
  return result.data;
};

// Usage
const progressiveLenses = await searchProducts('progressive', { 
  brand_id: 1,
  category_id: 2 
});
```

### 4. Export Product Price List
Generate a complete price list for inventory or reporting.

```javascript
const exportPriceList = async () => {
  const allProducts = [];
  let page = 1;
  const limit = 100;
  
  while (true) {
    const result = await getProductsWithPrices({ page, limit });
    allProducts.push(...result.data);
    
    if (page >= result.pagination.pages) break;
    page++;
  }
  
  // Generate CSV or Excel
  const priceList = allProducts.flatMap(product => 
    product.prices.map(price => ({
      productCode: product.product_code,
      lensName: product.lens_name,
      brand: product.brand.name,
      coating: price.coating.name,
      price: price.price
    }))
  );
  
  return priceList;
};
```

---

## Notes

- Only active price master entries are returned (where `deleteStatus = false` and `activeStatus = true`)
- Prices are ordered by coating name alphabetically
- Products without prices will have an empty `prices` array
- All prices are returned in the base currency (no currency conversion)
- The endpoint respects soft delete flags - deleted products won't appear in results

---

## Related Endpoints

- **GET** `/api/v1/lens-products` - Get all products (without prices)
- **GET** `/api/v1/lens-products/:id` - Get single product with full details
- **GET** `/api/v1/lens-products/:lensId/prices` - Get all prices for a specific product
- **POST** `/api/v1/lens-products/:lensId/prices/bulk` - Bulk add/update prices for a product

---

## Performance Considerations

- Use pagination to limit the amount of data returned per request
- The `limit` parameter can go up to 100 items per page
- For large datasets, consider caching the results on the client side
- Use specific filters to reduce the dataset size when possible

---

## Changelog

### Version 1.0 (November 15, 2025)
- Initial release of the products with prices endpoint
- Support for pagination, filtering, and search
- Returns product code, lens name, brand, and nested price master data
