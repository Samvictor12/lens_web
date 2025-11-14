# Customer Master API - Backend Implementation

Complete backend implementation for Customer Master management in the Lens Management System.

## 📁 Folder Structure

```
src/backend/
├── dto/
│   └── customerMasterDto.js          # Data Transfer Objects & Validation Schemas
├── services/
│   └── customerMasterService.js      # Business Logic & Database Operations  
├── controllers/
│   └── customerMasterController.js   # HTTP Request Handlers
├── routes/
│   └── customerMaster.js            # API Routes & Swagger Documentation
└── examples/
    └── customerMasterExamples.js    # Usage Examples & Testing
```

## 🚀 Features Implemented

### ✅ Complete CRUD Operations
- **Create** customer master with validation
- **Read** paginated list with filtering & sorting
- **Update** customer master with duplicate checks
- **Delete** customer master with dependency validation

### ✅ Advanced Features
- **Dropdown API** for forms and select components
- **Customer code validation** to prevent duplicates
- **Statistics endpoint** for dashboard metrics
- **Comprehensive filtering** by all customer fields
- **Pagination** with customizable page size
- **Sorting** by any field in ascending/descending order

### ✅ Security & Validation
- **Role-based access control** (Admin, Sales, Inventory)
- **Input validation** using Zod schemas
- **Error handling** with proper HTTP status codes
- **Duplicate prevention** for customer codes and emails

### ✅ API Documentation
- **Complete Swagger documentation** with examples
- **Request/Response schemas** defined
- **Authentication requirements** documented
- **Error response formats** standardized

## 🛠 API Endpoints

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| `POST` | `/api/customer-master` | Create customer master | Sales, Admin |
| `GET` | `/api/customer-master` | List customers (paginated) | Sales, Admin, Inventory |
| `GET` | `/api/customer-master/:id` | Get customer by ID | Sales, Admin, Inventory |
| `PUT` | `/api/customer-master/:id` | Update customer master | Sales, Admin |
| `DELETE` | `/api/customer-master/:id` | Delete customer master | Sales, Admin |
| `GET` | `/api/customer-master/dropdown` | Get dropdown list | Sales, Admin, Inventory |
| `POST` | `/api/customer-master/check-code` | Check code exists | Sales, Admin |
| `GET` | `/api/customer-master/stats` | Get statistics | Admin |

## 📋 Customer Master Schema

```javascript
{
  id: number,                    // Auto-generated
  customerCode: string,          // Required, unique (max 50)
  name: string,                  // Required (max 100)
  shopName: string,             // Required (max 100)
  phone: string,                // Required (10-15 digits)
  alternatephone: string,       // Optional (max 15)
  email: string,                // Optional, valid email
  address: string,              // Required (max 500)
  gstNumber: string,            // Optional (max 15)
  creditLimit: string,          // Optional, default "0"
  createdAt: datetime,          // Auto-generated
  updatedAt: datetime           // Auto-updated
}
```

## 🔍 Query Parameters

### List Customers (`GET /api/customer-master`)
```javascript
{
  customerCode?: string,        // Filter by customer code
  name?: string,               // Filter by name
  shopName?: string,           // Filter by shop name
  email?: string,              // Filter by email
  phone?: string,              // Filter by phone
  page?: number,               // Page number (default: 1)
  limit?: number,              // Items per page (default: 10)
  sortBy?: string,             // Sort field (default: createdAt)
  sortOrder?: 'asc'|'desc'     // Sort order (default: desc)
}
```

## 💼 Business Rules

### Creation Rules
- Customer code must be unique across all customers
- Email must be unique if provided
- Phone number must be 10-15 digits
- All required fields must be provided

### Update Rules
- Cannot change customer code to existing code
- Cannot change email to existing email
- Partial updates supported (only provided fields updated)

### Deletion Rules
- Cannot delete customer with existing sale orders
- Soft delete could be implemented if needed
- Returns appropriate error messages for restrictions

## 🧪 Testing Examples

### Create Customer
```javascript
const newCustomer = await fetch('/api/customer-master', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-token'
  },
  body: JSON.stringify({
    customerCode: "CUS001",
    name: "Surash Kumar",
    shopName: "ABC Opticals",
    phone: "8988778899",
    email: "surash@abcopticals.com",
    address: "Madhuranthagam",
    creditLimit: "20000"
  })
});
```

### List with Filtering
```javascript
const customers = await fetch(
  '/api/customer-master?name=sur&page=1&limit=10&sortBy=name&sortOrder=asc',
  {
    headers: { 'Authorization': 'Bearer your-token' }
  }
);
```

### Update Customer
```javascript
const updated = await fetch('/api/customer-master/123', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-token'
  },
  body: JSON.stringify({
    shopName: "ABC Opticals Limited",
    creditLimit: "30000"
  })
});
```

## 🔧 Database Integration

### Prisma Schema Integration
The service integrates with the existing Prisma `Customer` model and maintains relationships with:
- `SaleOrder` (one-to-many)
- Future models as needed

### Error Handling
- **Database errors** are caught and converted to API errors
- **Validation errors** return detailed field-level messages  
- **Business rule violations** return appropriate HTTP status codes
- **Duplicate constraints** are handled gracefully

## 🚦 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Update Server Configuration
The Customer Master routes are automatically included in `server.js`:
```javascript
import customerMasterRoutes from './routes/customerMaster.js';
app.use('/api/customer-master', customerMasterRoutes);
```

### 3. Database Migration
Ensure your Prisma schema includes the Customer model:
```prisma
model Customer {
  id            Int      @id @default(autoincrement())
  customerCode  String   @unique @db.VarChar(50)
  name          String   @db.VarChar(100)
  shopName      String   @db.VarChar(100)
  phone         String   @db.VarChar(15)
  alternatephone String? @db.VarChar(15)
  email         String?  @unique @db.VarChar(255)
  address       String   @db.VarChar(500)
  gstNumber     String?  @db.VarChar(15)
  creditLimit   String   @default("0")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  saleOrders    SaleOrder[]
  
  @@map("customers")
}
```

### 4. Start Server
```bash
npm run dev:server
```

### 5. Test API
Use the provided examples in `customerMasterExamples.js` or test via:
- **Postman/Thunder Client** with the Swagger documentation
- **Frontend integration** with the dropdown and CRUD operations
- **Direct HTTP calls** using the example functions

## 📊 Response Format

### Success Response
```javascript
{
  success: true,
  data: CustomerMaster | CustomerMaster[],
  pagination?: {
    page: number,
    limit: number,
    total: number,
    pages: number
  }
}
```

### Error Response
```javascript
{
  success: false,
  message: string,
  code?: string,
  errors?: [
    {
      field: string,
      message: string
    }
  ]
}
```

## 🔐 Authentication & Authorization

All endpoints require:
- **Valid JWT token** in Authorization header
- **Appropriate role permissions**:
  - **Admin**: Full access to all operations
  - **Sales**: Create, read, update, delete operations  
  - **Inventory**: Read-only access

## 🎯 Integration Points

### Frontend Integration
- Use **dropdown endpoint** for customer selection in forms
- Implement **real-time validation** with check-code endpoint
- Build **search and filter** interfaces with the list endpoint
- Create **customer management** pages with full CRUD

### SaleOrder Integration
- Customer dropdown populates customer selection in SaleOrderForm
- Customer details auto-populate when selected
- Deletion restrictions prevent data integrity issues

This implementation provides a robust, scalable, and well-documented Customer Master API that follows best practices and integrates seamlessly with your existing system!