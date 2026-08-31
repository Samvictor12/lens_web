import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSpecAlerts } from "@/services/inventory";

const TYPE_BADGE = {
  low: { label: "Low", className: "bg-amber-100 text-amber-800" },
  out: { label: "Out", className: "bg-red-100 text-red-800" },
  over: { label: "Over", className: "bg-purple-100 text-purple-800" },
};

const fmtPower = (v) => {
  const n = parseFloat(v);
  if (Number.isNaN(n)) return v ?? "—";
  return n > 0 ? `+${n.toFixed(2)}` : n.toFixed(2);
};

/**
 * Reusable paginated spec alert table.
 */
export default function InventoryAlertList({
  godownType,
  alertType,
  lens_id = null,
  title = "Spec alerts",
  limit = 10,
  compact = false,
}) {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!godownType || !alertType) return;
    setLoading(true);
    try {
      const res = await getSpecAlerts({
        godownType,
        type: alertType,
        page,
        limit,
        ...(lens_id ? { lens_id } : {}),
      });
      setRows(res.data || []);
      setPagination(res.pagination || { page, limit, total: 0, totalPages: 1 });
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [godownType, alertType, page, limit, lens_id]);

  useEffect(() => {
    setPage(1);
  }, [alertType, godownType, lens_id]);

  useEffect(() => {
    load();
  }, [load]);

  const badge = TYPE_BADGE[alertType] || TYPE_BADGE.low;

  return (
    <Card className={compact ? "shadow-none border-0" : ""}>
      {!compact && (
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={compact ? "p-0" : "px-4 pb-4 pt-0 space-y-2"}>
        {loading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No alerts</p>
        ) : (
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {rows.map((row) => (
              <div
                key={`${row.id}-${row.sph}-${row.cyl}-${row.add}`}
                className="flex items-center justify-between rounded-md border p-2.5 text-xs"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {row.lensProduct?.lens_name || `Lens #${row.lens_id}`}
                  </p>
                  <p className="text-muted-foreground mt-0.5">
                    SPH {fmtPower(row.sph)} · CYL {fmtPower(row.cyl)} · ADD {fmtPower(row.add)}
                  </p>
                </div>
                <div className="ml-2 text-right shrink-0 space-y-1">
                  <Badge variant="outline" className={`text-xs ${badge.className}`}>
                    {badge.label}
                  </Badge>
                  <p className="font-mono font-semibold">
                    {row.specQty} / {row.minQty}
                    {row.maxQty != null ? `–${row.maxQty}` : ""}
                  </p>
                  {row.gap > 0 && (
                    <p className="text-muted-foreground">gap {row.gap}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {pagination.page} / {pagination.totalPages} · {pagination.total} total
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= (pagination.totalPages || 1) || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
