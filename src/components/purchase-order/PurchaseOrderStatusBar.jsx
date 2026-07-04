import { PO_STAGE_STEPS, PO_STAGE_LABELS, poPipelineStep, poStageIndex } from "@/constants/purchaseOrderStatus";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

/**
 * PO lifecycle pipeline: Pending → Partial Received → Full Received → Paid
 * (Partial vendor payment does not change stage; full payment → Paid)
 */
export default function PurchaseOrderStatusBar({ status, className }) {
  const isCancelled = status === "CANCELLED";
  const pipelineStatus = poPipelineStep(status);
  const currentIndex = poStageIndex(status);

  return (
    <div className={cn("rounded-lg border bg-muted/30 px-3 py-2", className)}>
      <p className="text-xs text-muted-foreground mb-2">PO pipeline</p>
      <div className="flex flex-wrap items-center gap-1">
        {PO_STAGE_STEPS.map((step, idx) => {
          const done = !isCancelled && currentIndex > idx;
          const current = !isCancelled && pipelineStatus === step;
          const future = !done && !current;

          return (
            <span key={step} className="flex items-center gap-1">
              {idx > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full border whitespace-nowrap",
                  done && "bg-green-100 text-green-800 border-green-200",
                  current && "bg-primary text-primary-foreground border-primary",
                  future && "bg-background text-muted-foreground border-border",
                  isCancelled && "opacity-50"
                )}
              >
                {PO_STAGE_LABELS[step]}
              </span>
            </span>
          );
        })}
        {isCancelled && (
          <span className="text-xs px-2 py-0.5 rounded-full border bg-red-50 text-red-700 border-red-200 ml-1">
            Cancelled
          </span>
        )}
      </div>
    </div>
  );
}
