import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, LayoutGrid, List, Package2 } from "lucide-react";
import DispatchGroupSection from "./components/DispatchGroupSection";
import DispatchOrderCard from "./components/DispatchOrderCard";

const GROUP_BY_OPTIONS = [
    { value: "customer",        label: "Customer" },
    { value: "date",            label: "Delivery Date" },
    { value: "deliveryPerson",  label: "Delivery Person" },
    { value: "product",         label: "Product" },
    { value: "area",            label: "Area / City" },
];

/** Client-side grouping function */
function groupOrders(orders, groupBy) {
    const groups = {};

    for (const order of orders) {
        let key;
        switch (groupBy) {
            case "customer":
                key = order.customer?.shopname || order.customer?.name || "Unknown Customer";
                break;
            case "date":
                key = order.estimatedDate
                    ? new Date(order.estimatedDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                    : "No Date Set";
                break;
            case "deliveryPerson":
                key = order.assignedPerson?.name || "Unassigned";
                break;
            case "product":
                key = order.lensProduct?.name || "Unknown Product";
                break;
            case "area":
                key = order.customer?.city || "Unknown Area";
                break;
            default:
                key = "All Orders";
        }
        if (!groups[key]) groups[key] = [];
        groups[key].push(order);
    }

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

/**
 * Admin / Staff dispatch view.
 * Supports group-by and card/list view toggle.
 */
export default function AdminDispatchView({ orders = [], onRefresh, isLoading }) {
    const [groupBy, setGroupBy] = useState("customer");
    const [view, setView] = useState("card"); // "card" | "list"

    const readyOrders   = orders.filter((o) => o.status === "READY_FOR_DISPATCH");
    const inTransit     = orders.filter((o) => o.dispatchStatus === "In Transit" && o.status !== "DELIVERED");
    const grouped       = useMemo(() => groupOrders(orders, groupBy), [orders, groupBy]);

    return (
        <div className="flex flex-col gap-4">
            {/* Summary row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Card className="border-amber-200 bg-amber-50">
                    <CardContent className="py-3 px-4">
                        <p className="text-xs text-amber-700 font-medium">Ready for Dispatch</p>
                        <p className="text-2xl font-bold text-amber-800">{readyOrders.length}</p>
                    </CardContent>
                </Card>
                <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="py-3 px-4">
                        <p className="text-xs text-blue-700 font-medium">In Transit</p>
                        <p className="text-2xl font-bold text-blue-800">{inTransit.length}</p>
                    </CardContent>
                </Card>
                <Card className="border-border sm:block hidden">
                    <CardContent className="py-3 px-4">
                        <p className="text-xs text-muted-foreground font-medium">Total Pending</p>
                        <p className="text-2xl font-bold">{orders.length}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
                {/* Group by */}
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Group by:</span>
                    <div className="flex gap-1 flex-wrap">
                        {GROUP_BY_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setGroupBy(opt.value)}
                                className={[
                                    "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                                    groupBy === opt.value
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-background text-muted-foreground border-border hover:border-primary/50",
                                ].join(" ")}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* View toggle + refresh */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setView("card")}
                        className={`p-1.5 rounded-md border transition-colors ${view === "card" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                        title="Card view"
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setView("list")}
                        className={`p-1.5 rounded-md border transition-colors ${view === "list" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                        title="List view"
                    >
                        <List className="h-4 w-4" />
                    </button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 h-8"
                        onClick={onRefresh}
                        disabled={isLoading}
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                        <span className="hidden sm:inline">Refresh</span>
                    </Button>
                </div>
            </div>

            {/* Groups */}
            {orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                    <Package2 className="h-12 w-12 opacity-30" />
                    <p className="text-sm font-medium">No orders ready for dispatch</p>
                    <p className="text-xs">Orders with status "Ready for Dispatch" will appear here.</p>
                </div>
            ) : (
                <div className={view === "card" ? "flex flex-col gap-3" : "flex flex-col gap-2"}>
                    {grouped.map(([label, groupOrds]) => (
                        <DispatchGroupSection
                            key={label}
                            label={label}
                            orders={groupOrds}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
