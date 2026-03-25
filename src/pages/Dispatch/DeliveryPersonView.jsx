import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package2, Truck, CheckCircle } from "lucide-react";
import DispatchOrderCard from "./components/DispatchOrderCard";
import DispatchGroupSection from "./components/DispatchGroupSection";
import SignatureModal from "./components/SignatureModal";
import { bulkMarkPickup, bulkMarkDelivered } from "@/services/dispatch";
import { useToast } from "@/hooks/use-toast";

function groupByCustomer(orders) {
    const groups = {};
    for (const order of orders) {
        const key = order.customer?.shopname || order.customer?.name || "Unknown";
        if (!groups[key]) groups[key] = { label: key, customer: order.customer, orders: [] };
        groups[key].orders.push(order);
    }
    return Object.values(groups);
}

/**
 * Mobile-first tabbed view for Delivery Person role.
 * Pickup tab  → select READY_FOR_DISPATCH orders → mark In Transit.
 * Delivery tab → deliver In Transit orders by customer → signature modal.
 */
export default function DeliveryPersonView({ orders = [], onRefresh }) {
    const { toast } = useToast();

    // Pickup tab state
    const [selectedPickupIds, setSelectedPickupIds] = useState(new Set());
    const [isPickingUp, setIsPickingUp] = useState(false);

    // Delivery tab / signature state
    const [pendingDelivery, setPendingDelivery] = useState(null); // { orders[], customer }
    const [isDelivering, setIsDelivering] = useState(false);
    const [signatureOpen, setSignatureOpen] = useState(false);

    const pickupOrders  = useMemo(() => orders.filter((o) => o.status === "READY_FOR_DISPATCH"), [orders]);
    const deliveryGroups = useMemo(() => groupByCustomer(orders.filter((o) => o.dispatchStatus === "In Transit" && o.status !== "DELIVERED")), [orders]);

    // ── Pickup logic ──
    const togglePickup = (id) => {
        setSelectedPickupIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handleMarkPickup = async () => {
        if (selectedPickupIds.size === 0) return;
        try {
            setIsPickingUp(true);
            await bulkMarkPickup([...selectedPickupIds]);
            toast({ title: "Picked up!", description: `${selectedPickupIds.size} order(s) marked as In Transit.`, success: true });
            setSelectedPickupIds(new Set());
            onRefresh();
        } catch (err) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setIsPickingUp(false);
        }
    };

    // ── Delivery logic ──
    const handleDeliverGroup = (groupOrders, customer) => {
        setPendingDelivery({ orders: groupOrders, customer });
        setSignatureOpen(true);
    };

    const handleSignatureConfirm = async (signature) => {
        if (!pendingDelivery) return;
        try {
            setIsDelivering(true);
            await bulkMarkDelivered({ orderIds: pendingDelivery.orders.map((o) => o.id), signature });
            toast({ title: "Delivered!", description: `${pendingDelivery.orders.length} order(s) marked as Delivered.`, success: true });
            setSignatureOpen(false);
            setPendingDelivery(null);
            onRefresh();
        } catch (err) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setIsDelivering(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <Tabs defaultValue="pickup" className="flex flex-col flex-1">
                <TabsList className="grid grid-cols-2 w-full">
                    <TabsTrigger value="pickup" className="gap-1.5">
                        <Package2 className="h-4 w-4" />
                        Pickup
                        {pickupOrders.length > 0 && (
                            <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px] py-0">
                                {pickupOrders.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="delivery" className="gap-1.5">
                        <Truck className="h-4 w-4" />
                        Delivery
                        {deliveryGroups.length > 0 && (
                            <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px] py-0">
                                {deliveryGroups.reduce((a, g) => a + g.orders.length, 0)}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* ── PICKUP TAB ── */}
                <TabsContent value="pickup" className="flex-1 mt-3">
                    {pickupOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                            <Package2 className="h-12 w-12 opacity-30" />
                            <p className="text-sm font-medium">No orders to pick up</p>
                            <p className="text-xs text-center px-4">Orders assigned to you with status "Ready for Dispatch" will appear here.</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-muted-foreground">{pickupOrders.length} order(s) ready · select to mark picked up</p>
                                {selectedPickupIds.size > 0 && (
                                    <button
                                        type="button"
                                        className="text-xs text-primary underline"
                                        onClick={() => setSelectedPickupIds(new Set())}
                                    >
                                        Clear selection
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-col gap-2 pb-24">
                                {pickupOrders.map((order) => (
                                    <DispatchOrderCard
                                        key={order.id}
                                        order={order}
                                        selectable
                                        selected={selectedPickupIds.has(order.id)}
                                        onToggle={togglePickup}
                                    />
                                ))}
                            </div>

                            {/* Sticky CTA */}
                            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t shadow-lg z-10 md:static md:bg-transparent md:border-0 md:shadow-none md:mt-3 md:p-0">
                                <Button
                                    className="w-full gap-2"
                                    size="lg"
                                    disabled={selectedPickupIds.size === 0 || isPickingUp}
                                    onClick={handleMarkPickup}
                                >
                                    {isPickingUp ? (
                                        <>
                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                            Marking...
                                        </>
                                    ) : (
                                        <>
                                            <Truck className="h-4 w-4" />
                                            Mark as Picked Up {selectedPickupIds.size > 0 ? `(${selectedPickupIds.size})` : ""}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </>
                    )}
                </TabsContent>

                {/* ── DELIVERY TAB ── */}
                <TabsContent value="delivery" className="flex-1 mt-3">
                    {deliveryGroups.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                            <CheckCircle className="h-12 w-12 opacity-30" />
                            <p className="text-sm font-medium">No orders in transit</p>
                            <p className="text-xs text-center px-4">Pick up orders first — they will appear here grouped by customer.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3 pb-6">
                            {deliveryGroups.map((group) => (
                                <DispatchGroupSection
                                    key={group.label}
                                    label={`${group.label}${group.customer?.city ? " · " + group.customer.city : ""}`}
                                    orders={group.orders}
                                    showDeliverBtn
                                    onDeliver={(groupOrders) => handleDeliverGroup(groupOrders, group.customer)}
                                    defaultOpen
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Signature modal */}
            <SignatureModal
                open={signatureOpen}
                onClose={() => { if (!isDelivering) { setSignatureOpen(false); setPendingDelivery(null); } }}
                onConfirm={handleSignatureConfirm}
                customerName={pendingDelivery?.customer?.shopname || pendingDelivery?.customer?.name}
                orderCount={pendingDelivery?.orders?.length ?? 0}
                isSaving={isDelivering}
            />
        </div>
    );
}
