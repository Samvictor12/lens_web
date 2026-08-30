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
  totalPrice: 0,
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

// Purchase order status options (system-driven after DRAFT; shown read-only in form)
export const statusOptions = [
  { value: "DRAFT", label: "Pending" },
  { value: "PO_PARTIAL_RECEIVED", label: "Partial Received" },
  { value: "RECEIVED", label: "Full Received" },
  { value: "INVOICE_RECEIVED", label: "Invoice Received" },
  { value: "PAID", label: "Paid" },
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

import { getPoStageLabel } from "@/constants/purchaseOrderStatus";

// Status display labels (pipeline: Pending → Partial Received → Full Received → Paid)
export const getStatusLabel = (status) => getPoStageLabel(status);

// Status badge colors
export const getStatusColor = (status) => {
  switch (status) {
    case "DRAFT":
      return "bg-yellow-50 text-yellow-700 border-yellow-200";
    case "PO_PARTIAL_RECEIVED":
    case "PARTIALLY_RECEIVED":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "RECEIVED":
      return "bg-green-50 text-green-700 border-green-200";
    case "INVOICE_RECEIVED":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "PAID":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    case "CLOSED":
      return "bg-gray-100 text-gray-600 border-gray-300";
    case "CANCELLED":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
};

/** List filter: POs not yet vendor-billed (Pending + Partial Received + Full Received). */
export const UNBILLED_STATUS = "unbilled";
export const ALL_STATUS = "all";
export const PENDING_STATUS = "pending";
export const VENDOR_BILL_ELIGIBLE_STATUSES = ["PO_PARTIAL_RECEIVED", "RECEIVED"];

export const statusFilterOptions = [
  { value: ALL_STATUS, label: "All" },
  { value: UNBILLED_STATUS, label: "Unbilled" },
  ...statusOptions,
];

/** Date field used by the single From–To filter on the PO list. */
export const DATE_TYPE_ALL = "all";
export const DATE_TYPE_ORDER = "order";
export const DATE_TYPE_RECEIVED = "received";
export const DATE_TYPE_EXPECTED = "expected";

export const dateTypeFilterOptions = [
  { value: DATE_TYPE_ALL, label: "All" },
  { value: DATE_TYPE_ORDER, label: "Order date" },
  { value: DATE_TYPE_RECEIVED, label: "Received Date" },
  { value: DATE_TYPE_EXPECTED, label: "Expected Date" },
];

// Purchase order filters
export const purchaseOrderFilters = {
  search: "",
  vendor_id: null,
  status: ALL_STATUS,
  active_status: "all",
  start_date: "",
  end_date: "",
  date_type: DATE_TYPE_ALL,
};

/**
 * Calendar date in Asia/Kolkata as YYYY-MM-DD (IST day from 12:00 AM).
 */
export function getIstDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** First and last calendar day of the current IST month as YYYY-MM-DD. */
export function getIstMonthRange(date = new Date()) {
  const today = getIstDateString(date);
  const [year, month] = today.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    start: `${year}-${String(month).padStart(2, "0")}-01`,
    end: `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
  };
}

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
