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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormSelect } from "@/components/ui/form-select";
import { useToast } from "@/hooks/use-toast";
import { createCustomerPayment } from "@/services/customerPayment";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  emptyPaymentForm,
  previewAllocations,
} from "./CustomerPayments.constants";

function fmt(n) {
  return `₹${parseFloat(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

export default function CreateCustomerPaymentDialog({
  open,
  onOpenChange,
  customers = [],
  bankLedgers = [],
  preselectedCustomerId = "",
  preselectedInvoiceIds = [],
  preselectedInvoices = [],
  prefillAmount = "",
  onCreated,
}) {
  const { toast } = useToast();
  const [form, setForm] = useState(emptyPaymentForm);
  const [saving, setSaving] = useState(false);
  const [allocations, setAllocations] = useState({});
  const [acceptAdvance, setAcceptAdvance] = useState(false);
  const [manualOverrides, setManualOverrides] = useState({});

  const lockedCustomer = !!preselectedCustomerId;

  // Invoice selection is OutstandingInvoicesQueue List UI — dialog only allocates preselected
  const selectedInvoices = useMemo(() => {
    const pool = preselectedInvoices || [];
    if (!preselectedInvoiceIds.length) return [];
    return pool.filter((inv) => preselectedInvoiceIds.includes(inv.id));
  }, [preselectedInvoices, preselectedInvoiceIds]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  useEffect(() => {
    if (!open) return;
    setForm({
      ...emptyPaymentForm,
      customerId: preselectedCustomerId ? String(preselectedCustomerId) : "",
      paymentDate: new Date().toISOString().split("T")[0],
      totalAmount: prefillAmount ? String(prefillAmount) : "",
    });
    setManualOverrides({});
    setAcceptAdvance(false);
    setAllocations({});
  }, [open, preselectedCustomerId, prefillAmount]);

  const totalOutstanding = selectedInvoices.reduce(
    (s, inv) => s + parseFloat(inv.outstanding || 0),
    0
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

  const canSave =
    form.customerId &&
    form.bankLedgerId &&
    paymentAmount > 0 &&
    selectedInvoices.length > 0 &&
    (excess <= 0.01 || (acceptAdvance && excess > 0));

  const handleSave = async () => {
    if (!canSave) {
      toast({ variant: "destructive", title: "Please complete all required fields" });
      return;
    }

    const items = selectedInvoices
      .filter((inv) => (allocations[inv.id] || 0) > 0)
      .map((inv) => ({
        invoiceId: inv.id,
        allocatedAmount: parseFloat(allocations[inv.id]),
      }));

    const advanceAmount = acceptAdvance && excess > 0.01 ? excess : 0;

    setSaving(true);
    try {
      await createCustomerPayment({
        customerId: parseInt(form.customerId),
        bankLedgerId: parseInt(form.bankLedgerId),
        paymentDate: form.paymentDate,
        paymentMethod: form.paymentMethod,
        referenceNo: form.referenceNumber || undefined,
        notes: form.notes || undefined,
        totalAmount: paymentAmount,
        advanceAmount,
        acceptAdvance: advanceAmount > 0,
        items,
      });
      toast({ title: "Payment recorded" });
      setForm(emptyPaymentForm);
      onCreated?.();
      onOpenChange(false);
    } catch (e) {
      toast({ variant: "destructive", title: e?.message || "Failed to record payment" });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setForm(emptyPaymentForm);
    setAllocations({});
    setManualOverrides({});
    setAcceptAdvance(false);
    onOpenChange(false);
  };

  const customerOptions = customers.map((c) => ({ id: c.id, name: c.name }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Customer Payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Customer <span className="text-red-500">*</span></Label>
            <FormSelect
              options={customerOptions}
              value={form.customerId || null}
              onChange={(val) => set("customerId", val != null && val !== "" ? String(val) : "")}
              placeholder="Search customer..."
              isSearchable
              isClearable={!lockedCustomer}
              disabled={lockedCustomer}
              menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
              menuPosition="fixed"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Payment Amount <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.totalAmount}
                onChange={(e) => set("totalAmount", e.target.value)}
                placeholder="Amount received"
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Payment Method <span className="text-red-500">*</span></Label>
              <Select value={form.paymentMethod} onValueChange={(v) => set("paymentMethod", v)}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {PAYMENT_METHOD_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Receiving Account <span className="text-red-500">*</span></Label>
              <Select value={form.bankLedgerId} onValueChange={(v) => set("bankLedgerId", v)}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Cash / Bank account" />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  {bankLedgers.map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>
                      {l.ledgerName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Reference No.</Label>
            <Input
              value={form.referenceNumber}
              onChange={(e) => set("referenceNumber", e.target.value)}
              placeholder="Cheque / UTR"
            />
          </div>

          {selectedInvoices.length > 0 && (
            <div className="space-y-2">
              <Label>Invoice Allocation (FIFO by due date)</Label>
              <div className="border rounded-md divide-y text-xs">
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 py-2 bg-muted/40 font-medium text-muted-foreground">
                  <span>Invoice</span>
                  <span className="text-right">Outstanding</span>
                  <span className="text-right w-28">Allocate</span>
                </div>
                {selectedInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="grid grid-cols-[1fr_auto_auto] gap-2 items-center px-3 py-2"
                  >
                    <div>
                      <p className="font-medium">{inv.invoiceNo}</p>
                      <p className="text-muted-foreground">
                        Due {new Date(inv.dueDate).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                    <span className="text-right font-mono">{fmt(inv.outstanding)}</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      max={inv.outstanding}
                      className="w-28 h-7 text-xs text-right"
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
                <div className="grid grid-cols-[1fr_auto] gap-2 px-3 py-2 bg-muted/20 font-semibold">
                  <span>Selected outstanding</span>
                  <span className="font-mono">{fmt(totalOutstanding)}</span>
                </div>
              </div>
            </div>
          )}

          {excess > 0.01 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 space-y-2 text-sm">
              <p className="text-amber-800">
                Payment exceeds selected invoice outstanding by <strong>{fmt(excess)}</strong>.
              </p>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="accept-advance"
                  checked={acceptAdvance}
                  onCheckedChange={(v) => setAcceptAdvance(!!v)}
                />
                <label htmlFor="accept-advance" className="text-xs cursor-pointer">
                  Treat excess as advance payment
                </label>
              </div>
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
          <Button onClick={handleSave} disabled={saving || !canSave}>
            {saving ? "Saving..." : `Record ${fmt(paymentAmount)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
