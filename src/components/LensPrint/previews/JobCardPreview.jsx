import { useEffect, useState } from "react";
import QRCode from "qrcode";

/**
 * Job Card — 25 mm × 10 mm
 * Left: QR (orderNo) | Right: SO number, Ref, date (DD-MM-YYYY)
 */
export default function JobCardPreview({ data, qrDataUrl: qrProp }) {
  const [qr, setQr] = useState(qrProp || null);
  const orderNo = data?.orderNo || "SO-2026-087";
  const ref = data?.customerRefNo && data.customerRefNo !== "-" ? data.customerRefNo : "-";
  const dateStr = data?.orderDateDdMmYyyy || data?.orderDate || "";

  useEffect(() => {
    if (qrProp) {
      setQr(qrProp);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(orderNo, { width: 120, margin: 0, errorCorrectionLevel: "M" })
      .then((url) => {
        if (!cancelled) setQr(url);
      })
      .catch(() => {
        if (!cancelled) setQr(null);
      });
    return () => {
      cancelled = true;
    };
  }, [orderNo, qrProp]);

  return (
    <div
      className="bg-white text-black shadow-md border border-gray-400 overflow-hidden select-none"
      style={{
        width: "25mm",
        height: "10mm",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "row",
        alignItems: "stretch",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          width: "9mm",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0.6mm",
          flexShrink: 0,
        }}
      >
        {qr ? (
          <img src={qr} alt="QR" style={{ width: "8mm", height: "8mm" }} />
        ) : (
          <div style={{ width: "8mm", height: "8mm", background: "#eee" }} />
        )}
      </div>
      <div
        style={{
          width: "0.4mm",
          background: "#333",
          flexShrink: 0,
          alignSelf: "stretch",
          margin: "0.8mm 0",
        }}
      />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0.5mm 1mm",
          minWidth: 0,
          lineHeight: 1.15,
        }}
      >
        <div style={{ fontSize: "5.5px", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {orderNo}
        </div>
        <div style={{ fontSize: "4.5px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          Ref: {ref}
        </div>
        <div style={{ fontSize: "4.5px", whiteSpace: "nowrap" }}>{dateStr}</div>
      </div>
    </div>
  );
}

/** Format date as DD-MM-YYYY */
export function formatJobCardDate(d) {
  if (!d) {
    const now = new Date();
    return `${String(now.getDate()).padStart(2, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}`;
  }
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return `${String(dt.getDate()).padStart(2, "0")}-${String(dt.getMonth() + 1).padStart(2, "0")}-${dt.getFullYear()}`;
}
