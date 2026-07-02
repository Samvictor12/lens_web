import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Receipt } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { getDeliveredOrdersForCustomer, createInvoice } from "@/services/invoice";
import { getCustomers } from "@/services/customer";
import { fmt, orderTotal } from "./Billing.constants";

export default function CreateInvoiceDialog({ open, onClose, initialCustomerId = "" }) {
  const qc = useQueryClient();
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  // Sync state when dialog opens with a pre-filled customer
  useEffect(() => {
    if (open) {
      setCustomerId(initialCustomerId || "");
      setSelectedOrderIds([]);
    }
  }, [open, initialCustomerId]);

  const { data: customersRes } = useQuery({
    queryKey: ["customers-dropdown"],
    queryFn: () => getCustomers(1, 500, "", {}, "name", "asc"),
    enabled: open,
  });
  const customers = customersRes?.data || [];

  const { data: ordersRes, isLoading: ordersLoading } = useQuery({
    queryKey: ["delivered-orders", customerId],
    queryFn: () => getDeliveredOrdersForCustomer(customerId),
    enabled: !!customerId,
  });
  const deliveredOrders = ordersRes?.data || [];

  const mutation = useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      toast.success("Invoice created successfully");
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoices-stats"] });
      qc.invalidateQueries({ queryKey: ["dispatched-orders"] });
      handleClose();
    },
    onError: (err) => toast.error(err?.message || "Failed to create invoice"),
  });

  const handleClose = () => {
    setCustomerId("");
    setSelectedOrderIds([]);
    setDueDate("");
    setNotes("");
    onClose();
  };

  const toggleOrder = (id) =>
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const selectedTotal = deliveredOrders
    .filter((o) => selectedOrderIds.includes(o.id))
    .reduce((s, o) => s + orderTotal(o), 0);

  const handleSubmit = () => {
    if (!customerId) return toast.error("Please select a customer");
    if (!selectedOrderIds.length) return toast.error("Select at least one sale order");
    if (!dueDate) return toast.error("Please set a due date");
    mutation.mutate({ saleOrderIds: selectedOrderIds, dueDate, notes: notes || undefined });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" /> Create Invoice / Bill
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>
              Customer <span className="text-red-500">*</span>
            </Label>
            <Select
              value={customerId}
              onValueChange={(v) => {
                setCustomerId(v);
                setSelectedOrderIds([]);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select customer…" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name} {c.shopName ? `(${c.shopName})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {customerId && (
            <div className="space-y-1">
              <Label>
                Delivered Orders (select to include){" "}
                <span className="text-red-500">*</span>
              </Label>
              {ordersLoading ? (
                <p className="text-sm text-muted-foreground py-2">Loading orders…</p>
              ) : deliveredOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No dispatched or delivered un-billed orders for this customer.
                </p>
              ) : (
                <div className="border rounded-md divide-y max-h-56 overflow-y-auto">
                  {deliveredOrders.map((o) => (
                    <label
                      key={o.id}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedOrderIds.includes(o.id)}
                        onCheckedChange={() => toggleOrder(o.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm">{o.orderNo}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {o.lensProduct?.lens_name || "—"} · {o.coating?.name || "—"}
                        </span>
                        {o.orderDate && (
                          <span className="text-xs text-muted-foreground ml-2">
                            · {new Date(o.orderDate).toLocaleDateString("en-IN")}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-semibold shrink-0">
                        {fmt(orderTotal(o))}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedOrderIds.length > 0 && (
            <div className="flex justify-between items-center bg-muted px-3 py-2 rounded-md text-sm font-medium">
              <span>{selectedOrderIds.length} order(s) selected</span>
              <span className="text-base font-bold">{fmt(selectedTotal)}</span>
            </div>
          )}

          <div className="space-y-1">
            <Label>
              Due Date <span className="text-red-500">*</span>
            </Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Notes (optional)</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any remarks…"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? "Creating…" : "Create Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
