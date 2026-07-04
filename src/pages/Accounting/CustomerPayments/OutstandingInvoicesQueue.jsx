import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function fmt(n) {
  return `₹${parseFloat(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

export default function OutstandingInvoicesQueue({
  groups = [],
  flatInvoices = [],
  grouped = true,
  selectedIds,
  onSelectionChange,
  onToggleView,
}) {
  const [collapsed, setCollapsed] = useState({});

  const toggleCollapse = (customerId) => {
    setCollapsed((prev) => ({ ...prev, [customerId]: !prev[customerId] }));
  };

  const selectedCustomerId = useMemo(() => {
    if (!selectedIds.length) return null;
    const all = grouped ? groups.flatMap((g) => g.invoices) : flatInvoices;
    const first = all.find((inv) => selectedIds.includes(inv.id));
    return first?.customerId ?? null;
  }, [selectedIds, groups, flatInvoices, grouped]);

  const toggleInvoice = (inv) => {
    const isSelected = selectedIds.includes(inv.id);
    if (isSelected) {
      onSelectionChange(selectedIds.filter((id) => id !== inv.id));
      return;
    }
    if (selectedCustomerId && inv.customerId !== selectedCustomerId) {
      onSelectionChange([inv.id]);
      return;
    }
    onSelectionChange([...selectedIds, inv.id]);
  };

  const toggleCustomerGroup = (group) => {
    const ids = group.invoices.map((i) => i.id);
    const allSelected = ids.every((id) => selectedIds.includes(id));
    if (allSelected) {
      onSelectionChange(selectedIds.filter((id) => !ids.includes(id)));
    } else if (selectedCustomerId && selectedCustomerId !== group.customerId) {
      onSelectionChange(ids);
    } else {
      const merged = new Set([...selectedIds, ...ids]);
      onSelectionChange(Array.from(merged));
    }
  };

  const renderRow = (inv) => {
    const disabled =
      selectedCustomerId != null &&
      inv.customerId !== selectedCustomerId &&
      !selectedIds.includes(inv.id);

    return (
      <div
        key={inv.id}
        className={cn(
          "grid grid-cols-[auto_1fr_repeat(4,auto)] gap-2 items-center px-3 py-2 text-xs border-b last:border-b-0",
          disabled && "opacity-50"
        )}
      >
        <Checkbox
          checked={selectedIds.includes(inv.id)}
          onCheckedChange={() => toggleInvoice(inv)}
          disabled={disabled}
        />
        <span className="font-medium">{inv.invoiceNo}</span>
        <span className="text-muted-foreground">
          {new Date(inv.dueDate).toLocaleDateString("en-IN")}
        </span>
        <span className="text-right font-mono">{fmt(inv.totalAmount)}</span>
        <span className="text-right font-mono text-green-600">{fmt(inv.paidAmount)}</span>
        <span className="text-right font-mono font-semibold text-orange-600">
          {fmt(inv.outstanding)}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Select invoices from one customer to record a payment
        </p>
        <Button variant="outline" size="xs" className="h-7 text-xs" onClick={onToggleView}>
          {grouped ? "Flat list" : "Group by customer"}
        </Button>
      </div>

      <div className="border rounded-md overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_repeat(4,auto)] gap-2 px-3 py-2 bg-muted/40 text-xs font-medium text-muted-foreground">
          <span />
          <span>Invoice No.</span>
          <span>Due Date</span>
          <span className="text-right">Total</span>
          <span className="text-right">Paid</span>
          <span className="text-right">Outstanding</span>
        </div>

        {grouped ? (
          groups.length === 0 ? (
            <p className="text-xs text-muted-foreground p-4 text-center">No outstanding invoices</p>
          ) : (
            groups.map((group) => {
              const ids = group.invoices.map((i) => i.id);
              const allSelected = ids.length > 0 && ids.every((id) => selectedIds.includes(id));
              const someSelected = ids.some((id) => selectedIds.includes(id));
              const isOpen = !collapsed[group.customerId];

              return (
                <div key={group.customerId} className="border-t">
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 px-3 py-2 bg-muted/20 hover:bg-muted/30 text-left text-sm font-medium"
                    onClick={() => toggleCollapse(group.customerId)}
                  >
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    )}
                    <Checkbox
                      checked={allSelected ? true : someSelected ? "indeterminate" : false}
                      onCheckedChange={() => toggleCustomerGroup(group)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span>{group.customerName}</span>
                    {group.customerCode && (
                      <span className="text-xs text-muted-foreground font-normal">
                        ({group.customerCode})
                      </span>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {group.invoices.length} invoice(s)
                    </span>
                  </button>
                  {isOpen && group.invoices.map(renderRow)}
                </div>
              );
            })
          )
        ) : flatInvoices.length === 0 ? (
          <p className="text-xs text-muted-foreground p-4 text-center">No outstanding invoices</p>
        ) : (
          flatInvoices.map(renderRow)
        )}
      </div>
    </div>
  );
}
