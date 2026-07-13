import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarClock, MapPin, Package, Truck, User, CheckCircle, PauseCircle, Clock, Eye } from "lucide-react";
import { updateDispatchStatus } from "@/services/dispatch";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

import { DISPATCH_STATUS_CONFIG as STATUS_CONFIG } from "../dispatchStatusConfig";

/**
 * Card for a DispatchCopy record in the Dispatch List tab.
 *
 * Props:
 *   dispatch      — DispatchCopy object (with customer, deliveryPerson, saleOrders)
 *   isDeliveryPerson — boolean
 *   onStatusUpdated — () => void — refresh callback
 *   onSignatureRequest — (dispatchId) => void — triggers signature modal for DELIVERED
 */
export default function DispatchRecordCard({ dispatch, isDeliveryPerson, onStatusUpdated, onSignatureRequest, onView }) {
    const { toast } = useToast();
    const [isUpdating, setIsUpdating] = useState(null); // action string being processed

    const cfg = STATUS_CONFIG[dispatch.status] ?? { label: dispatch.status, className: "border-border bg-muted text-muted-foreground" };

    const expectedDate = dispatch.expectedDeliveryDate
        ? new Date(dispatch.expectedDeliveryDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })
        : null;
    const actualDate = dispatch.actualDeliveryDate
        ? new Date(dispatch.actualDeliveryDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })
        : null;

    const orderCount = dispatch.saleOrders?.length ?? 0;
    const customerAddress = [dispatch.customer?.address, dispatch.customer?.city, dispatch.customer?.state]
        .filter(Boolean).join(", ");

    const handleAction = async (action) => {
        if (action === "DELIVERED") {
            onSignatureRequest?.(dispatch.id);
            return;
        }
        try {
            setIsUpdating(action);
            await updateDispatchStatus(dispatch.id, action);
            toast({
                title: "Updated",
                description:
                    action === "PICKUP"
                        ? "Dispatch picked up — now In Transit"
                        : action === "ON_HOLD"
                            ? "Dispatch put on hold"
                            : `Dispatch marked as ${action}`,
            });
            onStatusUpdated?.();
        } catch (err) {
            toast({ title: "Error", description: err?.message || String(err), variant: "destructive" });
        } finally {
            setIsUpdating(null);
        }
    };

    const isActionLoading = (action) => isUpdating === action;

    return (
        <div className={`rounded-lg border bg-card transition-shadow hover:shadow-sm ${cfg.borderClass || ""}`}>
            {/* Header row */}
            <div className="flex items-center justify-between px-3 pt-3 pb-1.5 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{dispatch.dcNumber}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.className}`}>
                        {cfg.label}
                    </span>
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                        {orderCount} order{orderCount !== 1 ? "s" : ""}
                    </Badge>
                </div>
                {expectedDate && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {actualDate ? `Delivered: ${actualDate}` : `Expected: ${expectedDate}`}
                    </span>
                )}
            </div>

            {/* Customer + delivery person */}
            <div className="px-3 pb-2 flex flex-col gap-1">
                <div className="flex items-center gap-1 text-xs">
                    <User className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="font-medium">{dispatch.customer?.shopname || dispatch.customer?.name || "—"}</span>
                    {dispatch.customer?.city && (
                        <>
                            <MapPin className="h-3 w-3 text-muted-foreground shrink-0 ml-1" />
                            <span className="text-muted-foreground">{dispatch.customer.city}</span>
                        </>
                    )}
                </div>
                {customerAddress && (
                    <p className="text-[11px] text-muted-foreground ml-4">{customerAddress}</p>
                )}
                {dispatch.deliveryPerson && (
                    <div className="flex items-center gap-1 text-xs text-primary">
                        <Truck className="h-3 w-3" />
                        <span>{dispatch.deliveryPerson.name}</span>
                        {dispatch.deliveryPerson.phonenumber && (
                            <span className="text-muted-foreground">· {dispatch.deliveryPerson.phonenumber}</span>
                        )}
                    </div>
                )}
            </div>

            {/* Orders preview — Sale Order No + Customer Ref */}
            {orderCount > 0 && (
                <div className="px-3 pb-2 space-y-1.5">
                    <div className="flex flex-wrap gap-1">
                        {dispatch.saleOrders.slice(0, 4).map((o) => (
                            <span key={o.id} className="text-[10px] px-1.5 py-0.5 rounded bg-background border font-medium">
                                {o.orderNo}
                            </span>
                        ))}
                        {orderCount > 4 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-background border text-muted-foreground">
                                +{orderCount - 4} more
                            </span>
                        )}
                    </div>
                    {(() => {
                        const refs = [
                            ...new Set(
                                (dispatch.saleOrders || [])
                                    .map((o) => o.customerRefNo)
                                    .filter(Boolean)
                            ),
                        ];
                        if (refs.length === 0) return null;
                        return (
                            <div className="flex flex-wrap gap-1 items-center">
                                <span className="text-[10px] text-muted-foreground">Ref:</span>
                                {refs.slice(0, 4).map((ref) => (
                                    <span
                                        key={ref}
                                        className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 border font-medium"
                                    >
                                        {ref}
                                    </span>
                                ))}
                                {refs.length > 4 && (
                                    <span className="text-[10px] text-muted-foreground">
                                        +{refs.length - 4}
                                    </span>
                                )}
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 px-3 pb-3 pt-1 flex-wrap border-t mt-1">
                <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1.5"
                    onClick={() => onView?.(dispatch)}
                >
                    <Eye className="h-3 w-3" />
                    View
                </Button>
                {dispatch.status !== "DELIVERED" && (
                    <>
                        {dispatch.status === "PENDING" && (
                            <Button
                                size="sm"
                                variant="default"
                                className="h-7 text-xs gap-1.5"
                                disabled={!!isUpdating}
                                onClick={() => handleAction("PICKUP")}
                            >
                                {isActionLoading("PICKUP") ? (
                                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                ) : (
                                    <Truck className="h-3 w-3" />
                                )}
                                Pickup
                            </Button>
                        )}
                        {dispatch.status === "IN_TRANSIT" && (
                            <Button
                                size="sm"
                                variant="default"
                                className="h-7 text-xs gap-1.5 bg-green-600 hover:bg-green-700"
                                disabled={!!isUpdating}
                                onClick={() => handleAction("DELIVERED")}
                            >
                                <CheckCircle className="h-3 w-3" />
                                Delivered
                            </Button>
                        )}
                        {(dispatch.status === "PENDING" || dispatch.status === "IN_TRANSIT") && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1.5"
                                disabled={!!isUpdating}
                                onClick={() => handleAction("ON_HOLD")}
                            >
                                {isActionLoading("ON_HOLD") ? (
                                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                ) : (
                                    <PauseCircle className="h-3 w-3" />
                                )}
                                Hold
                            </Button>
                        )}
                        {dispatch.status === "ON_HOLD" && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1.5"
                                disabled={!!isUpdating}
                                onClick={() => handleAction("PICKUP")}
                            >
                                <Truck className="h-3 w-3" />
                                Resume
                            </Button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
