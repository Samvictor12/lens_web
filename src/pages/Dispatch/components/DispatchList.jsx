import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Search, List, Filter, X } from "lucide-react";
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
import { getDispatchList, updateDispatchStatus } from "@/services/dispatch";
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
        } catch (err) {
            toast({ title: "Error", description: err?.message || String(err), variant: "destructive" });
        } finally {
            setIsDelivering(false);
        }
    };

    const handleStatusUpdated = () => {
        fetchList();
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

    const hasActiveFilters = !!(statusFilter || deliveryAgentFilter || dateFrom || dateTo);

    const handleApplyFilters = () => {
        setStatusFilter(tempStatus);
        setDeliveryAgentFilter(tempDeliveryAgent);
        setDateFrom(tempDateFrom);
        setDateTo(tempDateTo);
        setPage(1);
        setShowFilterSheet(false);
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
        setPage(1);
        setShowFilterSheet(false);
    };

    const handleGroupByChange = (value) => {
        setGroupBy(value || "none");
        setPage(1);
    };

    const pageIndex = page - 1;

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
        <div className="flex flex-col gap-3 pb-6 min-h-0 flex-1">
            {/* Search + Filter toolbar */}
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
                    <Refresh onClick={fetchList} />
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

                                <SheetFooter className="flex gap-2 pt-4">
                                    <Button variant="outline" className="flex-1" onClick={handleClearFilters}>
                                        <X className="h-3.5 w-3.5 mr-1.5" />
                                        Clear Filters
                                    </Button>
                                    <Button className="flex-1" onClick={handleApplyFilters}>
                                        Apply Filters
                                    </Button>
                                </SheetFooter>
                            </SheetContent>
                        </Sheet>
                </div>
            </Card>

            {isGrouped ? (
                <div className="flex-1 min-h-0 overflow-y-auto">
                    {isLoading && dispatches.length === 0 ? (
                        <div className="flex flex-col gap-3">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <DispatchGroupedList
                            groups={groups}
                            renderItems={renderDispatchCards}
                            emptyMessage="No dispatch records found"
                        />
                    )}
                </div>
            ) : view === "table" ? (
                <div className="flex-1 min-h-0">
                    <Table
                        data={dispatches}
                        columns={columns}
                        pageIndex={pageIndex}
                        pageSize={pageSize}
                        totalCount={total}
                        onPageChange={(idx) => setPage(idx + 1)}
                        loading={isLoading}
                        onPageSizeChange={(size) => {
                            setPageSize(size);
                            setPage(1);
                        }}
                        pagination={true}
                        emptyMessage="No dispatch records found"
                    />
                </div>
            ) : (
                <div className="flex-1 min-h-0">
                    {isLoading && dispatches.length === 0 ? (
                        <div className="flex flex-col gap-3">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />
                            ))}
                        </div>
                    ) : dispatches.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                            <List className="h-12 w-12 opacity-30" />
                            <p className="text-sm font-medium">No dispatch records found</p>
                            <p className="text-xs text-center px-4">
                                Create a dispatch from the &quot;Ready for Dispatch&quot; tab.
                            </p>
                        </div>
                    ) : (
                        <CardGrid
                            items={dispatches}
                            renderCard={(d) => (
                                <DispatchRecordCard
                                    dispatch={d}
                                    onStatusUpdated={handleStatusUpdated}
                                    onSignatureRequest={(id) => setSignatureDispatchId(id)}
                                    onView={openView}
                                />
                            )}
                            isLoading={false}
                            emptyMessage="No dispatch records found"
                            pagination={true}
                            pageIndex={pageIndex}
                            pageSize={pageSize}
                            totalCount={total}
                            onPageChange={(idx) => setPage(idx + 1)}
                            onPageSizeChange={(size) => {
                                setPageSize(size);
                                setPage(1);
                            }}
                        />
                    )}
                </div>
            )}

            <SignatureModal
                open={!!signatureDispatchId}
                onClose={() => { if (!isDelivering) setSignatureDispatchId(null); }}
                onConfirm={handleSignatureConfirm}
                customerName={dispatches.find((d) => d.id === signatureDispatchId)?.customer?.shopname || ""}
                orderCount={dispatches.find((d) => d.id === signatureDispatchId)?.saleOrders?.length ?? 0}
                isSaving={isDelivering}
            />

            <ViewDispatchModal
                open={!!viewDispatch}
                onClose={() => setViewDispatch(null)}
                dispatch={viewDispatch}
                onUpdated={(updated) => {
                    if (updated) setViewDispatch(updated);
                    fetchList();
                    onStatusUpdated?.();
                }}
            />
        </div>
    );
}
