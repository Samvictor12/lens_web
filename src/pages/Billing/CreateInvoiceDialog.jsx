import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormSelect } from "@/components/ui/form-select";
import { toast } from "sonner";
import {
  getDeliveredOrdersForCustomer,
  getAwaitingInvoiceCustomers,
  createInvoice,
} from "@/services/invoice";
import { useCompany } from "@/contexts/CompanyContext";
import {
  getInvoiceTaxRatesFromCompany,
  calcInvoiceTaxBreakdown,
} from "@/utils/gstRates";
import { fmt, orderTotal } from "./Billing.constants";

function formatLocalDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function CreateInvoiceDialog({ open, onClose, onCreated, initialCustomerId = "" }) {
  const qc = useQueryClient();
  const { company } = useCompany();
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const customerLocked = Boolean(initialCustomerId);

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
      qc.invalidateQueries({ queryKey: ["billing-invoicing-stats"] });
      qc.invalidateQueries({ queryKey: ["dispatched-orders"] });
      qc.invalidateQueries({ queryKey: ["awaiting-invoice-customers"] });
      onCreated?.();
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

  const selectedOrders = deliveredOrders.filter((o) => selectedOrderIds.includes(o.id));
  const selectedSubtotal = selectedOrders.reduce((s, o) => s + orderTotal(o), 0);

  const taxRates = useMemo(() => getInvoiceTaxRatesFromCompany(company), [company]);
  const taxBreakdown = useMemo(
    () => calcInvoiceTaxBreakdown(selectedSubtotal, taxRates.gstPercent, taxRates.sgstPercent),
    [selectedSubtotal, taxRates.gstPercent, taxRates.sgstPercent]
  );

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
      <DialogContent className="!flex !flex-col !w-[75vw] !max-w-[75vw] !h-[88vh] !max-h-[88vh] overflow-hidden gap-0 p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-3 pr-12">
          <DialogTitle>Create Invoice / Bill</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,17.5rem)_minmax(0,1fr)] grid-rows-1 gap-0 overflow-hidden border-t">
          {/* Left — invoice details */}
          <div className="min-h-0 h-full overflow-y-auto space-y-4 px-4 py-4 border-b lg:border-b-0 lg:border-r">
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
              isClearable={!customerLocked}
              disabled={customerLocked}
              required
            />
            <p className="text-[11px] text-muted-foreground -mt-2">
              Only customers with delivered, unbilled orders
            </p>

            <div className="space-y-1">
              <Label>
                Due Date <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
              {customerId && (
                <p className="text-[11px] text-muted-foreground">
                  Auto-set from credit days ({selectedCustomerCreditDays} day
                  {selectedCustomerCreditDays === 1 ? "" : "s"}). You can override.
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Optional notes"
              />
            </div>
          </div>

          {/* Right — sale order selection */}
          <div className="min-h-0 h-full flex flex-col overflow-hidden px-6 py-4">
            <div className="shrink-0 space-y-2 mb-3">
              <Label>
                Sale Orders <span className="text-red-500">*</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                Delivered orders not yet invoiced. Filter by created date, then select orders to
                include on this bill.
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <span className="text-[10px] font-medium text-muted-foreground shrink-0 pb-2">
                  Created Date
                </span>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setSelectedOrderIds([]);
                  }}
                  className="!h-8 min-w-[110px] max-w-[140px] text-xs px-1.5"
                  title="Created from"
                  disabled={!customerId}
                />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setSelectedOrderIds([]);
                  }}
                  className="!h-8 min-w-[110px] max-w-[140px] text-xs px-1.5"
                  title="Created to"
                  disabled={!customerId}
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto space-y-3 pr-1">
              {!customerId ? (
                <p className="text-xs text-muted-foreground py-2">Select a customer to load sale orders.</p>
              ) : ordersLoading ? (
                <p className="text-xs text-muted-foreground py-2">Loading sale orders…</p>
              ) : deliveredOrders.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  No un-billed delivered orders for this customer
                  {startDate || endDate ? " in the selected date range" : ""}.
                </p>
              ) : (
                <>
                  <div className="border rounded-md divide-y text-xs">
                    <div className="sticky top-0 z-[1] grid grid-cols-[2rem_1fr_6.5rem] gap-2 px-3 py-2 bg-muted/40 font-medium text-muted-foreground">
                      <span />
                      <span>Order</span>
                      <span className="text-right">Amount</span>
                    </div>
                    {deliveredOrders.map((o) => {
                      const selected = selectedOrderIds.includes(o.id);
                      return (
                        <div
                          key={o.id}
                          className={`grid grid-cols-[2rem_1fr_6.5rem] gap-2 items-center px-3 py-2 ${selected ? "bg-primary/5" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleOrder(o.id)}
                            className="h-4 w-4"
                          />
                          <div>
                            <p className="font-medium">{o.orderNo}</p>
                            <p className="text-muted-foreground">
                              {o.lensProduct?.lens_name || "—"} · {o.coating?.name || "—"}
                              {o.customerRefNo ? ` · Ref: ${o.customerRefNo}` : ""}
                              {o.createdAt
                                ? ` · ${new Date(o.createdAt).toLocaleDateString("en-IN")}`
                                : ""}
                            </p>
                          </div>
                          <span className="text-right font-mono pr-1">{fmt(orderTotal(o))}</span>
                        </div>
                      );
                    })}
                  </div>

                  {selectedOrders.length > 0 && (
                    <div className="border rounded-md divide-y text-xs">
                      <div className="sticky top-0 z-[1] grid grid-cols-[1fr_6.5rem] gap-2 px-3 py-2 bg-muted/40 font-medium text-muted-foreground">
                        <span>Selected — {selectedOrders.length} order(s)</span>
                        <span className="text-right">Taxable</span>
                      </div>
                      {selectedOrders.map((o) => (
                        <div
                          key={o.id}
                          className="grid grid-cols-[1fr_6.5rem] gap-2 items-center px-3 py-2"
                        >
                          <p className="font-medium">{o.orderNo}</p>
                          <span className="text-right font-mono pr-1">{fmt(orderTotal(o))}</span>
                        </div>
                      ))}
                      <div className="grid grid-cols-[1fr_6.5rem] gap-2 px-3 py-2 bg-muted/20 font-semibold">
                        <span>Subtotal</span>
                        <span className="text-right font-mono">{fmt(taxBreakdown.taxableAmount)}</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 px-6 py-4 border-t bg-background !flex-row !items-center !justify-between gap-3 flex-wrap">
          <div className="text-xs sm:text-sm space-y-0.5 min-w-[10rem]">
            <div className="flex justify-between gap-6 text-muted-foreground">
              <span>Taxable</span>
              <span className="font-mono text-foreground">{fmt(taxBreakdown.taxableAmount)}</span>
            </div>
            <div className="flex justify-between gap-6 text-muted-foreground">
              <span>GST ({taxBreakdown.gstPercent}%)</span>
              <span className="font-mono text-foreground">{fmt(taxBreakdown.gstAmount)}</span>
            </div>
            <div className="flex justify-between gap-6 text-muted-foreground">
              <span>SGST ({taxBreakdown.sgstPercent}%)</span>
              <span className="font-mono text-foreground">{fmt(taxBreakdown.sgstAmount)}</span>
            </div>
            <div className="flex justify-between gap-6 font-semibold border-t pt-0.5">
              <span>Invoice Total</span>
              <span className="font-mono">{fmt(taxBreakdown.totalAmount)}</span>
            </div>
          </div>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={handleClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                mutation.isPending ||
                !customerId ||
                !selectedOrderIds.length ||
                !dueDate ||
                taxBreakdown.totalAmount <= 0
              }
            >
              {mutation.isPending
                ? "Creating…"
                : `Create Invoice ${taxBreakdown.totalAmount > 0 ? fmt(taxBreakdown.totalAmount) : ""}`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
