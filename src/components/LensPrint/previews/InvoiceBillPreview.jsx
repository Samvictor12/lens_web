/**
 * Invoice / Bill — A4 (Canon LBP6030)
 */
export default function InvoiceBillPreview({ data }) {
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
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
        <div style={{ width: "65%" }}>
          <div style={{ fontSize: "20px", fontWeight: "bold", color: "#0d9488", marginBottom: "5px" }}>
            {c.name}
          </div>
          {c.address && <div>{c.address}</div>}
          <div>{[c.city, c.state, c.pincode].filter(Boolean).join(", ")}</div>
          {c.phone && <div>Phone: {c.phone}</div>}
          {c.email && <div>Email: {c.email}</div>}
          {c.gstin && <div><strong>GSTIN: {c.gstin}</strong></div>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "22px", fontWeight: "bold" }}>SALE ORDER INVOICE</div>
          <div style={{ fontSize: "15px", fontWeight: "bold", color: "#4f46e5" }}>No: {data.orderNo}</div>
          <div style={{ marginTop: "8px" }}>Date: {data.orderDate}</div>
          <div>Status: <strong>{data.status}</strong></div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
        <div style={{ border: "1px solid #e5e7eb", padding: "10px", backgroundColor: "#fafafa" }}>
          <div style={{ fontSize: "10px", color: "#6b7280", textTransform: "uppercase", fontWeight: "bold" }}>
            Bill To / Customer
          </div>
          <div style={{ fontSize: "13px", fontWeight: 600 }}>{data.customerName}</div>
        </div>
        <div style={{ border: "1px solid #e5e7eb", padding: "10px", backgroundColor: "#fafafa" }}>
          <div style={{ fontSize: "10px", color: "#6b7280", textTransform: "uppercase", fontWeight: "bold" }}>
            Order References
          </div>
          <div>Cust Ref: {data.customerRefNo}</div>
          <div>Item Ref: {data.itemRefNo}</div>
        </div>
      </div>

      <div style={{ fontSize: "12px", fontWeight: "bold", borderBottom: "2px solid #333", paddingBottom: "3px", marginBottom: "8px" }}>
        LENS DETAILS
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
        <thead>
          <tr style={{ backgroundColor: "#f3f4f6" }}>
            <th style={{ border: "1px solid #e5e7eb", padding: "8px", textAlign: "left" }}>Description</th>
            <th style={{ border: "1px solid #e5e7eb", padding: "8px", textAlign: "right" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ border: "1px solid #e5e7eb", padding: "8px" }}>{data.productLine}</td>
            <td style={{ border: "1px solid #e5e7eb", padding: "8px", textAlign: "right" }}>
              ₹ {Number(data.lensPrice).toFixed(2)}
            </td>
          </tr>
        </tbody>
      </table>

      {(data.rightEye || data.leftEye) && (
        <>
          <div style={{ fontSize: "12px", fontWeight: "bold", borderBottom: "2px solid #333", paddingBottom: "3px", marginBottom: "8px" }}>
            PRESCRIPTION
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
            <thead>
              <tr style={{ backgroundColor: "#f3f4f6" }}>
                <th style={{ border: "1px solid #e5e7eb", padding: "6px" }}>Eye</th>
                <th style={{ border: "1px solid #e5e7eb", padding: "6px" }}>SPH</th>
                <th style={{ border: "1px solid #e5e7eb", padding: "6px" }}>CYL</th>
                <th style={{ border: "1px solid #e5e7eb", padding: "6px" }}>AXIS</th>
                <th style={{ border: "1px solid #e5e7eb", padding: "6px" }}>ADD</th>
              </tr>
            </thead>
            <tbody>
              {data.rightEye && (
                <tr>
                  <td style={{ border: "1px solid #e5e7eb", padding: "8px", textAlign: "center" }}><strong>RE</strong></td>
                  <td style={{ border: "1px solid #e5e7eb", padding: "8px", textAlign: "center" }}>{data.right.sph}</td>
                  <td style={{ border: "1px solid #e5e7eb", padding: "8px", textAlign: "center" }}>{data.right.cyl}</td>
                  <td style={{ border: "1px solid #e5e7eb", padding: "8px", textAlign: "center" }}>{data.right.axis}</td>
                  <td style={{ border: "1px solid #e5e7eb", padding: "8px", textAlign: "center" }}>{data.right.add}</td>
                </tr>
              )}
              {data.leftEye && (
                <tr>
                  <td style={{ border: "1px solid #e5e7eb", padding: "8px", textAlign: "center" }}><strong>LE</strong></td>
                  <td style={{ border: "1px solid #e5e7eb", padding: "8px", textAlign: "center" }}>{data.left.sph}</td>
                  <td style={{ border: "1px solid #e5e7eb", padding: "8px", textAlign: "center" }}>{data.left.cyl}</td>
                  <td style={{ border: "1px solid #e5e7eb", padding: "8px", textAlign: "center" }}>{data.left.axis}</td>
                  <td style={{ border: "1px solid #e5e7eb", padding: "8px", textAlign: "center" }}>{data.left.add}</td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}

      <div style={{ marginTop: "30px", fontSize: "10px", color: "#6b7280", textAlign: "center", borderTop: "1px solid #e5e7eb", paddingTop: "10px" }}>
        {c.tagline || "Thank you for your business!"}
      </div>
    </div>
  );
}
