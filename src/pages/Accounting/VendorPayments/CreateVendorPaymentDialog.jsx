import { useState, useEffect, useMemo, useRef } from "react";
import { FileText, Upload, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormSelect } from "@/components/ui/form-select";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/contexts/CompanyContext";
import { getGstRatesFromSettings, gstRatesToSelectOptions } from "@/utils/gstRates";
import { createVendorPayment, getOutstandingPOs } from "@/services/vendorPayment";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, emptyPaymentForm } from "./VendorPayments.constants";

const paymentMethodOptions = PAYMENT_METHODS.map((m) => ({
  id: m,
  name: PAYMENT_METHOD_LABELS[m],
}));

function fmt(n) {
  return `₹${parseFloat(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

function round2(n) {
  return Math.round(parseFloat(n || 0) * 100) / 100;
}

const emptyPoLine = () => ({
  subtotalAmount: "",
  gstPercent: "",
  taxAmount: "",
  allocatedAmount: "",
});

export default function CreateVendorPaymentDialog({
  open,
  onOpenChange,
  vendors,
  bankLedgers,
  preselectedVendorId = "",
  preselectedPoIds = [],
  preselectedPOs = [],
  onCreated,
}) {
  const { toast } = useToast();
  const { company } = useCompany();
  const gstRateOptions = gstRatesToSelectOptions(getGstRatesFromSettings(company));
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({ ...emptyPaymentForm, gstPercent: "" });
  const [saving, setSaving] = useState(false);
  const [outstandingPOs, setOutstandingPOs] = useState([]);
  const [loadingPOs, setLoadingPOs] = useState(false);
  const [poLines, setPoLines] = useState({});
  const [invoiceFile, setInvoiceFile] = useState(null);

  const lockedVendor = !!preselectedVendorId;

  // Primary PO selection is OutstandingPOsQueue List UI — dialog only uses preselected POs
  const selectedPOs = useMemo(() => {
    if (preselectedPOs.length && preselectedPoIds.length) {
      return preselectedPOs.filter((po) =>
        preselectedPoIds.includes(po.purchaseOrderId ?? po.id)
      );
    }
    if (preselectedPoIds.length) {
      return outstandingPOs.filter((po) => preselectedPoIds.includes(po.id));
    }
    return [];
  }, [preselectedPOs, preselectedPoIds, outstandingPOs]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  useEffect(() => {
    if (!open) return;
    setForm({
      ...emptyPaymentForm,
      gstPercent: "",
      vendorId: preselectedVendorId ? String(preselectedVendorId) : "",
      paymentDate: new Date().toISOString().split("T")[0],
    });
    setPoLines({});
    setInvoiceFile(null);
  }, [open, preselectedVendorId]);

  useEffect(() => {
    const vid = form.vendorId || preselectedVendorId;
    if (!vid) {
      setOutstandingPOs([]);
      return;
    }
    setLoadingPOs(true);
    getOutstandingPOs(vid)
      .then((res) => {
        const pos = (res.data?.purchaseOrders || [])
          .filter((po) => parseFloat(po.outstanding || 0) > 0 || po.needsPricing)
          .map((po) => ({
            id: po.purchaseOrderId,
            purchaseOrderId: po.purchaseOrderId,
            poNumber: po.poNumber,
            orderDate: po.orderDate,
            expectedDeliveryDate: po.expectedDeliveryDate,
            outstanding: parseFloat(po.outstanding),
            totalValue: po.totalValue,
            paidAmount: po.paidAmount,
            status: po.status,
            needsPricing: po.needsPricing,
          }));
        setOutstandingPOs(pos);
      })
      .catch(() => {
        toast({ variant: "destructive", title: "Failed to load outstanding POs" });
      })
      .finally(() => setLoadingPOs(false));
  }, [form.vendorId, preselectedVendorId]);

  useEffect(() => {
    if (!selectedPOs.length) return;
    setPoLines((prev) => {
      const next = { ...prev };
      for (const po of selectedPOs) {
        const id = po.id ?? po.purchaseOrderId;
        if (!next[id]) next[id] = emptyPoLine();
      }
      return next;
    });
  }, [selectedPOs]);

  const updatePoLine = (poId, field, value) => {
    setPoLines((prev) => {
      const line = { ...(prev[poId] || emptyPoLine()), [field]: value };
      if (field === "subtotalAmount" || field === "gstPercent" || field === "taxAmount") {
        const sub = parseFloat(field === "subtotalAmount" ? value : line.subtotalAmount) || 0;
        const pct =
          field === "gstPercent"
            ? parseFloat(value)
            : parseFloat(line.gstPercent);
        if (field === "subtotalAmount" || field === "gstPercent") {
          const tax =
            Number.isFinite(pct) && pct >= 0 ? round2((sub * pct) / 100) : parseFloat(line.taxAmount) || 0;
          line.taxAmount = tax > 0 || (Number.isFinite(pct) && pct === 0) ? String(tax) : line.taxAmount;
        }
        const tax = parseFloat(line.taxAmount) || 0;
        if (field !== "allocatedAmount") {
          line.allocatedAmount = sub + tax > 0 ? String(round2(sub + tax)) : "";
        }
      }
      return { ...prev, [poId]: line };
    });
  };

  // Header GST % → recompute taxAmount from subtotal
  useEffect(() => {
    const sub = parseFloat(form.subtotalAmount) || 0;
    const pct = parseFloat(form.gstPercent);
    if (!Number.isFinite(pct) || form.gstPercent === "") return;
    const tax = round2((sub * pct) / 100);
    setForm((f) => (String(f.taxAmount) === String(tax) ? f : { ...f, taxAmount: String(tax) }));
  }, [form.subtotalAmount, form.gstPercent]);

  const poTotals = useMemo(() => {
    let subtotal = 0;
    let tax = 0;
    let allocated = 0;
    for (const po of selectedPOs) {
      const id = po.id ?? po.purchaseOrderId;
      const line = poLines[id] || {};
      subtotal += parseFloat(line.subtotalAmount) || 0;
      tax += parseFloat(line.taxAmount) || 0;
      allocated += parseFloat(line.allocatedAmount) || 0;
    }
    return {
      subtotal: round2(subtotal),
      tax: round2(tax),
      allocated: round2(allocated),
      invoiceTotal: round2(subtotal + tax),
    };
  }, [selectedPOs, poLines]);

  const invoiceTotal = useMemo(() => {
    const sub = parseFloat(form.subtotalAmount) || 0;
    const tax = parseFloat(form.taxAmount) || 0;
    return round2(sub + tax);
  }, [form.subtotalAmount, form.taxAmount]);

  const handleInvoiceFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast({ variant: "destructive", title: "Only PDF or image files are allowed" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File must be under 10 MB" });
      return;
    }
    setInvoiceFile(file);
  };

  const syncTotalsFromPoLines = () => {
    setForm((f) => ({
      ...f,
      subtotalAmount: poTotals.subtotal ? String(poTotals.subtotal) : "",
      taxAmount: poTotals.tax ? String(poTotals.tax) : "",
    }));
  };

  const handleSave = async () => {
    if (!form.vendorId) {
      toast({ variant: "destructive", title: "Please select a vendor" });
      return;
    }
    if (!form.bankLedgerId) {
      toast({ variant: "destructive", title: "Please select a payment account" });
      return;
    }
    if (!form.vendorInvoiceNo?.trim()) {
      toast({ variant: "destructive", title: "Vendor invoice number is required" });
      return;
    }
    if (!invoiceFile) {
      toast({ variant: "destructive", title: "Please upload the vendor invoice copy" });
      return;
    }
    if (!selectedPOs.length) {
      toast({ variant: "destructive", title: "Select at least one purchase order" });
      return;
    }

    const subtotal = round2(form.subtotalAmount || poTotals.subtotal);
    const tax = round2(form.taxAmount || poTotals.tax);
    const total = invoiceTotal;

    if (total <= 0) {
      toast({ variant: "destructive", title: "Invoice total must be greater than zero" });
      return;
    }
    if (Math.abs(poTotals.subtotal - subtotal) > 0.01 || Math.abs(poTotals.tax - tax) > 0.01) {
      toast({
        variant: "destructive",
        title: "PO line subtotals/GST must match invoice totals",
      });
      return;
    }
    if (Math.abs(poTotals.allocated - total) > 0.01) {
      toast({
        variant: "destructive",
        title: "Sum of PO payment amounts must equal total payment",
      });
      return;
    }

    const items = selectedPOs.map((po) => {
      const id = po.id ?? po.purchaseOrderId;
      const line = poLines[id] || {};
      return {
        purchaseOrderId: id,
        subtotalAmount: round2(line.subtotalAmount),
        taxAmount: round2(line.taxAmount),
        allocatedAmount: round2(line.allocatedAmount),
      };
    });

    setSaving(true);
    try {
      await createVendorPayment(
        {
          vendorId: parseInt(form.vendorId),
          bankLedgerId: parseInt(form.bankLedgerId),
          paymentDate: form.paymentDate,
          paymentMethod: form.paymentMethod,
          referenceNo: form.referenceNumber || undefined,
          vendorInvoiceNo: form.vendorInvoiceNo.trim(),
          notes: form.notes || undefined,
          subtotalAmount: subtotal,
          taxAmount: tax,
          totalAmount: total,
          items,
        },
        invoiceFile
      );
      toast({ title: "Payment voucher created" });
      setForm(emptyPaymentForm);
      setPoLines({});
      setInvoiceFile(null);
      onCreated?.();
      onOpenChange(false);
    } catch (e) {
      toast({
        variant: "destructive",
        title: e?.message || e?.error?.message || "Failed to record payment",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setForm(emptyPaymentForm);
    setPoLines({});
    setInvoiceFile(null);
    setOutstandingPOs([]);
    onOpenChange(false);
  };

  const vendorOptions = vendors.map((v) => ({ id: v.id, name: v.name }));
  const bankLedgerOptions = bankLedgers.map((l) => ({ id: l.id, name: l.ledgerName }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[80vw] !max-w-[80vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Vendor Payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Vendor <span className="text-red-500">*</span></Label>
            <FormSelect
              options={vendorOptions}
              value={form.vendorId || null}
              onChange={(val) => set("vendorId", val != null && val !== "" ? String(val) : "")}
              placeholder="Search vendor..."
              isSearchable
              isClearable={!lockedVendor}
              disabled={lockedVendor}
              menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
              menuPosition="fixed"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Vendor Invoice No. <span className="text-red-500">*</span></Label>
              <Input
                value={form.vendorInvoiceNo}
                onChange={(e) => set("vendorInvoiceNo", e.target.value)}
                placeholder="Invoice number from vendor"
              />
            </div>
            <div className="space-y-1">
              <Label>Payment Date <span className="text-red-500">*</span></Label>
              <Input
                type="date"
                value={form.paymentDate}
                onChange={(e) => set("paymentDate", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Vendor Invoice Copy <span className="text-red-500">*</span> (PDF or image)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleInvoiceFile}
            />
            {invoiceFile ? (
              <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate flex-1">{invoiceFile.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => {
                    setInvoiceFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" /> Upload invoice copy
              </Button>
            )}
          </div>

          <div className="rounded-md border bg-muted/20 p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm font-semibold">Invoice Amounts (from vendor invoice)</Label>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={syncTotalsFromPoLines}>
                Sync from PO lines
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Subtotal</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.subtotalAmount}
                  onChange={(e) => set("subtotalAmount", e.target.value)}
                  placeholder="Before GST"
                />
              </div>
              <div className="space-y-1">
                <FormSelect
                  label="GST %"
                  name="gstPercent"
                  options={gstRateOptions}
                  value={form.gstPercent}
                  onChange={(value) => set("gstPercent", value != null ? String(value) : "")}
                  placeholder="Select GST rate"
                  isSearchable={false}
                  isClearable
                  singleLine
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">GST Amount</Label>
                <Input
                  type="text"
                  readOnly
                  tabIndex={-1}
                  className="bg-muted"
                  value={form.taxAmount !== "" ? fmt(form.taxAmount) : "—"}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Total Payment</Label>
                <Input
                  type="text"
                  readOnly
                  tabIndex={-1}
                  className="bg-muted font-semibold"
                  value={invoiceTotal > 0 ? fmt(invoiceTotal) : "—"}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Payment Method <span className="text-red-500">*</span></Label>
              <FormSelect
                options={paymentMethodOptions}
                value={form.paymentMethod || null}
                onChange={(val) => set("paymentMethod", val ?? "")}
                placeholder="Select payment method"
                isSearchable={false}
                isClearable
                menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                menuPosition="fixed"
              />
            </div>
            <div className="space-y-1">
              <Label>Payment Account <span className="text-red-500">*</span></Label>
              <FormSelect
                options={bankLedgerOptions}
                value={form.bankLedgerId || null}
                onChange={(val) => set("bankLedgerId", val != null && val !== "" ? String(val) : "")}
                placeholder="Cash / Bank account"
                isSearchable
                isClearable
                menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                menuPosition="fixed"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Reference No.</Label>
            <Input
              value={form.referenceNumber}
              onChange={(e) => set("referenceNumber", e.target.value)}
              placeholder="Cheque / transaction ref"
            />
          </div>

          {(form.vendorId || preselectedVendorId) && (
            <div className="space-y-2">
              <Label>PO Invoice Breakdown <span className="text-red-500">*</span></Label>
              <p className="text-xs text-muted-foreground">
                Enter subtotal and GST per PO from the vendor invoice. These values are saved to the PO and used for payment tracking.
              </p>
              {loadingPOs ? (
                <p className="text-xs text-muted-foreground py-2">Loading purchase orders...</p>
              ) : selectedPOs.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  No purchase orders selected. Select POs from the Outstanding tab first.
                </p>
              ) : (
                <div className="border rounded-md divide-y text-xs overflow-x-auto">
                  <div className="grid grid-cols-[1fr_repeat(5,6.5rem)] gap-2 px-3 py-2 bg-muted/40 font-medium text-muted-foreground min-w-[42rem]">
                    <span>PO Number</span>
                    <span className="text-right">Subtotal</span>
                    <span className="text-right">GST %</span>
                    <span className="text-right">GST Amt</span>
                    <span className="text-right">PO Total</span>
                    <span className="text-right">Pay Now</span>
                  </div>
                  {selectedPOs.map((po) => {
                    const id = po.id ?? po.purchaseOrderId;
                    const line = poLines[id] || emptyPoLine();
                    const lineTotal = round2(
                      (parseFloat(line.subtotalAmount) || 0) + (parseFloat(line.taxAmount) || 0)
                    );
                    return (
                      <div
                        key={id}
                        className="grid grid-cols-[1fr_repeat(5,6.5rem)] gap-2 items-center px-3 py-2 min-w-[42rem]"
                      >
                        <div>
                          <p className="font-medium">{po.poNumber}</p>
                          <p className="text-muted-foreground">
                            {po.needsPricing
                              ? "Awaiting invoice values"
                              : `Outstanding ${fmt(po.outstanding)}`}
                          </p>
                        </div>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="h-7 text-xs text-right"
                          value={line.subtotalAmount}
                          onChange={(e) => updatePoLine(id, "subtotalAmount", e.target.value)}
                          placeholder="0.00"
                        />
                        <FormSelect
                          options={gstRateOptions}
                          value={line.gstPercent !== "" ? String(line.gstPercent) : null}
                          onChange={(val) => updatePoLine(id, "gstPercent", val != null ? String(val) : "")}
                          placeholder="%"
                          isSearchable={false}
                          isClearable
                          containerClassName="space-y-0"
                          className="h-7 text-xs"
                        />
                        <span className="text-right font-mono pr-1">
                          {line.taxAmount !== "" ? fmt(line.taxAmount) : "—"}
                        </span>
                        <span className="text-right font-mono pr-1">{fmt(lineTotal)}</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="h-7 text-xs text-right"
                          value={line.allocatedAmount}
                          onChange={(e) => updatePoLine(id, "allocatedAmount", e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                    );
                  })}
                  <div className="grid grid-cols-[1fr_repeat(5,6.5rem)] gap-2 px-3 py-2 bg-muted/20 font-semibold min-w-[42rem]">
                    <span>PO Totals</span>
                    <span className="text-right font-mono">{fmt(poTotals.subtotal)}</span>
                    <span />
                    <span className="text-right font-mono">{fmt(poTotals.tax)}</span>
                    <span className="text-right font-mono">{fmt(poTotals.invoiceTotal)}</span>
                    <span className="text-right font-mono">{fmt(poTotals.allocated)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
              placeholder="Optional notes"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !selectedPOs.length || !invoiceFile || invoiceTotal <= 0}
          >
            {saving ? "Creating voucher..." : `Create Voucher ${invoiceTotal > 0 ? fmt(invoiceTotal) : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
