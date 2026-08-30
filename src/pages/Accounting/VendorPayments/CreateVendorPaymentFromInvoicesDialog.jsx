import { useState, useEffect, useMemo, useRef } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { FormSelect } from "@/components/ui/form-select";
import { useToast } from "@/hooks/use-toast";
import { createVendorPaymentFromInvoices, getOutstandingVendorInvoices } from "@/services/vendorPayment";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, previewAllocations } from "./VendorPayments.constants";
import { formatCashBankLedgerLabel } from "@/utils/cashBankLedgerLabel";

function fmt(n) {
  return `₹${parseFloat(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

function round2(n) {
  return Math.round(parseFloat(n || 0) * 100) / 100;
}

const paymentMethodOptions = PAYMENT_METHODS.map((m) => ({
  id: m,
  name: PAYMENT_METHOD_LABELS[m],
}));

const emptyForm = {
  vendorId: "",
  paymentDate: new Date().toISOString().split("T")[0],
  paymentMethod: PAYMENT_METHODS[0],
  bankLedgerId: "",
  referenceNumber: "",
  notes: "",
  totalAmount: "",
};

/**
 * Record a vendor payment against one or more outstanding VendorInvoice rows for
 * the SAME vendor (M5, invoice-first workflow).
 */
export default function CreateVendorPaymentFromInvoicesDialog({
  open,
  onOpenChange,
  vendors = [],
  bankLedgers = [],
  preselectedVendorId = "",
  preselectedInvoiceIds = [],
  prefillAmount = "",
  onCreated,
}) {
  const { toast } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [allocations, setAllocations] = useState({});
  const [manualOverrides, setManualOverrides] = useState({});
  const [outstandingInvoices, setOutstandingInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([]);
  const initialSelectionApplied = useRef(false);

  const lockedVendor = !!preselectedVendorId;

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  useEffect(() => {
    if (!open) {
      initialSelectionApplied.current = false;
      return;
    }
    setForm({
      ...emptyForm,
      vendorId: preselectedVendorId ? String(preselectedVendorId) : "",
      paymentDate: new Date().toISOString().split("T")[0],
      totalAmount: prefillAmount ? String(prefillAmount) : "",
    });
    setAllocations({});
    setManualOverrides({});
    setSelectedInvoiceIds(preselectedInvoiceIds.length ? [...preselectedInvoiceIds] : []);
    setOutstandingInvoices([]);
    initialSelectionApplied.current = false;
  }, [open, preselectedVendorId, prefillAmount, preselectedInvoiceIds]);

  useEffect(() => {
    if (!open || !form.vendorId) {
      if (!form.vendorId) setOutstandingInvoices([]);
      return;
    }
    let cancelled = false;
    setLoadingInvoices(true);
    getOutstandingVendorInvoices({ vendorId: form.vendorId, groupBy: "flat" })
      .then((res) => {
        if (cancelled) return;
        const invoices = res.data?.invoices || [];
        setOutstandingInvoices(invoices);
        const eligibleIds = new Set(invoices.map((inv) => inv.id));
        if (!initialSelectionApplied.current && preselectedInvoiceIds.length) {
          initialSelectionApplied.current = true;
          setSelectedInvoiceIds(
            preselectedInvoiceIds.filter((id) => eligibleIds.has(id))
          );
        } else {
          setSelectedInvoiceIds((prev) => prev.filter((id) => eligibleIds.has(id)));
        }
      })
      .catch(() => {
        if (!cancelled) {
          toast({ variant: "destructive", title: "Failed to load outstanding invoices" });
          setOutstandingInvoices([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingInvoices(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, form.vendorId, preselectedInvoiceIds, toast]);

  const selectedInvoices = useMemo(
    () => outstandingInvoices.filter((inv) => selectedInvoiceIds.includes(inv.id)),
    [outstandingInvoices, selectedInvoiceIds]
  );

  const totalOutstanding = useMemo(
    () => round2(selectedInvoices.reduce((s, inv) => s + (parseFloat(inv.outstanding) || 0), 0)),
    [selectedInvoices]
  );

  const paymentAmount = parseFloat(form.totalAmount) || 0;

  const { allocations: preview, remaining: excess } = useMemo(() => {
    if (!paymentAmount || !selectedInvoices.length) {
      return { allocations: {}, remaining: 0 };
    }
    return previewAllocations(selectedInvoices, paymentAmount, manualOverrides);
  }, [selectedInvoices, paymentAmount, manualOverrides]);

  useEffect(() => {
    setAllocations(preview);
  }, [preview]);

  const totalAllocated = useMemo(
    () => round2(selectedInvoices.reduce((s, inv) => s + (parseFloat(allocations[inv.id]) || 0), 0)),
    [selectedInvoices, allocations]
  );

  const toggleInvoice = (id) => {
    setSelectedInvoiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setManualOverrides({});
  };

  const canSave =
    form.vendorId &&
    form.bankLedgerId &&
    paymentAmount > 0 &&
    selectedInvoices.length > 0 &&
    totalAllocated > 0 &&
    excess <= 0.01 &&
    Math.abs(totalAllocated - paymentAmount) <= 0.01;

  const handleSave = async () => {
    if (!canSave) {
      if (excess > 0.01) {
        toast({
          variant: "destructive",
          title: `Payment exceeds selected invoice outstanding by ${fmt(excess)}`,
        });
      } else {
        toast({ variant: "destructive", title: "Please complete all required fields" });
      }
      return;
    }

    const items = selectedInvoices
      .filter((inv) => (allocations[inv.id] || 0) > 0)
      .map((inv) => ({
        vendorInvoiceId: inv.id,
        allocatedAmount: round2(allocations[inv.id]),
      }));

    setSaving(true);
    try {
      const res = await createVendorPaymentFromInvoices({
        vendorId: parseInt(form.vendorId, 10),
        bankLedgerId: parseInt(form.bankLedgerId, 10),
        paymentDate: form.paymentDate,
        paymentMethod: form.paymentMethod,
        referenceNo: form.referenceNumber || undefined,
        notes: form.notes || undefined,
        totalAmount: paymentAmount,
        items,
      });
      if (res.success) {
        toast({ title: "Payment voucher created" });
        onOpenChange(false);
        onCreated?.();
      }
    } catch (e) {
      toast({ variant: "destructive", title: e?.message || e?.error?.message || "Failed to record payment" });
    } finally {
      setSaving(false);
    }
  };

  const vendorOptions = vendors.map((v) => ({ id: v.id, name: v.name }));
  const bankLedgerOptions = bankLedgers.map((l) => ({
    id: l.id,
    name: formatCashBankLedgerLabel(l),
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!flex !flex-col !w-[75vw] !max-w-[75vw] !h-[88vh] !max-h-[88vh] overflow-hidden gap-0 p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-3 pr-12">
          <DialogTitle>Record Vendor Payment</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,17.5rem)_minmax(0,1fr)] grid-rows-1 gap-0 overflow-hidden border-t">
          <div className="min-h-0 h-full overflow-y-auto space-y-4 px-4 py-4 border-b lg:border-b-0 lg:border-r">
            <FormSelect
              label="Vendor"
              name="vendorId"
              options={vendorOptions}
              value={form.vendorId}
              onChange={(value) => {
                set("vendorId", value != null && value !== "" ? String(value) : "");
                setSelectedInvoiceIds([]);
                setManualOverrides({});
                initialSelectionApplied.current = true;
              }}
              placeholder="Select vendor"
              isSearchable
              isClearable={!lockedVendor}
              disabled={lockedVendor}
              required
              menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
              menuPosition="fixed"
            />

            <div className="space-y-1">
              <Label>
                Total Payment Amount <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.totalAmount}
                onChange={(e) => set("totalAmount", e.target.value)}
                placeholder="Amount to pay"
              />
              {selectedInvoices.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Selected outstanding: {fmt(totalOutstanding)}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label>
                Payment Date <span className="text-red-500">*</span>
              </Label>
              <Input type="date" value={form.paymentDate} onChange={(e) => set("paymentDate", e.target.value)} />
            </div>

            <FormSelect
              label="Payment Method"
              name="paymentMethod"
              options={paymentMethodOptions}
              value={form.paymentMethod}
              onChange={(val) => set("paymentMethod", val ?? "")}
              placeholder="Select payment method"
              isSearchable={false}
              isClearable
              required
              menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
              menuPosition="fixed"
            />

            <FormSelect
              label="Payment Account"
              name="bankLedgerId"
              options={bankLedgerOptions}
              value={form.bankLedgerId}
              onChange={(val) => set("bankLedgerId", val != null && val !== "" ? String(val) : "")}
              placeholder="Cash / Bank account"
              isSearchable
              isClearable
              required
              menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
              menuPosition="fixed"
            />

            <div className="space-y-1">
              <Label>Reference No.</Label>
              <Input
                value={form.referenceNumber}
                onChange={(e) => set("referenceNumber", e.target.value)}
                placeholder="Cheque / transaction ref"
              />
            </div>

            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="Optional notes" />
            </div>
          </div>

          <div className="min-h-0 h-full flex flex-col overflow-hidden">
            <div className="shrink-0 px-4 py-3 border-b">
              <Label className="text-sm font-medium">
                Outstanding Invoices <span className="text-red-500">*</span>
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select invoices to allocate payment (FIFO by invoice date)
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {!form.vendorId ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Select a vendor to load outstanding invoices.</p>
              ) : loadingInvoices ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Loading invoices…</p>
              ) : outstandingInvoices.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No outstanding invoices for this vendor.</p>
              ) : (
                <>
                  <div className="border rounded-md divide-y text-xs overflow-x-auto">
                    <div className="grid grid-cols-[2rem_1fr_5.5rem_5.5rem_7rem] gap-2 px-3 py-2 bg-muted/40 font-medium text-muted-foreground min-w-[32rem]">
                      <span />
                      <span>Invoice</span>
                      <span className="text-right">Total</span>
                      <span className="text-right">Outstanding</span>
                      <span className="text-right">Pay Now</span>
                    </div>
                    {outstandingInvoices.map((inv) => {
                      const selected = selectedInvoiceIds.includes(inv.id);
                      return (
                        <div
                          key={inv.id}
                          className="grid grid-cols-[2rem_1fr_5.5rem_5.5rem_7rem] gap-2 items-center px-3 py-2 min-w-[32rem]"
                        >
                          <Checkbox
                            checked={selected}
                            onCheckedChange={() => toggleInvoice(inv.id)}
                          />
                          <div>
                            <p className="font-medium">{inv.invoiceNumber}</p>
                            <p className="text-muted-foreground">{inv.supplierInvoiceNo}</p>
                          </div>
                          <span className="text-right font-mono">{fmt(inv.totalAmount)}</span>
                          <span className="text-right font-mono text-orange-600">{fmt(inv.outstanding)}</span>
                          {selected ? (
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              max={inv.outstanding}
                              className="h-7 text-xs text-right"
                              value={allocations[inv.id] ?? ""}
                              onChange={(e) =>
                                setManualOverrides((prev) => ({
                                  ...prev,
                                  [inv.id]: e.target.value,
                                }))
                              }
                            />
                          ) : (
                            <span className="text-right text-muted-foreground">—</span>
                          )}
                        </div>
                      );
                    })}
                    {selectedInvoices.length > 0 && (
                      <div className="grid grid-cols-[2rem_1fr_5.5rem_5.5rem_7rem] gap-2 px-3 py-2 bg-muted/20 font-semibold min-w-[32rem]">
                        <span />
                        <span>Allocated Total</span>
                        <span />
                        <span />
                        <span className="text-right font-mono">{fmt(totalAllocated)}</span>
                      </div>
                    )}
                  </div>

                  {excess > 0.01 && (
                    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                      Payment exceeds selected invoice outstanding by <strong>{fmt(excess)}</strong>.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !canSave}>
            {saving ? "Recording…" : `Record ${paymentAmount > 0 ? fmt(paymentAmount) : "Payment"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
