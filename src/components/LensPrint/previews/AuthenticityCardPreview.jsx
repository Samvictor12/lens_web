/**
 * Authenticity / warranty card — 84 × 55 mm (Evolis Primacy 2)
 */
export default function AuthenticityCardPreview({ data }) {
  return (
    <div
      className="bg-white text-black shadow-md border border-gray-300 overflow-hidden select-none"
      style={{
        width: "84mm",
        height: "55mm",
        padding: "2.5mm 3mm",
        fontFamily: "Arial, sans-serif",
        fontSize: "7px",
        lineHeight: 1.25,
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", gap: "2mm", height: "100%" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "9px", fontWeight: "bold", marginBottom: "1mm" }}>
              {data.lensIndex}
            </div>
            <div style={{ fontSize: "6.5px", fontWeight: 600, marginBottom: "1mm", lineHeight: 1.2 }}>
              {data.lensProductName}
            </div>
            <div style={{ fontSize: "7px", marginBottom: "2mm" }}>{data.customerName}</div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "6px" }}>
            <thead>
              <tr style={{ backgroundColor: "#eee" }}>
                <th style={{ border: "1px solid #999", padding: "0.8mm" }} />
                <th style={{ border: "1px solid #999", padding: "0.8mm" }}>SPH</th>
                <th style={{ border: "1px solid #999", padding: "0.8mm" }}>CYL</th>
                <th style={{ border: "1px solid #999", padding: "0.8mm" }}>AXIS</th>
                <th style={{ border: "1px solid #999", padding: "0.8mm" }}>ADD</th>
              </tr>
            </thead>
            <tbody>
              {data.rightEye && (
                <tr>
                  <td style={{ border: "1px solid #999", padding: "0.8mm", fontWeight: "bold" }}>RE</td>
                  <td style={{ border: "1px solid #999", padding: "0.8mm", textAlign: "center" }}>{data.right.sph}</td>
                  <td style={{ border: "1px solid #999", padding: "0.8mm", textAlign: "center" }}>{data.right.cyl}</td>
                  <td style={{ border: "1px solid #999", padding: "0.8mm", textAlign: "center" }}>{data.right.axis}</td>
                  <td style={{ border: "1px solid #999", padding: "0.8mm", textAlign: "center" }}>{data.right.add}</td>
                </tr>
              )}
              {data.leftEye && (
                <tr>
                  <td style={{ border: "1px solid #999", padding: "0.8mm", fontWeight: "bold" }}>LE</td>
                  <td style={{ border: "1px solid #999", padding: "0.8mm", textAlign: "center" }}>{data.left.sph}</td>
                  <td style={{ border: "1px solid #999", padding: "0.8mm", textAlign: "center" }}>{data.left.cyl}</td>
                  <td style={{ border: "1px solid #999", padding: "0.8mm", textAlign: "center" }}>{data.left.axis}</td>
                  <td style={{ border: "1px solid #999", padding: "0.8mm", textAlign: "center" }}>{data.left.add}</td>
                </tr>
              )}
            </tbody>
          </table>

          <div style={{ fontSize: "6px", color: "#444", marginTop: "1mm" }}>{data.orderDate}</div>
        </div>

        <div
          style={{
            width: "22mm",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            borderLeft: "1px dashed #ccc",
            paddingLeft: "2mm",
          }}
        >
          <div
            style={{
              fontFamily: "monospace",
              fontSize: "8px",
              letterSpacing: "1px",
              fontWeight: "bold",
              marginBottom: "2mm",
            }}
          >
            {data.barcodeText}
          </div>
          <div style={{ fontSize: "5px", color: "#666", textAlign: "center" }}>{data.orderNo}</div>
        </div>
      </div>
    </div>
  );
}
