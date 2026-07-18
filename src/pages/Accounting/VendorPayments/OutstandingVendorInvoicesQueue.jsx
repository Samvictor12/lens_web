import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Building2 } from "lucide-react";
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

/**
 * Outstanding VendorInvoice queue (M5, invoice-first workflow). Replaces direct
 * PO-based selection for the payment step — payments now allocate against
 * outstanding VendorInvoice rows (registered via CreateVendorInvoiceDialog).
 */
function InvoicesTable({ invoices, selectedIds, selectedVendorId, getVendorId, onToggleInvoice }) {
  return (
    <RawTable>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10" />
          <TableHead>Invoice No.</TableHead>
          <TableHead>Supplier Invoice No.</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>PO(s)</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead className="text-right">Paid</TableHead>
          <TableHead className="text-right">Outstanding</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((inv) => {
          const id = inv.id;
          const vendorId = getVendorId(inv);
          const disabled =
            selectedVendorId != null &&
            vendorId !== selectedVendorId &&
            !selectedIds.includes(id);
          const selected = selectedIds.includes(id);
          return (
            <TableRow
              key={id}
              className={cn("cursor-pointer", disabled && "opacity-50 cursor-not-allowed")}
              data-state={selected ? "selected" : undefined}
              onClick={() => {
                if (!disabled) onToggleInvoice(inv, vendorId);
              }}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selected}
                  onCheckedChange={() => onToggleInvoice(inv, vendorId)}
                  disabled={disabled}
                />
              </TableCell>
              <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
              <TableCell className="text-muted-foreground">{inv.supplierInvoiceNo}</TableCell>
              <TableCell className="text-muted-foreground">
                {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString("en-IN") : "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {(inv.items || []).map((i) => i.purchaseOrder?.poNumber).filter(Boolean).join(", ") || "—"}
              </TableCell>
              <TableCell className="text-right font-mono">{fmt(inv.totalAmount)}</TableCell>
              <TableCell className="text-right font-mono text-green-600">{fmt(inv.paidAmount)}</TableCell>
              <TableCell className="text-right font-mono font-semibold text-orange-600">
                {fmt(inv.outstanding)}
              </TableCell>
              <TableCell>
                <Badge
                  className={
                    inv.status === "PARTIALLY_PAID"
                      ? "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100"
                      : "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100"
                  }
                >
                  {inv.status === "PARTIALLY_PAID" ? "Partially Paid" : "Outstanding"}
                </Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </RawTable>
  );
}

function VendorGroupCard({ group, selectedIds, selectedVendorId, onToggleGroup, onToggleInvoice }) {
  const [expanded, setExpanded] = useState(true);
  const ids = group.invoices.map((i) => i.id);
  const allSelected = ids.length > 0 && ids.every((id) => selectedIds.includes(id));
  const someSelected = ids.some((id) => selectedIds.includes(id)) && !allSelected;
  const displayName = group.vendorName || "Unknown Vendor";
  const totalOutstanding = group.invoices.reduce((s, i) => s + (parseFloat(i.outstanding) || 0), 0);

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
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="font-semibold text-sm truncate">{displayName}</span>
                {group.vendorCode && (
                  <span className="text-xs text-muted-foreground font-normal">({group.vendorCode})</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge className="text-[10px] h-5 bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200 font-semibold">
              Total Outstanding: {fmt(totalOutstanding)}
            </Badge>
            <Badge variant="secondary" className="text-[10px] h-5">
              {group.invoices.length} invoice{group.invoices.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </button>
        <div className="flex items-center px-3 border-l" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={allSelected ? true : someSelected ? "indeterminate" : false}
            onCheckedChange={() => onToggleGroup(group)}
            aria-label={`Select all for ${displayName}`}
            title="Select all for this vendor"
          />
        </div>
      </div>

      {expanded && (
        <InvoicesTable
          invoices={group.invoices}
          selectedIds={selectedIds}
          selectedVendorId={selectedVendorId}
          getVendorId={() => group.vendorId}
          onToggleInvoice={onToggleInvoice}
        />
      )}
    </div>
  );
}

export default function OutstandingVendorInvoicesQueue({
  groups = [],
  flatInvoices = [],
  grouped = true,
  selectedIds,
  onSelectionChange,
}) {
  const selectedVendorId = useMemo(() => {
    if (!selectedIds.length) return null;
    const all = grouped ? groups.flatMap((g) => g.invoices) : flatInvoices;
    const first = all.find((inv) => selectedIds.includes(inv.id));
    const group = groups.find((g) => g.invoices.some((i) => i.id === first?.id));
    return group?.vendorId ?? first?.vendorId ?? null;
  }, [selectedIds, groups, flatInvoices, grouped]);

  const toggleInvoice = (inv, vendorId) => {
    const id = inv.id;
    const isSelected = selectedIds.includes(id);
    if (isSelected) {
      onSelectionChange(selectedIds.filter((x) => x !== id));
      return;
    }
    if (selectedVendorId && vendorId !== selectedVendorId) {
      onSelectionChange([id]);
      return;
    }
    onSelectionChange([...selectedIds, id]);
  };

  const toggleVendorGroup = (group) => {
    const ids = group.invoices.map((i) => i.id);
    const allSelected = ids.every((id) => selectedIds.includes(id));
    if (allSelected) {
      onSelectionChange(selectedIds.filter((id) => !ids.includes(id)));
    } else if (selectedVendorId && selectedVendorId !== group.vendorId) {
      onSelectionChange(ids);
    } else {
      onSelectionChange(Array.from(new Set([...selectedIds, ...ids])));
    }
  };

  if (grouped) {
    if (groups.length === 0) {
      return <p className="text-xs text-muted-foreground py-8 text-center">No outstanding vendor invoices</p>;
    }
    return (
      <div className="space-y-2">
        {groups.map((group) => (
          <VendorGroupCard
            key={group.vendorId}
            group={group}
            selectedIds={selectedIds}
            selectedVendorId={selectedVendorId}
            onToggleGroup={toggleVendorGroup}
            onToggleInvoice={toggleInvoice}
          />
        ))}
      </div>
    );
  }

  if (flatInvoices.length === 0) {
    return <p className="text-xs text-muted-foreground py-8 text-center">No outstanding vendor invoices</p>;
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <InvoicesTable
        invoices={flatInvoices}
        selectedIds={selectedIds}
        selectedVendorId={selectedVendorId}
        getVendorId={(inv) => inv.vendorId}
        onToggleInvoice={toggleInvoice}
      />
    </div>
  );
}
