import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { recordPayment } from "@/services/invoice";
import { getCashBankLedgers } from "@/services/ledger";
import { fmt, PAYMENT_METHODS } from "./Billing.constants";

export default function RecordPaymentDialog({ invoice, open, onClose, amountLocked = false }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");
  const [bankLedgerId, setBankLedgerId] = useState(null);

  const remaining = invoice ? invoice.totalAmount - invoice.paidAmount : 0;

  // Pre-fill amount when amountLocked is true and dialog opens
  useEffect(() => {
    if (open && amountLocked && remaining > 0) {
      setAmount(String(remaining));
    }
  }, [open, amountLocked, remaining]);

  const { data: ledgers = [] } = useQuery({
    queryKey: ["cash-bank-ledgers"],
    queryFn: getCashBankLedgers,
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: ({ id, data }) => recordPayment(id, data),
    onSuccess: () => {
      toast.success("Payment recorded successfully");
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoices-stats"] });
      qc.invalidateQueries({ queryKey: ["invoice", invoice?.id] });
      handleClose();
    },
    onError: (err) => toast.error(err?.message || "Failed to record payment"),
  });

  const handleClose = () => {
    setAmount("");
    setMethod("CASH");
    setReferenceNo("");
    setNotes("");
    setBankLedgerId(null);
    onClose();
  };

  const handleSubmit = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (amt > remaining + 0.01)
      return toast.error(`Amount cannot exceed remaining balance ${fmt(remaining)}`);
    const payload = {
      amount: amt,
      method,
      referenceNo: referenceNo || undefined,
      notes: notes || undefined,
    };
    if (bankLedgerId) {
      payload.bankLedgerId = parseInt(bankLedgerId);
    }
    mutation.mutate({ id: invoice.id, data: payload });
  };

  if (!invoice) return null;

  const isSubmitDisabled = !bankLedgerId || mutation.isPending || ledgers.length === 0;

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
            <div>
              <span className="text-muted-foreground">Total</span>
              <p className="font-bold">{fmt(invoice.totalAmount)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Paid so far</span>
              <p className="font-bold text-green-600">{fmt(invoice.paidAmount)}</p>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Remaining</span>
              <p className="font-bold text-orange-600 text-lg">{fmt(remaining)}</p>
            </div>
          </div>

          <div className="space-y-1">
            <Label>
              Amount (₹) <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => !amountLocked && setAmount(e.target.value)}
              placeholder={`Max ${fmt(remaining)}`}
              readOnly={amountLocked}
              disabled={amountLocked}
            />
          </div>

          <div className="space-y-1">
            <Label>
              Payment Method <span className="text-red-500">*</span>
            </Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>
              Received Into <span className="text-red-500">*</span>
            </Label>
            {ledgers.length === 0 ? (
              <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  No bank/cash accounts configured. Please add a ledger in Accounts → Chart of
                  Accounts first.
                </span>
              </div>
            ) : (
              <Select
                value={bankLedgerId ? String(bankLedgerId) : ""}
                onValueChange={(v) => setBankLedgerId(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select bank / cash account" />
                </SelectTrigger>
                <SelectContent>
                  {ledgers.map((ledger) => (
                    <SelectItem key={ledger.id} value={String(ledger.id)}>
                      {ledger.name} ({ledger.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {["UPI", "CARD", "BANK_TRANSFER", "CHECK"].includes(method) && (
            <div className="space-y-1">
              <Label>Reference No.</Label>
              <Input
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="Transaction / cheque number"
              />
            </div>
          )}

          <div className="space-y-1">
            <Label>Notes</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional remarks"
            />
          </div>

          {parseFloat(amount) >= remaining && remaining > 0 && (
            <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded p-2">
              ✓ This payment will fully settle the invoice and mark all linked sale orders as{" "}
              <strong>COMPLETED</strong>.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitDisabled}>
            {mutation.isPending ? "Recording…" : "Record Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
