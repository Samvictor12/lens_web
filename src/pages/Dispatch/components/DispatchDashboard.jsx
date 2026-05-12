import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    PackageCheck, Truck, Clock, RefreshCw,
    ArrowRight, CalendarClock, User, MapPin,
} from "lucide-react";
import { getDispatchDashboard } from "@/services/dispatch";
import { useToast } from "@/hooks/use-toast";

const STATUS_CONFIG = {
    PENDING:     { label: "Pending",     className: "bg-amber-100 text-amber-800 border-amber-300" },
    IN_TRANSIT:  { label: "In Transit",  className: "bg-blue-100 text-blue-800 border-blue-300" },
    DELIVERED:   { label: "Delivered",   className: "bg-green-100 text-green-800 border-green-300" },
    ON_HOLD:     { label: "On Hold",     className: "bg-red-100 text-red-800 border-red-300" },
};

function StatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status] ?? { label: status, className: "bg-muted text-muted-foreground" };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${cfg.className}`}>
            {cfg.label}
        </span>
    );
}

function StatCard({ icon: Icon, label, value, colorClass, onClick }) {
    return (
        <Card
            className={`border ${colorClass} cursor-pointer hover:shadow-sm transition-shadow`}
            onClick={onClick}
        >
            <CardContent className="py-3 px-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${colorClass} bg-opacity-20`}>
                    <Icon className="h-4 w-4" />
                </div>
                <div>
                    <p className="text-xs font-medium text-muted-foreground">{label}</p>
                    <p className="text-2xl font-bold">{value ?? "—"}</p>
                </div>
            </CardContent>
        </Card>
    );
}

function RecentDispatchCard({ dispatch }) {
    const expectedDate = dispatch.expectedDeliveryDate
        ? new Date(dispatch.expectedDeliveryDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })
        : null;

    const orderCount = dispatch.saleOrders?.length ?? 0;

    return (
        <div className="flex items-start justify-between gap-2 p-3 rounded-lg border bg-card">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">{dispatch.dcNumber}</span>
                    <StatusBadge status={dispatch.status} />
                </div>
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <User className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                        {dispatch.customer?.shopname || dispatch.customer?.name || "—"}
                    </span>
                    {dispatch.customer?.city && (
                        <>
                            <MapPin className="h-3 w-3 shrink-0 ml-1" />
                            <span>{dispatch.customer.city}</span>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground flex-wrap">
                    {expectedDate && (
                        <span className="flex items-center gap-1">
                            <CalendarClock className="h-3 w-3" />
                            {expectedDate}
                        </span>
                    )}
                    {dispatch.deliveryPerson && (
                        <span className="text-primary font-medium">{dispatch.deliveryPerson.name}</span>
                    )}
                    <span>{orderCount} order{orderCount !== 1 ? "s" : ""}</span>
                </div>
            </div>
        </div>
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
        <div className="flex flex-col gap-4 pb-6">
            {/* Refresh */}
            <div className="flex justify-end">
                <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={fetchDashboard} disabled={isLoading}>
                    <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                    <span className="hidden sm:inline">Refresh</span>
                </Button>
            </div>

            {/* Stat cards */}
            {isLoading && !stats ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <StatCard
                        icon={PackageCheck}
                        label="Ready for Dispatch"
                        value={stats?.readyCount ?? 0}
                        colorClass="border-amber-200 text-amber-700"
                        onClick={() => onNavigate?.("ready")}
                    />
                    <StatCard
                        icon={Truck}
                        label="In Transit"
                        value={stats?.inTransitCount ?? 0}
                        colorClass="border-blue-200 text-blue-700"
                        onClick={() => onNavigate?.("list")}
                    />
                    <StatCard
                        icon={Clock}
                        label="Total Pending"
                        value={stats?.totalPending ?? 0}
                        colorClass="border-border text-muted-foreground"
                        onClick={() => onNavigate?.("ready")}
                    />
                </div>
            )}

            {/* Recent Dispatches */}
            <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold">Recent Dispatches</CardTitle>
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
                <CardContent className="px-4 pb-4">
                    {isLoading && !stats ? (
                        <div className="flex flex-col gap-2">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
                            ))}
                        </div>
                    ) : (stats?.recentDispatches?.length ?? 0) === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-6">No recent dispatches</p>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {stats.recentDispatches.map((d) => (
                                <RecentDispatchCard key={d.id} dispatch={d} />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
