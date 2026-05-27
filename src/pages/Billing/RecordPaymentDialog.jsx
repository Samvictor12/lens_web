import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CreditCard } from "lucide-react";
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
import { fmt, PAYMENT_METHODS } from "./Billing.constants";

export default function RecordPaymentDialog({ invoice, open, onClose }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");

  const remaining = invoice ? invoice.totalAmount - invoice.paidAmount : 0;

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
    onClose();
  };

  const handleSubmit = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (amt > remaining + 0.01)
      return toast.error(`Amount cannot exceed remaining balance ${fmt(remaining)}`);
    mutation.mutate({
      id: invoice.id,
      data: {
        amount: amt,
        method,
        referenceNo: referenceNo || undefined,
        notes: notes || undefined,
      },
    });
  };

  if (!invoice) return null;

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
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Max ${fmt(remaining)}`}
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
              <strong>BILLED</strong>.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? "Recording…" : "Record Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
