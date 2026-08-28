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
import {
  createVendorInvoice,
  getEligiblePOsForVendorInvoice,
  getVendorInvoiceById,
  updateVendorInvoice,
} from "@/services/vendorInvoice";
import { vendorInvoiceCopyUrl } from "@/services/vendorPayment";

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

const emptyPoLine = () => ({ subtotalAmount: "", gstPercent: "", taxAmount: "", locked: false });

function gstPercentFromPo(subtotal, taxAmount) {
  const sub = parseFloat(subtotal) || 0;
  const tax = parseFloat(taxAmount);
  if (sub <= 0 || !Number.isFinite(tax) || tax < 0) return "";
  return String(Math.round((tax / sub) * 10000) / 100);
}

function poLineFromInvoiceItem(item) {
  const subtotal = parseFloat(item.subtotalAmount) || 0;
  const taxAmount = parseFloat(item.taxAmount) || 0;
  return {
    subtotalAmount: String(subtotal),
    gstPercent: gstPercentFromPo(subtotal, taxAmount),
    taxAmount: String(taxAmount),
    locked: false,
  };
}

function mapEligiblePo(po) {
  return {
    id: po.purchaseOrderId,
    poNumber: po.poNumber,
    orderDate: po.orderDate,
    receivedDate: po.receivedDate,
    expectedDeliveryDate: po.expectedDeliveryDate,
    subtotal: po.subtotal,
    taxAmount: po.taxAmount,
    totalValue: po.totalValue,
    needsPricing: !(parseFloat(po.subtotal) > 0),
    onInvoice: false,
  };
}

function mapInvoicePo(item) {
  const po = item.purchaseOrder || {};
  const subtotal = parseFloat(item.subtotalAmount) || parseFloat(po.subtotal) || 0;
  const taxAmount = parseFloat(item.taxAmount) || parseFloat(po.taxAmount) || 0;
  return {
    id: po.id,
    poNumber: po.poNumber,
    orderDate: po.orderDate,
    receivedDate: po.receivedDate,
    expectedDeliveryDate: po.expectedDeliveryDate,
    subtotal,
    taxAmount,
    totalValue: round2(subtotal + taxAmount),
    needsPricing: false,
    onInvoice: true,
  };
}

function poLineFromPo(po) {
  if (po.needsPricing) return emptyPoLine();
  const subtotal = parseFloat(po.subtotal) || 0;
  const taxAmount = parseFloat(po.taxAmount) || 0;
  if (subtotal <= 0) return emptyPoLine();
  return {
    subtotalAmount: String(subtotal),
    gstPercent: gstPercentFromPo(subtotal, taxAmount),
    taxAmount: String(taxAmount),
    locked: true,
  };
}

/**
 * Register a Vendor Invoice against one or more POs (M5, invoice-first workflow).
 * This captures the actual supplier invoice amounts up-front; payment against the
 * resulting outstanding VendorInvoice happens as a separate later step.
 */
export default function CreateVendorInvoiceDialog({
  open,
  onOpenChange,
  vendors = [],
  onCreated,
  initialVendorId,
  initialPoIds = [],
  invoiceId = null,
}) {
  const isEditMode = Boolean(invoiceId);
  const { toast } = useToast();
  const { company } = useCompany();
  const gstRateOptions = gstRatesToSelectOptions(getGstRatesFromSettings(company));
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [outstandingPOs, setOutstandingPOs] = useState([]);
  const [loadingPOs, setLoadingPOs] = useState(false);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [editable, setEditable] = useState(true);
  const [selectedPoIds, setSelectedPoIds] = useState([]);
  const [poLines, setPoLines] = useState({});
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [existingCopyPath, setExistingCopyPath] = useState(null);
  const [courierCharges, setCourierCharges] = useState("");
  const [receiveStartDate, setReceiveStartDate] = useState("");
  const [receiveEndDate, setReceiveEndDate] = useState("");
  const [showEligiblePicker, setShowEligiblePicker] = useState(false);
  const initialPoAppliedRef = useRef(false);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const vendorLocked = Boolean(initialVendorId) || isEditMode;
  const readOnly = isEditMode && !editable;
  const initialPoKey = (initialPoIds || []).join(",");

  useEffect(() => {
    if (!open) {
      initialPoAppliedRef.current = false;
      return;
    }
    if (isEditMode) return;
    setForm({
      ...emptyForm,
      vendorId: initialVendorId ? String(initialVendorId) : "",
    });
    setSelectedPoIds([]);
    setPoLines({});
    setInvoiceFile(null);
    setExistingCopyPath(null);
    setCourierCharges("");
    setReceiveStartDate("");
    setReceiveEndDate("");
    setShowEligiblePicker(false);
    setEditable(true);
  }, [open, initialVendorId, isEditMode]);

  useEffect(() => {
    if (!open || !isEditMode || !invoiceId) return;
    setLoadingInvoice(true);
    getVendorInvoiceById(invoiceId)
      .then((res) => {
        const inv = res.data;
        if (!inv) return;
        setEditable(inv.editable !== false);
        setForm({
          vendorId: String(inv.vendorId),
          supplierInvoiceNo: inv.supplierInvoiceNo || "",
          invoiceDate: inv.invoiceDate
            ? new Date(inv.invoiceDate).toISOString().split("T")[0]
            : emptyForm.invoiceDate,
          notes: inv.notes || "",
        });
        setCourierCharges(
          inv.courierCharges != null && inv.courierCharges !== "" ? String(inv.courierCharges) : ""
        );
        setExistingCopyPath(inv.invoiceCopyPath || null);
        setInvoiceFile(null);
        const rows = (inv.items || []).map(mapInvoicePo);
        setOutstandingPOs(rows);
        setSelectedPoIds(rows.map((r) => r.id));
        const lines = {};
        for (const item of inv.items || []) {
          lines[item.purchaseOrderId] = poLineFromInvoiceItem(item);
        }
        setPoLines(lines);
        setShowEligiblePicker(false);
        setReceiveStartDate("");
        setReceiveEndDate("");
      })
      .catch(() => {
        toast({ variant: "destructive", title: "Failed to load vendor bill" });
        onOpenChange(false);
      })
      .finally(() => setLoadingInvoice(false));
  }, [open, isEditMode, invoiceId, toast, onOpenChange]);

  useEffect(() => {
    if (!open || isEditMode || !form.vendorId) {
      if (!form.vendorId && !isEditMode) setOutstandingPOs([]);
      return;
    }
    setLoadingPOs(true);
    getEligiblePOsForVendorInvoice(form.vendorId, {
      receive_start_date: receiveStartDate,
      receive_end_date: receiveEndDate,
    })
      .then((res) => {
        const pos = (res.data?.purchaseOrders || []).map(mapEligiblePo);
        setOutstandingPOs(pos);
        const eligible = new Set(pos.map((p) => p.id));
        if (!initialPoAppliedRef.current && initialPoKey) {
          initialPoAppliedRef.current = true;
          setSelectedPoIds(
            initialPoKey
              .split(",")
              .map((id) => parseInt(id, 10))
              .filter((id) => eligible.has(id))
          );
        } else {
          setSelectedPoIds((prev) => prev.filter((id) => eligible.has(id)));
        }
      })
      .catch(() => {
        toast({ variant: "destructive", title: "Failed to load purchase orders" });
      })
      .finally(() => setLoadingPOs(false));
  }, [open, isEditMode, form.vendorId, receiveStartDate, receiveEndDate, initialPoKey, toast]);

  useEffect(() => {
    if (!open || !isEditMode || !showEligiblePicker || !form.vendorId) return;
    setLoadingPOs(true);
    getEligiblePOsForVendorInvoice(form.vendorId, {
      receive_start_date: receiveStartDate,
      receive_end_date: receiveEndDate,
    })
      .then((res) => {
        const eligible = (res.data?.purchaseOrders || []).map(mapEligiblePo);
        setOutstandingPOs((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const merged = [...prev];
          for (const po of eligible) {
            if (!existingIds.has(po.id)) merged.push(po);
          }
          return merged;
        });
      })
      .catch(() => {
        toast({ variant: "destructive", title: "Failed to load purchase orders" });
      })
      .finally(() => setLoadingPOs(false));
  }, [open, isEditMode, showEligiblePicker, form.vendorId, receiveStartDate, receiveEndDate, toast]);

  const selectedPOs = useMemo(
    () => outstandingPOs.filter((po) => selectedPoIds.includes(po.id)),
    [outstandingPOs, selectedPoIds]
  );

  useEffect(() => {
    setPoLines((prev) => {
      const next = {};
      for (const po of selectedPOs) {
        next[po.id] = prev[po.id] ?? poLineFromPo(po);
      }
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
    const courier = round2(parseFloat(courierCharges) || 0);
    const linesTotal = round2(subtotal + tax);
    return {
      subtotal: round2(subtotal),
      tax: round2(tax),
      courier,
      linesTotal,
      total: round2(linesTotal + courier),
    };
  }, [selectedPOs, poLines, courierCharges]);

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
    if (readOnly) return;
    if (!form.vendorId) {
      toast({ variant: "destructive", title: "Please select a vendor" });
      return;
    }
    if (!form.supplierInvoiceNo?.trim()) {
      toast({ variant: "destructive", title: "Supplier invoice number is required" });
      return;
    }
    if (!invoiceFile && !existingCopyPath) {
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

    for (const po of selectedPOs) {
      const line = poLines[po.id] || {};
      const sub = parseFloat(line.subtotalAmount) || 0;
      if (sub <= 0) {
        toast({
          variant: "destructive",
          title: `Enter subtotal and GST for PO ${po.poNumber}`,
        });
        return;
      }
      if (line.gstPercent === "" || line.gstPercent == null) {
        toast({
          variant: "destructive",
          title: `Select GST rate for PO ${po.poNumber}`,
        });
        return;
      }
    }

    if (totals.courier < 0) {
      toast({ variant: "destructive", title: "Courier charges cannot be negative" });
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
      const payload = {
        vendorId: parseInt(form.vendorId, 10),
        supplierInvoiceNo: form.supplierInvoiceNo.trim(),
        invoiceDate: form.invoiceDate,
        notes: form.notes || undefined,
        courierCharges: totals.courier,
        items,
      };
      const res = isEditMode
        ? await updateVendorInvoice(invoiceId, payload, invoiceFile)
        : await createVendorInvoice(payload, invoiceFile);
      if (res.success) {
        toast({
          title: isEditMode ? "Vendor bill updated" : "Vendor invoice registered",
          description: res.data?.invoiceNumber,
        });
        onOpenChange(false);
        onCreated?.();
      }
    } catch (e) {
      toast({
        variant: "destructive",
        title: e?.message || e?.error?.message || (isEditMode ? "Failed to update bill" : "Failed to register invoice"),
      });
    } finally {
      setSaving(false);
    }
  };

  const dialogTitle = isEditMode
    ? readOnly
      ? "View Vendor Bill"
      : "Edit Vendor Bill"
    : vendorLocked
      ? "Raise Vendor Bill"
      : "Register Vendor Invoice";

  const existingCopyUrl = vendorInvoiceCopyUrl(existingCopyPath);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!flex !flex-col !w-[75vw] !max-w-[75vw] !h-[88vh] !max-h-[88vh] overflow-hidden gap-0 p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-3 pr-12">
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        {loadingInvoice ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Loading bill...</div>
        ) : (
        <>
        <div className="min-h-0 flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,17.5rem)_minmax(0,1fr)] grid-rows-1 gap-0 overflow-hidden border-t">
          {/* Left — invoice details */}
          <div className="min-h-0 h-full overflow-y-auto space-y-4 px-4 py-4 border-b lg:border-b-0 lg:border-r">
            <FormSelect
              label="Vendor"
              name="vendorId"
              options={vendors}
              value={form.vendorId}
              onChange={(value) => {
                set("vendorId", value != null && value !== "" ? String(value) : "");
                setSelectedPoIds([]);
                initialPoAppliedRef.current = true;
              }}
              placeholder="Select vendor"
              isSearchable={true}
              isClearable={!vendorLocked}
              disabled={vendorLocked || readOnly}
              required
            />

            <div className="space-y-1">
              <Label>
                Supplier Invoice No. <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.supplierInvoiceNo}
                onChange={(e) => set("supplierInvoiceNo", e.target.value)}
                placeholder="Invoice number from vendor"
                disabled={readOnly}
              />
            </div>

            <div className="space-y-1">
              <Label>
                Invoice Date <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={form.invoiceDate}
                onChange={(e) => set("invoiceDate", e.target.value)}
                disabled={readOnly}
              />
            </div>

            <div className="space-y-1">
              <Label>
                Vendor Invoice Copy {!existingCopyPath && <span className="text-red-500">*</span>} (PDF or image)
              </Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleInvoiceFile}
                disabled={readOnly}
              />
              {invoiceFile ? (
                <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate flex-1">{invoiceFile.name}</span>
                  {!readOnly && (
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
                  )}
                </div>
              ) : existingCopyUrl ? (
                <div className="flex flex-col gap-2">
                  <Button type="button" variant="outline" className="w-full gap-2" asChild>
                    <a href={existingCopyUrl} target="_blank" rel="noopener noreferrer">
                      <FileText className="h-4 w-4" /> View current copy
                    </a>
                  </Button>
                  {!readOnly && (
                    <Button type="button" variant="outline" className="w-full gap-2" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-4 w-4" /> Replace invoice copy
                    </Button>
                  )}
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={readOnly}
                >
                  <Upload className="h-4 w-4" /> Upload invoice copy
                </Button>
              )}
            </div>

            <div className="space-y-1">
              <Label>Courier Charges (optional)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={courierCharges}
                onChange={(e) => setCourierCharges(e.target.value)}
                placeholder="0.00"
                disabled={readOnly}
              />
              <p className="text-[11px] text-muted-foreground">Added to invoice total; not taxed separately.</p>
            </div>

            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={3}
                placeholder="Optional notes"
                disabled={readOnly}
              />
            </div>
          </div>

          {/* Right — PO selection (scrollable) */}
          <div className="min-h-0 h-full flex flex-col overflow-hidden px-6 py-4">
            <div className="shrink-0 space-y-2 mb-3">
              <Label>
                Purchase Orders <span className="text-red-500">*</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                {isEditMode
                  ? "POs on this bill are shown below. Uncheck to remove; amounts can be edited."
                  : "Partial / full received POs only. Amount and GST load from the PO when already set; otherwise enter them below for each selected PO."}
              </p>
              {isEditMode && editable && (
                <button
                  type="button"
                  className="text-xs text-primary underline-offset-2 hover:underline"
                  onClick={() => setShowEligiblePicker((v) => !v)}
                >
                  {showEligiblePicker
                    ? "Hide received / partial received POs"
                    : "Show received / partial received POs"}
                </button>
              )}
              {(showEligiblePicker || !isEditMode) && (
              <div className="flex flex-wrap items-end gap-2">
                <span className="text-[10px] font-medium text-muted-foreground shrink-0 pb-2">
                  Received Date
                </span>
                <Input
                  type="date"
                  value={receiveStartDate}
                  onChange={(e) => setReceiveStartDate(e.target.value || "")}
                  className="!h-8 min-w-[110px] max-w-[140px] text-xs px-1.5"
                  title="Received from"
                  disabled={!form.vendorId || readOnly}
                />
                <Input
                  type="date"
                  value={receiveEndDate}
                  onChange={(e) => setReceiveEndDate(e.target.value || "")}
                  className="!h-8 min-w-[110px] max-w-[140px] text-xs px-1.5"
                  title="Received to"
                  disabled={!form.vendorId || readOnly}
                />
              </div>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto space-y-3 pr-1">
              {!form.vendorId ? (
                <p className="text-xs text-muted-foreground py-2">Select a vendor to load purchase orders.</p>
              ) : loadingPOs && !outstandingPOs.length ? (
                <p className="text-xs text-muted-foreground py-2">Loading purchase orders...</p>
              ) : outstandingPOs.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No purchase orders on this bill.</p>
              ) : (
                <>
                  <div className="border rounded-md divide-y text-xs">
                    <div className="sticky top-0 z-[1] grid grid-cols-[2rem_1fr_6.5rem] gap-2 px-3 py-2 bg-muted/40 font-medium text-muted-foreground">
                      <span />
                      <span>PO Number</span>
                      <span className="text-right">PO Total</span>
                    </div>
                    {outstandingPOs.map((po) => {
                      const selected = selectedPoIds.includes(po.id);
                      return (
                        <div
                          key={po.id}
                          className={`grid grid-cols-[2rem_1fr_6.5rem] gap-2 items-center px-3 py-2 ${selected ? "bg-primary/5" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => togglePo(po.id)}
                            className="h-4 w-4"
                            disabled={readOnly}
                          />
                          <div>
                            <p className="font-medium">{po.poNumber}</p>
                            <p className="text-muted-foreground">
                              Received{" "}
                              {po.receivedDate
                                ? new Date(po.receivedDate).toLocaleDateString("en-IN")
                                : "—"}
                              {po.onInvoice ? " · On this bill" : ""}
                              {!po.onInvoice && po.needsPricing ? " · Awaiting invoice values" : ""}
                            </p>
                          </div>
                          <span className="text-right font-mono pr-1">
                            {po.needsPricing ? "—" : fmt(po.totalValue)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {selectedPOs.length > 0 && (
                    <div className="border rounded-md divide-y text-xs overflow-x-auto">
                      <div className="sticky top-0 z-[1] grid grid-cols-[1fr_repeat(4,minmax(4.5rem,6.5rem))] gap-2 px-3 py-2 bg-muted/40 font-medium text-muted-foreground min-w-[32rem]">
                        <span>Selected PO — Invoice Amounts</span>
                        <span className="text-right">Subtotal</span>
                        <span className="text-right">GST %</span>
                        <span className="text-right">GST Amt</span>
                        <span className="text-right">Line Total</span>
                      </div>
                      {selectedPOs.map((po) => {
                        const line = poLines[po.id] || emptyPoLine();
                        const lineTotal = round2(
                          (parseFloat(line.subtotalAmount) || 0) + (parseFloat(line.taxAmount) || 0)
                        );
                        const readOnlyLine = readOnly || (line.locked && !isEditMode);
                        return (
                          <div
                            key={po.id}
                            className="grid grid-cols-[1fr_repeat(4,minmax(4.5rem,6.5rem))] gap-2 items-center px-3 py-2 min-w-[32rem]"
                          >
                            <div>
                              <p className="font-medium">{po.poNumber}</p>
                              <p className="text-muted-foreground">
                                {readOnlyLine && !isEditMode ? "Loaded from PO" : "Enter from vendor invoice"}
                              </p>
                            </div>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              className="h-7 text-xs text-right"
                              value={line.subtotalAmount}
                              onChange={(e) => updatePoLine(po.id, "subtotalAmount", e.target.value)}
                              disabled={readOnlyLine}
                              placeholder="0.00"
                            />
                            <FormSelect
                              options={gstRateOptions}
                              value={line.gstPercent !== "" ? String(line.gstPercent) : null}
                              onChange={(val) => updatePoLine(po.id, "gstPercent", val != null ? String(val) : "")}
                              placeholder="%"
                              isSearchable={false}
                              isClearable
                              disabled={readOnlyLine}
                              containerClassName="space-y-0"
                              className="h-7 text-xs"
                            />
                            <span className="text-right font-mono pr-1">
                              {line.taxAmount !== "" ? fmt(line.taxAmount) : "—"}
                            </span>
                            <span className="text-right font-mono pr-1">{lineTotal > 0 ? fmt(lineTotal) : "—"}</span>
                          </div>
                        );
                      })}
                      <div className="grid grid-cols-[1fr_repeat(4,minmax(4.5rem,6.5rem))] gap-2 px-3 py-2 bg-muted/20 font-semibold min-w-[32rem]">
                        <span>PO Lines</span>
                        <span className="text-right font-mono">{fmt(totals.subtotal)}</span>
                        <span />
                        <span className="text-right font-mono">{fmt(totals.tax)}</span>
                        <span className="text-right font-mono">{fmt(totals.linesTotal)}</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 px-6 py-4 border-t bg-background !flex-row !items-center !justify-between gap-3 flex-wrap">
          <div className="text-xs sm:text-sm space-y-0.5 min-w-[10rem]">
            <div className="flex justify-between gap-6 text-muted-foreground">
              <span>PO lines</span>
              <span className="font-mono text-foreground">{fmt(totals.linesTotal)}</span>
            </div>
            <div className="flex justify-between gap-6 text-muted-foreground">
              <span>Courier</span>
              <span className="font-mono text-foreground">{fmt(totals.courier)}</span>
            </div>
            <div className="flex justify-between gap-6 font-semibold border-t pt-0.5">
              <span>Invoice Total</span>
              <span className="font-mono">{fmt(totals.total)}</span>
            </div>
          </div>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              {readOnly ? "Close" : "Cancel"}
            </Button>
            {!readOnly && (
              <Button
                onClick={handleSave}
                disabled={
                  saving ||
                  !selectedPOs.length ||
                  (!invoiceFile && !existingCopyPath) ||
                  totals.total <= 0
                }
              >
                {saving
                  ? isEditMode
                    ? "Saving..."
                    : "Registering..."
                  : isEditMode
                    ? `Save Changes ${totals.total > 0 ? fmt(totals.total) : ""}`
                    : `Register Invoice ${totals.total > 0 ? fmt(totals.total) : ""}`}
              </Button>
            )}
          </div>
        </DialogFooter>
        </>
        )}
      </DialogContent>
    </Dialog>
  );
}
