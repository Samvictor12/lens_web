/**
 * Seed script for Financial Accounting System
 * Creates initial Chart of Accounts (Ledgers) for the lens management system
 * 
 * Run: npx prisma db seed (or node prisma/seed/financial-ledgers-seed.js)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedFinancialLedgers() {
  console.log('🏦 Seeding Financial Ledgers (Chart of Accounts)...');

  // Default user ID for system entries (adjust as needed)
  const systemUserId = 1;

  // ============================================================
  // ASSETS
  // ============================================================
  
  // Current Assets
  const cashInHand = await prisma.ledger.upsert({
    where: { ledgerCode: 'AS-1001' },
    update: {},
    create: {
      ledgerCode: 'AS-1001',
      ledgerName: 'Cash in Hand',
      ledgerType: 'ASSET',
      description: 'Physical cash available at the business premises',
      isSystemLedger: true,
      openingBalance: 0,
      currentBalance: 0,
      createdBy: systemUserId,
    },
  });

  const bankAccount = await prisma.ledger.upsert({
    where: { ledgerCode: 'AS-1002' },
    update: {},
    create: {
      ledgerCode: 'AS-1002',
      ledgerName: 'Bank Account - Primary',
      ledgerType: 'ASSET',
      description: 'Primary bank account for business operations',
      isSystemLedger: true,
      openingBalance: 0,
      currentBalance: 0,
      bankDetails: {
        accountNumber: 'XXXXXXXXXX',
        ifscCode: 'XXXXXX',
        bankName: 'Bank Name',
        branch: 'Branch Name'
      },
      createdBy: systemUserId,
    },
  });

  const accountsReceivable = await prisma.ledger.upsert({
    where: { ledgerCode: 'AS-1003' },
    update: {},
    create: {
      ledgerCode: 'AS-1003',
      ledgerName: 'Accounts Receivable (Debtors)',
      ledgerType: 'ASSET',
      description: 'Money owed by customers for lens sales',
      isSystemLedger: true,
      openingBalance: 0,
      currentBalance: 0,
      createdBy: systemUserId,
    },
  });

  const inventory = await prisma.ledger.upsert({
    where: { ledgerCode: 'AS-1004' },
    update: {},
    create: {
      ledgerCode: 'AS-1004',
      ledgerName: 'Inventory - Lens Stock',
      ledgerType: 'ASSET',
      description: 'Value of lens inventory in stock',
      isSystemLedger: true,
      openingBalance: 0,
      currentBalance: 0,
      createdBy: systemUserId,
    },
  });

  // Fixed Assets
  const furnitureEquipment = await prisma.ledger.upsert({
    where: { ledgerCode: 'AS-2001' },
    update: {},
    create: {
      ledgerCode: 'AS-2001',
      ledgerName: 'Furniture & Equipment',
      ledgerType: 'ASSET',
      description: 'Office furniture, fixtures, and equipment',
      isSystemLedger: false,
      openingBalance: 0,
      currentBalance: 0,
      createdBy: systemUserId,
    },
  });

  // ============================================================
  // LIABILITIES
  // ============================================================
  
  const accountsPayable = await prisma.ledger.upsert({
    where: { ledgerCode: 'LI-1001' },
    update: {},
    create: {
      ledgerCode: 'LI-1001',
      ledgerName: 'Accounts Payable (Creditors)',
      ledgerType: 'LIABILITY',
      description: 'Money owed to vendors for lens purchases',
      isSystemLedger: true,
      openingBalance: 0,
      currentBalance: 0,
      createdBy: systemUserId,
    },
  });

  const gstPayable = await prisma.ledger.upsert({
    where: { ledgerCode: 'LI-1002' },
    update: {},
    create: {
      ledgerCode: 'LI-1002',
      ledgerName: 'GST Payable',
      ledgerType: 'LIABILITY',
      description: 'Goods and Services Tax payable to government',
      isSystemLedger: true,
      openingBalance: 0,
      currentBalance: 0,
      createdBy: systemUserId,
    },
  });

  const salariesPayable = await prisma.ledger.upsert({
    where: { ledgerCode: 'LI-1003' },
    update: {},
    create: {
      ledgerCode: 'LI-1003',
      ledgerName: 'Salaries Payable',
      ledgerType: 'LIABILITY',
      description: 'Outstanding salary payments to employees',
      isSystemLedger: false,
      openingBalance: 0,
      currentBalance: 0,
      createdBy: systemUserId,
    },
  });

  // ============================================================
  // INCOME
  // ============================================================
  
  const salesRevenue = await prisma.ledger.upsert({
    where: { ledgerCode: 'IN-1001' },
    update: {},
    create: {
      ledgerCode: 'IN-1001',
      ledgerName: 'Lens Sales Revenue',
      ledgerType: 'INCOME',
      description: 'Revenue from lens sales to customers',
      isSystemLedger: true,
      openingBalance: 0,
      currentBalance: 0,
      createdBy: systemUserId,
    },
  });

  const fittingCharges = await prisma.ledger.upsert({
    where: { ledgerCode: 'IN-1002' },
    update: {},
    create: {
      ledgerCode: 'IN-1002',
      ledgerName: 'Fitting Charges Income',
      ledgerType: 'INCOME',
      description: 'Income from lens fitting services',
      isSystemLedger: true,
      openingBalance: 0,
      currentBalance: 0,
      createdBy: systemUserId,
    },
  });

  const discountRecovered = await prisma.ledger.upsert({
    where: { ledgerCode: 'IN-1003' },
    update: {},
    create: {
      ledgerCode: 'IN-1003',
      ledgerName: 'Discount Recovered',
      ledgerType: 'INCOME',
      description: 'Discounts recovered or reversed',
      isSystemLedger: false,
      openingBalance: 0,
      currentBalance: 0,
      createdBy: systemUserId,
    },
  });

  // ============================================================
  // EXPENSES
  // ============================================================
  
  const purchaseExpense = await prisma.ledger.upsert({
    where: { ledgerCode: 'EX-1001' },
    update: {},
    create: {
      ledgerCode: 'EX-1001',
      ledgerName: 'Lens Purchase Expense',
      ledgerType: 'EXPENSE',
      description: 'Cost of lens purchases from vendors',
      isSystemLedger: true,
      openingBalance: 0,
      currentBalance: 0,
      createdBy: systemUserId,
    },
  });

  const salaryExpense = await prisma.ledger.upsert({
    where: { ledgerCode: 'EX-2001' },
    update: {},
    create: {
      ledgerCode: 'EX-2001',
      ledgerName: 'Salary Expense',
      ledgerType: 'EXPENSE',
      description: 'Employee salary payments',
      isSystemLedger: false,
      openingBalance: 0,
      currentBalance: 0,
      createdBy: systemUserId,
    },
  });

  const rentExpense = await prisma.ledger.upsert({
    where: { ledgerCode: 'EX-2002' },
    update: {},
    create: {
      ledgerCode: 'EX-2002',
      ledgerName: 'Rent Expense',
      ledgerType: 'EXPENSE',
      description: 'Office/shop rent payments',
      isSystemLedger: false,
      openingBalance: 0,
      currentBalance: 0,
      createdBy: systemUserId,
    },
  });

  const utilityExpense = await prisma.ledger.upsert({
    where: { ledgerCode: 'EX-2003' },
    update: {},
    create: {
      ledgerCode: 'EX-2003',
      ledgerName: 'Utility Expense',
      ledgerType: 'EXPENSE',
      description: 'Electricity, water, internet, phone bills',
      isSystemLedger: false,
      openingBalance: 0,
      currentBalance: 0,
      createdBy: systemUserId,
    },
  });

  const discountGiven = await prisma.ledger.upsert({
    where: { ledgerCode: 'EX-3001' },
    update: {},
    create: {
      ledgerCode: 'EX-3001',
      ledgerName: 'Discount Given',
      ledgerType: 'EXPENSE',
      description: 'Discounts given to customers on sales',
      isSystemLedger: true,
      openingBalance: 0,
      currentBalance: 0,
      createdBy: systemUserId,
    },
  });

  const transportExpense = await prisma.ledger.upsert({
    where: { ledgerCode: 'EX-3002' },
    update: {},
    create: {
      ledgerCode: 'EX-3002',
      ledgerName: 'Transport & Delivery Expense',
      ledgerType: 'EXPENSE',
      description: 'Costs for product delivery and transportation',
      isSystemLedger: false,
      openingBalance: 0,
      currentBalance: 0,
      createdBy: systemUserId,
    },
  });

  // ============================================================
  // EQUITY
  // ============================================================
  
  const ownersCapital = await prisma.ledger.upsert({
    where: { ledgerCode: 'EQ-1001' },
    update: {},
    create: {
      ledgerCode: 'EQ-1001',
      ledgerName: "Owner's Capital",
      ledgerType: 'EQUITY',
      description: "Owner's investment in the business",
      isSystemLedger: true,
      openingBalance: 0,
      currentBalance: 0,
      createdBy: systemUserId,
    },
  });

  const retainedEarnings = await prisma.ledger.upsert({
    where: { ledgerCode: 'EQ-1002' },
    update: {},
    create: {
      ledgerCode: 'EQ-1002',
      ledgerName: 'Retained Earnings',
      ledgerType: 'EQUITY',
      description: 'Accumulated profits retained in the business',
      isSystemLedger: true,
      openingBalance: 0,
      currentBalance: 0,
      createdBy: systemUserId,
    },
  });

  console.log('✅ Financial Ledgers seeded successfully!');
  console.log(`   - Assets: 6 ledgers`);
  console.log(`   - Liabilities: 3 ledgers`);
  console.log(`   - Income: 3 ledgers`);
  console.log(`   - Expenses: 6 ledgers`);
  console.log(`   - Equity: 2 ledgers`);
  console.log(`   Total: 20 ledgers created in Chart of Accounts`);
}

async function main() {
  try {
    await seedFinancialLedgers();
  } catch (error) {
    console.error('❌ Error seeding financial ledgers:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { seedFinancialLedgers };
