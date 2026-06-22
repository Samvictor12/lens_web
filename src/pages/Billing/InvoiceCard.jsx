import { Eye, CreditCard, Zap, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fmt, STATUS_CONFIG } from "./Billing.constants";

// ─── InvoiceStatusBadge (shared, exported for use in dialogs) ─────────────────
export function InvoiceStatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}
    >
      {cfg.label}
    </span>
  );
}

// ─── InvoiceCard ──────────────────────────────────────────────────────────────
export default function InvoiceCard({ invoice, onView, onPreview, onPay, onQuickClose }) {
  const remaining = invoice.totalAmount - invoice.paidAmount;
  const pct =
    invoice.totalAmount > 0
      ? Math.min(100, (invoice.paidAmount / invoice.totalAmount) * 100)
      : 0;
  const canQuickClose =
    !["PAID", "CANCELLED"].includes(invoice.status) &&
    invoice.paidAmount === 0 &&
    remaining > 0.01;

  return (
    <Card className="hover:shadow-md transition-shadow flex flex-col h-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{invoice.invoiceNo}</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">{invoice.customer?.name}</p>
            {invoice.customer?.code && (
              <p className="text-xs text-muted-foreground">{invoice.customer.code}</p>
            )}
          </div>
          <InvoiceStatusBadge status={invoice.status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-3 flex-1">
        <div className="grid grid-cols-2 gap-x-4 text-sm">
          <div>
            <span className="text-muted-foreground">Total</span>
            <p className="font-semibold">{fmt(invoice.totalAmount)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Paid</span>
            <p className="font-semibold text-green-600">{fmt(invoice.paidAmount)}</p>
          </div>
          {remaining > 0.01 && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Outstanding</span>
              <p className="font-bold text-orange-600">{fmt(remaining)}</p>
            </div>
          )}
        </div>

        {/* Payment progress bar */}
        <div className="w-full bg-muted rounded-full h-1.5">
          <div
            className="bg-green-500 h-1.5 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{invoice._count?.saleOrders || 0} orders</span>
          <span>Due {new Date(invoice.dueDate).toLocaleDateString("en-IN")}</span>
        </div>
      </CardContent>

      <div className="flex gap-2 px-6 pb-4 mt-auto">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1"
          onClick={() => onView(invoice.id)}
        >
          <Eye className="h-3.5 w-3.5" /> View
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1"
          onClick={() => onPreview(invoice)}
        >
          <FileText className="h-3.5 w-3.5" /> Preview
        </Button>
        {!["PAID", "CANCELLED"].includes(invoice.status) && (
          <Button size="sm" className="flex-1 gap-1" onClick={() => onPay(invoice)}>
            <CreditCard className="h-3.5 w-3.5" /> Pay
          </Button>
        )}
        {canQuickClose && (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 gap-1"
            onClick={() => onQuickClose(invoice)}
          >
            <Zap className="h-3.5 w-3.5" /> Quick Close
          </Button>
        )}
      </div>
    </Card>
  );
}
