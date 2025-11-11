# CustomerMaster API Documentation

## Overview
Complete CRUD API for managing CustomerMasters in the Lens Management System. This API handles the creation, reading, updating, deletion and Dropdowns of CustomerMasters along with their associated items.

## Base URL
```
/api/customer-master
```

## Authentication & Authorization
All endpoints require authentication and specific role permissions:
- **Admin**: Full access to all operations
- **Sales**: Can create, read, update, and delete CustomerMasters
- **Inventory**: Can read CustomerMasters and update status

---

## Endpoints

### 1. Create CustomerMaster
**POST** `/api/customer-master`

Creates a new CustomerMaster with items.

**Required Roles:** Sales, Admin

**Request Body:**
```json
{
  "customerCode": "CUS001",
  "name": "surash",
  "shopName": "ABC-Opticals",
  "phone": "8988778899",
  "alternatePhone": "",
  "email": "surash@abcopticals.com",
  "address": "madhuranthagam",
  "gstNumber": "",
  "creditLimit": "20000",
}
```

**Response (201):**
```json
{
  "status": "success",
  "data": {
    "id": 123,
    "customerCode": "CUS001",
    "name": "surash",
    "shopName": "ABC-Opticals",
    "phone": "8988778899",
    "alternatePhone": "",
    "email": "surash@abcopticals.com",
    "address": "madhuranthagam",
    "gstNumber": "",
    "creditLimit": "20000",
    "created_date":"2025-11-11T09:10:340Z"
  }
}
```

**Business Logic:**
- Validates customer exists
---

### 2. List CustomerMasters
**GET** `/api/customer-master`

Retrieves CustomerMasters with optional filtering and pagination.

**Required Roles:** Sales, Admin

**Query Parameters:**
- `customerCode` (optional): Filter by customerCode
- `name` (optional): Filter by name
- `shopName` (optional): Filter by shopName
- `created_date` (optional): Filter by created_date

**Example:**
```
GET /api/customer-master?customerCode=sur&page=1&limit=5
```

**Response (200):**
```json
{
  "success": true,
   "data": {
    "id": 123,
    "customerCode": "CUS001",
    "name": "surash",
    "shopName": "ABC-Opticals",
    "phone": "8988778899",
    "alternatePhone": "",
    "email": "surash@abcopticals.com",
    "address": "madhuranthagam",
    "gstNumber": "",
    "creditLimit": "20000",
    "created_date":"2025-11-11T09:10:340Z"
  },
  "pagination": {
    "page": 1,
    "limit": 5,
    "total": 25,
    "pages": 5
  }
}
```

---

### 3. Get CustomerMaster by ID
**GET** `/api/customer-master/:id`

Retrieves a specific CustomerMaster with complete details.

**Required Roles:** Sales, Admin

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "customerCode": "CUS001",
    "name": "surash",
    "shopName": "ABC-Opticals",
    "phone": "8988778899",
    "alternatePhone": "",
    "email": "surash@abcopticals.com",
    "address": "madhuranthagam",
    "gstNumber": "",
    "creditLimit": "20000",
    "created_date":"2025-11-11T09:10:340Z"
  }
}
```

---

### 4. Update CustomerMaster
**PUT** `/api/customer-master/:id`

Updates a CustomerMaster (only allowed for DRAFT and CONFIRMED orders).

**Required Roles:** Sales, Admin

**Request Body:**
```json
{
  "customerCode": "CUS001",
  "name": "surash",
  "shopName": "ABC-Opticals_limited",
  "phone": "8988778899",
  "alternatePhone": "",
  "email": "surash@abcopticals.com",
  "address": "madhuranthagam",
  "gstNumber": "",
  "creditLimit": "20000",
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
        "id": 123,
    "customerCode": "CUS001",
    "name": "surash",
    "shopName": "ABC-Opticals",
    "phone": "8988778899",
    "alternatePhone": "",
    "email": "surash@abcopticals.com",
    "address": "madhuranthagam",
    "gstNumber": "",
    "creditLimit": "20000",
    "created_date":"2025-11-11T09:10:340Z",
    "modified_date":"2025-11-11T09:10:340Z",

  }
}
```
<!-- 
**Business Logic:**
- When status changes to `IN_PRODUCTION`, stock is deducted for non-Rx items
- Status transitions are logged for audit purposes

--- -->

### 5. Delete CustomerMaster
**DELETE** `/api/customer-master/:id`

Deletes a CustomerMaster (with restrictions).

**Required Roles:** Sales, Admin

**Response (200):**
```json
{
  "success": true,
  "message": "CustomerMaster deleted successfully"
}
```

**Deletion Restrictions:**
- Cannot delete if CustomerMaster has an salesOrder
- Cannot delete if CustomerMaster has purchase orders

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
      "field": "customerCode",
      "message": "customer Code is required"
    }
  ]
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "CustomerMaster not found",
  "code": "CUSTOMER_MASTER_NOT_FOUND"
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


---

## Usage Examples

### Creating a CustomerMaster with Mixed Items
```javascript
const response = await fetch('/api/customer-master', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-token'
  },
  body: JSON.stringify({
    "customerCode": "CUS001",
    "name": "surash",
    "shopName": "ABC-Opticals",
    "phone": "8988778899",
    "alternatePhone": "",
    "email": "surash@abcopticals.com",
    "address": "madhuranthagam",
    "gstNumber": "",
    "creditLimit": "20000",
  })
});

const result = await response.json();
```

### Filtering Orders by Status
```javascript
const response = await fetch('/api/customer-master?name=sur&page=1&limit=20', {
  headers: {
    'Authorization': 'Bearer your-token'
  }
});

const orders = await response.json();
```