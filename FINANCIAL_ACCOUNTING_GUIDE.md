# Financial Accounting System Documentation

## Overview

This document describes the financial accounting system implemented using double-entry bookkeeping principles for the lens management system. The system tracks all financial transactions through Ledger accounts and Transaction entries.

---

## Database Schema

### Tables Created

1. **Ledger** - Chart of Accounts (Assets, Liabilities, Income, Expense, Equity)
2. **FinancialTransaction** - Transaction headers (Sale, Purchase, Payment, Receipt, etc.)
3. **TransactionEntry** - Individual debit/credit entries for each transaction

### Enums Created

- **LedgerType**: ASSET, LIABILITY, INCOME, EXPENSE, EQUITY
- **TransactionType**: SALE, PURCHASE, PAYMENT, RECEIPT, JOURNAL, CONTRA, OPENING_BALANCE, ADJUSTMENT
- **ReferenceType**: SALE_ORDER, PURCHASE_ORDER, INVOICE, PAYMENT, RECEIPT, MANUAL
- **EntryType**: DEBIT, CREDIT

---

## Migration Instructions

### ⚠️ Current Migration Drift Issue

Your database has migrations that aren't in your local migration directory:
- `20260506000000_add_stock_thresholds_to_lens_product`
- `20260507000000_vendor_category_to_business_category`

### Resolving the Drift

**Option 1: Mark missing migrations as applied (Recommended for production data)**

```powershell
# Mark the missing migrations as applied without running them
npx prisma migrate resolve --applied 20260506000000_add_stock_thresholds_to_lens_product
npx prisma migrate resolve --applied 20260507000000_vendor_category_to_business_category

# Now apply the financial tables migration
npx prisma migrate deploy
```

**Option 2: Reset database (⚠️ WARNING: Loses all data)**

```powershell
# This will drop and recreate the database
npx prisma migrate reset
```

**Option 3: Pull current schema and create new migration**

```powershell
# Pull current database schema
npx prisma db pull

# Create a new migration from the current state
npx prisma migrate dev --name sync_with_database
```

### Applying the Financial Tables Migration

After resolving the drift:

```powershell
# Generate Prisma Client with new models
npx prisma generate

# Apply pending migrations (including financial tables)
npx prisma migrate deploy
```

---

## Initial Setup - Seeding Chart of Accounts

After migration, populate initial ledgers:

```powershell
# Run the financial ledgers seed script
node prisma/seed/financial-ledgers-seed.js
```

This creates **20 default ledgers**:

### Assets (6)
- AS-1001: Cash in Hand
- AS-1002: Bank Account - Primary
- AS-1003: Accounts Receivable (Debtors)
- AS-1004: Inventory - Lens Stock
- AS-2001: Furniture & Equipment

### Liabilities (3)
- LI-1001: Accounts Payable (Creditors)
- LI-1002: GST Payable
- LI-1003: Salaries Payable

### Income (3)
- IN-1001: Lens Sales Revenue
- IN-1002: Fitting Charges Income
- IN-1003: Discount Recovered

### Expenses (6)
- EX-1001: Lens Purchase Expense
- EX-2001: Salary Expense
- EX-2002: Rent Expense
- EX-2003: Utility Expense
- EX-3001: Discount Given
- EX-3002: Transport & Delivery Expense

### Equity (2)
- EQ-1001: Owner's Capital
- EQ-1002: Retained Earnings

---

## Double-Entry Accounting Principles

Every financial transaction has **two sides**:
- **Debit (Dr.)** - Increases in Assets/Expenses, Decreases in Liabilities/Income/Equity
- **Credit (Cr.)** - Increases in Liabilities/Income/Equity, Decreases in Assets/Expenses

**The Golden Rule**: `Total Debits = Total Credits` (for every transaction)

---

## Common Transaction Examples

### Example 1: Cash Sale of Lenses

**Scenario**: Sold lenses worth ₹10,000 cash

```javascript
const transaction = await prisma.financialTransaction.create({
  data: {
    transactionNumber: 'TXN-2026-00001',
    transactionType: 'SALE',
    referenceType: 'SALE_ORDER',
    referenceId: saleOrderId,
    referenceNumber: 'SO-2026-001',
    description: 'Cash sale of lenses to customer',
    totalAmount: 10000,
    createdBy: userId,
    entries: {
      create: [
        {
          // Debit: Cash in Hand (Asset increases)
          ledgerId: cashLedgerId, // AS-1001
          entryType: 'DEBIT',
          amount: 10000,
          description: 'Cash received from customer',
          createdBy: userId,
        },
        {
          // Credit: Sales Revenue (Income increases)
          ledgerId: salesRevenueLedgerId, // IN-1001
          entryType: 'CREDIT',
          amount: 10000,
          description: 'Lens sales revenue',
          createdBy: userId,
        },
      ],
    },
  },
  include: { entries: true },
});
```

### Example 2: Credit Sale (Accounts Receivable)

**Scenario**: Sold lenses worth ₹15,000 on credit

```javascript
await prisma.financialTransaction.create({
  data: {
    transactionNumber: 'TXN-2026-00002',
    transactionType: 'SALE',
    referenceType: 'SALE_ORDER',
    referenceId: saleOrderId,
    description: 'Credit sale to customer',
    totalAmount: 15000,
    createdBy: userId,
    entries: {
      create: [
        {
          // Debit: Accounts Receivable (Asset increases)
          ledgerId: accountsReceivableLedgerId, // AS-1003
          entryType: 'DEBIT',
          amount: 15000,
          createdBy: userId,
        },
        {
          // Credit: Sales Revenue (Income increases)
          ledgerId: salesRevenueLedgerId, // IN-1001
          entryType: 'CREDIT',
          amount: 15000,
          createdBy: userId,
        },
      ],
    },
  },
});
```

### Example 3: Purchase of Lenses from Vendor

**Scenario**: Purchased lenses worth ₹20,000 from vendor on credit

```javascript
await prisma.financialTransaction.create({
  data: {
    transactionNumber: 'TXN-2026-00003',
    transactionType: 'PURCHASE',
    referenceType: 'PURCHASE_ORDER',
    referenceId: purchaseOrderId,
    description: 'Lens purchase from vendor',
    totalAmount: 20000,
    createdBy: userId,
    entries: {
      create: [
        {
          // Debit: Purchase Expense (Expense increases)
          ledgerId: purchaseExpenseLedgerId, // EX-1001
          entryType: 'DEBIT',
          amount: 20000,
          createdBy: userId,
        },
        {
          // Credit: Accounts Payable (Liability increases)
          ledgerId: accountsPayableLedgerId, // LI-1001
          entryType: 'CREDIT',
          amount: 20000,
          createdBy: userId,
        },
      ],
    },
  },
});
```

### Example 4: Payment to Vendor

**Scenario**: Paid ₹20,000 to vendor via bank transfer

```javascript
await prisma.financialTransaction.create({
  data: {
    transactionNumber: 'TXN-2026-00004',
    transactionType: 'PAYMENT',
    referenceType: 'PAYMENT',
    description: 'Payment to vendor for purchase',
    totalAmount: 20000,
    createdBy: userId,
    entries: {
      create: [
        {
          // Debit: Accounts Payable (Liability decreases)
          ledgerId: accountsPayableLedgerId, // LI-1001
          entryType: 'DEBIT',
          amount: 20000,
          createdBy: userId,
        },
        {
          // Credit: Bank Account (Asset decreases)
          ledgerId: bankAccountLedgerId, // AS-1002
          entryType: 'CREDIT',
          amount: 20000,
          createdBy: userId,
        },
      ],
    },
  },
});
```

### Example 5: Receipt from Customer

**Scenario**: Received ₹15,000 from customer (settling accounts receivable)

```javascript
await prisma.financialTransaction.create({
  data: {
    transactionNumber: 'TXN-2026-00005',
    transactionType: 'RECEIPT',
    referenceType: 'RECEIPT',
    description: 'Payment received from customer',
    totalAmount: 15000,
    createdBy: userId,
    entries: {
      create: [
        {
          // Debit: Bank Account (Asset increases)
          ledgerId: bankAccountLedgerId, // AS-1002
          entryType: 'DEBIT',
          amount: 15000,
          createdBy: userId,
        },
        {
          // Credit: Accounts Receivable (Asset decreases)
          ledgerId: accountsReceivableLedgerId, // AS-1003
          entryType: 'CREDIT',
          amount: 15000,
          createdBy: userId,
        },
      ],
    },
  },
});
```

### Example 6: Cash to Bank Transfer (Contra Entry)

**Scenario**: Transferred ₹5,000 from cash to bank

```javascript
await prisma.financialTransaction.create({
  data: {
    transactionNumber: 'TXN-2026-00006',
    transactionType: 'CONTRA',
    description: 'Cash deposited to bank',
    totalAmount: 5000,
    createdBy: userId,
    entries: {
      create: [
        {
          // Debit: Bank Account (Asset increases)
          ledgerId: bankAccountLedgerId, // AS-1002
          entryType: 'DEBIT',
          amount: 5000,
          createdBy: userId,
        },
        {
          // Credit: Cash in Hand (Asset decreases)
          ledgerId: cashLedgerId, // AS-1001
          entryType: 'CREDIT',
          amount: 5000,
          createdBy: userId,
        },
      ],
    },
  },
});
```

---

## Ledger Balance Calculation

### Updating Current Balance

After each transaction entry, update the ledger's `currentBalance`:

```javascript
// For DEBIT entry
if (entryType === 'DEBIT') {
  if (ledger.ledgerType === 'ASSET' || ledger.ledgerType === 'EXPENSE') {
    // Debit increases Asset/Expense
    newBalance = currentBalance + amount;
  } else {
    // Debit decreases Liability/Income/Equity
    newBalance = currentBalance - amount;
  }
}

// For CREDIT entry
if (entryType === 'CREDIT') {
  if (ledger.ledgerType === 'LIABILITY' || ledger.ledgerType === 'INCOME' || ledger.ledgerType === 'EQUITY') {
    // Credit increases Liability/Income/Equity
    newBalance = currentBalance + amount;
  } else {
    // Credit decreases Asset/Expense
    newBalance = currentBalance - amount;
  }
}

await prisma.ledger.update({
  where: { id: ledgerId },
  data: { currentBalance: newBalance },
});
```

---

## Financial Reports

### Trial Balance

Sum of all ledger balances (should equal zero in double-entry):

```javascript
const trialBalance = await prisma.ledger.findMany({
  where: { active_status: true },
  select: {
    ledgerCode: true,
    ledgerName: true,
    ledgerType: true,
    currentBalance: true,
  },
  orderBy: [{ ledgerType: 'asc' }, { ledgerCode: 'asc' }],
});
```

### Profit & Loss Statement

Income - Expenses = Profit/Loss

```javascript
const income = await prisma.ledger.aggregate({
  where: { ledgerType: 'INCOME' },
  _sum: { currentBalance: true },
});

const expenses = await prisma.ledger.aggregate({
  where: { ledgerType: 'EXPENSE' },
  _sum: { currentBalance: true },
});

const profitLoss = income._sum.currentBalance - expenses._sum.currentBalance;
```

### Balance Sheet

Assets = Liabilities + Equity

```javascript
const assets = await prisma.ledger.aggregate({
  where: { ledgerType: 'ASSET' },
  _sum: { currentBalance: true },
});

const liabilities = await prisma.ledger.aggregate({
  where: { ledgerType: 'LIABILITY' },
  _sum: { currentBalance: true },
});

const equity = await prisma.ledger.aggregate({
  where: { ledgerType: 'EQUITY' },
  _sum: { currentBalance: true },
});
```

---

## Best Practices

1. **Always use transactions**: Wrap financial operations in Prisma transactions to ensure atomicity
2. **Auto-generate transaction numbers**: Use sequences like `TXN-YYYY-NNNNN`
3. **Validate balance**: Ensure total debits = total credits before saving
4. **Use references**: Always link to source documents (SaleOrder, PurchaseOrder, etc.)
5. **Audit trail**: Never delete transactions - mark as void/cancelled if needed
6. **Reconciliation**: Regularly reconcile bank ledgers with actual bank statements
7. **System ledgers**: Don't allow deletion of `isSystemLedger: true` ledgers
8. **Date accuracy**: Use `transactionDate` for accounting periods, not `createdAt`

---

## API Integration Points

### When to create financial transactions:

1. **Sale Order Completion** → Create SALE transaction
2. **Purchase Order Receipt** → Create PURCHASE transaction
3. **Payment Made** → Create PAYMENT transaction
4. **Payment Received** → Create RECEIPT transaction
5. **Expense Entry** → Create JOURNAL transaction
6. **Bank Transfer** → Create CONTRA transaction

---

## Security Considerations

- Only users with "Accounts" role should access financial data
- Implement approval workflow for transactions above certain amount
- Log all financial data access in AuditLog table
- Encrypt sensitive bank details in `bankDetails` JSON field
- Restrict deletion/editing of posted transactions

---

## Support

For questions or issues with the financial accounting system, contact the development team or refer to the Prisma schema at `prisma/schema.prisma`.
