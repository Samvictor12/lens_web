import React, { forwardRef } from "react";

/**
 * LensSpecificationPrint Component
 * Renders lens specification details in A5 format for printing
 * Format: Two sections (Left and Right) with specifications
 */
const LensSpecificationPrint = forwardRef(
  (
    {
      saleOrder,
      coatings,
    },
    ref
  ) => {
    const getCoatingName = (coatingId) => {
      if (!coatingId || !coatings) return "None";
      const coating = coatings.find((c) => c.id === coatingId);
      return coating ? coating.coating_name : "None";
    };

    const formatValue = (value) => {
      if (!value || value === "") return "-";
      const num = parseFloat(value);
      return isNaN(num) ? "-" : num.toFixed(2);
    };

    const hasCoating = saleOrder?.coating_id;
    const coatingName = getCoatingName(saleOrder?.coating_id);

    return (
      <div
        ref={ref}
        className="bg-white"
        style={{
          width: "148mm", // A5 width
          height: "210mm", // A5 height
          padding: "10mm",
          fontFamily: "Arial, sans-serif",
          fontSize: "11px",
          lineHeight: "1.3",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "8mm" }}>
          <h2 style={{ margin: "0 0 2mm 0", fontSize: "14px", fontWeight: "bold" }}>
            LENS SPECIFICATION
          </h2>
          <p style={{ margin: "0", fontSize: "9px", color: "#666" }}>
            Order: {saleOrder?.orderNo || "N/A"}
          </p>
          <p style={{ margin: "0", fontSize: "9px", color: "#666" }}>
            {new Date(saleOrder?.orderDate).toLocaleDateString()}
          </p>
        </div>

        <hr style={{ margin: "4mm 0", borderTop: "1px solid #ddd" }} />

        {/* Main Content - Two Column Layout */}
        <div style={{ display: "flex", gap: "6mm" }}>
          {/* LEFT EYE SECTION */}
          {saleOrder?.leftEye && (
            <div style={{ flex: 1 }}>
              <h3
                style={{
                  textAlign: "center",
                  margin: "0 0 3mm 0",
                  fontSize: "12px",
                  fontWeight: "bold",
                  color: "#1a1a1a",
                  borderBottom: "2px solid #333",
                  paddingBottom: "2mm",
                }}
              >
                LEFT EYE
              </h3>

              {/* Specification Table */}
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "3mm" }}>
                <tbody>
                  <tr>
                    <td
                      style={{
                        padding: "2mm",
                        fontWeight: "bold",
                        backgroundColor: "#f0f0f0",
                        border: "1px solid #ddd",
                        width: "50%",
                      }}
                    >
                      Spherical
                    </td>
                    <td
                      style={{
                        padding: "2mm",
                        textAlign: "center",
                        border: "1px solid #ddd",
                        fontWeight: "500",
                      }}
                    >
                      {formatValue(saleOrder?.leftSpherical)}
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        padding: "2mm",
                        fontWeight: "bold",
                        backgroundColor: "#f0f0f0",
                        border: "1px solid #ddd",
                      }}
                    >
                      Cylinder
                    </td>
                    <td
                      style={{
                        padding: "2mm",
                        textAlign: "center",
                        border: "1px solid #ddd",
                        fontWeight: "500",
                      }}
                    >
                      {formatValue(saleOrder?.leftCylindrical)}
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        padding: "2mm",
                        fontWeight: "bold",
                        backgroundColor: "#f0f0f0",
                        border: "1px solid #ddd",
                      }}
                    >
                      Axis
                    </td>
                    <td
                      style={{
                        padding: "2mm",
                        textAlign: "center",
                        border: "1px solid #ddd",
                        fontWeight: "500",
                      }}
                    >
                      {formatValue(saleOrder?.leftAxis)}°
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        padding: "2mm",
                        fontWeight: "bold",
                        backgroundColor: "#f0f0f0",
                        border: "1px solid #ddd",
                      }}
                    >
                      Addition
                    </td>
                    <td
                      style={{
                        padding: "2mm",
                        textAlign: "center",
                        border: "1px solid #ddd",
                        fontWeight: "500",
                      }}
                    >
                      {formatValue(saleOrder?.leftAdd)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Coating Section */}
              {hasCoating && (
                <div
                  style={{
                    padding: "2mm",
                    backgroundColor: "#e8f4f8",
                    border: "1px solid #b3d9e8",
                    borderRadius: "2mm",
                  }}
                >
                  <p style={{ margin: "0 0 1mm 0", fontSize: "9px", fontWeight: "bold" }}>
                    Coating:
                  </p>
                  <p style={{ margin: "0", fontSize: "10px", fontWeight: "600" }}>
                    {coatingName}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* RIGHT EYE SECTION */}
          {saleOrder?.rightEye && (
            <div style={{ flex: 1 }}>
              <h3
                style={{
                  textAlign: "center",
                  margin: "0 0 3mm 0",
                  fontSize: "12px",
                  fontWeight: "bold",
                  color: "#1a1a1a",
                  borderBottom: "2px solid #333",
                  paddingBottom: "2mm",
                }}
              >
                RIGHT EYE
              </h3>

              {/* Specification Table */}
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "3mm" }}>
                <tbody>
                  <tr>
                    <td
                      style={{
                        padding: "2mm",
                        fontWeight: "bold",
                        backgroundColor: "#f0f0f0",
                        border: "1px solid #ddd",
                        width: "50%",
                      }}
                    >
                      Spherical
                    </td>
                    <td
                      style={{
                        padding: "2mm",
                        textAlign: "center",
                        border: "1px solid #ddd",
                        fontWeight: "500",
                      }}
                    >
                      {formatValue(saleOrder?.rightSpherical)}
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        padding: "2mm",
                        fontWeight: "bold",
                        backgroundColor: "#f0f0f0",
                        border: "1px solid #ddd",
                      }}
                    >
                      Cylinder
                    </td>
                    <td
                      style={{
                        padding: "2mm",
                        textAlign: "center",
                        border: "1px solid #ddd",
                        fontWeight: "500",
                      }}
                    >
                      {formatValue(saleOrder?.rightCylindrical)}
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        padding: "2mm",
                        fontWeight: "bold",
                        backgroundColor: "#f0f0f0",
                        border: "1px solid #ddd",
                      }}
                    >
                      Axis
                    </td>
                    <td
                      style={{
                        padding: "2mm",
                        textAlign: "center",
                        border: "1px solid #ddd",
                        fontWeight: "500",
                      }}
                    >
                      {formatValue(saleOrder?.rightAxis)}°
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        padding: "2mm",
                        fontWeight: "bold",
                        backgroundColor: "#f0f0f0",
                        border: "1px solid #ddd",
                      }}
                    >
                      Addition
                    </td>
                    <td
                      style={{
                        padding: "2mm",
                        textAlign: "center",
                        border: "1px solid #ddd",
                        fontWeight: "500",
                      }}
                    >
                      {formatValue(saleOrder?.rightAdd)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Coating Section */}
              {hasCoating && (
                <div
                  style={{
                    padding: "2mm",
                    backgroundColor: "#e8f4f8",
                    border: "1px solid #b3d9e8",
                    borderRadius: "2mm",
                  }}
                >
                  <p style={{ margin: "0 0 1mm 0", fontSize: "9px", fontWeight: "bold" }}>
                    Coating:
                  </p>
                  <p style={{ margin: "0", fontSize: "10px", fontWeight: "600" }}>
                    {coatingName}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop: "6mm", textAlign: "center", fontSize: "8px", color: "#999" }}>
          <hr style={{ borderTop: "1px solid #ddd", margin: "4mm 0" }} />
          <p style={{ margin: "0" }}>
            Printed on: {new Date().toLocaleString()}
          </p>
        </div>
      </div>
    );
  }
);

LensSpecificationPrint.displayName = "LensSpecificationPrint";

export default LensSpecificationPrint;
