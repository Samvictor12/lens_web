import { useCallback, useEffect, useState } from "react";
import {
  Package,
  Wrench,
  Truck,
  CheckCircle2,
  Target,
  Wallet,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCustomer360Card } from "@/services/customer360";
import { cn } from "@/lib/utils";

function fmtMoney(n) {
  const amount = Number.isFinite(Number(n)) ? Number(n) : 0;
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN");
}

const CARD_DEFS = [
  {
    key: "ordersMonth",
    label: "Orders this month",
    icon: Package,
    iconColor: "text-blue-500",
    valueFrom: (c) => c?.count ?? 0,
  },
  {
    key: "inProduction",
    label: "In production",
    icon: Wrench,
    iconColor: "text-amber-500",
    valueFrom: (c) => c?.count ?? 0,
  },
  {
    key: "inDispatch",
    label: "In dispatch",
    icon: Truck,
    iconColor: "text-violet-500",
    valueFrom: (c) => c?.count ?? 0,
  },
  {
    key: "delivered",
    label: "Delivered this month",
    icon: CheckCircle2,
    iconColor: "text-emerald-500",
    valueFrom: (c) => c?.count ?? 0,
  },
  {
    key: "collectionTarget",
    label: "Collection target",
    icon: Target,
    iconColor: "text-orange-500",
    valueFrom: (c) => fmtMoney(c?.amount),
    subFrom: (c) => `${c?.count ?? 0} invoice(s)`,
  },
  {
    key: "collectionActual",
    label: "Collection actual",
    icon: Wallet,
    iconColor: "text-green-600",
    valueFrom: (c) => fmtMoney(c?.amount),
    subFrom: (c) => `${c?.count ?? 0} receipt(s)`,
  },
];

function rowPrimary(cardKey, row) {
  if (cardKey === "collectionActual") return row.receiptNumber;
  if (cardKey === "collectionTarget") return row.invoiceNo;
  return row.orderNo;
}

function rowSecondary(cardKey, row) {
  if (cardKey === "collectionActual") {
    return `${fmtMoney(row.totalAmount)} · ${fmtDate(row.paymentDate)} · ${row.paymentMethod || ""}`;
  }
  if (cardKey === "collectionTarget") {
    return `${fmtMoney(row.balance)} due ${fmtDate(row.dueDate)} · ${row.status}`;
  }
  const lens = row.lensProduct?.lens_name;
  return [row.status, lens, fmtDate(row.orderDate || row.createdAt)].filter(Boolean).join(" · ");
}

/**
 * Section 2 — clickable KPI cards with inline paginated record list below.
 */
export default function Customer360Cards({ customerId, cards, loading }) {
  const [activeKey, setActiveKey] = useState("ordersMonth");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 5, total: 0, totalPages: 1 });
  const [listLoading, setListLoading] = useState(false);

  const loadList = useCallback(
    async (cardKey, pageNum) => {
      if (!customerId || !cardKey) return;
      setListLoading(true);
      try {
        const res = await getCustomer360Card(customerId, cardKey, { page: pageNum, limit: 5 });
        setRows(res.data || []);
        setPagination(
          res.pagination || { page: pageNum, limit: 5, total: 0, totalPages: 1 }
        );
      } catch {
        setRows([]);
      } finally {
        setListLoading(false);
      }
    },
    [customerId]
  );

  useEffect(() => {
    if (activeKey) loadList(activeKey, page);
  }, [activeKey, page, loadList]);

  useEffect(() => {
    setActiveKey("ordersMonth");
    setPage(1);
    setRows([]);
  }, [customerId]);

  const selectCard = (key) => {
    if (activeKey === key) return;
    setActiveKey(key);
    setPage(1);
  };

  const activeDef = CARD_DEFS.find((d) => d.key === activeKey);

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground">Orders & collection</h2>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
        {CARD_DEFS.map((def) => {
          const Icon = def.icon;
          const card = cards?.[def.key];
          const isActive = activeKey === def.key;
          return (
            <button
              key={def.key}
              type="button"
              disabled={loading || !customerId}
              onClick={() => selectCard(def.key)}
              className="text-left disabled:opacity-60"
            >
              <Card
                className={cn(
                  "shadow-none transition-colors h-full",
                  isActive
                    ? "border-primary ring-1 ring-primary/30 bg-primary/5"
                    : "hover:border-primary/40"
                )}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    {def.label}
                  </CardTitle>
                  <Icon className={`h-3.5 w-3.5 ${def.iconColor}`} />
                </CardHeader>
                <CardContent className="px-3 pb-3 pt-0">
                  <div className="text-lg font-bold">
                    {loading ? "…" : def.valueFrom(card)}
                  </div>
                  {def.subFrom && !loading && (
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {def.subFrom(card)}
                    </div>
                  )}
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      {activeKey && (
        <Card className="shadow-none">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-medium">{activeDef?.label || "Details"}</CardTitle>
            <p className="text-xs text-muted-foreground">Up to 5 rows per page</p>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 space-y-2">
            {listLoading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No records</p>
            ) : (
              rows.map((row) => (
                <div key={row.id} className="rounded-md border p-2.5">
                  <div className="text-sm font-medium font-mono">{rowPrimary(activeKey, row)}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {rowSecondary(activeKey, row)}
                  </div>
                </div>
              ))
            )}
            <div className="flex items-center justify-between pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1 || listLoading}
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
                disabled={page >= (pagination.totalPages || 1) || listLoading}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
