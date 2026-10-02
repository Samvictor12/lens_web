import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
    Search,
    Filter,
    X,
    Package,
    Clock,
    Truck,
    CheckCircle2,
    AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { getDispatchList, getDispatchDashboard, updateDispatchStatus } from "@/services/dispatch";
import { getDeliveryPersonsDropdown } from "@/services/user";
import { useToast } from "@/hooks/use-toast";
import DispatchRecordCard from "./DispatchRecordCard";
import SignatureModal from "./SignatureModal";
import ViewDispatchModal from "./ViewDispatchModal";
import {
    DispatchGroupBySelect,
    DispatchGroupedList,
    groupDispatches,
} from "./DispatchGroupBy";
import { FormSelect } from "@/components/ui/form-select";
import { Refresh } from "@/components/ui/Refresh";
import { ViewToggle } from "@/components/ui/view-toggle";
import { CardGrid } from "@/components/ui/card-grid";
import { Table } from "@/components/ui/table";
import { useDispatchColumns } from "./useDispatchColumns";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
    { value: "", label: "All Statuses" },
    { value: "PENDING", label: "Ready for Pickup" },
    { value: "IN_TRANSIT", label: "In Transit" },
    { value: "DELIVERED", label: "Delivered" },
    { value: "ON_HOLD", label: "On Hold" },
];

const GROUPED_FETCH_LIMIT = 500;

export default function DispatchList({ refreshKey, onStatusUpdated }) {
    const { toast } = useToast();
    const [dispatches, setDispatches] = useState([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [statsLoading, setStatsLoading] = useState(false);
    const [stats, setStats] = useState({
        totalCount: 0,
        pendingCount: 0,
        inTransitCount: 0,
        deliveredCount: 0,
        onHoldCount: 0,
    });
    const [activeCard, setActiveCard] = useState(null);

    const [showFilterSheet, setShowFilterSheet] = useState(false);
    const [view, setView] = useState(
        () => localStorage.getItem("dispatchListView") || "card"
    );
    const [groupBy, setGroupBy] = useState("none");

    // Committed filters
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [deliveryAgentFilter, setDeliveryAgentFilter] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    // Temp filters (inside sheet before Apply)
    const [tempStatus, setTempStatus] = useState("");
    const [tempDeliveryAgent, setTempDeliveryAgent] = useState("");
    const [tempDateFrom, setTempDateFrom] = useState("");
    const [tempDateTo, setTempDateTo] = useState("");

    // Delivery agent dropdown options
    const [deliveryAgents, setDeliveryAgents] = useState([]);

    // Pagination (1-based page for API; CardGrid/Table use 0-based pageIndex)
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    // Signature modal for DELIVERED action
    const [signatureDispatchId, setSignatureDispatchId] = useState(null);
    const [isDelivering, setIsDelivering] = useState(false);

    // View modal
    const [viewDispatch, setViewDispatch] = useState(null);

    const isGrouped = groupBy !== "none";

    const handleViewChange = (newView) => {
        setView(newView);
        localStorage.setItem("dispatchListView", newView);
    };

    // ── Fetch Dashboard KPI Stats ─────────────────────────────────────────────
    const fetchStats = useCallback(async () => {
        try {
            setStatsLoading(true);
            const res = await getDispatchDashboard();
            const data = res?.data || {};
            setStats({
                totalCount: data.totalCount ?? 0,
                pendingCount: data.pendingCount ?? data.totalPending ?? 0,
                inTransitCount: data.inTransitCount ?? 0,
                deliveredCount: data.deliveredCount ?? 0,
                onHoldCount: data.onHoldCount ?? 0,
            });
        } catch (_) {
            // silent fallback
        } finally {
            setStatsLoading(false);
        }
    }, []);

    const fetchList = useCallback(async () => {
        try {
            setIsLoading(true);
            const params = {
                page: isGrouped ? 1 : page,
                limit: isGrouped ? GROUPED_FETCH_LIMIT : pageSize,
                ...(search ? { search } : {}),
                ...(statusFilter ? { status: statusFilter } : {}),
                ...(deliveryAgentFilter ? { deliveryPersonId: deliveryAgentFilter } : {}),
                ...(dateFrom ? { dateFrom } : {}),
                ...(dateTo ? { dateTo } : {}),
            };
            const res = await getDispatchList(params);
            setDispatches(res?.dispatches || []);
            setTotal(res?.total || 0);
        } catch (err) {
            toast({ title: "Error", description: err?.message || String(err), variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [toast, page, pageSize, search, statusFilter, deliveryAgentFilter, dateFrom, dateTo, isGrouped]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats, refreshKey]);

    useEffect(() => {
        const timeout = setTimeout(fetchList, search ? 400 : 0);
        return () => clearTimeout(timeout);
    }, [fetchList, refreshKey, search]);

    useEffect(() => {
        getDeliveryPersonsDropdown()
            .then((res) => {
                const list = res?.data || [];
                setDeliveryAgents([
                    { value: "", label: "All Delivery Agents" },
                    ...list.map((u) => ({
                        value: u.value ?? u.id,
                        label: u.label ?? u.name,
                    })),
                ]);
            })
            .catch(() => {
                toast({ title: "Error", description: "Failed to load delivery agents", variant: "destructive" });
            });
    }, [toast]);

    const handleSignatureConfirm = async (signature) => {
        if (!signatureDispatchId) return;
        try {
            setIsDelivering(true);
            await updateDispatchStatus(signatureDispatchId, "DELIVERED", signature);
            toast({ title: "Delivered!", description: "Dispatch marked as delivered" });
            setSignatureDispatchId(null);
            onStatusUpdated?.();
            fetchList();
            fetchStats();
        } catch (err) {
            toast({ title: "Error", description: err?.message || String(err), variant: "destructive" });
        } finally {
            setIsDelivering(false);
        }
    };

    const handleStatusUpdated = () => {
        fetchList();
        fetchStats();
        onStatusUpdated?.();
    };

    const openView = (dispatch) => setViewDispatch(dispatch);

    const columns = useDispatchColumns({
        onStatusUpdated: handleStatusUpdated,
        onSignatureRequest: (id) => setSignatureDispatchId(id),
        onView: openView,
    });

    const groups = useMemo(
        () => (isGrouped ? groupDispatches(dispatches, groupBy) : []),
        [dispatches, groupBy, isGrouped]
    );

    const hasActiveFilters = !!(statusFilter || deliveryAgentFilter || dateFrom || dateTo || search || activeCard);

    // ── Clickable Filter Cards ────────────────────────────────────────────────
    const handleCardClick = (cardKey) => {
        setPage(1);
        if (activeCard === cardKey) {
            setActiveCard(null);
            setStatusFilter("");
            return;
        }

        setActiveCard(cardKey);
        if (cardKey === "total") {
            setStatusFilter("");
        } else if (cardKey === "pending") {
            setStatusFilter("PENDING");
        } else if (cardKey === "inTransit") {
            setStatusFilter("IN_TRANSIT");
        } else if (cardKey === "delivered") {
            setStatusFilter("DELIVERED");
        } else if (cardKey === "onHold") {
            setStatusFilter("ON_HOLD");
        }
    };

    const handleApplyFilters = () => {
        setStatusFilter(tempStatus);
        setDeliveryAgentFilter(tempDeliveryAgent);
        setDateFrom(tempDateFrom);
        setDateTo(tempDateTo);
        setPage(1);
        setShowFilterSheet(false);

        // Sync activeCard with applied status
        if (tempStatus === "PENDING") setActiveCard("pending");
        else if (tempStatus === "IN_TRANSIT") setActiveCard("inTransit");
        else if (tempStatus === "DELIVERED") setActiveCard("delivered");
        else if (tempStatus === "ON_HOLD") setActiveCard("onHold");
        else setActiveCard(null);
    };

    const handleClearFilters = () => {
        setTempStatus("");
        setTempDeliveryAgent("");
        setTempDateFrom("");
        setTempDateTo("");
        setStatusFilter("");
        setDeliveryAgentFilter("");
        setDateFrom("");
        setDateTo("");
        setSearch("");
        setActiveCard(null);
        setPage(1);
        setShowFilterSheet(false);
    };

    const handleGroupByChange = (value) => {
        setGroupBy(value || "none");
        setPage(1);
    };

    const pageIndex = page - 1;

    // Summary Cards Configuration (Sale Order Style)
    const summaryCards = [
        {
            key: "total",
            label: "Total Dispatches",
            value: statsLoading ? "…" : stats.totalCount,
            icon: Package,
            theme: {
                card: "bg-gradient-to-br from-blue-50 to-blue-100/80 border-blue-200/80 hover:border-blue-300 dark:from-blue-950/30 dark:to-blue-900/40 dark:border-blue-800",
                selected: "ring-2 ring-blue-500 border-blue-400 shadow-md shadow-blue-100 dark:shadow-none",
                iconWrap: "bg-blue-500 text-white shadow-xs shadow-blue-200",
                label: "text-blue-700/80 dark:text-blue-300",
                value: "text-blue-950 dark:text-blue-100",
            },
        },
        {
            key: "pending",
            label: "Ready for Pickup",
            value: statsLoading ? "…" : stats.pendingCount,
            icon: Clock,
            theme: {
                card: "bg-gradient-to-br from-amber-50 to-orange-100/70 border-amber-200/80 hover:border-amber-300 dark:from-amber-950/30 dark:to-amber-900/40 dark:border-amber-800",
                selected: "ring-2 ring-amber-500 border-amber-400 shadow-md shadow-amber-100 dark:shadow-none",
                iconWrap: "bg-amber-500 text-white shadow-xs shadow-amber-200",
                label: "text-amber-800/80 dark:text-amber-300",
                value: "text-amber-950 dark:text-amber-100",
            },
        },
        {
            key: "inTransit",
            label: "In Transit",
            value: statsLoading ? "…" : stats.inTransitCount,
            icon: Truck,
            theme: {
                card: "bg-gradient-to-br from-indigo-50 to-violet-100/60 border-indigo-200/80 hover:border-indigo-300 dark:from-indigo-950/30 dark:to-indigo-900/40 dark:border-indigo-800",
                selected: "ring-2 ring-indigo-500 border-indigo-400 shadow-md shadow-indigo-100 dark:shadow-none",
                iconWrap: "bg-indigo-500 text-white shadow-xs shadow-indigo-200",
                label: "text-indigo-700/80 dark:text-indigo-300",
                value: "text-indigo-950 dark:text-indigo-100",
            },
        },
        {
            key: "delivered",
            label: "Delivered",
            value: statsLoading ? "…" : stats.deliveredCount,
            icon: CheckCircle2,
            theme: {
                card: "bg-gradient-to-br from-emerald-50 to-teal-100/70 border-emerald-200/80 hover:border-emerald-300 dark:from-emerald-950/30 dark:to-emerald-900/40 dark:border-emerald-800",
                selected: "ring-2 ring-emerald-500 border-emerald-400 shadow-md shadow-emerald-100 dark:shadow-none",
                iconWrap: "bg-emerald-500 text-white shadow-xs shadow-emerald-200",
                label: "text-emerald-700/80 dark:text-emerald-300",
                value: "text-emerald-950 dark:text-emerald-100",
            },
        },
        {
            key: "onHold",
            label: "On Hold",
            value: statsLoading ? "…" : stats.onHoldCount,
            icon: AlertCircle,
            theme: {
                card: "bg-gradient-to-br from-rose-50 to-red-100/70 border-rose-200/80 hover:border-rose-300 dark:from-rose-950/30 dark:to-rose-900/40 dark:border-rose-800",
                selected: "ring-2 ring-rose-500 border-rose-400 shadow-md shadow-rose-100 dark:shadow-none",
                iconWrap: "bg-rose-500 text-white shadow-xs shadow-rose-200",
                label: "text-rose-700/80 dark:text-rose-300",
                value: "text-rose-950 dark:text-rose-100",
            },
        },
    ];

    const renderDispatchCards = (items) => (
        <div className="space-y-2">
            {items.map((d) => (
                <DispatchRecordCard
                    key={d.id}
                    dispatch={d}
                    onStatusUpdated={handleStatusUpdated}
                    onSignatureRequest={(id) => setSignatureDispatchId(id)}
                    onView={openView}
                />
            ))}
        </div>
    );

    return (
        <div className="flex flex-col gap-2.5 pb-4 min-h-0 flex-1 overflow-hidden">
            {/* ── Top Filterable KPI Summary Cards (Sale Order Style) ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 flex-shrink-0">
                {summaryCards.map((c) => {
                    const Icon = c.icon;
                    const isSelected = activeCard === c.key || (c.key === "total" && activeCard === "total");
                    return (
                        <div
                            key={c.key}
                            role="button"
                            tabIndex={0}
                            onClick={() => handleCardClick(c.key)}
                            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleCardClick(c.key)}
                            className={cn(
                                "flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer transition-all duration-150 select-none shadow-xs",
                                c.theme.card,
                                isSelected ? c.theme.selected : "opacity-90 hover:opacity-100 hover:shadow-xs"
                            )}
                        >
                            <div className={cn("p-1.5 rounded-md flex-shrink-0", c.theme.iconWrap)}>
                                <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className={cn("text-[11px] font-medium truncate leading-tight", c.theme.label)}>
                                    {c.label}
                                </p>
                                <p className={cn("text-base font-bold leading-tight mt-0.5", c.theme.value)}>
                                    {c.value}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Search + Filter Toolbar ── */}
            <Card className="p-1 sm:p-1 flex-shrink-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <div className="relative flex-1 min-w-[140px]">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            className="pl-9 h-8 text-sm"
                            placeholder="Search DC, customer, customer ref, sale order no…"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>
                    <DispatchGroupBySelect value={groupBy} onChange={handleGroupByChange} />
                    <Refresh onClick={() => { fetchList(); fetchStats(); }} />
                    {hasActiveFilters && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 text-xs shrink-0"
                            onClick={handleClearFilters}
                        >
                            <X className="h-3.5 w-3.5 mr-1" />
                            Clear
                        </Button>
                    )}
                    {!isGrouped && (
                        <ViewToggle view={view} onViewChange={handleViewChange} />
                    )}

                    <Sheet open={showFilterSheet} onOpenChange={setShowFilterSheet}>
                        <SheetTrigger asChild>
                            <Button
                                variant="outline"
                                size="xs"
                                className="gap-1.5 h-8 relative shrink-0"
                                onClick={() => {
                                    setTempStatus(statusFilter);
                                    setTempDeliveryAgent(deliveryAgentFilter);
                                    setTempDateFrom(dateFrom);
                                    setTempDateTo(dateTo);
                                }}
                            >
                                <Filter className="h-3.5 w-3.5" />
                                <span className="text-sm hidden sm:inline">Filters</span>
                                {hasActiveFilters && (
                                    <Badge variant="default" className="ml-1 h-4 px-1 text-xs">•</Badge>
                                )}
                            </Button>
                        </SheetTrigger>
                        <SheetContent>
                            <SheetHeader>
                                <SheetTitle>Filter Dispatches</SheetTitle>
                                <SheetDescription>
                                    Apply filters to refine your dispatch list
                                </SheetDescription>
                            </SheetHeader>

                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Status</Label>
                                    <FormSelect
                                        options={STATUS_OPTIONS}
                                        value={tempStatus}
                                        onChange={(v) => setTempStatus(v || "")}
                                        placeholder="All statuses"
                                        isClearable
                                        isSearchable={false}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Delivery Agent</Label>
                                    <FormSelect
                                        options={deliveryAgents}
                                        value={tempDeliveryAgent}
                                        onChange={(v) => setTempDeliveryAgent(v || "")}
                                        placeholder="All Delivery Agents"
                                        isClearable
                                        isSearchable={false}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Dispatch Date From</Label>
                                    <Input
                                        type="date"
                                        className="h-8 text-sm"
                                        value={tempDateFrom}
                                        onChange={(e) => setTempDateFrom(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Dispatch Date To</Label>
                                    <Input
                                        type="date"
                                        className="h-8 text-sm"
                                        value={tempDateTo}
                                        onChange={(e) => setTempDateTo(e.target.value)}
                                    />
                                </div>
                            </div>

                            <SheetFooter className="flex flex-row gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    onClick={handleClearFilters}
                                >
                                    Clear All
                                </Button>
                                <Button
                                    size="sm"
                                    className="flex-1"
                                    onClick={handleApplyFilters}
                                >
                                    Apply Filters
                                </Button>
                            </SheetFooter>
                        </SheetContent>
                    </Sheet>
                </div>
            </Card>

            {/* ── Dispatches Data Listing ── */}
            <div className="flex-1 min-h-0 overflow-y-auto">
                {isGrouped ? (
                    <DispatchGroupedList
                        groups={groups}
                        groupBy={groupBy}
                        isLoading={isLoading}
                        onStatusUpdated={handleStatusUpdated}
                        onSignatureRequest={(id) => setSignatureDispatchId(id)}
                        onView={openView}
                    />
                ) : view === "card" ? (
                    <CardGrid
                        items={dispatches}
                        renderCard={(d) => (
                            <DispatchRecordCard
                                key={d.id}
                                dispatch={d}
                                onStatusUpdated={handleStatusUpdated}
                                onSignatureRequest={(id) => setSignatureDispatchId(id)}
                                onView={openView}
                            />
                        )}
                        isLoading={isLoading}
                        emptyMessage="No dispatch records found matching your filters."
                        totalCount={total}
                        pageIndex={pageIndex}
                        pageSize={pageSize}
                        onPageChange={(newIdx) => setPage(newIdx + 1)}
                        onPageSizeChange={(newSize) => {
                            setPageSize(newSize);
                            setPage(1);
                        }}
                    />
                ) : (
                    <Table
                        columns={columns}
                        data={dispatches}
                        isLoading={isLoading}
                        totalCount={total}
                        pageIndex={pageIndex}
                        pageSize={pageSize}
                        onPageChange={(newIdx) => setPage(newIdx + 1)}
                        onPageSizeChange={(newSize) => {
                            setPageSize(newSize);
                            setPage(1);
                        }}
                        emptyMessage="No dispatch records found."
                    />
                )}
            </div>

            {/* ── Signature Modal ── */}
            {signatureDispatchId && (
                <SignatureModal
                    isOpen={!!signatureDispatchId}
                    onClose={() => setSignatureDispatchId(null)}
                    onConfirm={handleSignatureConfirm}
                    isSubmitting={isDelivering}
                />
            )}

            {/* ── View Detail Modal ── */}
            {viewDispatch && (
                <ViewDispatchModal
                    open={!!viewDispatch}
                    isOpen={!!viewDispatch}
                    onClose={() => setViewDispatch(null)}
                    dispatch={viewDispatch}
                    onUpdated={handleStatusUpdated}
                />
            )}
        </div>
    );
}
