import { useState, useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { createIncome } from "@/services/income";
import { formatCashBankLedgerLabel } from "@/utils/cashBankLedgerLabel";
import { emptyIncomeForm } from "./Income.constants";

export default function AddIncomeDialog({
  open,
  onOpenChange,
  mode = "income",
  loanCategory,
  defaultIncomeCategory,
  fromLedgers,
  toLedgers,
  onCreated,
}) {
  const { toast } = useToast();
  const [form, setForm] = useState(emptyIncomeForm);
  const [saving, setSaving] = useState(false);
  const isLoans = mode === "loans";

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const resolvedCategoryId = isLoans ? loanCategory?.id : defaultIncomeCategory?.id;

  const fromOptions = fromLedgers || [];
  const toOptions = toLedgers || [];

  useEffect(() => {
    if (!open) return;
    const base = { ...emptyIncomeForm };
    if (resolvedCategoryId) {
      base.categoryId = String(resolvedCategoryId);
    }
    setForm(base);
  }, [open, resolvedCategoryId]);

  const handleSave = async () => {
    const categoryId = resolvedCategoryId || form.categoryId;

    if (!categoryId || !form.amount || !form.description || !form.fromLedgerId || !form.toLedgerId) {
      toast({
        variant: "destructive",
        title: isLoans
          ? "Amount, description, From and To are required (Loan category must exist)"
          : "Amount, description, From and To are required",
      });
      return;
    }
    if (form.fromLedgerId === form.toLedgerId) {
      toast({ variant: "destructive", title: "From and To ledgers must be different" });
      return;
    }
    if (parseFloat(form.amount) <= 0) {
      toast({ variant: "destructive", title: "Amount must be greater than zero" });
      return;
    }
    setSaving(true);
    try {
      const res = await createIncome({
        categoryId: parseInt(categoryId, 10),
        description: form.description,
        amount: parseFloat(form.amount),
        incomeDate: form.incomeDate,
        fromLedgerId: parseInt(form.fromLedgerId, 10),
        toLedgerId: parseInt(form.toLedgerId, 10),
        paymentMethod: form.paymentMethod || "CASH",
        referenceNo: form.referenceNo || null,
        notes: form.notes || null,
      });
      if (res.success) {
        toast({ title: isLoans ? "Loan recorded" : "Income recorded" });
        onOpenChange(false);
        onCreated?.();
      }
    } catch (e) {
      toast({
        variant: "destructive",
        title: e?.response?.data?.message || e.message || "Failed to save",
      });
    } finally {
      setSaving(false);
    }
  };

  const ledgerLabel = (l) => {
    const group = l.accountGroup?.groupName || l.accountGroup?.groupCode;
    const name = group ? `${l.ledgerName} (${group})` : l.ledgerName;
    return formatCashBankLedgerLabel({ ...l, ledgerName: name });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isLoans ? "Record Loan" : "Record Income"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="space-y-1">
            <Label>
              Date <span className="text-red-500">*</span>
            </Label>
            <Input
              type="date"
              value={form.incomeDate}
              onChange={(e) => set("incomeDate", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>
              Description <span className="text-red-500">*</span>
            </Label>
            <Input
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>
              Amount <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>
              From <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.fromLedgerId || undefined}
              onValueChange={(v) => set("fromLedgerId", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoans ? "Select loan ledger" : "Select capital ledger"} />
              </SelectTrigger>
              <SelectContent>
                {fromOptions.map((l) => (
                  <SelectItem key={l.id} value={String(l.id)}>
                    {ledgerLabel(l)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>
              To <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.toLedgerId || undefined}
              onValueChange={(v) => set("toLedgerId", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select cash/bank account" />
              </SelectTrigger>
              <SelectContent>
                {toOptions.map((l) => (
                  <SelectItem key={l.id} value={String(l.id)}>
                    {ledgerLabel(l)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Reference No.</Label>
            <Input
              value={form.referenceNo}
              onChange={(e) => set("referenceNo", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
