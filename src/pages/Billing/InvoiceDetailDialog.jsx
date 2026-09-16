import { useEffect, useMemo, useState } from "react";
import {
  Receipt,
  Printer,
  Share2,
  FileText,
  XCircle,
  MessageSquare,
  FileDown,
  CreditCard,
  Save,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  getInvoiceById,
  getDeliveredOrdersForCustomer,
  updateInvoice,
  issueInvoice,
  cancelInvoice,
} from "@/services/invoice";
import { useCompany } from "@/contexts/CompanyContext";
import {
  fmt,
  orderTotal,
  printInvoice,
  whatsappShareInvoiceMessage,
  whatsappShareInvoicePdf,
  canRecordPayment,
} from "./Billing.constants";
import { InvoiceStatusBadge } from "./InvoiceCard";

function formatLocalDate(d) {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function stripTaxNotes(notes) {
  if (!notes) return "";
  return notes
    .split("\n")
    .filter((line) => !line.trim().startsWith("Tax: GST"))
    .join("\n")
    .trim();
}

export default function InvoiceDetailDialog({
  invoiceId,
  open,
  onClose,
  onPreview,
  onPay,
  onUpdated,
}) {
  const qc = useQueryClient();
  const { company } = useCompany();
  const [dueDate, setDueDate] = useState("");
  const [billDate, setBillDate] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);

  const { data: res, isLoading } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: () => getInvoiceById(invoiceId),
    enabled: open && !!invoiceId,
  });
  const invoice = res?.data;
  const companyForPrint = invoice?.company || company;
  const isDraft = invoice?.status === "DRAFT";
  const isEditable = isDraft && (invoice?.paidAmount || 0) <= 0;

  const { data: availableRes, isLoading: availableLoading } = useQuery({
    queryKey: ["delivered-orders", invoice?.customerId, "edit", invoiceId],
    queryFn: () => getDeliveredOrdersForCustomer(invoice.customerId),
    enabled: open && isEditable && !!invoice?.customerId,
  });

  const availableOrders = availableRes?.data || [];

  useEffect(() => {
    if (!invoice || !open) return;
    setDueDate(formatLocalDate(invoice.dueDate));
    setBillDate(formatLocalDate(invoice.billDate));
    setNotes(stripTaxNotes(invoice.notes));
    setSelectedOrderIds((invoice.saleOrders || []).map((o) => o.id));
  }, [invoice, open]);

  const orderOptions = useMemo(() => {
    const map = new Map();
    for (const o of invoice?.saleOrders || []) map.set(o.id, o);
    for (const o of availableOrders) map.set(o.id, o);
    return Array.from(map.values()).sort((a, b) => {
      const da = a.orderDate ? new Date(a.orderDate).getTime() : 0;
      const db = b.orderDate ? new Date(b.orderDate).getTime() : 0;
      return da - db;
    });
  }, [invoice?.saleOrders, availableOrders]);

  const selectedOrders = orderOptions.filter((o) => selectedOrderIds.includes(o.id));
  const selectedSubtotal = selectedOrders.reduce((s, o) => s + orderTotal(o), 0);

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["invoices"] });
    qc.invalidateQueries({ queryKey: ["invoices-stats"] });
    qc.invalidateQueries({ queryKey: ["billing-invoicing-stats"] });
    qc.invalidateQueries({ queryKey: ["invoice", invoiceId] });
    qc.invalidateQueries({ queryKey: ["dispatched-orders"] });
    onUpdated?.();
  };

  const saveMutation = useMutation({
    mutationFn: (payload) => updateInvoice(invoiceId, payload),
    onSuccess: () => {
      toast.success("Invoice saved");
      invalidateAll();
    },
    onError: (err) => toast.error(err?.message || "Failed to save invoice"),
  });

  const issueMutation = useMutation({
    mutationFn: issueInvoice,
    onSuccess: () => {
      toast.success("Invoice issued");
      invalidateAll();
    },
    onError: (err) => toast.error(err?.message || "Failed to issue invoice"),
  });

  const cancelMutation = useMutation({
    mutationFn: cancelInvoice,
    onSuccess: () => {
      toast.success("Invoice cancelled");
      invalidateAll();
      onClose();
    },
    onError: (err) => toast.error(err?.message || "Failed to cancel invoice"),
  });

  const toggleOrder = (id) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    if (!billDate) return toast.error("Please set a bill date");
    if (!dueDate) return toast.error("Please set a due date");
    if (!selectedOrderIds.length) return toast.error("Select at least one sale order");
    saveMutation.mutate({
      billDate,
      dueDate,
      notes: notes || undefined,
      saleOrderIds: selectedOrderIds,
    });
  };

  const handleClose = () => {
    onClose(false);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Bill Date</Label>
                {isEditable ? (
                  <Input
                    type="date"
                    value={billDate}
                    onChange={(e) => {
                      const next = e.target.value;
                      setBillDate(next);
                      const days = Number(invoice.customer?.credit_days ?? invoice.customer?.creditDays ?? 0) || 0;
                      if (!next) return;
                      const d = new Date(`${next}T12:00:00`);
                      if (Number.isNaN(d.getTime())) return;
                      d.setDate(d.getDate() + days);
                      setDueDate(formatLocalDate(d));
                    }}
                    className="h-8"
                  />
                ) : (
                  <span className="font-medium block">
                    {invoice.billDate
                      ? new Date(invoice.billDate).toLocaleDateString("en-IN")
                      : "—"}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Due Date</Label>
                {isEditable ? (
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="h-8"
                  />
                ) : (
                  <span className="font-medium block">
                    {new Date(invoice.dueDate).toLocaleDateString("en-IN")}
                  </span>
                )}
              </div>
              <div>
                <span className="text-muted-foreground block">Total Amount</span>
                <span className="font-bold text-base">
                  {fmt(isEditable ? selectedSubtotal : invoice.totalAmount)}
                  {isEditable && (
                    <span className="text-xs text-muted-foreground font-normal ml-1">
                      (excl. tax until save)
                    </span>
                  )}
                </span>
              </div>
              {!isEditable && (
                <div>
                  <span className="text-muted-foreground block">Tax (GST + SGST)</span>
                  <span className="font-medium">{fmt(invoice.taxAmount || 0)}</span>
                </div>
              )}
              <div>
                <span className="text-muted-foreground block">Paid Amount</span>
                <span className="font-bold text-base text-green-600">
                  {fmt(invoice.paidAmount)}
                </span>
              </div>
              {!isEditable && invoice.totalAmount - invoice.paidAmount > 0.01 && (
                <div>
                  <span className="text-muted-foreground block">Outstanding</span>
                  <span className="font-bold text-base text-orange-600">
                    {fmt(invoice.totalAmount - invoice.paidAmount)}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Notes</Label>
              {isEditable ? (
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Optional notes"
                />
              ) : invoice.notes ? (
                <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">
                Sale Orders ({isEditable ? selectedOrderIds.length : invoice.saleOrders?.length})
              </h4>
              {isEditable && availableLoading ? (
                <p className="text-xs text-muted-foreground py-2">Loading available orders…</p>
              ) : (
                <div className="border rounded-md divide-y max-h-56 overflow-y-auto">
                  {(isEditable ? orderOptions : invoice.saleOrders || []).map((o) => {
                    const selected = selectedOrderIds.includes(o.id);
                    return (
                      <div
                        key={o.id}
                        className={`flex items-center justify-between px-3 py-2 text-sm gap-2 ${selected && isEditable ? "bg-primary/5" : ""}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isEditable && (
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleOrder(o.id)}
                              className="h-4 w-4 shrink-0"
                            />
                          )}
                          <div className="min-w-0">
                            <span className="font-medium">{o.orderNo}</span>
                            <span className="text-muted-foreground ml-2 text-xs">
                              {o.lensProduct?.lens_name || "—"} · {o.coating?.name || "—"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-semibold">{fmt(orderTotal(o))}</span>
                          {!isEditable && (
                            <Badge
                              variant={["INVOICED", "COMPLETED"].includes(o.status) ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {o.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {isEditable && orderOptions.length === 0 && (
                    <p className="text-xs text-muted-foreground px-3 py-4 text-center">
                      No sale orders available
                    </p>
                  )}
                </div>
              )}
              {isEditable && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Check orders to include on this bill. Uncheck to remove (returns to Awaiting).
                </p>
              )}
            </div>

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
          <DialogFooter className="flex flex-wrap gap-2 pt-2 sm:justify-start">
            {isEditable && (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saveMutation.isPending || !selectedOrderIds.length || !dueDate || !billDate}
              >
                <Save className="h-4 w-4 mr-1" />
                {saveMutation.isPending ? "Saving…" : "Save"}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => onPreview?.(invoice)}>
              <FileText className="h-4 w-4 mr-1" /> Preview
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => printInvoice(invoice, companyForPrint)}
            >
              <Printer className="h-4 w-4" /> Print
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Share2 className="h-4 w-4" /> Share
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => whatsappShareInvoicePdf(invoice, companyForPrint)}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Invoice PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => whatsappShareInvoiceMessage(invoice)}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Invoice Message
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {isDraft && (
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
            {canRecordPayment(invoice.status) && onPay && (
              <Button size="sm" onClick={() => onPay(invoice)}>
                <CreditCard className="h-4 w-4 mr-1" /> Record Payment
              </Button>
            )}
            {!["PAID", "CANCELLED"].includes(invoice.status) &&
              (invoice.paidAmount || 0) <= 0 && (
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
            <Button variant="ghost" size="sm" onClick={handleClose}>
              Close
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
