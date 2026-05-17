/**
 * One-time script: add Invoice create/read/update permissions to any role
 * that already has Invoice or SaleOrder read access but is missing them.
 *
 * Run with:  node prisma/seed/add-invoice-permissions.js
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔑 Patching Invoice permissions...\n');

  const roles = await prisma.role.findMany({
    include: { permissions: true },
  });

  for (const role of roles) {
    const subjects = role.permissions.map(p => p.subject);
    const actions  = role.permissions.map(p => p.action);

    // Admin: should already have 'all'; skip if already present
    const hasAll = subjects.includes('all');
    if (hasAll) {
      console.log(`  ✅ ${role.name} — already has 'all' permissions, skipping`);
      continue;
    }

    const hasInvoiceRead   = role.permissions.some(p => p.subject === 'Invoice' && p.action === 'read');
    const hasInvoiceCreate = role.permissions.some(p => p.subject === 'Invoice' && p.action === 'create');
    const hasInvoiceUpdate = role.permissions.some(p => p.subject === 'Invoice' && p.action === 'update');

    const toAdd = [];
    if (!hasInvoiceCreate) toAdd.push({ action: 'create', subject: 'Invoice', roleId: role.id });
    if (!hasInvoiceRead)   toAdd.push({ action: 'read',   subject: 'Invoice', roleId: role.id });
    if (!hasInvoiceUpdate) toAdd.push({ action: 'update', subject: 'Invoice', roleId: role.id });

    if (toAdd.length === 0) {
      console.log(`  ✅ ${role.name} — Invoice permissions already present`);
      continue;
    }

    // Only add to roles that deal with sales/accounts (have SaleOrder access) or are Accounts
    const hasSaleOrderAccess = subjects.includes('SaleOrder');
    const isAccountsRole     = role.name.toLowerCase().includes('account');

    if (!hasSaleOrderAccess && !isAccountsRole) {
      console.log(`  ⏭️  ${role.name} — skipping (no SaleOrder access, not Accounts)`);
      continue;
    }

    await prisma.permission.createMany({ data: toAdd });
    console.log(`  🔧 ${role.name} — added: ${toAdd.map(p => p.action).join(', ')} on Invoice`);
  }

  console.log('\n✅ Done');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
