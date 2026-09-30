import { useEffect, useState } from "react";
import { buildBarcodeArtworkDataUrl } from "@/utils/dispatchLabelPrint";

/**
 * DC Customer Barcode — 75 × 50 mm (width × height). Preview matches Chrome/EXE print.
 */
export default function BarcodeLabelPreview({ data, eye }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const payload = data?.row ? data : { ...(data || {}), eye: eye || data?.eye || "R" };
    buildBarcodeArtworkDataUrl(payload)
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [data, eye]);

  return (
    <div
      className="bg-white shadow-md border border-gray-300 overflow-hidden select-none"
      style={{ width: "75mm", height: "50mm" }}
    >
      {src && (
        <img
          src={src}
          alt="Barcode label preview"
          style={{ width: "75mm", height: "50mm", display: "block" }}
        />
      )}
    </div>
  );
}
