/**
 * Dummy sale-order data for Print Settings preview (no live order required).
 */
export const DUMMY_PRINT_ORDER = {
  orderNo: "SO-2026-087",
  orderDate: "2026-04-21",
  customerRefNo: "21/1",
  mrdRefNo: "MRD-5562",
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

export const DUMMY_AUTH_CARD_ORDER = {
  ...DUMMY_PRINT_ORDER,
  customer_name: "Vision Xperts AMBUR",
  lensIndex: "1.590",
  lensProductName: "Internal Advance Poly FF Blu+",
  category: { name: "Progressive" },
  coating: { name: "Blue Cut" },
  rightAdd: "2.00",
  leftAdd: "2.00",
  rightDia: "70",
  leftDia: "70",
};

/** Preview tabs in Settings → Print Service */
export const PREVIEW_TEMPLATE_TABS = [
  { id: "AUTHENTICITY_CARD", label: "DC Card",   media: "84 × 55 mm" },
  { id: "BARCODE_LABEL",     label: "Barcode",   media: "75 × 50 mm" },
  { id: "JOB_CARD",          label: "Job Card",  media: "25 × 10 mm" },
  { id: "SALE_ORDER",        label: "Invoice",   media: "A4" },
  { id: "DISPATCH_NOTE",     label: "DC",        media: "A4" },
];

/** Printer config types — UI labels & defaults */
export const PRINT_CONFIG_META = {
  AUTHENTICITY_CARD: {
    label: "DC Customer Card",
    desc: "Evolis Primacy 2 · 84 × 55 mm",
    usesService: true,
    chromeOnly: false,
    defaultMode: "exe",
    paperSizes: ["Card_84x55"],
    defaultPaper: "Card_84x55",
  },
  BARCODE_LABEL: {
    label: "DC Customer Barcode",
    desc: "TSC · 75 × 50 mm (W×H) · R then L · Chrome: headers off, margins none",
    usesService: true,
    chromeOnly: false,
    defaultMode: "exe",
    paperSizes: ["Label_50x75"],
    defaultPaper: "Label_50x75",
  },
  JOB_CARD: {
    label: "Job Card",
    desc: "25 × 10 mm · QR = orderNo",
    usesService: true,
    chromeOnly: false,
    defaultMode: "exe",
    paperSizes: ["Label_25x10"],
    defaultPaper: "Label_25x10",
  },
  SALE_ORDER: {
    label: "Invoice",
    desc: "Canon LBP6030 · A4",
    usesService: false,
    chromeOnly: true,
    defaultMode: "chrome",
    paperSizes: ["A4"],
    defaultPaper: "A4",
  },
  DISPATCH_NOTE: {
    label: "DC",
    desc: "Canon LBP6030 · A4 dispatch challan",
    usesService: false,
    chromeOnly: true,
    defaultMode: "chrome",
    paperSizes: ["A4"],
    defaultPaper: "A4",
  },
};
