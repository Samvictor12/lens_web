# Accounting Module — Reference Document

**Project:** LensFlow Optic Hub  
**Date:** 2026-05-29  
**Prepared by:** Orchestrator (automated QA run)  
**Test Result:** ✅ 45/45 tests passing

---

## 1. Overview

The Accounting module implements a full **double-entry bookkeeping** system on top of the Lens billing platform. Every financial event (invoice raised, payment received, vendor payment, expense) creates a balanced journal entry in the `FinancialTransaction` + `TransactionEntry` tables, with automatic running-balance updates on each affected `Ledger`.

---

## 2. Architecture

```
Frontend Pages (JSX)
    │
    ├── ChartOfAccounts.jsx      ← Ledger CRUD
    ├── BankReconciliation.jsx   ← Mark entries reconciled
    ├── VendorPayments.jsx       ← Vendor payment vouchers
    ├── ExpensesMain.jsx         ← Expense recording
    ├── ExpenseCategories.jsx    ← Expense category master
    └── FinancialReports.jsx     ← P&L, Trial Balance, Ledger Statement, Day Book, Cash-Bank Book

Frontend Services (API clients)
    └── src/services/{ledger,invoice,vendorPayment,expense,financialReport,bankReconciliation}.js

Backend Routes → Controllers → Services
    ├── ledger.routes.js         → ledgerController.js       → ledgerService.js
    ├── invoices.routes.js       → invoiceController.js      → invoiceService.js
    ├── vendorPayment.routes.js  → vendorPaymentController.js→ vendorPaymentService.js
    ├── expenses.routes.js       → expenseController.js      → expenseService.js
    ├── financialReports.routes.js→financialReportController.js→financialReportService.js
    └── bankReconciliation.routes.js→bankReconciliationController.js→bankReconciliationService.js

Core GL Engine
    └── accountingService.js     ← All services call this for journal posting
```

---

## 3. Database Schema

### 3.1 Core Accounting Tables

| Table | Purpose |
|---|---|
| `Ledger` | Chart of accounts (ASSET/LIABILITY/INCOME/EXPENSE/EQUITY) |
| `FinancialTransaction` | Journal header — one per business event |
| `TransactionEntry` | Journal lines — debit/credit per ledger |
| `Invoice` | Customer invoices linked to SaleOrders |
| `Payment` | Payment receipts against an Invoice |
| `VendorPaymentVoucher` | Vendor payment header |
| `VendorPaymentVoucherItem` | Allocation of voucher amount to Purchase Orders |
| `ExpenseCategory` | Expense category master (Salary, Rent, etc.) |
| `Expense` | Individual expense records |
| `ExpenseLog` | Audit trail for expense edits |

### 3.2 Key Enums

| Enum | Values |
|---|---|
| `LedgerType` | `ASSET`, `LIABILITY`, `INCOME`, `EXPENSE`, `EQUITY` |
| `TransactionType` | `SALE`, `PURCHASE`, `PAYMENT`, `RECEIPT`, `JOURNAL`, `CONTRA`, `OPENING_BALANCE`, `ADJUSTMENT` |
| `EntryType` | `DEBIT`, `CREDIT` |
| `InvoiceStatus` | `DRAFT`, `ISSUED`, `PARTIALLY_PAID`, `PAID`, `CANCELLED` |
| `PaymentMethod` | `CASH`, `UPI`, `CARD`, `BANK_TRANSFER`, `CHECK` |

### 3.3 Ledger Model

```prisma
model Ledger {
  id               Int       @id @default(autoincrement())
  ledgerCode       String    @unique
  ledgerName       String
  ledgerType       LedgerType
  parentLedgerId   Int?
  openingBalance   Decimal   @default(0)
  currentBalance   Decimal   @default(0)
  isSystemLedger   Boolean   @default(false)
  bankDetails      String?
  description      String?
  active_status    Boolean   @default(true)
  delete_status    Boolean   @default(false)
  createdBy        Int
  updatedBy        Int?
}
```

### 3.4 FinancialTransaction + TransactionEntry

```
FinancialTransaction (header)
  transactionNumber   TXN-YYYY-NNNNN
  transactionDate
  transactionType     (SALE | PURCHASE | PAYMENT | RECEIPT | JOURNAL | …)
  referenceType       (INVOICE | PURCHASE_ORDER | MANUAL | …)
  referenceId
  totalAmount         = sum of debit entries
  isPosted            always true after GL posting

  ── has many ──>

TransactionEntry (lines)
  ledgerId
  entryType           DEBIT | CREDIT
  amount
  description
```

---

## 4. System Ledgers

These 20 ledgers are seeded by `prisma/seed/financial-ledgers-seed.js`. **Never delete them** — all auto-posting functions look them up by code.

| Code | Name | Type | Used In |
|---|---|---|---|
| `AC-1001` | Cash In Hand | ASSET | `postClientPayment` (if cash ledger selected) |
| `AC-1002` | Bank Account (HDFC) | ASSET | `postClientPayment`, `postVendorPayment`, `postExpense` |
| `AC-1003` | Accounts Receivable | ASSET | `postInvoice` (Dr), `postClientPayment` (Cr) |
| `AC-1004` | Inventory / Stock | ASSET | `postPurchaseReceipt` (Dr) |
| `AC-1005` | GST Input Credit | ASSET | `postPurchaseReceipt` (Dr, if tax > 0) |
| `AC-2001` | Accounts Payable | LIABILITY | `postPurchaseReceipt` (Cr), `postVendorPayment` (Dr) |
| `AC-2002` | TDS Payable | LIABILITY | Reserved |
| `AC-2003` | GST Output Collected | LIABILITY | `postInvoice` (Cr, if tax > 0) |
| `AC-3001` | Sales Revenue | INCOME | `postInvoice` (Cr, net of tax) |
| `AC-3002` | Other Income | INCOME | Manual journals |
| `AC-4001` | Purchase / COGS | EXPENSE | Manual journals |
| `AC-4002` | Salary & Wages | EXPENSE | `postExpense` (when category links here) |
| `AC-4003` | Rent Expense | EXPENSE | `postExpense` |
| `AC-4004` | Utilities | EXPENSE | `postExpense` |
| `AC-4005` | Transport & Logistics | EXPENSE | `postExpense` |
| `AC-4006` | Marketing & Advertising | EXPENSE | `postExpense` |
| `AC-4007` | Office Supplies | EXPENSE | `postExpense` |
| `AC-4008` | Repairs & Maintenance | EXPENSE | `postExpense` |
| `AC-5001` | Owner's Capital / Equity | EQUITY | Opening balance entries |
| `AC-5002` | Retained Earnings | EQUITY | Profit carry-forward |

---

## 5. Core GL Engine — `accountingService.js`

### 5.1 Double-Entry Balance Rules

```
entryType  ledgerType            balance effect
─────────  ────────────────────  ──────────────
DEBIT      ASSET or EXPENSE      +amount (increases)
DEBIT      LIABILITY, INCOME,    −amount (decreases)
           EQUITY
CREDIT     LIABILITY, INCOME,    +amount (increases)
           EQUITY
CREDIT     ASSET or EXPENSE      −amount (decreases)
```

### 5.2 `postTransaction(tx, meta, entries, userId)`

The lowest-level posting primitive. All other auto-post functions call this.

**Validation:** Throws `APIError 400 UNBALANCED_TRANSACTION` if `sum(DEBIT) ≠ sum(CREDIT)` (tolerance 0.01).

**What it does:**
1. Generates sequential `TXN-YYYY-NNNNN` transaction number.
2. Creates `FinancialTransaction` with all `TransactionEntry` lines in one operation.
3. Loops over each entry, fetches the affected ledger, recalculates `currentBalance`, saves it.
4. Returns the created transaction (including entries).

### 5.3 Auto-Post Functions

| Function | Trigger | Journal Entry |
|---|---|---|
| `postInvoice(tx, {invoiceId, invoiceNo, totalAmount, taxAmount}, userId)` | Invoice created | Dr AR (AC-1003) · Cr Sales (AC-3001) · Cr GST Output (AC-2003) if tax > 0 |
| `postClientPayment(tx, {invoiceId, invoiceNo, amount, bankLedgerId}, userId)` | Payment recorded on Invoice | Dr Bank/Cash (bankLedgerId) · Cr AR (AC-1003) |
| `postVendorPayment(tx, {voucherId, voucherNumber, totalAmount, bankLedgerId}, userId)` | Vendor Payment Voucher created | Dr AP (AC-2001) · Cr Bank/Cash (bankLedgerId) |
| `postPurchaseReceipt(tx, {purchaseOrderId, poNumber, subtotal, taxAmount, totalValue}, userId)` | PO Receipt saved | Dr Inventory (AC-1004) · [Dr GST Input (AC-1005)] · Cr AP (AC-2001) |
| `postExpense(tx, {expenseId, expenseNumber, amount, categoryLedgerId, bankLedgerId, description}, userId)` | Expense created | Dr Expense category ledger · Cr Bank/Cash (bankLedgerId) |
| `postReversingTransaction(tx, originalTxnId, userId, note)` | Invoice/Expense cancelled | Swaps DEBIT↔CREDIT on all lines of original transaction |

### 5.4 Number Generators

| Generator | Format | Sequence |
|---|---|---|
| `generateTransactionNumber()` | `TXN-YYYY-NNNNN` | 5-digit zero-padded, resets per year |
| `generateVoucherNumber()` | `VPV-YYYY-NNNN` | 4-digit zero-padded |
| `generateExpenseNumber()` | `EXP-YYYY-NNNN` | 4-digit zero-padded |

---

## 6. API Endpoints

### 6.1 Ledgers — `/api/ledgers`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Accounts/Admin | List ledgers (filter: `?type=ASSET&search=cash&parentId=1`) |
| GET | `/cash-bank` | Accounts/Admin | All active ASSET ledgers (for payment dropdowns) |
| GET | `/:id` | Accounts/Admin | Ledger by ID with parent + children |
| POST | `/` | Accounts/Admin | Create ledger (auto-generates `ledgerCode` if omitted) |
| PUT | `/:id` | Accounts/Admin | Update name, description, bankDetails, openingBalance |
| DELETE | `/:id` | Accounts/Admin | Soft delete (blocked for system ledgers or ledgers with entries) |

### 6.2 Invoices — `/api/invoices`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Accounts/Admin | List invoices with filters |
| GET | `/dispatched-orders` | Accounts/Admin | All DELIVERED sale orders not yet invoiced |
| GET | `/customers/:id/delivered-orders` | Accounts/Admin | Delivered orders for a specific customer |
| GET | `/:id` | Accounts/Admin | Invoice by ID |
| POST | `/` | Accounts/Admin | Create invoice from delivered SaleOrder(s) |
| PATCH | `/:id/issue` | Accounts/Admin | Issue invoice (DRAFT → ISSUED) |
| PATCH | `/:id/payments` | Accounts/Admin | Record payment → auto-posts GL, updates SaleOrder to BILLED |
| PATCH | `/:id/cancel` | Accounts/Admin | Cancel invoice → posts reversing GL entry |

### 6.3 Vendor Payments — `/api/vendor-payments`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Accounts/Admin | List all vouchers |
| GET | `/:id` | Accounts/Admin | Voucher by ID |
| GET | `/outstanding` | Accounts/Admin | Open POs with outstanding amounts |
| POST | `/` | Accounts/Admin | Create voucher → posts GL (Dr AP, Cr Bank) |

### 6.4 Expenses — `/api/expenses`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/summary` | Accounts/Admin | Totals by category, last 30 days breakdown |
| GET | `/` | Accounts/Admin | List expenses (filterable) |
| GET | `/:id` | Accounts/Admin | Expense by ID |
| GET | `/:id/logs` | Accounts/Admin | Audit trail for expense |
| POST | `/` | Accounts/Admin | Create expense → posts GL |
| PUT | `/:id` | Accounts/Admin | Update expense (logs change) |
| DELETE | `/:id` | Accounts/Admin | Soft delete expense |

**Expense Categories — `/api/expense-categories`**

| Method | Path | Description |
|---|---|---|
| GET | `/` | List all categories |
| POST | `/` | Create category (link to ledger_id) |
| PUT | `/:id` | Update category |
| DELETE | `/:id` | Soft delete |

### 6.5 Financial Reports — `/api/financial-reports`

All endpoints are GET, role: Accounts/Admin, no body required.

| Path | Description | Key Params |
|---|---|---|
| `/summary` | Dashboard KPIs: total revenue, expenses, payables, receivables | — |
| `/profit-loss` | Revenue vs Expenses by period | `?startDate&endDate` |
| `/trial-balance` | All ledger closing balances | `?asOfDate` |
| `/ledger-statement` | Debit/credit lines for a single ledger | `?ledgerId&startDate&endDate` |
| `/day-book` | All transactions for a date/range | `?startDate&endDate` |
| `/cash-bank-book` | Transactions filtered to cash/bank ledgers | `?ledgerId&startDate&endDate` |

### 6.6 Bank Reconciliation — `/api/bank-reconciliation`

| Method | Path | Description |
|---|---|---|
| GET | `/` | Unreconciled entries for a ledger (`?ledgerId`) |
| PUT | `/mark` | Mark entry/entries as reconciled (`{ entryIds: [], notes }`) |

---

## 7. LedgerService — Code Generation

The `generateLedgerCode(ledgerType)` algorithm:

```
prefixMap = { ASSET:'AC-1', LIABILITY:'AC-2', INCOME:'AC-3', EXPENSE:'AC-4', EQUITY:'AC-5' }
prefix    = prefixMap[type]
last      = highest existing code starting with prefix
next      = last ? parseInt(last.code digits last-3) + 1
           : parseInt(prefix stripped of 'AC-' + '00') + 1
code      = prefix + String(next).padStart(3,'0')
```

**First-code-per-type values (no existing records):**

| Type | Code |
|---|---|
| ASSET | `AC-1101` |
| LIABILITY | `AC-2201` |
| INCOME | `AC-3301` |
| EXPENSE | `AC-4401` |
| EQUITY | `AC-5501` |

> Note: These differ from the seeded system ledger codes (`AC-1001`…`AC-5002`) which were inserted directly without going through the generator.

---

## 8. Invoice Lifecycle

```
SaleOrder (DELIVERED)
    │
    ▼  POST /api/invoices
Invoice [DRAFT]
    │
    ▼  PATCH /api/invoices/:id/issue
Invoice [ISSUED]  ← GL posted here: Dr AR, Cr Sales Revenue
    │
    ▼  PATCH /api/invoices/:id/payments  (one or more)
Invoice [PARTIALLY_PAID] → [PAID]  ← Dr Bank, Cr AR on each payment
    │                                   SaleOrder → BILLED when fully paid
    ▼  PATCH /api/invoices/:id/cancel
Invoice [CANCELLED]  ← Reversing GL entry posted
```

---

## 9. Test Suite

### 9.1 Results (2026-05-29)

```
Test Files  2 passed (2)
     Tests  45 passed (45)
  Duration  1.79s
```

### 9.2 Test Files

| File | Tests | Covers |
|---|---|---|
| `src/backend/__tests__/accounting/accountingService.test.js` | 19 | GL engine: number generation, `postTransaction`, balance rules, `postInvoice`, `postClientPayment`, `postVendorPayment`, `postExpense`, `postReversingTransaction` |
| `src/backend/__tests__/accounting/ledgerService.test.js` | 26 | Ledger CRUD: code generation, list/filter, getById, create validation, update, softDelete guards, getCashBankLedgers |

### 9.3 Running Tests

```bash
# Run accounting tests only
npm run test:accounting

# Run all tests
npm test

# Watch mode
npm run test:watch
```

### 9.4 Key Test Assertions

| Scenario | Expected Behavior |
|---|---|
| Unbalanced journal (Dr ≠ Cr) | `APIError 400 UNBALANCED_TRANSACTION` |
| ASSET ledger + DEBIT 5000 | `currentBalance += 5000` |
| ASSET ledger + CREDIT 2000 | `currentBalance -= 2000` |
| LIABILITY ledger + DEBIT 2000 | `currentBalance -= 2000` |
| LIABILITY ledger + CREDIT 5000 | `currentBalance += 5000` |
| Invoice with GST | 3 journal lines (Dr AR, Cr Sales net, Cr GST Output) |
| Reversing transaction | DEBIT↔CREDIT swapped on all lines |
| Delete system ledger | `APIError 400 SYSTEM_LEDGER` |
| Delete ledger with entries | `APIError 409 LEDGER_HAS_TRANSACTIONS` |
| Create ledger, code conflict | `APIError 409 DUPLICATE_CODE` |

---

## 10. Known Issues / Notes

1. **Ledger code gap:** The `generateLedgerCode()` function produces codes starting at `AC-1101` for ASSET (not `AC-1001`). The seeded system ledgers use `AC-1001..AC-5002` which were inserted with explicit codes. This gap only matters when users create new ledgers through the UI — the auto-generated codes will start from `AC-1101`, `AC-2201`, etc. No functional impact.

2. **No test for financial reports:** `financialReportService.js` performs complex aggregation SQL — integration tests against a real PostgreSQL test database are recommended for those.

3. **Seed dependency:** `postInvoice`, `postClientPayment`, `postVendorPayment`, and `postPurchaseReceipt` all look up system ledgers by their `ledgerCode` at runtime. If the seed (`financial-ledgers-seed.js`) has not been run, these functions throw `APIError 500 LEDGER_NOT_FOUND`.

4. **Transaction number scope:** `generateTransactionNumber()` uses the module-level prisma singleton (not the `tx` argument). In a high-concurrency scenario, two simultaneous requests could generate the same number before either commits. The `transactionNumber` field is marked `@unique` in Prisma, so the second insert will fail with P2002. Consider using a DB sequence for production.

---

## 11. File Map

```
src/backend/
├── services/
│   ├── accountingService.js      ← Core GL engine (auto-post)
│   ├── ledgerService.js          ← Ledger CRUD
│   ├── invoiceService.js         ← Invoice lifecycle
│   ├── vendorPaymentService.js   ← Vendor payment vouchers
│   ├── expenseService.js         ← Expense + category CRUD
│   ├── financialReportService.js ← Report aggregation
│   └── bankReconciliationService.js
├── controllers/
│   ├── ledgerController.js
│   ├── invoiceController.js
│   ├── vendorPaymentController.js
│   ├── expenseController.js
│   ├── financialReportController.js
│   └── bankReconciliationController.js
├── routes/
│   ├── ledger.routes.js
│   ├── invoices.routes.js
│   ├── vendorPayment.routes.js
│   ├── expenses.routes.js
│   ├── expenseCategory.routes.js
│   ├── financialReports.routes.js
│   └── bankReconciliation.routes.js
└── __tests__/
    └── accounting/
        ├── accountingService.test.js   ← 19 tests ✅
        └── ledgerService.test.js       ← 26 tests ✅

src/pages/Accounting/
├── ChartOfAccounts.jsx
├── BankReconciliation.jsx
├── VendorPayments.jsx
├── ExpensesMain.jsx
├── ExpenseCategories.jsx
└── FinancialReports.jsx

prisma/
├── schema.prisma                 ← Ledger, FinancialTransaction, TransactionEntry, Invoice, Payment, …
└── seed/
    └── financial-ledgers-seed.js ← Seeds 20 system ledgers + 5 expense categories
```
