import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getDispatchOrders } from "@/services/dispatch";
import { useToast } from "@/hooks/use-toast";
import AdminDispatchView from "./AdminDispatchView";
import DeliveryPersonView from "./DeliveryPersonView";

/**
 * Top-level Dispatch Management page.
 * Role-gates between AdminDispatchView and DeliveryPersonView.
 */
export default function DispatchMain() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const isDeliveryPerson = user?.roleName === "Delivery Person";

    const fetchOrders = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await getDispatchOrders();
            setOrders(res?.data || []);
        } catch (err) {
            toast({ title: "Error", description: err.message || "Failed to load dispatch orders", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    return (
        <div className="flex flex-col h-full p-2 md:p-4 gap-4 w-full">
            {/* Page Header */}
            <div>
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Dispatch Management</h1>
                <p className="text-xs text-muted-foreground">
                    {isDeliveryPerson
                        ? "Manage your assigned deliveries"
                        : "Track and manage all orders ready for dispatch"}
                </p>
            </div>

            {isLoading && orders.length === 0 ? (
                <div className="flex flex-col gap-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
                    ))}
                </div>
            ) : isDeliveryPerson ? (
                <DeliveryPersonView orders={orders} onRefresh={fetchOrders} />
            ) : (
                <AdminDispatchView orders={orders} onRefresh={fetchOrders} isLoading={isLoading} />
            )}
        </div>
    );
}
