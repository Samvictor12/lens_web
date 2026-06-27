// Default purchase order object
export const defaultPurchaseOrder = {
  poNumber: "",
  reference_id: "",
  vendorId: null,
  saleOrderId: null,
  orderType: "Bulk",
  lensBulkSelection: null,
  lens_id: null,
  category_id: null,
  Type_id: null,
  dia_id: null,
  fitting_id: null,
  coating_id: null,
  tinting_id: null,
  rightEye: false,
  leftEye: false,
  rightSpherical: "",
  rightCylindrical: "",
  rightAxis: "",
  rightAdd: "",
  rightDia: "",
  rightBase: "",
  rightBaseSize: "",
  rightBled: "",
  leftSpherical: "",
  leftCylindrical: "",
  leftAxis: "",
  leftAdd: "",
  leftDia: "",
  leftBase: "",
  leftBaseSize: "",
  leftBled: "",
  quantity: 0,
  unitPrice: 0,
  subtotal: 0,
  taxType: "Amount",
  taxPercentage: 0,
  taxAmount: 0,
  totalValue: 0,
  supplierInvoiceNo: "",
  purchaseType: null,
  placeOfSupply: "",
  itemDescription: "",
  taxAccount: "",
  orderDate: new Date().toISOString().split("T")[0],
  expectedDeliveryDate: "",
  actualDeliveryDate: "",
  status: "DRAFT",
  notes: "",
  narration: "",
  activeStatus: true,
};

// Purchase order status options
export const statusOptions = [
  { value: "DRAFT", label: "Draft (Pending)" },

  { value: "RECEIVED", label: "Received" },
  { value: "INVOICE_RECEIVED", label: "Invoice Received" },
  { value: "CLOSED", label: "Closed" },
  { value: "CANCELLED", label: "Cancelled" },
];

// Purchase type options
export const purchaseTypeOptions = [
  { value: "Local", label: "Local" },
  { value: "Interstate", label: "Interstate" },
];

// Order type options
export const orderTypeOptions = [
  { value: "Single", label: "Single Purchase" },
  { value: "Bulk", label: "Bulk Purchase" },
];

// Active status options
export const activeStatusOptions = [
  { value: true, label: "Active" },
  { value: false, label: "Inactive" },
];

// Status display labels (DRAFT shows as Pending)
export const getStatusLabel = (status) => {
  switch (status) {
    case "DRAFT": return "Pending";

    case "RECEIVED": return "Received";
    case "INVOICE_RECEIVED": return "Invoice Received";
    case "CLOSED": return "Closed";
    case "CANCELLED": return "Cancelled";
    default: return status || "";
  }
};

// Status badge colors
export const getStatusColor = (status) => {
  switch (status) {
    case "DRAFT":
      return "bg-yellow-50 text-yellow-700 border-yellow-200";
    case "PARTIALLY_RECEIVED":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "RECEIVED":
      return "bg-green-50 text-green-700 border-green-200";
    case "INVOICE_RECEIVED":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "CLOSED":
      return "bg-gray-100 text-gray-600 border-gray-300";
    case "CANCELLED":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
};

// Purchase order filters
export const purchaseOrderFilters = {
  search: "",
  vendor_id: null,
  status: null,
  active_status: "all",
  start_date: "",
  end_date: "",
};

/** PO quantity from linked SO eyes: 1 per eye, minimum 1 */
export function poQuantityFromEyes(order) {
  if (!order) return 1;
  let qty = 0;
  if (order.rightEye) qty += 1;
  if (order.leftEye) qty += 1;
  return qty || 1;
}

/** Receive rows for SO-linked single PO: one row per eye, qty 1 each */
export function buildSinglePoReceiveRows(po) {
  const rows = [];
  if (po?.rightEye) {
    rows.push({
      key: "single_R",
      eye: "R",
      label: "Right (R)",
      orderedQty: 1,
      sph: po.rightSpherical,
      cyl: po.rightCylindrical,
      axis: po.rightAxis,
      add: po.rightAdd,
    });
  }
  if (po?.leftEye) {
    rows.push({
      key: "single_L",
      eye: "L",
      label: "Left (L)",
      orderedQty: 1,
      sph: po.leftSpherical,
      cyl: po.leftCylindrical,
      axis: po.leftAxis,
      add: po.leftAdd,
    });
  }
  if (!rows.length) {
    rows.push({
      key: "single",
      eye: null,
      label: "Single",
      orderedQty: parseFloat(po?.quantity) || 1,
      sph: po?.rightSpherical ?? po?.leftSpherical,
      cyl: po?.rightCylindrical ?? po?.leftCylindrical,
      axis: po?.rightAxis ?? po?.leftAxis,
      add: po?.rightAdd ?? po?.leftAdd,
    });
  }
  return rows;
}
