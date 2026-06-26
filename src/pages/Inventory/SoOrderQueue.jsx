import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, RefreshCw, Package, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  getInventorySoQueue,
  raisePoFromSo,
  issueSoToPreQc,
} from "@/services/saleOrder";
import { statusColors } from "@/pages/SaleOrder/SaleOrder.constants";
import { queueBadge } from "@/constants/saleOrderStatus";

function QueueCard({ order, onIssue, onRaisePo, busy }) {
  const badge = queueBadge(order.status);
  const statusClass = statusColors[order.status] || statusColors.DRAFT;

  return (
    <div className="bg-white rounded-xl border p-4 space-y-3">
      <div className="flex justify-between gap-2">
        <span className="font-semibold">{order.orderNo}</span>
        <Badge className={`${statusClass} text-xs border`}>
          {order.status?.replace(/_/g, " ")}
        </Badge>
      </div>
      {badge && (
        <Badge variant="outline" className="text-xs">
          {badge}
        </Badge>
      )}
      <p className="text-sm text-muted-foreground truncate">
        {order.customer?.name} · {order.procurementType || "RX"}
      </p>
      <p className="text-sm truncate">{order.lensProduct?.lens_name || "—"}</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => onIssue(order.id)} disabled={busy}>
          Issue & Pre-QC
        </Button>
        {["DRAFT", "PO_CANCELLED"].includes(order.status) && (
          <Button size="sm" variant="outline" onClick={() => onRaisePo(order.id)} disabled={busy}>
            Raise PO
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => window.open(`/sales/orders/view/${order.id}`, "_blank")}
        >
          View SO
        </Button>
      </div>
    </div>
  );
}

export default function SoOrderQueue() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getInventorySoQueue({ search: search || undefined, limit: 100 });
      if (res.success) setOrders(res.data || []);
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [search, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleIssue = async (id) => {
    setBusy(true);
    try {
      const res = await issueSoToPreQc(id);
      if (res.success) {
        toast({ title: "Issued to Pre-QC" });
        load();
      }
    } catch (e) {
      toast({ title: "Issue failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleRaisePo = async (id) => {
    setBusy(true);
    try {
      const res = await raisePoFromSo(id, "INVENTORY");
      if (res.success) {
        toast({ title: "PO raised", description: res.data?.poNumber });
        window.open(`/masters/purchase-orders/edit/${res.data.id}`, "_blank");
        load();
      }
    } catch (e) {
      toast({ title: "Raise PO failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Package className="h-5 w-5" />
            SO Order Queue
          </h1>
          <p className="text-sm text-muted-foreground">Inventory — issue stock or raise PO</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>

      <div className="flex gap-2 max-w-md">
        <Input
          placeholder="Search order no…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <Button variant="secondary" onClick={load}>
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-2">
          <AlertCircle className="h-8 w-8" />
          No orders in queue
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {orders.map((o) => (
            <QueueCard
              key={o.id}
              order={o}
              onIssue={handleIssue}
              onRaisePo={handleRaisePo}
              busy={busy}
            />
          ))}
        </div>
      )}
    </div>
  );
}
