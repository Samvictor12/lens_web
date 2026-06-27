/**
 * Dispatch Challan (DC) — A4 (Canon LBP6030)
 */
export default function DispatchNotePreview({ data }) {
  const c = data.company;

  return (
    <div
      className="bg-white text-black shadow-md border border-gray-300 select-none"
      style={{
        width: "210mm",
        minHeight: "297mm",
        padding: "15mm 20mm",
        fontFamily: "Arial, sans-serif",
        fontSize: "12px",
        lineHeight: 1.4,
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <div style={{ fontSize: "20px", fontWeight: "bold", color: "#0d9488" }}>{c.name}</div>
          {c.address && <div>{c.address}</div>}
          <div>{[c.city, c.state, c.pincode].filter(Boolean).join(", ")}</div>
          {c.phone && <div>Tel: {c.phone}</div>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "22px", fontWeight: "bold", letterSpacing: "1px" }}>DISPATCH CHALLAN</div>
          <div style={{ fontSize: "14px", marginTop: "6px" }}>Order: <strong>{data.orderNo}</strong></div>
          <div>Date: {data.orderDate}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "24px" }}>
        <div style={{ border: "1px solid #ddd", padding: "12px" }}>
          <div style={{ fontSize: "10px", color: "#666", textTransform: "uppercase", fontWeight: "bold", marginBottom: "4px" }}>
            Deliver To
          </div>
          <div style={{ fontWeight: 600, fontSize: "14px" }}>{data.customerName}</div>
          <div style={{ marginTop: "4px", fontSize: "11px" }}>Cust Ref: {data.customerRefNo}</div>
        </div>
        <div style={{ border: "1px solid #ddd", padding: "12px" }}>
          <div style={{ fontSize: "10px", color: "#666", textTransform: "uppercase", fontWeight: "bold", marginBottom: "4px" }}>
            Dispatch Details
          </div>
          <div>Item Ref: {data.itemRefNo}</div>
          <div>Status: {data.status}</div>
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px" }}>
        <thead>
          <tr style={{ backgroundColor: "#f3f4f6" }}>
            <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left" }}>#</th>
            <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left" }}>Description</th>
            <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>Qty</th>
            <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left" }}>Remarks</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ border: "1px solid #ddd", padding: "8px" }}>1</td>
            <td style={{ border: "1px solid #ddd", padding: "8px" }}>{data.productLine}</td>
            <td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>
              {(data.leftEye ? 1 : 0) + (data.rightEye ? 1 : 0) || 1}
            </td>
            <td style={{ border: "1px solid #ddd", padding: "8px" }}>Lens pair / order dispatch</td>
          </tr>
        </tbody>
      </table>

      {(data.rightEye || data.leftEye) && (
        <div style={{ marginBottom: "24px" }}>
          <div style={{ fontWeight: "bold", marginBottom: "6px" }}>Prescription Summary</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f9fafb" }}>
                <th style={{ border: "1px solid #ddd", padding: "6px" }}>Eye</th>
                <th style={{ border: "1px solid #ddd", padding: "6px" }}>SPH</th>
                <th style={{ border: "1px solid #ddd", padding: "6px" }}>CYL</th>
                <th style={{ border: "1px solid #ddd", padding: "6px" }}>AXIS</th>
                <th style={{ border: "1px solid #ddd", padding: "6px" }}>ADD</th>
                <th style={{ border: "1px solid #ddd", padding: "6px" }}>DIA</th>
              </tr>
            </thead>
            <tbody>
              {data.rightEye && (
                <tr>
                  <td style={{ border: "1px solid #ddd", padding: "6px", textAlign: "center" }}>R</td>
                  <td style={{ border: "1px solid #ddd", padding: "6px", textAlign: "center" }}>{data.right.sph}</td>
                  <td style={{ border: "1px solid #ddd", padding: "6px", textAlign: "center" }}>{data.right.cyl}</td>
                  <td style={{ border: "1px solid #ddd", padding: "6px", textAlign: "center" }}>{data.right.axis}</td>
                  <td style={{ border: "1px solid #ddd", padding: "6px", textAlign: "center" }}>{data.right.add}</td>
                  <td style={{ border: "1px solid #ddd", padding: "6px", textAlign: "center" }}>{data.right.dia}</td>
                </tr>
              )}
              {data.leftEye && (
                <tr>
                  <td style={{ border: "1px solid #ddd", padding: "6px", textAlign: "center" }}>L</td>
                  <td style={{ border: "1px solid #ddd", padding: "6px", textAlign: "center" }}>{data.left.sph}</td>
                  <td style={{ border: "1px solid #ddd", padding: "6px", textAlign: "center" }}>{data.left.cyl}</td>
                  <td style={{ border: "1px solid #ddd", padding: "6px", textAlign: "center" }}>{data.left.axis}</td>
                  <td style={{ border: "1px solid #ddd", padding: "6px", textAlign: "center" }}>{data.left.add}</td>
                  <td style={{ border: "1px solid #ddd", padding: "6px", textAlign: "center" }}>{data.left.dia}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", marginTop: "40px" }}>
        <div>
          <div style={{ borderTop: "1px solid #333", paddingTop: "6px", fontSize: "11px" }}>Dispatched By</div>
        </div>
        <div>
          <div style={{ borderTop: "1px solid #333", paddingTop: "6px", fontSize: "11px" }}>Received By (Signature)</div>
        </div>
      </div>

      <div style={{ marginTop: "30px", fontSize: "10px", color: "#6b7280", textAlign: "center" }}>
        {c.email} · Tel: {c.phone}
      </div>
    </div>
  );
}
