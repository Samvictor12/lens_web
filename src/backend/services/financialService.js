/**
 * Financial Accounting Service
 * Handles ledger management and transaction recording with double-entry bookkeeping
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Generate unique transaction number
 * Format: TXN-YYYY-NNNNN
 */
async function generateTransactionNumber() {
  const year = new Date().getFullYear();
  const prefix = `TXN-${year}-`;
  
  // Find the latest transaction number for current year
  const lastTransaction = await prisma.financialTransaction.findFirst({
    where: {
      transactionNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      transactionNumber: 'desc',
    },
  });

  let sequenceNumber = 1;
  if (lastTransaction) {
    const lastNumber = parseInt(lastTransaction.transactionNumber.split('-').pop());
    sequenceNumber = lastNumber + 1;
  }

  return `${prefix}${sequenceNumber.toString().padStart(5, '0')}`;
}

/**
 * Validate transaction entries (debits must equal credits)
 */
function validateTransactionEntries(entries) {
  let totalDebits = 0;
  let totalCredits = 0;

  entries.forEach(entry => {
    if (entry.entryType === 'DEBIT') {
      totalDebits += parseFloat(entry.amount);
    } else if (entry.entryType === 'CREDIT') {
      totalCredits += parseFloat(entry.amount);
    }
  });

  // Allow small floating-point precision errors
  const difference = Math.abs(totalDebits - totalCredits);
  if (difference > 0.01) {
    throw new Error(
      `Transaction not balanced. Debits: ₹${totalDebits}, Credits: ₹${totalCredits}, Difference: ₹${difference}`
    );
  }

  return { totalDebits, totalCredits };
}

/**
 * Calculate new ledger balance after a transaction entry
 */
function calculateNewBalance(ledger, entryType, amount) {
  const currentBalance = parseFloat(ledger.currentBalance);
  const entryAmount = parseFloat(amount);
  
  let newBalance = currentBalance;

  if (entryType === 'DEBIT') {
    // Debit increases: Assets, Expenses
    // Debit decreases: Liabilities, Income, Equity
    if (ledger.ledgerType === 'ASSET' || ledger.ledgerType === 'EXPENSE') {
      newBalance = currentBalance + entryAmount;
    } else {
      newBalance = currentBalance - entryAmount;
    }
  } else if (entryType === 'CREDIT') {
    // Credit increases: Liabilities, Income, Equity
    // Credit decreases: Assets, Expenses
    if (ledger.ledgerType === 'LIABILITY' || ledger.ledgerType === 'INCOME' || ledger.ledgerType === 'EQUITY') {
      newBalance = currentBalance + entryAmount;
    } else {
      newBalance = currentBalance - entryAmount;
    }
  }

  return newBalance;
}

/**
 * Create a financial transaction with multiple entries (double-entry)
 * 
 * @param {Object} transactionData - Transaction header data
 * @param {Array} entries - Array of debit/credit entries
 * @param {Number} userId - User creating the transaction
 * @returns {Promise<Object>} Created transaction with entries
 */
async function createFinancialTransaction(transactionData, entries, userId) {
  // Validate entries balance
  const { totalDebits, totalCredits } = validateTransactionEntries(entries);

  // Generate transaction number if not provided
  if (!transactionData.transactionNumber) {
    transactionData.transactionNumber = await generateTransactionNumber();
  }

  // Use Prisma transaction for atomicity
  return await prisma.$transaction(async (tx) => {
    // Create the transaction with entries
    const transaction = await tx.financialTransaction.create({
      data: {
        ...transactionData,
        totalAmount: totalDebits, // or totalCredits, they're equal
        createdBy: userId,
        entries: {
          create: entries.map(entry => ({
            ...entry,
            createdBy: userId,
          })),
        },
      },
      include: {
        entries: {
          include: {
            ledger: true,
          },
        },
      },
    });

    // Update ledger balances
    for (const entry of transaction.entries) {
      const ledger = await tx.ledger.findUnique({
        where: { id: entry.ledgerId },
      });

      if (!ledger) {
        throw new Error(`Ledger with ID ${entry.ledgerId} not found`);
      }

      const newBalance = calculateNewBalance(ledger, entry.entryType, entry.amount);

      await tx.ledger.update({
        where: { id: entry.ledgerId },
        data: { currentBalance: newBalance },
      });
    }

    return transaction;
  });
}

/**
 * Record a cash sale transaction
 * Debit: Cash in Hand, Credit: Sales Revenue
 */
async function recordCashSale(saleOrderId, amount, description, userId) {
  // Get required ledgers
  const cashLedger = await prisma.ledger.findFirst({
    where: { ledgerCode: 'AS-1001' }, // Cash in Hand
  });
  const salesLedger = await prisma.ledger.findFirst({
    where: { ledgerCode: 'IN-1001' }, // Lens Sales Revenue
  });

  if (!cashLedger || !salesLedger) {
    throw new Error('Required ledgers not found. Please run seed script.');
  }

  return await createFinancialTransaction(
    {
      transactionType: 'SALE',
      referenceType: 'SALE_ORDER',
      referenceId: saleOrderId,
      referenceNumber: `SO-${saleOrderId}`,
      description: description || 'Cash sale of lenses',
      transactionDate: new Date(),
    },
    [
      {
        ledgerId: cashLedger.id,
        entryType: 'DEBIT',
        amount: amount,
        description: 'Cash received from customer',
      },
      {
        ledgerId: salesLedger.id,
        entryType: 'CREDIT',
        amount: amount,
        description: 'Lens sales revenue',
      },
    ],
    userId
  );
}

/**
 * Record a credit sale transaction
 * Debit: Accounts Receivable, Credit: Sales Revenue
 */
async function recordCreditSale(saleOrderId, amount, description, userId) {
  const receivableLedger = await prisma.ledger.findFirst({
    where: { ledgerCode: 'AS-1003' }, // Accounts Receivable
  });
  const salesLedger = await prisma.ledger.findFirst({
    where: { ledgerCode: 'IN-1001' }, // Lens Sales Revenue
  });

  if (!receivableLedger || !salesLedger) {
    throw new Error('Required ledgers not found. Please run seed script.');
  }

  return await createFinancialTransaction(
    {
      transactionType: 'SALE',
      referenceType: 'SALE_ORDER',
      referenceId: saleOrderId,
      referenceNumber: `SO-${saleOrderId}`,
      description: description || 'Credit sale of lenses',
      transactionDate: new Date(),
    },
    [
      {
        ledgerId: receivableLedger.id,
        entryType: 'DEBIT',
        amount: amount,
        description: 'Amount receivable from customer',
      },
      {
        ledgerId: salesLedger.id,
        entryType: 'CREDIT',
        amount: amount,
        description: 'Lens sales revenue',
      },
    ],
    userId
  );
}

/**
 * Record a purchase transaction
 * Debit: Purchase Expense, Credit: Accounts Payable
 */
async function recordPurchase(purchaseOrderId, amount, description, userId) {
  const purchaseLedger = await prisma.ledger.findFirst({
    where: { ledgerCode: 'EX-1001' }, // Lens Purchase Expense
  });
  const payableLedger = await prisma.ledger.findFirst({
    where: { ledgerCode: 'LI-1001' }, // Accounts Payable
  });

  if (!purchaseLedger || !payableLedger) {
    throw new Error('Required ledgers not found. Please run seed script.');
  }

  return await createFinancialTransaction(
    {
      transactionType: 'PURCHASE',
      referenceType: 'PURCHASE_ORDER',
      referenceId: purchaseOrderId,
      referenceNumber: `PO-${purchaseOrderId}`,
      description: description || 'Purchase of lenses from vendor',
      transactionDate: new Date(),
    },
    [
      {
        ledgerId: purchaseLedger.id,
        entryType: 'DEBIT',
        amount: amount,
        description: 'Lens purchase cost',
      },
      {
        ledgerId: payableLedger.id,
        entryType: 'CREDIT',
        amount: amount,
        description: 'Amount payable to vendor',
      },
    ],
    userId
  );
}

/**
 * Record payment to vendor
 * Debit: Accounts Payable, Credit: Bank/Cash
 */
async function recordVendorPayment(amount, paymentMethod, description, userId) {
  const payableLedger = await prisma.ledger.findFirst({
    where: { ledgerCode: 'LI-1001' }, // Accounts Payable
  });

  // Choose payment ledger based on method
  const paymentLedgerCode = paymentMethod === 'CASH' ? 'AS-1001' : 'AS-1002';
  const paymentLedger = await prisma.ledger.findFirst({
    where: { ledgerCode: paymentLedgerCode },
  });

  if (!payableLedger || !paymentLedger) {
    throw new Error('Required ledgers not found. Please run seed script.');
  }

  return await createFinancialTransaction(
    {
      transactionType: 'PAYMENT',
      referenceType: 'PAYMENT',
      description: description || 'Payment made to vendor',
      transactionDate: new Date(),
    },
    [
      {
        ledgerId: payableLedger.id,
        entryType: 'DEBIT',
        amount: amount,
        description: 'Vendor payment',
      },
      {
        ledgerId: paymentLedger.id,
        entryType: 'CREDIT',
        amount: amount,
        description: `Payment via ${paymentMethod}`,
      },
    ],
    userId
  );
}

/**
 * Record payment received from customer
 * Debit: Bank/Cash, Credit: Accounts Receivable
 */
async function recordCustomerReceipt(amount, paymentMethod, description, userId) {
  const receivableLedger = await prisma.ledger.findFirst({
    where: { ledgerCode: 'AS-1003' }, // Accounts Receivable
  });

  // Choose receipt ledger based on method
  const receiptLedgerCode = paymentMethod === 'CASH' ? 'AS-1001' : 'AS-1002';
  const receiptLedger = await prisma.ledger.findFirst({
    where: { ledgerCode: receiptLedgerCode },
  });

  if (!receivableLedger || !receiptLedger) {
    throw new Error('Required ledgers not found. Please run seed script.');
  }

  return await createFinancialTransaction(
    {
      transactionType: 'RECEIPT',
      referenceType: 'RECEIPT',
      description: description || 'Payment received from customer',
      transactionDate: new Date(),
    },
    [
      {
        ledgerId: receiptLedger.id,
        entryType: 'DEBIT',
        amount: amount,
        description: `Receipt via ${paymentMethod}`,
      },
      {
        ledgerId: receivableLedger.id,
        entryType: 'CREDIT',
        amount: amount,
        description: 'Customer payment received',
      },
    ],
    userId
  );
}

/**
 * Get ledger details with current balance
 */
async function getLedgerById(ledgerId) {
  return await prisma.ledger.findUnique({
    where: { id: ledgerId },
    include: {
      transactionEntries: {
        include: {
          transaction: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10, // Latest 10 entries
      },
    },
  });
}

/**
 * Get all ledgers grouped by type
 */
async function getAllLedgers() {
  return await prisma.ledger.findMany({
    where: {
      active_status: true,
      delete_status: false,
    },
    orderBy: [
      { ledgerType: 'asc' },
      { ledgerCode: 'asc' },
    ],
  });
}

/**
 * Get transaction by ID with all entries
 */
async function getTransactionById(transactionId) {
  return await prisma.financialTransaction.findUnique({
    where: { id: transactionId },
    include: {
      entries: {
        include: {
          ledger: true,
        },
      },
      createdByUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Get transactions with filters and pagination
 */
async function getTransactions(filters = {}, pagination = { page: 1, limit: 50 }) {
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const where = {
    ...(filters.transactionType && { transactionType: filters.transactionType }),
    ...(filters.referenceType && { referenceType: filters.referenceType }),
    ...(filters.isPosted !== undefined && { isPosted: filters.isPosted }),
    ...(filters.dateFrom && { transactionDate: { gte: new Date(filters.dateFrom) } }),
    ...(filters.dateTo && { transactionDate: { lte: new Date(filters.dateTo) } }),
  };

  const [transactions, total] = await Promise.all([
    prisma.financialTransaction.findMany({
      where,
      include: {
        entries: {
          include: {
            ledger: {
              select: {
                id: true,
                ledgerCode: true,
                ledgerName: true,
                ledgerType: true,
              },
            },
          },
        },
      },
      orderBy: { transactionDate: 'desc' },
      skip,
      take: limit,
    }),
    prisma.financialTransaction.count({ where }),
  ]);

  return {
    transactions,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Generate Trial Balance Report
 */
async function getTrialBalance() {
  const ledgers = await prisma.ledger.findMany({
    where: {
      active_status: true,
      delete_status: false,
    },
    select: {
      ledgerCode: true,
      ledgerName: true,
      ledgerType: true,
      currentBalance: true,
    },
    orderBy: [
      { ledgerType: 'asc' },
      { ledgerCode: 'asc' },
    ],
  });

  const totalBalance = ledgers.reduce((sum, ledger) => {
    return sum + parseFloat(ledger.currentBalance);
  }, 0);

  return {
    ledgers,
    totalBalance,
    isBalanced: Math.abs(totalBalance) < 0.01, // Should be near zero
  };
}

/**
 * Generate Profit & Loss Report
 */
async function getProfitLoss(fromDate, toDate) {
  const income = await prisma.ledger.aggregate({
    where: { ledgerType: 'INCOME', active_status: true },
    _sum: { currentBalance: true },
  });

  const expenses = await prisma.ledger.aggregate({
    where: { ledgerType: 'EXPENSE', active_status: true },
    _sum: { currentBalance: true },
  });

  const totalIncome = parseFloat(income._sum.currentBalance || 0);
  const totalExpenses = parseFloat(expenses._sum.currentBalance || 0);
  const netProfit = totalIncome - totalExpenses;

  return {
    totalIncome,
    totalExpenses,
    netProfit,
    profitMargin: totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0,
  };
}

module.exports = {
  generateTransactionNumber,
  validateTransactionEntries,
  createFinancialTransaction,
  recordCashSale,
  recordCreditSale,
  recordPurchase,
  recordVendorPayment,
  recordCustomerReceipt,
  getLedgerById,
  getAllLedgers,
  getTransactionById,
  getTransactions,
  getTrialBalance,
  getProfitLoss,
};
