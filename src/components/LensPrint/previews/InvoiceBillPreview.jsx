/**
 * Invoice / Bill — A4 mock (ink-light shell aligned with Dispatch Challan)
 */
export default function InvoiceBillPreview({ data }) {
  const c = data.company;
  const sellerAddress = [c.address, c.city, c.state, c.pincode].filter(Boolean).join(", ");

  const hairline = { border: "1px solid #e2e8f0" };
  const cell = { border: "1px solid #cbd5e1", padding: "6px 7px", verticalAlign: "top" };
  const th = {
    ...cell,
    background: "#fff",
    fontSize: "9px",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    textAlign: "left",
    fontWeight: 700,
  };

  return (
    <div
      className="bg-white text-black shadow-md border border-slate-400 select-none"
      style={{
        width: "210mm",
        height: "297mm",
        maxHeight: "297mm",
        overflow: "hidden",
        padding: "14mm 16mm",
        fontFamily: '"Segoe UI", Arial, sans-serif',
        fontSize: "11px",
        lineHeight: 1.35,
        color: "#0f172a",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "16px",
          borderBottom: "1px solid #94a3b8",
          paddingBottom: "10px",
          marginBottom: "12px",
        }}
      >
        <div style={{ maxWidth: "58%" }}>
          <div style={{ fontSize: "16px", fontWeight: 700, letterSpacing: "0.02em" }}>{c.name}</div>
          {sellerAddress && (
            <div style={{ color: "#475569", fontSize: "10px", marginTop: "2px" }}>{sellerAddress}</div>
          )}
          <div style={{ color: "#475569", fontSize: "10px", marginTop: "2px" }}>
            {[c.phone && `Ph: ${c.phone}`, c.email && `Email: ${c.email}`].filter(Boolean).join(" · ")}
          </div>
          {c.gstin && (
            <div style={{ color: "#475569", fontSize: "10px", marginTop: "2px" }}>
              GSTIN: <strong>{c.gstin}</strong>
            </div>
          )}
        </div>
        <div style={{ textAlign: "right", minWidth: "140px" }}>
          <div
            style={{
              fontSize: "15px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              color: "#0f766e",
              marginBottom: "6px",
            }}
          >
            SALE ORDER INVOICE
          </div>
          <div style={{ fontSize: "11px" }}>
            <span style={{ display: "inline-block", minWidth: "52px", fontSize: "8px", textTransform: "uppercase", letterSpacing: "0.04em", color: "#64748b", marginRight: "6px" }}>
              Order No
            </span>
            <strong>{data.orderNo}</strong>
          </div>
          <div style={{ fontSize: "11px", marginTop: "3px" }}>
            <span style={{ display: "inline-block", minWidth: "52px", fontSize: "8px", textTransform: "uppercase", letterSpacing: "0.04em", color: "#64748b", marginRight: "6px" }}>
              Date
            </span>
            <strong>{data.orderDate}</strong>
          </div>
          <div style={{ fontSize: "11px", marginTop: "3px" }}>
            <span style={{ display: "inline-block", minWidth: "52px", fontSize: "8px", textTransform: "uppercase", letterSpacing: "0.04em", color: "#64748b", marginRight: "6px" }}>
              Status
            </span>
            <strong>{data.status}</strong>
          </div>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
        <div style={{ ...hairline, borderRadius: "4px", padding: "8px 10px", background: "#fff" }}>
          <div style={{ fontSize: "8px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", marginBottom: "4px" }}>
            Bill To / Customer
          </div>
          <div style={{ fontSize: "13px", fontWeight: 700 }}>{data.customerName}</div>
        </div>
        <div style={{ ...hairline, borderRadius: "4px", padding: "8px 10px", background: "#fff" }}>
          <div style={{ fontSize: "8px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", marginBottom: "4px" }}>
            Order References
          </div>
          <div style={{ color: "#475569", fontSize: "10px" }}>Cust Ref: {data.customerRefNo}</div>
          <div style={{ color: "#475569", fontSize: "10px", marginTop: "2px" }}>Item Ref: {data.itemRefNo}</div>
        </div>
      </div>

      <div style={{ fontSize: "8px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", marginBottom: "6px" }}>
        Lens Details
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "12px" }}>
        <thead>
          <tr>
            <th style={th}>Description</th>
            <th style={{ ...th, textAlign: "right", width: "28%" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={cell}>{data.productLine}</td>
            <td style={{ ...cell, textAlign: "right" }}>₹ {Number(data.lensPrice).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      {(data.rightEye || data.leftEye) && (
        <>
          <div style={{ fontSize: "8px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", marginBottom: "6px" }}>
            Prescription
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "12px" }}>
            <thead>
              <tr>
                <th style={th}>Eye</th>
                <th style={{ ...th, textAlign: "center" }}>SPH</th>
                <th style={{ ...th, textAlign: "center" }}>CYL</th>
                <th style={{ ...th, textAlign: "center" }}>AXIS</th>
                <th style={{ ...th, textAlign: "center" }}>ADD</th>
              </tr>
            </thead>
            <tbody>
              {data.rightEye && (
                <tr>
                  <td style={cell}><strong>RE</strong></td>
                  <td style={{ ...cell, textAlign: "center" }}>{data.right.sph}</td>
                  <td style={{ ...cell, textAlign: "center" }}>{data.right.cyl}</td>
                  <td style={{ ...cell, textAlign: "center" }}>{data.right.axis}</td>
                  <td style={{ ...cell, textAlign: "center" }}>{data.right.add}</td>
                </tr>
              )}
              {data.leftEye && (
                <tr>
                  <td style={cell}><strong>LE</strong></td>
                  <td style={{ ...cell, textAlign: "center" }}>{data.left.sph}</td>
                  <td style={{ ...cell, textAlign: "center" }}>{data.left.cyl}</td>
                  <td style={{ ...cell, textAlign: "center" }}>{data.left.axis}</td>
                  <td style={{ ...cell, textAlign: "center" }}>{data.left.add}</td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}

      <footer
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: "12px",
          marginTop: "auto",
          paddingTop: "8px",
        }}
      >
        <div style={{ fontSize: "8px", color: "#94a3b8", maxWidth: "55%" }}>
          {c.tagline || "Thank you for your business!"}
        </div>
        <div style={{ width: "180px", textAlign: "center" }}>
          <div style={{ fontSize: "9px", marginBottom: "3px" }}>For {c.name}</div>
          <div style={{ borderBottom: "1px solid #94a3b8", height: "42px", marginBottom: "3px" }} />
          <div style={{ fontSize: "8px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Authorised Signatory
          </div>
        </div>
      </footer>
    </div>
  );
}
