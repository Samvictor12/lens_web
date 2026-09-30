import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormSelect } from "@/components/ui/form-select";
import { Refresh } from "@/components/ui/Refresh";
import { Search, Package2, Truck, X, MapPin, Printer } from "lucide-react";
import { getReadyForDispatch } from "@/services/dispatch";
import { useToast } from "@/hooks/use-toast";
import DispatchGroupSection from "./DispatchGroupSection";
import DispatchOrderCard from "./DispatchOrderCard";
import CreateDispatchModal from "./CreateDispatchModal";
import {
    buildDispatchPrintPlan,
    executeDispatchPrintPlan,
    BARCODE_CHROME_PRINT_HINT,
} from "@/utils/dispatchLabelPrint";
import DispatchLabelsPreviewModal from "@/components/LensPrint/DispatchLabelsPreviewModal";

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
                key = order.customer?.id != null
                    ? `cust:${order.customer.id}`
                    : (order.customer?.name || order.customer?.shopname || "Unknown Customer");
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

export default function ReadyForDispatch({ refreshKey, onDispatchCreated }) {
    const { toast } = useToast();
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [groupBy, setGroupBy] = useState("customer");
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [printCard, setPrintCard] = useState(false);
    const [printBarcode, setPrintBarcode] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [previewPlan, setPreviewPlan] = useState(null);
    const [isPreviewSubmitting, setIsPreviewSubmitting] = useState(false);

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

    const canPrintNow =
        selectedIds.size > 0 && (printCard || printBarcode) && !isPrinting;

    const runPrintPlan = async (plan) => {
        if (plan?.printBarcode && plan?.barcodeMode === "chrome") {
            toast({ title: "Barcode print (Chrome)", description: BARCODE_CHROME_PRINT_HINT });
        }
        const result = await executeDispatchPrintPlan(plan);
        toast({
            title: "Print queued",
            description: `${result.printed} job(s) sent${result.errors?.length ? ` · ${result.errors.length} skipped` : ""}`,
        });
        if (result.errors?.length) {
            toast({
                title: "Some prints failed",
                description: result.errors[0],
                variant: "destructive",
            });
        }
        return result;
    };

    const handlePrintSelected = async () => {
        if (!canPrintNow) return;
        setIsPrinting(true);
        try {
            const plan = await buildDispatchPrintPlan(selectedOrders, {
                printCard,
                printBarcode,
            });
            if (plan.needsExePreview) {
                setPreviewPlan(plan);
                return;
            }
            await runPrintPlan(plan);
        } catch (err) {
            toast({
                title: "Print failed",
                description: err.message || "Could not print labels",
                variant: "destructive",
            });
        } finally {
            setIsPrinting(false);
        }
    };

    const handlePreviewConfirm = async () => {
        if (!previewPlan) return;
        setIsPreviewSubmitting(true);
        try {
            await runPrintPlan(previewPlan);
            setPreviewPlan(null);
        } catch (err) {
            toast({
                title: "Print failed",
                description: err.message || "Could not print labels",
                variant: "destructive",
            });
        } finally {
            setIsPreviewSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col gap-3 pb-6">
            {/* Controls row — Card-wrapped like PO */}
            <Card className="p-1 sm:p-1 flex-shrink-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <div className="flex items-center gap-3 px-1 shrink-0">
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                            <Checkbox
                                checked={printCard}
                                onCheckedChange={(v) => setPrintCard(!!v)}
                            />
                            DC Card
                        </label>
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                            <Checkbox
                                checked={printBarcode}
                                onCheckedChange={(v) => setPrintBarcode(!!v)}
                            />
                            Barcode
                        </label>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5 text-xs"
                            disabled={!canPrintNow}
                            onClick={handlePrintSelected}
                            title={
                                !selectedIds.size
                                    ? "Select orders first"
                                    : !(printCard || printBarcode)
                                      ? "Check Card and/or Barcode"
                                      : "Print for selected orders"
                            }
                        >
                            <Printer className="h-3.5 w-3.5" />
                            {isPrinting ? "Printing…" : "Print"}
                        </Button>
                    </div>
                    <div className="relative flex-1 min-w-0">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            className="pl-9 h-8 text-sm"
                            placeholder="Search order, customer, customer ref, patient ref..."
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
                        const customer = groupOrds[0]?.customer;

                        return (
                            <SelectableGroupSection
                                key={label}
                                label={label}
                                customer={groupBy === "customer" ? customer : null}
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
                initialPrintCard={printCard}
                initialPrintBarcode={printBarcode}
            />

            <DispatchLabelsPreviewModal
                open={!!previewPlan}
                plan={previewPlan}
                isSubmitting={isPreviewSubmitting}
                onCancel={() => setPreviewPlan(null)}
                onConfirm={handlePreviewConfirm}
            />
        </div>
    );
}

// ─── Selectable group section ─────────────────────────────────────────────────

function SelectableGroupSection({ label, customer, orders, selectedIds, onToggleOrder, onToggleGroup, allSelected, someSelected }) {
    const [open, setOpen] = useState(true);
    const customerName = customer?.name?.trim() || null;
    const shopName = customer?.shopname?.trim() || null;
    const address = customer
        ? [customer.address, customer.city, customer.state].filter(Boolean).join(", ")
        : null;
    const phone = customer?.phone;
    const heading = customer
        ? (customerName || shopName || "Unknown Customer")
        : label;

    return (
        <div className="rounded-lg border border-border overflow-hidden">
            {/* Header — customer identity clearly on accordion */}
            <button
                type="button"
                className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/40 hover:bg-muted/70 transition-colors"
                onClick={() => setOpen((v) => !v)}
            >
                <div className="flex items-start gap-2 min-w-0 text-left">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-foreground">{heading}</span>
                            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 py-0">
                                {orders.length}
                            </Badge>
                            {customer?.city && (
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {customer.city}
                                </span>
                            )}
                        </div>
                        {customerName && shopName && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                <span className="text-muted-foreground/80">Shop: </span>
                                <span className="font-medium text-foreground">{shopName}</span>
                            </p>
                        )}
                        {address && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{address}</p>
                        )}
                        {phone && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">{phone}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                        <Checkbox
                            checked={allSelected ? true : someSelected ? "indeterminate" : false}
                            onCheckedChange={() => onToggleGroup(orders)}
                            className="h-3.5 w-3.5"
                        />
                        <span className="text-xs text-muted-foreground hidden sm:inline">Select all</span>
                    </label>
                    <span className="text-muted-foreground text-xs">{open ? "▲" : "▼"}</span>
                </div>
            </button>

            {/* Body — SO details on each card */}
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
