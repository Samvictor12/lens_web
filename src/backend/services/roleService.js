// src/backend/services/roleService.js
import prisma from '../config/prisma.js';

// Helper to format permissions list from database rows into catalog schema layout
function formatPermissions(dbPermissions) {
  // We reconstruct the full catalog layout with default false values
  // then override with true for actions present in the database.
  const CATALOG_TEMPLATES = [
    { key: 'dashboard', label: 'Dashboard', actions: { Screen: false } },
    { key: 'sale_orders', label: 'Sale Orders', actions: { Screen: false, Create: false, Edit: false, View: false, Delete: false } },
    { key: 'inventory', label: 'Inventory', actions: { Screen: false, Create: false, Edit: false, View: false, Delete: false } },
    { key: 'purchase_orders', label: 'Purchase Orders', actions: { Screen: false, Create: false, Edit: false, View: false, Delete: false } },
    { key: 'dispatch', label: 'Dispatch', actions: { Screen: false, Create: false, Edit: false, View: false, Delete: false } },
    { key: 'production', label: 'Production', actions: { Screen: false } },
    { key: 'pre_qc', label: 'Pre-QC', actions: { Screen: false } },
    { key: 'post_qc', label: 'Post-QC', actions: { Screen: false } },
    { key: 'billing', label: 'Billing', actions: { Screen: false, Create: false, Edit: false, View: false, Delete: false } },
    { key: 'chart_of_accounts', label: 'Chart of Accounts', actions: { Screen: false, Create: false, Edit: false, View: false, Delete: false } },
    { key: 'expenses', label: 'Expenses', actions: { Screen: false, Create: false, Edit: false, View: false, Delete: false } },
    { key: 'vendor_payments', label: 'Vendor Payments', actions: { Screen: false, Create: false, Edit: false, View: false, Delete: false } },
    { key: 'bank_reconciliation', label: 'Bank Reconciliation', actions: { Screen: false, Create: false, Edit: false, View: false, Delete: false } },
    { key: 'financial_reports', label: 'Financial Reports', actions: { Screen: false } },
    { key: 'reports', label: 'Reports', actions: { Screen: false } },
    { key: 'business_categories', label: 'Business Categories', actions: { Screen: false, Create: false, Edit: false, View: false, Delete: false } },
    { key: 'expense_categories', label: 'Expense Categories', actions: { Screen: false, Create: false, Edit: false, View: false, Delete: false } },
    { key: 'customers', label: 'Customers', actions: { Screen: false, Create: false, Edit: false, View: false, Delete: false } },
    { key: 'vendors', label: 'Vendors', actions: { Screen: false, Create: false, Edit: false, View: false, Delete: false } },
    { key: 'departments', label: 'Departments', actions: { Screen: false, Create: false, Edit: false, View: false, Delete: false } },
    { key: 'users', label: 'Users', actions: { Screen: false, Create: false, Edit: false, View: false, Delete: false } },
    { key: 'check_sheets', label: 'Check Sheets', actions: { Screen: false, Create: false, Edit: false, View: false, Delete: false } },
    { key: 'lens_indexes', label: 'Lens Indexes', actions: { Screen: false, Create: false, Edit: false, View: false, Delete: false } },
    { key: 'lens_diameters', label: 'Lens Diameters', actions: { Screen: false, Create: false, Edit: false, View: false, Delete: false } },
    { key: 'lens_categories', label: 'Lens Categories', actions: { Screen: false, Create: false, Edit: false, View: false, Delete: false } },
    { key: 'lens_materials', label: 'Lens Materials', actions: { Screen: false, Create: false, Edit: false, View: false, Delete: false } },
    { key: 'lens_coatings', label: 'Lens Coatings', actions: { Screen: false, Create: false, Edit: false, View: false, Delete: false } },
    { key: 'lens_tintings', label: 'Lens Tintings', actions: { Screen: false, Create: false, Edit: false, View: false, Delete: false } },
    { key: 'lens_fittings', label: 'Lens Fittings', actions: { Screen: false, Create: false, Edit: false, View: false, Delete: false } },
    { key: 'lens_brands', label: 'Lens Brands', actions: { Screen: false, Create: false, Edit: false, View: false, Delete: false } },
    { key: 'lens_types', label: 'Lens Types', actions: { Screen: false, Create: false, Edit: false, View: false, Delete: false } },
    { key: 'lens_products', label: 'Lens Products', actions: { Screen: false, Create: false, Edit: false, View: false, Delete: false } },
    { key: 'lens_offers', label: 'Lens Offers', actions: { Screen: false, Create: false, Edit: false, View: false, Delete: false } },
    { key: 'locations', label: 'Locations', actions: { Screen: false, Create: false, Edit: false, View: false, Delete: false } },
    { key: 'trays', label: 'Trays', actions: { Screen: false, Create: false, Edit: false, View: false, Delete: false } },
    { key: 'price_mapping', label: 'Price Mapping', actions: { Screen: false, Create: false, Edit: false, View: false, Delete: false } }
  ];

  const dbPermSet = new Set(
    dbPermissions.map((p) => `${p.subject}:${p.action}`)
  );

  return CATALOG_TEMPLATES.map((tpl) => {
    const actions = { ...tpl.actions };
    Object.keys(actions).forEach((actName) => {
      actions[actName] = dbPermSet.has(`${tpl.key}:${actName}`);
    });
    return {
      key: tpl.key,
      label: tpl.label,
      actions,
    };
  });
}

/** Get list of roles (search, paginate, sort) */
export async function listRoles({
  page = 1,
  limit = 10,
  search = '',
  sort_by = 'createdAt',
  sort_order = 'desc',
} = {}) {
  const skip = (page - 1) * limit;

  const where = search
    ? {
        name: {
          contains: search,
          mode: 'insensitive',
        },
      }
    : {};

  const [roles, total] = await Promise.all([
    prisma.role.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { [sort_by]: sort_order },
    }),
    prisma.role.count({ where }),
  ]);

  return {
    records: roles.map((r) => ({
      id: r.id,
      name: r.name,
      active_status: true, // DB schema lacks active_status, default true
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
    total,
  };
}

/** Get single role by ID */
export async function getRoleById(id) {
  const roleId = parseInt(id);
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: {
      permissions: true,
    },
  });

  if (!role) {
    throw new Error('Role not found');
  }

  return {
    id: role.id,
    name: role.name,
    active_status: true,
    permissions: formatPermissions(role.permissions),
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
}

/** Create role */
export async function createRole(data) {
  const { role_name, permissions = [] } = data;

  // Validate unique name
  const existing = await prisma.role.findUnique({
    where: { name: role_name },
  });

  if (existing) {
    throw new Error(`Role name "${role_name}" already exists`);
  }

  const role = await prisma.role.create({
    data: { name: role_name },
  });

  // Extract all true permissions to write to db
  const permissionData = [];
  permissions.forEach((perm) => {
    Object.entries(perm.actions || {}).forEach(([actionName, enabled]) => {
      if (enabled) {
        permissionData.push({
          role_id: role.id,
          subject: perm.key,
          action: actionName,
        });
      }
    });
  });

  if (permissionData.length > 0) {
    await prisma.permission.createMany({
      data: permissionData,
    });
  }

  return getRoleById(role.id);
}

/** Update role */
export async function updateRole(id, data) {
  const roleId = parseInt(id);
  const { role_name, permissions = [] } = data;

  const existing = await prisma.role.findUnique({
    where: { id: roleId },
  });

  if (!existing) {
    throw new Error('Role not found');
  }

  // Validate unique name excluding self
  if (role_name && role_name !== existing.name) {
    const duplicate = await prisma.role.findUnique({
      where: { name: role_name },
    });
    if (duplicate) {
      throw new Error(`Role name "${role_name}" already exists`);
    }
  }

  // Update name
  await prisma.role.update({
    where: { id: roleId },
    data: { name: role_name },
  });

  // Delete all existing permissions
  await prisma.permission.deleteMany({
    where: { role_id: roleId },
  });

  // Create new active permissions
  const permissionData = [];
  permissions.forEach((perm) => {
    Object.entries(perm.actions || {}).forEach(([actionName, enabled]) => {
      if (enabled) {
        permissionData.push({
          role_id: roleId,
          subject: perm.key,
          action: actionName,
        });
      }
    });
  });

  if (permissionData.length > 0) {
    await prisma.permission.createMany({
      data: permissionData,
    });
  }

  return getRoleById(roleId);
}

/** Delete roles */
export async function deleteRoles(ids) {
  const numericIds = ids.map(Number);

  // Safety check: Admin (ID 1) cannot be deleted
  if (numericIds.includes(1)) {
    throw new Error('System Administrator role cannot be deleted');
  }

  // Verify that no users are currently assigned to these roles
  const usersWithRoles = await prisma.user.count({
    where: {
      role_id: { in: numericIds },
    },
  });

  if (usersWithRoles > 0) {
    throw new Error(
      `Cannot delete: ${usersWithRoles} user(s) are still assigned to the selected role(s). Reassign them first.`
    );
  }

  // Prisma relation is marked Cascade, so deleting the role will delete permissions automatically
  await prisma.role.deleteMany({
    where: {
      id: { in: numericIds },
    },
  });

  return { success: true };
}

/** Get list of permissions for a role */
export async function getRolePermissions(roleId) {
  const rId = parseInt(roleId);
  const permissions = await prisma.permission.findMany({
    where: { role_id: rId },
  });

  return {
    permissions: formatPermissions(permissions),
  };
}

/** Get roles dropdown */
export async function getRolesDropdown() {
  const roles = await prisma.role.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return roles.map((r) => ({
    id: r.id,
    label: r.name,
    value: r.id,
  }));
}
