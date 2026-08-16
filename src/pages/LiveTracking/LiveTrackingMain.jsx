import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Clock,
  FlaskConical,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Refresh } from "@/components/ui/Refresh";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useLiveWebSocket } from "@/hooks/useLiveWebSocket";
import { getLiveTrackingOrders } from "@/services/saleOrder";
import { STATUS_LABELS } from "@/constants/saleOrderStatus";
import { SALE_ORDER_SEARCH_PLACEHOLDER } from "@/constants/saleOrderSearch";
import { statusColors } from "@/pages/SaleOrder/SaleOrder.constants";
import FittingOrderDetail from "@/pages/FittingOperator/FittingOrderDetail";
import QualityOrderDetail from "@/pages/QualityOperator/QualityOrderDetail";

const FITTING_STATUSES = ["FITTING_READY", "IN_FITTING", "ON_HOLD"];

const COLUMNS = [
  {
    id: "preQc",
    title: "Pre-QC",
    statuses: ["PRE_QC"],
    colorStatus: "PRE_QC",
  },
  {
    id: "fitting",
    title: "Fitting",
    statuses: FITTING_STATUSES,
    colorStatus: "FITTING_READY",
  },
  {
    id: "postQc",
    title: "Post-QC",
    statuses: ["AWAITING_QUALITY"],
    colorStatus: "AWAITING_QUALITY",
  },
  {
    id: "readyForDispatch",
    title: "Ready for Dispatch",
    statuses: ["READY_FOR_DISPATCH"],
    colorStatus: "READY_FOR_DISPATCH",
  },
];

function formatDuration(ms) {
  if (ms == null || Number.isNaN(ms)) return "—";
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 60) return `${totalMin}m`;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours < 48) return mins ? `${hours}h ${mins}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remH = hours % 24;
  return remH ? `${days}d ${remH}h` : `${days}d`;
}

function eyesLabel(order) {
  const parts = [];
  if (order.rightEye) parts.push("RE");
  if (order.leftEye) parts.push("LE");
  return parts.length ? parts.join(" + ") : "—";
}

function lensSummary(order) {
  const type =
    order.lensType?.name || order.type || order.lensProduct?.lens_name || "—";
  const coating = order.coating?.short_name || order.coating?.name;
  return coating ? `${type} · ${coating}` : type;
}

function columnForStatus(status) {
  return COLUMNS.find((c) => c.statuses.includes(status)) || null;
}

function stageForStatus(status) {
  if (status === "PRE_QC") return "pre";
  if (FITTING_STATUSES.includes(status)) return "fitting";
  if (status === "AWAITING_QUALITY") return "post";
  if (status === "READY_FOR_DISPATCH") return "dispatch";
  return null;
}

function LiveTrackingCard({ order, onClick }) {
  const statusClass =
    statusColors[order.status] || "bg-gray-100 text-gray-800 border-gray-200";

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-lg border border-border bg-card p-3 space-y-1.5 shadow-sm hover:border-primary/40 hover:shadow transition-shadow focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-sm truncate">{order.orderNo}</span>
        <div className="flex items-center gap-1 shrink-0">
          {order.urgentOrder && (
            <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] px-1.5 py-0">
              Urgent
            </Badge>
          )}
          <Badge className={`${statusClass} text-[10px] border px-1.5 py-0`}>
            {STATUS_LABELS[order.status] || order.status}
          </Badge>
        </div>
      </div>
      <div className="text-xs text-muted-foreground truncate">
        {order.customer?.shopname || order.customer?.name || "—"}
      </div>
      {(order.customerRefNo || order.mrdRefNo) && (
        <div className="text-[11px] text-muted-foreground/80 truncate">
          {[order.customerRefNo && `Ref ${order.customerRefNo}`, order.mrdRefNo && `MRD ${order.mrdRefNo}`]
            .filter(Boolean)
            .join(" · ")}
        </div>
      )}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <FlaskConical className="w-3 h-3 shrink-0" />
        <span className="truncate">{lensSummary(order)}</span>
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{eyesLabel(order)}</span>
        <span className="inline-flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDuration(order.timeInStageMs)}
        </span>
      </div>
    </button>
  );
}

export default function LiveTrackingMain() {
  const { toast } = useToast();
  const [orders, setOrders] = useState([]);
  const [counts, setCounts] = useState({
    preQc: 0,
    fitting: 0,
    postQc: 0,
    readyForDispatch: 0,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState(null);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getLiveTrackingOrders({ search });
      if (response?.success) {
        setOrders(response.data || []);
        setCounts(
          response.counts || {
            preQc: 0,
            fitting: 0,
            postQc: 0,
            readyForDispatch: 0,
            total: (response.data || []).length,
          }
        );
      }
    } catch (err) {
      setError(err.message || "Failed to load live tracking.");
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders, refreshKey]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchQuery.trim()), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
    toast({ title: "Refreshed", description: "Live tracking has been refreshed." });
  };

  const closePreview = useCallback(() => {
    setSelected(null);
  }, []);

  const handlePreviewDone = useCallback(() => {
    setSelected(null);
    fetchOrders();
  }, [fetchOrders]);

  useLiveWebSocket("SALE_ORDER_UPDATED", fetchOrders);

  const columnOrders = useMemo(() => {
    const map = { preQc: [], fitting: [], postQc: [], readyForDispatch: [] };
    for (const order of orders) {
      const col = columnForStatus(order.status);
      if (col) map[col.id].push(order);
    }
    return map;
  }, [orders]);

  const previewStage = selected ? stageForStatus(selected.status) : null;

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden p-1 sm:p-1 md:p-3 gap-2 sm:gap-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Live Tracking</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pre-QC, Fitting, Post-QC, and Ready for Dispatch board
          </p>
        </div>
      </div>

      <Card className="p-1 sm:p-1 flex-shrink-0">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={SALE_ORDER_SEARCH_PLACEHOLDER}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Refresh onClick={handleRefresh} />
          </div>
        </div>
      </Card>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2 flex-shrink-0">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3 flex-1 min-h-0 overflow-hidden">
        {COLUMNS.map((col) => {
          const list = columnOrders[col.id] || [];
          const count = counts[col.id] ?? list.length;
          const headerClass =
            statusColors[col.colorStatus] ||
            "bg-gray-100 text-gray-800 border-gray-200";
          return (
            <div
              key={col.id}
              className="flex flex-col min-h-0 rounded-xl border border-border bg-muted/30 overflow-hidden"
            >
              <div
                className={`flex items-center justify-between px-3 py-2.5 border-b shrink-0 ${headerClass}`}
              >
                <h2 className="text-sm font-semibold">{col.title}</h2>
                <span
                  className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold tabular-nums bg-white/60 ${headerClass}`}
                >
                  {count}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {isLoading && list.length === 0 ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-lg border bg-card p-3 space-y-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-40" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  ))
                ) : list.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    No orders
                  </p>
                ) : (
                  list.map((order) => (
                    <LiveTrackingCard
                      key={order.id}
                      order={order}
                      onClick={() => setSelected(order)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Sheet
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) closePreview();
        }}
      >
        <SheetContent
          side="right"
          className="w-full sm:!max-w-2xl md:!max-w-3xl lg:!max-w-4xl p-0 gap-0 overflow-y-auto bg-gray-50 [&>button]:hidden"
        >
          <SheetTitle className="sr-only">
            {selected?.orderNo || "Order detail"}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Sale order stage detail preview
          </SheetDescription>
          {selected && previewStage === "fitting" && (
            <FittingOrderDetail
              orderId={selected.id}
              onBack={closePreview}
              onCompleted={handlePreviewDone}
              listPath="/live-tracking"
            />
          )}
          {selected && previewStage === "pre" && (
            <QualityOrderDetail
              mode="pre"
              orderId={selected.id}
              onBack={closePreview}
              onCompleted={handlePreviewDone}
              listPath="/live-tracking"
            />
          )}
          {selected && previewStage === "post" && (
            <QualityOrderDetail
              mode="post"
              orderId={selected.id}
              onBack={closePreview}
              onCompleted={handlePreviewDone}
              listPath="/live-tracking"
            />
          )}
          {selected && previewStage === "dispatch" && (
            <QualityOrderDetail
              mode="post"
              orderId={selected.id}
              onBack={closePreview}
              onCompleted={handlePreviewDone}
              listPath="/live-tracking"
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
