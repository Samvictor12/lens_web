import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarClock, User } from "lucide-react";

const DISPATCH_STATUS_BADGE = {
    Pending: { variant: "outline", label: "Pending" },
    "Ready for Pickup": { variant: "outline", label: "Ready for Pickup" },
    Assigned: { variant: "secondary", label: "Assigned" },
    "In Transit": { variant: "default", label: "In Transit" },
    Delivered: { variant: "success", label: "Delivered" },
};

function dash(value) {
    if (value == null || value === "") return "—";
    return String(value);
}

function formatSoDate(value) {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

/**
 * Card displaying a single sale order in the dispatch view.
 *
 * Props:
 *   order         — sale order (customer, category, lensProduct, assignedPerson, …)
 *   selectable    — show checkbox (pickup / ready mode)
 *   selected      — controlled checkbox state
 *   onToggle      — (id) => void
 *   compact       — thinner padding
 */
export default function DispatchOrderCard({ order, selectable, selected, onToggle, compact }) {
    const badge = DISPATCH_STATUS_BADGE[order.dispatchStatus] ?? {
        variant: "outline",
        label: order.dispatchStatus ?? "—",
    };

    const lensCategory =
        order.category?.name || order.lensProduct?.category?.name || null;
    const lensName = order.lensProduct?.lens_name || null;

    const estimatedDateStr = order.estimatedDate
        ? new Date(order.estimatedDate).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "2-digit",
          })
        : null;

    const fields = [
        { label: "SO", value: dash(order.orderNo) },
        { label: "SO date", value: formatSoDate(order.orderDate) },
        { label: "Customer ref", value: dash(order.customerRefNo) },
        { label: "Patient ref", value: dash(order.itemRefNo) },
        { label: "Lens category", value: dash(lensCategory) },
        { label: "Lens name", value: dash(lensName) },
    ];

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
                <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{dash(order.orderNo)}</span>
                        <Badge variant={badge.variant} className="text-[10px] h-4 px-1.5 py-0">
                            {badge.label}
                        </Badge>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1.5">
                        {fields.map((f) => (
                            <div key={f.label} className="min-w-0">
                                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                    {f.label}
                                </div>
                                <div className="text-xs font-medium text-foreground truncate" title={f.value}>
                                    {f.value}
                                </div>
                            </div>
                        ))}
                    </div>

                    {(order.customer?.name || order.customer?.shopname) && (
                        <div className="flex items-start gap-1 text-[11px] text-muted-foreground">
                            <User className="h-3 w-3 shrink-0 mt-0.5" />
                            <div className="min-w-0 truncate">
                                {order.customer?.name && (
                                    <span className="font-medium text-foreground">
                                        {order.customer.name}
                                    </span>
                                )}
                                {order.customer?.shopname && (
                                    <span>
                                        {order.customer?.name ? " · " : ""}
                                        {order.customer.shopname}
                                    </span>
                                )}
                                {order.customer?.city ? ` · ${order.customer.city}` : ""}
                            </div>
                        </div>
                    )}

                    {(estimatedDateStr || order.assignedPerson) && (
                        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground flex-wrap">
                            {estimatedDateStr && (
                                <span className="flex items-center gap-1">
                                    <CalendarClock className="h-3 w-3" />
                                    Est. {estimatedDateStr}
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
