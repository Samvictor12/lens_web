import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormSelect } from "@/components/ui/form-select";
import { useToast } from "@/hooks/use-toast";
import {
  createCustomerPayment,
  getCustomerPayments,
  getOutstandingInvoices,
} from "@/services/customerPayment";
import { getCashBankLedgers } from "@/services/ledger";
import { getCustomerById, getCustomerDropdown } from "@/services/customer";
import { formatCashBankLedgerLabel } from "@/utils/cashBankLedgerLabel";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  emptyPaymentForm,
  previewAllocations,
} from "@/pages/Accounting/CustomerPayments/CustomerPayments.constants";
import { BILLING_AND_INVOICING_PATH } from "@/constants/accountingPaths";

function fmt(n) {
  return `₹${parseFloat(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

function round2(n) {
  return Math.round(parseFloat(n || 0) * 100) / 100;
}

/**
 * Full-page Record Payment — 5 sections per PRD-4.1 / FD-2.1.
 */
export default function RecordPaymentPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const urlCustomerId = searchParams.get("customerId") || "";
  const urlInvoiceId = searchParams.get("invoiceId");
  const urlInvoiceIds = searchParams.get("invoiceIds");
  const urlAmount = searchParams.get("amount") || "";

  const preselectedIds = useMemo(() => {
    if (urlInvoiceIds) {
      return urlInvoiceIds
        .split(",")
        .map((x) => parseInt(x, 10))
        .filter((n) => !Number.isNaN(n));
    }
    if (urlInvoiceId) return [parseInt(urlInvoiceId, 10)];
    return [];
  }, [urlInvoiceId, urlInvoiceIds]);

  const [customers, setCustomers] = useState([]);
  const [bankLedgers, setBankLedgers] = useState([]);
  const [allOutstanding, setAllOutstanding] = useState([]);
  const [customerDetail, setCustomerDetail] = useState(null);
  const [lastPayment, setLastPayment] = useState(null);
  const [form, setForm] = useState({
    ...emptyPaymentForm,
    customerId: urlCustomerId,
    totalAmount: urlAmount,
  });
  const [applyAdvance, setApplyAdvance] = useState(false);
  const [applyAdvanceAmount, setApplyAdvanceAmount] = useState("");
  const [allocations, setAllocations] = useState({});
  const [manualOverrides, setManualOverrides] = useState({});
  const [acceptAdvance, setAcceptAdvance] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState(preselectedIds);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  useEffect(() => {
    (async () => {
      try {
        const [custRes, ledgers, outRes] = await Promise.all([
          getCustomerDropdown(),
          getCashBankLedgers(),
          getOutstandingInvoices({ groupBy: "flat" }),
        ]);
        if (custRes.success) setCustomers(custRes.data || []);
        setBankLedgers(Array.isArray(ledgers) ? ledgers : []);
        setAllOutstanding(outRes.data?.invoices || []);
      } catch {
        toast({ variant: "destructive", title: "Failed to load payment form data" });
      }
    })();
  }, [toast]);

  useEffect(() => {
    if (!form.customerId) {
      setCustomerDetail(null);
      setLastPayment(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [custRes, payRes] = await Promise.all([
          getCustomerById(form.customerId),
          getCustomerPayments({ customerId: form.customerId, page: 1, limit: 1 }),
        ]);
        if (cancelled) return;
        setCustomerDetail(custRes.data || null);
        setLastPayment((payRes.data || [])[0] || null);
      } catch {
        if (!cancelled) {
          setCustomerDetail(null);
          setLastPayment(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [form.customerId]);

  useEffect(() => {
    if (preselectedIds.length) setSelectedInvoiceIds(preselectedIds);
  }, [preselectedIds]);

  const customerInvoices = useMemo(() => {
    if (!form.customerId) return [];
    return allOutstanding.filter(
      (inv) => String(inv.customerId) === String(form.customerId)
    );
  }, [allOutstanding, form.customerId]);

  const selectedInvoices = useMemo(() => {
    if (selectedInvoiceIds.length) {
      return customerInvoices.filter((inv) => selectedInvoiceIds.includes(inv.id));
    }
    return customerInvoices;
  }, [customerInvoices, selectedInvoiceIds]);

  useEffect(() => {
    if (!form.customerId) return;
    if (!selectedInvoiceIds.length && customerInvoices.length) {
      // default select all for customer when none preselected
      if (!preselectedIds.length) {
        setSelectedInvoiceIds(customerInvoices.map((i) => i.id));
      }
    }
  }, [form.customerId, customerInvoices, selectedInvoiceIds.length, preselectedIds.length]);

  const amountDue = useMemo(
    () => round2(customerInvoices.reduce((s, inv) => s + (inv.outstanding || 0), 0)),
    [customerInvoices]
  );

  const availableAdvance = round2(customerDetail?.advanceCredit || 0);
  const priorApply = applyAdvance
    ? Math.min(round2(applyAdvanceAmount || 0), availableAdvance)
    : 0;
  const cashAmount = round2(form.totalAmount || 0);
  const pool = round2(cashAmount + priorApply);

  const { allocations: preview, remaining: excess } = useMemo(() => {
    if (!pool || !selectedInvoices.length) {
      return { allocations: {}, remaining: 0 };
    }
    return previewAllocations(selectedInvoices, pool, manualOverrides);
  }, [selectedInvoices, pool, manualOverrides]);

  useEffect(() => {
    setAllocations(preview);
  }, [preview]);

  const allocationSum = useMemo(
    () =>
      round2(
        Object.values(allocations).reduce((s, v) => s + (parseFloat(v) || 0), 0)
      ),
    [allocations]
  );

  const newAdvance = acceptAdvance && excess > 0.01 ? excess : 0;
  const balanceDue = round2(Math.max(0, amountDue - allocationSum));

  const canSave =
    form.customerId &&
    selectedInvoices.length > 0 &&
    pool > 0 &&
    (cashAmount <= 0 || form.bankLedgerId) &&
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

    if (!items.length) {
      toast({ variant: "destructive", title: "Allocate payment to at least one invoice" });
      return;
    }

    setSaving(true);
    try {
      await createCustomerPayment({
        customerId: parseInt(form.customerId, 10),
        bankLedgerId: form.bankLedgerId ? parseInt(form.bankLedgerId, 10) : undefined,
        paymentDate: form.paymentDate,
        paymentMethod: form.paymentMethod,
        referenceNo: form.referenceNumber || undefined,
        notes: form.notes || undefined,
        totalAmount: cashAmount,
        applyAdvanceAmount: priorApply > 0 ? priorApply : 0,
        advanceAmount: newAdvance,
        acceptAdvance: newAdvance > 0,
        items,
      });
      toast({ title: "Payment recorded" });
      navigate(`${BILLING_AND_INVOICING_PATH}?tab=payments`);
    } catch (e) {
      toast({ variant: "destructive", title: e?.message || "Failed to record payment" });
    } finally {
      setSaving(false);
    }
  };

  const dueDays =
    customerDetail?.creditDays ??
    selectedInvoices[0]?.customer?.credit_days ??
    "—";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-1 sm:p-1 md:p-3 gap-3">
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          variant="ghost"
          size="xs"
          className="h-8 gap-1"
          onClick={() => navigate(BILLING_AND_INVOICING_PATH)}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Button>
        <div>
          <h1 className="text-lg sm:text-xl font-bold">Record Payment</h1>
          <p className="text-xs text-muted-foreground">
            Apply advance · receive cash/bank · FIFO allocate
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto space-y-3 pb-4">
        {/* 1. Customer select */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">1. Customer</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <FormSelect
              options={customers}
              value={form.customerId || null}
              onChange={(val) => {
                set("customerId", val != null && val !== "" ? String(val) : "");
                setSelectedInvoiceIds([]);
                setManualOverrides({});
                setApplyAdvance(false);
                setApplyAdvanceAmount("");
              }}
              placeholder="Search customer…"
              isSearchable
              isClearable
            />
          </CardContent>
        </Card>

        {/* 2. Customer details */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">2. Customer details</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Amount Due</div>
                <div className="text-lg font-bold text-orange-600">{fmt(amountDue)}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Last Payment</div>
                <div className="text-lg font-bold">
                  {lastPayment ? fmt(lastPayment.totalAmount) : "—"}
                </div>
                {lastPayment && (
                  <div className="text-xs text-muted-foreground">
                    {new Date(lastPayment.paymentDate).toLocaleDateString("en-IN")}
                  </div>
                )}
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Due Days</div>
                <div className="text-lg font-bold">{dueDays}</div>
                {availableAdvance > 0 && (
                  <div className="text-xs text-blue-600 mt-1">
                    Advance credit: {fmt(availableAdvance)}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Payment details + apply prior advance */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">3. Payment details</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 space-y-3">
            {availableAdvance > 0.01 && (
              <div className="rounded-md border border-blue-200 bg-blue-50 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="apply-advance"
                    checked={applyAdvance}
                    onCheckedChange={(v) => {
                      setApplyAdvance(!!v);
                      if (v && !applyAdvanceAmount) {
                        setApplyAdvanceAmount(
                          String(Math.min(availableAdvance, amountDue).toFixed(2))
                        );
                      }
                    }}
                  />
                  <label htmlFor="apply-advance" className="text-sm cursor-pointer">
                    Apply prior advance credit ({fmt(availableAdvance)})
                  </label>
                </div>
                {applyAdvance && (
                  <div className="space-y-1 max-w-xs">
                    <Label className="text-xs">Advance to apply</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      max={availableAdvance}
                      className="h-8"
                      value={applyAdvanceAmount}
                      onChange={(e) => setApplyAdvanceAmount(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>
                  Cash / Bank Amount {cashAmount > 0 || priorApply <= 0 ? (
                    <span className="text-red-500">*</span>
                  ) : null}
                </Label>
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
                <Label>
                  Payment Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={form.paymentDate}
                  onChange={(e) => set("paymentDate", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>
                  Payment Method <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={form.paymentMethod}
                  onValueChange={(v) => set("paymentMethod", v)}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {PAYMENT_METHOD_LABELS[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>
                  Receiving Account{" "}
                  {cashAmount > 0 && <span className="text-red-500">*</span>}
                </Label>
                <Select
                  value={form.bankLedgerId}
                  onValueChange={(v) => set("bankLedgerId", v)}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Cash / Bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankLedgers.map((l) => (
                      <SelectItem key={l.id} value={String(l.id)}>
                        {formatCashBankLedgerLabel(l)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Reference No.</Label>
                <Input
                  value={form.referenceNumber}
                  onChange={(e) => set("referenceNumber", e.target.value)}
                  placeholder="Cheque / UTR"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  rows={2}
                  placeholder="Optional notes"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4. FIFO allocation */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">4. Invoice allocation (FIFO by due date)</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            {!form.customerId ? (
              <p className="text-sm text-muted-foreground">Select a customer first.</p>
            ) : selectedInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No outstanding invoices for this customer.
              </p>
            ) : (
              <div className="border rounded-md divide-y text-xs">
                <div className="grid grid-cols-[auto_1fr_auto_auto] gap-2 px-3 py-2 bg-muted/40 font-medium text-muted-foreground">
                  <span />
                  <span>Invoice</span>
                  <span className="text-right">Outstanding</span>
                  <span className="text-right w-28">Allocate</span>
                </div>
                {selectedInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="grid grid-cols-[auto_1fr_auto_auto] gap-2 items-center px-3 py-2"
                  >
                    <Checkbox
                      checked={selectedInvoiceIds.includes(inv.id)}
                      onCheckedChange={(checked) => {
                        setSelectedInvoiceIds((prev) =>
                          checked
                            ? [...prev, inv.id]
                            : prev.filter((id) => id !== inv.id)
                        );
                      }}
                    />
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
              </div>
            )}

            {excess > 0.01 && (
              <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 space-y-2 text-sm">
                <p className="text-amber-800">
                  Payment exceeds selected invoice outstanding by{" "}
                  <strong>{fmt(excess)}</strong>.
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
          </CardContent>
        </Card>

        {/* 5. Payment summary */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">5. Payment summary</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Received (cash/bank)</div>
                <div className="font-semibold">{fmt(cashAmount)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Prior advance applied</div>
                <div className="font-semibold">{fmt(priorApply)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Allocated to invoices</div>
                <div className="font-semibold">{fmt(allocationSum)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">New advance / Balance due</div>
                <div className="font-semibold">
                  {newAdvance > 0 ? `Adv ${fmt(newAdvance)}` : fmt(balanceDue)}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => navigate(BILLING_AND_INVOICING_PATH)}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving || !canSave}>
                {saving ? "Saving…" : `Record ${fmt(pool)}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
