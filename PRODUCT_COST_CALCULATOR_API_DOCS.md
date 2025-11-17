# Product Cost Calculator API Documentation

## Overview
This API endpoint calculates the cost of a lens product for a specific customer, automatically applying any price mappings/discounts that exist. It returns both the cost with and without discount, making it perfect for displaying pricing information in order forms or quotes.

## Endpoint

### Calculate Product Cost
**POST** `/api/v1/lens-products/calculate-cost`

Calculates the cost of a product based on customer ID and lens price master ID, with automatic discount application via price mappings.

---

## Request

### Authentication
Requires Bearer token authentication.

```
Authorization: Bearer <your-jwt-token>
```

### Request Body

```json
{
  "customer_id": 1,
  "lensPrice_id": 5,
  "quantity": 2
}
```

#### Parameters

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `customer_id` | integer | **Yes** | - | Customer ID to check for price mappings |
| `lensPrice_id` | integer | **Yes** | - | Lens Price Master ID (lens + coating combination) |
| `quantity` | integer | No | 1 | Quantity of products (minimum: 1) |

---

## Response

### Success Response (200 OK)

#### With Price Mapping (Discount Applied)
```json
{
  "success": true,
  "message": "Product cost calculated successfully",
  "data": {
    "customer": {
      "id": 1,
      "code": "CUST-001",
      "name": "John's Optical Store",
      "shopname": "Vision Center"
    },
    "product": {
      "id": 3,
      "product_code": "LP-001",
      "lens_name": "Progressive Lens 1.56 Index",
      "brand": {
        "id": 1,
        "name": "Essilor"
      },
      "category": {
        "id": 2,
        "name": "Progressive"
      }
    },
    "coating": {
      "id": 1,
      "name": "Anti-Reflection",
      "short_name": "AR"
    },
    "pricing": {
      "lensPrice_id": 5,
      "basePrice": 2500.00,
      "quantity": 2,
      "hasPriceMapping": true,
      "discountRate": 10,
      "discountAmount": 500.00,
      "costWithoutDiscount": 5000.00,
      "costWithDiscount": 4500.00,
      "finalCost": 4500.00,
      "savings": 500.00
    }
  }
}
```

#### Without Price Mapping (No Discount)
```json
{
  "success": true,
  "message": "Product cost calculated successfully",
  "data": {
    "customer": {
      "id": 2,
      "code": "CUST-002",
      "name": "Optical World",
      "shopname": null
    },
    "product": {
      "id": 3,
      "product_code": "LP-001",
      "lens_name": "Progressive Lens 1.56 Index",
      "brand": {
        "id": 1,
        "name": "Essilor"
      },
      "category": {
        "id": 2,
        "name": "Progressive"
      }
    },
    "coating": {
      "id": 1,
      "name": "Anti-Reflection",
      "short_name": "AR"
    },
    "pricing": {
      "lensPrice_id": 5,
      "basePrice": 2500.00,
      "quantity": 2,
      "hasPriceMapping": false,
      "discountRate": 0,
      "discountAmount": 0,
      "costWithoutDiscount": 5000.00,
      "costWithDiscount": 5000.00,
      "finalCost": 5000.00,
      "savings": 0
    }
  }
}
```

### Response Structure

#### Customer Object
- `id` (integer): Customer unique identifier
- `code` (string): Customer code
- `name` (string): Customer name
- `shopname` (string|null): Shop name

#### Product Object
- `id` (integer): Product ID
- `product_code` (string): Product SKU/code
- `lens_name` (string): Product name
- `brand` (object): Brand information (id, name)
- `category` (object): Category information (id, name)

#### Coating Object
- `id` (integer): Coating ID
- `name` (string): Coating full name
- `short_name` (string): Coating abbreviation

#### Pricing Object
- `lensPrice_id` (integer): The price master ID used
- `basePrice` (number): Base price per unit from price master
- `quantity` (integer): Quantity requested
- `hasPriceMapping` (boolean): Whether a price mapping exists for this customer
- `discountRate` (number): Discount percentage (0 if no mapping)
- `discountAmount` (number): Total discount amount in currency
- `costWithoutDiscount` (number): Total cost without any discount
- `costWithDiscount` (number): Total cost after discount (if mapping exists)
- `finalCost` (number): Final cost to charge (same as costWithDiscount)
- `savings` (number): Total amount saved (same as discountAmount)

---

## Error Responses

### 400 Bad Request - Missing Customer ID
```json
{
  "success": false,
  "message": "Customer ID is required",
  "errors": [
    {
      "field": "customer_id",
      "message": "Customer ID is required"
    }
  ]
}
```

### 400 Bad Request - Missing Lens Price ID
```json
{
  "success": false,
  "message": "Lens Price ID is required",
  "errors": [
    {
      "field": "lensPrice_id",
      "message": "Lens Price ID is required"
    }
  ]
}
```

### 400 Bad Request - Invalid Quantity
```json
{
  "success": false,
  "message": "Quantity must be a positive number",
  "errors": [
    {
      "field": "quantity",
      "message": "Quantity must be at least 1"
    }
  ]
}
```

### 404 Not Found - Customer
```json
{
  "success": false,
  "message": "Customer not found",
  "code": "CUSTOMER_NOT_FOUND"
}
```

### 404 Not Found - Lens Price
```json
{
  "success": false,
  "message": "Lens price not found",
  "code": "LENS_PRICE_NOT_FOUND"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized",
  "code": "UNAUTHORIZED"
}
```

---

## Example Requests

### Basic Request (Quantity 1)
```bash
curl -X POST "http://localhost:3001/api/v1/lens-products/calculate-cost" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "lensPrice_id": 5
  }'
```

### Request with Quantity
```bash
curl -X POST "http://localhost:3001/api/v1/lens-products/calculate-cost" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "lensPrice_id": 5,
    "quantity": 2
  }'
```

---

## JavaScript/TypeScript Examples

### Using Fetch API
```javascript
const calculateCost = async (customerId, lensPriceId, quantity = 1) => {
  const response = await fetch(
    'http://localhost:3001/api/v1/lens-products/calculate-cost',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${YOUR_JWT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customer_id: customerId,
        lensPrice_id: lensPriceId,
        quantity: quantity
      })
    }
  );
  
  const result = await response.json();
  return result.data;
};

// Usage
const costInfo = await calculateCost(1, 5, 2);
console.log(`Final Cost: ₹${costInfo.pricing.finalCost}`);
console.log(`Savings: ₹${costInfo.pricing.savings}`);
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

const calculateCost = async (customerId, lensPriceId, quantity = 1) => {
  try {
    const response = await api.post('/lens-products/calculate-cost', {
      customer_id: customerId,
      lensPrice_id: lensPriceId,
      quantity: quantity
    });
    return response.data.data;
  } catch (error) {
    console.error('Error calculating cost:', error.response?.data);
    throw error;
  }
};

// Usage
const costInfo = await calculateCost(1, 5, 2);
console.log('Customer:', costInfo.customer.name);
console.log('Product:', costInfo.product.lens_name);
console.log('Coating:', costInfo.coating.name);
console.log(`Base Price: ₹${costInfo.pricing.basePrice}`);
console.log(`Quantity: ${costInfo.pricing.quantity}`);

if (costInfo.pricing.hasPriceMapping) {
  console.log(`Discount: ${costInfo.pricing.discountRate}%`);
  console.log(`Original: ₹${costInfo.pricing.costWithoutDiscount}`);
  console.log(`Discounted: ₹${costInfo.pricing.finalCost}`);
  console.log(`You Save: ₹${costInfo.pricing.savings}`);
} else {
  console.log(`Total: ₹${costInfo.pricing.finalCost}`);
  console.log('No discount available for this customer');
}
```

---

## Use Cases

### 1. Sale Order Form - Cost Display
Display pricing information when creating a sale order:

```javascript
const displayCostBreakdown = async (customerId, lensPriceId, quantity) => {
  const result = await calculateCost(customerId, lensPriceId, quantity);
  const { pricing, product, coating } = result;
  
  return {
    productName: `${product.lens_name} - ${coating.name}`,
    basePrice: pricing.basePrice,
    quantity: pricing.quantity,
    subtotal: pricing.costWithoutDiscount,
    discount: pricing.hasPriceMapping ? `${pricing.discountRate}%` : 'None',
    discountAmount: pricing.discountAmount,
    total: pricing.finalCost
  };
};
```

### 2. Quote Generation
Generate price quotes for customers:

```javascript
const generateQuote = async (customerId, items) => {
  const quotes = [];
  let grandTotal = 0;
  let totalSavings = 0;
  
  for (const item of items) {
    const cost = await calculateCost(
      customerId, 
      item.lensPriceId, 
      item.quantity
    );
    
    quotes.push({
      product: cost.product.lens_name,
      coating: cost.coating.name,
      qty: cost.pricing.quantity,
      unitPrice: cost.pricing.basePrice,
      subtotal: cost.pricing.costWithoutDiscount,
      discount: cost.pricing.discountAmount,
      total: cost.pricing.finalCost
    });
    
    grandTotal += cost.pricing.finalCost;
    totalSavings += cost.pricing.savings;
  }
  
  return { quotes, grandTotal, totalSavings };
};
```

### 3. Real-time Price Display
Show pricing as user selects products:

```javascript
// React component example
const PriceDisplay = ({ customerId, lensPriceId, quantity }) => {
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (customerId && lensPriceId) {
      setLoading(true);
      calculateCost(customerId, lensPriceId, quantity)
        .then(result => {
          setPricing(result.pricing);
          setLoading(false);
        })
        .catch(error => {
          console.error('Error:', error);
          setLoading(false);
        });
    }
  }, [customerId, lensPriceId, quantity]);
  
  if (loading) return <div>Calculating...</div>;
  if (!pricing) return null;
  
  return (
    <div className="price-breakdown">
      <div>Base Price: ₹{pricing.basePrice}</div>
      <div>Quantity: {pricing.quantity}</div>
      <div>Subtotal: ₹{pricing.costWithoutDiscount}</div>
      
      {pricing.hasPriceMapping && (
        <>
          <div className="discount">
            Discount ({pricing.discountRate}%): -₹{pricing.discountAmount}
          </div>
          <div className="savings">You Save: ₹{pricing.savings}</div>
        </>
      )}
      
      <div className="total">
        <strong>Final Cost: ₹{pricing.finalCost}</strong>
      </div>
    </div>
  );
};
```

### 4. Batch Price Checking
Check prices for multiple products:

```javascript
const checkMultiplePrices = async (customerId, lensPriceIds) => {
  const prices = await Promise.all(
    lensPriceIds.map(id => calculateCost(customerId, id, 1))
  );
  
  return prices.map(p => ({
    product: p.product.lens_name,
    coating: p.coating.name,
    price: p.pricing.finalCost,
    hasDiscount: p.pricing.hasPriceMapping,
    savings: p.pricing.savings
  }));
};
```

---

## Integration with Sale Order Form

### Displaying Cost in Last Section
```javascript
// In your sale order form
const [costDetails, setCostDetails] = useState(null);

// When customer and lens price are selected
const updateCostCalculation = async () => {
  if (formData.customerId && formData.lensPriceId) {
    try {
      const result = await calculateCost(
        formData.customerId,
        formData.lensPriceId,
        formData.quantity || 1
      );
      setCostDetails(result);
    } catch (error) {
      console.error('Failed to calculate cost:', error);
      setCostDetails(null);
    }
  }
};

// Render in last section
{costDetails && (
  <div className="cost-section">
    <h3>Cost Summary</h3>
    
    <div className="cost-row">
      <span>Product:</span>
      <span>{costDetails.product.lens_name}</span>
    </div>
    
    <div className="cost-row">
      <span>Coating:</span>
      <span>{costDetails.coating.name}</span>
    </div>
    
    <div className="cost-row">
      <span>Base Price:</span>
      <span>₹{costDetails.pricing.basePrice}</span>
    </div>
    
    <div className="cost-row">
      <span>Quantity:</span>
      <span>{costDetails.pricing.quantity}</span>
    </div>
    
    <div className="cost-row">
      <span>Subtotal:</span>
      <span>₹{costDetails.pricing.costWithoutDiscount}</span>
    </div>
    
    {costDetails.pricing.hasPriceMapping && (
      <>
        <div className="cost-row discount">
          <span>Discount ({costDetails.pricing.discountRate}%):</span>
          <span>-₹{costDetails.pricing.discountAmount}</span>
        </div>
        
        <div className="cost-row savings">
          <span>Total Savings:</span>
          <span>₹{costDetails.pricing.savings}</span>
        </div>
      </>
    )}
    
    <div className="cost-row total">
      <strong>Final Cost:</strong>
      <strong>₹{costDetails.pricing.finalCost}</strong>
    </div>
    
    {!costDetails.pricing.hasPriceMapping && (
      <div className="info-message">
        No special pricing available for this customer
      </div>
    )}
  </div>
)}
```

---

## Notes

- The API automatically checks for price mappings based on customer ID and lens price ID
- If no price mapping exists, the cost with and without discount will be the same
- The `hasPriceMapping` flag helps UI determine whether to show discount information
- All monetary values are in the base currency (no currency conversion)
- Quantity must be at least 1; default is 1 if not provided
- The calculation uses the `discountPrice` from price mapping if available
- Only active customers and lens prices are considered (soft delete respected)

---

## Related Endpoints

- **GET** `/api/v1/lens-products/with-prices` - Get all products with prices
- **GET** `/api/v1/lens-products/:lensId/prices` - Get all prices for a product
- **GET** `/api/price-mappings/customer/:customer_id` - Get customer's price mappings
- **POST** `/api/price-mappings/bulk` - Create price mappings for a customer

---

## Changelog

### Version 1.0 (November 15, 2025)
- Initial release of product cost calculator endpoint
- Automatic discount application via price mappings
- Support for quantity-based calculations
- Returns both discounted and non-discounted prices
