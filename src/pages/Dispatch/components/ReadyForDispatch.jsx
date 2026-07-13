import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormSelect } from "@/components/ui/form-select";
import { Refresh } from "@/components/ui/Refresh";
import { Search, Package2, Truck, X } from "lucide-react";
import { getReadyForDispatch } from "@/services/dispatch";
import { useToast } from "@/hooks/use-toast";
import DispatchGroupSection from "./DispatchGroupSection";
import DispatchOrderCard from "./DispatchOrderCard";
import CreateDispatchModal from "./CreateDispatchModal";

const GROUP_BY_OPTIONS = [
    { value: "customer",       label: "Customer" },
    { value: "date",           label: "Delivery Date" },
    { value: "deliveryPerson", label: "Delivery Person" },
    { value: "product",        label: "Product" },
    { value: "area",           label: "Area / City" },
];

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
                key = order.lensProduct?.lens_name || "Unknown Product";
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

export default function ReadyForDispatch({ refreshKey, onDispatchCreated, isDeliveryPerson, user }) {
    const { toast } = useToast();
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [groupBy, setGroupBy] = useState("customer");
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [createModalOpen, setCreateModalOpen] = useState(false);

    const fetchOrders = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await getReadyForDispatch({ search: search || undefined });
            setOrders(res?.data || []);
        } catch (err) {
            toast({ title: "Error", description: err.message || "Failed to load orders", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [toast, search]);

    useEffect(() => {
        const timeout = setTimeout(fetchOrders, search ? 400 : 0);
        return () => clearTimeout(timeout);
    }, [fetchOrders, refreshKey, search]);

    const grouped = useMemo(() => groupOrders(orders, groupBy), [orders, groupBy]);

    const toggleOrder = (id) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleGroup = (groupOrders) => {
        const ids = groupOrders.map((o) => o.id);
        const allSelected = ids.every((id) => selectedIds.has(id));
        setSelectedIds((prev) => {
            const next = new Set(prev);
            ids.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
            return next;
        });
    };

    const clearSelection = () => setSelectedIds(new Set());

    const selectedOrders = orders.filter((o) => selectedIds.has(o.id));

    // Determine if selected orders are all for the same customer
    const selectedCustomers = [...new Set(selectedOrders.map((o) => o.customer?.id))];
    const singleCustomer = selectedCustomers.length === 1
        ? selectedOrders[0]?.customer
        : null;

    const handleDispatchCreated = () => {
        setCreateModalOpen(false);
        clearSelection();
        onDispatchCreated?.();
    };

    return (
        <div className="flex flex-col gap-3 pb-6">
            {/* Controls row — Card-wrapped like PO */}
            <Card className="p-1 sm:p-1 flex-shrink-0">
                <div className="flex items-center gap-1.5">
                    <div className="relative flex-1 min-w-0">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            className="pl-9 h-8 text-sm"
                            placeholder="Search orders or customer..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="w-[7.5rem] sm:w-40 shrink-0">
                        <FormSelect
                            options={GROUP_BY_OPTIONS}
                            value={groupBy}
                            onChange={(value) => setGroupBy(value)}
                            placeholder="Group"
                            isSearchable={false}
                            isClearable={false}
                        />
                    </div>
                    <Refresh onClick={fetchOrders} />
                </div>
            </Card>

            {/* Selection bar */}
            {selectedIds.size > 0 && (
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="flex items-center gap-2 text-sm">
                        <Badge variant="default" className="h-5 px-2 text-[11px]">{selectedIds.size}</Badge>
                        <span className="text-xs text-muted-foreground">
                            order{selectedIds.size !== 1 ? "s" : ""} selected
                            {selectedCustomers.length > 1 && (
                                <span className="text-amber-600 ml-1">· multiple customers</span>
                            )}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            className="text-xs text-muted-foreground hover:text-foreground underline"
                            onClick={clearSelection}
                        >
                            Clear
                        </button>
                        <Button
                            size="sm"
                            className="h-7 gap-1.5 text-xs"
                            onClick={() => setCreateModalOpen(true)}
                            disabled={selectedCustomers.length > 1}
                        >
                            <Truck className="h-3.5 w-3.5" />
                            Create Dispatch
                        </Button>
                    </div>
                </div>
            )}

            {/* Content */}
            {isLoading && orders.length === 0 ? (
                <div className="flex flex-col gap-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
                    ))}
                </div>
            ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                    <Package2 className="h-12 w-12 opacity-30" />
                    <p className="text-sm font-medium">No orders ready for dispatch</p>
                    <p className="text-xs text-center px-4">
                        Orders with status "Ready for Dispatch" will appear here.
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {grouped.map(([label, groupOrds]) => {
                        const groupIds = groupOrds.map((o) => o.id);
                        const allSelected = groupIds.every((id) => selectedIds.has(id));
                        const someSelected = groupIds.some((id) => selectedIds.has(id));

                        return (
                            <SelectableGroupSection
                                key={label}
                                label={label}
                                orders={groupOrds}
                                selectedIds={selectedIds}
                                onToggleOrder={toggleOrder}
                                onToggleGroup={() => toggleGroup(groupOrds)}
                                allSelected={allSelected}
                                someSelected={someSelected}
                            />
                        );
                    })}
                </div>
            )}

            {/* Create Dispatch Modal */}
            <CreateDispatchModal
                open={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                selectedOrders={selectedOrders}
                customer={singleCustomer}
                onSuccess={handleDispatchCreated}
            />
        </div>
    );
}

// ─── Selectable group section ─────────────────────────────────────────────────

function SelectableGroupSection({ label, orders, selectedIds, onToggleOrder, onToggleGroup, allSelected, someSelected }) {
    const [open, setOpen] = useState(true);

    return (
        <div className="rounded-lg border border-border overflow-hidden">
            {/* Header */}
            <button
                type="button"
                className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/40 hover:bg-muted/70 transition-colors"
                onClick={() => setOpen((v) => !v)}
            >
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{label}</span>
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5 py-0">
                        {orders.length}
                    </Badge>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                        <Checkbox
                            checked={allSelected ? true : someSelected ? "indeterminate" : false}
                            onCheckedChange={() => onToggleGroup(orders)}
                            className="h-3.5 w-3.5"
                        />
                        <span className="text-xs text-muted-foreground">Select all</span>
                    </label>
                    <span className="text-muted-foreground text-xs">{open ? "▲" : "▼"}</span>
                </div>
            </button>

            {/* Body */}
            {open && (
                <div className="bg-background p-2 flex flex-col gap-2">
                    {orders.map((order) => (
                        <DispatchOrderCard
                            key={order.id}
                            order={order}
                            selectable
                            selected={selectedIds.has(order.id)}
                            onToggle={onToggleOrder}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
