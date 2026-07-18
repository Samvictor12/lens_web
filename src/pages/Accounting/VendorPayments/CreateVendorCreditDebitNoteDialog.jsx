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
import { FormSelect } from "@/components/ui/form-select";
import { useToast } from "@/hooks/use-toast";
import { createVendorCreditNote, createVendorDebitNote } from "@/services/vendorCreditDebitNote";

const emptyForm = {
  vendorId: "",
  vendorInvoiceId: "",
  amount: "",
  taxAmount: "",
  reason: "",
  noteDate: new Date().toISOString().split("T")[0],
};

/**
 * Shared create dialog for Vendor Credit Note / Debit Note (M5).
 * type: 'credit' | 'debit'
 */
export default function CreateVendorCreditDebitNoteDialog({ open, onOpenChange, type = "credit", vendors = [], onCreated }) {
  const { toast } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const isCredit = type === "credit";
  const label = isCredit ? "Credit Note" : "Debit Note";

  useEffect(() => {
    if (open) setForm(emptyForm);
  }, [open, type]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    if (!form.vendorId) {
      toast({ variant: "destructive", title: "Select a vendor" });
      return;
    }
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) {
      toast({ variant: "destructive", title: "Enter a valid amount" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        vendorId: parseInt(form.vendorId, 10),
        vendorInvoiceId: form.vendorInvoiceId ? parseInt(form.vendorInvoiceId, 10) : undefined,
        amount,
        taxAmount: form.taxAmount ? parseFloat(form.taxAmount) : 0,
        reason: form.reason || undefined,
        noteDate: form.noteDate,
      };
      const res = isCredit ? await createVendorCreditNote(payload) : await createVendorDebitNote(payload);
      if (res.success) {
        toast({ title: `${label} created`, description: res.data?.noteNumber });
        onOpenChange(false);
        onCreated?.();
      }
    } catch (e) {
      toast({ variant: "destructive", title: `Failed to create ${label.toLowerCase()}`, description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New {label}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>
              Vendor <span className="text-red-500">*</span>
            </Label>
            <FormSelect
              name="vendorId"
              options={vendors}
              value={form.vendorId}
              onChange={(value) => set("vendorId", value ?? "")}
              placeholder="Select vendor"
              isSearchable
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>
                Amount <span className="text-red-500">*</span>
              </Label>
              <Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => set("amount", e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-1">
              <Label>Tax Amount</Label>
              <Input type="number" min="0" step="0.01" value={form.taxAmount} onChange={(e) => set("taxAmount", e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Note Date</Label>
            <Input type="date" value={form.noteDate} onChange={(e) => set("noteDate", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Vendor Invoice ID (optional)</Label>
            <Input
              type="number"
              min="1"
              value={form.vendorInvoiceId}
              onChange={(e) => set("vendorInvoiceId", e.target.value)}
              placeholder="Leave blank if not linked to an invoice"
            />
          </div>
          <div className="space-y-1">
            <Label>Reason</Label>
            <Textarea value={form.reason} onChange={(e) => set("reason", e.target.value)} placeholder={`Reason for this ${label.toLowerCase()}`} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : `Create ${label}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
