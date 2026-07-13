/**
 * Parse operator QR / barcode payloads.
 *
 * Expected format: "SaleOrderNumber | CustomerRefNo"
 * Example: "SO-2026-001 | 098765"
 *
 * Also accepts bare order numbers for backwards compatibility.
 *
 * @param {string} raw
 * @returns {{ orderNo: string, customerRefNo: string | null, raw: string }}
 */
export function parseSaleOrderScanPayload(raw) {
  const text = String(raw ?? "").trim();
  if (!text) {
    return { orderNo: "", customerRefNo: null, raw: text };
  }

  const parts = text.split("|").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return {
      orderNo: parts[0],
      customerRefNo: parts.slice(1).join(" | "),
      raw: text,
    };
  }

  return { orderNo: text, customerRefNo: null, raw: text };
}
