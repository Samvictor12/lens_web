// scripts/role-seed.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_ROLES = [
  {
    id: 1,
    name: 'Admin',
    description: 'System Administrator with full access to all features and administration settings.',
    active_status: true,
  },
  {
    id: 2,
    name: 'Sales',
    description: 'Sales representative and management role focusing on sales orders, clients, dispatching, and pricing.',
    active_status: true,
  },
  {
    id: 3,
    name: 'Inventory',
    description: 'Warehouse manager and inventory coordinator role tracking item stock, purchase orders, locations, and vendors.',
    active_status: true,
  },
  {
    id: 4,
    name: 'Accounts',
    description: 'Accounting specialist role focusing on ledgers, expenses, invoices, vendor payments, and financial reports.',
    active_status: true,
  },
];

const MODULE_KEYS = [
  'dashboard', 'sale_orders', 'inventory', 'purchase_orders', 'dispatch',
  'fitting', 'pre_qc', 'post_qc', 'billing', 'chart_of_accounts',
  'expenses', 'customer_payments', 'vendor_payments', 'bank_reconciliation', 'financial_reports',
  'reports', 'business_categories', 'expense_categories', 'customers',
  'vendors', 'departments', 'users', 'check_sheets', 'lens_indexes',
  'lens_diameters', 'lens_categories', 'lens_materials', 'lens_coatings',
  'lens_tintings', 'lens_fittings', 'lens_brands', 'lens_types',
  'lens_products', 'lens_offers', 'locations', 'trays', 'price_mapping'
];

async function main() {
  console.log('Seeding roles into database...');
  for (const role of DEFAULT_ROLES) {
    await prisma.role.upsert({
      where: { id: role.id },
      update: {
        name: role.name,
        description: role.description,
        active_status: role.active_status,
      },
      create: role,
    });
  }
  console.log('Roles seeded successfully.');

  console.log('Seeding default role permissions...');
  // Clear any permissions if any exist
  await prisma.permission.deleteMany({});

  const permissionsToInsert = [];

  // 1. ADMIN PERMISSIONS: Grant screen/action permissions for ALL modules
  const adminModules = [...MODULE_KEYS];
  const fullActions = ['Screen', 'Create', 'Edit', 'View', 'Delete'];
  const screenOnlyModules = ['dashboard', 'fitting', 'pre_qc', 'post_qc', 'financial_reports', 'reports'];

  adminModules.forEach((mod) => {
    const actions = screenOnlyModules.includes(mod) ? ['Screen'] : fullActions;
    actions.forEach((act) => {
      permissionsToInsert.push({
        role_id: 1,
        subject: mod,
        action: act,
      });
    });
  });

  // 2. SALES PERMISSIONS
  const salesPermissions = [
    { mod: 'dashboard', acts: ['Screen'] },
    { mod: 'sale_orders', acts: ['Screen', 'Create', 'Edit', 'View', 'Delete'] },
    { mod: 'customers', acts: ['Screen', 'Create', 'Edit', 'View', 'Delete'] },
    { mod: 'dispatch', acts: ['Screen', 'Create', 'Edit', 'View', 'Delete'] },
    { mod: 'price_mapping', acts: ['Screen', 'Create', 'Edit', 'View', 'Delete'] },
    { mod: 'business_categories', acts: ['Screen', 'View'] },
  ];
  salesPermissions.forEach((p) => {
    p.acts.forEach((act) => {
      permissionsToInsert.push({
        role_id: 2,
        subject: p.mod,
        action: act,
      });
    });
  });

  // 3. INVENTORY PERMISSIONS
  const inventoryPermissions = [
    { mod: 'dashboard', acts: ['Screen'] },
    { mod: 'inventory', acts: ['Screen', 'Create', 'Edit', 'View', 'Delete'] },
    { mod: 'purchase_orders', acts: ['Screen', 'Create', 'Edit', 'View', 'Delete'] },
    { mod: 'vendors', acts: ['Screen', 'Create', 'Edit', 'View', 'Delete'] },
    { mod: 'locations', acts: ['Screen', 'Create', 'Edit', 'View', 'Delete'] },
    { mod: 'trays', acts: ['Screen', 'Create', 'Edit', 'View', 'Delete'] },
    { mod: 'dispatch', acts: ['Screen', 'Create', 'Edit', 'View'] },
  ];
  inventoryPermissions.forEach((p) => {
    p.acts.forEach((act) => {
      permissionsToInsert.push({
        role_id: 3,
        subject: p.mod,
        action: act,
      });
    });
  });

  // 4. ACCOUNTS PERMISSIONS
  const accountsPermissions = [
    { mod: 'dashboard', acts: ['Screen'] },
    { mod: 'billing', acts: ['Screen', 'Create', 'Edit', 'View', 'Delete'] },
    { mod: 'chart_of_accounts', acts: ['Screen', 'Create', 'Edit', 'View', 'Delete'] },
    { mod: 'expenses', acts: ['Screen', 'Create', 'Edit', 'View', 'Delete'] },
    { mod: 'expense_categories', acts: ['Screen', 'Create', 'Edit', 'View', 'Delete'] },
    { mod: 'customer_payments', acts: ['Screen', 'Create', 'Edit', 'View', 'Delete'] },
    { mod: 'vendor_payments', acts: ['Screen', 'Create', 'Edit', 'View', 'Delete'] },
    { mod: 'bank_reconciliation', acts: ['Screen', 'Create', 'Edit', 'View', 'Delete'] },
    { mod: 'financial_reports', acts: ['Screen'] },
    { mod: 'reports', acts: ['Screen'] },
  ];
  accountsPermissions.forEach((p) => {
    p.acts.forEach((act) => {
      permissionsToInsert.push({
        role_id: 4,
        subject: p.mod,
        action: act,
      });
    });
  });

  await prisma.permission.createMany({
    data: permissionsToInsert,
  });
  console.log(`Permissions seeded successfully: ${permissionsToInsert.length} records.`);

  // 5. RESTORE USER ROLES
  console.log('Restoring role assignments for existing users...');
  const users = await prisma.user.findMany({
    select: { id: true, username: true, email: true },
  });

  for (const user of users) {
    let assignedRoleId = 1; // Default to Admin
    const uName = (user.username || '').toLowerCase();
    const email = (user.email || '').toLowerCase();

    if (uName.includes('sales') || email.includes('sales')) {
      assignedRoleId = 2;
    } else if (uName.includes('inventory') || email.includes('inventory') || uName.includes('stock')) {
      assignedRoleId = 3;
    } else if (uName.includes('account') || email.includes('account') || uName.includes('billing')) {
      assignedRoleId = 4;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { role_id: assignedRoleId },
    });
    console.log(`User "${user.username}" reassigned to role ID: ${assignedRoleId}`);
  }

  console.log('All db seeding tasks completed successfully.');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
