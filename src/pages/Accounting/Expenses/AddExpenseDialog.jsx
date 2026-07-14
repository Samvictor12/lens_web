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

  const activeCategories = useMemo(
    () =>
      (categories || []).filter(
        (c) => c.active_status !== false && c.delete_status !== true
      ),
    [categories]
  );

  const selectedCategory = useMemo(
    () => activeCategories.find((c) => String(c.id) === String(form.categoryId)),
    [activeCategories, form.categoryId]
  );

  const expenseTypeLabel = selectedCategory?.expenseType || "—";

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
        dueDate: editing.dueDate
          ? new Date(editing.dueDate).toISOString().split("T")[0]
          : "",
        paidTo: editing.paidTo || "",
        bankLedgerId: String(editing.bankLedgerId ?? editing.bankLedger?.id ?? ""),
        paymentMethod: editing.paymentMethod || "CASH",
        notes: editing.notes || "",
      });
    } else {
      setForm(emptyExpenseForm);
    }
  }, [open, editing]);

  const handleCategoryChange = (v) => {
    setForm((f) => ({ ...f, categoryId: v }));
  };

  const handleSave = async () => {
    if (!form.categoryId || !form.amount) {
      toast({ variant: "destructive", title: "Category and amount are required" });
      return;
    }
    if (parseFloat(form.amount) <= 0) {
      toast({ variant: "destructive", title: "Amount must be greater than zero" });
      return;
    }
    if (!form.bankLedgerId) {
      toast({ variant: "destructive", title: "Payment Account is required" });
      return;
    }
    setSaving(true);
    try {
      const catName = selectedCategory?.name || "Expense";
      const payload = {
        categoryId: parseInt(form.categoryId),
        description: form.description?.trim() || catName,
        amount: parseFloat(form.amount),
        expenseDate: form.expenseDate,
        dueDate: form.dueDate || undefined,
        paidTo: form.paidTo || undefined,
        bankLedgerId: parseInt(form.bankLedgerId),
        paymentMethod: form.paymentMethod || "CASH",
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
              <Label>Category <span className="text-red-500">*</span></Label>
              <Select value={form.categoryId} onValueChange={handleCategoryChange}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {activeCategories.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      No expense categories
                    </SelectItem>
                  ) : (
                    activeCategories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Input
                value={expenseTypeLabel}
                readOnly
                tabIndex={-1}
                className="bg-muted text-sm"
                placeholder="Auto from category"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Date <span className="text-red-500">*</span></Label>
              <Input
                type="date"
                value={form.expenseDate}
                onChange={(e) => set("expenseDate", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => set("dueDate", e.target.value)}
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
              <Label>Amount (₹) <span className="text-red-500">*</span></Label>
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
            <Label>Payment Account <span className="text-red-500">*</span></Label>
            <Select value={form.bankLedgerId} onValueChange={(v) => set("bankLedgerId", v)}>
              <SelectTrigger className="text-sm">
                <SelectValue
                  placeholder={
                    bankLedgers?.length
                      ? "Cash / Bank account"
                      : "No cash/bank ledgers found"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {(bankLedgers || []).length === 0 ? (
                  <SelectItem value="__none" disabled>
                    No cash/bank ledgers available
                  </SelectItem>
                ) : (
                  bankLedgers.map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>
                      {l.ledgerName}
                    </SelectItem>
                  ))
                )}
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
