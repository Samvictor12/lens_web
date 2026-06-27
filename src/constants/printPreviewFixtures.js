/**
 * Dummy sale-order data for Print Settings preview (no live order required).
 * Field mappings match confirmed print design.
 */
export const DUMMY_PRINT_ORDER = {
  orderNo: "SO-2026-003",
  orderDate: "2026-04-21",
  customerRefNo: "21/1",
  itemRefNo: "21/04",
  customer_name: "Eagle Vision Optical",
  lensIndex: "1.560",
  lensProductName: "ECO SV BLUCUT CLAIRITE",
  rightEye: true,
  leftEye: true,
  rightSpherical: "-2.50",
  rightCylindrical: "0.00",
  rightAxis: "0",
  rightAdd: "0.00",
  rightDia: "70",
  leftSpherical: "-2.50",
  leftCylindrical: "0.00",
  leftAxis: "0",
  leftAdd: "0.00",
  leftDia: "70",
  status: "CONFIRMED",
  lensPrice: 1250,
  fittingPrice: 0,
  discount: 0,
};

/** Alternate sample for authenticity card layout */
export const DUMMY_AUTH_CARD_ORDER = {
  ...DUMMY_PRINT_ORDER,
  customer_name: "Vision Xperts AMBUR",
  lensIndex: "1.590",
  lensProductName: "Internal Advance Poly FF Blu+",
};

export const PREVIEW_TEMPLATE_TABS = [
  { id: "AUTHENTICITY_CARD", label: "Auth Card", media: "84 × 55 mm" },
  { id: "BARCODE_LABEL_L",   label: "Barcode L", media: "75 × 50 mm" },
  { id: "BARCODE_LABEL_R",   label: "Barcode R", media: "75 × 50 mm" },
  { id: "SALE_ORDER",        label: "Invoice",   media: "A4" },
  { id: "DISPATCH_NOTE",     label: "DC",        media: "A4" },
];
