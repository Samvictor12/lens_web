import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package, TrendingUp, Layers, AlertTriangle, Plus,
  BarChart2, RefreshCw, Download, ArrowUpRight, ArrowDownRight,
  Filter
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "./Inventory.constants";
import InventoryInitializationForm from "./InventoryInitializationForm";
import { godownTypeToSlug, inventoryTabPath } from "./inventoryGodown";
import { getStockValueReport, getTopLowSellingProducts } from "@/services/inventory";

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : d;

// Local calendar date as YYYY-MM-DD — NOT toISOString().slice(0,10), which renders
// in UTC and under-reports "today" by one day during the IST midnight-5:30AM window.
const toLocalDateStr = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const dateRangeToParams = (range, customFrom, customTo) => {
  const now = new Date();
  if (range === "7d") {
    const s = new Date(now); s.setDate(s.getDate() - 7);
    return { startDate: toLocalDateStr(s), endDate: toLocalDateStr(now) };
  }
  if (range === "30d") {
    const s = new Date(now); s.setDate(s.getDate() - 30);
    return { startDate: toLocalDateStr(s), endDate: toLocalDateStr(now) };
  }
  return { startDate: customFrom || "", endDate: customTo || "" };
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

const exportToPDF = (title, headers, rows) => {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  const htmlContent = `
    <html>
      <head>
        <title>\${title}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; }
          h1 { color: #1e3a8a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
          th { background-color: #f8fafc; color: #1e293b; font-weight: 600; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .footer { margin-top: 30px; font-size: 11px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; }
        </style>
      </head>
      <body>
        <h1>\${title}</h1>
        <p>Generated on: \${new Date().toLocaleString()}</p>
        <table>
          <thead>
            <tr>
              \${headers.map(h => \`<th>\${h}</th>\`).join("")}
            </tr>
          </thead>
          <tbody>
            \${rows.map(row => \`
              <tr>
                \${row.map(cell => \`<td>\${cell}</td>\`).join("")}
              </tr>
            \`).join("")}
          </tbody>
        </table>
        <div class="footer">
          Lens Management System &copy; \${new Date().getFullYear()} - Confidential Report
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script>
      </body>
    </html>
  `;
  printWindow.document.write(htmlContent);
  printWindow.document.close();
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, colorClass, iconColorClass, isLoading, subtitle }) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${colorClass}`}>
              {isLoading ? "—" : value}
            </p>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center bg-muted/40`}>
            <Icon className={`h-5 w-5 ${iconColorClass}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, icon: Icon, iconClass, children, actions }) {
  return (
    <Card>
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

// ─────────────────────────────────────────────────────────────────────────────
export default function InventoryDashboard({ stats = {}, isLoading = false, onRefresh = () => {}, godownType }) {
  const [showInitForm, setShowInitForm] = useState(false);
  const navigate = useNavigate();
  const godownSlug = godownTypeToSlug(godownType);
  const transactionsPath = inventoryTabPath(godownSlug, "transactions");

  // Value trend state
  const [valueRange, setValueRange] = useState("30d");
  const [valueData, setValueData] = useState([]);
  const [valueSummary, setValueSummary] = useState({});
  const [valueLoading, setValueLoading] = useState(false);

  // Top/Low selling state
  const [salesDays, setSalesDays] = useState("30");
  const [topLowData, setTopLowData] = useState({ top10: [], low10: [] });
  const [topLowLoading, setTopLowLoading] = useState(false);

  // Load value trend (scoped to current godown)
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

  // Load top/low selling (scoped to current godown)
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

  const handleExportValueTrend = (type) => {
    const title = `Inward vs Outward Quantity Trend (${valueRange === "7d" ? "Last 7 Days" : "Last 30 Days"})`;

    if (type === "excel") {
      const headers = ["Date", "Inward Qty", "Outward Qty"];
      const rows = valueData.map(row => [row.date, row.inward, row.outward]);
      const csvContent = "data:text/csv;charset=utf-8,"
        + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `quantity_trend_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (type === "pdf") {
      const headers = ["Date", "Inward Qty", "Outward Qty"];
      const rows = valueData.map(row => [fmtDate(row.date), row.inward, row.outward]);
      exportToPDF(title, headers, rows);
    }
  };

  useEffect(() => { loadValueTrend(); }, [loadValueTrend]);
  useEffect(() => { loadTopLow(); }, [loadTopLow]);

  const statCards = [
    {
      label: "Product Count",
      value: stats.productCount ?? stats.totalItems ?? 0,
      icon: Package,
      colorClass: "text-primary",
      iconColorClass: "text-primary",
      subtitle: "Distinct lens products in stock",
    },
    {
      label: "Available",
      value: stats.availableItems ?? 0,
      icon: TrendingUp,
      colorClass: "text-green-600",
      iconColorClass: "text-green-500",
      subtitle: "Items with status AVAILABLE",
    },
    {
      label: "Reserved",
      // Primary = waiting-queue soft claims; hard reservedStock as secondary
      value: stats.softReservedQty ?? 0,
      icon: Layers,
      colorClass: "text-yellow-600",
      iconColorClass: "text-yellow-500",
      subtitle:
        (stats.reservedItems ?? 0) > 0
          ? `Hard reserved (Issue): ${stats.reservedItems}`
          : "Queue soft claims (FIFO)",
    },
    {
      label: "Low Stock",
      value: stats.lowStockItems?.length ?? stats.lowStockCount ?? 0,
      icon: AlertTriangle,
      colorClass: "text-red-600",
      iconColorClass: "text-red-500",
      subtitle: "Below minimum threshold",
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto pr-1 space-y-4 pb-4">

      {/* ── Stat Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} isLoading={isLoading} />
        ))}
      </div>

      {/* ── Total Inventory Value ───────────────────────────────────────── */}
      {stats.totalValue != null && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Inventory Value</p>
                <p className="text-2xl font-bold">
                  {isLoading ? "—" : formatCurrency(stats.totalValue)}
                </p>
              </div>
              <TrendingUp className="h-7 w-7 text-primary opacity-60" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Inward / Outward Quantity Trend (2c) ─────────────────────────── */}
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
                  onClick={() => navigate(transactionsPath, { state: { filterType: 'INWARD_PO' } })}
                >
                  <ArrowUpRight className="h-3 w-3" />
                  {formatCurrency(valueSummary.totalInwardValue)}
                </span>
                <span 
                  className="flex items-center gap-1 text-red-600 cursor-pointer hover:underline"
                  onClick={() => navigate(transactionsPath, { state: { filterType: 'OUTWARD_SALE' } })}
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={valueData.length === 0}>
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExportValueTrend("excel")}>
                  Export to Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportValueTrend("pdf")}>
                  Export to PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      >
        {valueLoading ? (
          <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
            Loading chart...
          </div>
        ) : valueData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
            No transactions in this period
          </div>
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

      {/* ── Top & Low 10 Selling Products (Side-by-Side) ────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top 10 Column */}
        <Section
          title="Top 10 Selling Products"
          icon={ArrowUpRight}
          iconClass="text-green-500"
          actions={
            <div className="flex items-center gap-2">
              <Select value={salesDays} onValueChange={setSalesDays}>
                <SelectTrigger className="h-7 text-xs w-24">
                  <SelectValue />
                </SelectTrigger>
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
            <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : topLowData.top10.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              No sales data for this period
            </div>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {topLowData.top10.map((prod, idx) => {
                const maxUnits = topLowData.top10[0]?.unitsSold || 1;
                const pct = Math.round((prod.unitsSold / maxUnits) * 100);
                return (
                  <div key={prod.lens_id} className="flex items-center gap-3 text-xs">
                    <span className="w-5 text-muted-foreground font-mono text-right shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{prod.lens_name}</p>
                      {prod.product_code && (
                        <p className="text-muted-foreground">{prod.product_code}</p>
                      )}
                      <div className="mt-0.5 w-full bg-muted rounded-full h-1">
                        <div
                          className="h-full rounded-full bg-green-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs font-semibold">
                      {prod.unitsSold} units
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* Low 10 Column */}
        <Section
          title="Low 10 Selling Products"
          icon={ArrowDownRight}
          iconClass="text-red-500"
          actions={
            <div className="flex items-center gap-2">
              <Select value={salesDays} onValueChange={setSalesDays}>
                <SelectTrigger className="h-7 text-xs w-24">
                  <SelectValue />
                </SelectTrigger>
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
            <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : topLowData.low10.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              No sales data for this period
            </div>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {topLowData.low10.map((prod, idx) => {
                const maxUnits = topLowData.low10[0]?.unitsSold || 1;
                const pct = Math.round((prod.unitsSold / maxUnits) * 100);
                return (
                  <div key={prod.lens_id} className="flex items-center gap-3 text-xs">
                    <span className="w-5 text-muted-foreground font-mono text-right shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{prod.lens_name}</p>
                      {prod.product_code && (
                        <p className="text-muted-foreground">{prod.product_code}</p>
                      )}
                      <div className="mt-0.5 w-full bg-muted rounded-full h-1">
                        <div
                          className="h-full rounded-full bg-red-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs font-semibold">
                      {prod.unitsSold} units
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      </div>

      {/* ── Pending Inwards ─────────────────────────────────────────────── */}
      {(stats.pendingInwardsCount > 0 || stats.pendingInwardsList?.length > 0) && (
        <Section title="Pending Inwards" icon={Package} iconClass="text-blue-500">
          <div className="flex items-center gap-4 mb-3">
            <p className="text-2xl font-bold text-blue-600">{stats.pendingInwardsCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">PO receipts awaiting inward</p>
          </div>
          {stats.pendingInwardsList?.length > 0 && (
            <div className="space-y-1.5">
              {stats.pendingInwardsList.slice(0, 5).map((inward) => (
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

      {/* ── Low Stock Alerts ─────────────────────────────────────────────── */}
      {stats.lowStockItems?.length > 0 && (
        <Section title="Low Stock Alerts" icon={AlertTriangle} iconClass="text-red-500">
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {stats.lowStockItems.slice(0, 10).map((item) => (
              <div
                key={item.id || `${item.lens_id}-${item.location_id}`}
                className="flex items-center justify-between p-2 bg-red-50 rounded text-xs border-l-4 border-red-500"
              >
                <div className="flex-1">
                  <p className="font-medium truncate">
                    {item.lensProduct?.lens_name || `Lens #${item.lens_id}`}
                  </p>
                  <p className="text-muted-foreground mt-0.5">
                    {item.location?.name || "Unknown Location"}
                  </p>
                </div>
                <div className="ml-2 text-right">
                  <Badge variant="destructive" className="text-xs">
                    {item.currentQty || 0} / {item.minThresholdQty || 0}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          {stats.lowStockItems.length > 10 && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              +{stats.lowStockItems.length - 10} more below threshold
            </p>
          )}
        </Section>
      )}

      {/* ── Initialize Stock ─────────────────────────────────────────────── */}
      <Card className="border-dashed">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Initialize Stock</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Manually add initial inventory items to your trays
              </p>
            </div>
            <Button onClick={() => setShowInitForm(true)} className="gap-2" size="sm">
              <Plus className="h-4 w-4" />
              Add Stock
            </Button>
          </div>
        </CardContent>
      </Card>

      <InventoryInitializationForm
        isOpen={showInitForm}
        onClose={() => setShowInitForm(false)}
        onSuccess={() => { onRefresh(); }}
        godownType={godownType}
      />
    </div>
  );
}
