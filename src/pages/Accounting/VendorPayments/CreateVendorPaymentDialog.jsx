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
import { FormSelect } from "@/components/ui/form-select";
import { useToast } from "@/hooks/use-toast";
import { createVendorPayment, getOutstandingPOs } from "@/services/vendorPayment";
import { previewAllocations } from "../CustomerPayments/CustomerPayments.constants";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, emptyPaymentForm } from "./VendorPayments.constants";

function fmt(n) {
  return `₹${parseFloat(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

export default function CreateVendorPaymentDialog({
  open,
  onOpenChange,
  vendors,
  bankLedgers,
  preselectedVendorId = "",
  preselectedPoIds = [],
  preselectedPOs = [],
  onCreated,
}) {
  const { toast } = useToast();
  const [form, setForm] = useState(emptyPaymentForm);
  const [saving, setSaving] = useState(false);
  const [outstandingPOs, setOutstandingPOs] = useState([]);
  const [loadingPOs, setLoadingPOs] = useState(false);
  const [allocations, setAllocations] = useState({});
  const [manualOverrides, setManualOverrides] = useState({});

  const lockedVendor = !!preselectedVendorId;

  const selectedPOs = useMemo(() => {
    if (preselectedPOs.length && preselectedPoIds.length) {
      return preselectedPOs.filter((po) => preselectedPoIds.includes(po.purchaseOrderId));
    }
    if (preselectedPoIds.length) {
      return outstandingPOs.filter((po) => preselectedPoIds.includes(po.id));
    }
    return outstandingPOs;
  }, [preselectedPOs, preselectedPoIds, outstandingPOs]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  useEffect(() => {
    if (!open) return;
    setForm({
      ...emptyPaymentForm,
      vendorId: preselectedVendorId ? String(preselectedVendorId) : "",
      paymentDate: new Date().toISOString().split("T")[0],
    });
    setManualOverrides({});
    setAllocations({});
  }, [open, preselectedVendorId]);

  useEffect(() => {
    const vid = form.vendorId || preselectedVendorId;
    if (!vid) {
      setOutstandingPOs([]);
      return;
    }
    setLoadingPOs(true);
    getOutstandingPOs(vid)
      .then((res) => {
        const pos = (res.data?.purchaseOrders || [])
          .filter((po) => parseFloat(po.outstanding || 0) > 0 || po.needsPricing)
          .map((po) => ({
            id: po.purchaseOrderId,
            purchaseOrderId: po.purchaseOrderId,
            poNumber: po.poNumber,
            orderDate: po.orderDate,
            expectedDeliveryDate: po.expectedDeliveryDate,
            outstanding: parseFloat(po.outstanding),
            totalValue: po.totalValue,
            paidAmount: po.paidAmount,
            status: po.status,
            needsPricing: po.needsPricing,
          }));
        setOutstandingPOs(pos);
      })
      .catch(() => {
        toast({ variant: "destructive", title: "Failed to load outstanding POs" });
      })
      .finally(() => setLoadingPOs(false));
  }, [form.vendorId, preselectedVendorId]);

  const paymentAmount = parseFloat(form.totalAmount) || 0;

  const invoiceLikePOs = selectedPOs.map((po) => ({
    id: po.id ?? po.purchaseOrderId,
    outstanding:
      po.needsPricing && paymentAmount > 0
        ? paymentAmount
        : (po.outstanding ?? po.outstandingAmount ?? 0),
    dueDate: po.expectedDeliveryDate,
    orderDate: po.orderDate,
    invoiceNo: po.poNumber,
  }));

  const { allocations: preview } = useMemo(() => {
    if (!paymentAmount || !invoiceLikePOs.length) return { allocations: {} };
    return previewAllocations(invoiceLikePOs, paymentAmount, manualOverrides);
  }, [invoiceLikePOs, paymentAmount, manualOverrides]);

  useEffect(() => {
    setAllocations(preview);
  }, [preview]);

  const totalAllocated = Object.values(allocations).reduce(
    (s, v) => s + (parseFloat(v) || 0),
    0
  );

  const handleSave = async () => {
    if (!form.vendorId) {
      toast({ variant: "destructive", title: "Please select a vendor" });
      return;
    }
    if (!form.bankLedgerId) {
      toast({ variant: "destructive", title: "Please select a payment account" });
      return;
    }
    if (paymentAmount <= 0) {
      toast({ variant: "destructive", title: "Payment amount must be greater than zero" });
      return;
    }

    const poIds = preselectedPoIds.length
      ? preselectedPoIds
      : selectedPOs.map((po) => po.id ?? po.purchaseOrderId);

    const items = poIds
      .filter((id) => (allocations[id] || 0) > 0)
      .map((id) => ({
        purchaseOrderId: id,
        allocatedAmount: parseFloat(allocations[id]),
      }));

    setSaving(true);
    try {
      await createVendorPayment({
        vendorId: parseInt(form.vendorId),
        bankLedgerId: parseInt(form.bankLedgerId),
        paymentDate: form.paymentDate,
        paymentMethod: form.paymentMethod,
        referenceNo: form.referenceNumber || undefined,
        notes: form.notes || undefined,
        totalAmount: paymentAmount,
        items,
      });
      toast({ title: "Payment recorded" });
      setForm(emptyPaymentForm);
      setAllocations({});
      onCreated?.();
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
    setManualOverrides({});
    setOutstandingPOs([]);
    onOpenChange(false);
  };

  const vendorOptions = vendors.map((v) => ({ id: v.id, name: v.name }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Vendor Payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Vendor *</Label>
            <FormSelect
              options={vendorOptions}
              value={form.vendorId || null}
              onChange={(val) => set("vendorId", val != null && val !== "" ? String(val) : "")}
              placeholder="Search vendor..."
              isSearchable
              isClearable={!lockedVendor}
              disabled={lockedVendor}
              menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
              menuPosition="fixed"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Payment Amount *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.totalAmount}
                onChange={(e) => set("totalAmount", e.target.value)}
                placeholder="Amount paid"
              />
            </div>
            <div className="space-y-1">
              <Label>Payment Date *</Label>
              <Input
                type="date"
                value={form.paymentDate}
                onChange={(e) => set("paymentDate", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
          </div>

          <div className="space-y-1">
            <Label>Reference No.</Label>
            <Input
              value={form.referenceNumber}
              onChange={(e) => set("referenceNumber", e.target.value)}
              placeholder="Cheque / transaction ref"
            />
          </div>

          {(form.vendorId || preselectedVendorId) && (
            <div className="space-y-2">
              <Label>Allocate to Purchase Orders (FIFO)</Label>
              {loadingPOs ? (
                <p className="text-xs text-muted-foreground py-2">Loading outstanding POs...</p>
              ) : selectedPOs.length === 0 ? (
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
                  {selectedPOs.map((po) => {
                    const id = po.id ?? po.purchaseOrderId;
                    const outstanding = po.outstanding ?? po.outstandingAmount;
                    return (
                      <div
                        key={id}
                        className="grid grid-cols-[1fr_auto_auto] gap-2 items-center px-3 py-2"
                      >
                        <div>
                          <p className="font-medium">{po.poNumber}</p>
                          <p className="text-muted-foreground">
                            {po.orderDate
                              ? new Date(po.orderDate).toLocaleDateString("en-IN")
                              : "—"}
                          </p>
                        </div>
                        <span className="text-right pr-2 font-mono">{fmt(outstanding)}</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          max={outstanding}
                          className="w-28 h-7 text-xs text-right"
                          value={allocations[id] ?? ""}
                          onChange={(e) =>
                            setManualOverrides((prev) => ({ ...prev, [id]: e.target.value }))
                          }
                        />
                      </div>
                    );
                  })}
                  <div className="grid grid-cols-[1fr_auto] gap-2 px-3 py-2 bg-muted/20 font-semibold">
                    <span>Total Allocated</span>
                    <span className="font-mono pr-0">{fmt(totalAllocated)}</span>
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
          <Button onClick={handleSave} disabled={saving || paymentAmount <= 0}>
            {saving ? "Saving..." : `Record ${fmt(paymentAmount)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
