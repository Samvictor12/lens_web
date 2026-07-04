import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getStatusLabel } from "@/pages/PurchaseOrder/PurchaseOrder.constants";

function fmt(n) {
  return `₹${parseFloat(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

export default function OutstandingPOsQueue({
  groups = [],
  flatPOs = [],
  grouped = true,
  selectedIds,
  onSelectionChange,
  onToggleView,
}) {
  const [collapsed, setCollapsed] = useState({});

  const toggleCollapse = (vendorId) => {
    setCollapsed((prev) => ({ ...prev, [vendorId]: !prev[vendorId] }));
  };

  const selectedVendorId = useMemo(() => {
    if (!selectedIds.length) return null;
    const all = grouped ? groups.flatMap((g) => g.purchaseOrders) : flatPOs;
    const first = all.find((po) => selectedIds.includes(po.purchaseOrderId));
    const group = groups.find((g) =>
      g.purchaseOrders.some((p) => p.purchaseOrderId === first?.purchaseOrderId)
    );
    return group?.vendorId ?? null;
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

  const renderRow = (po, vendorId) => {
    const id = po.purchaseOrderId;
    const disabled =
      selectedVendorId != null &&
      vendorId !== selectedVendorId &&
      !selectedIds.includes(id);

    return (
      <div
        key={id}
        className={cn(
          "grid grid-cols-[auto_1fr_repeat(4,auto)] gap-2 items-center px-3 py-2 text-xs border-b last:border-b-0",
          disabled && "opacity-50"
        )}
      >
        <Checkbox
          checked={selectedIds.includes(id)}
          onCheckedChange={() => togglePO(po, vendorId)}
          disabled={disabled}
        />
        <div>
          <span className="font-medium">{po.poNumber}</span>
          {po.status && (
            <span className="ml-2 text-[10px] text-muted-foreground">{getStatusLabel(po.status)}</span>
          )}
          {po.needsPricing && (
            <span className="ml-2 text-[10px] text-amber-600 font-medium">No amount set</span>
          )}
        </div>
        <span className="text-muted-foreground">
          {po.expectedDeliveryDate
            ? new Date(po.expectedDeliveryDate).toLocaleDateString("en-IN")
            : po.orderDate
              ? new Date(po.orderDate).toLocaleDateString("en-IN")
              : "—"}
        </span>
        <span className="text-right font-mono">{fmt(po.totalValue)}</span>
        <span className="text-right font-mono text-green-600">{fmt(po.paidAmount)}</span>
        <span className="text-right font-mono font-semibold text-orange-600">
          {po.needsPricing ? "—" : fmt(po.outstanding)}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Select POs from one vendor to record a payment
        </p>
        <Button variant="outline" size="xs" className="h-7 text-xs" onClick={onToggleView}>
          {grouped ? "Flat list" : "Group by vendor"}
        </Button>
      </div>

      <div className="border rounded-md overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_repeat(4,auto)] gap-2 px-3 py-2 bg-muted/40 text-xs font-medium text-muted-foreground">
          <span />
          <span>PO Number</span>
          <span>Due / Order Date</span>
          <span className="text-right">Total</span>
          <span className="text-right">Paid</span>
          <span className="text-right">Outstanding</span>
        </div>

        {grouped ? (
          groups.length === 0 ? (
            <p className="text-xs text-muted-foreground p-4 text-center">No outstanding POs</p>
          ) : (
            groups.map((group) => {
              const ids = group.purchaseOrders.map((p) => p.purchaseOrderId);
              const allSelected = ids.length > 0 && ids.every((id) => selectedIds.includes(id));
              const someSelected = ids.some((id) => selectedIds.includes(id));
              const isOpen = !collapsed[group.vendorId];

              return (
                <div key={group.vendorId} className="border-t">
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 px-3 py-2 bg-muted/20 hover:bg-muted/30 text-left text-sm font-medium"
                    onClick={() => toggleCollapse(group.vendorId)}
                  >
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    )}
                    <Checkbox
                      checked={allSelected ? true : someSelected ? "indeterminate" : false}
                      onCheckedChange={() => toggleVendorGroup(group)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span>{group.vendorName}</span>
                    {group.vendorCode && (
                      <span className="text-xs text-muted-foreground font-normal">
                        ({group.vendorCode})
                      </span>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {group.purchaseOrders.length} PO(s)
                    </span>
                  </button>
                  {isOpen &&
                    group.purchaseOrders.map((po) => renderRow(po, group.vendorId))}
                </div>
              );
            })
          )
        ) : flatPOs.length === 0 ? (
          <p className="text-xs text-muted-foreground p-4 text-center">No outstanding POs</p>
        ) : (
          flatPOs.map((po) => renderRow(po, po.vendorId))
        )}
      </div>
    </div>
  );
}
