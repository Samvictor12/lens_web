export const defaultSaleOrder = {
  customerId: null,
  customerRefNo: "",
  orderDate: new Date().toISOString().split('T')[0],
  type: "",
  deliverySchedule: null,
  status: "DRAFT",
  remark: "",
  itemRefNo: "",
  mrdRefNo: "",
  freeLens: false,
  freeLensApprovalStatus: null,
  freeLensApprovedBy: null,
  freeLensApprovedAt: null,
  freeLensRejectedBy: null,
  freeLensRejectedAt: null,
  freeLensApprovalRemark: null,
  freeFitting: false,
  onlyLens: false,
  urgentOrder: false,
  offer_id: null,
  
  // Lens Information
  lens_id: null,
  category_id: null,
  Type_id: null,
  dia_id: null,
  fitting_id: null,
  coating_id: null,
  tinting_id: null,
  material_id: null,
  
  // Eye Selection
  rightEye: false,
  leftEye: false,
  
  // Right Eye Specs
  rightSpherical: "",
  rightCylindrical: "",
  rightAxis: "",
  rightAdd: "",
  rightDia: "",
  // base and bled removed
  
  // Left Eye Specs
  leftSpherical: "",
  leftCylindrical: "",
  leftAxis: "",
  leftAdd: "",
  leftDia: "",
  // base and bled removed
  
  // Dispatch Info (when status = READY_FOR_DISPATCH)
  dispatchStatus: "Pending",
  assignedPerson_id: null,
  dispatchId: "",
  estimatedDate: null,
  estimatedTime: "",
  actualDate: null,
  actualTime: "",
  dispatchNotes: "",
  
  // Billing
  lensPrice: 0,
  rightEyeExtra: 0,
  leftEyeExtra: 0,
  fittingPrice: 0,
  tintingPrice: 0,
  discount: 0,
  additionalPrice: [],
};

export const orderStatusOptions = [
  { value: "DRAFT", label: "Draft" },
  { value: "PO_RAISED", label: "PO Raised" },
  { value: "PO_RECEIVED", label: "PO Received" },
  { value: "PO_CANCELLED", label: "PO Canceled" },
  { value: "PRE_QC", label: "Pre-QC" },
  { value: "PRE_QC_REJECTED", label: "Pre-QC Rejected" },
  { value: "PRE_QC_SCRAPPED", label: "Pre-QC Scrapped" },
  { value: "FITTING_READY", label: "Fitting In" },
  { value: "IN_FITTING", label: "In Fitting" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "AWAITING_QUALITY", label: "Post-QC" },
  { value: "POST_QC_REJECTED", label: "Post-QC Rejected" },
  { value: "POST_QC_SCRAPPED", label: "Post-QC Scrapped" },
  { value: "READY_FOR_DISPATCH", label: "Dispatch Ready" },
  { value: "READY_FOR_PICKUP", label: "Ready for Pickup" },
  { value: "DISPATCHED", label: "Dispatched" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "INVOICED", label: "Invoice Generated" },
  { value: "COMPLETED", label: "Completed" },
];

export const orderTypeOptions = [
  { value: "Normal Processing", label: "Normal Processing" },
  { value: "Rush Processing", label: "Rush Processing" },
  { value: "Premium Processing", label: "Premium Processing" },
];

export const dispatchStatusOptions = [
  { value: "Pending", label: "Pending" },
  { value: "Assigned", label: "Assigned" },
  { value: "In Transit", label: "In Transit" },
  { value: "Delivered", label: "Delivered" },
];

export const saleOrderFilters = {
  status: null,
  startDate: null,
  endDate: null,
  customerId: null,
  Type_id: null,
  category_id: null,
  coating_id: null,
  urgentOrder: null,
};

/** Status quick-filter cards (list only; they do not exit today stats). */
export const SALE_ORDER_STATUS_CARD_KEYS = ["pending", "urgent", "ready", "poPending"];

/**
 * Calendar date in Asia/Kolkata as YYYY-MM-DD (IST day from 12:00 AM).
 * @param {Date} [date=new Date()]
 * @returns {string}
 */
export function getIstDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export const FREE_LENS_APPROVAL = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
};

export const freeLensApprovalBadgeStyles = {
  PENDING: "bg-amber-100 text-amber-900 border-amber-200",
  APPROVED: "bg-emerald-100 text-emerald-900 border-emerald-200",
  REJECTED: "bg-red-100 text-red-900 border-red-200",
};

/** Raise PO / Issue allowed when Free Lens is off or Admin-approved. */
export function isFreeLensFulfillmentAllowed(order) {
  if (!order?.freeLens) return true;
  return order.freeLensApprovalStatus === FREE_LENS_APPROVAL.APPROVED;
}

// Status badge colors
export const statusColors = {
  DRAFT: "bg-gray-100 text-gray-800 border-gray-200",
  PO_RAISED: "bg-sky-100 text-sky-800 border-sky-200",
  PO_RECEIVED: "bg-sky-100 text-sky-900 border-sky-300",
  PO_CANCELLED: "bg-orange-100 text-orange-800 border-orange-200",
  PRE_QC: "bg-violet-100 text-violet-800 border-violet-200",
  PRE_QC_REJECTED: "bg-amber-100 text-amber-900 border-amber-200",
  PRE_QC_SCRAPPED: "bg-red-100 text-red-800 border-red-200",
  FITTING_READY: "bg-blue-100 text-blue-800 border-blue-200",
  IN_FITTING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  ON_HOLD: "bg-orange-100 text-orange-800 border-orange-200",
  AWAITING_QUALITY: "bg-cyan-100 text-cyan-800 border-cyan-200",
  POST_QC_REJECTED: "bg-amber-100 text-amber-900 border-amber-200",
  POST_QC_SCRAPPED: "bg-red-100 text-red-800 border-red-200",
  READY_FOR_DISPATCH: "bg-purple-100 text-purple-800 border-purple-200",
  READY_FOR_PICKUP: "bg-amber-100 text-amber-900 border-amber-200",
  DISPATCHED: "bg-indigo-100 text-indigo-800 border-indigo-200",
  DELIVERED: "bg-green-100 text-green-800 border-green-200",
  INVOICED: "bg-indigo-100 text-indigo-900 border-indigo-300",
  COMPLETED: "bg-emerald-100 text-emerald-900 border-emerald-300",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
  CONFIRMED: "bg-blue-100 text-blue-800 border-blue-200",
  BILLED: "bg-indigo-100 text-indigo-800 border-indigo-200",
  CLOSED: "bg-red-100 text-red-800 border-red-200",
};

// Eye specification validation ranges
export const eyeSpecRanges = {
  spherical: { min: -20.0, max: 20.0 },
  cylindrical: { min: -6.0, max: 6.0 },
  axis: { min: 0, max: 180 },
  add: { min: 0.0, max: 4.0 },
};

/** Default lead days from order date by lens type (STOCK / RX). */
export function getDefaultDeliveryLeadDays(lensTypeName) {
  const name = String(lensTypeName || "").trim().toUpperCase();
  if (name === "STOCK") return 2;
  if (name === "RX") return 3;
  return null;
}

/**
 * Axis is mandatory whenever CYL is entered — including CYL 0.
 */
export function cylRequiresAxis(cylindrical) {
  return cylindrical !== null && cylindrical !== undefined && String(cylindrical).trim() !== "";
}

export function hasAxisEntry(axis) {
  return axis !== null && axis !== undefined && String(axis).trim() !== "";
}

/**
 * Normalize a date-like value to YYYY-MM-DD (local calendar, no UTC shift).
 * @param {string|Date|null|undefined} value
 * @returns {string}
 */
export function toDateInputValue(value) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Build YYYY-MM-DD: orderDate + leadDays (local calendar).
 * @param {string|Date|null} orderDate
 * @param {number} leadDays
 * @returns {string|null}
 */
export function buildDefaultDeliverySchedule(orderDate, leadDays) {
  if (leadDays == null || Number.isNaN(Number(leadDays))) return null;
  const raw = orderDate
    ? String(orderDate).slice(0, 10)
    : toDateInputValue(new Date());
  const [y, m, d] = raw.split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d, 12, 0, 0, 0);
  date.setDate(date.getDate() + Number(leadDays));
  return toDateInputValue(date);
}
