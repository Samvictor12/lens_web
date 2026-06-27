import { DUMMY_PRINT_ORDER, DUMMY_AUTH_CARD_ORDER } from "@/constants/printPreviewFixtures";

const fmt = (v) => {
  if (v === null || v === undefined || v === "") return "-";
  const n = parseFloat(v);
  return Number.isNaN(n) ? String(v) : n.toFixed(2);
};

const fmtDate = (d) => {
  if (!d) return new Date().toLocaleDateString("en-IN");
  return new Date(d).toLocaleDateString("en-IN");
};

const fmtDateShort = (d) => {
  if (!d) return new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" });
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`;
};

/**
 * Build normalized preview payload from dummy order + company settings.
 */
export function buildPrintPreviewData(order = DUMMY_PRINT_ORDER, company = null) {
  const email = company?.email || "chennai@visionitech.in";
  const phone = company?.phone || "+91 44 1234 5678";

  return {
    orderNo: order.orderNo,
    orderDate: fmtDate(order.orderDate),
    orderDateShort: fmtDateShort(order.orderDate),
    customerRefNo: order.customerRefNo || "-",
    itemRefNo: order.itemRefNo || "-",
    customerName: order.customer_name,
    lensIndex: order.lensIndex,
    lensProductName: order.lensProductName,
    productLine: `${order.lensIndex} ${order.lensProductName}`.trim(),
    contactLine: `${email} Tel: ${phone}`,
    barcodeText: `*${order.orderNo}*`,
    rightEye: order.rightEye,
    leftEye: order.leftEye,
    right: {
      sph: fmt(order.rightSpherical),
      cyl: fmt(order.rightCylindrical),
      axis: order.rightAxis ?? "-",
      add: fmt(order.rightAdd),
      dia: order.rightDia ?? "-",
    },
    left: {
      sph: fmt(order.leftSpherical),
      cyl: fmt(order.leftCylindrical),
      axis: order.leftAxis ?? "-",
      add: fmt(order.leftAdd),
      dia: order.leftDia ?? "-",
    },
    company: {
      name: company?.companyName || "Vision Itech",
      address: company?.address || "",
      city: company?.city || "",
      state: company?.state || "",
      pincode: company?.pincode || "",
      gstin: company?.gstin || "",
      email,
      phone,
      tagline: company?.tagline || "",
    },
    status: order.status || "CONFIRMED",
    lensPrice: order.lensPrice ?? 0,
  };
}

export function getPreviewOrderForTemplate(templateId) {
  if (templateId === "AUTHENTICITY_CARD") return DUMMY_AUTH_CARD_ORDER;
  return DUMMY_PRINT_ORDER;
}
