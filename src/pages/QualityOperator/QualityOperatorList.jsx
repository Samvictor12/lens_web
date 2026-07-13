import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ClipboardCheck, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Refresh } from "@/components/ui/Refresh";
import { QrScanButton } from "@/components/ui/QrScanButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getSaleOrders } from "@/services/saleOrder";
import { statusColors } from "@/pages/SaleOrder/SaleOrder.constants";
import { parseSaleOrderScanPayload } from "@/utils/parseSaleOrderScanPayload";

function OrderCard({ order, onClick, statusLabel }) {
  const statusClass = statusColors[order.status] || "bg-gray-100 text-gray-800 border-gray-200";

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-2 active:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
    >
      {/* Row 1: Order No + Status + Urgent */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-gray-900 text-base truncate">{order.orderNo}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          {order.urgentOrder && (
            <Badge className="bg-red-100 text-red-700 border-red-200 text-xs px-1.5 py-0">Urgent</Badge>
          )}
          <Badge className={`${statusClass} text-xs border px-2 py-0`}>{statusLabel}</Badge>
        </div>
      </div>

      {/* Row 2: Customer */}
      <div className="text-sm text-gray-600 truncate">
        {order.customer?.shopname || order.customer?.name || "—"}
      </div>

      {order.customerRefNo && (
        <div className="text-xs text-gray-500 truncate">
          Ref: {order.customerRefNo}
        </div>
      )}

      {/* Row 3: Lens + Coating */}
      <div className="flex items-center gap-1.5 text-sm text-gray-500">
        <ClipboardCheck className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">
          {order.lensType?.name || order.type || order.lensProduct?.lens_name || "—"}
          {order.coating?.short_name ? ` · ${order.coating.short_name}` : ""}
        </span>
      </div>

      {/* Row 4: Date */}
      <div className="text-xs text-gray-400">
        {new Date(order.orderDate).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
      </div>
    </button>
  );
}

function LoadingCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

export default function QualityOperatorList({
  statusFilter = "AWAITING_QUALITY",
  title = "Post-QC",
  basePath = "/quality/operator",
}) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [error, setError] = useState(null);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getSaleOrders(
        1,
        100,
        search,
        { statuses: statusFilter },
        "updatedAt",
        "asc"
      );
      if (response.success) {
        setOrders(response.data || []);
      }
    } catch {
      setError("Failed to load quality check orders.");
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  // Type-to-search (same feel as Purchase Order list)
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleScan = async (scannedRaw) => {
    const { orderNo, customerRefNo } = parseSaleOrderScanPayload(scannedRaw);
    const searchTerm = orderNo || customerRefNo || String(scannedRaw || "").trim();
    if (!searchTerm) return;

    try {
      const response = await getSaleOrders(
        1,
        10,
        searchTerm,
        { statuses: statusFilter },
        "updatedAt",
        "asc"
      );
      const results = response?.data || [];
      const exact =
        results.find(
          (o) =>
            orderNo &&
            o.orderNo?.toLowerCase() === orderNo.toLowerCase()
        ) ||
        results.find(
          (o) =>
            customerRefNo &&
            o.customerRefNo?.toLowerCase() === customerRefNo.toLowerCase()
        );

      if (response?.success && exact) {
        navigate(`${basePath}/${exact.id}`);
        return;
      }
      if (response?.success && results.length === 1) {
        navigate(`${basePath}/${results[0].id}`);
        return;
      }
    } catch {
      // fall through to manual search behavior below
    }
    setSearchInput(searchTerm);
    setSearch(searchTerm);
  };

  return (
    <div className="w-full p-3 sm:p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">{title}</h1>
      </div>

      {/* Search · Refresh · Scan — same order as Purchase Order */}
      <Card className="p-1 sm:p-1">
        <form
          onSubmit={handleSearchSubmit}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
        >
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search order, customer, customer ref…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Refresh onClick={fetchOrders} disabled={isLoading} />
            <QrScanButton onScan={handleScan} label="Scan" className="h-8" />
          </div>
        </form>
      </Card>

      {/* Count */}
      {!isLoading && orders.length > 0 && (
        <p className="text-xs font-medium text-cyan-700">
          {orders.length} order{orders.length !== 1 ? "s" : ""} awaiting quality check
        </p>
      )}

      {/* Content */}
      {isLoading ? (
        <LoadingCards />
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
          <AlertCircle className="w-10 h-10" />
          <p className="text-sm">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchOrders}>Retry</Button>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
          <ClipboardCheck className="w-10 h-10" />
          <p className="text-sm">No orders awaiting quality check.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-4">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              statusLabel={title}
              onClick={() => navigate(`${basePath}/${order.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
