import { useState } from "react";
import { STATUS_BAR_STEPS, STATUS_LABELS } from "@/constants/saleOrderStatus";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import SaleOrderStatusLogDialog from "./SaleOrderStatusLogDialog";

/**
 * Clickable horizontal status pipeline for a sale order.
 */
export default function SaleOrderStatusBar({ orderId, orderNo, status, hasPoHistory }) {
  const [logOpen, setLogOpen] = useState(false);

  const steps = STATUS_BAR_STEPS.filter((step) => {
    if (!hasPoHistory && ["PO_RAISED", "PO_RECEIVED", "PO_CANCELLED"].includes(step)) {
      return false;
    }
    return true;
  });

  const rejectStatuses = ["PO_CANCELLED", "PRE_QC_REJECTED", "POST_QC_REJECTED", "PRE_QC_SCRAPPED", "POST_QC_SCRAPPED"];
  const currentIndex = steps.indexOf(status);
  const isReject = rejectStatuses.includes(status);

  return (
    <>
      <button
        type="button"
        onClick={() => setLogOpen(true)}
        className="w-full text-left rounded-lg border bg-muted/30 px-3 py-2 hover:bg-muted/50 transition-colors"
        title="View status history"
      >
        <p className="text-xs text-muted-foreground mb-2">Order pipeline — click for history</p>
        <div className="flex flex-wrap items-center gap-1">
          {steps.map((step, idx) => {
            const done = !isReject && currentIndex > idx;
            const current = step === status || (isReject && step === status);
            const future = !done && !current;

            return (
              <span key={step} className="flex items-center gap-1">
                {idx > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full border whitespace-nowrap",
                    done && "bg-green-100 text-green-800 border-green-200",
                    current && !isReject && "bg-primary text-primary-foreground border-primary",
                    current && isReject && "bg-amber-100 text-amber-900 border-amber-300",
                    future && "bg-background text-muted-foreground border-border"
                  )}
                >
                  {STATUS_LABELS[step] || step}
                </span>
              </span>
            );
          })}
          {isReject && !steps.includes(status) && (
            <span className="text-xs px-2 py-0.5 rounded-full border bg-amber-100 text-amber-900 border-amber-300 ml-1">
              {STATUS_LABELS[status]}
            </span>
          )}
        </div>
      </button>

      <SaleOrderStatusLogDialog
        open={logOpen}
        onOpenChange={setLogOpen}
        orderId={orderId}
        orderNo={orderNo}
      />
    </>
  );
}
