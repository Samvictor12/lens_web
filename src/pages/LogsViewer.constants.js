// Initial filter states for audit and error logs
export const auditLogFilters = {
  userId: null,
  entity: null,
  action: null,
  startDate: null,
  endDate: null,
};

export const errorLogFilters = {
  userId: null,
  errorType: null,
  severity: null,
  resolved: null,
  startDate: null,
  endDate: null,
};

// Entity options for filtering
export const entityOptions = [
  { value: null, label: "All Entities" },
  { value: "SaleOrder", label: "Sale Order" },
  { value: "Customer", label: "Customer" },
  { value: "Vendor", label: "Vendor" },
  { value: "User", label: "User" },
  { value: "LensProduct", label: "Lens Product" },
  { value: "LensPriceMaster", label: "Lens Price Master" },
  { value: "Invoice", label: "Invoice" },
  { value: "PurchaseOrder", label: "Purchase Order" },
];

// Action options for filtering (READ removed as it's filtered out)
export const actionOptions = [
  { value: null, label: "All Actions" },
  { value: "CREATE", label: "Create" },
  { value: "UPDATE", label: "Update" },
  { value: "DELETE", label: "Delete" },
];

// Severity options for filtering
export const severityOptions = [
  { value: null, label: "All Severities" },
  { value: "INFO", label: "Info" },
  { value: "WARNING", label: "Warning" },
  { value: "ERROR", label: "Error" },
  { value: "CRITICAL", label: "Critical" },
];

// Error type options for filtering
export const errorTypeOptions = [
  { value: null, label: "All Error Types" },
  { value: "ValidationError", label: "Validation Error" },
  { value: "DatabaseError", label: "Database Error" },
  { value: "AuthenticationError", label: "Authentication Error" },
  { value: "AuthorizationError", label: "Authorization Error" },
  { value: "NotFoundError", label: "Not Found Error" },
  { value: "BusinessLogicError", label: "Business Logic Error" },
  { value: "ExternalApiError", label: "External API Error" },
];

// Resolved status options
export const resolvedOptions = [
  { value: null, label: "All Statuses" },
  { value: "true", label: "Resolved" },
  { value: "false", label: "Unresolved" },
];

// Badge colors for actions
export const actionColors = {
  CREATE: "bg-green-100 text-green-800 border-green-200",
  READ: "bg-blue-100 text-blue-800 border-blue-200",
  UPDATE: "bg-yellow-100 text-yellow-800 border-yellow-200",
  DELETE: "bg-red-100 text-red-800 border-red-200",
};

// Badge colors for severity
export const severityColors = {
  INFO: "bg-blue-100 text-blue-800 border-blue-200",
  WARNING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  ERROR: "bg-red-100 text-red-800 border-red-200",
  CRITICAL: "bg-purple-100 text-purple-800 border-purple-200",
};
