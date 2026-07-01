// role.constants.js — RBAC keys for Lens Web modules

export const ROLE_REDIRECT_URL = '/masters/roles';

export const ROLE_PERMISSION_ACTIONS = {
  SCREEN: 'Screen',
  CREATE: 'Create',
  EDIT: 'Edit',
  VIEW: 'View',
  DELETE: 'Delete',
};

export const ROLE_PERMISSION_KEYS = {
  DASHBOARD: 'dashboard',
  SALE_ORDERS: 'sale_orders',
  INVENTORY: 'inventory',
  PURCHASE_ORDERS: 'purchase_orders',
  DISPATCH: 'dispatch',
  PRODUCTION: 'production',
  PRE_QC: 'pre_qc',
  POST_QC: 'post_qc',
  BILLING: 'billing',
  CHART_OF_ACCOUNTS: 'chart_of_accounts',
  EXPENSES: 'expenses',
  VENDOR_PAYMENTS: 'vendor_payments',
  BANK_RECONCILIATION: 'bank_reconciliation',
  FINANCIAL_REPORTS: 'financial_reports',
  REPORTS: 'reports',
  BUSINESS_CATEGORIES: 'business_categories',
  EXPENSE_CATEGORIES: 'expense_categories',
  CUSTOMERS: 'customers',
  VENDORS: 'vendors',
  DEPARTMENTS: 'departments',
  USERS: 'users',
  CHECK_SHEETS: 'check_sheets',
  LENS_INDEXES: 'lens_indexes',
  LENS_DIAMETERS: 'lens_diameters',
  LENS_CATEGORIES: 'lens_categories',
  LENS_MATERIALS: 'lens_materials',
  LENS_COATINGS: 'lens_coatings',
  LENS_TINTINGS: 'lens_tintings',
  LENS_FITTINGS: 'lens_fittings',
  LENS_BRANDS: 'lens_brands',
  LENS_TYPES: 'lens_types',
  LENS_PRODUCTS: 'lens_products',
  LENS_OFFERS: 'lens_offers',
  LOCATIONS: 'locations',
  TRAYS: 'trays',
  PRICE_MAPPING: 'price_mapping',
};

const CRUD = {
  Screen: false,
  Create: false,
  Edit: false,
  View: false,
  Delete: false,
};

const SCREEN_ONLY = { Screen: false };

function perm(key, label, actions) {
  return { key, label, actions };
}

export const PERMISSION_CATALOG = [
  perm('dashboard', 'Dashboard', { ...SCREEN_ONLY }),
  perm('sale_orders', 'Sale Orders', { ...CRUD }),
  perm('inventory', 'Inventory', { ...CRUD }),
  perm('purchase_orders', 'Purchase Orders', { ...CRUD }),
  perm('dispatch', 'Dispatch', { ...CRUD }),
  perm('production', 'Production', { ...SCREEN_ONLY }),
  perm('pre_qc', 'Pre-QC', { ...SCREEN_ONLY }),
  perm('post_qc', 'Post-QC', { ...SCREEN_ONLY }),
  perm('billing', 'Billing', { ...CRUD }),
  perm('chart_of_accounts', 'Chart of Accounts', { ...CRUD }),
  perm('expenses', 'Expenses', { ...CRUD }),
  perm('vendor_payments', 'Vendor Payments', { ...CRUD }),
  perm('bank_reconciliation', 'Bank Reconciliation', { ...CRUD }),
  perm('financial_reports', 'Financial Reports', { ...SCREEN_ONLY }),
  perm('reports', 'Reports', { ...SCREEN_ONLY }),
  perm('business_categories', 'Business Categories', { ...CRUD }),
  perm('expense_categories', 'Expense Categories', { ...CRUD }),
  perm('customers', 'Customers', { ...CRUD }),
  perm('vendors', 'Vendors', { ...CRUD }),
  perm('departments', 'Departments', { ...CRUD }),
  perm('users', 'Users', { ...CRUD }),
  perm('check_sheets', 'Check Sheets', { ...CRUD }),
  perm('lens_indexes', 'Lens Indexes', { ...CRUD }),
  perm('lens_diameters', 'Lens Diameters', { ...CRUD }),
  perm('lens_categories', 'Lens Categories', { ...CRUD }),
  perm('lens_materials', 'Lens Materials', { ...CRUD }),
  perm('lens_coatings', 'Lens Coatings', { ...CRUD }),
  perm('lens_tintings', 'Lens Tintings', { ...CRUD }),
  perm('lens_fittings', 'Lens Fittings', { ...CRUD }),
  perm('lens_brands', 'Lens Brands', { ...CRUD }),
  perm('lens_types', 'Lens Types', { ...CRUD }),
  perm('lens_products', 'Lens Products', { ...CRUD }),
  perm('lens_offers', 'Lens Offers', { ...CRUD }),
  perm('locations', 'Locations', { ...CRUD }),
  perm('trays', 'Trays', { ...CRUD }),
  perm('price_mapping', 'Price Mapping', { ...CRUD }),
];

export const initialRoleData = {
  name: '',
  description: '',
  permissions: PERMISSION_CATALOG.map((p) => ({
    ...p,
    actions: { ...p.actions },
  })),
  active_status: true,
};

export function mergePermissions(fetched) {
  const fetchedByKey = new Map(fetched.map((p) => [p.key, p]));
  const catalogKeys = new Set(PERMISSION_CATALOG.map((p) => p.key));

  const merged = PERMISSION_CATALOG.map((defaultPerm) => {
    const fetchedPerm = fetchedByKey.get(defaultPerm.key);
    if (!fetchedPerm) return { ...defaultPerm, actions: { ...defaultPerm.actions } };
    return {
      ...defaultPerm,
      actions: { ...defaultPerm.actions, ...fetchedPerm.actions },
    };
  });

  for (const p of fetched) {
    if (!catalogKeys.has(p.key)) {
      merged.push(p);
    }
  }

  return merged;
}

export function permissionsToModuleActions(permissions) {
  const map = {};
  for (const p of permissions) {
    map[p.key] = p.actions || {};
  }
  return map;
}
