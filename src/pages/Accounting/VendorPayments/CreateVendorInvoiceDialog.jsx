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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormSelect } from "@/components/ui/form-select";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/contexts/CompanyContext";
import { getGstRatesFromSettings, gstRatesToSelectOptions } from "@/utils/gstRates";
import { createVendorInvoice } from "@/services/vendorInvoice";
import { getOutstandingPOs } from "@/services/vendorPayment";

function fmt(n) {
  return `₹${parseFloat(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

function round2(n) {
  return Math.round(parseFloat(n || 0) * 100) / 100;
}

const emptyForm = {
  vendorId: "",
  supplierInvoiceNo: "",
  invoiceDate: new Date().toISOString().split("T")[0],
  notes: "",
};

const emptyPoLine = () => ({ subtotalAmount: "", gstPercent: "", taxAmount: "" });

/**
 * Register a Vendor Invoice against one or more POs (M5, invoice-first workflow).
 * This captures the actual supplier invoice amounts up-front; payment against the
 * resulting outstanding VendorInvoice happens as a separate later step.
 */
export default function CreateVendorInvoiceDialog({ open, onOpenChange, vendors = [], onCreated }) {
  const { toast } = useToast();
  const { company } = useCompany();
  const gstRateOptions = gstRatesToSelectOptions(getGstRatesFromSettings(company));
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [outstandingPOs, setOutstandingPOs] = useState([]);
  const [loadingPOs, setLoadingPOs] = useState(false);
  const [selectedPoIds, setSelectedPoIds] = useState([]);
  const [poLines, setPoLines] = useState({});
  const [invoiceFile, setInvoiceFile] = useState(null);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm);
    setSelectedPoIds([]);
    setPoLines({});
    setInvoiceFile(null);
  }, [open]);

  useEffect(() => {
    if (!form.vendorId) {
      setOutstandingPOs([]);
      return;
    }
    setLoadingPOs(true);
    getOutstandingPOs(form.vendorId)
      .then((res) => {
        const pos = (res.data?.purchaseOrders || []).map((po) => ({
          id: po.purchaseOrderId,
          poNumber: po.poNumber,
          orderDate: po.orderDate,
          expectedDeliveryDate: po.expectedDeliveryDate,
          totalValue: po.totalValue,
          needsPricing: po.needsPricing,
        }));
        setOutstandingPOs(pos);
      })
      .catch(() => {
        toast({ variant: "destructive", title: "Failed to load purchase orders" });
      })
      .finally(() => setLoadingPOs(false));
  }, [form.vendorId]);

  const selectedPOs = useMemo(
    () => outstandingPOs.filter((po) => selectedPoIds.includes(po.id)),
    [outstandingPOs, selectedPoIds]
  );

  useEffect(() => {
    setPoLines((prev) => {
      const next = {};
      for (const po of selectedPOs) next[po.id] = prev[po.id] || emptyPoLine();
      return next;
    });
  }, [selectedPOs]);

  const togglePo = (id) => {
    setSelectedPoIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const updatePoLine = (poId, field, value) => {
    setPoLines((prev) => {
      const line = { ...(prev[poId] || emptyPoLine()), [field]: value };
      if (field === "subtotalAmount" || field === "gstPercent") {
        const sub = parseFloat(field === "subtotalAmount" ? value : line.subtotalAmount) || 0;
        const pct = field === "gstPercent" ? parseFloat(value) : parseFloat(line.gstPercent);
        const tax = Number.isFinite(pct) && pct >= 0 ? round2((sub * pct) / 100) : parseFloat(line.taxAmount) || 0;
        line.taxAmount = tax >= 0 ? String(tax) : line.taxAmount;
      }
      return { ...prev, [poId]: line };
    });
  };

  const totals = useMemo(() => {
    let subtotal = 0;
    let tax = 0;
    for (const po of selectedPOs) {
      const line = poLines[po.id] || {};
      subtotal += parseFloat(line.subtotalAmount) || 0;
      tax += parseFloat(line.taxAmount) || 0;
    }
    return { subtotal: round2(subtotal), tax: round2(tax), total: round2(subtotal + tax) };
  }, [selectedPOs, poLines]);

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

  const handleSave = async () => {
    if (!form.vendorId) {
      toast({ variant: "destructive", title: "Please select a vendor" });
      return;
    }
    if (!form.supplierInvoiceNo?.trim()) {
      toast({ variant: "destructive", title: "Supplier invoice number is required" });
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
    if (totals.total <= 0) {
      toast({ variant: "destructive", title: "Invoice total must be greater than zero" });
      return;
    }

    const items = selectedPOs.map((po) => {
      const line = poLines[po.id] || {};
      return {
        purchaseOrderId: po.id,
        subtotalAmount: round2(line.subtotalAmount),
        taxAmount: round2(line.taxAmount),
      };
    });

    setSaving(true);
    try {
      const res = await createVendorInvoice(
        {
          vendorId: parseInt(form.vendorId, 10),
          supplierInvoiceNo: form.supplierInvoiceNo.trim(),
          invoiceDate: form.invoiceDate,
          notes: form.notes || undefined,
          items,
        },
        invoiceFile
      );
      if (res.success) {
        toast({ title: "Vendor invoice registered", description: res.data?.invoiceNumber });
        onOpenChange(false);
        onCreated?.();
      }
    } catch (e) {
      toast({ variant: "destructive", title: e?.message || e?.error?.message || "Failed to register invoice" });
    } finally {
      setSaving(false);
    }
  };

  const vendorOptions = vendors.map((v) => ({ id: v.id, name: v.name }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[75vw] !max-w-[75vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Register Vendor Invoice</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>
              Vendor <span className="text-red-500">*</span>
            </Label>
            <FormSelect
              options={vendorOptions}
              value={form.vendorId || null}
              onChange={(val) => {
                set("vendorId", val != null && val !== "" ? String(val) : "");
                setSelectedPoIds([]);
              }}
              placeholder="Search vendor..."
              isSearchable
              isClearable
              menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
              menuPosition="fixed"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>
                Supplier Invoice No. <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.supplierInvoiceNo}
                onChange={(e) => set("supplierInvoiceNo", e.target.value)}
                placeholder="Invoice number from vendor"
              />
            </div>
            <div className="space-y-1">
              <Label>
                Invoice Date <span className="text-red-500">*</span>
              </Label>
              <Input type="date" value={form.invoiceDate} onChange={(e) => set("invoiceDate", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>
              Vendor Invoice Copy <span className="text-red-500">*</span> (PDF or image)
            </Label>
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
              <Button type="button" variant="outline" className="w-full gap-2" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4" /> Upload invoice copy
              </Button>
            )}
          </div>

          {form.vendorId && (
            <div className="space-y-2">
              <Label>
                Purchase Orders <span className="text-red-500">*</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                Select the PO(s) this invoice covers, then enter subtotal + GST per PO from the vendor invoice.
              </p>
              {loadingPOs ? (
                <p className="text-xs text-muted-foreground py-2">Loading purchase orders...</p>
              ) : outstandingPOs.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No eligible purchase orders for this vendor.</p>
              ) : (
                <div className="border rounded-md divide-y text-xs overflow-x-auto">
                  <div className="grid grid-cols-[2rem_1fr_repeat(3,6.5rem)] gap-2 px-3 py-2 bg-muted/40 font-medium text-muted-foreground min-w-[36rem]">
                    <span />
                    <span>PO Number</span>
                    <span className="text-right">Subtotal</span>
                    <span className="text-right">GST %</span>
                    <span className="text-right">GST Amt</span>
                  </div>
                  {outstandingPOs.map((po) => {
                    const selected = selectedPoIds.includes(po.id);
                    const line = poLines[po.id] || emptyPoLine();
                    return (
                      <div
                        key={po.id}
                        className={`grid grid-cols-[2rem_1fr_repeat(3,6.5rem)] gap-2 items-center px-3 py-2 min-w-[36rem] ${selected ? "bg-primary/5" : ""}`}
                      >
                        <input type="checkbox" checked={selected} onChange={() => togglePo(po.id)} className="h-4 w-4" />
                        <div>
                          <p className="font-medium">{po.poNumber}</p>
                          <p className="text-muted-foreground">
                            {po.orderDate ? new Date(po.orderDate).toLocaleDateString("en-IN") : "—"}
                          </p>
                        </div>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="h-7 text-xs text-right"
                          value={line.subtotalAmount}
                          onChange={(e) => updatePoLine(po.id, "subtotalAmount", e.target.value)}
                          disabled={!selected}
                          placeholder="0.00"
                        />
                        <Select
                          value={line.gstPercent !== "" ? String(line.gstPercent) : undefined}
                          onValueChange={(v) => updatePoLine(po.id, "gstPercent", v)}
                          disabled={!selected}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder="%" />
                          </SelectTrigger>
                          <SelectContent>
                            {gstRateOptions.map((opt) => (
                              <SelectItem key={opt.id} value={String(opt.value)}>
                                {opt.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-right font-mono pr-1">{line.taxAmount !== "" ? fmt(line.taxAmount) : "—"}</span>
                      </div>
                    );
                  })}
                  <div className="grid grid-cols-[2rem_1fr_repeat(3,6.5rem)] gap-2 px-3 py-2 bg-muted/20 font-semibold min-w-[36rem]">
                    <span />
                    <span>Invoice Totals</span>
                    <span className="text-right font-mono">{fmt(totals.subtotal)}</span>
                    <span />
                    <span className="text-right font-mono">{fmt(totals.tax)}</span>
                  </div>
                  <div className="px-3 py-2 text-right font-semibold text-sm">
                    Invoice Total: {fmt(totals.total)}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="Optional notes" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !selectedPOs.length || !invoiceFile || totals.total <= 0}>
            {saving ? "Registering..." : `Register Invoice ${totals.total > 0 ? fmt(totals.total) : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
