Here’s a **detailed, structured task breakdown in Markdown** optimized for **GitHub Copilot** to assist in building the **Lens Billing & Inventory System backend** using **Node.js, Express, Prisma, and PostgreSQL**.

This includes **phased implementation**, **modular organization**, **Prisma schema design**, **API routes**, **validation**, **role-based access**, and **dummy data seeding** — all aligned with your BRD.

---

# 🛠️ Backend Development Plan – Lens Billing & Inventory System  
**Tech Stack**: Node.js + Express + Prisma ORM + PostgreSQL  
**Deployment Target**: Hostinger (or any cloud with PostgreSQL support)

---

## 📁 Project Structure (to be created)
```
/src
  /controllers       → Business logic
  /routes            → API routes
  /middleware        → Auth, RBAC, validation
  /prisma            → Prisma schema & migrations
  /utils             → Helpers (PDF gen, FIFO logic, etc.)
  /seed              → Dummy data seeders
  app.js             → Express app
  server.js          → Server entry
.env
package.json
prisma/schema.prisma
```

---

## 📌 Phase 1: Core Setup & Authentication

### Task 1.1: Initialize Project & Dependencies
- [ ] `npm init -y`
- [ ] Install core deps:
  ```bash
  npm install express cors dotenv helmet morgan
  ```
- [ ] Install dev deps:
  ```bash
  npm install -D nodemon prisma typescript ts-node @types/express @types/node
  ```
- [ ] Initialize Prisma:
  ```bash
  npx prisma init
  ```
- [ ] Configure `.env`:
  ```env
  DATABASE_URL="postgresql://user:password@localhost:5432/lensdb?schema=public"
  PORT=3001
  NODE_ENV=development
  ```

### Task 1.2: TypeScript & Express Setup
- [ ] Create `tsconfig.json`
- [ ] Set up `server.ts` → basic Express server with middleware (`cors`, `helmet`, `express.json()`)
- [ ] Add `nodemon.json` for auto-restart

### Task 1.3: User & Role Management (Auth Skeleton)
- [ ] Define Prisma models: `User`, `Role`, `Permission`
- [ ] Seed default roles: `Admin`, `Sales`, `InventoryManager`, `Accounts`
- [ ] Create `/auth/login` stub (no real auth yet – use mock JWT for dev)

---

## 📌 Phase 2: Prisma Schema & Core Masters

### Task 2.1: Design Prisma Schema (`prisma/schema.prisma`)
> Align with BRD Masters & workflows

- [ ] **User & Role Models**
  ```prisma
  model User {
    id        Int      @id @default(autoincrement())
    name      String
    email     String   @unique
    role      Role     @relation(fields: [roleId], references: [id])
    roleId    Int
    createdAt DateTime @default(now())
  }

  model Role {
    id          Int         @id @default(autoincrement())
    name        String      @unique // "Admin", "Sales", etc.
    permissions Permission[]
    users       User[]
  }

  model Permission {
    id     Int    @id @default(autoincrement())
    action String // "create", "read", "update", "delete"
    subject String // "SaleOrder", "PurchaseOrder", etc.
    roleId Int
    role   Role   @relation(fields: [roleId], references: [id])
  }
  ```

- [ ] **Master Data Models**
  ```prisma
  model Customer {
    id          Int      @id @default(autoincrement())
    name        String
    phone       String?
    email       String?
    address     String?
    saleOrders  SaleOrder[]
  }

  model Vendor {
    id             Int      @id @default(autoincrement())
    name           String
    contactPerson  String?
    phone          String?
    email          String?
    purchaseOrders PurchaseOrder[]
  }

  model LensType {
    id       Int      @id @default(autoincrement())
    name     String   @unique // e.g., "Single Vision", "Progressive"
    variants LensVariant[]
  }

  model LensVariant {
    id        Int      @id @default(autoincrement())
    name      String   // e.g., "Acuvue Oasys"
    lensType  LensType @relation(fields: [lensTypeId], references: [id])
    lensTypeId Int
    price     Float
    isRx      Boolean  @default(false) // true = requires PO
    stock     Int      @default(0)   // for in-stock items
    saleOrders SaleOrderItem[]
  }
  ```

### Task 2.2: Seed Master Data
- [ ] Create `/seed/masters.ts`:
  - 5 Customers
  - 3 Vendors
  - 4 LensTypes + 10 Variants (mix of `isRx: true/false`)
  - Default Roles + Permissions (e.g., Sales can `create` SaleOrder)

---

## 📌 Phase 3: Sale Order & Billing Module

### Task 3.1: Sale Order Models
```prisma
model SaleOrder {
  id            Int               @id @default(autoincrement())
  customerId    Int
  customer      Customer          @relation(fields: [customerId], references: [id])
  status        SaleOrderStatus   @default(DRAFT) // DRAFT, CONFIRMED, IN_PRODUCTION, READY_FOR_DISPATCH, DELIVERED
  fittingType   String?           // "Free Fitting" or null
  createdAt     DateTime          @default(now())
  items         SaleOrderItem[]
  dispatchCopy  DispatchCopy?
  invoice       Invoice?
}

model SaleOrderItem {
  id             Int            @id @default(autoincrement())
  saleOrderId    Int
  saleOrder      SaleOrder      @relation(fields: [saleOrderId], references: [id])
  lensVariantId  Int
  lensVariant    LensVariant    @relation(fields: [lensVariantId], references: [id])
  quantity       Int            @default(1)
  discount       Float          @default(0)
  finalPrice     Float          // after discount
}
```

**Enum**:
```prisma
enum SaleOrderStatus {
  DRAFT
  CONFIRMED
  IN_PRODUCTION
  READY_FOR_DISPATCH
  DELIVERED
}
```

### Task 3.2: Sale Order Controller & Routes
- [ ] `POST /api/sale-orders` → create with customer + items
  - Auto-check: if any `lensVariant.isRx === true` → set status = `CONFIRMED` but **block production** until PO received
  - If all in-stock → status = `IN_PRODUCTION`
- [ ] `GET /api/sale-orders?status=READY_FOR_DISPATCH&customerId=1`
- [ ] `PATCH /api/sale-orders/:id/status` → update status (with RBAC)

### Task 3.3: Invoice & Payment Models (Completed)
```prisma
enum PaymentMethod {
  CASH
  UPI
  CARD
  BANK_TRANSFER
  CHECK
}

enum InvoiceStatus {
  DRAFT
  ISSUED
  PARTIALLY_PAID
  PAID
  CANCELLED
}

model Invoice {
  id          Int           @id @default(autoincrement())
  invoiceNo   String        @unique
  status      InvoiceStatus @default(DRAFT)
  saleOrders  SaleOrder[]
  totalAmount Float
  paidAmount  Float         @default(0)
  dueDate     DateTime
  payments    Payment[]
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
}

model Payment {
  id            Int           @id @default(autoincrement())
  invoiceId     Int
  invoice       Invoice       @relation(fields: [invoiceId], references: [id])
  amount        Float
  method        PaymentMethod
  referenceNo   String?
  notes         String?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}
```

### Task 3.4: Billing Workflow (Completed)
- [x] `POST /api/invoices` → Implemented invoice generation with auto-numbering and validation
- [x] `POST /api/invoices/:id/payments` → Implemented payment recording with status updates
- [x] `GET /api/customers/:id/ledger` → Implemented customer ledger with payment history

---

## 📌 Phase 4: Inventory & Purchase Order (PO) Module

### Task 4.1: PO & Inventory Models
```prisma
model PurchaseOrder {
  id          Int        @id @default(autoincrement())
  poNumber    String     @unique
  vendorId    Int
  vendor      Vendor     @relation(fields: [vendorId], references: [id])
  status      POStatus   @default(PENDING) // PENDING, ORDERED, RECEIVED
  totalValue  Float
  createdAt   DateTime   @default(now())
  items       POItem[]
  saleOrderId Int?
  saleOrder   SaleOrder? @relation(fields: [saleOrderId], references: [id])
}

model POItem {
  id              Int            @id @default(autoincrement())
  purchaseOrderId Int
  purchaseOrder   PurchaseOrder  @relation(fields: [purchaseOrderId], references: [id])
  lensVariantId   Int
  lensVariant     LensVariant    @relation(fields: [lensVariantId], references: [id])
  quantity        Int
}

enum POStatus {
  PENDING
  ORDERED
  RECEIVED
}
```

### Task 4.2: PO Workflow Logic
- [ ] Auto-create PO when RX lens added to sale order (`isRx: true`)
- [ ] `PATCH /api/purchase-orders/:id/receive` → 
  - Update `status = RECEIVED`
  - **Increase `LensVariant.stock`**
  - **Unblock linked SaleOrder → status = IN_PRODUCTION**

### Task 4.3: Inventory Deduction
- [ ] On SaleOrder status → `IN_PRODUCTION`: 
  - Deduct `quantity` from `LensVariant.stock` **only if `isRx: false`**

---

## 📌 Phase 5: Dispatch & Barcode Workflow

### Task 5.1: Dispatch Copy Model
```prisma
model DispatchCopy {
  id          Int          @id @default(autoincrement())
  dcNumber    String       @unique // e.g., DC-2025-001
  customerId  Int
  customer    Customer     @relation(fields: [customerId], references: [id])
  saleOrderIds Int[]
  saleOrders  SaleOrder[]
  dispatchedAt DateTime    @default(now())
  status      DCStatus     @default(ISSUED) // ISSUED, DELIVERED
}

enum DCStatus {
  ISSUED
  DELIVERED
}
```

### Task 5.2: Dispatch Flow
- [ ] `GET /api/dispatch?customerId=1` → list all `READY_FOR_DISPATCH` orders
- [ ] `POST /api/dispatch` → create DC with selected order IDs
- [ ] `PATCH /api/dispatch/:id/deliver` → set status = `DELIVERED` → update all linked SaleOrders to `DELIVERED`

---

## 📌 Phase 6: Expenses & Financial Reporting

### Task 6.1: Expense Model
```prisma
model Expense {
  id          Int        @id @default(autoincrement())
  description String
  amount      Float
  type        ExpenseType // DIRECT, INDIRECT
  date        DateTime   @default(now())
}

enum ExpenseType {
  DIRECT
  INDIRECT
}
```

### Task 6.2: Financial Summary Endpoint
- [ ] `GET /api/reports/financial?month=10&year=2025`
  - Total Sales (from invoices)
  - Total PO Value
  - Total Expenses
  - Net Gain = Sales - (PO + Expenses)

---

## 📌 Phase 7: Middleware & Security

### Task 7.1: Role-Based Access Control (RBAC)
- [ ] Create `requireRole(allowedRoles: string[])` middleware
- [ ] Apply to routes:
  - `POST /sale-orders` → `['Sales', 'Admin']`
  - `PATCH /purchase-orders/:id/receive` → `['InventoryManager', 'Admin']`
  - `POST /payments` → `['Accounts', 'Admin']`

### Task 7.2: Input Validation
- [ ] Use `express-validator` or Zod for:
  - SaleOrder creation
  - Payment recording
  - PO receiving

---

## 📌 Phase 8: Seed Realistic Dummy Data

### Task 8.1: Full Workflow Seed Script
- [ ] Create 2 customers
- [ ] Create 3 sale orders:
  - 1 with in-stock lenses → auto to production
  - 2 with RX lenses → generate POs
- [ ] Simulate PO receive → unblock orders
- [ ] Dispatch → mark delivered → generate invoice → record partial payment

---

## 📌 Phase 9: API Documentation & Testing

### Task 9.1: Swagger/OpenAPI
- [ ] Add `swagger-jsdoc` + `swagger-ui-express`
- [ ] Document all endpoints with examples

### Task 9.2: Basic Test Coverage (Optional but Recommended)
- [ ] Use Jest + Supertest for:
  - Sale order creation
  - PO receive → stock update
  - Payment FIFO allocation

---

## ✅ Final Checks
- [ ] All Prisma relations validated
- [ ] `.env` not committed (add to `.gitignore`)
- [ ] Error handling middleware
- [ ] Consistent response format: `{ success, data, message }`
- [ ] Migrations generated: `npx prisma migrate dev --name init`

---

This task list is **optimized for GitHub Copilot**: each subtask is atomic, uses clear naming, and follows REST + Prisma best practices. You can paste individual tasks into Copilot prompts (e.g., “Generate Prisma model for SaleOrder with status enum”) for rapid scaffolding.