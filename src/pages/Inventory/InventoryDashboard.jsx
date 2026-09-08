import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package, TrendingUp, IndianRupee, Layers,
  ArrowUpRight, ArrowDownRight, RefreshCw, ShoppingCart,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatCurrency } from "./Inventory.constants";
import InventoryAlertList from "./InventoryAlertList";
import { godownTypeToSlug, inventoryTabPath } from "./inventoryGodown";
import { dateRangeToParams, queueShareBars } from "./inventoryDashboardUtils";
import { getStockValueReport, getTopLowSellingProducts } from "@/services/inventory";
import { cn } from "@/lib/utils";

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : d;

const CUSTOM_TOOLTIP = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
};

const KPI_DEFS = [
  { key: "products", label: "Total Products", field: "productCount", icon: Package, color: "text-primary", iconColor: "text-primary" },
  { key: "stock", label: "Total Stock", field: "totalStockUnits", icon: Layers, color: "text-blue-600", iconColor: "text-blue-500", subtitle: "Units (spec aggregate)" },
  { key: "value", label: "Total Value", field: "totalValue", icon: IndianRupee, color: "text-emerald-600", iconColor: "text-emerald-500", isCurrency: true },
  {
    key: "monthQty",
    label: "This month qty",
    icon: ArrowUpRight,
    iconColor: "text-green-500",
    subtitle: "Inward / Outward",
    splitFields: ["monthInwardQty", "monthOutwardQty"],
    splitColors: ["text-green-600", "text-red-600"],
  },
  {
    key: "monthVal",
    label: "This month value",
    icon: IndianRupee,
    iconColor: "text-emerald-600",
    subtitle: "Inward ₹ / Outward ₹",
    isCurrency: true,
    splitFields: ["monthInwardValue", "monthOutwardValue"],
    splitColors: ["text-green-700", "text-red-700"],
  },
];

const PIE_COLORS = {
  High: "#8b5cf6",
  Low: "#f59e0b",
  Out: "#ef4444",
};

const DONUT_COLORS = {
  inward: "#3b82f6",
  so: "#f97316",
};

function formatKpiValue(raw, isCurrency) {
  return isCurrency ? formatCurrency(raw ?? 0) : (raw ?? 0);
}

function KpiCard({ def, stats, isLoading }) {
  const Icon = def.icon;
  let display;
  let valueClass = def.color || "text-foreground";

  if (def.splitFields) {
    const [leftField, rightField] = def.splitFields;
    const [leftColor, rightColor] = def.splitColors || ["text-green-600", "text-red-600"];
    if (isLoading) {
      display = "—";
    } else {
      display = (
        <span className="inline-flex items-baseline gap-1 flex-wrap">
          <span className={leftColor}>{formatKpiValue(stats[leftField], def.isCurrency)}</span>
          <span className="text-muted-foreground font-normal">/</span>
          <span className={rightColor}>{formatKpiValue(stats[rightField], def.isCurrency)}</span>
        </span>
      );
    }
    valueClass = "text-foreground";
  } else {
    display = isLoading ? "—" : formatKpiValue(stats[def.field], def.isCurrency);
  }

  return (
    <Card className="relative overflow-hidden h-full">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">{def.label}</p>
            <p className={`text-xl xl:text-2xl font-bold mt-1 leading-tight ${valueClass}`}>{display}</p>
            {def.subtitle && <p className="text-xs text-muted-foreground mt-0.5">{def.subtitle}</p>}
          </div>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-muted/40 shrink-0">
            <Icon className={`h-5 w-5 ${def.iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex justify-between items-center gap-3 py-1.5 border-b border-border/60 last:border-0 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums text-right">{value}</span>
    </div>
  );
}

function Section({ title, icon: Icon, iconClass, children, actions, fillHeight = true }) {
  return (
    <Card className={fillHeight ? "h-full" : undefined}>
      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className={`h-4 w-4 ${iconClass ?? "text-primary"}`} />
          {title}
        </CardTitle>
        {actions && <div className="flex gap-2">{actions}</div>}
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

function SellingList({ rows, barClass, emptyLabel, loading }) {
  const sum = rows.reduce((s, r) => s + (Number(r.unitsSold) || 0), 0);
  if (loading) {
    return <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (!rows.length) {
    return <div className="text-center py-6 text-sm text-muted-foreground">{emptyLabel}</div>;
  }
  return (
    <div className="space-y-1.5 max-h-72 overflow-y-auto">
      {rows.map((prod, idx) => {
        const pct = sum > 0 ? Math.round(((Number(prod.unitsSold) || 0) / sum) * 100) : 0;
        return (
          <div
            key={`${prod.lens_id}-${prod.sph}-${prod.cyl}-${prod.add}`}
            className="flex items-center gap-3 text-xs"
          >
            <span className="w-5 text-muted-foreground font-mono text-right shrink-0">{idx + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{prod.lens_name}</p>
              <p className="text-muted-foreground">
                SPH {prod.sph} · CYL {prod.cyl} · ADD {prod.add}
                {prod.product_code ? ` · ${prod.product_code}` : ""}
              </p>
              <div className="mt-0.5 w-full bg-muted rounded-full h-1">
                <div className={cn("h-full rounded-full", barClass)} style={{ width: `${pct}%` }} />
              </div>
            </div>
            <Badge variant="outline" className="shrink-0 text-xs font-semibold">
              {prod.unitsSold} · {pct}%
            </Badge>
          </div>
        );
      })}
    </div>
  );
}

export default function InventoryDashboard({ stats = {}, isLoading = false, onRefresh = () => {}, godownType }) {
  const navigate = useNavigate();
  const godownSlug = godownTypeToSlug(godownType);
  const transactionsPath = inventoryTabPath(godownSlug, "transactions");

  const [valueRange, setValueRange] = useState("30d");
  const [valueData, setValueData] = useState([]);
  const [valueSummary, setValueSummary] = useState({});
  const [valueLoading, setValueLoading] = useState(false);
  const [salesDays, setSalesDays] = useState("60");
  const [topLowData, setTopLowData] = useState({ top10: [], low10: [] });
  const [topLowLoading, setTopLowLoading] = useState(false);
  const [alertPopup, setAlertPopup] = useState(null);

  const loadValueTrend = useCallback(async () => {
    setValueLoading(true);
    try {
      const params = {
        ...dateRangeToParams(valueRange),
        ...(godownType ? { godownType } : {}),
      };
      const res = await getStockValueReport(params);
      if (res.success) {
        setValueData(res.trend || []);
        setValueSummary(res.summary || {});
      }
    } catch { /* silent */ }
    finally { setValueLoading(false); }
  }, [valueRange, godownType]);

  const loadTopLow = useCallback(async () => {
    setTopLowLoading(true);
    try {
      const res = await getTopLowSellingProducts({
        days: salesDays,
        ...(godownType ? { godownType } : {}),
      });
      if (res.success) setTopLowData(res.data || { top10: [], low10: [] });
    } catch { /* silent */ }
    finally { setTopLowLoading(false); }
  }, [salesDays, godownType]);

  useEffect(() => { loadValueTrend(); }, [loadValueTrend]);
  useEffect(() => { loadTopLow(); }, [loadTopLow]);

  const pieData = useMemo(() => {
    const high = Number(stats.overStockCount) || 0;
    const low = Number(stats.lowStockCount) || 0;
    const out = Number(stats.outOfStockCount) || 0;
    return [
      { name: "High", alertType: "over", value: high },
      { name: "Low", alertType: "low", value: low },
      { name: "Out", alertType: "out", value: out },
    ];
  }, [stats.overStockCount, stats.lowStockCount, stats.outOfStockCount]);

  const pieTotal = pieData.reduce((s, d) => s + d.value, 0);
  const statusBars = useMemo(() => {
    if (!pieTotal) return [];
    return [...pieData]
      .map((d) => ({ ...d, pct: d.value / pieTotal }))
      .sort((a, b) => b.pct - a.pct);
  }, [pieData, pieTotal]);

  const donutData = useMemo(() => ([
    { key: "inward", name: "Inward Queue", tab: "inward", value: Number(stats.pendingInwardsCount) || 0 },
    { key: "so", name: "SO Queue", tab: "requestQueue", value: Number(stats.soQueueCount) || 0 },
  ]), [stats.pendingInwardsCount, stats.soQueueCount]);
  const donutTotal = donutData.reduce((s, d) => s + d.value, 0);
  const queueBars = useMemo(
    () => queueShareBars(stats.pendingInwardsCount, stats.soQueueCount),
    [stats.pendingInwardsCount, stats.soQueueCount]
  );

  const openQueueTab = (tab) => {
    if (tab === "inward" || tab === "requestQueue") {
      navigate(inventoryTabPath(godownSlug, tab));
    }
  };

  const openAlert = (alertType, title) => {
    setAlertPopup({ alertType, title });
  };

  const daysSelect = (
    <div className="flex items-center gap-2">
      <Select value={salesDays} onValueChange={setSalesDays}>
        <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="30">Last 30d</SelectItem>
          <SelectItem value="60">Last 60d</SelectItem>
          <SelectItem value="90">Last 90d</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={loadTopLow}>
        <RefreshCw className={`h-3.5 w-3.5 ${topLowLoading ? "animate-spin" : ""}`} />
      </Button>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto pr-1 space-y-4 pb-4">

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {KPI_DEFS.map((def) => (
          <KpiCard key={def.key} def={def} stats={stats} isLoading={isLoading} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 min-w-0">
        <Section title="Stock status (High / Low / Out)" icon={Package} iconClass="text-purple-500">
          {isLoading ? (
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
          ) : pieTotal === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
              No High / Low / Out specs
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    onClick={(entry) => {
                      const payload = entry?.payload || entry;
                      if (payload?.alertType) openAlert(payload.alertType, `${payload.name} stock`);
                    }}
                  >
                    {pieData.map((d) => (
                      <Cell key={d.name} fill={PIE_COLORS[d.name]} className="cursor-pointer" />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {statusBars.map((bar) => (
                  <button
                    key={bar.alertType}
                    type="button"
                    className="w-full text-left"
                    onClick={() => openAlert(bar.alertType, `${bar.name} stock`)}
                  >
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="font-medium">{bar.name}</span>
                      <span className="text-muted-foreground">
                        {bar.value} · {Math.round(bar.pct * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.round(bar.pct * 100)}%`, backgroundColor: PIE_COLORS[bar.name] }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </Section>
        </div>

        <div className="lg:col-span-3 min-w-0">
        <Section
          title="Inward / Outward Quantity Trend"
          icon={TrendingUp}
          iconClass="text-emerald-500"
          actions={
            <>
              {valueSummary.totalInwardValue != null && (
                <div className="flex gap-3 text-xs mr-2">
                  <span
                    className="flex items-center gap-1 text-green-600 cursor-pointer hover:underline"
                    onClick={() => navigate(transactionsPath, { state: { filterType: "INWARD_PO" } })}
                  >
                    <ArrowUpRight className="h-3 w-3" />
                    {formatCurrency(valueSummary.totalInwardValue)}
                  </span>
                  <span
                    className="flex items-center gap-1 text-red-600 cursor-pointer hover:underline"
                    onClick={() => navigate(transactionsPath, { state: { filterType: "OUTWARD_SALE" } })}
                  >
                    <ArrowDownRight className="h-3 w-3" />
                    {formatCurrency(valueSummary.totalOutwardValue)}
                  </span>
                </div>
              )}
              <Select value={valueRange} onValueChange={setValueRange}>
                <SelectTrigger className="h-7 text-xs w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="15d">Last 15 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="60d">Last 60 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={loadValueTrend}>
                <RefreshCw className={`h-3.5 w-3.5 ${valueLoading ? "animate-spin" : ""}`} />
              </Button>
            </>
          }
        >
          {valueLoading ? (
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">Loading chart…</div>
          ) : valueData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No transactions in this period</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={valueData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="inGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="outGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => v.toFixed(1)} />
                <Tooltip content={<CUSTOM_TOOLTIP />} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="inward" name="Inward Qty" stroke="#10b981" fill="url(#inGrad)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="outward" name="Outward Qty" stroke="#ef4444" fill="url(#outGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Section>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title="Top 10 Selling Specs" icon={ArrowUpRight} iconClass="text-green-500" actions={daysSelect}>
          <SellingList
            rows={topLowData.top10 || []}
            barClass="bg-green-500"
            emptyLabel="No sales data for this period"
            loading={topLowLoading}
          />
        </Section>

        <Section title="Low 10 Selling Specs" icon={ArrowDownRight} iconClass="text-red-500" actions={daysSelect}>
          <SellingList
            rows={topLowData.low10 || []}
            barClass="bg-red-400"
            emptyLabel="No sales data for this period"
            loading={topLowLoading}
          />
        </Section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 min-w-0">
          <Section title="Inward vs SO Queue" icon={ShoppingCart} iconClass="text-blue-500">
            {isLoading ? (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
            ) : donutTotal === 0 ? (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                No pending inwards or SO queue items
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      onClick={(entry) => {
                        const payload = entry?.payload || entry;
                        if (payload?.tab) openQueueTab(payload.tab);
                      }}
                    >
                      {donutData.map((d) => (
                        <Cell key={d.key} fill={DONUT_COLORS[d.key]} className="cursor-pointer" />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {queueBars.map((bar) => (
                    <button
                      key={bar.key}
                      type="button"
                      className="w-full text-left"
                      onClick={() => openQueueTab(bar.tab)}
                    >
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="font-medium">{bar.name}</span>
                        <span className="text-muted-foreground">
                          {bar.value} · {Math.round(bar.pct * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.round(bar.pct * 100)}%`, backgroundColor: DONUT_COLORS[bar.key] }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Section>
        </div>

        <div className="lg:col-span-2 min-w-0">
          <Section title="Stock Summary" icon={Layers} iconClass="text-blue-500">
            {isLoading ? (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
            ) : (
              <div>
                <SummaryRow label="Products" value={stats.productCount ?? 0} />
                <SummaryRow label="Locations" value={stats.locationCount ?? 0} />
                <SummaryRow label="Trays" value={stats.trayCount ?? 0} />
                <SummaryRow label="Stock units" value={stats.totalStockUnits ?? 0} />
                <SummaryRow label="Total value" value={formatCurrency(stats.totalValue ?? 0)} />
              </div>
            )}
          </Section>
        </div>
      </div>

      <Dialog open={Boolean(alertPopup)} onOpenChange={(open) => { if (!open) setAlertPopup(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{alertPopup?.title || "Spec alerts"}</DialogTitle>
            <DialogDescription>
              Product, SPH / CYL / ADD, and spec quantity
              {alertPopup?.alertType === "low" || alertPopup?.alertType === "out"
                ? ". Grouped by product — select a product to include all its specs, then Raise PO at min qty."
                : "."}
            </DialogDescription>
          </DialogHeader>
          {alertPopup && (
            <InventoryAlertList
              godownType={godownType}
              alertType={alertPopup.alertType}
              title={alertPopup.title}
              limit={50}
              compact
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
