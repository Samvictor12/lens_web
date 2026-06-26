/**
 * Backfill Vendor/Customer Subsidiary Ledgers
 * Creates a per-vendor / per-customer Ledger row (child of AC-2001 / AC-1003)
 * for any pre-existing Vendor/Customer that does not yet have one.
 *
 * Run:  node prisma/seed/backfill-vendor-customer-ledgers.js
 * Safe to re-run — only touches rows where ledgerId is null.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function backfillVendorCustomerLedgers(client = prisma) {
  console.log('🔗 Backfilling vendor/customer subsidiary ledgers…');

  const apLedger = await client.ledger.findFirst({ where: { ledgerCode: 'AC-2001', delete_status: false } });
  if (!apLedger) {
    throw new Error('System ledger AC-2001 not found. Run `npm run db:seed:ledgers` first.');
  }

  const arLedger = await client.ledger.findFirst({ where: { ledgerCode: 'AC-1003', delete_status: false } });
  if (!arLedger) {
    throw new Error('System ledger AC-1003 not found. Run `npm run db:seed:ledgers` first.');
  }

  // ── Vendors ────────────────────────────────────────────────────────────────
  const vendors = await client.vendor.findMany({ where: { ledgerId: null, delete_status: false } });
  let vendorCount = 0;
  for (const vendor of vendors) {
    await client.$transaction(async (tx) => {
      const newLedger = await tx.ledger.create({
        data: {
          ledgerCode: `AC-2001-V${vendor.id}`,
          ledgerName: `${vendor.name} (Vendor AP)`.slice(0, 191),
          ledgerType: 'LIABILITY',
          parentLedgerId: apLedger.id,
          isSystemLedger: false,
          openingBalance: 0,
          currentBalance: 0,
          createdBy: vendor.createdBy,
        },
      });
      await tx.vendor.update({ where: { id: vendor.id }, data: { ledgerId: newLedger.id } });
    });
    vendorCount += 1;
  }
  console.log(`   ✅ ${vendorCount} vendor ledger(s) created`);

  // ── Customers ──────────────────────────────────────────────────────────────
  const customers = await client.customer.findMany({ where: { ledgerId: null, delete_status: false } });
  let customerCount = 0;
  for (const customer of customers) {
    await client.$transaction(async (tx) => {
      const newLedger = await tx.ledger.create({
        data: {
          ledgerCode: `AC-1003-C${customer.id}`,
          ledgerName: `${customer.name} (Customer AR)`.slice(0, 191),
          ledgerType: 'ASSET',
          parentLedgerId: arLedger.id,
          isSystemLedger: false,
          openingBalance: 0,
          currentBalance: 0,
          createdBy: customer.createdBy,
        },
      });
      await tx.customer.update({ where: { id: customer.id }, data: { ledgerId: newLedger.id } });
    });
    customerCount += 1;
  }
  console.log(`   ✅ ${customerCount} customer ledger(s) created\n`);

  return { vendorCount, customerCount };
}

async function main() {
  try {
    await backfillVendorCustomerLedgers();
    console.log('🎉 Vendor/customer ledger backfill complete.\n');
  } catch (error) {
    console.error('❌ Error backfilling vendor/customer ledgers:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('backfill-vendor-customer-ledgers.js');
if (isDirectRun) {
  main().catch(() => process.exit(1));
}
