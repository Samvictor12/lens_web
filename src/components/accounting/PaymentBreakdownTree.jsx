import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight, ExternalLink, FileText, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { invoiceDetailPath, purchaseOrderDetailPath } from "@/constants/accountingPaths";

export { invoiceDetailPath, purchaseOrderDetailPath };

const fmt = (amount) =>
  `₹${parseFloat(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

/**
 * Expandable payment/receipt breakdown tree with links to Invoice or PO detail.
 * @param {'customer'|'vendor'} type
 */
export default function PaymentBreakdownTree({
  type,
  documentNumber,
  totalAmount,
  advanceAmount = 0,
  items = [],
  defaultOpen = true,
  compact = false,
  className,
  onBeforeNavigate,
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(defaultOpen);

  const allocatedTotal = items.reduce(
    (s, i) => s + parseFloat(i.allocatedAmount || 0),
    0
  );
  const advance = parseFloat(advanceAmount || 0);
  const isCustomer = type === "customer";
  const Icon = isCustomer ? Receipt : FileText;
  const rootLabel = isCustomer ? "Receipt" : "Payment";

  const handleNavigate = (target) => {
    onBeforeNavigate?.();
    if (isCustomer && target.invoiceId) {
      navigate(invoiceDetailPath(target.invoiceId));
      return;
    }
    if (!isCustomer && target.purchaseOrderId) {
      navigate(purchaseOrderDetailPath(target.purchaseOrderId));
    }
  };

  if (!documentNumber && items.length === 0) return null;

  return (
    <div className={cn("border rounded-md text-xs", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-2 px-3 py-2 text-left font-medium",
          "hover:bg-muted/50 transition-colors",
          open ? "border-b bg-muted/30" : ""
        )}
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate">
          {rootLabel} — {documentNumber || "—"}
        </span>
        <span className="font-mono font-semibold shrink-0">{fmt(totalAmount)}</span>
      </button>

      {open && (
        <div className="divide-y">
          {items.map((item) => {
            const invoice = item.invoice;
            const po = item.purchaseOrder;
            const label = isCustomer
              ? invoice?.invoiceNo || `INV #${item.invoiceId}`
              : po?.poNumber || `PO #${item.purchaseOrderId}`;
            const docId = isCustomer ? item.invoiceId : item.purchaseOrderId;
            const subLabel = !isCustomer && po?.orderDate
              ? new Date(po.orderDate).toLocaleDateString("en-IN")
              : isCustomer && invoice?.dueDate
                ? `Due ${new Date(invoice.dueDate).toLocaleDateString("en-IN")}`
                : null;

            return (
              <div
                key={item.id ?? `${type}-${docId}`}
                className={cn(
                  "flex items-center gap-2 pl-8 pr-3 py-2",
                  compact ? "py-1.5" : "py-2"
                )}
              >
                <span className="text-muted-foreground select-none">└</span>
                <div className="flex-1 min-w-0">
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs font-medium text-primary"
                    onClick={() =>
                      handleNavigate({
                        invoiceId: item.invoiceId,
                        purchaseOrderId: item.purchaseOrderId,
                      })
                    }
                  >
                    {label}
                    <ExternalLink className="ml-1 h-3 w-3 inline" />
                  </Button>
                  {subLabel && (
                    <p className="text-[10px] text-muted-foreground pl-0">{subLabel}</p>
                  )}
                </div>
                <span className="font-mono font-semibold shrink-0">
                  {fmt(item.allocatedAmount)}
                </span>
              </div>
            );
          })}

          {advance > 0 && (
            <div className="flex items-center gap-2 pl-8 pr-3 py-2 text-blue-700">
              <span className="text-muted-foreground select-none">└</span>
              <span className="flex-1">Advance credit</span>
              <span className="font-mono font-semibold">{fmt(advance)}</span>
            </div>
          )}

          {items.length > 0 && (
            <div className="flex items-center gap-2 pl-8 pr-3 py-2 bg-muted/20 font-semibold text-muted-foreground">
              <span className="flex-1">
                {isCustomer ? "Allocated to invoices" : "Allocated to POs"}
              </span>
              <span className="font-mono">{fmt(allocatedTotal)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
