export const defaultSaleOrder = {
  customerId: null,
  customerRefNo: "",
  orderDate: new Date().toISOString().split('T')[0],
  type: "",
  deliverySchedule: null,
  status: "DRAFT",
  remark: "",
  itemRefNo: "",
  freeLens: false,
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
  { value: "PRODUCTION_READY", label: "Production Ready" },
  { value: "IN_PRODUCTION", label: "In Production" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "AWAITING_QUALITY", label: "Post-QC" },
  { value: "POST_QC_REJECTED", label: "Post-QC Rejected" },
  { value: "POST_QC_SCRAPPED", label: "Post-QC Scrapped" },
  { value: "READY_FOR_DISPATCH", label: "Dispatch Ready" },
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
};

// Status badge colors
export const statusColors = {
  DRAFT: "bg-gray-100 text-gray-800 border-gray-200",
  PO_RAISED: "bg-sky-100 text-sky-800 border-sky-200",
  PO_RECEIVED: "bg-sky-100 text-sky-900 border-sky-300",
  PO_CANCELLED: "bg-orange-100 text-orange-800 border-orange-200",
  PRE_QC: "bg-violet-100 text-violet-800 border-violet-200",
  PRE_QC_REJECTED: "bg-amber-100 text-amber-900 border-amber-200",
  PRE_QC_SCRAPPED: "bg-red-100 text-red-800 border-red-200",
  PRODUCTION_READY: "bg-blue-100 text-blue-800 border-blue-200",
  IN_PRODUCTION: "bg-yellow-100 text-yellow-800 border-yellow-200",
  ON_HOLD: "bg-orange-100 text-orange-800 border-orange-200",
  AWAITING_QUALITY: "bg-cyan-100 text-cyan-800 border-cyan-200",
  POST_QC_REJECTED: "bg-amber-100 text-amber-900 border-amber-200",
  POST_QC_SCRAPPED: "bg-red-100 text-red-800 border-red-200",
  READY_FOR_DISPATCH: "bg-purple-100 text-purple-800 border-purple-200",
  DISPATCHED: "bg-indigo-100 text-indigo-800 border-indigo-200",
  DELIVERED: "bg-green-100 text-green-800 border-green-200",
  INVOICED: "bg-indigo-100 text-indigo-900 border-indigo-300",
  COMPLETED: "bg-emerald-100 text-emerald-900 border-emerald-300",
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
