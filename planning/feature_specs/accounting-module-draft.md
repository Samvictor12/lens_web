# Feature Spec: Accounting Module
**Version:** 0.1.0 (DRAFT — awaiting human approval)  
**Status:** DRAFT  
**Author:** orchestrator  
**Date:** 2026-05-26

---

## 1. Executive Summary

Add a complete accounting module to the Lens Management System that connects all financial events (billing, PO receipts, vendor payments, client payments, additional expenses) into a double-entry ledger, and produces reports: P&L, Ledger Statement, Trial Balance, Day Book, and Cash/Bank Book.

---

## 2. Codebase Audit Findings

### 2.1 What Already Exists (Foundation — Do Not Re-create)

| Asset | Location | State |
|---|---|---|
| `Ledger` model | `prisma/schema.prisma` | ✅ Schema exists (migration May 2026) |
| `FinancialTransaction` model | `prisma/schema.prisma` | ✅ Schema exists |
| `TransactionEntry` model | `prisma/schema.prisma` | ✅ Schema exists (double-entry lines) |
| `Invoice` + `Payment` models | `prisma/schema.prisma` | ✅ Full schema |
| `PurchaseOrder` + `PurchaseOrderReceipt` | `prisma/schema.prisma` | ✅ Full schema |
| `financialReports.routes.js` | `src/backend/routes/` | ⚠️ Route file exists, no controller |
| `expenses.routes.js` | `src/backend/routes/` | ⚠️ Route file exists, no controller |
| `Expenses.jsx` | `src/pages/` | ⚠️ UI exists but uses dummy data only |
| `Payments.jsx` | `src/pages/` | ⚠️ UI exists but uses dummy data only |

### 2.2 What Is Missing (Must Be Built)

| Gap | Impact |
|---|---|
| No `Expense` model in schema | Cannot record salary/petty cash/misc expenses |
| No `VendorPayment` model in schema | Cannot record payments made against a PO/vendor |
| No `ExpenseCategory` model in schema | Cannot categorize expense types |
| `FinancialReportController` — missing | `/api/financial-reports/*` routes are broken |
| `ExpenseController` — missing | `/api/expenses` routes are broken |
| No `LedgerController` | No CRUD for Chart of Accounts |
| No `FinancialTransactionController` | No journal entry management |
| No `VendorPaymentController` | Cannot record PO payments |
| No auto-posting hooks | Invoice/PO/Payment events don't create ledger entries |
| Frontend: all accounting pages use dummy data | No live data anywhere in Accounting UI |

### 2.3 Existing Enums (Reuse These)

```
TransactionType: SALE, PURCHASE, PAYMENT, RECEIPT, JOURNAL, CONTRA, OPENING_BALANCE, ADJUSTMENT
LedgerType:      ASSET, LIABILITY, INCOME, EXPENSE, EQUITY
EntryType:       DEBIT, CREDIT
ReferenceType:   SALE_ORDER, PURCHASE_ORDER, INVOICE, PAYMENT, RECEIPT, MANUAL
PaymentMethod:   CASH, UPI, CARD, BANK_TRANSFER, CHECK
```

---

## 3. Module Scope

### 3.1 Sub-Modules

#### A. Chart of Accounts (Ledger Master)
Manage the hierarchy of ledger accounts used across all financial transactions.

**Acceptance Criteria:**
- Create/edit/soft-delete ledgers with: ledgerCode (unique), ledgerName, ledgerType (ASSET/LIABILITY/INCOME/EXPENSE/EQUITY)
- Support parent-child hierarchy (parentLedgerId) for grouped reporting
- Mark system ledgers (Cash, Bank, Sales Revenue, Accounts Receivable, Accounts Payable, Purchase) as `isSystemLedger: true` — these cannot be deleted
- Set opening balance per ledger; currentBalance auto-updates with each transaction
- Bank ledgers store bankDetails JSON (account no, IFSC, branch)
- Seed default Chart of Accounts on first run

**Default System Ledgers to seed:**
| Code | Name | Type |
|---|---|---|
| AC-1001 | Cash in Hand | ASSET |
| AC-1002 | Bank Account | ASSET |
| AC-1003 | Accounts Receivable | ASSET |
| AC-1004 | Inventory / Stock | ASSET |
| AC-2001 | Accounts Payable | LIABILITY |
| AC-2002 | Salary Payable | LIABILITY |
| AC-3001 | Sales Revenue | INCOME |
| AC-3002 | Service Income | INCOME |
| AC-4001 | Purchase / Cost of Goods | EXPENSE |
| AC-4002 | Salary Expense | EXPENSE |
| AC-4003 | Petty Cash Expense | EXPENSE |
| AC-4004 | Rent Expense | EXPENSE |
| AC-4005 | Utilities Expense | EXPENSE |
| AC-4006 | Miscellaneous Expense | EXPENSE |
| AC-5001 | Owner's Capital | EQUITY |

---

#### B. PO Cost Connection (Purchase → Accounting)
When a `PurchaseOrderReceipt` is created and goods are inward, automatically post a financial transaction.

**Double-Entry Rule — PO Receipt:**
```
Dr  Inventory / Stock (AC-1004)        ← totalValue of receipt
Cr  Accounts Payable / Vendor (AC-2001) ← same amount
```
- `referenceType: PURCHASE_ORDER`, `referenceId: purchaseOrder.id`
- `transactionType: PURCHASE`
- One FinancialTransaction per receipt, with two TransactionEntries

**Acceptance Criteria:**
- Auto-post fires inside `POST /api/purchase-orders/:id/receive` controller after receipt is saved
- If posting fails, receipt save rolls back (Prisma transaction)
- The posted transaction is linked: `referenceType: PURCHASE_ORDER`, `referenceId`
- Vendor ledger balance (Accounts Payable) increases by receipt value

---

#### C. Vendor Payment (Pay Against PO)
Record cash/bank payments made to a vendor against an outstanding PO/receipt.

**New Schema Model: `VendorPayment`**
```prisma
model VendorPayment {
  id              Int           @id @default(autoincrement())
  paymentNumber   String        @unique  // VP-2026-001
  vendorId        Int
  vendor          Vendor        @relation(...)
  purchaseOrderId Int?          // optional — can pay without linking PO
  purchaseOrder   PurchaseOrder? @relation(...)
  amount          Decimal       @db.Decimal(15,2)
  paymentMethod   PaymentMethod // CASH, UPI, CARD, BANK_TRANSFER, CHECK
  paymentDate     DateTime      @default(now())
  referenceNo     String?       // Cheque/UPI ref
  notes           String?
  // Audit
  active_status   Boolean       @default(true)
  delete_status   Boolean       @default(false)
  createdAt       DateTime      @default(now())
  createdBy       Int
  updatedAt       DateTime      @updatedAt
  updatedBy       Int?
}
```

**Double-Entry Rule — Vendor Payment:**
```
Dr  Accounts Payable (AC-2001)   ← payment amount (reduces liability)
Cr  Cash in Hand / Bank (AC-1001 or AC-1002) ← payment amount
```
- `transactionType: PAYMENT`, `referenceType: PURCHASE_ORDER`
- Auto-post on `POST /api/vendor-payments`

**Acceptance Criteria:**
- List vendor payments filtered by vendor, date range, payment method
- Link payment to specific PO (optional)
- Auto-post double-entry on creation; no manual posting UI needed
- Show outstanding balance per vendor (total AP - total payments)

---

#### D. Client Payment for Billing (Invoice → Accounting)
When an Invoice is created and when a Payment is recorded, auto-post financial transactions.

**Double-Entry Rule — Invoice Created:**
```
Dr  Accounts Receivable (AC-1003)  ← invoice totalAmount
Cr  Sales Revenue (AC-3001)         ← invoice totalAmount
```

**Double-Entry Rule — Payment Received (client pays invoice):**
```
Dr  Cash / Bank (AC-1001 or AC-1002)  ← payment amount
Cr  Accounts Receivable (AC-1003)      ← payment amount
```

**Acceptance Criteria:**
- Auto-post on `POST /api/invoices` (invoice created)
- Auto-post on `POST /api/invoices/:id/payments` (payment received)
- `referenceType: INVOICE`, `referenceId: invoice.id`
- Payments.jsx page connects to live data: list invoices with outstanding balance, record payment via form
- Invoice status updates: DRAFT → ISSUED → PARTIALLY_PAID → PAID automatically based on paidAmount vs totalAmount

---

#### E. Additional Expense Entry
Record operational expenses: Salary, Petty Cash, Rent, Utilities, Miscellaneous.

**New Schema Model: `ExpenseCategory`**
```prisma
model ExpenseCategory {
  id            Int       @id @default(autoincrement())
  name          String    @unique  // "Salary", "Petty Cash", "Rent", "Utilities", "Miscellaneous"
  ledger_id     Int?      // Maps to EXPENSE ledger (AC-4001, AC-4002, etc.)
  ledger        Ledger?   @relation(...)
  active_status Boolean   @default(true)
  delete_status Boolean   @default(false)
  createdAt     DateTime  @default(now())
  createdBy     Int
  updatedAt     DateTime  @updatedAt
  updatedBy     Int?
}
```

**New Schema Model: `Expense`**
```prisma
model Expense {
  id              Int             @id @default(autoincrement())
  expenseNumber   String          @unique  // EXP-2026-001
  categoryId      Int
  category        ExpenseCategory @relation(...)
  amount          Decimal         @db.Decimal(15,2)
  paymentMethod   PaymentMethod
  expenseDate     DateTime        @default(now())
  description     String
  referenceNo     String?
  paidTo          String?         // payee name
  notes           String?
  // Audit
  active_status   Boolean         @default(true)
  delete_status   Boolean         @default(false)
  createdAt       DateTime        @default(now())
  createdBy       Int
  updatedAt       DateTime        @updatedAt
  updatedBy       Int?
}
```

**Double-Entry Rule — Expense Entry:**
```
Dr  [Category Ledger, e.g. Salary Expense AC-4002]  ← expense amount
Cr  Cash in Hand / Bank (AC-1001 or AC-1002)         ← expense amount
```
- `transactionType: JOURNAL`, `referenceType: MANUAL`
- Auto-post on `POST /api/expenses`

**Acceptance Criteria:**
- Create expense with: category, amount, date, paymentMethod, description, paidTo
- List expenses with filters: category, date range, paymentMethod
- Monthly expense summary grouped by category
- Expenses.jsx page connects to live API (replace dummy data)
- Expense category CRUD (Admin only)

---

#### F. Reports

##### F.1 — Profit & Loss Report
**Endpoint:** `GET /api/financial-reports/profit-loss?from=&to=`

Logic:
- **Income** = sum of CREDIT entries in INCOME-type ledgers in date range
- **Expenses** = sum of DEBIT entries in EXPENSE-type ledgers in date range
- **Gross Profit** = Income - Cost of Goods Sold (AC-4001)
- **Net Profit** = Gross Profit - Operating Expenses
- Breakdown by ledger within each category

**Frontend:** P&L page with date range picker, printable layout

##### F.2 — Ledger Statement (Ledger Book)
**Endpoint:** `GET /api/financial-reports/ledger-statement?ledgerId=&from=&to=`

Logic:
- All TransactionEntries for a ledger in date range
- Running balance column (opening balance + each entry)
- Debit/Credit columns with narration and reference

**Frontend:** Select ledger from dropdown, pick date range, show statement table with running balance

##### F.3 — Trial Balance
**Endpoint:** `GET /api/financial-reports/trial-balance?asOf=`

Logic:
- All ledgers with net debit total and net credit total
- Total debits must equal total credits (validation)
- Group by ledger type

**Frontend:** Table view, export to PDF

##### F.4 — Day Book (existing summary endpoint, extend)
**Endpoint:** `GET /api/financial-reports/day-book?date=`

Logic:
- All FinancialTransactions for a given date with their entries

##### F.5 — Cash / Bank Book
**Endpoint:** `GET /api/financial-reports/cash-bank-book?ledgerId=&from=&to=`

Logic:
- Statement for Cash (AC-1001) or Bank (AC-1002) ledger
- Same as ledger statement but pre-filtered to cash/bank ledgers

---

## 4. API Contract (Draft — to be locked in Phase 2)

### New Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/ledgers` | List all ledgers |
| POST | `/api/ledgers` | Create ledger |
| GET | `/api/ledgers/:id` | Get ledger by ID |
| PUT | `/api/ledgers/:id` | Update ledger |
| DELETE | `/api/ledgers/:id` | Soft delete (non-system) |
| GET | `/api/financial-transactions` | List transactions with filters |
| POST | `/api/financial-transactions` | Create manual journal entry |
| GET | `/api/financial-transactions/:id` | Get transaction + entries |
| GET | `/api/vendor-payments` | List vendor payments |
| POST | `/api/vendor-payments` | Record vendor payment (auto-posts) |
| GET | `/api/vendor-payments/:id` | Get by ID |
| GET | `/api/expenses` | List expenses (connect to real data) |
| POST | `/api/expenses` | Create expense (auto-posts) |
| PUT | `/api/expenses/:id` | Update expense |
| DELETE | `/api/expenses/:id` | Soft delete |
| GET | `/api/expense-categories` | List expense categories |
| POST | `/api/expense-categories` | Create category |
| GET | `/api/financial-reports/profit-loss` | P&L report |
| GET | `/api/financial-reports/ledger-statement` | Ledger statement |
| GET | `/api/financial-reports/trial-balance` | Trial balance |
| GET | `/api/financial-reports/day-book` | Day book |
| GET | `/api/financial-reports/cash-bank-book` | Cash/bank book |
| GET | `/api/financial-reports/summary` | Dashboard summary |

### Extended Endpoints (hooks added to existing)

| Method | Endpoint | Change |
|---|---|---|
| POST | `/api/purchase-orders/:id/receive` | Add auto-post PURCHASE transaction |
| POST | `/api/invoices` | Add auto-post SALE transaction |
| POST | `/api/invoices/:id/payments` | Add auto-post RECEIPT transaction |

---

## 5. Schema Changes Required

### 5.1 New Models
- `ExpenseCategory` (with ledger_id FK to Ledger)
- `Expense` (with categoryId, amount, paymentMethod, expenseDate)
- `VendorPayment` (with vendorId, purchaseOrderId, amount, paymentMethod)

### 5.2 New Relations on Existing Models
- `Vendor` → `VendorPayment[]`
- `PurchaseOrder` → `VendorPayment[]`
- `Ledger` → `ExpenseCategory[]`
- `User` → audit relations for VendorPayment, Expense, ExpenseCategory

### 5.3 No Breaking Changes
All new models are additive. Existing `Ledger`, `FinancialTransaction`, `TransactionEntry` schemas are unchanged.

---

## 6. Frontend Pages Required

| Page | Route | Status |
|---|---|---|
| Chart of Accounts | `/accounting/ledgers` | New |
| Journal Entry | `/accounting/journal` | New |
| Vendor Payments | `/accounting/vendor-payments` | New |
| Expense Entry | `/accounting/expenses` | Replace dummy data in Expenses.jsx |
| Expense Categories | `/accounting/expense-categories` | New |
| Client Payments | `/accounting/payments` | Replace dummy data in Payments.jsx |
| P&L Report | `/accounting/reports/profit-loss` | New |
| Ledger Statement | `/accounting/reports/ledger-statement` | New |
| Trial Balance | `/accounting/reports/trial-balance` | New |
| Day Book | `/accounting/reports/day-book` | New |
| Cash/Bank Book | `/accounting/reports/cash-bank-book` | New |

---

## 7. Implementation Order (Recommended)

1. **Schema migration** — Add `ExpenseCategory`, `Expense`, `VendorPayment` models
2. **Ledger Controller + Routes** — CRUD for chart of accounts + seed default ledgers
3. **FinancialTransaction Controller** — Manual journal entry CRUD
4. **Auto-posting hooks** — Wire into existing PO receipt, Invoice create, Invoice payment
5. **Expense Controller** — CRUD + auto-post expense transactions
6. **VendorPayment Controller** — CRUD + auto-post payment transactions
7. **Financial Reports Controller** — P&L, Ledger Statement, Trial Balance, Day Book, Cash Book
8. **Frontend — Master data** — Chart of Accounts page, Expense Categories
9. **Frontend — Transactions** — Journal Entry, Vendor Payments, Expense Entry, Client Payments
10. **Frontend — Reports** — P&L, Ledger Statement, Trial Balance, Day Book, Cash Book

---

## 8. Acceptance Criteria Summary

- [ ] Chart of Accounts CRUD works; system ledgers cannot be deleted
- [ ] PO receipt auto-creates a PURCHASE FinancialTransaction (Dr Inventory, Cr AP)
- [ ] Vendor payment auto-creates a PAYMENT transaction (Dr AP, Cr Cash/Bank)
- [ ] Invoice creation auto-creates a SALE transaction (Dr AR, Cr Sales Revenue)
- [ ] Client payment auto-creates a RECEIPT transaction (Dr Cash/Bank, Cr AR)
- [ ] Expense entry auto-creates a JOURNAL transaction (Dr Expense Ledger, Cr Cash/Bank)
- [ ] Debit total = Credit total in all FinancialTransactions (enforced in service layer)
- [ ] P&L Report returns Income, COGS, Gross Profit, Operating Expenses, Net Profit for any date range
- [ ] Ledger Statement returns running balance for any ledger + date range
- [ ] Trial Balance returns all ledgers with net debit/credit; totals balance
- [ ] Day Book returns all transactions for a given date
- [ ] Expenses.jsx and Payments.jsx use real API data (no dummy data)
- [ ] All new routes protected by `requireRole(['Accounts', 'Admin'])`
- [ ] All new models follow soft-delete pattern and carry full audit fields

---

## 9. Open Questions (for human review)

1. Should vendor payments require a linked PO, or allow free-form payment to any vendor?
2. Should salary expenses link to a specific `User` record (employee), or just a free-text `paidTo`?
3. Should the P&L report also show GST/tax breakdown separately?
4. Is bank reconciliation (marking transactions as reconciled) in scope for this phase?
5. Should expense approval workflow (create → approve → post) be added, or auto-post immediately?
6. Multi-bank account support: is one `Bank Account` ledger sufficient, or do you need multiple bank ledgers (e.g., HDFC, SBI separately)?
