import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import AuthenticityCardPreview from "@/components/LensPrint/previews/AuthenticityCardPreview";
import BarcodeLabelPreview from "@/components/LensPrint/previews/BarcodeLabelPreview";
import { buildBarcodePayload } from "@/utils/dispatchLabelPrint";
import { buildCustomerCardPayload } from "@/utils/customerCardPrint";

function cardPreviewData(order) {
  return buildCustomerCardPayload(order);
}

/**
 * In-app batch preview before sending EXE print jobs.
 * Shows only EXE types from the plan (mixed mode A).
 * Tabs: Cards | Barcodes (whichever has preview items).
 */
export default function DispatchLabelsPreviewModal({
  open,
  plan,
  onConfirm,
  onCancel,
  isSubmitting = false,
}) {
  const previewCards = plan?.previewCards || [];
  const previewBarcodes = plan?.previewBarcodes || [];
  const hasCards = previewCards.length > 0;
  const hasBarcodes = previewBarcodes.length > 0;

  const tabs = useMemo(() => {
    const t = [];
    if (hasCards) t.push({ id: "cards", label: `Cards (${previewCards.length})` });
    if (hasBarcodes) t.push({ id: "barcodes", label: `Barcodes (${previewBarcodes.length})` });
    return t;
  }, [hasCards, hasBarcodes, previewCards.length, previewBarcodes.length]);

  const [tab, setTab] = useState(null);
  const activeTab = tab && tabs.some((t) => t.id === tab) ? tab : tabs[0]?.id;

  const chromeNote = useMemo(() => {
    const parts = [];
    if (plan?.printCard && plan?.cardMode === "chrome") {
      parts.push("DC Card (Chrome dialog after Send)");
    }
    if (plan?.printBarcode && plan?.barcodeMode === "chrome") {
      parts.push("Barcode (Chrome dialog after Send)");
    }
    return parts.length ? parts.join(" · ") : null;
  }, [plan]);

  if (!plan) return null;

  return (
    <Dialog
      size="wide"
      open={open}
      onOpenChange={(v) => {
        if (!v && !isSubmitting) onCancel?.();
      }}
    >
      <DialogContent className="max-h-[90vh] flex flex-col gap-3 overflow-hidden">
        <DialogHeader>
          <DialogTitle>Print preview</DialogTitle>
          <DialogDescription>
            Review EXE labels, then Send to printer. Order: all Cards, then Barcodes (R → L per
            order). Previews are shown upright; the printer output is rotated to fit the stock.
            {chromeNote ? (
              <span className="block mt-1 text-xs">Also queued after Send: {chromeNote}</span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        {tabs.length > 1 && (
          <div className="flex gap-1 border-b pb-0">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`px-3 py-1.5 text-sm border-b-2 -mb-px transition-colors ${
                  activeTab === t.id
                    ? "border-primary text-foreground font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto max-h-[55vh] pr-1">
          {activeTab === "cards" && hasCards && (
            <div className="flex flex-col gap-4 py-2">
              {previewCards.map((order) => {
                const data = cardPreviewData(order);
                return (
                  <div key={order.id || data.orderNo} className="flex flex-col gap-1.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      {data.orderNo}
                      {data.lensLine || data.productLine
                        ? ` · ${data.lensLine || data.productLine}`
                        : ""}
                    </p>
                    <div className="flex justify-center scale-[0.85] origin-top sm:scale-100">
                      <AuthenticityCardPreview payload={data} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === "barcodes" && hasBarcodes && (
            <div className="flex flex-col gap-4 py-2">
              {previewBarcodes.map((item, idx) => {
                const orderNo = item.order?.orderNo || item.order?.order_number || item.payload?.orderNo;
                const payload = item.payload || buildBarcodePayload(item.order);
                return (
                  <div key={`${orderNo}-${item.eye}-${idx}`} className="flex flex-col gap-1.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      {orderNo} · Eye {item.eye}
                    </p>
                    <div className="flex justify-center scale-[0.85] origin-top sm:scale-100">
                      <BarcodeLabelPreview data={payload} eye={item.eye} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!hasCards && !hasBarcodes && (
            <p className="text-sm text-muted-foreground py-8 text-center">Nothing to preview.</p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm} disabled={isSubmitting || (!hasCards && !hasBarcodes && !chromeNote)}>
            {isSubmitting ? "Sending…" : "Send to printer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
