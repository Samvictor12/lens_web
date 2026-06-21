/**
 * All Modules Test Seed — Master Orchestrator
 * ─────────────────────────────────────────────
 * Seeds test data for every module in the Lens Management System flow.
 * Safe to re-run (additive / upsert patterns).
 *
 * Recommended run order:
 *   1. npm run db:seed              ← base master data + users
 *   2. node prisma/seed/all-modules-test-seed.js   ← accounting + inventory
 *   3. node prisma/seed/dispatch-test-seed.js      ← dispatch module (optional)
 *
 * Or run everything in one shot:
 *   npm run db:seed:modules
 */

import { PrismaClient } from '@prisma/client';
import { seedFinancialLedgers } from './financial-ledgers-seed.js';
import { seedAccountingTestData } from './accounting-test-seed.js';

const prisma = new PrismaClient();
const USER_ID = 1;

async function seedInventoryTestData(client = prisma) {
  console.log('📦 Seeding inventory test data…');

  const lensProduct = await client.lensProductMaster.findFirst({ where: { deleteStatus: false } });
  const category = await client.lensCategoryMaster.findFirst({ where: { deleteStatus: false } });
  const lensType = await client.lensTypeMaster.findFirst({ where: { deleteStatus: false } });
  const coating = await client.lensCoatingMaster.findFirst({ where: { deleteStatus: false } });

  if (!lensProduct) {
    console.log('   ⚠️  Skipping inventory — no lens products found');
    return;
  }

  let location = await client.locationMaster.findFirst({ where: { name: 'Main Warehouse', deleteStatus: false } });
  if (!location) {
    location = await client.locationMaster.create({
      data: {
        name: 'Main Warehouse',
        description: 'Primary lens storage — Mumbai',
        activeStatus: true,
        deleteStatus: false,
        createdBy: USER_ID,
      },
    });
  }

  let tray = await client.trayMaster.findFirst({ where: { name: 'Tray A-01', deleteStatus: false } });
  if (!tray) {
    tray = await client.trayMaster.create({
      data: {
        name: 'Tray A-01',
        description: 'Single vision minus powers',
        capacity: 200,
        location_id: location.id,
        activeStatus: true,
        deleteStatus: false,
        createdBy: USER_ID,
      },
    });
  }

  const stockKey = {
    lens_id: lensProduct.id,
    category_id: category?.id ?? null,
    Type_id: lensType?.id ?? null,
    coating_id: coating?.id ?? null,
    location_id: location.id,
    tray_id: tray.id,
  };

  const existingStock = await client.inventoryStock.findFirst({
    where: { lens_id: stockKey.lens_id, location_id: location.id, tray_id: tray.id },
  });

  if (!existingStock) {
    await client.inventoryStock.create({
      data: {
        ...stockKey,
        totalStock: 50,
        availableStock: 45,
        reservedStock: 5,
        damagedStock: 0,
        avgCostPrice: 1000,
        lastCostPrice: 1000,
        sellingPrice: 1500,
        lastInwardDate: new Date('2026-02-01'),
      },
    });
    console.log('   ✅ Inventory stock: 50 units at Main Warehouse / Tray A-01');
  } else {
    console.log('   ⏭️  Inventory stock already exists');
  }

  const alertExists = await client.inventoryAlert.findFirst({
    where: { alertType: 'LOW_STOCK', message: { contains: 'TEST-ALERT' } },
  });
  if (!alertExists) {
    await client.inventoryAlert.create({
      data: {
        alertType: 'LOW_STOCK',
        priority: 'MEDIUM',
        message: 'TEST-ALERT: Stock below reorder level for Tray A-01',
        lens_id: lensProduct.id,
        location_id: location.id,
        currentStock: 5,
        thresholdLevel: 10,
        createdBy: USER_ID,
      },
    });
    console.log('   ✅ Low-stock alert created');
  }

  console.log('');
}

async function seedAccountsRoleUser(client = prisma) {
  console.log('👤 Ensuring Accounts department user…');

  const accountsRole = await client.role.upsert({
    where: { name: 'Accounts' },
    update: {},
    create: { name: 'Accounts' },
  });

  const accountsDept = await client.departmentDetails.upsert({
    where: { id: 4 },
    update: {},
    create: { id: 4, department: 'Accounts', active_status: true, delete_status: false, createdBy: USER_ID },
  });

  const bcrypt = await import('bcrypt');
  const hashed = await bcrypt.hash('admin123', 10);

  await client.user.upsert({
    where: { email: 'accounts@lensbilling.com' },
    update: {},
    create: {
      name: 'Accounts Manager',
      email: 'accounts@lensbilling.com',
      username: 'accounts',
      usercode: 'ACC001',
      password: hashed,
      role_id: accountsRole.id,
      department_id: accountsDept.id,
      active_status: true,
      delete_status: false,
      createdBy: USER_ID,
    },
  });
  console.log('   ✅ accounts@lensbilling.com / admin123\n');
}

async function main() {
  console.log('🌱 All Modules Test Seed — Starting\n');
  console.log('═══════════════════════════════════════\n');

  const user = await prisma.user.findUnique({ where: { id: USER_ID } });
  if (!user) {
    throw new Error('System user (id=1) not found. Run `npm run db:seed` first.');
  }

  // Module 10 — Financial Accounting
  await seedFinancialLedgers(prisma);
  await seedAccountingTestData(prisma);

  // Module 8 — Inventory
  await seedInventoryTestData(prisma);

  // Module 1 — Accounts user for testing permissions
  await seedAccountsRoleUser(prisma);

  console.log('═══════════════════════════════════════');
  console.log('🎉 All Modules Test Seed Complete!\n');
  console.log('Modules seeded:');
  console.log('  ✅ Chart of Accounts (20 AC-* ledgers + 7 expense categories)');
  console.log('  ✅ GL Transactions (opening, PO, vendor pay, invoices, expenses)');
  console.log('  ✅ Purchase Orders (TEST-PO-2026-001/002 with receipts)');
  console.log('  ✅ Invoices & Client Payments (TEST-INV-2026-001/002)');
  console.log('  ✅ Vendor Payment Voucher (TEST-VPV-2026-0001)');
  console.log('  ✅ Inventory (location, tray, stock, alert)');
  console.log('  ✅ Company Settings');
  console.log('  ✅ Accounts role user');
  console.log('\nOptional — Dispatch module:');
  console.log('  node prisma/seed/dispatch-test-seed.js');
  console.log('\n🔐 Login credentials:');
  console.log('  Admin    : admin@lensbilling.com  / admin123');
  console.log('  Accounts : accounts@lensbilling.com / admin123');
  console.log('═══════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('❌ All-modules seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
