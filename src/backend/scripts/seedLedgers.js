import prisma from '../config/prisma.js';

const SYSTEM_LEDGERS = [
  { ledgerCode: 'AC-1001', ledgerName: 'Cash in Hand',          ledgerType: 'ASSET' },
  { ledgerCode: 'AC-1003', ledgerName: 'Accounts Receivable',   ledgerType: 'ASSET' },
  { ledgerCode: 'AC-1004', ledgerName: 'Inventory / Stock',     ledgerType: 'ASSET' },
  { ledgerCode: 'AC-1005', ledgerName: 'GST Input Credit',      ledgerType: 'ASSET' },
  { ledgerCode: 'AC-2001', ledgerName: 'Accounts Payable',      ledgerType: 'LIABILITY' },
  { ledgerCode: 'AC-2002', ledgerName: 'Salary Payable',        ledgerType: 'LIABILITY' },
  { ledgerCode: 'AC-2003', ledgerName: 'GST Output Payable',    ledgerType: 'LIABILITY' },
  { ledgerCode: 'AC-3001', ledgerName: 'Sales Revenue',         ledgerType: 'INCOME' },
  { ledgerCode: 'AC-3002', ledgerName: 'Service Income',        ledgerType: 'INCOME' },
  { ledgerCode: 'AC-4001', ledgerName: 'Purchase / Cost of Goods', ledgerType: 'EXPENSE' },
  { ledgerCode: 'AC-4002', ledgerName: 'Salary Expense',        ledgerType: 'EXPENSE' },
  { ledgerCode: 'AC-4003', ledgerName: 'Petty Cash Expense',    ledgerType: 'EXPENSE' },
  { ledgerCode: 'AC-4004', ledgerName: 'Rent Expense',          ledgerType: 'EXPENSE' },
  { ledgerCode: 'AC-4005', ledgerName: 'Utilities Expense',     ledgerType: 'EXPENSE' },
  { ledgerCode: 'AC-4006', ledgerName: 'Miscellaneous Expense', ledgerType: 'EXPENSE' },
  { ledgerCode: 'AC-5001', ledgerName: "Owner's Capital",       ledgerType: 'EQUITY' },
];

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Salary',        ledgerCode: 'AC-4002' },
  { name: 'Petty Cash',    ledgerCode: 'AC-4003' },
  { name: 'Rent',          ledgerCode: 'AC-4004' },
  { name: 'Utilities',     ledgerCode: 'AC-4005' },
  { name: 'Miscellaneous', ledgerCode: 'AC-4006' },
];

async function seedLedgers() {
  console.log('Seeding system ledgers...');
  let created = 0, skipped = 0;

  for (const ledger of SYSTEM_LEDGERS) {
    const exists = await prisma.ledger.findFirst({ where: { ledgerCode: ledger.ledgerCode } });
    if (exists) { skipped++; continue; }
    await prisma.ledger.create({
      data: { ...ledger, isSystemLedger: true, openingBalance: 0, currentBalance: 0, createdBy: 1 },
    });
    created++;
  }
  console.log(`  Ledgers: ${created} created, ${skipped} skipped`);

  console.log('Seeding expense categories...');
  let catCreated = 0, catSkipped = 0;
  for (const cat of DEFAULT_EXPENSE_CATEGORIES) {
    const exists = await prisma.expenseCategory.findFirst({ where: { name: cat.name } });
    if (exists) { catSkipped++; continue; }
    const ledger = await prisma.ledger.findFirst({ where: { ledgerCode: cat.ledgerCode } });
    await prisma.expenseCategory.create({
      data: { name: cat.name, ledger_id: ledger?.id || null, createdBy: 1 },
    });
    catCreated++;
  }
  console.log(`  Categories: ${catCreated} created, ${catSkipped} skipped`);
  console.log('Seed complete.');
}

seedLedgers()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
