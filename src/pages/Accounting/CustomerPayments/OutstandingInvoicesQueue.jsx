import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, MapPin, User } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  TablePrimitive as RawTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

function fmt(n) {
  return `₹${parseFloat(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

function InvoicesTable({ invoices, selectedIds, selectedCustomerId, onToggleInvoice }) {
  return (
    <RawTable>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10" />
          <TableHead>Invoice No.</TableHead>
          <TableHead>Due Date</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead className="text-right">Paid</TableHead>
          <TableHead className="text-right">Outstanding</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((inv) => {
          const disabled =
            selectedCustomerId != null &&
            inv.customerId !== selectedCustomerId &&
            !selectedIds.includes(inv.id);
          const selected = selectedIds.includes(inv.id);
          return (
            <TableRow
              key={inv.id}
              className={cn(
                "cursor-pointer",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              data-state={selected ? "selected" : undefined}
              onClick={() => {
                if (!disabled) onToggleInvoice(inv);
              }}
            >
              <TableCell
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={selected}
                  onCheckedChange={() => onToggleInvoice(inv)}
                  disabled={disabled}
                />
              </TableCell>
              <TableCell className="font-medium">{inv.invoiceNo}</TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(inv.dueDate).toLocaleDateString("en-IN")}
              </TableCell>
              <TableCell className="text-right font-mono">{fmt(inv.totalAmount)}</TableCell>
              <TableCell className="text-right font-mono text-green-600">{fmt(inv.paidAmount)}</TableCell>
              <TableCell className="text-right font-mono font-semibold text-orange-600">
                {fmt(inv.outstanding)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </RawTable>
  );
}

function CustomerGroupCard({
  group,
  selectedIds,
  selectedCustomerId,
  onToggleGroup,
  onToggleInvoice,
}) {
  const [expanded, setExpanded] = useState(true);
  const ids = group.invoices.map((i) => i.id);
  const allSelected = ids.length > 0 && ids.every((id) => selectedIds.includes(id));
  const someSelected = ids.some((id) => selectedIds.includes(id)) && !allSelected;
  const displayName = group.customerName || group.shopname || "Unknown Customer";

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="flex items-stretch border-b bg-muted/30">
        <button
          type="button"
          className="flex-1 flex items-center justify-between gap-3 px-3 py-3 text-left hover:bg-muted/50 transition-colors"
          onClick={() => setExpanded((v) => !v)}
        >
          <div className="flex items-start gap-2 min-w-0">
            {expanded ? (
              <ChevronDown className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="font-semibold text-sm truncate">{displayName}</span>
                {group.customerCode && (
                  <span className="text-xs text-muted-foreground font-normal">
                    ({group.customerCode})
                  </span>
                )}
                {group.city && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {group.city}
                  </span>
                )}
              </div>
              {group.address && (
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate pl-5">{group.address}</p>
              )}
              {group.phone && (
                <p className="text-[11px] text-muted-foreground mt-0.5 pl-5">{group.phone}</p>
              )}
            </div>
          </div>
          <Badge variant="secondary" className="text-[10px] h-5 shrink-0">
            {group.invoices.length} invoice{group.invoices.length !== 1 ? "s" : ""}
          </Badge>
        </button>
        <div className="flex items-center px-3 border-l" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={allSelected ? true : someSelected ? "indeterminate" : false}
            onCheckedChange={() => onToggleGroup(group)}
            aria-label={`Select all for ${displayName}`}
            title="Select all for this customer"
          />
        </div>
      </div>

      {expanded && (
        <InvoicesTable
          invoices={group.invoices}
          selectedIds={selectedIds}
          selectedCustomerId={selectedCustomerId}
          onToggleInvoice={onToggleInvoice}
        />
      )}
    </div>
  );
}

export default function OutstandingInvoicesQueue({
  groups = [],
  flatInvoices = [],
  grouped = true,
  selectedIds,
  onSelectionChange,
}) {
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
      onSelectionChange(Array.from(new Set([...selectedIds, ...ids])));
    }
  };

  if (grouped) {
    if (groups.length === 0) {
      return (
        <p className="text-xs text-muted-foreground py-8 text-center">No outstanding invoices</p>
      );
    }
    return (
      <div className="space-y-2">
        {groups.map((group) => (
          <CustomerGroupCard
            key={group.customerId}
            group={group}
            selectedIds={selectedIds}
            selectedCustomerId={selectedCustomerId}
            onToggleGroup={toggleCustomerGroup}
            onToggleInvoice={toggleInvoice}
          />
        ))}
      </div>
    );
  }

  if (flatInvoices.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-8 text-center">No outstanding invoices</p>
    );
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <InvoicesTable
        invoices={flatInvoices}
        selectedIds={selectedIds}
        selectedCustomerId={selectedCustomerId}
        onToggleInvoice={toggleInvoice}
      />
    </div>
  );
}
