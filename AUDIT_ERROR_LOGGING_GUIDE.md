# Audit and Error Logging System

Complete implementation of audit logging and error logging for tracking all CRUD operations and errors in the application.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Database Schema](#database-schema)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Endpoints](#api-endpoints)
- [Integration Guide](#integration-guide)
- [Best Practices](#best-practices)
- [Examples](#examples)

---

## 🎯 Overview

This logging system provides comprehensive audit trails and error tracking for your application:

- **Audit Logs**: Track who did what, when, and what changed
- **Error Logs**: Track all errors with stack traces, context, and resolution status
- **Automatic Logging**: Middleware for automatic logging of API requests
- **Query Interface**: API endpoints to view and analyze logs
- **Statistics**: Error statistics and analytics

---

## ✨ Features

### Audit Logging
- ✅ Track CREATE, UPDATE, DELETE, READ operations
- ✅ Store old and new values for comparison
- ✅ Calculate and store specific field changes
- ✅ Capture user, IP address, user agent
- ✅ Track API endpoint and HTTP method
- ✅ Support for custom metadata

### Error Logging
- ✅ Capture error type, message, and stack trace
- ✅ Store request context (body, params, headers)
- ✅ Categorize by severity (INFO, WARNING, ERROR, CRITICAL)
- ✅ Track resolution status and resolver
- ✅ Multiple error type helpers (validation, database, auth, etc.)
- ✅ Error statistics and analytics

---

## 🗄️ Database Schema

### AuditLog Table
```prisma
model AuditLog {
  id            Int      @id @default(autoincrement())
  userId        Int?
  action        String   // CREATE, UPDATE, DELETE, READ
  entity        String   // Table/Model name
  entityId      Int?     // ID of the affected record
  oldValues     Json?    // Previous values
  newValues     Json?    // New values
  changes       Json?    // Specific field changes
  ipAddress     String?
  userAgent     String?
  method        String?  // HTTP method
  endpoint      String?  // API endpoint
  statusCode    Int?
  success       Boolean  @default(true)
  errorMessage  String?
  metadata      Json?
  createdAt     DateTime @default(now())
  user          User?    @relation("auditLogUser", fields: [userId], references: [id])
}
```

### ErrorLog Table
```prisma
model ErrorLog {
  id            Int      @id @default(autoincrement())
  userId        Int?
  errorType     String   // Type of error
  errorMessage  String   @db.Text
  errorStack    String?  @db.Text
  errorCode     String?
  statusCode    Int?
  method        String?
  endpoint      String?
  requestBody   Json?
  requestParams Json?
  ipAddress     String?
  userAgent     String?
  severity      String   @default("ERROR") // INFO, WARNING, ERROR, CRITICAL
  resolved      Boolean  @default(false)
  resolvedAt    DateTime?
  resolvedBy    Int?
  resolution    String?  @db.Text
  metadata      Json?
  createdAt     DateTime @default(now())
  user          User?    @relation("errorLogUser", fields: [userId], references: [id])
  resolver      User?    @relation("errorLogResolver", fields: [resolvedBy], references: [id])
}
```

---

## 📦 Installation

The tables and utilities are already created. Migration has been applied.

### Created Files:
```
src/backend/
├── utils/
│   ├── auditLogger.js         # Audit logging functions
│   └── errorLogger.js         # Error logging functions
├── middleware/
│   └── auditMiddleware.js     # Automatic logging middleware
├── routes/
│   └── logs.routes.js         # Log viewing API endpoints
└── examples/
    └── LOGGING_INTEGRATION_GUIDE.js  # Integration examples
```

---

## 🚀 Quick Start

### 1. Add Middleware to Server

In your `server.js`:

```javascript
import { auditMiddleware, errorLoggingMiddleware } from './middleware/auditMiddleware.js';
import logsRouter from './routes/logs.routes.js';

// Apply audit middleware AFTER authentication
app.use('/api', authenticateToken);
app.use('/api', auditMiddleware({
  logReads: false, // Set to true to log GET requests
  excludePaths: ['/health', '/api-docs']
}));

// Your existing routes
app.use('/api/customers', customersRouter);
app.use('/api/sale-orders', saleOrdersRouter);

// Log viewing routes
app.use('/api', logsRouter);

// Error logging middleware (MUST BE LAST)
app.use(errorLoggingMiddleware);
```

### 2. Add Logging to Controllers

```javascript
import { logCreate, logUpdate, logDelete } from '../utils/auditLogger.js';
import { logDatabaseError, logValidationError } from '../utils/errorLogger.js';

export const createCustomer = async (req, res) => {
  try {
    const customer = await prisma.customer.create({
      data: { ...req.body, createdBy: req.user.id }
    });

    // ✅ Log the operation
    await logCreate({
      userId: req.user.id,
      entity: 'Customer',
      entityId: customer.id,
      newValues: customer,
      req
    });

    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    // ✅ Log the error
    await logDatabaseError({
      error,
      userId: req.user?.id,
      req,
      metadata: { operation: 'createCustomer' }
    });

    res.status(500).json({ success: false, error: 'Failed to create customer' });
  }
};
```

---

## 🔌 API Endpoints

### Audit Logs

#### Get Audit Logs
```
GET /api/audit-logs
```

**Query Parameters:**
- `userId` - Filter by user ID
- `entity` - Filter by entity name (e.g., "Customer", "SaleOrder")
- `action` - Filter by action (CREATE, READ, UPDATE, DELETE)
- `entityId` - Filter by entity ID
- `startDate` - Filter by start date (ISO 8601)
- `endDate` - Filter by end date (ISO 8601)
- `page` - Page number (default: 1)
- `limit` - Records per page (default: 50)

**Example:**
```bash
GET /api/audit-logs?entity=Customer&action=CREATE&page=1&limit=50
GET /api/audit-logs?userId=1&startDate=2024-01-01&endDate=2024-12-31
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "userId": 1,
      "action": "CREATE",
      "entity": "Customer",
      "entityId": 123,
      "oldValues": null,
      "newValues": { "name": "John Doe", "email": "john@example.com" },
      "changes": null,
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "method": "POST",
      "endpoint": "/api/customers",
      "statusCode": 201,
      "success": true,
      "createdAt": "2024-11-26T19:00:00Z",
      "user": {
        "id": 1,
        "name": "Admin User",
        "email": "admin@example.com"
      }
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 50,
    "totalPages": 2
  }
}
```

### Error Logs

#### Get Error Logs
```
GET /api/error-logs
```

**Query Parameters:**
- `userId` - Filter by user ID
- `errorType` - Filter by error type
- `severity` - Filter by severity (INFO, WARNING, ERROR, CRITICAL)
- `resolved` - Filter by resolution status (true/false)
- `startDate` - Filter by start date
- `endDate` - Filter by end date
- `page` - Page number
- `limit` - Records per page

**Example:**
```bash
GET /api/error-logs?severity=CRITICAL&resolved=false
GET /api/error-logs?errorType=DatabaseError&page=1
```

#### Get Error Statistics
```
GET /api/error-logs/stats?startDate=2024-01-01&endDate=2024-12-31
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalErrors": 150,
    "unresolvedErrors": 25,
    "resolvedErrors": 125,
    "errorsBySeverity": [
      { "severity": "CRITICAL", "count": 5 },
      { "severity": "ERROR", "count": 50 },
      { "severity": "WARNING", "count": 70 },
      { "severity": "INFO", "count": 25 }
    ],
    "topErrorTypes": [
      { "errorType": "DatabaseError", "count": 45 },
      { "errorType": "ValidationError", "count": 40 },
      { "errorType": "AuthenticationError", "count": 30 }
    ]
  }
}
```

#### Resolve Error
```
PATCH /api/error-logs/:id/resolve
```

**Body:**
```json
{
  "resolution": "Fixed database connection timeout by increasing pool size"
}
```

---

## 🔧 Integration Guide

### Audit Logging Functions

#### logCreate
```javascript
import { logCreate } from '../utils/auditLogger.js';

await logCreate({
  userId: req.user.id,
  entity: 'Customer',
  entityId: customer.id,
  newValues: customer,
  req,
  metadata: { note: 'Customer created via API' }
});
```

#### logUpdate
```javascript
import { logUpdate } from '../utils/auditLogger.js';

// Fetch old values before update
const oldCustomer = await prisma.customer.findUnique({ where: { id } });

// Perform update
const updatedCustomer = await prisma.customer.update({...});

// Log the update
await logUpdate({
  userId: req.user.id,
  entity: 'Customer',
  entityId: updatedCustomer.id,
  oldValues: oldCustomer,
  newValues: updatedCustomer,
  req
});
```

#### logDelete
```javascript
import { logDelete } from '../utils/auditLogger.js';

// Fetch record before delete
const customer = await prisma.customer.findUnique({ where: { id } });

// Perform delete
await prisma.customer.delete({ where: { id } });

// Log the delete
await logDelete({
  userId: req.user.id,
  entity: 'Customer',
  entityId: parseInt(id),
  oldValues: customer,
  req
});
```

### Error Logging Functions

#### General Error Logging
```javascript
import { logError } from '../utils/errorLogger.js';

try {
  // Your code
} catch (error) {
  await logError({
    error,
    userId: req.user?.id,
    errorType: 'DatabaseError',
    statusCode: 500,
    req,
    severity: 'CRITICAL'
  });
}
```

#### Specific Error Types

##### Validation Error
```javascript
import { logValidationError } from '../utils/errorLogger.js';

await logValidationError({
  error: new Error('Validation failed'),
  userId: req.user.id,
  req,
  validationDetails: {
    errors: ['Name is required', 'Price must be positive'],
    input: req.body
  }
});
```

##### Database Error
```javascript
import { logDatabaseError } from '../utils/errorLogger.js';

await logDatabaseError({
  error,
  userId: req.user?.id,
  req,
  query: 'SELECT * FROM customers WHERE id = ?',
  metadata: { operation: 'fetchCustomer' }
});
```

##### Authentication Error
```javascript
import { logAuthError } from '../utils/errorLogger.js';

await logAuthError({
  error: new Error('Invalid token'),
  userId: null,
  req,
  authType: 'JWT'
});
```

##### Not Found Error
```javascript
import { logNotFoundError } from '../utils/errorLogger.js';

await logNotFoundError({
  error: new Error('Customer not found'),
  userId: req.user.id,
  req,
  resource: 'Customer',
  resourceId: id
});
```

---

## 📝 Best Practices

### ✅ DO:

1. **Log all CRUD operations**
   - Always log CREATE, UPDATE, DELETE
   - Optionally log READ for sensitive data

2. **Capture context**
   - Include user ID
   - Pass the request object
   - Add meaningful metadata

3. **Get old values**
   - Fetch records before UPDATE/DELETE
   - Store for audit trail

4. **Handle errors gracefully**
   - Use try-catch in logging functions
   - Don't let logging break main flow

5. **Sanitize sensitive data**
   - Remove passwords, tokens from logs
   - Use the built-in sanitization

### ❌ DON'T:

1. **Don't log everything**
   - Avoid logging every GET request
   - Use `logReads` sparingly

2. **Don't include sensitive data**
   - No passwords in logs
   - No API keys or tokens

3. **Don't throw from logging**
   - Catch errors in logging functions
   - Log to console as fallback

4. **Don't forget old values**
   - Always fetch before UPDATE/DELETE
   - Needed for audit trail

---

## 📚 Examples

See `src/backend/examples/LOGGING_INTEGRATION_GUIDE.js` for complete examples including:
- CREATE operations
- UPDATE operations with change tracking
- DELETE operations
- Validation error handling
- Database error handling
- Not found error handling

---

## 🔍 Querying Logs

### Frontend Integration Example

```javascript
// Fetch audit logs
const response = await fetch('/api/audit-logs?entity=Customer&action=CREATE&page=1&limit=50', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const { data, pagination } = await response.json();

// Fetch error logs
const errors = await fetch('/api/error-logs?severity=CRITICAL&resolved=false', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Get error statistics
const stats = await fetch('/api/error-logs/stats?startDate=2024-01-01', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Resolve an error
await fetch(`/api/error-logs/${errorId}/resolve`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    resolution: 'Fixed by restarting database connection pool'
  })
});
```

---

## 🎉 Summary

You now have a complete audit and error logging system with:

✅ Two database tables (AuditLog, ErrorLog)
✅ Utility functions for logging operations
✅ Middleware for automatic logging
✅ API endpoints for viewing logs
✅ Error statistics and analytics
✅ Complete integration examples

**Next Steps:**
1. Add the middleware to your server.js
2. Integrate logging into your existing controllers
3. Test the logging by performing CRUD operations
4. View logs via the API endpoints or Prisma Studio

For questions or issues, refer to the integration guide or examples!
