/**
 * Barcode label — 75 × 50 mm (TSC TTP-244 Plus), one label per eye.
 */
export default function BarcodeLabelPreview({ data, eye = "L" }) {
  const isLeft = eye === "L";
  const rx = isLeft ? data.left : data.right;
  const eyeLabel = isLeft ? "L" : "R";
  const dia = rx.dia;

  return (
    <div
      className="bg-white text-black shadow-md border border-gray-300 overflow-hidden select-none"
      style={{
        width: "75mm",
        height: "50mm",
        padding: "2mm 2.5mm",
        fontFamily: "Arial, sans-serif",
        fontSize: "7px",
        lineHeight: 1.3,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", gap: "3mm", fontSize: "6.5px", fontWeight: "bold", marginBottom: "1mm" }}>
        <span>SPH</span>
        <span>CYL</span>
        <span>Axis</span>
        <span>Add</span>
      </div>

      <div style={{ fontSize: "7.5px", fontWeight: "bold", marginBottom: "0.5mm" }}>{data.customerName}</div>
      <div style={{ fontSize: "6.5px", marginBottom: "1mm" }}>{data.productLine}</div>

      <div style={{ fontSize: "6px", marginBottom: "1.5mm", color: "#333" }}>
        Ref: {data.customerRefNo}
        <span style={{ marginLeft: "4mm" }}>Ref: {data.itemRefNo}</span>
      </div>

      <div
        style={{
          fontFamily: "monospace",
          fontSize: "9px",
          fontWeight: "bold",
          letterSpacing: "1px",
          textAlign: "center",
          margin: "1mm 0",
        }}
      >
        {data.barcodeText}
      </div>

      <div style={{ fontSize: "5.5px", color: "#555", textAlign: "center", marginBottom: "1.5mm" }}>
        {data.contactLine}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: "2mm", marginTop: "auto" }}>
        <span style={{ fontSize: "8px", fontWeight: "bold" }}>
          {eyeLabel} {dia}
        </span>
        <span>{rx.sph}</span>
        <span>{rx.cyl}</span>
        <span>{rx.axis}</span>
        <span>{rx.add}</span>
      </div>

      <div style={{ fontSize: "7px", fontWeight: "bold", marginTop: "1mm" }}>{data.orderNo}</div>
    </div>
  );
}
