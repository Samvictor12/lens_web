# API Contract: Accounting Module — v1.0.0
**Status:** DRAFT — awaiting approval
**Spec version locked:** accounting-module-v1.0.0
**Date:** 2026-05-26
**Stack:** Express.js (TS) + Prisma + PostgreSQL

> All endpoints: `Authorization: Bearer <accessToken>` required.
> All roles: `requireRole(['Accounts', 'Admin'])` unless stated otherwise.
> All responses follow the existing standard: `{ success, data, message, pagination? }`

---

## Part 1 — Prisma Schema Diff

### 1.1 New Models

```prisma
// ── Vendor Payment Voucher ──────────────────────────────────────
model VendorPaymentVoucher {
  id            Int      @id @default(autoincrement())
  voucherNumber String   @unique   // Auto: VPV-2026-001
  vendorId      Int
  paymentDate   DateTime @default(now())
  totalAmount   Decimal  @db.Decimal(15,2)
  paymentMethod PaymentMethod
  bankLedgerId  Int                // Cash or bank Ledger used for payment
  referenceNo   String?
  notes         String?
  active_status Boolean  @default(true)
  delete_status Boolean  @default(false)
  createdAt     DateTime @default(now())
  createdBy     Int
  updatedAt     DateTime @updatedAt
  updatedBy     Int?
  vendor        Vendor   @relation("vendorPaymentVouchers", fields: [vendorId], references: [id])
  bankLedger    Ledger   @relation("vpvBankLedger", fields: [bankLedgerId], references: [id])
  createdByUser User     @relation("vpvCreatedBy", fields: [createdBy], references: [id])
  updatedByUser User?    @relation("vpvUpdatedBy", fields: [updatedBy], references: [id])
  items         VendorPaymentVoucherItem[]
  @@index([vendorId])
  @@index([paymentDate])
}

model VendorPaymentVoucherItem {
  id              Int                  @id @default(autoincrement())
  voucherId       Int
  purchaseOrderId Int
  allocatedAmount Decimal              @db.Decimal(15,2)
  notes           String?
  voucher         VendorPaymentVoucher @relation(fields: [voucherId], references: [id], onDelete: Cascade)
  purchaseOrder   PurchaseOrder        @relation("poPaymentItems", fields: [purchaseOrderId], references: [id])
  @@index([voucherId])
}

// ── Expense Category ────────────────────────────────────────────
model ExpenseCategory {
  id            Int       @id @default(autoincrement())
  name          String    @unique
  ledger_id     Int?      // Maps to EXPENSE-type Ledger
  active_status Boolean   @default(true)
  delete_status Boolean   @default(false)
  createdAt     DateTime  @default(now())
  createdBy     Int
  updatedAt     DateTime  @updatedAt
  updatedBy     Int?
  ledger        Ledger?   @relation("expCategoryLedger", fields: [ledger_id], references: [id])
  createdByUser User      @relation("expCatCreatedBy", fields: [createdBy], references: [id])
  updatedByUser User?     @relation("expCatUpdatedBy", fields: [updatedBy], references: [id])
  expenses      Expense[]
}

// ── Expense ─────────────────────────────────────────────────────
model Expense {
  id            Int             @id @default(autoincrement())
  expenseNumber String          @unique   // Auto: EXP-2026-001
  categoryId    Int
  amount        Decimal         @db.Decimal(15,2)
  paymentMethod PaymentMethod
  bankLedgerId  Int             // Cash/bank Ledger used
  expenseDate   DateTime        @default(now())
  description   String
  referenceNo   String?
  paidTo        String?         // Free-text payee
  notes         String?
  active_status Boolean         @default(true)
  delete_status Boolean         @default(false)
  createdAt     DateTime        @default(now())
  createdBy     Int
  updatedAt     DateTime        @updatedAt
  updatedBy     Int?
  category      ExpenseCategory @relation(fields: [categoryId], references: [id])
  bankLedger    Ledger          @relation("expenseBankLedger", fields: [bankLedgerId], references: [id])
  createdByUser User            @relation("expenseCreatedBy", fields: [createdBy], references: [id])
  updatedByUser User?           @relation("expenseUpdatedBy", fields: [updatedBy], references: [id])
  logs          ExpenseLog[]
  @@index([expenseDate])
  @@index([categoryId])
}

// ── Expense Log ─────────────────────────────────────────────────
model ExpenseLog {
  id          Int      @id @default(autoincrement())
  expenseId   Int
  oldValues   Json
  newValues   Json
  changeNote  String?
  createdAt   DateTime @default(now())
  createdBy   Int
  expense     Expense  @relation(fields: [expenseId], references: [id])
  createdByUser User   @relation("expLogCreatedBy", fields: [createdBy], references: [id])
  @@index([expenseId])
}
```

### 1.2 Fields Added to Existing Models

```prisma
// Invoice — add tax and payment ledger fields
model Invoice {
  // ... existing fields ...
  taxAmount     Decimal  @default(0) @db.Decimal(15,2)  // ADD
  bankLedgerId  Int?                                      // ADD — ledger where payment is deposited
  bankLedger    Ledger?  @relation("invoicePaymentLedger", ...)  // ADD
}

// FinancialTransaction — add reconciliation tracking
model FinancialTransaction {
  // ... existing fields (isReconciled, reconciledDate already exist) ...
  reconciledBy   Int?     // ADD — User who reconciled
  reconciledNote String?  // ADD — reconciliation note
}

// Vendor — add relation
model Vendor {
  // ... existing fields ...
  vendorPaymentVouchers VendorPaymentVoucher[] @relation("vendorPaymentVouchers")  // ADD
}

// PurchaseOrder — add relation
model PurchaseOrder {
  // ... existing fields ...
  paymentVoucherItems VendorPaymentVoucherItem[] @relation("poPaymentItems")  // ADD
}

// Ledger — add relations
model Ledger {
  // ... existing fields ...
  expenseCategories    ExpenseCategory[]          @relation("expCategoryLedger")   // ADD
  expensesBankLedger   Expense[]                  @relation("expenseBankLedger")   // ADD
  vpvBankLedger        VendorPaymentVoucher[]     @relation("vpvBankLedger")       // ADD
  invoicePayments      Invoice[]                  @relation("invoicePaymentLedger") // ADD
}

// User — add audit relations (add to existing User model)
// vpvCreatedBy, vpvUpdatedBy, expCatCreatedBy, expCatUpdatedBy,
// expenseCreatedBy, expenseUpdatedBy, expLogCreatedBy
```

---

## Part 2 — API Endpoints Contract

### 2.1 Chart of Accounts (Ledger)

#### `GET /api/ledgers`
**Query:** `?type=ASSET|LIABILITY|INCOME|EXPENSE|EQUITY&parentId=&search=&page=&limit=`
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "ledgerCode": "AC-1001",
      "ledgerName": "Cash in Hand",
      "ledgerType": "ASSET",
      "parentLedgerId": null,
      "openingBalance": "0.00",
      "currentBalance": "15000.00",
      "isSystemLedger": true,
      "bankDetails": null,
      "active_status": true,
      "childLedgers": []
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 16, "totalPages": 1 }
}
```

#### `POST /api/ledgers`
**Body:**
```json
{
  "ledgerCode": "AC-1006",
  "ledgerName": "HDFC Current Account",
  "ledgerType": "ASSET",
  "parentLedgerId": null,
  "openingBalance": 50000.00,
  "description": "Main business current account",
  "bankDetails": {
    "accountNumber": "XXXX1234",
    "ifsc": "HDFC0001234",
    "branch": "Mumbai Main"
  }
}
```
**Validation:** `ledgerCode` unique, `ledgerType` required, `openingBalance` >= 0.
**Response:** `{ success: true, data: Ledger, message: "Ledger created" }`

#### `GET /api/ledgers/:id`
**Response:** Full ledger with `childLedgers[]` and `parentLedger`

#### `PUT /api/ledgers/:id`
**Restriction:** Cannot change `ledgerType` or delete if `isSystemLedger: true`
**Body:** Partial update (same fields as POST, all optional)

#### `DELETE /api/ledgers/:id`
**Restriction:** Blocked if `isSystemLedger: true` → 400 error
**Restriction:** Blocked if ledger has TransactionEntries → 409 error
**Action:** Soft delete (`delete_status: true`)

---

### 2.2 Financial Transactions (Journal)

#### `GET /api/financial-transactions`
**Query:** `?type=SALE|PURCHASE|PAYMENT|RECEIPT|JOURNAL|CONTRA&from=&to=&referenceType=&referenceId=&isPosted=&page=&limit=`
**Response:** List of FinancialTransaction with `entries[]` (each with ledger name)

#### `POST /api/financial-transactions`
**Purpose:** Manual journal entry only. Auto-posting is internal.
**Body:**
```json
{
  "transactionDate": "2026-05-26",
  "description": "Opening balance adjustment",
  "entries": [
    { "ledgerId": 1, "entryType": "DEBIT", "amount": 5000.00, "description": "Cash opening balance" },
    { "ledgerId": 13, "entryType": "CREDIT", "amount": 5000.00, "description": "Capital contribution" }
  ],
  "notes": "Initial setup entry"
}
```
**Validation:** `entries` length >= 2; sum of DEBIT amounts must equal sum of CREDIT amounts → 400 if unbalanced.
**Response:** `{ success: true, data: FinancialTransaction & { entries[] }, message: "Journal entry posted" }`

#### `GET /api/financial-transactions/:id`
**Response:** Full transaction with all entries + ledger names

---

### 2.3 Vendor Payment Voucher

#### `GET /api/vendor-payments`
**Query:** `?vendorId=&from=&to=&paymentMethod=&page=&limit=`
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "voucherNumber": "VPV-2026-001",
      "vendorId": 3,
      "vendorName": "Acme Lens Co.",
      "paymentDate": "2026-05-26",
      "totalAmount": "15000.00",
      "paymentMethod": "BANK_TRANSFER",
      "bankLedgerName": "HDFC Current Account",
      "referenceNo": "TXN-98765",
      "items": [
        { "purchaseOrderId": 10, "poNumber": "PO-2026-010", "allocatedAmount": "8000.00" },
        { "purchaseOrderId": 11, "poNumber": "PO-2026-011", "allocatedAmount": "7000.00" }
      ]
    }
  ]
}
```

#### `GET /api/vendor-payments/outstanding?vendorId=`
**Purpose:** Returns all POs for a vendor that have outstanding (unpaid) balance.
**Response:**
```json
{
  "success": true,
  "data": {
    "vendorId": 3,
    "vendorName": "Acme Lens Co.",
    "totalPayable": "32000.00",
    "totalPaid": "15000.00",
    "outstanding": "17000.00",
    "purchaseOrders": [
      {
        "purchaseOrderId": 12,
        "poNumber": "PO-2026-012",
        "totalValue": "12000.00",
        "paidAmount": "0.00",
        "outstanding": "12000.00"
      }
    ]
  }
}
```

#### `POST /api/vendor-payments`
**Body:**
```json
{
  "vendorId": 3,
  "paymentDate": "2026-05-26",
  "paymentMethod": "BANK_TRANSFER",
  "bankLedgerId": 6,
  "referenceNo": "TXN-98765",
  "notes": "Payment for May supplies",
  "items": [
    { "purchaseOrderId": 10, "allocatedAmount": 8000.00 },
    { "purchaseOrderId": 11, "allocatedAmount": 7000.00 }
  ]
}
```
**Validation:**
- `vendorId`, `bankLedgerId`, `paymentMethod`, `items` required
- `items` length >= 1
- `totalAmount` = sum of `items[].allocatedAmount` (computed server-side)
- All `purchaseOrderId`s must belong to `vendorId`
- `bankLedgerId` must be ASSET ledger with `active_status: true`

**Auto-post:**
```
Dr  Accounts Payable (AC-2001)     totalAmount
Cr  [bankLedgerId]                 totalAmount
transactionType: PAYMENT
referenceType: PURCHASE_ORDER
referenceNumber: voucherNumber
```

**Response:** `{ success: true, data: VendorPaymentVoucher & { items[], financialTransactionId }, message: "Payment voucher created" }`

#### `GET /api/vendor-payments/:id`
**Response:** Full voucher with items, vendor, bank ledger name

---

### 2.4 Expense Categories

#### `GET /api/expense-categories`
**Response:** List of active ExpenseCategory with ledger name

#### `POST /api/expense-categories`
```json
{ "name": "Office Supplies", "ledger_id": 14 }
```

#### `PUT /api/expense-categories/:id`
#### `DELETE /api/expense-categories/:id` — soft delete; blocked if expenses reference it

---

### 2.5 Expenses

#### `GET /api/expenses`
**Query:** `?categoryId=&from=&to=&paymentMethod=&page=&limit=`
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "expenseNumber": "EXP-2026-001",
      "categoryName": "Salary",
      "amount": "25000.00",
      "paymentMethod": "BANK_TRANSFER",
      "bankLedgerName": "HDFC Current Account",
      "expenseDate": "2026-05-01",
      "description": "May salary - Rahul",
      "paidTo": "Rahul Kumar",
      "logsCount": 0
    }
  ]
}
```

#### `GET /api/expenses/summary`
**Query:** `?from=&to=`
**Response:**
```json
{
  "success": true,
  "data": {
    "totalExpenses": "85000.00",
    "byCategory": [
      { "categoryName": "Salary", "total": "50000.00", "count": 2 },
      { "categoryName": "Petty Cash", "total": "5000.00", "count": 8 }
    ],
    "byMonth": [
      { "month": "2026-05", "total": "85000.00" }
    ]
  }
}
```

#### `POST /api/expenses`
```json
{
  "categoryId": 2,
  "amount": 25000.00,
  "paymentMethod": "BANK_TRANSFER",
  "bankLedgerId": 6,
  "expenseDate": "2026-05-01",
  "description": "May salary - Rahul",
  "paidTo": "Rahul Kumar",
  "referenceNo": "SAL-2026-05-001",
  "notes": null
}
```
**Auto-post:**
```
Dr  [category.ledger]    amount   (e.g. Salary Expense AC-4002)
Cr  [bankLedgerId]       amount
transactionType: JOURNAL
referenceType: MANUAL
```

#### `PUT /api/expenses/:id`
**Edit with log behaviour:**
1. Save `ExpenseLog { oldValues: snapshot, newValues: incoming }`
2. Post reversing FinancialTransaction (swap Dr/Cr of original)
3. Post new FinancialTransaction with updated values
4. Update Expense record
**Body:** Same fields as POST (all optional for partial update)

#### `DELETE /api/expenses/:id` — soft delete only

#### `GET /api/expenses/:id/logs`
**Response:** All `ExpenseLog` records for an expense in reverse chronological order

---

### 2.6 Modified Existing Endpoints

#### `POST /api/purchase-orders/:id/receive` (existing — add hook)
**Added behaviour (inside Prisma transaction):**
- After receipt saved, create FinancialTransaction:
  ```
  Dr  Inventory/Stock (AC-1004)     receipt.subtotal
  Dr  GST Input Credit (AC-1005)    receipt.taxAmount  [if taxAmount > 0]
  Cr  Accounts Payable (AC-2001)    receipt.totalValue
  transactionType: PURCHASE
  ```
- If any DB write fails → entire transaction rolls back

#### `POST /api/invoices` (existing — add hook)
**Added behaviour:**
```
Dr  Accounts Receivable (AC-1003)  invoice.totalAmount
Cr  Sales Revenue (AC-3001)        invoice.totalAmount - invoice.taxAmount
Cr  GST Output Payable (AC-2003)   invoice.taxAmount  [if taxAmount > 0]
transactionType: SALE
```
**New body field accepted:** `taxAmount` (optional, default 0)

#### `POST /api/invoices/:id/payments` (existing — add hook)
**New body field required:** `bankLedgerId` (which cash/bank ledger receives the payment)
**Added behaviour:**
```
Dr  [bankLedgerId]                payment.amount
Cr  Accounts Receivable (AC-1003) payment.amount
transactionType: RECEIPT
referenceType: INVOICE
```
**Invoice status auto-update:** ISSUED → PARTIALLY_PAID → PAID based on paidAmount vs totalAmount

---

### 2.7 Bank Reconciliation

#### `GET /api/bank-reconciliation`
**Query:** `?ledgerId=&from=&to=&isReconciled=`
**Restriction:** `ledgerId` must be an ASSET ledger
**Response:**
```json
{
  "success": true,
  "data": {
    "ledgerName": "HDFC Current Account",
    "openingBalance": "50000.00",
    "reconciledBalance": "45000.00",
    "unreconciledBalance": "5000.00",
    "transactions": [
      {
        "transactionId": 101,
        "transactionNumber": "TXN-2026-00101",
        "transactionDate": "2026-05-20",
        "description": "Vendor payment - Acme",
        "entryType": "CREDIT",
        "amount": "15000.00",
        "isReconciled": false,
        "reconciledDate": null
      }
    ]
  }
}
```

#### `PUT /api/bank-reconciliation/mark`
**Body:**
```json
{
  "transactionIds": [101, 102, 103],
  "isReconciled": true,
  "reconciledNote": "Matched against HDFC May statement"
}
```
**Response:** `{ success: true, data: { updated: 3 }, message: "Transactions marked as reconciled" }`

---

### 2.8 Financial Reports

#### `GET /api/financial-reports/profit-loss`
**Query:** `?from=2026-05-01&to=2026-05-31`
**Response:**
```json
{
  "success": true,
  "data": {
    "period": { "from": "2026-05-01", "to": "2026-05-31" },
    "income": {
      "total": "250000.00",
      "breakdown": [
        { "ledgerCode": "AC-3001", "ledgerName": "Sales Revenue", "amount": "230000.00" },
        { "ledgerCode": "AC-3002", "ledgerName": "Service Income", "amount": "20000.00" }
      ]
    },
    "gstOutput": { "total": "22500.00", "ledgerName": "GST Output Payable" },
    "netRevenue": "227500.00",
    "costOfGoodsSold": {
      "total": "150000.00",
      "breakdown": [
        { "ledgerCode": "AC-4001", "ledgerName": "Purchase / Cost of Goods", "amount": "150000.00" }
      ]
    },
    "grossProfit": "77500.00",
    "gstInput": { "total": "13500.00", "ledgerName": "GST Input Credit" },
    "operatingExpenses": {
      "total": "35000.00",
      "breakdown": [
        { "ledgerCode": "AC-4002", "ledgerName": "Salary Expense", "amount": "25000.00" },
        { "ledgerCode": "AC-4005", "ledgerName": "Utilities Expense", "amount": "5000.00" },
        { "ledgerCode": "AC-4006", "ledgerName": "Miscellaneous Expense", "amount": "5000.00" }
      ]
    },
    "netProfit": "42500.00",
    "isProfit": true
  }
}
```

#### `GET /api/financial-reports/ledger-statement`
**Query:** `?ledgerId=1&from=2026-05-01&to=2026-05-31`
**Response:**
```json
{
  "success": true,
  "data": {
    "ledger": { "id": 1, "ledgerCode": "AC-1001", "ledgerName": "Cash in Hand", "ledgerType": "ASSET" },
    "openingBalance": "15000.00",
    "closingBalance": "8500.00",
    "entries": [
      {
        "date": "2026-05-02",
        "transactionNumber": "TXN-2026-00045",
        "referenceNumber": "EXP-2026-003",
        "narration": "Petty cash - stationery",
        "debit": "0.00",
        "credit": "500.00",
        "balance": "14500.00",
        "isReconciled": false
      }
    ]
  }
}
```

#### `GET /api/financial-reports/trial-balance`
**Query:** `?asOf=2026-05-31`
**Response:**
```json
{
  "success": true,
  "data": {
    "asOf": "2026-05-31",
    "isBalanced": true,
    "totalDebit": "500000.00",
    "totalCredit": "500000.00",
    "ledgers": [
      {
        "ledgerCode": "AC-1001",
        "ledgerName": "Cash in Hand",
        "ledgerType": "ASSET",
        "totalDebit": "150000.00",
        "totalCredit": "80000.00",
        "netBalance": "70000.00",
        "normalBalance": "DEBIT"
      }
    ]
  }
}
```

#### `GET /api/financial-reports/day-book`
**Query:** `?date=2026-05-26`
**Response:**
```json
{
  "success": true,
  "data": {
    "date": "2026-05-26",
    "totalTransactions": 4,
    "totalAmount": "85000.00",
    "transactions": [
      {
        "transactionNumber": "TXN-2026-00101",
        "transactionType": "PURCHASE",
        "description": "PO receipt — PO-2026-015",
        "totalAmount": "12000.00",
        "entries": [
          { "ledgerName": "Inventory / Stock", "entryType": "DEBIT", "amount": "11000.00" },
          { "ledgerName": "GST Input Credit", "entryType": "DEBIT", "amount": "1000.00" },
          { "ledgerName": "Accounts Payable", "entryType": "CREDIT", "amount": "12000.00" }
        ]
      }
    ]
  }
}
```

#### `GET /api/financial-reports/cash-bank-book`
**Query:** `?ledgerId=6&from=2026-05-01&to=2026-05-31`
**Same response shape as ledger-statement** but additionally includes `isReconciled` per row.

#### `GET /api/financial-reports/summary`
**Query:** `?from=&to=`
**Response:**
```json
{
  "success": true,
  "data": {
    "cashBalance": "8500.00",
    "bankBalances": [
      { "ledgerName": "HDFC Current Account", "balance": "45000.00" }
    ],
    "totalReceivable": "32000.00",
    "totalPayable": "17000.00",
    "monthlyIncome": "250000.00",
    "monthlyExpenses": "185000.00",
    "netProfit": "42500.00"
  }
}
```

---

## Part 3 — Controller & File Map

| Controller File | Route File | Mounts At |
|---|---|---|
| `ledgerController.js` | `ledger.routes.js` | `/api/ledgers` |
| `financialTransactionController.js` | `financialTransactions.routes.js` | `/api/financial-transactions` |
| `vendorPaymentController.js` | `vendorPayment.routes.js` | `/api/vendor-payments` |
| `expenseCategoryController.js` | `expenseCategory.routes.js` | `/api/expense-categories` |
| `expenseController.js` | `expenses.routes.js` (REPLACE stub) | `/api/expenses` |
| `bankReconciliationController.js` | `bankReconciliation.routes.js` | `/api/bank-reconciliation` |
| `financialReportController.js` | `financialReports.routes.js` (REPLACE stub) | `/api/financial-reports` |

**Shared Service (internal, no route):**
- `accountingService.js` — `postTransaction(entries[], meta)` — validates Dr=Cr, creates FinancialTransaction + TransactionEntries + updates Ledger.currentBalance in one Prisma transaction

**Auto-posting wired into existing controllers:**
- `purchaseOrderController.js` → call `accountingService.postPurchaseReceipt(receipt)`
- `invoiceController.js` → call `accountingService.postInvoice(invoice)`
- `invoiceController.js` → call `accountingService.postClientPayment(payment, bankLedgerId)`

---

## Part 4 — Number Sequencing

All new document numbers follow the existing pattern (year-based sequential):

| Model | Format | Example |
|---|---|---|
| VendorPaymentVoucher | `VPV-YYYY-NNNN` | VPV-2026-0001 |
| Expense | `EXP-YYYY-NNNN` | EXP-2026-0001 |
| FinancialTransaction | `TXN-YYYY-NNNNN` | TXN-2026-00001 (already defined) |

Sequence generated by: query `MAX(voucherNumber)` for the current year → increment → format.

---

## Part 5 — Implementation Phase Order

| Phase | Work | Dependencies |
|---|---|---|
| **P1 Schema** | Prisma migration: add 5 models + field additions | None |
| **P2 Ledger CRUD** | `ledgerController.js` + seed script | P1 |
| **P3 Accounting Service** | `accountingService.js` (Dr=Cr validation + posting) | P1, P2 |
| **P4 Auto-hooks** | Wire PO receipt + Invoice + Payment into service | P3 |
| **P5 Expense** | `expenseCategoryController.js` + `expenseController.js` | P3 |
| **P6 Vendor Payment** | `vendorPaymentController.js` | P3 |
| **P6 Bank Recon** | `bankReconciliationController.js` | P4 |
| **P7 Reports** | `financialReportController.js` (all 5 reports) | P4, P5, P6 |
| **P8 FE Masters** | Chart of Accounts page, Expense Categories | P2 |
| **P9 FE Transactions** | Expenses, Vendor Payments, Client Payments, Journal | P5, P6 |
| **P10 FE Reports** | P&L, Ledger Statement, Trial Balance, Day Book, Cash Book | P7 |
| **P11 FE Reconciliation** | Bank Reconciliation page | P6 |
