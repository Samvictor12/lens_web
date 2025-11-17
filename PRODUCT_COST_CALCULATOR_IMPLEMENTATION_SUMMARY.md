# Product Cost Calculator - Implementation Summary

## Date: November 15, 2025

## Overview
Implemented a new cost calculation API that automatically calculates product costs for specific customers, applying any available price mappings/discounts. This feature is designed for use in sale order forms to display pricing information with and without discounts.

---

## Changes Made

### 1. Service Layer (`src/backend/services/lensProductMasterService.js`)

#### New Method: `calculateProductCost(params)`
Added comprehensive cost calculation functionality with the following features:

**Parameters:**
- `customer_id` (required): Customer ID for price mapping lookup
- `lensPrice_id` (required): Lens Price Master ID (lens + coating combination)
- `quantity` (optional, default: 1): Product quantity

**Functionality:**
1. Validates customer existence
2. Fetches lens price master with product and coating details
3. Checks for existing price mapping for the customer
4. Calculates costs with and without discount
5. Returns comprehensive pricing breakdown

**Key Calculations:**
```javascript
basePrice = lensPrice.price
costWithoutDiscount = basePrice × quantity
costWithDiscount = discountPrice × quantity (if mapping exists)
discountAmount = costWithoutDiscount - costWithDiscount
```

**Export Added:**
```javascript
export const calculateProductCost =
  serviceInstance.calculateProductCost.bind(serviceInstance);
```

---

### 2. Controller Layer (`src/backend/controllers/lensProductMasterController.js`)

#### New Controller: `calculateProductCost()`
Handles HTTP requests for cost calculation:

**Features:**
- Validates required fields (customer_id, lensPrice_id)
- Validates quantity (must be positive integer >= 1)
- Detailed error responses for validation failures
- Consistent JSON response format

**Validation:**
- Customer ID: Required, must be valid integer
- Lens Price ID: Required, must be valid integer
- Quantity: Optional, must be positive integer >= 1 if provided

---

### 3. Routes (`src/backend/routes/lensProducts.routes.js`)

#### New Route: `POST /api/v1/lens-products/calculate-cost`
Added route with full Swagger documentation:

**Route Details:**
- Path: `/calculate-cost`
- Method: POST
- Authentication: Required (Bearer token)
- Content-Type: application/json

**Swagger Documentation Includes:**
- Complete request/response schemas
- Example requests and responses
- All possible error codes
- Detailed parameter descriptions

---

## API Endpoint Details

### Endpoint
```
POST /api/v1/lens-products/calculate-cost
```

### Request Body
```json
{
  "customer_id": 1,
  "lensPrice_id": 5,
  "quantity": 2
}
```

### Response Structure
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
      "brand": { "id": 1, "name": "Essilor" },
      "category": { "id": 2, "name": "Progressive" }
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

---

## Response Fields Explanation

### Customer Information
- `id`: Customer unique identifier
- `code`: Customer code/reference
- `name`: Customer name
- `shopname`: Shop name (nullable)

### Product Information
- `id`: Product ID
- `product_code`: Product SKU/code
- `lens_name`: Full product name
- `brand`: Brand details (id, name)
- `category`: Category details (id, name)

### Coating Information
- `id`: Coating ID
- `name`: Full coating name
- `short_name`: Coating abbreviation

### Pricing Information (Key Fields)
- `lensPrice_id`: The price master ID used for calculation
- `basePrice`: Price per unit from price master
- `quantity`: Quantity requested
- `hasPriceMapping`: **Boolean** - Whether discount exists for this customer
- `discountRate`: Percentage discount (0 if no mapping)
- `discountAmount`: Total discount in currency
- `costWithoutDiscount`: Total without any discount
- `costWithDiscount`: Total after discount applied
- `finalCost`: Final amount to charge (= costWithDiscount)
- `savings`: Total amount saved (= discountAmount)

---

## Pricing Logic

### When Price Mapping Exists:
1. Fetch base price from LensPriceMaster
2. Fetch price mapping for customer + lens price combination
3. Calculate:
   - `costWithoutDiscount = basePrice × quantity`
   - `costWithDiscount = discountPrice × quantity`
   - `discountAmount = costWithoutDiscount - costWithDiscount`
   - `savings = discountAmount`
4. Set `hasPriceMapping = true`

### When No Price Mapping Exists:
1. Fetch base price from LensPriceMaster
2. Calculate:
   - `costWithoutDiscount = basePrice × quantity`
   - `costWithDiscount = basePrice × quantity`
   - `discountAmount = 0`
   - `savings = 0`
3. Set `hasPriceMapping = false`
4. Apply discount rate of 0%

---

## Use Cases

### 1. Sale Order Form - Last Section Display
Display cost breakdown in the final section of sale order form:

```javascript
// Automatically calculate when customer and product are selected
useEffect(() => {
  if (customerId && lensPriceId) {
    calculateCost(customerId, lensPriceId, quantity)
      .then(result => {
        // Display in last section
        setCostDetails(result);
      });
  }
}, [customerId, lensPriceId, quantity]);
```

### 2. Real-time Price Updates
Update pricing as user changes quantity or selects different products:

```javascript
const handleQuantityChange = async (newQuantity) => {
  setQuantity(newQuantity);
  const result = await calculateCost(customerId, lensPriceId, newQuantity);
  updatePricing(result.pricing);
};
```

### 3. Quote Generation
Generate customer quotes with accurate pricing:

```javascript
const generateQuote = async (customerId, items) => {
  const lineItems = await Promise.all(
    items.map(item => 
      calculateCost(customerId, item.lensPriceId, item.quantity)
    )
  );
  return formatQuote(lineItems);
};
```

### 4. Price Comparison
Show customers how much they save with price mappings:

```javascript
if (pricing.hasPriceMapping) {
  console.log(`Original Price: ₹${pricing.costWithoutDiscount}`);
  console.log(`Your Price: ₹${pricing.finalCost}`);
  console.log(`You Save: ₹${pricing.savings} (${pricing.discountRate}%)`);
}
```

---

## Integration Example (React)

### Sale Order Form - Cost Section Component
```jsx
const CostSection = ({ customerId, lensPriceId, quantity = 1 }) => {
  const [costData, setCostData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (!customerId || !lensPriceId) {
      setCostData(null);
      return;
    }
    
    setLoading(true);
    fetch('/api/v1/lens-products/calculate-cost', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ customer_id: customerId, lensPrice_id: lensPriceId, quantity })
    })
    .then(res => res.json())
    .then(result => {
      setCostData(result.data);
      setLoading(false);
    })
    .catch(error => {
      console.error('Cost calculation failed:', error);
      setLoading(false);
    });
  }, [customerId, lensPriceId, quantity]);
  
  if (loading) return <div>Calculating cost...</div>;
  if (!costData) return <div>Select customer and product to see pricing</div>;
  
  const { product, coating, pricing } = costData;
  
  return (
    <div className="cost-breakdown-section">
      <h3>Cost Summary</h3>
      
      <div className="product-info">
        <p><strong>Product:</strong> {product.lens_name}</p>
        <p><strong>Brand:</strong> {product.brand.name}</p>
        <p><strong>Coating:</strong> {coating.name}</p>
      </div>
      
      <div className="pricing-details">
        <div className="price-row">
          <span>Base Price:</span>
          <span>₹{pricing.basePrice.toFixed(2)}</span>
        </div>
        
        <div className="price-row">
          <span>Quantity:</span>
          <span>{pricing.quantity}</span>
        </div>
        
        <div className="price-row">
          <span>Subtotal:</span>
          <span>₹{pricing.costWithoutDiscount.toFixed(2)}</span>
        </div>
        
        {pricing.hasPriceMapping && (
          <>
            <div className="price-row discount">
              <span>Discount ({pricing.discountRate}%):</span>
              <span className="savings">-₹{pricing.discountAmount.toFixed(2)}</span>
            </div>
            
            <div className="savings-badge">
              You Save: ₹{pricing.savings.toFixed(2)}
            </div>
          </>
        )}
        
        <div className="price-row total">
          <strong>Final Cost:</strong>
          <strong>₹{pricing.finalCost.toFixed(2)}</strong>
        </div>
        
        {!pricing.hasPriceMapping && (
          <div className="info-note">
            Standard pricing applied. No special discount for this customer.
          </div>
        )}
      </div>
    </div>
  );
};
```

---

## Error Handling

### Common Error Scenarios

1. **Missing Customer ID**
   - Status: 400
   - Message: "Customer ID is required"

2. **Missing Lens Price ID**
   - Status: 400
   - Message: "Lens Price ID is required"

3. **Invalid Quantity**
   - Status: 400
   - Message: "Quantity must be a positive number"

4. **Customer Not Found**
   - Status: 404
   - Code: "CUSTOMER_NOT_FOUND"

5. **Lens Price Not Found**
   - Status: 404
   - Code: "LENS_PRICE_NOT_FOUND"

6. **Unauthorized Access**
   - Status: 401
   - Code: "UNAUTHORIZED"

---

## Benefits

1. **Automatic Discount Application**: No manual calculation needed
2. **Transparent Pricing**: Shows both discounted and non-discounted prices
3. **Customer-Specific**: Respects price mappings per customer
4. **Quantity Support**: Calculates total cost for multiple units
5. **Complete Information**: Returns product, coating, and customer details
6. **UI-Friendly**: `hasPriceMapping` flag helps conditional rendering
7. **Error Handling**: Comprehensive validation and error responses

---

## Files Modified

1. **src/backend/services/lensProductMasterService.js**
   - Added `calculateProductCost()` method
   - Added export for new method

2. **src/backend/controllers/lensProductMasterController.js**
   - Added `calculateProductCost()` controller
   - Added request validation

3. **src/backend/routes/lensProducts.routes.js**
   - Added `/calculate-cost` POST route
   - Added comprehensive Swagger documentation

4. **PRODUCT_COST_CALCULATOR_API_DOCS.md** (New)
   - Complete API documentation
   - Integration examples
   - Use case scenarios

5. **PRODUCT_COST_CALCULATOR_IMPLEMENTATION_SUMMARY.md** (New)
   - Technical implementation details
   - This summary document

---

## Testing Checklist

- [x] Service method created with proper logic
- [x] Controller method with validation
- [x] Route defined with authentication
- [x] Swagger documentation added
- [x] No syntax errors in code
- [ ] Test with customer that has price mapping
- [ ] Test with customer without price mapping
- [ ] Test with different quantities
- [ ] Test with invalid customer ID
- [ ] Test with invalid lens price ID
- [ ] Test with missing required fields
- [ ] Test authentication requirement
- [ ] Verify calculations are accurate

---

## Performance Notes

- Single efficient query to fetch all required data
- Uses Prisma's include for optimized joins
- Price mapping lookup is fast (indexed on customer_id and lensPrice_id)
- No unnecessary data fetched
- Calculations done in-memory (very fast)

---

## Future Enhancements

Potential improvements for future versions:

1. **Bulk Calculation**: Calculate costs for multiple items in one request
2. **Tax Calculation**: Add tax computation
3. **Shipping Costs**: Include delivery charges
4. **Payment Terms**: Apply payment term discounts
5. **Currency Conversion**: Support multiple currencies
6. **Promotional Discounts**: Stack additional promotional offers
7. **Volume Discounts**: Apply tiered pricing based on quantity
8. **Historical Pricing**: Track price changes over time

---

## Related Endpoints

- **GET** `/api/v1/lens-products/with-prices` - Get products with prices
- **GET** `/api/price-mappings/customer/:customer_id` - Get customer price mappings
- **POST** `/api/price-mappings/bulk` - Create/update price mappings

---

## Support

For questions or issues:
- API Documentation: `PRODUCT_COST_CALCULATOR_API_DOCS.md`
- Implementation Details: This document
- Swagger UI: `http://localhost:3001/api-docs`
