import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    PackageCheck, Truck, Clock, CheckCircle2,
    ArrowRight, CalendarClock, User, MapPin,
} from "lucide-react";
import { getDispatchDashboard } from "@/services/dispatch";
import { useToast } from "@/hooks/use-toast";

const STATUS_CONFIG = {
    PENDING:     { label: "Pending",     className: "bg-amber-50 text-amber-700 border-amber-200" },
    IN_TRANSIT:  { label: "In Transit",  className: "bg-blue-50 text-blue-700 border-blue-200" },
    DELIVERED:   { label: "Delivered",   className: "bg-green-50 text-green-700 border-green-200" },
    ON_HOLD:     { label: "On Hold",     className: "bg-red-50 text-red-700 border-red-200" },
};

function StatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status] ?? { label: status, className: "bg-muted text-muted-foreground border-border" };
    return (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${cfg.className}`}>
            {cfg.label}
        </span>
    );
}

export default function DispatchDashboard({ refreshKey, onNavigate }) {
    const { toast } = useToast();
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const fetchDashboard = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await getDispatchDashboard();
            setStats(res?.data ?? null);
        } catch (err) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => { fetchDashboard(); }, [fetchDashboard, refreshKey]);

    return (
        <div className="flex h-full min-h-0 flex-col gap-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 flex-shrink-0">
                {isLoading && !stats ? (
                    <>
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
                        ))}
                    </>
                ) : (
                    <>
                        <Card
                            className="cursor-pointer hover:shadow-sm transition-shadow"
                            onClick={() => onNavigate?.("ready")}
                        >
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Ready for Dispatch</CardTitle>
                                <PackageCheck className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-orange-600">{stats?.readyCount ?? 0}</div>
                                <p className="text-xs text-muted-foreground">Awaiting dispatch</p>
                            </CardContent>
                        </Card>

                        <Card
                            className="cursor-pointer hover:shadow-sm transition-shadow"
                            onClick={() => onNavigate?.("list")}
                        >
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">In Transit</CardTitle>
                                <Truck className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-blue-600">{stats?.inTransitCount ?? 0}</div>
                                <p className="text-xs text-muted-foreground">Out for delivery</p>
                            </CardContent>
                        </Card>

                        <Card
                            className="cursor-pointer hover:shadow-sm transition-shadow"
                            onClick={() => onNavigate?.("list")}
                        >
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Delivered</CardTitle>
                                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">{stats?.deliveredCount ?? 0}</div>
                                <p className="text-xs text-muted-foreground">Successfully delivered</p>
                            </CardContent>
                        </Card>

                        <Card
                            className="cursor-pointer hover:shadow-sm transition-shadow"
                            onClick={() => onNavigate?.("ready")}
                        >
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
                                <Clock className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats?.totalPending ?? 0}</div>
                                <p className="text-xs text-muted-foreground">Not yet dispatched</p>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>

            {/* Recent Dispatches */}
            <Card className="flex min-h-0 flex-1 flex-col">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Recent Dispatches</CardTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1 text-primary"
                            onClick={() => onNavigate?.("list")}
                        >
                            View all
                            <ArrowRight className="h-3 w-3" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                    {isLoading && !stats ? (
                        <p className="text-muted-foreground text-center py-4">Loading dashboard...</p>
                    ) : (stats?.recentDispatches?.length ?? 0) === 0 ? (
                        <p className="text-muted-foreground text-center py-4">No recent dispatches</p>
                    ) : (
                        <div className="h-full overflow-y-auto pr-1 space-y-3">
                            {stats.recentDispatches.map((d) => {
                                const dispatchDate = d.createdAt
                                    ? new Date(d.createdAt).toLocaleDateString()
                                    : null;
                                const customerName = d.customer?.shopname || d.customer?.name || "Unknown Customer";
                                const orderCount = d.saleOrders?.length ?? 0;
                                const details = [
                                    customerName,
                                    d.customer?.city,
                                    d.deliveryPerson?.name,
                                    `${orderCount} order${orderCount !== 1 ? "s" : ""}`,
                                ].filter(Boolean).join(" • ");

                                return (
                                    <div
                                        key={d.id}
                                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                                        onClick={() => onNavigate?.("list")}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium">{d.dcNumber}</div>
                                            <div className="text-sm text-muted-foreground truncate">{details}</div>
                                        </div>
                                        <div className="text-right shrink-0 ml-3">
                                            <StatusBadge status={d.status} />
                                            {dispatchDate && (
                                                <div className="text-xs text-muted-foreground mt-1">{dispatchDate}</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
