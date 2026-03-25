import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarClock, MapPin, Package, User } from "lucide-react";

const DISPATCH_STATUS_BADGE = {
    "Pending":    { variant: "outline",   label: "Pending" },
    "Assigned":   { variant: "secondary", label: "Assigned" },
    "In Transit": { variant: "default",   label: "In Transit" },
    "Delivered":  { variant: "success",   label: "Delivered" },
};

/**
 * Card displaying a single sale order in the dispatch view.
 *
 * Props:
 *   order         — the sale order object (with customer, lensProduct, coating, assignedPerson)
 *   selectable    — show checkbox (pickup mode)
 *   selected      — controlled checkbox state
 *   onToggle      — (id) => void — called when checkbox changes
 *   compact       — thinner card for list-view style
 */
export default function DispatchOrderCard({ order, selectable, selected, onToggle, compact }) {
    const badge = DISPATCH_STATUS_BADGE[order.dispatchStatus] ?? { variant: "outline", label: order.dispatchStatus ?? "—" };

    const estimatedDateStr = order.estimatedDate
        ? new Date(order.estimatedDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })
        : null;

    const productLabel = [order.lensProduct?.name, order.coating?.name].filter(Boolean).join(" · ");

    return (
        <div
            className={[
                "rounded-lg border bg-card text-card-foreground transition-colors",
                compact ? "px-3 py-2" : "px-3 py-3",
                selectable
                    ? selected
                        ? "border-primary bg-primary/5 cursor-pointer"
                        : "border-border hover:border-primary/50 cursor-pointer"
                    : "border-border",
            ].join(" ")}
            onClick={() => selectable && onToggle && onToggle(order.id)}
        >
            <div className="flex items-start gap-2">
                {selectable && (
                    <Checkbox
                        checked={selected}
                        onCheckedChange={() => onToggle && onToggle(order.id)}
                        className="mt-0.5 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                    />
                )}
                <div className="flex-1 min-w-0">
                    {/* Row 1: Order no + status badge */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{order.orderNo}</span>
                        <Badge variant={badge.variant} className="text-[10px] h-4 px-1.5 py-0">
                            {badge.label}
                        </Badge>
                    </div>

                    {/* Row 2: Customer */}
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3 shrink-0" />
                        <span className="truncate">{order.customer?.shopname || order.customer?.name || "—"}</span>
                        {order.customer?.city && (
                            <>
                                <MapPin className="h-3 w-3 shrink-0 ml-1" />
                                <span className="truncate">{order.customer.city}</span>
                            </>
                        )}
                    </div>

                    {/* Row 3: Product */}
                    {productLabel && (
                        <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                            <Package className="h-3 w-3 shrink-0" />
                            <span className="truncate">{productLabel}</span>
                        </div>
                    )}

                    {/* Row 4: Estimated date + assigned person */}
                    {(estimatedDateStr || order.assignedPerson) && (
                        <div className="flex items-center justify-between gap-2 mt-1 text-[11px] text-muted-foreground flex-wrap">
                            {estimatedDateStr && (
                                <span className="flex items-center gap-1">
                                    <CalendarClock className="h-3 w-3" />
                                    {estimatedDateStr}
                                </span>
                            )}
                            {order.assignedPerson && (
                                <span className="text-primary font-medium truncate">
                                    {order.assignedPerson.name}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
