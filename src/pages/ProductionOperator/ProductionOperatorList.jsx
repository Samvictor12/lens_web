import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, RefreshCw, FlaskConical, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getSaleOrders } from "@/services/saleOrder";
import { statusColors } from "@/pages/SaleOrder/SaleOrder.constants";

const STATUS_LABELS = {
  CONFIRMED: "Confirmed",
  IN_PRODUCTION: "In Production",
  ON_HOLD: "On Hold",
};

function OrderCard({ order, onClick }) {
  const statusClass = statusColors[order.status] || "bg-gray-100 text-gray-800 border-gray-200";

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-2 active:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {/* Row 1: Order No + Status + Urgent flag */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-gray-900 text-base truncate">
          {order.orderNo}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {order.urgentOrder && (
            <Badge className="bg-red-100 text-red-700 border-red-200 text-xs px-1.5 py-0">
              Urgent
            </Badge>
          )}
          <Badge className={`${statusClass} text-xs border px-2 py-0`}>
            {STATUS_LABELS[order.status] || order.status}
          </Badge>
        </div>
      </div>

      {/* Row 2: Customer */}
      <div className="text-sm text-gray-600 truncate">
        {order.customer?.shopname || order.customer?.name || "—"}
      </div>

      {/* Row 3: Lens + Coating */}
      <div className="flex items-center gap-1.5 text-sm text-gray-500">
        <FlaskConical className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">
          {order.lensProduct?.lens_name || "—"}
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
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
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

export default function ProductionOperatorList() {
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
        { statuses: "CONFIRMED,IN_PRODUCTION,ON_HOLD" },
        "orderDate",
        "desc"
      );
      if (response.success) {
        setOrders(response.data || []);
      }
    } catch (err) {
      setError("Failed to load production orders.");
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  return (
    <div className="max-w-lg mx-auto p-3 sm:p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Production Orders</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={fetchOrders}
          disabled={isLoading}
          aria-label="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <Input
            placeholder="Search order, customer…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline" size="sm">
          Search
        </Button>
      </form>

      {/* Status summary counts */}
      {!isLoading && orders.length > 0 && (
        <div className="flex gap-2 flex-wrap text-xs">
          {["CONFIRMED", "IN_PRODUCTION", "ON_HOLD"].map((s) => {
            const count = orders.filter((o) => o.status === s).length;
            if (count === 0) return null;
            return (
              <span
                key={s}
                className={`px-2 py-1 rounded-full border font-medium ${statusColors[s]}`}
              >
                {STATUS_LABELS[s]}: {count}
              </span>
            );
          })}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <LoadingCards />
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
          <AlertCircle className="w-10 h-10" />
          <p className="text-sm">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchOrders}>
            Retry
          </Button>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
          <FlaskConical className="w-10 h-10" />
          <p className="text-sm">No active production orders found.</p>
        </div>
      ) : (
        <div className="space-y-3 pb-4">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onClick={() => navigate(`/production/operator/${order.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
