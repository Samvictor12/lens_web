// Sale Order API Test Examples
// Use these examples with tools like Postman, Thunder Client, or curl

// 1. CREATE SALE ORDER
// POST /api/sale-orders
{
  "customerId": 1,
  "fittingType": "Free Fitting",
  "items": [
    {
      "lensVariantId": 1,
      "quantity": 2,
      "discount": 10
    },
    {
      "lensVariantId": 2,
      "quantity": 1,
      "discount": 0
    }
  ]
}

// 2. GET ALL SALE ORDERS (with pagination)
// GET /api/sale-orders?page=1&limit=10&status=CONFIRMED

// 3. GET SALE ORDER BY ID
// GET /api/sale-orders/1

// 4. UPDATE SALE ORDER
// PUT /api/sale-orders/1
{
  "customerId": 2,
  "fittingType": "Premium Fitting",
  "items": [
    {
      "lensVariantId": 3,
      "quantity": 1,
      "discount": 5
    }
  ]
}

// 5. UPDATE SALE ORDER STATUS
// PATCH /api/sale-orders/1/status
{
  "status": "IN_PRODUCTION"
}

// 6. GET SALE ORDER SUMMARY
// GET /api/sale-orders/summary?startDate=2025-11-01T00:00:00.000Z&endDate=2025-11-30T23:59:59.999Z

// 7. DELETE SALE ORDER
// DELETE /api/sale-orders/1

// CURL Examples:

// Create Sale Order
/*
curl -X POST http://localhost:5000/api/sale-orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "customerId": 1,
    "fittingType": "Free Fitting",
    "items": [
      {
        "lensVariantId": 1,
        "quantity": 2,
        "discount": 10
      }
    ]
  }'
*/

// Get All Sale Orders
/*
curl -X GET "http://localhost:5000/api/sale-orders?page=1&limit=10" \
  -H "Authorization: Bearer your-token"
*/

// Update Status
/*
curl -X PATCH http://localhost:5000/api/sale-orders/1/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{"status": "IN_PRODUCTION"}'
*/

// JavaScript Fetch Examples:

// Create Sale Order
/*
const createSaleOrder = async () => {
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
          lensVariantId: 1,
          quantity: 2,
          discount: 10
        }
      ]
    })
  });
  
  const result = await response.json();
  console.log(result);
};
*/

// Get Sale Orders with Filtering
/*
const getSaleOrders = async (status = '', page = 1) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: '10'
  });
  
  if (status) params.append('status', status);
  
  const response = await fetch(`/api/sale-orders?${params}`, {
    headers: {
      'Authorization': 'Bearer your-token'
    }
  });
  
  const result = await response.json();
  console.log(result);
};
*/