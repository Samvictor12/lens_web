/**
 * Inventory Module Constants
 */

// Inventory Item Status Options
export const inventoryStatusOptions = [
  { value: 'AVAILABLE', label: 'Available', color: 'bg-green-100 text-green-800' },
  { value: 'RESERVED', label: 'Reserved', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'IN_PRODUCTION', label: 'In Production', color: 'bg-blue-100 text-blue-800' },
  { value: 'DAMAGED', label: 'Damaged', color: 'bg-red-100 text-red-800' },
  { value: 'RETURNED', label: 'Returned', color: 'bg-gray-100 text-gray-800' },
  { value: 'QUALITY_CHECK', label: 'Quality Check', color: 'bg-orange-100 text-orange-800' },
];

// Transaction Type Options
export const transactionTypeOptions = [
  { value: 'INWARD_PO', label: 'Inward (PO)', color: 'bg-green-100 text-green-800' },
  { value: 'INWARD_DIRECT', label: 'Direct Inward', color: 'bg-green-100 text-green-800' },
  { value: 'OUTWARD_SALE', label: 'Sale Outward', color: 'bg-red-100 text-red-800' },
  { value: 'OUTWARD_RETURN', label: 'Return Outward', color: 'bg-orange-100 text-orange-800' },
  { value: 'TRANSFER', label: 'Transfer', color: 'bg-blue-100 text-blue-800' },
  { value: 'ADJUSTMENT', label: 'Adjustment', color: 'bg-purple-100 text-purple-800' },
  { value: 'DAMAGE', label: 'Damage', color: 'bg-red-100 text-red-800' },
];

// Quality Grade Options
export const qualityGradeOptions = [
  { value: 'A', label: 'Grade A - Excellent' },
  { value: 'B', label: 'Grade B - Good' },
  { value: 'C', label: 'Grade C - Fair' },
];

// Default Inventory Item
export const defaultInventoryItem = {
  lens_id: null,
  category_id: null,
  Type_id: null,
  coating_id: null,
  dia_id: null,
  fitting_id: null,
  tinting_id: null,
  location_id: null,
  tray_id: null,
  quantity: 1,
  costPrice: 0,
  sellingPrice: null,
  rightEye: false,
  leftEye: false,
  rightSpherical: '',
  rightCylindrical: '',
  rightAxis: '',
  rightAdd: '',
  leftSpherical: '',
  leftCylindrical: '',
  leftAxis: '',
  leftAdd: '',
  status: 'AVAILABLE',
  batchNo: '',
  serialNo: '',
  expiryDate: null,
  manufactureDate: null,
  purchaseOrderId: null,
  vendorId: null,
  qualityGrade: 'A',
  notes: '',
};

// Default Transaction
export const defaultTransaction = {
  type: 'INWARD_DIRECT',
  inventoryItemId: null,
  quantity: 0,
  unitPrice: null,
  fromLocationId: null,
  fromTrayId: null,
  toLocationId: null,
  toTrayId: null,
  purchaseOrderId: null,
  saleOrderId: null,
  vendorId: null,
  reason: '',
  notes: '',
  batchNo: '',
};

// Filter Options
export const inventoryFilters = {
  search: '',
  status: 'all',
  lens_id: null,
  category_id: null,
  location_id: null,
  tray_id: null,
  vendor_id: null,
  startDate: '',
  endDate: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

export const transactionFilters = {
  search: '',
  type: 'all',
  inventoryItemId: null,
  startDate: '',
  endDate: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

// Table Column Configurations
export const inventoryItemColumns = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'batchNo', label: 'Batch No', sortable: true },
  { key: 'lensProduct', label: 'Lens Product', sortable: false },
  { key: 'category', label: 'Category', sortable: false },
  { key: 'location', label: 'Location', sortable: false },
  { key: 'tray', label: 'Tray', sortable: false },
  { key: 'quantity', label: 'Quantity', sortable: true },
  { key: 'costPrice', label: 'Cost Price', sortable: true },
  { key: 'sellingPrice', label: 'Selling Price', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'inwardDate', label: 'Inward Date', sortable: true },
  { key: 'actions', label: 'Actions', sortable: false },
];

export const transactionColumns = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'transactionNo', label: 'Transaction No', sortable: true },
  { key: 'type', label: 'Type', sortable: true },
  { key: 'inventoryItem', label: 'Item', sortable: false },
  { key: 'quantity', label: 'Quantity', sortable: true },
  { key: 'unitPrice', label: 'Unit Price', sortable: true },
  { key: 'totalValue', label: 'Total Value', sortable: true },
  { key: 'reason', label: 'Reason', sortable: false },
  { key: 'transactionDate', label: 'Date', sortable: true },
  { key: 'createdBy', label: 'Created By', sortable: false },
];

export const stockColumns = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'lensProduct', label: 'Lens Product', sortable: false },
  { key: 'category', label: 'Category', sortable: false },
  { key: 'location', label: 'Location', sortable: false },
  { key: 'totalStock', label: 'Total Stock', sortable: true },
  { key: 'availableStock', label: 'Available', sortable: true },
  { key: 'reservedStock', label: 'Reserved', sortable: true },
  { key: 'damagedStock', label: 'Damaged', sortable: true },
  { key: 'avgCostPrice', label: 'Avg Cost', sortable: true },
  { key: 'lastInwardDate', label: 'Last Inward', sortable: true },
];

// Navigation Items for Inventory Module
export const inventoryNavItems = [
  {
    key: 'items',
    label: 'Inventory Items',
    path: '/inventory/items',
    description: 'Manage inventory items and stock levels'
  },
  {
    key: 'inward',
    label: 'Inward Entry',
    path: '/inventory/inward',
    description: 'Add new stock to inventory'
  },
  {
    key: 'transactions',
    label: 'Transactions',
    path: '/inventory/transactions',
    description: 'View all inventory movements'
  },
  {
    key: 'stock',
    label: 'Stock Summary',
    path: '/inventory/stock',
    description: 'View stock summary and levels'
  },
  {
    key: 'reports',
    label: 'Reports',
    path: '/inventory/reports',
    description: 'Generate inventory reports'
  },
];

// Dashboard Cards Configuration
export const inventoryDashboardCards = [
  {
    title: 'Total Items',
    key: 'totalItems',
    color: 'blue',
    icon: 'Package',
  },
  {
    title: 'Available Items',
    key: 'availableItems',
    color: 'green',
    icon: 'CheckCircle',
  },
  {
    title: 'Reserved Items',
    key: 'reservedItems',
    color: 'yellow',
    icon: 'Clock',
  },
  {
    title: 'Low Stock Items',
    key: 'lowStockItems',
    color: 'red',
    icon: 'AlertTriangle',
  },
];

// Eye Specification Fields
export const eyeSpecFields = [
  { key: 'rightSpherical', label: 'R Spherical' },
  { key: 'rightCylindrical', label: 'R Cylindrical' },
  { key: 'rightAxis', label: 'R Axis' },
  { key: 'rightAdd', label: 'R Add' },
  { key: 'leftSpherical', label: 'L Spherical' },
  { key: 'leftCylindrical', label: 'L Cylindrical' },
  { key: 'leftAxis', label: 'L Axis' },
  { key: 'leftAdd', label: 'L Add' },
];

// Form Validation Rules
export const inventoryValidationRules = {
  lens_id: { required: true, message: 'Lens product is required' },
  quantity: { 
    required: true, 
    min: 0.1, 
    message: 'Quantity must be greater than 0' 
  },
  costPrice: { 
    required: true, 
    min: 0, 
    message: 'Cost price must be greater than or equal to 0' 
  },
  sellingPrice: { 
    min: 0, 
    message: 'Selling price must be greater than or equal to 0' 
  },
};

// Export utility functions
export const getStatusColor = (status) => {
  const statusOption = inventoryStatusOptions.find(opt => opt.value === status);
  return statusOption ? statusOption.color : 'bg-gray-100 text-gray-800';
};

export const getTransactionTypeColor = (type) => {
  const typeOption = transactionTypeOptions.find(opt => opt.value === type);
  return typeOption ? typeOption.color : 'bg-gray-100 text-gray-800';
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount || 0);
};

export const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
};

export const formatDateTime = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};