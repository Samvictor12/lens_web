import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  Plus, Receipt, CreditCard, XCircle, Eye, CheckCircle2, Clock,
  AlertCircle, Printer, ChevronLeft, ChevronRight, Search, Filter,
  Share2, MessageSquare, PackageCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  getInvoices,
  getInvoiceById,
  getDeliveredOrdersForCustomer,
  getDispatchedOrders,
  createInvoice,
  issueInvoice,
  recordPayment,
  cancelInvoice,
} from "@/services/invoice";
import { getCustomers } from "@/services/customer";

// ─── helpers ────────────────────────────────────────────────────────────────
const fmt = (n) =>
  typeof n === "number" ? `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—";

const orderTotal = (o) => {
  const base =
    (o.lensPrice || 0) +
    (o.fittingPrice || 0) +
    (o.tintingPrice || 0) +
    (o.rightEyeExtra || 0) +
    (o.leftEyeExtra || 0);
  const disc = base * ((o.discount || 0) / 100);
  const extra = Array.isArray(o.additionalPrice)
    ? o.additionalPrice.reduce((s, x) => s + (x.amount || 0), 0)
    : 0;
  return Math.round((base - disc + extra) * 100) / 100;
};

const STATUS_CONFIG = {
  DRAFT:          { label: "Draft",          color: "bg-gray-100 text-gray-700 border-gray-300" },
  ISSUED:         { label: "Issued",         color: "bg-blue-100 text-blue-700 border-blue-300" },
  PARTIALLY_PAID: { label: "Partially Paid", color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  PAID:           { label: "Paid",           color: "bg-green-100 text-green-700 border-green-300" },
  CANCELLED:      { label: "Cancelled",      color: "bg-red-100 text-red-700 border-red-300" },
};

const PAYMENT_METHODS = ["CASH", "UPI", "CARD", "BANK_TRANSFER", "CHECK"];
const PAGE_SIZE = 20;

// ─── printInvoice ─────────────────────────────────────────────────────────────
function printInvoice(invoice) {
  if (!invoice) return;
  const remaining = invoice.totalAmount - invoice.paidAmount;
  const orderRows = (invoice.saleOrders || [])
    .map((o) => {
      const base = (o.lensPrice || 0) + (o.fittingPrice || 0) + (o.tintingPrice || 0)
        + (o.rightEyeExtra || 0) + (o.leftEyeExtra || 0);
      const disc = base * ((o.discount || 0) / 100);
      const extra = Array.isArray(o.additionalPrice)
        ? o.additionalPrice.reduce((s, x) => s + (x.amount || 0), 0) : 0;
      const total = Math.round((base - disc + extra) * 100) / 100;
      return `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${o.orderNo}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${o.lensProduct?.lens_name || "—"}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${o.coating?.name || "—"}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">
          ₹${total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </td>
      </tr>`;
    }).join("");
  const paymentRows = (invoice.payments || [])
    .map((p) => `<tr>
      <td style="padding:5px 8px;">${new Date(p.createdAt).toLocaleDateString("en-IN")}</td>
      <td style="padding:5px 8px;">${p.method.replace(/_/g, " ")}</td>
      <td style="padding:5px 8px;">${p.referenceNo || "—"}</td>
      <td style="padding:5px 8px;text-align:right;color:#16a34a;">
        ₹${p.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
      </td>
    </tr>`).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
    <title>Invoice ${invoice.invoiceNo}</title>
    <style>
      @page{size:A4;margin:20mm}
      body{font-family:Arial,sans-serif;font-size:13px;color:#111;margin:0}
      h1{font-size:22px;margin:0 0 4px}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px}
      .lbl{color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:.04em}
      .val{font-weight:600;font-size:14px}
      .sec{font-size:13px;font-weight:700;margin:20px 0 8px;border-bottom:2px solid #e5e7eb;padding-bottom:4px}
      table{width:100%;border-collapse:collapse}
      th{text-align:left;padding:7px 8px;background:#f3f4f6;font-size:12px;color:#374151}
      @media print{button{display:none}}
    </style>
  </head><body>
    <div class="header">
      <div>
        <h1>INVOICE</h1>
        <div style="font-size:18px;font-weight:700;color:#4f46e5;">${invoice.invoiceNo}</div>
      </div>
      <div style="text-align:right">
        <div class="lbl">Status</div>
        <div class="val">${STATUS_CONFIG[invoice.status]?.label || invoice.status}</div>
        <div class="lbl" style="margin-top:8px">Due Date</div>
        <div class="val">${new Date(invoice.dueDate).toLocaleDateString("en-IN")}</div>
      </div>
    </div>
    <div style="display:flex;gap:40px;margin-bottom:20px">
      <div>
        <div class="lbl">Bill To</div>
        <div class="val">${invoice.customer?.name || "—"}</div>
        ${invoice.customer?.code ? `<div style="color:#6b7280;font-size:12px">${invoice.customer.code}</div>` : ""}
        ${invoice.customer?.phone ? `<div style="color:#6b7280;font-size:12px">${invoice.customer.phone}</div>` : ""}
      </div>
      <div>
        <div class="lbl">Invoice Date</div>
        <div class="val">${new Date(invoice.createdAt).toLocaleDateString("en-IN")}</div>
      </div>
    </div>
    <div class="sec">Sale Orders</div>
    <table>
      <thead><tr>
        <th>Order No.</th><th>Product</th><th>Coating</th>
        <th style="text-align:right">Amount</th>
      </tr></thead>
      <tbody>
        ${orderRows}
        <tr style="font-weight:700">
          <td colspan="3" style="padding:8px;border-top:2px solid #e5e7eb;text-align:right">Total</td>
          <td style="padding:8px;border-top:2px solid #e5e7eb;text-align:right">
            ₹${invoice.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </td>
        </tr>
        <tr style="color:#16a34a">
          <td colspan="3" style="padding:4px 8px;text-align:right">Paid</td>
          <td style="padding:4px 8px;text-align:right">
            ₹${invoice.paidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </td>
        </tr>
        ${remaining > 0.01 ? `<tr style="color:#ea580c;font-weight:700">
          <td colspan="3" style="padding:4px 8px;text-align:right">Outstanding</td>
          <td style="padding:4px 8px;text-align:right">
            ₹${remaining.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </td>
        </tr>` : ""}
      </tbody>
    </table>
    ${invoice.payments?.length ? `
    <div class="sec">Payment History</div>
    <table>
      <thead><tr><th>Date</th><th>Method</th><th>Reference</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${paymentRows}</tbody>
    </table>` : ""}
    ${invoice.notes ? `<div style="margin-top:20px;padding:10px;background:#f9fafb;border-radius:6px;font-size:12px"><strong>Notes:</strong> ${invoice.notes}</div>` : ""}
  </body></html>`;

  const win = window.open("", "_blank");
  if (!win) { toast.error("Please allow popups to print"); return; }
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 300);
}

// ─── InvoiceStatusBadge ─────────────────────────────────────────────────────
function InvoiceStatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

// ─── CreateInvoiceDialog ─────────────────────────────────────────────────────
function CreateInvoiceDialog({ open, onClose, initialCustomerId = "" }) {
  const qc = useQueryClient();
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  // Sync state when dialog opens with a pre-filled customer
  useEffect(() => {
    if (open) {
      setCustomerId(initialCustomerId || "");
      setSelectedOrderIds([]);
    }
  }, [open, initialCustomerId]);

  const { data: customersRes } = useQuery({
    queryKey: ["customers-dropdown"],
    queryFn: () => getCustomers(1, 500, "", {}, "name", "asc"),
    enabled: open,
  });
  const customers = customersRes?.data || [];

  const { data: ordersRes, isLoading: ordersLoading } = useQuery({
    queryKey: ["delivered-orders", customerId],
    queryFn: () => getDeliveredOrdersForCustomer(customerId),
    enabled: !!customerId,
  });
  const deliveredOrders = ordersRes?.data || [];

  const mutation = useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      toast.success("Invoice created successfully");
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoices-stats"] });
      qc.invalidateQueries({ queryKey: ["dispatched-orders"] });
      handleClose();
    },
    onError: (err) => toast.error(err?.message || "Failed to create invoice"),
  });

  const handleClose = () => {
    setCustomerId("");
    setSelectedOrderIds([]);
    setDueDate("");
    setNotes("");
    onClose();
  };

  const toggleOrder = (id) =>
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const selectedTotal = deliveredOrders
    .filter((o) => selectedOrderIds.includes(o.id))
    .reduce((s, o) => s + orderTotal(o), 0);

  const handleSubmit = () => {
    if (!customerId) return toast.error("Please select a customer");
    if (!selectedOrderIds.length) return toast.error("Select at least one sale order");
    if (!dueDate) return toast.error("Please set a due date");
    mutation.mutate({ saleOrderIds: selectedOrderIds, dueDate, notes: notes || undefined });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" /> Create Invoice / Bill
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Customer <span className="text-red-500">*</span></Label>
            <Select value={customerId} onValueChange={(v) => { setCustomerId(v); setSelectedOrderIds([]); }}>
              <SelectTrigger><SelectValue placeholder="Select customer…" /></SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name} {c.shopName ? `(${c.shopName})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {customerId && (
            <div className="space-y-1">
              <Label>Delivered Orders (select to include) <span className="text-red-500">*</span></Label>
              {ordersLoading ? (
                <p className="text-sm text-muted-foreground py-2">Loading orders…</p>
              ) : deliveredOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No delivered un-billed orders for this customer.</p>
              ) : (
                <div className="border rounded-md divide-y max-h-56 overflow-y-auto">
                  {deliveredOrders.map((o) => (
                    <label key={o.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer">
                      <Checkbox
                        checked={selectedOrderIds.includes(o.id)}
                        onCheckedChange={() => toggleOrder(o.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm">{o.orderNo}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {o.lensProduct?.lens_name || "—"} · {o.coating?.name || "—"}
                        </span>
                        {o.orderDate && (
                          <span className="text-xs text-muted-foreground ml-2">
                            · {new Date(o.orderDate).toLocaleDateString("en-IN")}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-semibold shrink-0">{fmt(orderTotal(o))}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedOrderIds.length > 0 && (
            <div className="flex justify-between items-center bg-muted px-3 py-2 rounded-md text-sm font-medium">
              <span>{selectedOrderIds.length} order(s) selected</span>
              <span className="text-base font-bold">{fmt(selectedTotal)}</span>
            </div>
          )}

          <div className="space-y-1">
            <Label>Due Date <span className="text-red-500">*</span></Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label>Notes (optional)</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any remarks…" />
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? "Creating…" : "Create Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── RecordPaymentDialog ──────────────────────────────────────────────────────
function RecordPaymentDialog({ invoice, open, onClose }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");

  const remaining = invoice ? invoice.totalAmount - invoice.paidAmount : 0;

  const mutation = useMutation({
    mutationFn: ({ id, data }) => recordPayment(id, data),
    onSuccess: () => {
      toast.success("Payment recorded successfully");
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoice", invoice?.id] });
      handleClose();
    },
    onError: (err) => toast.error(err?.message || "Failed to record payment"),
  });

  const handleClose = () => {
    setAmount(""); setMethod("CASH"); setReferenceNo(""); setNotes("");
    onClose();
  };

  const handleSubmit = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (amt > remaining + 0.01) return toast.error(`Amount cannot exceed remaining balance ${fmt(remaining)}`);
    mutation.mutate({ id: invoice.id, data: { amount: amt, method, referenceNo: referenceNo || undefined, notes: notes || undefined } });
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" /> Record Payment — {invoice.invoiceNo}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 bg-muted p-3 rounded-md text-sm">
            <div><span className="text-muted-foreground">Total</span><p className="font-bold">{fmt(invoice.totalAmount)}</p></div>
            <div><span className="text-muted-foreground">Paid so far</span><p className="font-bold text-green-600">{fmt(invoice.paidAmount)}</p></div>
            <div className="col-span-2"><span className="text-muted-foreground">Remaining</span><p className="font-bold text-orange-600 text-lg">{fmt(remaining)}</p></div>
          </div>

          <div className="space-y-1">
            <Label>Amount (₹) <span className="text-red-500">*</span></Label>
            <Input type="number" min="0.01" step="0.01" value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Max ${fmt(remaining)}`} />
          </div>

          <div className="space-y-1">
            <Label>Payment Method <span className="text-red-500">*</span></Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m.replace("_", " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {["UPI", "CARD", "BANK_TRANSFER", "CHECK"].includes(method) && (
            <div className="space-y-1">
              <Label>Reference No.</Label>
              <Input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="Transaction / cheque number" />
            </div>
          )}

          <div className="space-y-1">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional remarks" />
          </div>

          {parseFloat(amount) >= remaining && remaining > 0 && (
            <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded p-2">
              ✓ This payment will fully settle the invoice and mark all linked sale orders as <strong>BILLED</strong>.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? "Recording…" : "Record Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── InvoiceDetailDialog ──────────────────────────────────────────────────────
function InvoiceDetailDialog({ invoiceId, open, onClose, onPay }) {
  const qc = useQueryClient();

  const { data: res, isLoading } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: () => getInvoiceById(invoiceId),
    enabled: open && !!invoiceId,
  });
  const invoice = res?.data;

  const issueMutation = useMutation({
    mutationFn: issueInvoice,
    onSuccess: () => {
      toast.success("Invoice issued");
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoice", invoiceId] });
    },
    onError: (err) => toast.error(err?.message || "Failed to issue invoice"),
  });

  const cancelMutation = useMutation({
    mutationFn: cancelInvoice,
    onSuccess: () => {
      toast.success("Invoice cancelled");
      qc.invalidateQueries({ queryKey: ["invoices"] });
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

        {isLoading && <p className="text-muted-foreground py-6 text-center">Loading invoice…</p>}

        {invoice && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground block">Customer</span><span className="font-medium">{invoice.customer?.name}</span></div>
              <div><span className="text-muted-foreground block">Due Date</span><span className="font-medium">{new Date(invoice.dueDate).toLocaleDateString("en-IN")}</span></div>
              <div><span className="text-muted-foreground block">Total Amount</span><span className="font-bold text-base">{fmt(invoice.totalAmount)}</span></div>
              <div><span className="text-muted-foreground block">Paid Amount</span><span className="font-bold text-base text-green-600">{fmt(invoice.paidAmount)}</span></div>
              {invoice.totalAmount - invoice.paidAmount > 0.01 && (
                <div className="col-span-2">
                  <span className="text-muted-foreground block">Outstanding</span>
                  <span className="font-bold text-base text-orange-600">{fmt(invoice.totalAmount - invoice.paidAmount)}</span>
                </div>
              )}
              {invoice.notes && <div className="col-span-2"><span className="text-muted-foreground block">Notes</span><span>{invoice.notes}</span></div>}
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">Linked Sale Orders ({invoice.saleOrders?.length})</h4>
              <div className="border rounded-md divide-y">
                {invoice.saleOrders?.map((o) => (
                  <div key={o.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div>
                      <span className="font-medium">{o.orderNo}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{o.lensProduct?.lens_name || "—"} · {o.coating?.name || "—"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{fmt(orderTotal(o))}</span>
                      <Badge variant={o.status === "BILLED" ? "default" : "secondary"} className="text-xs">
                        {o.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {invoice.payments?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Payment History</h4>
                <div className="border rounded-md divide-y">
                  {invoice.payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <div>
                        <span className="font-medium">{p.method.replace(/_/g, " ")}</span>
                        {p.referenceNo && <span className="text-muted-foreground ml-2">#{p.referenceNo}</span>}
                        {p.notes && <span className="text-muted-foreground ml-2">· {p.notes}</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-green-700">{fmt(p.amount)}</span>
                        <span className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString("en-IN")}</span>
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
              variant="outline" size="sm" className="gap-1.5"
              onClick={() => printInvoice(invoice)}
            >
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button
              variant="outline" size="sm" className="gap-1.5"
              onClick={() => shareInvoice(invoice)}
            >
              <Share2 className="h-4 w-4" /> Share
            </Button>
            {invoice.customer?.phone && (
              <Button
                variant="outline" size="sm" className="gap-1.5"
                onClick={() => whatsappShare(invoice)}
              >
                <MessageSquare className="h-4 w-4" /> WhatsApp
              </Button>
            )}
            {invoice.status === "DRAFT" && (
              <Button
                variant="outline" size="sm"
                className="border-blue-300 text-blue-700 hover:bg-blue-50"
                onClick={() => issueMutation.mutate(invoice.id)}
                disabled={issueMutation.isPending}
              >
                Issue Invoice
              </Button>
            )}
            {!["PAID", "CANCELLED"].includes(invoice.status) && (
              <>
                <Button
                  size="sm" className="gap-1.5"
                  onClick={() => { onClose(); onPay(invoice); }}
                >
                  <CreditCard className="h-3.5 w-3.5" /> Record Payment
                </Button>
                <Button
                  variant="outline" size="sm"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                  onClick={() => cancelMutation.mutate(invoice.id)}
                  disabled={cancelMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-1" /> Cancel
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Share helpers ────────────────────────────────────────────────────────────
async function shareInvoice(invoice) {
  const remaining = invoice.totalAmount - invoice.paidAmount;
  const orderNos = invoice.saleOrders?.map((o) => o.orderNo).join(", ") || "—";
  const text = [
    `Invoice: ${invoice.invoiceNo}`,
    `Customer: ${invoice.customer?.name || "—"}`,
    `Amount: ${fmt(invoice.totalAmount)}`,
    `Paid: ${fmt(invoice.paidAmount)}`,
    ...(remaining > 0.01 ? [`Outstanding: ${fmt(remaining)}`] : []),
    `Due Date: ${new Date(invoice.dueDate).toLocaleDateString("en-IN")}`,
    `Orders: ${orderNos}`,
    `Status: ${STATUS_CONFIG[invoice.status]?.label || invoice.status}`,
  ].join("\n");

  if (navigator.share) {
    try {
      await navigator.share({ title: `Invoice ${invoice.invoiceNo}`, text });
      return;
    } catch (_) { /* user cancelled or not supported */ }
  }
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Invoice details copied to clipboard");
  } catch (_) {
    toast.error("Could not copy to clipboard");
  }
}

function whatsappShare(invoice) {
  const remaining = invoice.totalAmount - invoice.paidAmount;
  const orderNos = invoice.saleOrders?.map((o) => o.orderNo).join(", ") || "—";
  const text = [
    `*Invoice: ${invoice.invoiceNo}*`,
    `Customer: ${invoice.customer?.name || "—"}`,
    `Amount: ${fmt(invoice.totalAmount)}`,
    `Paid: ${fmt(invoice.paidAmount)}`,
    ...(remaining > 0.01 ? [`*Outstanding: ${fmt(remaining)}*`] : []),
    `Due Date: ${new Date(invoice.dueDate).toLocaleDateString("en-IN")}`,
    `Orders: ${orderNos}`,
  ].join("\n");

  const phone = invoice.customer?.phone?.replace(/\D/g, "") || "";
  const url = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

// ─── DispatchedOrdersTab ──────────────────────────────────────────────────────
function DispatchedOrdersTab({ onBillCustomer }) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data: res, isLoading } = useQuery({
    queryKey: ["dispatched-orders", { search, page }],
    queryFn: () => getDispatchedOrders({ search: search || undefined, page, limit: 20 }),
    placeholderData: keepPreviousData,
  });

  const orders = res?.data || [];
  const pagination = res?.pagination;

  const handleSearch = () => { setSearch(searchInput); setPage(1); };
  const handleClear = () => { setSearch(""); setSearchInput(""); setPage(1); };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="flex gap-1 flex-1 min-w-[240px]">
          <Input
            placeholder="Search order no. or customer…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="h-9"
          />
          <Button size="sm" onClick={handleSearch} className="h-9 px-3">
            <Search className="h-4 w-4" />
          </Button>
        </div>
        {search && (
          <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={handleClear}>
            Clear
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-center py-10">Loading dispatched orders…</p>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-3">
            <PackageCheck className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground font-medium">
              {search ? "No dispatched orders match your search." : "No dispatched orders waiting to be billed."}
            </p>
            <p className="text-sm text-muted-foreground">
              Orders in <strong>DELIVERED</strong> status that are not yet invoiced appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order No.</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Product / Coating</TableHead>
                  <TableHead>Dispatch Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.orderNo}</TableCell>
                    <TableCell>
                      <div className="font-medium">{o.customer?.name || "—"}</div>
                      {o.customer?.code && (
                        <div className="text-xs text-muted-foreground">{o.customer.code}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{o.lensProduct?.lens_name || "—"}</div>
                      {o.coating?.name && (
                        <div className="text-xs text-muted-foreground">{o.coating.name}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {o.orderDate
                        ? new Date(o.orderDate).toLocaleDateString("en-IN")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {fmt(orderTotal(o))}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={() => onBillCustomer(String(o.customer?.id))}
                      >
                        <Receipt className="h-3.5 w-3.5" /> Create Bill
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination?.totalPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <p className="text-sm text-muted-foreground">
                Page {page} of {pagination.totalPages} · {pagination.total} total
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline" size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline" size="sm"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main Billing Page ────────────────────────────────────────────────────────
export default function Billing() {
  const [activeTab, setActiveTab] = useState("dispatched");
  const [createOpen, setCreateOpen] = useState(false);
  const [createForCustomer, setCreateForCustomer] = useState("");
  const [detailId, setDetailId] = useState(null);
  const [paymentInvoice, setPaymentInvoice] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const queryParams = {
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    search: search || undefined,
    page,
    limit: PAGE_SIZE,
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
  };

  const { data: res, isLoading } = useQuery({
    queryKey: ["invoices", queryParams],
    queryFn: () => getInvoices(queryParams),
    placeholderData: keepPreviousData,
  });

  const invoices = res?.data || [];
  const pagination = res?.pagination;
  const totalPages = pagination?.totalPages || 1;

  // Summary stats — unbounded query so stats don't change with page/filter
  const { data: statsRes } = useQuery({
    queryKey: ["invoices-stats"],
    queryFn: () => getInvoices({ limit: 1000 }),
    staleTime: 30_000,
  });
  const allInvoices = statsRes?.data || [];
  const stats = {
    total: statsRes?.pagination?.total || 0,
    pending: allInvoices.filter((i) => ["DRAFT", "ISSUED", "PARTIALLY_PAID"].includes(i.status)).length,
    paid: allInvoices.filter((i) => i.status === "PAID").length,
    outstanding: allInvoices
      .filter((i) => i.status !== "CANCELLED")
      .reduce((s, i) => s + Math.max(0, i.totalAmount - i.paidAmount), 0),
  };

  const handleSearch = () => { setSearch(searchInput); setPage(1); };
  const handleClearFilters = () => {
    setSearch(""); setSearchInput(""); setStatusFilter("ALL");
    setStartDate(""); setEndDate(""); setPage(1);
  };
  const hasActiveFilters = search || statusFilter !== "ALL" || startDate || endDate;

  return (
    <div className="p-6 space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Billing</h1>
          <p className="text-muted-foreground mt-1">
            Combine delivered orders into invoices · collect payments · mark as Billed
          </p>
        </div>
        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Create Invoice
        </Button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: <Receipt className="h-5 w-5 text-blue-500" />,       label: "Total Invoices",   value: stats.total },
          { icon: <Clock className="h-5 w-5 text-yellow-500" />,       label: "Pending Payment",  value: stats.pending },
          { icon: <CheckCircle2 className="h-5 w-5 text-green-500" />, label: "Paid",             value: stats.paid },
          { icon: <AlertCircle className="h-5 w-5 text-orange-500" />, label: "Outstanding (₹)", value: stats.outstanding.toLocaleString("en-IN", { maximumFractionDigits: 0 }) },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 flex items-center gap-3">
              {s.icon}
              <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dispatched" className="gap-1.5">
            <PackageCheck className="h-4 w-4" /> Dispatched Orders
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1.5">
            <Receipt className="h-4 w-4" /> Invoices
          </TabsTrigger>
        </TabsList>

        {/* ── Dispatched Orders ── */}
        <TabsContent value="dispatched" className="mt-4">
          <DispatchedOrdersTab
            onBillCustomer={(customerId) => {
              setCreateForCustomer(customerId);
              setCreateOpen(true);
            }}
          />
        </TabsContent>

        {/* ── Invoices ── */}
        <TabsContent value="invoices" className="mt-4 space-y-4">
          {/* Filters */}
          <div className="space-y-2">
            <div className="flex gap-2 flex-wrap items-center">
              <div className="flex gap-1 flex-1 min-w-[240px]">
                <Input
                  placeholder="Search invoice no. or customer…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="h-9"
                />
                <Button size="sm" onClick={handleSearch} className="h-9 px-3">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline" size="sm" className="h-9 gap-1.5"
                onClick={() => setShowFilters((f) => !f)}
              >
                <Filter className="h-3.5 w-3.5" /> Date Filter
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={handleClearFilters}>
                  Clear filters
                </Button>
              )}
            </div>

            {showFilters && (
              <div className="flex gap-3 flex-wrap items-end bg-muted/40 p-3 rounded-md">
                <div className="space-y-1">
                  <Label className="text-xs">From Date</Label>
                  <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} className="h-8 w-40" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">To Date</Label>
                  <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} className="h-8 w-40" />
                </div>
              </div>
            )}
          </div>

          {/* Invoice List */}
          {isLoading ? (
            <p className="text-muted-foreground text-center py-10">Loading invoices…</p>
          ) : invoices.length === 0 ? (
            <Card>
              <CardContent className="py-16 flex flex-col items-center gap-3">
                <Receipt className="h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  {hasActiveFilters
                    ? "No invoices match your filters."
                    : "No invoices found. Create one from delivered sale orders."}
                </p>
                {!hasActiveFilters && (
                  <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Create Invoice
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {invoices.map((inv) => {
                  const remaining = inv.totalAmount - inv.paidAmount;
                  const pct = inv.totalAmount > 0 ? Math.min(100, (inv.paidAmount / inv.totalAmount) * 100) : 0;
                  return (
                    <Card key={inv.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <CardTitle className="text-base">{inv.invoiceNo}</CardTitle>
                            <p className="text-sm text-muted-foreground mt-0.5">{inv.customer?.name}</p>
                            {inv.customer?.code && (
                              <p className="text-xs text-muted-foreground">{inv.customer.code}</p>
                            )}
                          </div>
                          <InvoiceStatusBadge status={inv.status} />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-x-4 text-sm">
                          <div><span className="text-muted-foreground">Total</span><p className="font-semibold">{fmt(inv.totalAmount)}</p></div>
                          <div><span className="text-muted-foreground">Paid</span><p className="font-semibold text-green-600">{fmt(inv.paidAmount)}</p></div>
                          {remaining > 0.01 && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Outstanding</span>
                              <p className="font-bold text-orange-600">{fmt(remaining)}</p>
                            </div>
                          )}
                        </div>

                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{inv._count?.saleOrders || 0} orders</span>
                          <span>Due {new Date(inv.dueDate).toLocaleDateString("en-IN")}</span>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => setDetailId(inv.id)}>
                            <Eye className="h-3.5 w-3.5" /> View
                          </Button>
                          {!["PAID", "CANCELLED"].includes(inv.status) && (
                            <Button size="sm" className="flex-1 gap-1" onClick={() => setPaymentInvoice(inv)}>
                              <CreditCard className="h-3.5 w-3.5" /> Pay
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                    {pagination?.total ? ` · ${pagination.total} total` : ""}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline" size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ── */}
      <CreateInvoiceDialog
        open={createOpen}
        onClose={() => { setCreateOpen(false); setCreateForCustomer(""); }}
        initialCustomerId={createForCustomer}
      />
      <InvoiceDetailDialog
        invoiceId={detailId}
        open={!!detailId}
        onClose={() => setDetailId(null)}
        onPay={(inv) => setPaymentInvoice(inv)}
      />
      <RecordPaymentDialog
        invoice={paymentInvoice}
        open={!!paymentInvoice}
        onClose={() => setPaymentInvoice(null)}
      />
    </div>
  );
}
