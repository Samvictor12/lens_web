#!/bin/bash
# Test script to create a customer via API

echo "Creating customer record..."

curl -X POST http://localhost:3001/api/customer-master \
  -H "Content-Type: application/json" \
  -d '{
    "code": "CUST001",
    "name": "Test Customer",
    "shopname": "Test Shop",
    "phone": "9876543210",
    "email": "test@customer.com",
    "address": "123 Test Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "businessCategory_id": 1,
    "gstin": "27AABCT1234M1Z5",
    "credit_limit": 30010,
    "notes": "Test customer for verification",
    "active_status": true,
    "createdBy": 1,
    "updatedBy": 1
  }' | jq '.'

echo -e "\n\nGetting all customers..."
curl -X GET "http://localhost:3001/api/customer-master?page=1&limit=10" | jq '.'
