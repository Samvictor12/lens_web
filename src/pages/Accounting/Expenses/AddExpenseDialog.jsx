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
import { createExpense, updateExpense } from "@/services/expense";
import { emptyExpenseForm } from "./Expenses.constants";

export default function AddExpenseDialog({ open, onOpenChange, categories, bankLedgers, onCreated, editing = null }) {
  const { toast } = useToast();
  const [form, setForm] = useState(emptyExpenseForm);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(editing?.id);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        categoryId: String(editing.categoryId ?? editing.category?.id ?? ""),
        description: editing.description || "",
        amount: String(editing.amount ?? ""),
        expenseDate: editing.expenseDate
          ? new Date(editing.expenseDate).toISOString().split("T")[0]
          : emptyExpenseForm.expenseDate,
        paidTo: editing.paidTo || "",
        bankLedgerId: String(editing.bankLedgerId ?? editing.bankLedger?.id ?? ""),
        notes: editing.notes || "",
      });
    } else {
      setForm(emptyExpenseForm);
    }
  }, [open, editing]);

  const handleSave = async () => {
    if (!form.categoryId || !form.amount) {
      toast({ variant: "destructive", title: "Category and amount are required" });
      return;
    }
    if (parseFloat(form.amount) <= 0) {
      toast({ variant: "destructive", title: "Amount must be greater than zero" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        categoryId: parseInt(form.categoryId),
        description: form.description || undefined,
        amount: parseFloat(form.amount),
        expenseDate: form.expenseDate,
        paidTo: form.paidTo || undefined,
        bankLedgerId: form.bankLedgerId ? parseInt(form.bankLedgerId) : undefined,
        notes: form.notes || undefined,
      };
      if (isEdit) {
        await updateExpense(editing.id, payload);
        toast({ title: "Expense updated" });
      } else {
        await createExpense(payload);
        toast({ title: "Expense recorded" });
      }
      setForm(emptyExpenseForm);
      onCreated();
      onOpenChange(false);
    } catch (e) {
      toast({ variant: "destructive", title: e?.message || "Failed to record expense" });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setForm(emptyExpenseForm);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Expense" : "Add Expense"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Category *</Label>
              <Select value={form.categoryId} onValueChange={(v) => set("categoryId", v)}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Date *</Label>
              <Input
                type="date"
                value={form.expenseDate}
                onChange={(e) => set("expenseDate", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Description</Label>
            <Input
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Brief description of the expense"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Amount (₹) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1">
              <Label>Paid To</Label>
              <Input
                value={form.paidTo}
                onChange={(e) => set("paidTo", e.target.value)}
                placeholder="Person / vendor name"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Payment Account</Label>
            <Select value={form.bankLedgerId} onValueChange={(v) => set("bankLedgerId", v)}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Cash / Bank account" />
              </SelectTrigger>
              <SelectContent>
                {bankLedgers.map((l) => (
                  <SelectItem key={l.id} value={String(l.id)}>
                    {l.ledgerName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Record Expense"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
