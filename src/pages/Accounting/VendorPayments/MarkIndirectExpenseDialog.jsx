import { useEffect, useState } from "react";
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
import { createVendorIndirectExpense } from "@/services/vendorIndirectExpense";
import { getExpenseCategories } from "@/services/expense";

const emptyForm = {
  vendorId: "",
  categoryId: "",
  amount: "",
  dueDate: "",
  description: "",
  referenceNo: "",
  notes: "",
};

export default function MarkIndirectExpenseDialog({
  open,
  onOpenChange,
  vendors = [],
  initialVendorId = "",
  onCreated,
}) {
  const { toast } = useToast();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      ...emptyForm,
      vendorId: initialVendorId ? String(initialVendorId) : "",
    });
  }, [open, initialVendorId]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await getExpenseCategories();
        const list = res?.data || res || [];
        setCategories(
          (Array.isArray(list) ? list : []).filter(
            (c) => c.expenseType === "INDIRECT" || !c.expenseType
          )
        );
      } catch {
        // non-critical
      }
    })();
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.vendorId || !form.categoryId || !form.amount || !form.description) {
      toast({
        variant: "destructive",
        title: "Vendor, category, amount, and description are required",
      });
      return;
    }
    setSaving(true);
    try {
      await createVendorIndirectExpense({
        vendorId: parseInt(form.vendorId, 10),
        categoryId: parseInt(form.categoryId, 10),
        amount: parseFloat(form.amount),
        dueDate: form.dueDate || undefined,
        description: form.description,
        referenceNo: form.referenceNo || undefined,
        notes: form.notes || undefined,
      });
      toast({ title: "Indirect expense marked" });
      onOpenChange(false);
      onCreated?.();
    } catch (err) {
      toast({
        variant: "destructive",
        title: err?.response?.data?.message || "Failed to mark expense",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[75vw] !max-w-[75vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mark Indirect Expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 py-2">
          <div className="space-y-1">
            <Label className="text-xs">
              Vendor <span className="text-red-500">*</span>
            </Label>
            <FormSelect
              options={vendors}
              value={form.vendorId || null}
              onChange={(v) => setForm((f) => ({ ...f, vendorId: v != null ? String(v) : "" }))}
              placeholder="Select vendor"
              isSearchable
              menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
              menuPosition="fixed"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">
              Category <span className="text-red-500">*</span>
            </Label>
            <FormSelect
              options={categories}
              value={form.categoryId || null}
              onChange={(v) => setForm((f) => ({ ...f, categoryId: v != null ? String(v) : "" }))}
              placeholder="Indirect category"
              isSearchable
              menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
              menuPosition="fixed"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">
              Amount <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              step="0.01"
              className="h-8"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Due date</Label>
            <Input
              type="date"
              className="h-8"
              value={form.dueDate}
              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">
              Description <span className="text-red-500">*</span>
            </Label>
            <Input
              className="h-8"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Reference No.</Label>
            <Input
              className="h-8"
              value={form.referenceNo}
              onChange={(e) => setForm((f) => ({ ...f, referenceNo: e.target.value }))}
            />
          </div>
          <div className="space-y-1 sm:col-span-2 lg:col-span-3">
            <Label className="text-xs">Notes</Label>
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <DialogFooter className="sm:col-span-2 lg:col-span-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Mark liability"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
