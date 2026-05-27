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
import { FormSelect } from "@/components/ui/form-select";
import { useToast } from "@/hooks/use-toast";
import { createVendorPayment, getOutstandingPOs } from "@/services/vendorPayment";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, emptyPaymentForm } from "./VendorPayments.constants";

export default function CreateVendorPaymentDialog({
  open,
  onOpenChange,
  vendors,
  bankLedgers,
  onCreated,
}) {
  const { toast } = useToast();
  const [form, setForm] = useState(emptyPaymentForm);
  const [saving, setSaving] = useState(false);

  // Outstanding POs for selected vendor
  const [outstandingPOs, setOutstandingPOs] = useState([]);
  const [loadingPOs, setLoadingPOs] = useState(false);
  const [allocations, setAllocations] = useState({}); // { poId: amountString }

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  // Load outstanding POs when vendor changes
  useEffect(() => {
    if (!form.vendorId) {
      setOutstandingPOs([]);
      setAllocations({});
      return;
    }
    setLoadingPOs(true);
    getOutstandingPOs(form.vendorId)
      .then((res) => {
        const pos = res.data || [];
        setOutstandingPOs(pos);
        // Pre-fill allocations with outstanding amount
        const init = {};
        pos.forEach((po) => {
          init[po.id] = String(parseFloat(po.outstandingAmount || 0).toFixed(2));
        });
        setAllocations(init);
      })
      .catch(() => {
        toast({ variant: "destructive", title: "Failed to load outstanding POs" });
      })
      .finally(() => setLoadingPOs(false));
  }, [form.vendorId]);

  const setAllocation = (poId, val) =>
    setAllocations((prev) => ({ ...prev, [poId]: val }));

  const totalAllocated = outstandingPOs.reduce((sum, po) => {
    const v = parseFloat(allocations[po.id] || 0);
    return sum + (isNaN(v) ? 0 : v);
  }, 0);

  const handleSave = async () => {
    if (!form.vendorId) {
      toast({ variant: "destructive", title: "Please select a vendor" });
      return;
    }
    if (!form.bankLedgerId) {
      toast({ variant: "destructive", title: "Please select a payment account" });
      return;
    }
    if (totalAllocated <= 0) {
      toast({ variant: "destructive", title: "Total payment amount must be greater than zero" });
      return;
    }

    const items = outstandingPOs
      .filter((po) => parseFloat(allocations[po.id] || 0) > 0)
      .map((po) => ({
        purchaseOrderId: po.id,
        amount: parseFloat(allocations[po.id]),
      }));

    setSaving(true);
    try {
      await createVendorPayment({
        vendorId: parseInt(form.vendorId),
        bankLedgerId: parseInt(form.bankLedgerId),
        paymentDate: form.paymentDate,
        paymentMethod: form.paymentMethod,
        referenceNumber: form.referenceNumber || undefined,
        notes: form.notes || undefined,
        totalAmount: totalAllocated,
        items,
      });
      toast({ title: "Payment recorded" });
      setForm(emptyPaymentForm);
      setAllocations({});
      onCreated();
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
    setOutstandingPOs([]);
    onOpenChange(false);
  };

  // Map vendors to react-select options (id/name)
  const vendorOptions = vendors.map((v) => ({ id: v.id, name: v.name }));
  const selectedVendor = vendorOptions.find((v) => String(v.id) === String(form.vendorId)) || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Vendor Payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Vendor select (searchable) */}
          <div className="space-y-1">
            <Label>Vendor *</Label>
            <FormSelect
              options={vendorOptions}
              value={selectedVendor}
              onChange={(opt) => set("vendorId", opt ? String(opt.id) : "")}
              placeholder="Search vendor..."
              isSearchable={true}
              isClearable={true}
              menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
              menuPosition="fixed"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Payment Date *</Label>
              <Input
                type="date"
                value={form.paymentDate}
                onChange={(e) => set("paymentDate", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Payment Method *</Label>
              <Select value={form.paymentMethod} onValueChange={(v) => set("paymentMethod", v)}>
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Payment Account *</Label>
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
              <Label>Reference No.</Label>
              <Input
                value={form.referenceNumber}
                onChange={(e) => set("referenceNumber", e.target.value)}
                placeholder="Cheque / transaction ref"
              />
            </div>
          </div>

          {/* Outstanding POs */}
          {form.vendorId && (
            <div className="space-y-2">
              <Label>Allocate to Purchase Orders</Label>
              {loadingPOs ? (
                <p className="text-xs text-muted-foreground py-2">Loading outstanding POs...</p>
              ) : outstandingPOs.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  No outstanding purchase orders for this vendor.
                </p>
              ) : (
                <div className="border rounded-md divide-y text-xs">
                  <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-2 bg-muted/40 font-medium text-muted-foreground">
                    <span>PO Number</span>
                    <span className="text-right pr-2">Outstanding</span>
                    <span className="w-28 text-right">Allocate</span>
                  </div>
                  {outstandingPOs.map((po) => (
                    <div
                      key={po.id}
                      className="grid grid-cols-[1fr_auto_auto] gap-2 items-center px-3 py-2"
                    >
                      <div>
                        <p className="font-medium">{po.poNumber}</p>
                        <p className="text-muted-foreground">
                          {new Date(po.orderDate).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                      <span className="text-right pr-2 font-mono">
                        ₹{parseFloat(po.outstandingAmount || 0).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        max={po.outstandingAmount}
                        className="w-28 h-7 text-xs text-right"
                        value={allocations[po.id] || ""}
                        onChange={(e) => setAllocation(po.id, e.target.value)}
                      />
                    </div>
                  ))}
                  <div className="grid grid-cols-[1fr_auto] gap-2 px-3 py-2 bg-muted/20 font-semibold">
                    <span>Total Payment</span>
                    <span className="font-mono pr-0">
                      ₹{totalAllocated.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

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
          <Button onClick={handleSave} disabled={saving || totalAllocated <= 0}>
            {saving ? "Saving..." : `Record ₹${totalAllocated.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
