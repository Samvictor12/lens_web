import { useState, useEffect, useMemo } from "react";
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
import { createVendorPaymentFromInvoices } from "@/services/vendorPayment";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, previewAllocations } from "./VendorPayments.constants";

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
 * the SAME vendor (M5, invoice-first workflow). Ledger posting (bank debit /
 * vendor AP credit) confirms the payment debits from the selected company
 * bank/cash account — unchanged pattern from the legacy PO-direct flow.
 */
export default function CreateVendorPaymentFromInvoicesDialog({
  open,
  onOpenChange,
  vendors = [],
  bankLedgers = [],
  preselectedVendorId = "",
  preselectedInvoiceIds = [],
  preselectedInvoices = [],
  prefillAmount = "",
  onCreated,
}) {
  const { toast } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [allocations, setAllocations] = useState({});
  const [manualOverrides, setManualOverrides] = useState({});

  const lockedVendor = !!preselectedVendorId;

  const selectedInvoices = useMemo(
    () => (preselectedInvoices || []).filter((inv) => preselectedInvoiceIds.includes(inv.id)),
    [preselectedInvoices, preselectedInvoiceIds]
  );

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  useEffect(() => {
    if (!open) return;
    setForm({
      ...emptyForm,
      vendorId: preselectedVendorId ? String(preselectedVendorId) : "",
      paymentDate: new Date().toISOString().split("T")[0],
      totalAmount: prefillAmount ? String(prefillAmount) : "",
    });
    setAllocations({});
    setManualOverrides({});
  }, [open, preselectedVendorId, prefillAmount]);

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
  const bankLedgerOptions = bankLedgers.map((l) => ({ id: l.id, name: l.ledgerName }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[65vw] !max-w-[65vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Vendor Payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>
              Vendor <span className="text-red-500">*</span>
            </Label>
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
          </div>

          <div className="space-y-2">
            <Label>
              Invoice Allocation (FIFO by invoice date) <span className="text-red-500">*</span>
            </Label>
            {selectedInvoices.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                No invoices selected. Choose invoices from the Outstanding tab first.
              </p>
            ) : (
              <div className="border rounded-md divide-y text-xs overflow-x-auto">
                <div className="grid grid-cols-[1fr_6.5rem_6.5rem_8rem] gap-2 px-3 py-2 bg-muted/40 font-medium text-muted-foreground min-w-[36rem]">
                  <span>Invoice</span>
                  <span className="text-right">Total</span>
                  <span className="text-right">Outstanding</span>
                  <span className="text-right">Pay Now</span>
                </div>
                {selectedInvoices.map((inv) => (
                  <div key={inv.id} className="grid grid-cols-[1fr_6.5rem_6.5rem_8rem] gap-2 items-center px-3 py-2 min-w-[36rem]">
                    <div>
                      <p className="font-medium">{inv.invoiceNumber}</p>
                      <p className="text-muted-foreground">{inv.supplierInvoiceNo}</p>
                    </div>
                    <span className="text-right font-mono">{fmt(inv.totalAmount)}</span>
                    <span className="text-right font-mono text-orange-600">{fmt(inv.outstanding)}</span>
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
                  </div>
                ))}
                <div className="grid grid-cols-[1fr_6.5rem_6.5rem_8rem] gap-2 px-3 py-2 bg-muted/20 font-semibold min-w-[36rem]">
                  <span>Allocated Total</span>
                  <span />
                  <span />
                  <span className="text-right font-mono">{fmt(totalAllocated)}</span>
                </div>
              </div>
            )}
          </div>

          {excess > 0.01 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              Payment exceeds selected invoice outstanding by <strong>{fmt(excess)}</strong>. Reduce the total
              payment amount or adjust per-invoice allocations.
            </div>
          )}

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
              <Label>Payment Account (Company Bank/Cash) <span className="text-red-500">*</span></Label>
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

          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="Optional notes" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !canSave}>
            {saving ? "Creating voucher..." : `Create Voucher ${paymentAmount > 0 ? fmt(paymentAmount) : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
