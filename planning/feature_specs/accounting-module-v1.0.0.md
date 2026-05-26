# Feature Spec: Accounting Module
**Version:** 1.0.0 (APPROVED)
**Status:** LOCKED
**Author:** orchestrator
**Date:** 2026-05-26
**Human Decisions Recorded:** 2026-05-26

---

## 1. Human Decision Log

| # | Question | Decision |
|---|---|---|
| 1 | Vendor payments — link to single PO or multi-PO? | **Create a Vendor Payment Voucher that can include multiple POs. Payment is made against the voucher which consolidates multiple PO receipts.** |
| 2 | Salary expenses — link to User or free-text? | **Free-text `paidTo` field. No User FK required.** |
| 3 | GST/Tax in P&L? | **P&L must show GST tax breakdown separately (GST Input on purchases, GST Output on sales).** |
| 4 | Bank reconciliation scope? | **In scope for this phase.** |
| 5 | Expense approval workflow? | **Auto-post immediately. Allow edit with full log history (edit saves reversing entry + new entry + ExpenseLog record).** |
| 6 | Multiple bank accounts? | **Separate Ledger per bank (e.g., HDFC Current, SBI Savings). User selects which bank ledger at time of payment.** |

---

## 2. Architecture Overview

The accounting module integrates with all existing financial events via **auto-posting hooks** inside existing controllers. All postings use **double-entry** (Dr total = Cr total enforced in service layer). Reports read from `TransactionEntry` aggregated by `Ledger`.

```
Existing Events                Auto-Post Hook          Ledger Impact
─────────────────────────────────────────────────────────────────────
PO Receipt saved            →  PURCHASE txn         Dr Inventory, Dr GST Input
                                                     Cr Accounts Payable
Invoice created             →  SALE txn             Dr Accounts Receivable
                                                     Cr Sales Revenue, Cr GST Output
Client Payment recorded     →  RECEIPT txn          Dr Cash/Bank
                                                     Cr Accounts Receivable
Vendor Payment Voucher      →  PAYMENT txn          Dr Accounts Payable
                                                     Cr Cash/Bank (selected ledger)
Expense Entry               →  JOURNAL txn          Dr [Category Ledger]
                                                     Cr Cash/Bank
```

---

## 3. Sub-Module Specifications

### 3.1 Chart of Accounts (Ledger Master)

**Purpose:** Manage the hierarchy of all financial accounts. Foundation for every transaction.

**Default System Ledgers (seeded on first run, `isSystemLedger: true`):**

| Code | Name | Type | Notes |
|---|---|---|---|
| AC-1001 | Cash in Hand | ASSET | Primary cash ledger |
| AC-1003 | Accounts Receivable | ASSET | Customer outstanding |
| AC-1004 | Inventory / Stock | ASSET | Goods inward value |
| AC-1005 | GST Input Credit | ASSET | GST paid on purchases |
| AC-2001 | Accounts Payable | LIABILITY | Vendor outstanding |
| AC-2002 | Salary Payable | LIABILITY | |
| AC-2003 | GST Output Payable | LIABILITY | GST collected on sales |
| AC-3001 | Sales Revenue | INCOME | Net sales (ex-GST) |
| AC-3002 | Service Income | INCOME | |
| AC-4001 | Purchase / Cost of Goods | EXPENSE | |
| AC-4002 | Salary Expense | EXPENSE | |
| AC-4003 | Petty Cash Expense | EXPENSE | |
| AC-4004 | Rent Expense | EXPENSE | |
| AC-4005 | Utilities Expense | EXPENSE | |
| AC-4006 | Miscellaneous Expense | EXPENSE | |
| AC-5001 | Owner's Capital | EQUITY | |

**Bank accounts:** NOT seeded — user creates them as non-system ASSET ledgers (e.g., "HDFC Current Account", "SBI Savings Account") via the Chart of Accounts UI. Each bank ledger stores `bankDetails` JSON.

**Acceptance Criteria:**
- CRUD for ledgers; system ledgers cannot be deleted or have type changed
- Hierarchical parent-child grouping (parentLedgerId)
- Opening balance set per ledger; `currentBalance` updated atomically with each transaction
- `bankDetails` JSON editable for ASSET ledgers identified as bank accounts

---

### 3.2 PO Cost Connection

**Trigger:** `POST /api/purchase-orders/:id/receive` (existing endpoint)

**Double-Entry (with GST):**
```
Dr  Inventory / Stock (AC-1004)        netAmount   (subtotal ex-tax)
Dr  GST Input Credit  (AC-1005)        taxAmount   (from receipt.taxAmount)
Cr  Accounts Payable  (AC-2001)        totalValue  (subtotal + tax)
```
If `taxAmount = 0`, the GST Input line is omitted.

**Behaviour:**
- Wrapped in single Prisma transaction: receipt save + FinancialTransaction create + TransactionEntry create × 2-3
- On failure: full rollback, receipt is not saved
- `referenceType: PURCHASE_ORDER`, `referenceId: purchaseOrder.id`, `referenceNumber: poNumber`
- `transactionType: PURCHASE`

---

### 3.3 Vendor Payment Voucher

**Concept:** A vendor payment voucher groups multiple PO receipts into one payment. The voucher records the total amount paid, which bank/cash ledger was used, and allocates the payment across the selected POs.

**New Schema Models:**

```prisma
model VendorPaymentVoucher {
  id            Int      @id @default(autoincrement())
  voucherNumber String   @unique   // VPV-2026-001
  vendorId      Int
  paymentDate   DateTime @default(now())
  totalAmount   Decimal  @db.Decimal(15,2)
  paymentMethod PaymentMethod
  bankLedgerId  Int      // Ledger used (cash or bank account)
  referenceNo   String?
  notes         String?
  // Audit
  active_status Boolean  @default(true)
  delete_status Boolean  @default(false)
  createdAt     DateTime @default(now())
  createdBy     Int
  updatedAt     DateTime @updatedAt
  updatedBy     Int?
  // Relations
  vendor        Vendor   @relation(...)
  bankLedger    Ledger   @relation(...)
  items         VendorPaymentVoucherItem[]
  createdByUser User     @relation("vpvCreatedBy", ...)
  updatedByUser User?    @relation("vpvUpdatedBy", ...)
}

model VendorPaymentVoucherItem {
  id              Int                  @id @default(autoincrement())
  voucherId       Int
  purchaseOrderId Int
  allocatedAmount Decimal              @db.Decimal(15,2)
  notes           String?
  // Relations
  voucher         VendorPaymentVoucher @relation(...)
  purchaseOrder   PurchaseOrder        @relation(...)
}
```

**Double-Entry:**
```
Dr  Accounts Payable (AC-2001)  totalAmount  ← reduces vendor liability
Cr  [bankLedger selected]       totalAmount  ← reduces cash/bank balance
```
- `transactionType: PAYMENT`, `referenceType: PURCHASE_ORDER`
- One FinancialTransaction per voucher, two TransactionEntries

**Acceptance Criteria:**
- User selects vendor → sees list of outstanding PO receipts with amounts
- Selects multiple POs, enters allocated amount per PO (sum must equal totalAmount)
- Selects payment method and bank/cash ledger
- Auto-posts on save; vendor AP balance reduces accordingly
- List view shows all vouchers per vendor with outstanding balance

---

### 3.4 Client Billing (Invoice → Accounting)

**Trigger A:** `POST /api/invoices` (invoice created)

**Double-Entry (with GST):**
```
Dr  Accounts Receivable (AC-1003)  totalAmount      ← full amount customer owes
Cr  Sales Revenue (AC-3001)        netAmount        ← amount ex-GST
Cr  GST Output Payable (AC-2003)   taxAmount        ← GST collected
```
If no taxAmount on the invoice (field needs adding — see §4), omit GST line.

**Trigger B:** `POST /api/invoices/:id/payments` (payment received)

**Double-Entry:**
```
Dr  [Cash/Bank Ledger] (selected at payment time)  paymentAmount
Cr  Accounts Receivable (AC-1003)                  paymentAmount
```
- `transactionType: RECEIPT`, `referenceType: INVOICE`

**Schema addition needed on Invoice:** `taxAmount Decimal @default(0)` and `selectedLedgerId Int?` (which bank ledger payment deposited to).

**Invoice status auto-update logic (service layer):**
- `paidAmount = 0` → ISSUED
- `0 < paidAmount < totalAmount` → PARTIALLY_PAID
- `paidAmount >= totalAmount` → PAID

---

### 3.5 Expense Entry

**New Schema Models:**

```prisma
model ExpenseCategory {
  id            Int       @id @default(autoincrement())
  name          String    @unique
  ledger_id     Int?      // Maps to an EXPENSE-type Ledger
  active_status Boolean   @default(true)
  delete_status Boolean   @default(false)
  createdAt     DateTime  @default(now())
  createdBy     Int
  updatedAt     DateTime  @updatedAt
  updatedBy     Int?
  // Relations
  ledger        Ledger?   @relation(...)
  expenses      Expense[]
  createdByUser User      @relation("expCatCreatedBy", ...)
  updatedByUser User?     @relation("expCatUpdatedBy", ...)
}

model Expense {
  id             Int             @id @default(autoincrement())
  expenseNumber  String          @unique   // EXP-2026-001
  categoryId     Int
  amount         Decimal         @db.Decimal(15,2)
  paymentMethod  PaymentMethod
  bankLedgerId   Int             // Cash/bank ledger debited
  expenseDate    DateTime        @default(now())
  description    String
  referenceNo    String?
  paidTo         String?         // Free-text payee name
  notes          String?
  // Audit
  active_status  Boolean         @default(true)
  delete_status  Boolean         @default(false)
  createdAt      DateTime        @default(now())
  createdBy      Int
  updatedAt      DateTime        @updatedAt
  updatedBy      Int?
  // Relations
  category       ExpenseCategory @relation(...)
  bankLedger     Ledger          @relation("expenseBankLedger", ...)
  logs           ExpenseLog[]
  createdByUser  User            @relation("expenseCreatedBy", ...)
  updatedByUser  User?           @relation("expenseUpdatedBy", ...)
}

model ExpenseLog {
  id          Int      @id @default(autoincrement())
  expenseId   Int
  oldValues   Json     // Snapshot before edit
  newValues   Json     // Snapshot after edit
  changeNote  String?
  createdAt   DateTime @default(now())
  createdBy   Int
  expense     Expense  @relation(...)
  createdByUser User   @relation("expLogCreatedBy", ...)
}
```

**Double-Entry on Create:**
```
Dr  [Category Ledger, e.g. Salary Expense AC-4002]  amount
Cr  [bankLedgerId selected]                          amount
```
- `transactionType: JOURNAL`, `referenceType: MANUAL`

**Edit Behaviour (with log):**
1. Save `ExpenseLog` with `oldValues` snapshot
2. Post **reversing** FinancialTransaction (negate original entry: Dr Cash/Bank, Cr Expense Ledger)
3. Post **new** FinancialTransaction with updated values
4. Update Expense record

---

### 3.6 Bank Reconciliation

**Purpose:** Match each bank FinancialTransaction against the actual bank statement to confirm they are real.

**Schema addition on FinancialTransaction:** Fields `isReconciled` and `reconciledDate` already exist in schema. Add:
```prisma
reconciledBy  Int?   // User who reconciled
reconciledNote String?
```

**Endpoints:**
- `GET /api/bank-reconciliation?ledgerId=&from=&to=` — returns all transactions for a bank ledger with reconciliation status
- `PUT /api/bank-reconciliation/mark` — mark array of transactionIds as reconciled or unreconciled (bulk)

**Acceptance Criteria:**
- Filter transactions by bank ledger + date range
- Bulk-mark transactions as reconciled/unreconciled
- Show reconciled balance vs unreconciled balance
- Unreconciled transactions highlighted in Cash/Bank Book report

---

### 3.7 Reports

#### P&L Report — `GET /api/financial-reports/profit-loss?from=&to=`

**Structure:**
```
INCOME
  Sales Revenue (AC-3001)             xxxxxx
  Service Income (AC-3002)            xxxxxx
  Total Income                                   xxxxxx

GST OUTPUT COLLECTED
  GST Output Payable (AC-2003)        xxxxxx     xxxxxx

NET REVENUE (Income - GST Output)                xxxxxx

COST OF GOODS SOLD
  Purchase / Cost of Goods (AC-4001)  xxxxxx

GROSS PROFIT                                     xxxxxx

GST INPUT CREDIT
  GST Input Credit (AC-1005)          xxxxxx     xxxxxx

OPERATING EXPENSES
  Salary Expense (AC-4002)            xxxxxx
  Petty Cash Expense (AC-4003)        xxxxxx
  Rent Expense (AC-4004)              xxxxxx
  Utilities Expense (AC-4005)         xxxxxx
  Miscellaneous (AC-4006)             xxxxxx
  Total Operating Expenses                       xxxxxx

NET PROFIT / (LOSS)                              xxxxxx
```

#### Ledger Statement — `GET /api/financial-reports/ledger-statement?ledgerId=&from=&to=`
- All TransactionEntries for the ledger in date range
- Running balance: openingBalance + each entry (Dr adds / Cr subtracts for ASSET; reversed for LIABILITY/INCOME)
- Columns: Date | Reference | Narration | Debit | Credit | Balance

#### Trial Balance — `GET /api/financial-reports/trial-balance?asOf=`
- All ledgers with total debits and total credits
- Net balance column
- Total Dr = Total Cr (service layer validates)

#### Day Book — `GET /api/financial-reports/day-book?date=`
- All FinancialTransactions for the date
- Grouped by transactionType
- Includes all entry lines per transaction

#### Cash / Bank Book — `GET /api/financial-reports/cash-bank-book?ledgerId=&from=&to=`
- Same as Ledger Statement but pre-filtered and restricted to ASSET ledgers that are cash or bank accounts
- Shows reconciliation status per row

---

## 4. Schema Changes Summary

### New Models (additive only)
- `VendorPaymentVoucher`
- `VendorPaymentVoucherItem`
- `ExpenseCategory`
- `Expense`
- `ExpenseLog`

### Fields Added to Existing Models
- `Invoice`: add `taxAmount Decimal @default(0)`, `bankLedgerId Int?` (for payment ledger)
- `FinancialTransaction`: add `reconciledBy Int?`, `reconciledNote String?`
- `Vendor`: add `vendorPaymentVouchers VendorPaymentVoucher[]`
- `PurchaseOrder`: add `paymentVoucherItems VendorPaymentVoucherItem[]`
- `Ledger`: add `expenseCategories ExpenseCategory[]`, `expenses Expense[]`, `vendorPaymentVouchers VendorPaymentVoucher[]`

### No Removals / No Breaking Changes
All existing models, enums, and relations are untouched.

---

## 5. Frontend Pages

| Page | Route | Priority |
|---|---|---|
| Chart of Accounts | `/accounting/ledgers` | P1 |
| Vendor Payment Voucher | `/accounting/vendor-payments` | P1 |
| Expense Entry | `/accounting/expenses` (replace dummy) | P1 |
| Client Payments | `/accounting/payments` (replace dummy) | P1 |
| Expense Categories | `/accounting/expense-categories` | P2 |
| Journal Entry (manual) | `/accounting/journal` | P2 |
| Bank Reconciliation | `/accounting/reconciliation` | P2 |
| P&L Report | `/accounting/reports/profit-loss` | P1 |
| Ledger Statement | `/accounting/reports/ledger-statement` | P1 |
| Trial Balance | `/accounting/reports/trial-balance` | P2 |
| Day Book | `/accounting/reports/day-book` | P2 |
| Cash / Bank Book | `/accounting/reports/cash-bank-book` | P1 |

---

## 6. Acceptance Criteria (Full)

- [ ] Chart of Accounts: system ledgers cannot be deleted or type-changed; bank ledgers store bankDetails JSON
- [ ] Multiple bank account ledgers supported; user selects at payment time
- [ ] PO receipt auto-posts PURCHASE txn with GST Input split; full rollback on failure
- [ ] Vendor Payment Voucher aggregates multiple POs; auto-posts PAYMENT txn (Dr AP, Cr Bank)
- [ ] Invoice creation auto-posts SALE txn (Dr AR, Cr Sales + Cr GST Output)
- [ ] Client payment auto-posts RECEIPT txn (Dr Bank, Cr AR)
- [ ] Expense creation auto-posts JOURNAL txn (Dr Expense Ledger, Cr Bank)
- [ ] Expense edit: saves ExpenseLog, posts reversing txn, posts new txn
- [ ] Bank reconciliation: bulk mark reconciled; Cash/Bank Book shows reconciliation status
- [ ] P&L Report: shows GST Output, GST Input, Gross Profit, Net Profit separately
- [ ] Ledger Statement: running balance correct; matches currentBalance on Ledger
- [ ] Trial Balance: total Dr = total Cr (enforced)
- [ ] Debit = Credit enforced in service layer for every FinancialTransaction
- [ ] All new routes: `requireRole(['Accounts', 'Admin'])`
- [ ] All new models: soft-delete + full audit fields
- [ ] Expenses.jsx and Payments.jsx: zero dummy data, fully live API
