import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package, TrendingUp, IndianRupee, AlertTriangle,
  ArrowUpRight, ArrowDownRight, XCircle, Layers,
  RefreshCw,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "./Inventory.constants";
import InventoryAlertList from "./InventoryAlertList";
import { godownTypeToSlug, inventoryTabPath } from "./inventoryGodown";
import { getStockValueReport, getTopLowSellingProducts } from "@/services/inventory";
import { cn } from "@/lib/utils";

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : d;

const toLocalDateStr = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const dateRangeToParams = (range) => {
  const now = new Date();
  if (range === "7d") {
    const s = new Date(now); s.setDate(s.getDate() - 7);
    return { startDate: toLocalDateStr(s), endDate: toLocalDateStr(now) };
  }
  const s = new Date(now); s.setDate(s.getDate() - 30);
  return { startDate: toLocalDateStr(s), endDate: toLocalDateStr(now) };
};

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
  { key: "low", label: "Low Stock", field: "lowStockCount", icon: AlertTriangle, color: "text-amber-600", iconColor: "text-amber-500", alertType: "low" },
  { key: "out", label: "Out of Stock", field: "outOfStockCount", icon: XCircle, color: "text-red-600", iconColor: "text-red-500", alertType: "out" },
  { key: "over", label: "Over Stock", field: "overStockCount", icon: TrendingUp, color: "text-purple-600", iconColor: "text-purple-500", alertType: "over" },
];

function ClickableKpiCard({ def, stats, isLoading, isActive, onClick }) {
  const Icon = def.icon;
  const raw = stats[def.field] ?? 0;
  const display = def.isCurrency ? (isLoading ? "—" : formatCurrency(raw)) : (isLoading ? "—" : raw);

  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left w-full"
      disabled={isLoading}
    >
      <Card className={cn(
        "relative overflow-hidden transition-colors h-full",
        isActive ? "border-primary ring-1 ring-primary/30 bg-primary/5" : "hover:border-primary/40"
      )}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{def.label}</p>
              <p className={`text-2xl font-bold mt-1 ${def.color}`}>{display}</p>
              {def.subtitle && <p className="text-xs text-muted-foreground mt-0.5">{def.subtitle}</p>}
            </div>
            <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-muted/40">
              <Icon className={`h-5 w-5 ${def.iconColor}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </button>
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

export default function InventoryDashboard({ stats = {}, isLoading = false, onRefresh = () => {}, godownType }) {
  const navigate = useNavigate();
  const godownSlug = godownTypeToSlug(godownType);
  const transactionsPath = inventoryTabPath(godownSlug, "transactions");

  const [selectedAlertKpi, setSelectedAlertKpi] = useState("low");
  const [valueRange, setValueRange] = useState("30d");
  const [valueData, setValueData] = useState([]);
  const [valueSummary, setValueSummary] = useState({});
  const [valueLoading, setValueLoading] = useState(false);
  const [salesDays, setSalesDays] = useState("30");
  const [topLowData, setTopLowData] = useState({ top10: [], low10: [] });
  const [topLowLoading, setTopLowLoading] = useState(false);

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

  const handleKpiClick = (def) => {
    if (!def.alertType) return;
    setSelectedAlertKpi((prev) => (prev === def.alertType ? null : def.alertType));
  };

  const activeAlertDef = KPI_DEFS.find((d) => d.alertType === selectedAlertKpi);

  return (
    <div className="flex-1 overflow-y-auto pr-1 space-y-4 pb-4">

      {/* ── 6 KPI Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {KPI_DEFS.map((def) => (
          <ClickableKpiCard
            key={def.key}
            def={def}
            stats={stats}
            isLoading={isLoading}
            isActive={def.alertType && selectedAlertKpi === def.alertType}
            onClick={() => handleKpiClick(def)}
          />
        ))}
      </div>

      {/* ── Section 2: Alert list OR trend chart ─────────────────────────── */}
      <div className={selectedAlertKpi ? "grid grid-cols-1 lg:grid-cols-2 gap-4" : ""}>
        {selectedAlertKpi ? (
          <InventoryAlertList
            godownType={godownType}
            alertType={selectedAlertKpi}
            title={activeAlertDef?.label || "Alerts"}
            limit={10}
          />
        ) : null}

        <Section
          title={selectedAlertKpi ? "Inward / Outward Trend" : "Inward / Outward Quantity Trend"}
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
                <SelectTrigger className="h-7 text-xs w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
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

      {/* ── Section 3: Top 10 / Low 10 ───────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section
          title="Top 10 Selling Products"
          icon={ArrowUpRight}
          iconClass="text-green-500"
          actions={
            <div className="flex items-center gap-2">
              <Select value={salesDays} onValueChange={setSalesDays}>
                <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">Last 30d</SelectItem>
                  <SelectItem value="90">Last 90d</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={loadTopLow}>
                <RefreshCw className={`h-3.5 w-3.5 ${topLowLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          }
        >
          {topLowLoading ? (
            <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
          ) : topLowData.top10.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">No sales data for this period</div>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {topLowData.top10.map((prod, idx) => {
                const maxUnits = topLowData.top10[0]?.unitsSold || 1;
                const pct = Math.round((prod.unitsSold / maxUnits) * 100);
                return (
                  <div key={prod.lens_id} className="flex items-center gap-3 text-xs">
                    <span className="w-5 text-muted-foreground font-mono text-right shrink-0">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{prod.lens_name}</p>
                      {prod.product_code && <p className="text-muted-foreground">{prod.product_code}</p>}
                      <div className="mt-0.5 w-full bg-muted rounded-full h-1">
                        <div className="h-full rounded-full bg-green-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs font-semibold">{prod.unitsSold} units</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        <Section
          title="Low 10 Selling Products"
          icon={ArrowDownRight}
          iconClass="text-red-500"
          actions={
            <div className="flex items-center gap-2">
              <Select value={salesDays} onValueChange={setSalesDays}>
                <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">Last 30d</SelectItem>
                  <SelectItem value="90">Last 90d</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={loadTopLow}>
                <RefreshCw className={`h-3.5 w-3.5 ${topLowLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          }
        >
          {topLowLoading ? (
            <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
          ) : topLowData.low10.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">No sales data for this period</div>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {topLowData.low10.map((prod, idx) => {
                const maxUnits = topLowData.low10[0]?.unitsSold || 1;
                const pct = Math.round((prod.unitsSold / maxUnits) * 100);
                return (
                  <div key={prod.lens_id} className="flex items-center gap-3 text-xs">
                    <span className="w-5 text-muted-foreground font-mono text-right shrink-0">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{prod.lens_name}</p>
                      {prod.product_code && <p className="text-muted-foreground">{prod.product_code}</p>}
                      <div className="mt-0.5 w-full bg-muted rounded-full h-1">
                        <div className="h-full rounded-full bg-red-400" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs font-semibold">{prod.unitsSold} units</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      </div>

      {/* ── Pending Inwards (retained) ───────────────────────────────────── */}
      {(stats.pendingInwardsCount > 0 || stats.pendingInwardsList?.length > 0) && (
        <Section title="Pending Inwards" icon={Package} iconClass="text-blue-500" fillHeight={false}>
          <div className="flex items-center gap-4 mb-3">
            <p className="text-2xl font-bold text-blue-600">{stats.pendingInwardsCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">PO receipts awaiting inward</p>
          </div>
          {stats.pendingInwardsList?.length > 0 && (
            <div className="space-y-1.5">
              {stats.pendingInwardsList.map((inward) => (
                <div key={inward.id} className="flex items-center justify-between p-2 bg-blue-50 rounded text-xs">
                  <span className="font-medium truncate">{inward.purchaseOrderNo || `PO #${inward.id}`}</span>
                  <Badge variant="outline" className="bg-blue-100 text-blue-800">
                    {inward.pendingQty || 0} pending
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}
    </div>
  );
}
