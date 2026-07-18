import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, MapPin, Building2 } from "lucide-react";
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
import { getStatusLabel } from "@/pages/PurchaseOrder/PurchaseOrder.constants";

function fmt(n) {
  return `₹${parseFloat(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

function POsTable({ purchaseOrders, selectedIds, selectedVendorId, getVendorId, onTogglePO }) {
  return (
    <RawTable>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10" />
          <TableHead>PO Number</TableHead>
          <TableHead>Due / Order Date</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead className="text-right">Paid</TableHead>
          <TableHead className="text-right">Outstanding</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {purchaseOrders.map((po) => {
          const id = po.purchaseOrderId;
          const vendorId = getVendorId(po);
          const disabled =
            selectedVendorId != null &&
            vendorId !== selectedVendorId &&
            !selectedIds.includes(id);
          const selected = selectedIds.includes(id);
          return (
            <TableRow
              key={id}
              className={cn(
                "cursor-pointer",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              data-state={selected ? "selected" : undefined}
              onClick={() => {
                if (!disabled) onTogglePO(po, vendorId);
              }}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selected}
                  onCheckedChange={() => onTogglePO(po, vendorId)}
                  disabled={disabled}
                />
              </TableCell>
              <TableCell>
                <span className="font-medium">{po.poNumber}</span>
                {po.status && (
                  <span className="ml-2 text-[10px] text-muted-foreground">
                    {getStatusLabel(po.status)}
                  </span>
                )}
                {po.needsPricing && (
                  <span className="ml-2 text-[10px] text-amber-600 font-medium">No amount set</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {po.expectedDeliveryDate
                  ? new Date(po.expectedDeliveryDate).toLocaleDateString("en-IN")
                  : po.orderDate
                    ? new Date(po.orderDate).toLocaleDateString("en-IN")
                    : "—"}
              </TableCell>
              <TableCell className="text-right font-mono">{fmt(po.totalValue)}</TableCell>
              <TableCell className="text-right font-mono text-green-600">{fmt(po.paidAmount)}</TableCell>
              <TableCell className="text-right font-mono font-semibold text-orange-600">
                {po.needsPricing ? "—" : fmt(po.outstanding)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </RawTable>
  );
}

function VendorGroupCard({
  group,
  selectedIds,
  selectedVendorId,
  onToggleGroup,
  onTogglePO,
}) {
  const [expanded, setExpanded] = useState(true);
  const ids = group.purchaseOrders.map((p) => p.purchaseOrderId);
  const allSelected = ids.length > 0 && ids.every((id) => selectedIds.includes(id));
  const someSelected = ids.some((id) => selectedIds.includes(id)) && !allSelected;
  const displayName = group.vendorName || group.shopname || "Unknown Vendor";

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
                  <span className="text-xs text-muted-foreground font-normal">
                    ({group.vendorCode})
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
            {group.purchaseOrders.length} PO{group.purchaseOrders.length !== 1 ? "s" : ""}
          </Badge>
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
        <POsTable
          purchaseOrders={group.purchaseOrders}
          selectedIds={selectedIds}
          selectedVendorId={selectedVendorId}
          getVendorId={() => group.vendorId}
          onTogglePO={onTogglePO}
        />
      )}
    </div>
  );
}

export default function OutstandingPOsQueue({
  groups = [],
  flatPOs = [],
  grouped = true,
  selectedIds,
  onSelectionChange,
}) {
  const selectedVendorId = useMemo(() => {
    if (!selectedIds.length) return null;
    const all = grouped ? groups.flatMap((g) => g.purchaseOrders) : flatPOs;
    const first = all.find((po) => selectedIds.includes(po.purchaseOrderId));
    const group = groups.find((g) =>
      g.purchaseOrders.some((p) => p.purchaseOrderId === first?.purchaseOrderId)
    );
    return group?.vendorId ?? first?.vendorId ?? null;
  }, [selectedIds, groups, flatPOs, grouped]);

  const togglePO = (po, vendorId) => {
    const id = po.purchaseOrderId;
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
    const ids = group.purchaseOrders.map((p) => p.purchaseOrderId);
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
      return <p className="text-xs text-muted-foreground py-8 text-center">No outstanding POs</p>;
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
            onTogglePO={togglePO}
          />
        ))}
      </div>
    );
  }

  if (flatPOs.length === 0) {
    return <p className="text-xs text-muted-foreground py-8 text-center">No outstanding POs</p>;
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <POsTable
        purchaseOrders={flatPOs}
        selectedIds={selectedIds}
        selectedVendorId={selectedVendorId}
        getVendorId={(po) => po.vendorId}
        onTogglePO={togglePO}
      />
    </div>
  );
}
