import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, Search, List, Filter, X } from "lucide-react";
import { getDispatchList, updateDispatchStatus } from "@/services/dispatch";
import { useToast } from "@/hooks/use-toast";
import DispatchRecordCard from "./DispatchRecordCard";
import SignatureModal from "./SignatureModal";
import ViewDispatchModal from "./ViewDispatchModal";
import { FormSelect } from "@/components/ui/form-select";

const STATUS_OPTIONS = [
    { value: "", label: "All Statuses" },
    { value: "PENDING", label: "Pending" },
    { value: "IN_TRANSIT", label: "In Transit" },
    { value: "DELIVERED", label: "Delivered" },
    { value: "ON_HOLD", label: "On Hold" },
];

export default function DispatchList({ refreshKey, onStatusUpdated, isDeliveryPerson }) {
    const { toast } = useToast();
    const [dispatches, setDispatches] = useState([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // Filters
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    // Pagination
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 20;

    // Signature modal for DELIVERED action
    const [signatureDispatchId, setSignatureDispatchId] = useState(null);
    const [isDelivering, setIsDelivering] = useState(false);

    // View modal
    const [viewDispatch, setViewDispatch] = useState(null);

    const fetchList = useCallback(async () => {
        try {
            setIsLoading(true);
            const params = {
                page,
                limit: PAGE_SIZE,
                ...(search ? { search } : {}),
                ...(statusFilter ? { status: statusFilter } : {}),
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
    }, [toast, page, search, statusFilter, dateFrom, dateTo]);

    useEffect(() => {
        const timeout = setTimeout(fetchList, search ? 400 : 0);
        return () => clearTimeout(timeout);
    }, [fetchList, refreshKey, search]);

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

    const hasFilters = search || statusFilter || dateFrom || dateTo;

    const clearFilters = () => {
        setSearch("");
        setStatusFilter("");
        setDateFrom("");
        setDateTo("");
        setPage(1);
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <div className="flex flex-col gap-3 pb-6">
            {/* Top bar */}
            <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        className="pl-8 h-8 text-sm"
                        placeholder="Search DC number or customer..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    />
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => setShowFilters((v) => !v)}
                >
                    <Filter className="h-3.5 w-3.5" />
                    Filters
                    {hasFilters && <span className="h-1.5 w-1.5 rounded-full bg-primary ml-0.5" />}
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={fetchList}
                    disabled={isLoading}
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                    <span className="hidden sm:inline">Refresh</span>
                </Button>
                {hasFilters && (
                    <Button variant="ghost" size="sm" className="h-8 gap-1 text-muted-foreground" onClick={clearFilters}>
                        <X className="h-3.5 w-3.5" />
                        Clear
                    </Button>
                )}
            </div>

            {/* Expanded filters */}
            {showFilters && (
                <div className="rounded-lg border p-3 bg-muted/20 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="grid gap-1.5">
                        <Label className="text-xs">Status</Label>
                        <FormSelect
                            options={STATUS_OPTIONS}
                            value={statusFilter}
                            onChange={(v) => { setStatusFilter(v || ""); setPage(1); }}
                            placeholder="All statuses"
                            isClearable
                        />
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-xs">Date From</Label>
                        <Input
                            type="date"
                            className="h-8 text-sm"
                            value={dateFrom}
                            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                        />
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-xs">Date To</Label>
                        <Input
                            type="date"
                            className="h-8 text-sm"
                            value={dateTo}
                            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                        />
                    </div>
                </div>
            )}

            {/* Summary */}
            {!isLoading && (
                <p className="text-xs text-muted-foreground">
                    {total} dispatch record{total !== 1 ? "s" : ""} found
                </p>
            )}

            {/* List */}
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
                        Create a dispatch from the "Ready for Dispatch" tab.
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {dispatches.map((d) => (
                        <DispatchRecordCard
                            key={d.id}
                            dispatch={d}
                            isDeliveryPerson={isDeliveryPerson}
                            onStatusUpdated={handleStatusUpdated}
                            onSignatureRequest={(id) => setSignatureDispatchId(id)}
                            onView={(dispatch) => setViewDispatch(dispatch)}
                        />
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={page <= 1 || isLoading}
                        onClick={() => setPage((p) => p - 1)}
                    >
                        Previous
                    </Button>
                    <span className="text-xs text-muted-foreground">
                        Page {page} of {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={page >= totalPages || isLoading}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        Next
                    </Button>
                </div>
            )}

            {/* Signature Modal for Delivered action */}
            <SignatureModal
                open={!!signatureDispatchId}
                onClose={() => { if (!isDelivering) setSignatureDispatchId(null); }}
                onConfirm={handleSignatureConfirm}
                customerName={dispatches.find((d) => d.id === signatureDispatchId)?.customer?.shopname || ""}
                orderCount={dispatches.find((d) => d.id === signatureDispatchId)?.saleOrders?.length ?? 0}
                isSaving={isDelivering}
            />

            {/* View/Edit Modal */}
            <ViewDispatchModal
                open={!!viewDispatch}
                onClose={() => setViewDispatch(null)}
                dispatch={viewDispatch}
                onUpdated={() => {
                    fetchList();
                    onStatusUpdated?.();
                }}
            />
        </div>
    );
}
