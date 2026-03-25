import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Truck } from "lucide-react";
import DispatchOrderCard from "./DispatchOrderCard";

/**
 * Collapsible group of dispatch orders.
 *
 * Props:
 *   label         — group header text
 *   orders        — array of sale orders
 *   selectable    — passed through to DispatchOrderCard (pickup mode)
 *   selectedIds   — Set of selected order IDs
 *   onToggle      — (id) => void
 *   showDeliverBtn — show "Deliver" button in footer (delivery tab)
 *   onDeliver      — () => void — called when Deliver button clicked
 *   defaultOpen   — whether the group starts expanded (default: true)
 */
export default function DispatchGroupSection({
    label,
    orders = [],
    selectable,
    selectedIds,
    onToggle,
    showDeliverBtn,
    onDeliver,
    defaultOpen = true,
}) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className="rounded-lg border border-border overflow-hidden">
            {/* Header */}
            <button
                type="button"
                className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/40 hover:bg-muted/70 transition-colors"
                onClick={() => setOpen((v) => !v)}
            >
                <div className="flex items-center gap-2">
                    {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    <span className="text-sm font-semibold text-foreground">{label}</span>
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5 py-0">
                        {orders.length}
                    </Badge>
                </div>
                {showDeliverBtn && orders.length > 0 && (
                    <Button
                        size="xs"
                        variant="default"
                        className="h-6 px-2 text-[11px] gap-1"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDeliver && onDeliver(orders);
                        }}
                    >
                        <Truck className="h-3 w-3" />
                        Deliver ({orders.length})
                    </Button>
                )}
            </button>

            {/* Body */}
            {open && (
                <div className="divide-y divide-border bg-background">
                    {orders.length === 0 ? (
                        <p className="px-4 py-3 text-xs text-muted-foreground italic">No orders in this group.</p>
                    ) : (
                        <div className="p-2 flex flex-col gap-2">
                            {orders.map((order) => (
                                <DispatchOrderCard
                                    key={order.id}
                                    order={order}
                                    selectable={selectable}
                                    selected={selectedIds?.has(order.id)}
                                    onToggle={onToggle}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
