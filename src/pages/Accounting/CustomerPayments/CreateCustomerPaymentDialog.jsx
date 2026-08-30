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
import { FormSelect } from "@/components/ui/form-select";
import { useToast } from "@/hooks/use-toast";
import { createCustomerPayment } from "@/services/customerPayment";
import { formatCashBankLedgerLabel } from "@/utils/cashBankLedgerLabel";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  emptyPaymentForm,
  previewAllocations,
} from "./CustomerPayments.constants";

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

export default function CreateCustomerPaymentDialog({
  open,
  onOpenChange,
  mode = "new",
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

  const isRecordMode = mode === "record";
  const lockedCustomer = isRecordMode && !!preselectedCustomerId;

  const selectedInvoices = useMemo(() => {
    const pool = preselectedInvoices || [];
    if (isRecordMode) {
      if (!preselectedInvoiceIds.length) return [];
      return pool.filter((inv) => preselectedInvoiceIds.includes(inv.id));
    }
    if (!form.customerId) return [];
    return pool.filter((inv) => String(inv.customerId) === String(form.customerId));
  }, [preselectedInvoices, preselectedInvoiceIds, isRecordMode, form.customerId]);

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
  }, [open, preselectedCustomerId, prefillAmount, mode]);

  useEffect(() => {
    if (!open || isRecordMode) return;
    setManualOverrides({});
    setAcceptAdvance(false);
  }, [open, isRecordMode, form.customerId]);

  const totalOutstanding = useMemo(
    () => round2(selectedInvoices.reduce((s, inv) => s + parseFloat(inv.outstanding || 0), 0)),
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
    form.customerId &&
    form.bankLedgerId &&
    paymentAmount > 0 &&
    selectedInvoices.length > 0 &&
    totalAllocated > 0 &&
    (excess <= 0.01 || (acceptAdvance && excess > 0));

  const handleSave = async () => {
    if (!canSave) {
      if (excess > 0.01 && !acceptAdvance) {
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
        invoiceId: inv.id,
        allocatedAmount: parseFloat(allocations[inv.id]),
      }));

    const advanceAmount = acceptAdvance && excess > 0.01 ? excess : 0;

    setSaving(true);
    try {
      await createCustomerPayment({
        customerId: parseInt(form.customerId, 10),
        bankLedgerId: parseInt(form.bankLedgerId, 10),
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

  const customerOptions = useMemo(() => {
    if (isRecordMode) {
      if (preselectedCustomerId) {
        const fromCustomers = customers.find(
          (c) => String(c.id) === String(preselectedCustomerId)
        );
        if (fromCustomers) return [{ id: fromCustomers.id, name: fromCustomers.name }];

        const inv = (preselectedInvoices || []).find(
          (i) => String(i.customerId) === String(preselectedCustomerId)
        );
        if (inv?.customer) {
          const c = inv.customer;
          return [{ id: inv.customerId, name: c.shopname || c.name || `Customer #${inv.customerId}` }];
        }
      }
      return customers.map((c) => ({ id: c.id, name: c.name }));
    }

    const seen = new Map();
    for (const inv of preselectedInvoices || []) {
      if (!inv.customerId || seen.has(inv.customerId)) continue;
      const c = inv.customer || {};
      seen.set(inv.customerId, {
        id: inv.customerId,
        name: c.shopname || c.name || `Customer #${inv.customerId}`,
      });
    }
    return Array.from(seen.values()).sort((a, b) =>
      String(a.name).localeCompare(String(b.name))
    );
  }, [isRecordMode, preselectedCustomerId, preselectedInvoices, customers]);

  const bankLedgerOptions = bankLedgers.map((l) => ({
    id: l.id,
    name: formatCashBankLedgerLabel(l),
  }));

  const dialogTitle = isRecordMode ? "Record Payment" : "New Customer Payment";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!flex !flex-col !w-[75vw] !max-w-[75vw] !h-[88vh] !max-h-[88vh] overflow-hidden gap-0 p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-3 pr-12">
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,17.5rem)_minmax(0,1fr)] grid-rows-1 gap-0 overflow-hidden border-t">
          {/* Left — payment details */}
          <div className="min-h-0 h-full overflow-y-auto space-y-4 px-4 py-4 border-b lg:border-b-0 lg:border-r">
            <FormSelect
              label="Customer"
              name="customerId"
              options={customerOptions}
              value={form.customerId}
              onChange={(value) => {
                set("customerId", value != null && value !== "" ? String(value) : "");
              }}
              placeholder={isRecordMode ? "Customer" : "Search customer with outstanding invoices…"}
              isSearchable
              isClearable={!lockedCustomer}
              disabled={lockedCustomer}
              required
            />

            <div className="space-y-1">
              <Label>
                Payment Amount <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.totalAmount}
                onChange={(e) => set("totalAmount", e.target.value)}
                placeholder="Amount received"
              />
              {selectedInvoices.length > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Selected outstanding: {fmt(totalOutstanding)}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label>
                Payment Date <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={form.paymentDate}
                onChange={(e) => set("paymentDate", e.target.value)}
              />
            </div>

            <FormSelect
              label="Payment Method"
              name="paymentMethod"
              options={paymentMethodOptions}
              value={form.paymentMethod || null}
              onChange={(val) => set("paymentMethod", val ?? PAYMENT_METHODS[0])}
              placeholder="Select payment method"
              isSearchable={false}
              isClearable={false}
              required
            />

            <FormSelect
              label="Receiving Account"
              name="bankLedgerId"
              options={bankLedgerOptions}
              value={form.bankLedgerId || null}
              onChange={(val) => set("bankLedgerId", val != null && val !== "" ? String(val) : "")}
              placeholder="Cash / Bank account"
              isSearchable
              isClearable
              required
            />

            <div className="space-y-1">
              <Label>Reference No.</Label>
              <Input
                value={form.referenceNumber}
                onChange={(e) => set("referenceNumber", e.target.value)}
                placeholder="Cheque / UTR"
              />
            </div>

            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={3}
                placeholder="Optional notes"
              />
            </div>
          </div>

          {/* Right — invoice allocation */}
          <div className="min-h-0 h-full flex flex-col overflow-hidden px-6 py-4">
            <div className="shrink-0 space-y-2 mb-3">
              <Label>
                Invoice Allocation (FIFO by due date) <span className="text-red-500">*</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                {isRecordMode
                  ? "Selected outstanding invoices are listed below. Adjust per-invoice allocations as needed."
                  : "Choose a customer to load their outstanding invoices. Payment is allocated oldest due date first."}
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto space-y-3 pr-1">
              {!form.customerId ? (
                <p className="text-xs text-muted-foreground py-2">Select a customer first.</p>
              ) : !isRecordMode && selectedInvoices.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 rounded-md border border-dashed p-3">
                  This customer has no outstanding invoices. Payment cannot be recorded until
                  invoices are issued.
                </p>
              ) : selectedInvoices.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  No invoices selected. Choose invoices from the Outstanding tab first.
                </p>
              ) : (
                <div className="border rounded-md divide-y text-xs overflow-x-auto">
                  <div className="sticky top-0 z-[1] grid grid-cols-[1fr_6.5rem_6.5rem_8rem] gap-2 px-3 py-2 bg-muted/40 font-medium text-muted-foreground min-w-[36rem]">
                    <span>Invoice</span>
                    <span className="text-right">Total</span>
                    <span className="text-right">Outstanding</span>
                    <span className="text-right">Allocate</span>
                  </div>
                  {selectedInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="grid grid-cols-[1fr_6.5rem_6.5rem_8rem] gap-2 items-center px-3 py-2 min-w-[36rem]"
                    >
                      <div>
                        <p className="font-medium">{inv.invoiceNo}</p>
                        <p className="text-muted-foreground">
                          Due {new Date(inv.dueDate).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                      <span className="text-right font-mono">{fmt(inv.totalAmount)}</span>
                      <span className="text-right font-mono text-orange-600">
                        {fmt(inv.outstanding)}
                      </span>
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
                    <span className="text-right font-mono">{fmt(totalOutstanding)}</span>
                    <span className="text-right font-mono">{fmt(totalAllocated)}</span>
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
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 px-6 py-4 border-t bg-background !flex-row !items-center !justify-between gap-3 flex-wrap">
          <div className="text-xs sm:text-sm space-y-0.5 min-w-[10rem]">
            <div className="flex justify-between gap-6 text-muted-foreground">
              <span>Payment amount</span>
              <span className="font-mono text-foreground">{fmt(paymentAmount)}</span>
            </div>
            <div className="flex justify-between gap-6 text-muted-foreground">
              <span>Allocated</span>
              <span className="font-mono text-foreground">{fmt(totalAllocated)}</span>
            </div>
            {excess > 0.01 && acceptAdvance && (
              <div className="flex justify-between gap-6 text-muted-foreground">
                <span>New advance</span>
                <span className="font-mono text-foreground">{fmt(excess)}</span>
              </div>
            )}
            <div className="flex justify-between gap-6 font-semibold border-t pt-0.5">
              <span>Outstanding (selected)</span>
              <span className="font-mono">{fmt(totalOutstanding)}</span>
            </div>
          </div>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={handleClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !canSave}>
              {saving ? "Recording…" : `Record ${paymentAmount > 0 ? fmt(paymentAmount) : ""}`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
