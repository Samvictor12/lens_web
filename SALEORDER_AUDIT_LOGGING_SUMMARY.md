# Sale Order Audit Logging Implementation Summary

## 📋 Overview

Comprehensive audit and error logging has been successfully integrated into the Sale Order module to track all CRUD operations and errors for compliance and debugging purposes.

---

## ✅ Changes Made

### 1. **Service Layer Updates** (`src/backend/services/saleOrderService.js`)

#### Imports Added:
```javascript
import { logCreate, logUpdate, logDelete, logRead } from '../utils/auditLogger.js';
import { 
  logDatabaseError, 
  logValidationError, 
  logNotFoundError,
  logBusinessError 
} from '../utils/errorLogger.js';
```

#### All Methods Updated:

| Method | Audit Logs | Error Logs | Details |
|--------|-----------|-----------|---------|
| `createSaleOrder()` | ✅ CREATE | ✅ Database, Not Found | Logs new order creation with customer details |
| `getSaleOrders()` | ✅ READ (conditional) | ✅ Database | Logs filtered queries with record counts |
| `getSaleOrderById()` | ✅ READ | ✅ Database, Not Found | Logs individual order retrieval |
| `updateSaleOrder()` | ✅ UPDATE | ✅ Database, Not Found | Logs changes with old/new values |
| `updateStatus()` | ✅ UPDATE | ✅ Database, Not Found, Validation | Logs status changes with validation |
| `updateDispatchInfo()` | ✅ UPDATE | ✅ Database, Not Found | Logs dispatch updates with assigned person |
| `deleteSaleOrder()` | ✅ DELETE | ✅ Database, Not Found, Business Logic | Logs soft deletes with business rule validation |

---

### 2. **Controller Layer Updates** (`src/backend/controllers/saleOrderController.js`)

All controller methods now pass the `req` (Express request object) to service methods:

```javascript
// Before:
await this.saleOrderService.createSaleOrder(validation.data, userId);

// After:
await this.saleOrderService.createSaleOrder(validation.data, userId, req);
```

Updated Methods:
- ✅ `create()` - Pass req for CREATE audit
- ✅ `list()` - Pass req and userId for READ audit
- ✅ `getById()` - Pass req and userId for READ audit
- ✅ `update()` - Pass req for UPDATE audit
- ✅ `updateStatus()` - Pass req for UPDATE audit
- ✅ `updateDispatchInfo()` - Pass req for UPDATE audit
- ✅ `delete()` - Pass req for DELETE audit

---

## 🎯 Audit Log Features

### CREATE Operations
Logged when a new sale order is created:
```javascript
await logCreate({
  userId,
  entity: 'SaleOrder',
  entityId: saleOrder.id,
  newValues: saleOrder,
  req,
  metadata: {
    orderNo: saleOrder.orderNo,
    customerId: saleOrder.customerId,
    customerName: saleOrder.customer.name,
    status: saleOrder.status,
    operation: 'Sale order created successfully'
  }
});
```

**Captured Data:**
- Order number
- Customer ID and name
- Initial status
- All order details in newValues
- User who created it
- IP address and user agent

---

### UPDATE Operations
Logged when sale orders are updated:
```javascript
await logUpdate({
  userId,
  entity: 'SaleOrder',
  entityId: updated.id,
  oldValues: existing,      // Previous values
  newValues: updated,        // New values
  req,
  metadata: {
    orderNo: updated.orderNo,
    customerName: updated.customer?.name,
    updatedFields: Object.keys(updateData),
    operation: 'Sale order updated successfully'
  }
});
```

**Captured Data:**
- Complete old values (before update)
- Complete new values (after update)
- Automatic change detection
- List of fields that changed
- User who made the change

**Special Update Logs:**
1. **Status Changes** - Tracks old status → new status
2. **Dispatch Updates** - Tracks dispatch status, assigned person, dates

---

### DELETE Operations
Logged when sale orders are deleted (soft delete):
```javascript
await logDelete({
  userId,
  entity: 'SaleOrder',
  entityId: id,
  oldValues: existing,
  req,
  metadata: {
    orderNo: existing.orderNo,
    customerName: existing.customer?.name,
    status: existing.status,
    deleteType: 'soft',
    operation: 'Sale order deleted (soft delete)'
  }
});
```

**Captured Data:**
- Complete order data before deletion
- Order number and customer
- Current status at time of deletion
- Soft vs hard delete indicator

---

### READ Operations
Logged conditionally (only for filtered queries):
```javascript
// Only logs when filters are applied
if (search || customerId || status) {
  await logRead({
    userId,
    entity: 'SaleOrder',
    req,
    metadata: {
      filters: { search, customerId, status, dispatchStatus },
      recordCount: saleOrders.length,
      totalRecords: total,
      page,
      limit
    }
  });
}
```

**Why Conditional?**
- Reading all orders is routine and would create too many logs
- Only logs when specific filters are used (search, customer, status)
- Individual order retrieval by ID is always logged

---

## 🚨 Error Logging Features

### 1. Database Errors
Logged when database operations fail:
```javascript
await logDatabaseError({
  error,
  userId,
  req,
  metadata: {
    operation: 'createSaleOrder',
    input: orderData
  }
});
```

**Captured:**
- Error message and stack trace
- Database operation that failed
- User request data
- Prisma error codes

---

### 2. Not Found Errors
Logged when resources don't exist:
```javascript
await logNotFoundError({
  error,
  userId,
  req,
  resource: 'SaleOrder',
  resourceId: id,
  metadata: { operation: 'getSaleOrderById' }
});
```

**Captured:**
- What resource was requested
- Resource ID that wasn't found
- Which operation triggered it
- User who made the request

---

### 3. Validation Errors
Logged when data validation fails:
```javascript
await logValidationError({
  error,
  userId,
  req,
  validationDetails: {
    field: 'status',
    provided: status,
    allowed: validStatuses
  }
});
```

**Use Cases:**
- Invalid status values
- Invalid data formats
- Missing required fields

---

### 4. Business Logic Errors
Logged when business rules are violated:
```javascript
await logBusinessError({
  error,
  userId,
  req,
  businessRule: 'Cannot delete sale order with an invoice',
  metadata: {
    operation: 'deleteSaleOrder',
    saleOrderId: id,
    invoiceId: existing.invoiceId
  }
});
```

**Use Cases:**
- Cannot delete order with invoice
- Cannot delete order with purchase orders
- Cannot delete delivered orders

---

## 📊 Example Audit Trail

### Creating a Sale Order:
```json
{
  "id": 1,
  "userId": 1,
  "action": "CREATE",
  "entity": "SaleOrder",
  "entityId": 123,
  "newValues": {
    "orderNo": "SO-2024-001",
    "customerId": 5,
    "status": "DRAFT",
    ...
  },
  "metadata": {
    "orderNo": "SO-2024-001",
    "customerName": "ABC Opticals",
    "status": "DRAFT"
  },
  "success": true,
  "createdAt": "2024-11-27T10:00:00Z"
}
```

### Updating Status:
```json
{
  "id": 2,
  "userId": 1,
  "action": "UPDATE",
  "entity": "SaleOrder",
  "entityId": 123,
  "oldValues": { "status": "DRAFT" },
  "newValues": { "status": "CONFIRMED" },
  "changes": {
    "status": {
      "old": "DRAFT",
      "new": "CONFIRMED"
    }
  },
  "metadata": {
    "orderNo": "SO-2024-001",
    "oldStatus": "DRAFT",
    "newStatus": "CONFIRMED"
  }
}
```

### Deleting with Business Rule Violation:
```json
{
  "id": 10,
  "errorType": "BusinessLogicError",
  "errorMessage": "Cannot delete sale order with an invoice",
  "severity": "WARNING",
  "metadata": {
    "businessRule": "Cannot delete sale order with an invoice",
    "saleOrderId": 123,
    "invoiceId": 45
  },
  "resolved": false
}
```

---

## 🔍 Querying Sale Order Logs

### Get All Sale Order Audits:
```bash
GET /api/audit-logs?entity=SaleOrder
```

### Get Specific Order History:
```bash
GET /api/audit-logs?entity=SaleOrder&entityId=123
```

### Get User's Sale Order Actions:
```bash
GET /api/audit-logs?entity=SaleOrder&userId=1
```

### Get Sale Order Errors:
```bash
GET /api/error-logs?endpoint=/api/sale-orders
```

### Get Business Logic Errors:
```bash
GET /api/error-logs?errorType=BusinessLogicError
```

---

## 📈 Benefits

### For Auditing:
- ✅ Complete trail of who created/modified/deleted orders
- ✅ See exact changes made (old vs new values)
- ✅ Track status transitions
- ✅ Monitor dispatch updates
- ✅ Identify when and why deletions failed

### For Debugging:
- ✅ See all database errors with stack traces
- ✅ Identify validation issues
- ✅ Track business rule violations
- ✅ Monitor which operations fail most often

### For Compliance:
- ✅ Complete audit trail for financial records
- ✅ Track customer order modifications
- ✅ Prove who authorized changes
- ✅ Show deletion attempts and reasons

---

## 🎯 Usage Example

When a sale order is updated:

1. **Service fetches old values**
   ```javascript
   const existing = await prisma.saleOrder.findUnique({...});
   ```

2. **Service performs update**
   ```javascript
   const updated = await prisma.saleOrder.update({...});
   ```

3. **Service logs the change**
   ```javascript
   await logUpdate({
     userId,
     entity: 'SaleOrder',
     entityId: updated.id,
     oldValues: existing,
     newValues: updated,
     req
   });
   ```

4. **View in audit logs**
   ```bash
   GET /api/audit-logs?entity=SaleOrder&entityId=123
   ```

---

## ⚙️ Configuration

### Enable/Disable READ Logging

In your middleware setup, control READ operation logging:

```javascript
// Don't log GET requests (less verbose)
app.use('/api', auditMiddleware({ logReads: false }));

// Log all GET requests (more detailed)
app.use('/api', auditMiddleware({ logReads: true }));
```

### Current Configuration:
- ✅ CREATE operations: Always logged
- ✅ UPDATE operations: Always logged
- ✅ DELETE operations: Always logged
- ⚠️ READ operations: Conditionally logged (only filtered queries)

---

## 🔒 Security Features

### Sensitive Data Protection:
- Passwords are automatically redacted in error logs
- Request bodies sanitized before logging
- IP addresses and user agents captured for security

### Access Control:
- Only authenticated users can view audit logs
- Log viewing requires proper permissions
- User context always captured

---

## 📝 Next Steps

1. **Test the Logging**
   - Create a sale order → Check audit log
   - Update a sale order → Check changes in audit log
   - Delete a sale order → Check deletion log
   - Try invalid operations → Check error logs

2. **View Logs**
   ```bash
   GET /api/audit-logs?entity=SaleOrder&page=1&limit=50
   GET /api/error-logs?severity=ERROR&resolved=false
   GET /api/error-logs/stats
   ```

3. **Monitor & Analyze**
   - Review error statistics
   - Track most common errors
   - Monitor user activities
   - Ensure compliance

---

## 📚 Related Documentation

- See `AUDIT_ERROR_LOGGING_GUIDE.md` for complete logging system documentation
- See `src/backend/examples/LOGGING_INTEGRATION_GUIDE.js` for more examples
- See `src/backend/utils/auditLogger.js` for audit logging API
- See `src/backend/utils/errorLogger.js` for error logging API

---

## ✨ Summary

The Sale Order module now has **complete audit and error logging** with:

- ✅ All CRUD operations tracked
- ✅ Before/after values captured
- ✅ User context and IP addresses logged
- ✅ Database errors tracked
- ✅ Validation errors logged
- ✅ Business rule violations recorded
- ✅ Complete audit trail for compliance
- ✅ Powerful query interface for analysis

**Zero configuration needed** - logging is automatic when operations are performed!
