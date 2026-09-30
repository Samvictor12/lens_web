import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { buildCustomerCardPayload } from "@/utils/customerCardPrint";

/**
 * DC Customer Card — 84 × 55 mm (preview and print artwork both upright).
 * User loads stock upside down in Evolis. Top 7 mm blank for thank line.
 */
export default function AuthenticityCardPreview({ data, payload: payloadProp }) {
  const payload = useMemo(() => {
    if (payloadProp) return payloadProp;
    if (data?.eyes && (data?.lensLine != null || data?.productLine != null)) return data;
    return buildCustomerCardPayload(data || {});
  }, [data, payloadProp]);

  const [qr, setQr] = useState(null);
  const orderNo = payload?.orderNo || "";

  useEffect(() => {
    if (!orderNo) {
      setQr(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(orderNo, { width: 160, margin: 0, errorCorrectionLevel: "M" })
      .then((url) => {
        if (!cancelled) setQr(url);
      })
      .catch(() => {
        if (!cancelled) setQr(null);
      });
    return () => {
      cancelled = true;
    };
  }, [orderNo]);

  const showAdd = !!payload.showAdd;
  const eyes = payload.eyes || [];
  const lensLine = payload.lensLine || payload.productLine || "Lens name: -";
  const category = payload.category || payload.categoryName || "-";

  return (
    <div
      className="bg-white text-black shadow-md border border-gray-300 overflow-hidden select-none"
      style={{
        width: "84mm",
        height: "55mm",
        boxSizing: "border-box",
        fontFamily: "Arial, Helvetica, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ height: "7mm", width: "100%", flexShrink: 0 }} />

      <div
        style={{
          flex: 1,
          padding: "1.5mm 2.2mm 2mm",
          display: "flex",
          flexDirection: "column",
          gap: "0.5mm",
          minHeight: 0,
        }}
      >
        <div style={{ display: "flex", gap: "2mm", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0, fontSize: "10px", lineHeight: 1.4 }}>
            <div style={{ fontWeight: "bold", fontSize: "10.5px", marginBottom: "0.6mm" }}>
              {lensLine}
            </div>
            <div style={{ marginBottom: "0.6mm" }}>Coating: {payload.coating || "-"}</div>
            <div style={{ marginBottom: "0.6mm" }}>Category: {category}</div>
            <div style={{ marginBottom: "0.6mm" }}>Customer name: {payload.customerName || "-"}</div>
            <div>Pt. Name: {payload.ptName || "-"}</div>
          </div>
          <div style={{ width: "14mm", height: "14mm", flexShrink: 0 }}>
            {qr ? (
              <img src={qr} alt="QR" style={{ width: "14mm", height: "14mm", display: "block" }} />
            ) : (
              <div
                style={{
                  width: "14mm",
                  height: "14mm",
                  background: "#eee",
                  border: "1px solid #ccc",
                }}
              />
            )}
          </div>
        </div>

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "9.5px",
            tableLayout: "fixed",
            flex: 1,
          }}
        >
          <thead>
            <tr>
              <th style={thStyle} />
              <th style={thStyle}>sph</th>
              <th style={thStyle}>cyl</th>
              <th style={thStyle}>Ax</th>
              {showAdd && <th style={thStyle}>Add</th>}
              <th style={thStyle}>FH</th>
            </tr>
          </thead>
          <tbody>
            {eyes.length === 0 ? (
              <tr>
                <td
                  colSpan={showAdd ? 6 : 5}
                  style={{ ...tdStyle, textAlign: "left", color: "#666" }}
                >
                  No eye selected
                </td>
              </tr>
            ) : (
              eyes.map((row) => (
                <tr key={row.eye}>
                  <td style={{ ...tdStyle, fontWeight: "bold", width: "7mm" }}>{row.eye}</td>
                  <td style={tdStyle}>{row.sph}</td>
                  <td style={tdStyle}>{row.cyl}</td>
                  <td style={tdStyle}>{row.axis}</td>
                  {showAdd && (
                    <td style={tdStyle}>{row.add && row.add !== "-" ? row.add : "-"}</td>
                  )}
                  <td style={tdStyle}>{row.fh}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            justifyContent: "space-between",
            fontSize: "9.5px",
            flexShrink: 0,
          }}
        >
          <span>cust Ref: {payload.customerRefNo || "-"}</span>
          <span>Date: {payload.orderDate || "-"}</span>
        </div>
      </div>
    </div>
  );
}

const thStyle = {
  border: "0.4px solid #333",
  padding: "1.2mm 0.8mm",
  textAlign: "center",
  fontWeight: "bold",
  background: "#f3f3f3",
  fontSize: "9px",
};

const tdStyle = {
  border: "0.4px solid #333",
  padding: "1.2mm 0.8mm",
  textAlign: "center",
};
