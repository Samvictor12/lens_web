# Sale Order Audit Logging - Testing Checklist

## ✅ Implementation Complete

All sale order service and controller methods now include comprehensive audit and error logging.

---

## 🧪 Testing Checklist

### 1. CREATE Operation Testing

**Test Case:** Create a new sale order
```bash
POST /api/sale-orders
```

**Expected Audit Log:**
- ✅ Action: CREATE
- ✅ Entity: SaleOrder
- ✅ newValues contains full order data
- ✅ metadata includes orderNo, customerName, status
- ✅ userId captured
- ✅ IP address and user agent logged

**How to Verify:**
```bash
GET /api/audit-logs?entity=SaleOrder&action=CREATE
```

---

### 2. READ Operation Testing

**Test Case 1:** Get all sale orders (no filters)
```bash
GET /api/sale-orders
```
**Expected:** No audit log (routine operation)

**Test Case 2:** Get filtered sale orders
```bash
GET /api/sale-orders?search=ABC&status=CONFIRMED
```
**Expected Audit Log:**
- ✅ Action: READ
- ✅ Entity: SaleOrder
- ✅ metadata includes filters, recordCount, totalRecords

**Test Case 3:** Get single sale order
```bash
GET /api/sale-orders/123
```
**Expected Audit Log:**
- ✅ Action: READ
- ✅ entityId: 123
- ✅ metadata includes orderNo, customerName

---

### 3. UPDATE Operation Testing

**Test Case 1:** Update sale order details
```bash
PUT /api/sale-orders/123
Body: { "remark": "Updated remark", "urgentOrder": true }
```

**Expected Audit Log:**
- ✅ Action: UPDATE
- ✅ oldValues contains original data
- ✅ newValues contains updated data
- ✅ changes automatically calculated
- ✅ metadata includes updatedFields array

**Test Case 2:** Update status
```bash
PATCH /api/sale-orders/123/status
Body: { "status": "CONFIRMED" }
```

**Expected Audit Log:**
- ✅ Action: UPDATE
- ✅ oldValues: { status: "DRAFT" }
- ✅ newValues: { status: "CONFIRMED" }
- ✅ metadata includes oldStatus and newStatus

**Test Case 3:** Update dispatch info
```bash
PATCH /api/sale-orders/123/dispatch
Body: { "dispatchStatus": "Dispatched", "assignedPerson_id": 2 }
```

**Expected Audit Log:**
- ✅ Action: UPDATE
- ✅ oldValues and newValues for dispatch fields
- ✅ metadata includes assignedTo name

---

### 4. DELETE Operation Testing

**Test Case 1:** Delete valid sale order
```bash
DELETE /api/sale-orders/123
```

**Expected Audit Log:**
- ✅ Action: DELETE
- ✅ oldValues contains complete order data before deletion
- ✅ metadata includes orderNo, customerName, deleteType: "soft"

**Test Case 2:** Try to delete order with invoice
```bash
DELETE /api/sale-orders/124
```

**Expected Error Log:**
- ✅ errorType: BusinessLogicError
- ✅ errorMessage: "Cannot delete sale order with an invoice"
- ✅ severity: WARNING
- ✅ metadata includes businessRule and invoiceId

**Test Case 3:** Try to delete delivered order
```bash
DELETE /api/sale-orders/125
```

**Expected Error Log:**
- ✅ errorType: BusinessLogicError
- ✅ errorMessage: "Cannot delete delivered sale order"
- ✅ metadata includes currentStatus

---

### 5. Error Testing

**Test Case 1:** Create with non-existent customer
```bash
POST /api/sale-orders
Body: { "customerId": 99999, ... }
```

**Expected Error Log:**
- ✅ errorType: NotFoundError
- ✅ resource: Customer
- ✅ resourceId: 99999

**Test Case 2:** Update non-existent order
```bash
PUT /api/sale-orders/99999
```

**Expected Error Log:**
- ✅ errorType: NotFoundError
- ✅ resource: SaleOrder
- ✅ resourceId: 99999

**Test Case 3:** Invalid status value
```bash
PATCH /api/sale-orders/123/status
Body: { "status": "INVALID_STATUS" }
```

**Expected Error Log:**
- ✅ errorType: ValidationError
- ✅ validationDetails includes provided/allowed values

---

## 📊 Verification Queries

### View Recent Sale Order Audits
```bash
GET /api/audit-logs?entity=SaleOrder&page=1&limit=20
```

### View Specific Order History
```bash
GET /api/audit-logs?entity=SaleOrder&entityId=123
```

### View User's Sale Order Actions
```bash
GET /api/audit-logs?entity=SaleOrder&userId=1&action=UPDATE
```

### View Sale Order Errors
```bash
GET /api/error-logs?errorType=BusinessLogicError
```

### View Unresolved Errors
```bash
GET /api/error-logs?resolved=false&severity=ERROR
```

### Get Error Statistics
```bash
GET /api/error-logs/stats
```

---

## 🔍 Manual Verification Steps

### Step 1: Create and Verify
1. Create a new sale order via API
2. Query audit logs: `GET /api/audit-logs?entity=SaleOrder&action=CREATE`
3. Verify the log contains:
   - Correct user ID
   - Complete order data in newValues
   - Order number and customer name in metadata

### Step 2: Update and Verify
1. Update the sale order
2. Query audit logs: `GET /api/audit-logs?entity=SaleOrder&entityId={id}&action=UPDATE`
3. Verify the log shows:
   - Old values before update
   - New values after update
   - Calculated changes

### Step 3: Delete and Verify
1. Soft delete the sale order
2. Query audit logs: `GET /api/audit-logs?entity=SaleOrder&action=DELETE`
3. Verify the log contains complete order data

### Step 4: Error and Verify
1. Try to delete an order with an invoice
2. Query error logs: `GET /api/error-logs?errorType=BusinessLogicError`
3. Verify the error log explains why it failed

---

## 🎯 Success Criteria

All tests should show:
- ✅ All CRUD operations are logged
- ✅ User context is captured (userId, IP, user agent)
- ✅ Complete data is stored (old/new values)
- ✅ Changes are automatically calculated
- ✅ Error details are comprehensive
- ✅ Business rules violations are tracked
- ✅ Logs are queryable by entity, action, user, date

---

## 🐛 Troubleshooting

### Issue: Logs not appearing

**Check:**
1. Are the logging utilities imported correctly?
2. Is the request object being passed to service methods?
3. Check console for "Audit log error" or "Error log failed" messages
4. Verify database tables exist: `AuditLog` and `ErrorLog`

### Issue: Missing data in logs

**Check:**
1. Ensure complete object is passed to logging functions
2. Verify include statements in Prisma queries (for related data)
3. Check metadata object has all required fields

### Issue: Too many READ logs

**Solution:**
- Conditional READ logging is already implemented
- Only filtered queries create logs
- Adjust threshold in service if needed

---

## 📝 Next Steps After Testing

1. **Monitor Production Logs**
   - Set up alerts for critical errors
   - Review audit logs regularly
   - Check for unusual patterns

2. **Analyze Usage**
   - Which operations are most common?
   - Which errors occur frequently?
   - Which users are most active?

3. **Optimize if Needed**
   - Adjust READ logging threshold
   - Archive old logs periodically
   - Add indexes for common queries

4. **Expand Coverage**
   - Apply same pattern to other modules (Customer, Invoice, etc.)
   - Add custom audit points for special business logic
   - Create reports based on audit data

---

## ✨ Summary

Sale Order audit logging is **production-ready** with:
- ✅ Complete CRUD tracking
- ✅ Comprehensive error logging
- ✅ Business rule validation tracking
- ✅ User context capture
- ✅ Before/after value comparison
- ✅ Queryable audit trail

**Ready for testing!** 🚀
