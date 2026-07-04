/**
 * Account Groups seed + ledger classification mapping.
 * Run after migration: node prisma/seed/account-groups-seed.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SYSTEM_USER_ID = 1;

/** @type {Array<{ groupCode: string; groupName: string; nature: string; parentCode?: string; reportSection: string; pnlClassification: string; sortOrder: number; isSystemGroup?: boolean }>} */
const GROUPS = [
  { groupCode: 'GRP-ASSETS', groupName: 'Assets', nature: 'ASSET', reportSection: 'BALANCE_SHEET', pnlClassification: 'NOT_APPLICABLE', sortOrder: 10, isSystemGroup: true },
  { groupCode: 'GRP-CURRENT-ASSETS', groupName: 'Current Assets', nature: 'ASSET', parentCode: 'GRP-ASSETS', reportSection: 'BALANCE_SHEET', pnlClassification: 'NOT_APPLICABLE', sortOrder: 11, isSystemGroup: true },
  { groupCode: 'GRP-CASH', groupName: 'Cash-in-Hand', nature: 'ASSET', parentCode: 'GRP-CURRENT-ASSETS', reportSection: 'BALANCE_SHEET', pnlClassification: 'NOT_APPLICABLE', sortOrder: 12, isSystemGroup: true },
  { groupCode: 'GRP-BANK', groupName: 'Bank Accounts', nature: 'ASSET', parentCode: 'GRP-CURRENT-ASSETS', reportSection: 'BALANCE_SHEET', pnlClassification: 'NOT_APPLICABLE', sortOrder: 13, isSystemGroup: true },
  { groupCode: 'GRP-SUNDRY-DEBTORS', groupName: 'Sundry Debtors', nature: 'ASSET', parentCode: 'GRP-CURRENT-ASSETS', reportSection: 'BALANCE_SHEET', pnlClassification: 'NOT_APPLICABLE', sortOrder: 14, isSystemGroup: true },
  { groupCode: 'GRP-INVENTORY', groupName: 'Inventory / Stock', nature: 'ASSET', parentCode: 'GRP-CURRENT-ASSETS', reportSection: 'BALANCE_SHEET', pnlClassification: 'NOT_APPLICABLE', sortOrder: 15, isSystemGroup: true },
  { groupCode: 'GRP-GST-INPUT', groupName: 'GST Input Credit', nature: 'ASSET', parentCode: 'GRP-CURRENT-ASSETS', reportSection: 'BALANCE_SHEET', pnlClassification: 'NOT_APPLICABLE', sortOrder: 16, isSystemGroup: true },

  { groupCode: 'GRP-LIABILITIES', groupName: 'Liabilities', nature: 'LIABILITY', reportSection: 'BALANCE_SHEET', pnlClassification: 'NOT_APPLICABLE', sortOrder: 20, isSystemGroup: true },
  { groupCode: 'GRP-CURRENT-LIAB', groupName: 'Current Liabilities', nature: 'LIABILITY', parentCode: 'GRP-LIABILITIES', reportSection: 'BALANCE_SHEET', pnlClassification: 'NOT_APPLICABLE', sortOrder: 21, isSystemGroup: true },
  { groupCode: 'GRP-SUNDRY-CREDITORS', groupName: 'Sundry Creditors', nature: 'LIABILITY', parentCode: 'GRP-CURRENT-LIAB', reportSection: 'BALANCE_SHEET', pnlClassification: 'NOT_APPLICABLE', sortOrder: 22, isSystemGroup: true },
  { groupCode: 'GRP-GST-OUTPUT', groupName: 'GST Output Payable', nature: 'LIABILITY', parentCode: 'GRP-CURRENT-LIAB', reportSection: 'BALANCE_SHEET', pnlClassification: 'NOT_APPLICABLE', sortOrder: 23, isSystemGroup: true },
  { groupCode: 'GRP-TDS', groupName: 'TDS Payable', nature: 'LIABILITY', parentCode: 'GRP-CURRENT-LIAB', reportSection: 'BALANCE_SHEET', pnlClassification: 'NOT_APPLICABLE', sortOrder: 24, isSystemGroup: true },

  { groupCode: 'GRP-CAPITAL', groupName: 'Capital', nature: 'EQUITY', reportSection: 'BALANCE_SHEET', pnlClassification: 'NOT_APPLICABLE', sortOrder: 30, isSystemGroup: true },

  { groupCode: 'GRP-INCOME', groupName: 'Income', nature: 'INCOME', reportSection: 'PROFIT_LOSS', pnlClassification: 'NOT_APPLICABLE', sortOrder: 40, isSystemGroup: true },
  { groupCode: 'GRP-DIRECT-INCOME', groupName: 'Direct Income', nature: 'INCOME', parentCode: 'GRP-INCOME', reportSection: 'PROFIT_LOSS', pnlClassification: 'DIRECT_INCOME', sortOrder: 41, isSystemGroup: true },
  { groupCode: 'GRP-INDIRECT-INCOME', groupName: 'Indirect Income', nature: 'INCOME', parentCode: 'GRP-INCOME', reportSection: 'PROFIT_LOSS', pnlClassification: 'INDIRECT_INCOME', sortOrder: 42, isSystemGroup: true },

  { groupCode: 'GRP-EXPENSES', groupName: 'Expenses', nature: 'EXPENSE', reportSection: 'PROFIT_LOSS', pnlClassification: 'NOT_APPLICABLE', sortOrder: 50, isSystemGroup: true },
  { groupCode: 'GRP-DIRECT-EXP', groupName: 'Direct Expenses (COGS)', nature: 'EXPENSE', parentCode: 'GRP-EXPENSES', reportSection: 'PROFIT_LOSS', pnlClassification: 'DIRECT_EXPENSE', sortOrder: 51, isSystemGroup: true },
  { groupCode: 'GRP-INDIRECT-EXP', groupName: 'Indirect Expenses (Opex)', nature: 'EXPENSE', parentCode: 'GRP-EXPENSES', reportSection: 'PROFIT_LOSS', pnlClassification: 'INDIRECT_EXPENSE', sortOrder: 52, isSystemGroup: true },
];

/** ledgerCode → groupCode */
const LEDGER_GROUP_MAP = {
  'AC-1001': 'GRP-CASH',
  'AC-1002': 'GRP-BANK',
  'AC-1003': 'GRP-SUNDRY-DEBTORS',
  'AC-1004': 'GRP-INVENTORY',
  'AC-1005': 'GRP-GST-INPUT',
  'AC-2001': 'GRP-SUNDRY-CREDITORS',
  'AC-2002': 'GRP-TDS',
  'AC-2003': 'GRP-GST-OUTPUT',
  'AC-3001': 'GRP-DIRECT-INCOME',
  'AC-3002': 'GRP-INDIRECT-INCOME',
  'AC-4001': 'GRP-DIRECT-EXP',
  'AC-5001': 'GRP-CAPITAL',
  'AC-5002': 'GRP-CAPITAL',
};

const GROUP_CONTROL_LEDGER_CODES = ['AC-1003', 'AC-2001'];

const LEDGER_RENAMES = {
  'AC-1001': 'Petty Cash',
  'AC-1002': 'HDFC Current Account',
};

export async function seedAccountGroups(client = prisma, userId = SYSTEM_USER_ID) {
  console.log('📂 Seeding Account Groups…');

  const codeToId = {};

  for (const g of GROUPS.filter((x) => !x.parentCode)) {
    const row = await client.accountGroup.upsert({
      where: { groupCode: g.groupCode },
      update: {
        groupName: g.groupName,
        nature: g.nature,
        reportSection: g.reportSection,
        pnlClassification: g.pnlClassification,
        sortOrder: g.sortOrder,
        isSystemGroup: g.isSystemGroup ?? true,
      },
      create: {
        groupCode: g.groupCode,
        groupName: g.groupName,
        nature: g.nature,
        reportSection: g.reportSection,
        pnlClassification: g.pnlClassification,
        sortOrder: g.sortOrder,
        isSystemGroup: g.isSystemGroup ?? true,
        createdBy: userId,
      },
    });
    codeToId[g.groupCode] = row.id;
  }

  let pending = GROUPS.filter((x) => x.parentCode);
  while (pending.length) {
    const next = [];
    for (const g of pending) {
      const parentId = codeToId[g.parentCode];
      if (!parentId) {
        next.push(g);
        continue;
      }
      const row = await client.accountGroup.upsert({
        where: { groupCode: g.groupCode },
        update: {
          groupName: g.groupName,
          nature: g.nature,
          parentGroupId: parentId,
          reportSection: g.reportSection,
          pnlClassification: g.pnlClassification,
          sortOrder: g.sortOrder,
          isSystemGroup: g.isSystemGroup ?? true,
        },
        create: {
          groupCode: g.groupCode,
          groupName: g.groupName,
          nature: g.nature,
          parentGroupId: parentId,
          reportSection: g.reportSection,
          pnlClassification: g.pnlClassification,
          sortOrder: g.sortOrder,
          isSystemGroup: g.isSystemGroup ?? true,
          createdBy: userId,
        },
      });
      codeToId[g.groupCode] = row.id;
    }
    if (next.length === pending.length) break;
    pending = next;
  }

  console.log(`   ✅ ${Object.keys(codeToId).length} account groups upserted`);

  console.log('🔗 Mapping ledgers to account groups…');
  for (const [ledgerCode, groupCode] of Object.entries(LEDGER_GROUP_MAP)) {
    const groupId = codeToId[groupCode];
    if (!groupId) continue;
    const isControl = GROUP_CONTROL_LEDGER_CODES.includes(ledgerCode);
    await client.ledger.updateMany({
      where: { ledgerCode, delete_status: false },
      data: {
        accountGroupId: groupId,
        ...(isControl && { isGroupLedger: true, allowsDirectPosting: false }),
        ...(LEDGER_RENAMES[ledgerCode] && { ledgerName: LEDGER_RENAMES[ledgerCode] }),
      },
    });
  }

  // Customer AR sub-ledgers → Sundry Debtors
  const sdGroupId = codeToId['GRP-SUNDRY-DEBTORS'];
  if (sdGroupId) {
    await client.ledger.updateMany({
      where: { ledgerCode: { startsWith: 'AC-1003-C' }, delete_status: false },
      data: { accountGroupId: sdGroupId, allowsDirectPosting: true, isGroupLedger: false },
    });
  }

  // Vendor AP sub-ledgers → Sundry Creditors
  const scGroupId = codeToId['GRP-SUNDRY-CREDITORS'];
  if (scGroupId) {
    await client.ledger.updateMany({
      where: { ledgerCode: { startsWith: 'AC-2001-V' }, delete_status: false },
      data: { accountGroupId: scGroupId, allowsDirectPosting: true, isGroupLedger: false },
    });
  }

  // Indirect expense ledgers AC-4002..AC-4008
  const indirectId = codeToId['GRP-INDIRECT-EXP'];
  if (indirectId) {
    await client.ledger.updateMany({
      where: {
        ledgerCode: { in: ['AC-4002', 'AC-4003', 'AC-4004', 'AC-4005', 'AC-4006', 'AC-4007', 'AC-4008'] },
        delete_status: false,
      },
      data: { accountGroupId: indirectId },
    });
  }

  console.log('   ✅ Ledger group mapping complete\n');
  return codeToId;
}

async function main() {
  try {
    const user = await prisma.user.findFirst({ where: { delete_status: false } });
    if (!user) throw new Error('No active user found.');
    await seedAccountGroups(prisma, user.id);
    console.log('🎉 Account groups seed complete.\n');
  } finally {
    await prisma.$disconnect();
  }
}

const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('account-groups-seed.js');
if (isDirectRun) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

export default seedAccountGroups;
