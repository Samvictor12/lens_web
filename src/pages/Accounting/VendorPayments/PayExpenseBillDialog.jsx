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
import { getVendorIndirectExpenses, payVendorIndirectExpenses } from "@/services/vendorIndirectExpense";
import { getLiabilityPostingLedgers } from "@/services/ledger";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, previewIndirectAllocations } from "./VendorPayments.constants";
import { formatCashBankLedgerLabel } from "@/utils/cashBankLedgerLabel";

function fmt(n) {
  return `₹${parseFloat(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

function round2(n) {
  return Math.round(parseFloat(n || 0) * 100) / 100;
}

function formatLiabilityLabel(ledger) {
  if (!ledger) return "";
  return `${ledger.ledgerCode} — ${ledger.ledgerName}`;
}

const paymentMethodOptions = PAYMENT_METHODS.map((m) => ({
  id: m,
  name: PAYMENT_METHOD_LABELS[m],
}));

const emptyForm = {
  liabilityLedgerId: "",
  paymentDate: new Date().toISOString().split("T")[0],
  paymentMethod: PAYMENT_METHODS[0],
  bankLedgerId: "",
  referenceNumber: "",
  notes: "",
  totalAmount: "",
};

export default function PayExpenseBillDialog({
  open,
  onOpenChange,
  bankLedgers = [],
  preselectedLiabilityLedgerId = "",
  onCreated,
}) {
  const { toast } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [allocations, setAllocations] = useState({});
  const [manualOverrides, setManualOverrides] = useState({});
  const [openExpenses, setOpenExpenses] = useState([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState([]);
  const [liabilityLedgers, setLiabilityLedgers] = useState([]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  useEffect(() => {
    if (!open) return;
    setForm({
      ...emptyForm,
      liabilityLedgerId: preselectedLiabilityLedgerId ? String(preselectedLiabilityLedgerId) : "",
      paymentDate: new Date().toISOString().split("T")[0],
    });
    setAllocations({});
    setManualOverrides({});
    setSelectedExpenseIds([]);
    setOpenExpenses([]);
  }, [open, preselectedLiabilityLedgerId]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const list = await getLiabilityPostingLedgers();
        setLiabilityLedgers(
          (Array.isArray(list) ? list : []).map((l) => ({
            id: l.id,
            name: formatLiabilityLabel(l),
          }))
        );
      } catch {
        // non-critical
      }
    })();
  }, [open]);

  useEffect(() => {
    if (!open || !form.liabilityLedgerId) {
      if (!form.liabilityLedgerId) setOpenExpenses([]);
      return;
    }
    let cancelled = false;
    setLoadingExpenses(true);
    getVendorIndirectExpenses({
      liabilityLedgerId: form.liabilityLedgerId,
      limit: 500,
    })
      .then((res) => {
        if (cancelled) return;
        const expenses = (res.data || []).filter((e) =>
          ["MARKED", "PARTIALLY_PAID"].includes(e.vendorExpenseStatus)
        );
        setOpenExpenses(expenses);
        setSelectedExpenseIds((prev) =>
          prev.filter((id) => expenses.some((e) => e.id === id))
        );
      })
      .catch(() => {
        if (!cancelled) {
          toast({ variant: "destructive", title: "Failed to load open expenses" });
          setOpenExpenses([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingExpenses(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, form.liabilityLedgerId, toast]);

  const selectedExpenses = useMemo(
    () => openExpenses.filter((exp) => selectedExpenseIds.includes(exp.id)),
    [openExpenses, selectedExpenseIds]
  );

  const totalOutstanding = useMemo(
    () => round2(selectedExpenses.reduce((s, exp) => s + (parseFloat(exp.outstanding) || 0), 0)),
    [selectedExpenses]
  );

  const paymentAmount = parseFloat(form.totalAmount) || 0;

  const { allocations: preview, remaining: excess } = useMemo(() => {
    if (!paymentAmount || !selectedExpenses.length) {
      return { allocations: {}, remaining: 0 };
    }
    return previewIndirectAllocations(selectedExpenses, paymentAmount, manualOverrides);
  }, [selectedExpenses, paymentAmount, manualOverrides]);

  useEffect(() => {
    setAllocations(preview);
  }, [preview]);

  const totalAllocated = useMemo(
    () => round2(selectedExpenses.reduce((s, exp) => s + (parseFloat(allocations[exp.id]) || 0), 0)),
    [selectedExpenses, allocations]
  );

  const toggleExpense = (id) => {
    setSelectedExpenseIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setManualOverrides({});
  };

  const canSave =
    form.liabilityLedgerId &&
    form.bankLedgerId &&
    paymentAmount > 0 &&
    selectedExpenses.length > 0 &&
    totalAllocated > 0 &&
    excess <= 0.01 &&
    Math.abs(totalAllocated - paymentAmount) <= 0.01;

  const handleSave = async () => {
    if (!canSave) {
      if (excess > 0.01) {
        toast({
          variant: "destructive",
          title: `Payment exceeds selected expense outstanding by ${fmt(excess)}`,
        });
      } else {
        toast({ variant: "destructive", title: "Please complete all required fields" });
      }
      return;
    }

    const items = selectedExpenses
      .filter((exp) => (allocations[exp.id] || 0) > 0)
      .map((exp) => ({
        expenseId: exp.id,
        allocatedAmount: round2(allocations[exp.id]),
      }));

    setSaving(true);
    try {
      await payVendorIndirectExpenses({
        liabilityLedgerId: parseInt(form.liabilityLedgerId, 10),
        bankLedgerId: parseInt(form.bankLedgerId, 10),
        paymentDate: form.paymentDate,
        paymentMethod: form.paymentMethod,
        referenceNo: form.referenceNumber || undefined,
        notes: form.notes || undefined,
        totalAmount: paymentAmount,
        items,
      });
      toast({ title: "Expense bill payment recorded" });
      onOpenChange(false);
      onCreated?.();
    } catch (e) {
      toast({
        variant: "destructive",
        title: e?.message || e?.error?.message || "Failed to record payment",
      });
    } finally {
      setSaving(false);
    }
  };

  const bankLedgerOptions = bankLedgers.map((l) => ({
    id: l.id,
    name: formatCashBankLedgerLabel(l),
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!flex !flex-col !w-[75vw] !max-w-[75vw] !h-[88vh] !max-h-[88vh] overflow-hidden gap-0 p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-3 pr-12">
          <DialogTitle>Pay Expense Bill</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,17.5rem)_minmax(0,1fr)] grid-rows-1 gap-0 overflow-hidden border-t">
          <div className="min-h-0 h-full overflow-y-auto space-y-4 px-4 py-4 border-b lg:border-b-0 lg:border-r">
            <FormSelect
              label="Expense for"
              name="liabilityLedgerId"
              options={liabilityLedgers}
              value={form.liabilityLedgerId}
              onChange={(value) => {
                set("liabilityLedgerId", value != null && value !== "" ? String(value) : "");
                setSelectedExpenseIds([]);
                setManualOverrides({});
              }}
              placeholder="Select liability account"
              isSearchable
              isClearable
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
              {selectedExpenses.length > 0 && (
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
                Open Expenses <span className="text-red-500">*</span>
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select expenses to allocate payment (FIFO by due date)
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {!form.liabilityLedgerId ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  Select a liability account to load open expenses.
                </p>
              ) : loadingExpenses ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Loading expenses…</p>
              ) : openExpenses.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No open expenses for this liability account.
                </p>
              ) : (
                <>
                  <div className="border rounded-md divide-y text-xs overflow-x-auto">
                    <div className="grid grid-cols-[2rem_1fr_5.5rem_5.5rem_7rem] gap-2 px-3 py-2 bg-muted/40 font-medium text-muted-foreground min-w-[32rem]">
                      <span />
                      <span>Expense</span>
                      <span className="text-right">Amount</span>
                      <span className="text-right">Outstanding</span>
                      <span className="text-right">Pay Now</span>
                    </div>
                    {openExpenses.map((exp) => {
                      const selected = selectedExpenseIds.includes(exp.id);
                      return (
                        <div
                          key={exp.id}
                          className="grid grid-cols-[2rem_1fr_5.5rem_5.5rem_7rem] gap-2 items-center px-3 py-2 min-w-[32rem]"
                        >
                          <Checkbox
                            checked={selected}
                            onCheckedChange={() => toggleExpense(exp.id)}
                          />
                          <div>
                            <p className="font-medium">{exp.expenseNumber}</p>
                            <p className="text-muted-foreground">{exp.description}</p>
                          </div>
                          <span className="text-right font-mono">{fmt(exp.amount)}</span>
                          <span className="text-right font-mono text-orange-600">{fmt(exp.outstanding)}</span>
                          {selected ? (
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              max={exp.outstanding}
                              className="h-7 text-xs text-right"
                              value={allocations[exp.id] ?? ""}
                              onChange={(e) =>
                                setManualOverrides((prev) => ({
                                  ...prev,
                                  [exp.id]: e.target.value,
                                }))
                              }
                            />
                          ) : (
                            <span className="text-right text-muted-foreground">—</span>
                          )}
                        </div>
                      );
                    })}
                    {selectedExpenses.length > 0 && (
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
                      Payment exceeds selected expense outstanding by <strong>{fmt(excess)}</strong>.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 px-6 py-4 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !canSave}>
            {saving ? "Saving…" : "Record Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
