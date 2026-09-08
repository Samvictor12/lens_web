import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { getSpecAlerts } from "@/services/inventory";
import {
  buildBulkSelectionFromSpecs,
  selectedSpecsShareOneLens,
  specAlertRowKey,
  groupSpecAlertsByProduct,
  productGroupSelectState,
  toggleProductSpecSelection,
} from "./inventoryDashboardUtils";

const TYPE_BADGE = {
  low: { label: "Low", className: "bg-amber-100 text-amber-800" },
  out: { label: "Out", className: "bg-red-100 text-red-800" },
  over: { label: "High", className: "bg-purple-100 text-purple-800" },
};

const fmtPower = (v) => {
  const n = parseFloat(v);
  if (Number.isNaN(n)) return v ?? "—";
  return n > 0 ? `+${n.toFixed(2)}` : n.toFixed(2);
};

/**
 * Spec alert list grouped by product. Low and Out: select a product to select all its specs, then Raise PO.
 */
export default function InventoryAlertList({
  godownType,
  alertType,
  lens_id = null,
  title = "Spec alerts",
  limit = 10,
  compact = false,
}) {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());

  const canSelect = alertType === "low" || alertType === "out";

  const load = useCallback(async () => {
    if (!godownType || !alertType) return;
    setLoading(true);
    try {
      const pageSize = canSelect ? 100 : limit;
      const first = await getSpecAlerts({
        godownType,
        type: alertType,
        page: canSelect ? 1 : page,
        limit: pageSize,
        ...(lens_id ? { lens_id } : {}),
      });
      let data = first.data || [];
      if (canSelect) {
        const totalPages = first.pagination?.totalPages || 1;
        for (let p = 2; p <= totalPages && p <= 20; p++) {
          const res = await getSpecAlerts({
            godownType,
            type: alertType,
            page: p,
            limit: pageSize,
            ...(lens_id ? { lens_id } : {}),
          });
          data = data.concat(res.data || []);
        }
        setRows(data);
        setPagination({ page: 1, limit: data.length, total: data.length, totalPages: 1 });
      } else {
        setRows(data);
        setPagination(first.pagination || { page, limit, total: 0, totalPages: 1 });
      }
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [godownType, alertType, page, limit, lens_id, canSelect]);

  useEffect(() => {
    setPage(1);
    setSelectedKeys(new Set());
  }, [alertType, godownType, lens_id]);

  useEffect(() => {
    load();
  }, [load]);

  const badge = TYPE_BADGE[alertType] || TYPE_BADGE.low;
  const groups = useMemo(() => groupSpecAlertsByProduct(rows), [rows]);

  const selectedRows = useMemo(
    () => rows.filter((row) => selectedKeys.has(specAlertRowKey(row))),
    [rows, selectedKeys]
  );
  const sameLens = selectedSpecsShareOneLens(selectedRows);
  const raiseDisabled = !canSelect || selectedRows.length === 0 || !sameLens;

  const toggleProduct = (specs) => {
    const state = productGroupSelectState(selectedKeys, specs);
    setSelectedKeys(toggleProductSpecSelection(selectedKeys, specs, !state.checked));
  };

  const toggleRow = (row) => {
    const key = specAlertRowKey(row);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        return next;
      }
      const sameProduct = [...next].every((k) => k.startsWith(`${row.lens_id}|`));
      if (!sameProduct) {
        return new Set([key]);
      }
      next.add(key);
      return next;
    });
  };

  const handleRaisePo = () => {
    if (raiseDisabled) return;
    const first = selectedRows[0];
    const categoryName =
      first.categoryName || first.lensProduct?.category?.name || "";
    const lensBulkSelection = buildBulkSelectionFromSpecs(selectedRows, categoryName);
    const totalQty = Object.values(lensBulkSelection.selections || {}).reduce(
      (sum, sel) => sum + (parseInt(sel?.quantity, 10) || 0),
      0
    );

    navigate("/masters/purchase-orders/add", {
      state: {
        fromLowStockAlert: true,
        orderType: "Bulk",
        lens_id: first.lens_id,
        category_id: first.category_id ?? first.lensProduct?.category_id ?? null,
        Type_id: first.Type_id ?? first.lensProduct?.type_id ?? null,
        lensBulkSelection,
        quantity: totalQty,
      },
    });
  };

  return (
    <Card className={compact ? "shadow-none border-0" : ""}>
      {!compact && (
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={compact ? "p-0 space-y-2" : "px-4 pb-4 pt-0 space-y-2"}>
        {loading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No alerts</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {groups.map((group) => {
              const productState = productGroupSelectState(selectedKeys, group.specs);
              return (
                <div key={group.lens_id} className="rounded-md border">
                  <div className="flex items-center gap-2 px-2.5 py-2 bg-muted/40">
                    {canSelect && (
                      <Checkbox
                        checked={productState.indeterminate ? "indeterminate" : productState.checked}
                        onCheckedChange={() => toggleProduct(group.specs)}
                        aria-label={`Select all specs for ${group.lens_name}`}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{group.lens_name}</p>
                      {group.product_code ? (
                        <p className="text-[11px] text-muted-foreground truncate">{group.product_code}</p>
                      ) : null}
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {group.specs.length} spec{group.specs.length === 1 ? "" : "s"}
                    </Badge>
                  </div>
                  <div className="divide-y">
                    {group.specs.map((row) => {
                      const key = specAlertRowKey(row);
                      const checked = selectedKeys.has(key);
                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between px-2.5 py-2 text-xs gap-2"
                        >
                          {canSelect && (
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleRow(row)}
                              aria-label={`Select SPH ${fmtPower(row.sph)} CYL ${fmtPower(row.cyl)} ADD ${fmtPower(row.add)}`}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-muted-foreground">
                              SPH {fmtPower(row.sph)} · CYL {fmtPower(row.cyl)} · ADD {fmtPower(row.add)}
                            </p>
                          </div>
                          <div className="ml-2 text-right shrink-0 space-y-0.5">
                            <Badge variant="outline" className={`text-xs ${badge.className}`}>
                              {badge.label}
                            </Badge>
                            <p className="font-mono font-semibold">specQty {row.specQty}</p>
                            {canSelect && (
                              <p className="text-muted-foreground">min {row.minQty}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {canSelect && (
          <div className="flex flex-col gap-1 pt-1">
            <Button
              type="button"
              size="sm"
              disabled={raiseDisabled}
              onClick={handleRaisePo}
            >
              Raise PO
            </Button>
            {selectedRows.length > 0 && !sameLens && (
              <p className="text-xs text-destructive">
                Selected specs must share one product. Mix of products cannot raise a bulk PO.
              </p>
            )}
          </div>
        )}
        {!canSelect && pagination.totalPages > 1 && (
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
