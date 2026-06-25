/**
 * Financial Ledgers + Expense Categories Seed
 * Seeds the Chart of Accounts (AC-* codes) required by accountingService auto-posting.
 *
 * Run:  node prisma/seed/financial-ledgers-seed.js
 * Safe to re-run — uses upsert.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SYSTEM_USER_ID = 1;

/** @type {import('@prisma/client').Prisma.LedgerCreateInput[]} */
const SYSTEM_LEDGERS = [
  { ledgerCode: 'AC-1001', ledgerName: 'Cash in Hand', ledgerType: 'ASSET', description: 'Physical cash at premises', isSystemLedger: true },
  {
    ledgerCode: 'AC-1002',
    ledgerName: 'Bank Account (HDFC)',
    ledgerType: 'ASSET',
    description: 'Primary HDFC current account',
    isSystemLedger: true,
    bankDetails: { accountNumber: '50100123456789', ifscCode: 'HDFC0001234', bankName: 'HDFC Bank', branch: 'Mumbai Main' },
  },
  { ledgerCode: 'AC-1003', ledgerName: 'Accounts Receivable', ledgerType: 'ASSET', description: 'Customer outstanding', isSystemLedger: true },
  { ledgerCode: 'AC-1004', ledgerName: 'Inventory / Stock', ledgerType: 'ASSET', description: 'Lens stock value', isSystemLedger: true },
  { ledgerCode: 'AC-1005', ledgerName: 'GST Input Credit', ledgerType: 'ASSET', description: 'GST paid on purchases', isSystemLedger: true },
  { ledgerCode: 'AC-2001', ledgerName: 'Accounts Payable', ledgerType: 'LIABILITY', description: 'Vendor outstanding', isSystemLedger: true },
  { ledgerCode: 'AC-2002', ledgerName: 'TDS Payable', ledgerType: 'LIABILITY', description: 'Tax deducted at source payable', isSystemLedger: false },
  { ledgerCode: 'AC-2003', ledgerName: 'GST Output Collected', ledgerType: 'LIABILITY', description: 'GST collected on sales', isSystemLedger: true },
  { ledgerCode: 'AC-3001', ledgerName: 'Sales Revenue', ledgerType: 'INCOME', description: 'Net lens sales revenue', isSystemLedger: true },
  { ledgerCode: 'AC-3002', ledgerName: 'Other Income', ledgerType: 'INCOME', description: 'Miscellaneous income', isSystemLedger: false },
  { ledgerCode: 'AC-4001', ledgerName: 'Purchase / COGS', ledgerType: 'EXPENSE', description: 'Cost of goods purchased', isSystemLedger: true },
  { ledgerCode: 'AC-4002', ledgerName: 'Salary & Wages', ledgerType: 'EXPENSE', description: 'Employee salaries', isSystemLedger: false },
  { ledgerCode: 'AC-4003', ledgerName: 'Rent Expense', ledgerType: 'EXPENSE', description: 'Shop and office rent', isSystemLedger: false },
  { ledgerCode: 'AC-4004', ledgerName: 'Utilities', ledgerType: 'EXPENSE', description: 'Electricity, water, internet', isSystemLedger: false },
  { ledgerCode: 'AC-4005', ledgerName: 'Transport & Logistics', ledgerType: 'EXPENSE', description: 'Delivery and freight costs', isSystemLedger: false },
  { ledgerCode: 'AC-4006', ledgerName: 'Marketing & Advertising', ledgerType: 'EXPENSE', description: 'Promotional spend', isSystemLedger: false },
  { ledgerCode: 'AC-4007', ledgerName: 'Office Supplies', ledgerType: 'EXPENSE', description: 'Stationery and consumables', isSystemLedger: false },
  { ledgerCode: 'AC-4008', ledgerName: 'Repairs & Maintenance', ledgerType: 'EXPENSE', description: 'Equipment upkeep', isSystemLedger: false },
  { ledgerCode: 'AC-5001', ledgerName: "Owner's Capital", ledgerType: 'EQUITY', description: 'Owner investment', isSystemLedger: true },
  { ledgerCode: 'AC-5002', ledgerName: 'Retained Earnings', ledgerType: 'EQUITY', description: 'Accumulated profits', isSystemLedger: true },
];

const EXPENSE_CATEGORIES = [
  { name: 'Salary', ledgerCode: 'AC-4002' },
  { name: 'Rent', ledgerCode: 'AC-4003' },
  { name: 'Utilities', ledgerCode: 'AC-4004' },
  { name: 'Transport', ledgerCode: 'AC-4005' },
  { name: 'Marketing', ledgerCode: 'AC-4006' },
  { name: 'Office Supplies', ledgerCode: 'AC-4007' },
  { name: 'Repairs', ledgerCode: 'AC-4008' },
];

export async function seedFinancialLedgers(client = prisma) {
  console.log('🏦 Seeding Chart of Accounts (AC-* ledgers)…');

  for (const ledger of SYSTEM_LEDGERS) {
    const { bankDetails, ...rest } = ledger;
    await client.ledger.upsert({
      where: { ledgerCode: ledger.ledgerCode },
      update: {
        ledgerName: ledger.ledgerName,
        description: ledger.description,
        isSystemLedger: ledger.isSystemLedger,
        ...(bankDetails ? { bankDetails } : {}),
      },
      create: {
        ...rest,
        openingBalance: 0,
        currentBalance: 0,
        createdBy: SYSTEM_USER_ID,
        ...(bankDetails ? { bankDetails } : {}),
      },
    });
  }

  console.log(`   ✅ ${SYSTEM_LEDGERS.length} ledgers upserted`);

  console.log('📂 Seeding expense categories…');
  for (const cat of EXPENSE_CATEGORIES) {
    const ledger = await client.ledger.findFirst({ where: { ledgerCode: cat.ledgerCode } });
    await client.expenseCategory.upsert({
      where: { name: cat.name },
      update: { ledger_id: ledger?.id ?? null },
      create: { name: cat.name, ledger_id: ledger?.id ?? null, createdBy: SYSTEM_USER_ID },
    });
  }
  console.log(`   ✅ ${EXPENSE_CATEGORIES.length} expense categories upserted\n`);
}

async function main() {
  try {
    const user = await prisma.user.findFirst({ where: { delete_status: false } });
    if (!user) {
      throw new Error('No active user found. Run `node prisma/seed/complete-seed.js` first.');
    }
    await seedFinancialLedgers();
    console.log('🎉 Financial ledgers seed complete.\n');
  } catch (error) {
    console.error('❌ Error seeding financial ledgers:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('financial-ledgers-seed.js');
if (isDirectRun) {
  main().catch(() => process.exit(1));
}
