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
  urgentOrder: false,
  
  // Lens Information
  lens_id: null,
  category_id: null,
  Type_id: null,
  dia_id: null,
  fitting_id: null,
  coating_id: null,
  tinting_id: null,
  
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
  fittingPrice: 0,
  discount: 0,
  additionalPrice: [],
};

export const orderStatusOptions = [
  { value: "DRAFT", label: "Draft" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "IN_PRODUCTION", label: "In Production" },
  { value: "READY_FOR_DISPATCH", label: "Ready for Dispatch" },
  { value: "DELIVERED", label: "Delivered" },
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
  CONFIRMED: "bg-blue-100 text-blue-800 border-blue-200",
  IN_PRODUCTION: "bg-yellow-100 text-yellow-800 border-yellow-200",
  READY_FOR_DISPATCH: "bg-purple-100 text-purple-800 border-purple-200",
  DELIVERED: "bg-green-100 text-green-800 border-green-200",
};

// Eye specification validation ranges
export const eyeSpecRanges = {
  spherical: { min: -20.0, max: 20.0 },
  cylindrical: { min: -6.0, max: 6.0 },
  axis: { min: 0, max: 180 },
  add: { min: 0.0, max: 4.0 },
};
