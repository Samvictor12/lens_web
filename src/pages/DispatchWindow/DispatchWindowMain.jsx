import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Eye,
  MapPin,
  Package,
  Search,
  Truck,
  User,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Refresh } from "@/components/ui/Refresh";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getDispatchList, updateDispatchStatus } from "@/services/dispatch";
import SignatureModal from "@/pages/Dispatch/components/SignatureModal";
import DispatchOrderDetailsModal from "@/pages/Dispatch/components/DispatchOrderDetailsModal";
import { cn } from "@/lib/utils";

const STATUS_LABEL = {
  PENDING: "Ready for Pickup",
  IN_TRANSIT: "In Transit",
  DELIVERED: "Delivered",
  ON_HOLD: "On Hold",
};

/**
 * Group dispatch records by customerId for accordion listing.
 */
function groupByCustomer(dispatches) {
  const map = new Map();
  for (const d of dispatches) {
    const key = d.customerId ?? d.customer?.id ?? `unknown-${d.id}`;
    if (!map.has(key)) {
      map.set(key, {
        customerId: key,
        customer: d.customer || null,
        dispatches: [],
      });
    }
    map.get(key).dispatches.push(d);
  }
  return Array.from(map.values()).sort((a, b) => {
    const nameA = (a.customer?.shopname || a.customer?.name || "").toLowerCase();
    const nameB = (b.customer?.shopname || b.customer?.name || "").toLowerCase();
    return nameA.localeCompare(nameB);
  });
}

function orderSummary(dispatch) {
  const orders = dispatch.saleOrders || [];
  const orderNos = orders.map((o) => o.orderNo).filter(Boolean);
  const refs = [...new Set(orders.map((o) => o.customerRefNo).filter(Boolean))];
  return {
    orderNos: orderNos.join(", ") || "—",
    refs: refs.join(", ") || "—",
    count: orders.length,
  };
}

/** Compact selectable DC row — no customer/agent (already on accordion). */
function DispatchListRow({ dispatch, selected, onToggle, onView }) {
  const { orderNos, refs } = orderSummary(dispatch);
  const statusLabel = STATUS_LABEL[dispatch.status] || dispatch.status;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onToggle(dispatch.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle(dispatch.id);
        }
      }}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 border-b last:border-b-0 cursor-pointer transition-colors",
        selected ? "bg-primary/10" : "hover:bg-muted/50"
      )}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={() => onToggle(dispatch.id)}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Select ${dispatch.dcNumber}`}
      />

      <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">DC</div>
          <div className="text-sm font-semibold truncate">{dispatch.dcNumber}</div>
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Sale Order</div>
          <div className="text-sm font-medium truncate">{orderNos}</div>
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">SO Ref</div>
          <div className="text-sm truncate">{refs}</div>
        </div>
      </div>

      <Badge variant="outline" className="text-[10px] shrink-0 hidden xs:inline-flex sm:inline-flex">
        {statusLabel}
      </Badge>

      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0 shrink-0"
        title="View lens / order details"
        onClick={(e) => {
          e.stopPropagation();
          onView?.(dispatch);
        }}
      >
        <Eye className="h-4 w-4" />
      </Button>
    </div>
  );
}

function CustomerGroup({
  group,
  phase,
  selectedIds,
  onToggle,
  onSelectAllInGroup,
  onView,
}) {
  const [expanded, setExpanded] = useState(true);
  const customerName = group.customer?.shopname || group.customer?.name || "Unknown Customer";
  const city = group.customer?.city;
  const address = [group.customer?.address, group.customer?.city, group.customer?.state]
    .filter(Boolean)
    .join(", ");
  const phone = group.customer?.phone;

  const groupIds = group.dispatches.map((d) => d.id);
  const selectedInGroup = groupIds.filter((id) => selectedIds.has(id));
  const allSelected = groupIds.length > 0 && selectedInGroup.length === groupIds.length;
  const someSelected = selectedInGroup.length > 0 && !allSelected;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="flex items-stretch border-b bg-muted/30">
        <button
          type="button"
          className="flex-1 flex items-center justify-between gap-3 px-3 py-3 text-left hover:bg-muted/50 transition-colors"
          onClick={() => setExpanded((v) => !v)}
        >
          <div className="flex items-start gap-2 min-w-0">
            {expanded ? (
              <ChevronDown className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="font-semibold text-sm truncate">{customerName}</span>
                {city && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {city}
                  </span>
                )}
              </div>
              {address && (
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate pl-5">{address}</p>
              )}
              {phone && (
                <p className="text-[11px] text-muted-foreground mt-0.5 pl-5">{phone}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant="secondary" className="text-[10px] h-5">
              {group.dispatches.length} DC{group.dispatches.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </button>
        <div className="flex items-center px-3 border-l">
          <Checkbox
            checked={allSelected ? true : someSelected ? "indeterminate" : false}
            onCheckedChange={() => onSelectAllInGroup(groupIds, !allSelected)}
            aria-label={`Select all for ${customerName}`}
            title="Select all for this customer"
          />
        </div>
      </div>

      {expanded && (
        <div>
          {group.dispatches.map((d) => (
            <DispatchListRow
              key={d.id}
              dispatch={d}
              selected={selectedIds.has(d.id)}
              onToggle={onToggle}
              onView={onView}
            />
          ))}
          {group.dispatches.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              No {phase === "pickup" ? "pickup" : "delivery"} records
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function PhasePanel({
  status,
  phase,
  search,
  refreshKey,
  selectedIds,
  setSelectedIds,
  onView,
  onRequestDeliver,
  onBulkPickup,
  isActing,
}) {
  const { toast } = useToast();
  const [dispatches, setDispatches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchList = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await getDispatchList({
        status,
        limit: 200,
        page: 1,
        ...(search ? { search } : {}),
      });
      const list = res?.dispatches || [];
      setDispatches(list);
      // Drop selections that are no longer in the list
      setSelectedIds((prev) => {
        const next = new Set();
        const ids = new Set(list.map((d) => d.id));
        prev.forEach((id) => {
          if (ids.has(id)) next.add(id);
        });
        return next;
      });
    } catch (err) {
      toast({ title: "Error", description: err?.message || String(err), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [status, search, toast, setSelectedIds]);

  useEffect(() => {
    const timeout = setTimeout(fetchList, search ? 400 : 0);
    return () => clearTimeout(timeout);
  }, [fetchList, refreshKey]);

  const groups = useMemo(() => groupByCustomer(dispatches), [dispatches]);

  const toggle = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllInGroup = (ids, select) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => {
        if (select) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  };

  const selectedDispatches = dispatches.filter((d) => selectedIds.has(d.id));
  const selectedCount = selectedDispatches.length;
  const selectedOrderCount = selectedDispatches.reduce(
    (sum, d) => sum + (d.saleOrders?.length ?? 0),
    0
  );

  if (isLoading && dispatches.length === 0) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        {phase === "pickup" ? (
          <Package className="h-12 w-12 opacity-30" />
        ) : (
          <Truck className="h-12 w-12 opacity-30" />
        )}
        <p className="text-sm font-medium">
          {phase === "pickup" ? "No pickups ready" : "No deliveries in transit"}
        </p>
        <p className="text-xs text-center px-4">
          {phase === "pickup"
            ? "Select DCs under a customer, then tap Pickup selected."
            : "Select one or more DCs under a customer, then confirm delivery with one signature."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 pb-3">
        <p className="text-xs text-muted-foreground">
          {groups.length} customer{groups.length !== 1 ? "s" : ""} · {dispatches.length} DC
          {dispatches.length !== 1 ? "s" : ""}
          {selectedCount > 0 ? ` · ${selectedCount} selected` : ""}
        </p>
        {groups.map((group) => (
          <CustomerGroup
            key={group.customerId}
            group={group}
            phase={phase}
            selectedIds={selectedIds}
            onToggle={toggle}
            onSelectAllInGroup={selectAllInGroup}
            onView={onView}
          />
        ))}
      </div>

      {/* Action bar — content area only (not over sidebar) */}
      {selectedCount > 0 && (
        <div className="flex-shrink-0 border-t bg-background px-3 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm">
            <span className="font-semibold">{selectedCount}</span> DC
            {selectedCount !== 1 ? "s" : ""} selected
            {selectedOrderCount > 0 && (
              <span className="text-muted-foreground">
                {" "}
                · {selectedOrderCount} order{selectedOrderCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              disabled={isActing}
            >
              Clear
            </Button>
            {phase === "pickup" ? (
              <Button
                size="sm"
                className="gap-1.5"
                disabled={isActing}
                onClick={() => onBulkPickup?.(Array.from(selectedIds), fetchList)}
              >
                <Truck className="h-3.5 w-3.5" />
                Pickup selected
              </Button>
            ) : (
              <Button
                size="sm"
                className="gap-1.5 bg-green-600 hover:bg-green-700"
                disabled={isActing}
                onClick={() => onRequestDeliver?.(selectedDispatches, fetchList)}
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Deliver selected
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DispatchWindowMain() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isDeliveryPerson = user?.roleName === "Delivery Person";

  const [activeTab, setActiveTab] = useState("pickup");
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [viewDispatch, setViewDispatch] = useState(null);
  const [isActing, setIsActing] = useState(false);

  // Bulk deliver signature state
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [pendingDeliverIds, setPendingDeliverIds] = useState([]);
  const [signatureMeta, setSignatureMeta] = useState({ customerName: "", orderCount: 0 });
  const [afterDeliverRefresh, setAfterDeliverRefresh] = useState(null);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
    toast({ title: "Refreshed", description: "Dispatch window data updated." });
  };

  // Clear selection when switching tabs
  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeTab]);

  const handleBulkPickup = async (ids, refreshFn) => {
    if (!ids?.length) return;
    try {
      setIsActing(true);
      await Promise.all(ids.map((id) => updateDispatchStatus(id, "PICKUP")));
      toast({
        title: "Picked up",
        description: `${ids.length} dispatch${ids.length !== 1 ? "es" : ""} marked In Transit`,
      });
      setSelectedIds(new Set());
      refreshFn?.();
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast({ title: "Error", description: err?.message || String(err), variant: "destructive" });
    } finally {
      setIsActing(false);
    }
  };

  const handleRequestDeliver = (dispatches, refreshFn) => {
    if (!dispatches?.length) return;
    const customerNames = [
      ...new Set(
        dispatches.map((d) => d.customer?.shopname || d.customer?.name).filter(Boolean)
      ),
    ];
    const orderCount = dispatches.reduce((sum, d) => sum + (d.saleOrders?.length ?? 0), 0);
    setPendingDeliverIds(dispatches.map((d) => d.id));
    setSignatureMeta({
      customerName: customerNames.join(", ") || "Customer",
      orderCount,
    });
    setAfterDeliverRefresh(() => refreshFn);
    setSignatureOpen(true);
  };

  const handleSignatureConfirm = async (signature) => {
    if (!pendingDeliverIds.length) return;
    try {
      setIsActing(true);
      await Promise.all(
        pendingDeliverIds.map((id) => updateDispatchStatus(id, "DELIVERED", signature))
      );
      toast({
        title: "Delivered!",
        description: `${pendingDeliverIds.length} dispatch${pendingDeliverIds.length !== 1 ? "es" : ""} confirmed with one signature`,
      });
      setSignatureOpen(false);
      setPendingDeliverIds([]);
      setSelectedIds(new Set());
      afterDeliverRefresh?.();
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast({ title: "Error", description: err?.message || String(err), variant: "destructive" });
    } finally {
      setIsActing(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-1 sm:p-1 md:p-3 gap-2 sm:gap-2">
      <div className="flex-shrink-0">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Dispatch Window</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isDeliveryPerson
              ? "Select DCs under a customer — pickup or deliver with one action"
              : "Grouped by customer · multi-select · shared delivery signature"}
          </p>
        </div>
      </div>

      <Card className="p-1 sm:p-1 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="pl-9 h-8 text-sm"
              placeholder="Search DC number or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Refresh onClick={handleRefresh} />
        </div>
      </Card>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <TabsList className="grid grid-cols-2 mb-3 flex-shrink-0">
          <TabsTrigger value="pickup">Pickup</TabsTrigger>
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
        </TabsList>

        <TabsContent
          value="pickup"
          className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
        >
          <PhasePanel
            status="PENDING"
            phase="pickup"
            search={search}
            refreshKey={refreshKey}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            onView={setViewDispatch}
            onBulkPickup={handleBulkPickup}
            isActing={isActing}
          />
        </TabsContent>

        <TabsContent
          value="delivery"
          className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
        >
          <PhasePanel
            status="IN_TRANSIT"
            phase="delivery"
            search={search}
            refreshKey={refreshKey}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            onView={setViewDispatch}
            onRequestDeliver={handleRequestDeliver}
            isActing={isActing}
          />
        </TabsContent>
      </Tabs>

      <SignatureModal
        open={signatureOpen}
        onClose={() => {
          if (!isActing) {
            setSignatureOpen(false);
            setPendingDeliverIds([]);
          }
        }}
        onConfirm={handleSignatureConfirm}
        customerName={signatureMeta.customerName}
        orderCount={signatureMeta.orderCount}
        isSaving={isActing}
      />

      <DispatchOrderDetailsModal
        open={!!viewDispatch}
        onClose={() => setViewDispatch(null)}
        dispatch={viewDispatch}
      />
    </div>
  );
}
