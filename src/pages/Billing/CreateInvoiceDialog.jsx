import { useState, useEffect, useMemo } from "react";
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
import { FormSelect } from "@/components/ui/form-select";
import { FormInput } from "@/components/ui/form-input";
import { FormTextarea } from "@/components/ui/form-textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  getDeliveredOrdersForCustomer,
  getAwaitingInvoiceCustomers,
  createInvoice,
} from "@/services/invoice";
import { fmt, orderTotal } from "./Billing.constants";

function formatLocalDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function CreateInvoiceDialog({ open, onClose, initialCustomerId = "" }) {
  const qc = useQueryClient();
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Sync state when dialog opens — always start with 0 orders selected
  useEffect(() => {
    if (open) {
      setCustomerId(initialCustomerId || "");
      setSelectedOrderIds([]);
      setDueDate("");
      setNotes("");
      setStartDate("");
      setEndDate("");
    }
  }, [open, initialCustomerId]);

  // Only customers currently in the Awaiting Invoice queue
  const { data: customersRes, isLoading: customersLoading } = useQuery({
    queryKey: ["awaiting-invoice-customers"],
    queryFn: getAwaitingInvoiceCustomers,
    enabled: open,
  });
  const customers = (customersRes?.data || []).map((c) => ({
    id: c.id,
    name: `${c.name}${c.shopname ? ` (${c.shopname})` : ""}`,
    creditDays: c.creditDays ?? c.credit_days ?? 0,
  }));

  const orderDateParams = useMemo(() => {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return params;
  }, [startDate, endDate]);

  const { data: ordersRes, isLoading: ordersLoading } = useQuery({
    queryKey: ["delivered-orders", customerId, orderDateParams],
    queryFn: () => getDeliveredOrdersForCustomer(customerId, orderDateParams),
    enabled: !!customerId,
  });
  const deliveredOrders = ordersRes?.data || [];

  // Auto-fill Due Date = today + customer creditDays when customer changes
  useEffect(() => {
    if (!open || !customerId) return;
    const list = customersRes?.data || [];
    const cust = list.find((c) => String(c.id) === String(customerId));
    if (!cust && list.length === 0) return;
    const days = Number(cust?.creditDays ?? cust?.credit_days ?? 0) || 0;
    const d = new Date();
    d.setDate(d.getDate() + days);
    setDueDate(formatLocalDate(d));
  }, [open, customerId, customersRes?.data]);

  // Drop selections that fall out of the filtered list
  useEffect(() => {
    const ids = new Set(deliveredOrders.map((o) => o.id));
    setSelectedOrderIds((prev) => prev.filter((id) => ids.has(id)));
  }, [deliveredOrders]);

  const mutation = useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      toast.success("Invoice created successfully");
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoices-stats"] });
      qc.invalidateQueries({ queryKey: ["dispatched-orders"] });
      qc.invalidateQueries({ queryKey: ["awaiting-invoice-customers"] });
      handleClose();
    },
    onError: (err) => toast.error(err?.message || "Failed to create invoice"),
  });

  const handleClose = () => {
    setCustomerId("");
    setSelectedOrderIds([]);
    setDueDate("");
    setNotes("");
    setStartDate("");
    setEndDate("");
    onClose();
  };

  const toggleOrder = (id) =>
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const selectedTotal = deliveredOrders
    .filter((o) => selectedOrderIds.includes(o.id))
    .reduce((s, o) => s + orderTotal(o), 0);

  const selectedCustomerCreditDays = useMemo(() => {
    const cust = (customersRes?.data || []).find((c) => String(c.id) === String(customerId));
    return Number(cust?.creditDays ?? cust?.credit_days ?? 0) || 0;
  }, [customersRes?.data, customerId]);

  const handleSubmit = () => {
    if (mutation.isPending) return;
    if (!customerId) return toast.error("Please select a customer");
    if (!selectedOrderIds.length) return toast.error("Select at least one sale order");
    if (!dueDate) return toast.error("Please set a due date");
    mutation.mutate({ saleOrderIds: selectedOrderIds, dueDate, notes: notes || undefined });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] !flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-3 pr-12 border-b shrink-0 space-y-0">
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" /> Create Invoice / Bill
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 space-y-4">
          <FormSelect
            label="Customer"
            name="customerId"
            options={customers}
            value={customerId}
            onChange={(v) => {
              setCustomerId(v || "");
              setSelectedOrderIds([]);
            }}
            placeholder={
              customersLoading
                ? "Loading customers…"
                : customers.length === 0
                  ? "No customers awaiting invoice"
                  : "Select customer…"
            }
            isSearchable
            isClearable
            required
            helperText="Only customers with delivered, unbilled orders"
          />

          {customerId && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium">
                Delivered Orders (select to include){" "}
                <span className="text-red-500">*</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                <FormInput
                  label="Created From"
                  name="soStartDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setSelectedOrderIds([]);
                  }}
                />
                <FormInput
                  label="Created To"
                  name="soEndDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setSelectedOrderIds([]);
                  }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Leave dates empty to show all unbilled delivered orders. Filter uses sale order created date.
              </p>
              {ordersLoading ? (
                <p className="text-sm text-muted-foreground py-2">Loading orders…</p>
              ) : deliveredOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No un-billed orders for this customer
                  {startDate || endDate ? " in the selected date range" : ""}. Orders must be in{" "}
                  <strong>DELIVERED</strong> status and not already linked to an invoice.
                </p>
              ) : (
                <div className="border rounded-md divide-y">
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
                        {o.customerRefNo && (
                          <span className="text-xs text-muted-foreground ml-2">
                            Ref: {o.customerRefNo}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground ml-2">
                          {o.lensProduct?.lens_name || "—"} · {o.coating?.name || "—"}
                        </span>
                        {o.createdAt && (
                          <span className="text-xs text-muted-foreground ml-2">
                            · Created {new Date(o.createdAt).toLocaleDateString("en-IN")}
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

          {/* Always show selection summary — defaults to 0 */}
          <div className="flex justify-between items-center bg-muted px-3 py-2 rounded-md text-sm font-medium">
            <span>{selectedOrderIds.length} order(s) selected</span>
            <span className="text-base font-bold">{fmt(selectedTotal)}</span>
          </div>

          <FormInput
            label="Due Date"
            name="dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
            helperText={
              customerId
                ? `Auto-set from customer credit days (${selectedCustomerCreditDays} day${selectedCustomerCreditDays === 1 ? "" : "s"}). You can override.`
                : undefined
            }
          />

          <FormTextarea
            label="Notes (optional)"
            name="notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any remarks…"
          />
        </div>

        <DialogFooter className="px-4 py-3 border-t shrink-0 gap-2 bg-background sm:justify-end">
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
