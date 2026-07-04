import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Receipt, Printer, Share2, MessageSquare, CreditCard, XCircle, Zap, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { getInvoiceById, issueInvoice, cancelInvoice } from "@/services/invoice";
import {
  fmt,
  orderTotal,
  printInvoice,
  shareInvoice,
  whatsappShare,
  canRecordPayment,
} from "./Billing.constants";
import { InvoiceStatusBadge } from "./InvoiceCard";

export default function InvoiceDetailDialog({
  invoiceId,
  open,
  onClose,
  onPay,
  onQuickClose,
  onPreview,
}) {
  const qc = useQueryClient();

  const { data: res, isLoading } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: () => getInvoiceById(invoiceId),
    enabled: open && !!invoiceId,
  });
  const invoice = res?.data;

  const canQuickClose =
    invoice &&
    canRecordPayment(invoice.status) &&
    invoice.paidAmount === 0 &&
    invoice.totalAmount - invoice.paidAmount > 0.01;

  const issueMutation = useMutation({
    mutationFn: issueInvoice,
    onSuccess: () => {
      toast.success("Invoice issued");
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoices-stats"] });
      qc.invalidateQueries({ queryKey: ["invoice", invoiceId] });
    },
    onError: (err) => toast.error(err?.message || "Failed to issue invoice"),
  });

  const cancelMutation = useMutation({
    mutationFn: cancelInvoice,
    onSuccess: () => {
      toast.success("Invoice cancelled");
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoices-stats"] });
      onClose();
    },
    onError: (err) => toast.error(err?.message || "Failed to cancel invoice"),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            {isLoading ? "Loading…" : invoice?.invoiceNo}
            {invoice && <InvoiceStatusBadge status={invoice.status} />}
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <p className="text-muted-foreground py-6 text-center">Loading invoice…</p>
        )}

        {invoice && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground block">Customer</span>
                <span className="font-medium">{invoice.customer?.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Due Date</span>
                <span className="font-medium">
                  {new Date(invoice.dueDate).toLocaleDateString("en-IN")}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Total Amount</span>
                <span className="font-bold text-base">{fmt(invoice.totalAmount)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Paid Amount</span>
                <span className="font-bold text-base text-green-600">
                  {fmt(invoice.paidAmount)}
                </span>
              </div>
              {invoice.totalAmount - invoice.paidAmount > 0.01 && (
                <div className="col-span-2">
                  <span className="text-muted-foreground block">Outstanding</span>
                  <span className="font-bold text-base text-orange-600">
                    {fmt(invoice.totalAmount - invoice.paidAmount)}
                  </span>
                </div>
              )}
              {invoice.notes && (
                <div className="col-span-2">
                  <span className="text-muted-foreground block">Notes</span>
                  <span>{invoice.notes}</span>
                </div>
              )}
            </div>

            {/* Linked Sale Orders */}
            <div>
              <h4 className="text-sm font-semibold mb-2">
                Linked Sale Orders ({invoice.saleOrders?.length})
              </h4>
              <div className="border rounded-md divide-y">
                {invoice.saleOrders?.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between px-3 py-2 text-sm"
                  >
                    <div>
                      <span className="font-medium">{o.orderNo}</span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        {o.lensProduct?.lens_name || "—"} · {o.coating?.name || "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{fmt(orderTotal(o))}</span>
                      <Badge
                        variant={o.status === "BILLED" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {o.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment History */}
            {invoice.payments?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Payment History</h4>
                <div className="border rounded-md divide-y">
                  {invoice.payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between px-3 py-2 text-sm"
                    >
                      <div>
                        <span className="font-medium">{p.method.replace(/_/g, " ")}</span>
                        {p.referenceNo && (
                          <span className="text-muted-foreground ml-2">#{p.referenceNo}</span>
                        )}
                        {p.notes && (
                          <span className="text-muted-foreground ml-2">· {p.notes}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-green-700">{fmt(p.amount)}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(p.createdAt).toLocaleDateString("en-IN")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {invoice && (
          <DialogFooter className="flex flex-wrap gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPreview(invoice)}
            >
              <FileText className="h-4 w-4 mr-1" /> Preview
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => printInvoice(invoice)}
            >
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => shareInvoice(invoice)}
            >
              <Share2 className="h-4 w-4" /> Share
            </Button>
            {invoice.customer?.phone && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => whatsappShare(invoice)}
              >
                <MessageSquare className="h-4 w-4" /> WhatsApp
              </Button>
            )}
            {invoice.status === "DRAFT" && (
              <Button
                variant="outline"
                size="sm"
                className="border-blue-300 text-blue-700 hover:bg-blue-50"
                onClick={() => issueMutation.mutate(invoice.id)}
                disabled={issueMutation.isPending}
              >
                Issue Invoice
              </Button>
            )}
            {canRecordPayment(invoice.status) && (
              <>
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    onClose();
                    onPay(invoice);
                  }}
                >
                  <CreditCard className="h-3.5 w-3.5" /> Record Payment
                </Button>
                {canQuickClose && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => {
                      onClose();
                      onQuickClose(invoice);
                    }}
                  >
                    <Zap className="h-3.5 w-3.5" /> Quick Close
                  </Button>
                )}
              </>
            )}
            {!["PAID", "CANCELLED"].includes(invoice.status) && (
              <Button
                variant="outline"
                size="sm"
                className="border-red-300 text-red-700 hover:bg-red-50"
                onClick={() => cancelMutation.mutate(invoice.id)}
                disabled={cancelMutation.isPending}
              >
                <XCircle className="h-4 w-4 mr-1" /> Cancel
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
