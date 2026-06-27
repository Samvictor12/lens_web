import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getStatusLog } from "@/services/saleOrder";
import { STATUS_LABELS } from "@/constants/saleOrderStatus";
import { Skeleton } from "@/components/ui/skeleton";

export default function SaleOrderStatusLogDialog({ open, onOpenChange, orderId, orderNo: orderNoProp }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !orderId) return;
    setLoading(true);
    setError(null);
    getStatusLog(orderId)
      .then((res) => {
        if (res.success) setData(res.data);
        else setError("Failed to load status log");
      })
      .catch(() => setError("Failed to load status log"))
      .finally(() => setLoading(false));
  }, [open, orderId]);

  const displayNo = data?.orderNo || orderNoProp || "—";
  const current = data?.status ? (STATUS_LABELS[data.status] || data.status) : "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!flex !max-w-none w-[min(1100px,94vw)] h-[min(820px,88vh)] flex-col gap-4 overflow-hidden p-6">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Status history — {displayNo}</DialogTitle>
          <p className="text-sm text-muted-foreground">Current: {current}</p>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {!loading && data?.logs?.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-2">Date / time</th>
                  <th className="py-2 pr-2">From → To</th>
                  <th className="py-2 pr-2">By</th>
                  <th className="py-2 pr-2">Source</th>
                  <th className="py-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {data.logs.map((log) => (
                  <tr key={log.id} className="border-b border-border/50">
                    <td className="py-2 pr-2 whitespace-nowrap align-top">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2 pr-2 align-top">
                      {(log.fromStatus ? (STATUS_LABELS[log.fromStatus] || log.fromStatus) : "—")}
                      {" → "}
                      {STATUS_LABELS[log.toStatus] || log.toStatus}
                    </td>
                    <td className="py-2 pr-2 align-top">
                      {log.createdByUser?.name || log.createdByUser?.username || "—"}
                    </td>
                    <td className="py-2 pr-2 align-top">{log.source}</td>
                    <td className="py-2 align-top text-muted-foreground">{log.remark || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && data?.logs?.length === 0 && (
          <p className="text-sm text-muted-foreground">No status history yet.</p>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
