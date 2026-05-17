# API Reference

> Base URL: `http://localhost:3001` (development) | configured via `SWAGGER_URL` in production  
> Auth: All protected endpoints require `Authorization: Bearer <accessToken>`  
> Docs: Interactive Swagger UI at `/api-docs`

---

## Authentication Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | ❌ | Login with username + password |
| POST | `/api/auth/refresh` | ❌ | Refresh access token using refresh token |
| POST | `/api/auth/logout` | ✅ | Logout and invalidate refresh token |
| GET | `/api/auth/me` | ✅ | Get current authenticated user |

---

## User Management

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/users` | ✅ | List all users |
| POST | `/api/users` | ✅ | Create user |
| GET | `/api/users/:id` | ✅ | Get user by ID |
| PUT | `/api/users/:id` | ✅ | Update user |
| DELETE | `/api/users/:id` | ✅ | Soft delete user |

---

## Customer Management

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/customers` | ✅ | List all customers |
| POST | `/api/customers` | ✅ | Create customer |
| GET | `/api/customers/:id` | ✅ | Get customer by ID |
| PUT | `/api/customers/:id` | ✅ | Update customer |
| DELETE | `/api/customers/:id` | ✅ | Soft delete customer |

---

## Vendor Management

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/vendors` | ✅ | List all vendors |
| POST | `/api/vendors` | ✅ | Create vendor |
| GET | `/api/vendors/:id` | ✅ | Get vendor by ID |
| PUT | `/api/vendors/:id` | ✅ | Update vendor |
| DELETE | `/api/vendors/:id` | ✅ | Soft delete vendor |

---

## Lens Master Endpoints

### Lens Categories
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/lens-categories` | ✅ | List categories |
| POST | `/api/lens-categories` | ✅ | Create category |
| PUT | `/api/lens-categories/:id` | ✅ | Update category |
| DELETE | `/api/lens-categories/:id` | ✅ | Delete category |

### Lens Materials
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/lens-materials` | ✅ | List materials |
| POST | `/api/lens-materials` | ✅ | Create material |
| PUT | `/api/lens-materials/:id` | ✅ | Update material |
| DELETE | `/api/lens-materials/:id` | ✅ | Delete material |

### Lens Brands
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/lens-brands` | ✅ | List brands |
| POST | `/api/lens-brands` | ✅ | Create brand |
| PUT | `/api/lens-brands/:id` | ✅ | Update brand |
| DELETE | `/api/lens-brands/:id` | ✅ | Delete brand |

### Lens Types
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/lens-types` | ✅ | List types |
| POST | `/api/lens-types` | ✅ | Create type |
| PUT | `/api/lens-types/:id` | ✅ | Update type |
| DELETE | `/api/lens-types/:id` | ✅ | Delete type |

### Lens Coatings
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/lens-coatings` | ✅ | List coatings |
| POST | `/api/lens-coatings` | ✅ | Create coating |
| PUT | `/api/lens-coatings/:id` | ✅ | Update coating |
| DELETE | `/api/lens-coatings/:id` | ✅ | Delete coating |

### Lens Fittings
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/lens-fittings` | ✅ | List fittings |
| POST | `/api/lens-fittings` | ✅ | Create fitting |
| PUT | `/api/lens-fittings/:id` | ✅ | Update fitting |
| DELETE | `/api/lens-fittings/:id` | ✅ | Delete fitting |

### Lens Dia
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/lens-dia` | ✅ | List dia options |
| POST | `/api/lens-dia` | ✅ | Create dia |
| PUT | `/api/lens-dia/:id` | ✅ | Update dia |
| DELETE | `/api/lens-dia/:id` | ✅ | Delete dia |

### Lens Tintings
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/lens-tintings` | ✅ | List tintings |
| POST | `/api/lens-tintings` | ✅ | Create tinting |
| PUT | `/api/lens-tintings/:id` | ✅ | Update tinting |
| DELETE | `/api/lens-tintings/:id` | ✅ | Delete tinting |

### Lens Products
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/lens-products` | ✅ | List all products |
| POST | `/api/lens-products` | ✅ | Create product |
| GET | `/api/lens-products/:id` | ✅ | Get product by ID |
| PUT | `/api/lens-products/:id` | ✅ | Update product |
| DELETE | `/api/lens-products/:id` | ✅ | Delete product |

### Lens Prices
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/lens-prices` | ✅ | List all price entries |
| POST | `/api/lens-prices` | ✅ | Create price entry |
| PUT | `/api/lens-prices/:id` | ✅ | Update price |
| DELETE | `/api/lens-prices/:id` | ✅ | Delete price |

---

## Price Mapping (Customer Discounts)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/price-mappings` | ✅ | List all mappings |
| POST | `/api/price-mappings` | ✅ | Create mapping |
| GET | `/api/price-mappings/:id` | ✅ | Get by ID |
| PUT | `/api/price-mappings/:id` | ✅ | Update mapping |
| DELETE | `/api/price-mappings/:id` | ✅ | Delete mapping |

---

## Lens Offers

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/lens-offers` | ✅ | List all offers |
| POST | `/api/lens-offers` | ✅ | Create offer |
| GET | `/api/lens-offers/:id` | ✅ | Get offer by ID |
| PUT | `/api/lens-offers/:id` | ✅ | Update offer |
| DELETE | `/api/lens-offers/:id` | ✅ | Delete offer |

---

## Sale Orders

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/sale-orders` | ✅ | List all sale orders (with filters) |
| POST | `/api/sale-orders` | ✅ | Create sale order |
| GET | `/api/sale-orders/:id` | ✅ | Get sale order by ID |
| PUT | `/api/sale-orders/:id` | ✅ | Update sale order |
| DELETE | `/api/sale-orders/:id` | ✅ | Soft delete sale order |
| PUT | `/api/sale-orders/:id/status` | ✅ | Update order status |
| GET | `/api/sale-orders/:id/print` | ✅ | Get print data for A5 spec sheet |

---

## Purchase Orders

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/purchase-orders` | ✅ | List all POs |
| POST | `/api/purchase-orders` | ✅ | Create PO (single or bulk) |
| GET | `/api/purchase-orders/:id` | ✅ | Get PO by ID |
| PUT | `/api/purchase-orders/:id` | ✅ | Update PO |
| DELETE | `/api/purchase-orders/:id` | ✅ | Delete PO |
| POST | `/api/purchase-orders/:id/receive` | ✅ | Record PO receipt (partial/full) |
| GET | `/api/purchase-orders/:id/receipts` | ✅ | List receipts for a PO |
| POST | `/api/purchase-orders/import` | ✅ | Import PO from Excel file |

---

## Inventory

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/inventory/items` | ✅ | List inventory items |
| POST | `/api/inventory/items` | ✅ | Create inventory item (direct inward) |
| GET | `/api/inventory/items/:id` | ✅ | Get item by ID |
| PUT | `/api/inventory/items/:id` | ✅ | Update inventory item |
| GET | `/api/inventory/stock` | ✅ | Get stock summary |
| POST | `/api/inventory/transactions` | ✅ | Create inventory transaction |
| GET | `/api/inventory/transactions` | ✅ | List transactions |
| GET | `/api/inventory/alerts` | ✅ | List inventory alerts |
| PUT | `/api/inventory/alerts/:id/resolve` | ✅ | Resolve alert |

---

## Dispatch

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/dispatch` | ✅ | List all dispatch copies |
| POST | `/api/dispatch` | ✅ | Create dispatch copy |
| GET | `/api/dispatch/:id` | ✅ | Get DC by ID |
| PUT | `/api/dispatch/:id` | ✅ | Update DC |
| PUT | `/api/dispatch/:id/status` | ✅ | Update dispatch status |
| POST | `/api/dispatch/:id/signature` | ✅ | Capture delivery signature |

---

## Financial Accounting

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/ledgers` | ✅ | List all ledgers (chart of accounts) |
| POST | `/api/ledgers` | ✅ | Create ledger |
| GET | `/api/ledgers/:id` | ✅ | Get ledger by ID |
| PUT | `/api/ledgers/:id` | ✅ | Update ledger |
| GET | `/api/financial-transactions` | ✅ | List transactions |
| POST | `/api/financial-transactions` | ✅ | Create transaction (journal entry) |
| GET | `/api/financial-transactions/:id` | ✅ | Get transaction by ID |
| GET | `/api/financial-reports/trial-balance` | ✅ | Trial balance |
| GET | `/api/financial-reports/ledger-statement` | ✅ | Ledger-wise statement |
| GET | `/api/financial-reports/income-statement` | ✅ | Income & expense statement |

---

## Invoices & Payments

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/invoices` | ✅ | List invoices |
| POST | `/api/invoices` | ✅ | Create invoice |
| GET | `/api/invoices/:id` | ✅ | Get invoice |
| PUT | `/api/invoices/:id` | ✅ | Update invoice |
| POST | `/api/invoices/:id/payments` | ✅ | Record payment |

---

## Expenses

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/expenses` | ✅ | List expenses |
| POST | `/api/expenses` | ✅ | Create expense |
| PUT | `/api/expenses/:id` | ✅ | Update expense |
| DELETE | `/api/expenses/:id` | ✅ | Delete expense |

---

## Location & Tray Masters

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/locations` | ✅ | List locations |
| POST | `/api/locations` | ✅ | Create location |
| PUT | `/api/locations/:id` | ✅ | Update location |
| DELETE | `/api/locations/:id` | ✅ | Delete location |
| GET | `/api/trays` | ✅ | List trays |
| POST | `/api/trays` | ✅ | Create tray |
| PUT | `/api/trays/:id` | ✅ | Update tray |
| DELETE | `/api/trays/:id` | ✅ | Delete tray |

---

## Department & Business Category

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/departments` | ✅ | List departments |
| POST | `/api/departments` | ✅ | Create department |
| PUT | `/api/departments/:id` | ✅ | Update department |
| DELETE | `/api/departments/:id` | ✅ | Delete department |
| GET | `/api/business-categories` | ✅ | List business categories |
| POST | `/api/business-categories` | ✅ | Create business category |
| PUT | `/api/business-categories/:id` | ✅ | Update business category |

---

## Audit & Error Logs

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/logs/audit` | ✅ | List audit logs (filterable) |
| GET | `/api/logs/errors` | ✅ | List error logs |
| PUT | `/api/logs/errors/:id/resolve` | ✅ | Mark error log as resolved |

---

## Standard Response Format

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed"
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error description",
  "errors": [ { "field": "name", "message": "Required" } ]
}
```

**Pagination:**
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```
