import { useMemo, useState } from "react";
import { Eye } from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";
import { PREVIEW_TEMPLATE_TABS } from "@/constants/printPreviewFixtures";
import { buildPrintPreviewData, getPreviewOrderForTemplate } from "@/utils/printPreviewData";
import { cn } from "@/lib/utils";
import AuthenticityCardPreview from "./AuthenticityCardPreview";
import BarcodeLabelPreview from "./BarcodeLabelPreview";
import InvoiceBillPreview from "./InvoiceBillPreview";
import DispatchNotePreview from "./DispatchNotePreview";

const ZOOM_OPTIONS = [
  { id: "fit", label: "Fit", scale: null },
  { id: "100", label: "100%", scale: 1 },
  { id: "125", label: "125%", scale: 1.25 },
];

function getPreviewScale(templateId, zoomId) {
  const manual = ZOOM_OPTIONS.find((z) => z.id === zoomId)?.scale;
  if (manual) return manual;
  if (templateId === "SALE_ORDER" || templateId === "DISPATCH_NOTE") return 0.42;
  if (templateId.startsWith("BARCODE")) return 1.1;
  return 1.15;
}

export default function PrintSettingsPreviewPanel({ activeTemplate, onTemplateChange }) {
  const { company } = useCompany();
  const [zoom, setZoom] = useState("fit");

  const templateId = activeTemplate || "AUTHENTICITY_CARD";

  const previewData = useMemo(() => {
    const order = getPreviewOrderForTemplate(templateId);
    return buildPrintPreviewData(order, company);
  }, [templateId, company]);

  const scale = getPreviewScale(templateId, zoom);
  const tabMeta = PREVIEW_TEMPLATE_TABS.find((t) => t.id === templateId);

  const renderPreview = () => {
    switch (templateId) {
      case "AUTHENTICITY_CARD":
        return <AuthenticityCardPreview data={previewData} />;
      case "BARCODE_LABEL_L":
        return <BarcodeLabelPreview data={previewData} eye="L" />;
      case "BARCODE_LABEL_R":
        return <BarcodeLabelPreview data={previewData} eye="R" />;
      case "SALE_ORDER":
        return <InvoiceBillPreview data={previewData} />;
      case "DISPATCH_NOTE":
        return <DispatchNotePreview data={previewData} />;
      default:
        return null;
    }
  };

  return (
    <div className="rounded-lg border bg-muted/20 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b bg-background">
        <div className="flex items-center gap-2 min-w-0">
          <Eye className="h-4 w-4 text-teal-600 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">Template Preview</p>
            <p className="text-[11px] text-muted-foreground truncate">
              Sample order {previewData.orderNo} · {tabMeta?.media}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {ZOOM_OPTIONS.map((z) => (
            <button
              key={z.id}
              type="button"
              onClick={() => setZoom(z.id)}
              className={cn(
                "px-2 py-0.5 text-[11px] rounded border transition-colors",
                zoom === z.id
                  ? "bg-teal-600 text-white border-teal-600"
                  : "bg-background text-muted-foreground border-input hover:bg-muted"
              )}
            >
              {z.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 px-4 py-2 border-b bg-background/80">
        {PREVIEW_TEMPLATE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTemplateChange?.(tab.id)}
            className={cn(
              "px-2.5 py-1 text-xs rounded-md border transition-colors",
              templateId === tab.id
                ? "bg-teal-600 text-white border-teal-600"
                : "bg-background text-foreground border-input hover:bg-muted"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        className="overflow-auto flex justify-center items-start p-4"
        style={{ minHeight: "220px", maxHeight: "340px", backgroundColor: "hsl(var(--muted) / 0.35)" }}
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top center",
          }}
        >
          {renderPreview()}
        </div>
      </div>

      <div className="px-4 py-2 border-t bg-background text-[11px] text-muted-foreground">
        Dummy preview for layout testing. Contact line uses Company Details email &amp; phone.
        Actual print may differ slightly on Evolis / TSC / Canon hardware.
      </div>
    </div>
  );
}

/** Map printer config card type → preview tab id */
export function configTypeToPreviewTab(configType) {
  if (configType === "BARCODE_LABEL") return "BARCODE_LABEL_L";
  if (configType === "LENS_SPECIFICATION") return "AUTHENTICITY_CARD";
  return configType;
}

/** Map preview tab → printer config card type (for highlight) */
export function previewTabToConfigType(tabId) {
  if (tabId.startsWith("BARCODE")) return "BARCODE_LABEL";
  if (tabId === "AUTHENTICITY_CARD") return "AUTHENTICITY_CARD";
  return tabId;
}
