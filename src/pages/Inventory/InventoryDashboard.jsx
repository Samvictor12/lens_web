import { useState, useEffect, useCallback } from "react";
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
import { getInventorySpecCountTrend, getStockValueReport, getTopLowSellingProducts } from "@/services/inventory";
import { getLensTypesDropdown } from "@/services/saleOrder";

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : d;

const dateRangeToParams = (range, customFrom, customTo) => {
  const now = new Date();
  if (range === "7d") {
    const s = new Date(now); s.setDate(s.getDate() - 7);
    return { startDate: s.toISOString().slice(0, 10), endDate: now.toISOString().slice(0, 10) };
  }
  if (range === "30d") {
    const s = new Date(now); s.setDate(s.getDate() - 30);
    return { startDate: s.toISOString().slice(0, 10), endDate: now.toISOString().slice(0, 10) };
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
export default function InventoryDashboard({ stats = {}, isLoading = false, onRefresh = () => {} }) {
  const [showInitForm, setShowInitForm] = useState(false);

  // Spec count trend state
  const [specRange, setSpecRange] = useState("7d");
  const [specLensType, setSpecLensType] = useState("all");
  const [specData, setSpecData] = useState([]);
  const [specLoading, setSpecLoading] = useState(false);
  const [lensTypes, setLensTypes] = useState([]);

  // Value trend state
  const [valueRange, setValueRange] = useState("30d");
  const [valueData, setValueData] = useState([]);
  const [valueSummary, setValueSummary] = useState({});
  const [valueLoading, setValueLoading] = useState(false);

  // Top/Low selling state
  const [salesDays, setSalesDays] = useState("30");
  const [topLowData, setTopLowData] = useState({ top10: [], low10: [] });
  const [topLowLoading, setTopLowLoading] = useState(false);
  const [salesView, setSalesView] = useState("top"); // "top" | "low"

  // Load lens types for filter
  useEffect(() => {
    getLensTypesDropdown()
      .then((res) => { if (res.success) setLensTypes(res.data || []); })
      .catch(() => {});
  }, []);

  // Load spec count trend
  const loadSpecTrend = useCallback(async () => {
    setSpecLoading(true);
    try {
      const params = dateRangeToParams(specRange);
      if (specLensType !== "all") params.lensTypeId = specLensType;
      const res = await getInventorySpecCountTrend(params);
      if (res.success) setSpecData(res.data?.trend || []);
    } catch { /* silent */ }
    finally { setSpecLoading(false); }
  }, [specRange, specLensType]);

  // Load value trend
  const loadValueTrend = useCallback(async () => {
    setValueLoading(true);
    try {
      const params = dateRangeToParams(valueRange);
      const res = await getStockValueReport(params);
      if (res.success) {
        // Convert grouped data → date-aggregated for chart
        const byDate = {};
        for (const row of res.data || []) {
          const d = row.date ?? row.groupKey ?? "—";
          if (!byDate[d]) byDate[d] = { date: d, inward: 0, outward: 0 };
          byDate[d].inward += row.inwardValue || 0;
          byDate[d].outward += row.outwardValue || 0;
        }
        setValueData(Object.values(byDate));
        setValueSummary(res.summary || {});
      }
    } catch { /* silent */ }
    finally { setValueLoading(false); }
  }, [valueRange]);

  // Load top/low selling
  const loadTopLow = useCallback(async () => {
    setTopLowLoading(true);
    try {
      const res = await getTopLowSellingProducts({ days: salesDays });
      if (res.success) setTopLowData(res.data || { top10: [], low10: [] });
    } catch { /* silent */ }
    finally { setTopLowLoading(false); }
  }, [salesDays]);

  const handleExportSpecTrend = (type) => {
    const lensTypeName = specLensType === "all" ? "All" : (lensTypes.find(t => String(t.id ?? t.value) === specLensType)?.name ?? "Filter");
    const title = `Product Spec Inward Trend - ${lensTypeName} (${specRange === "7d" ? "Last 7 Days" : "Last 30 Days"})`;
    
    if (type === "excel") {
      const headers = ["Date", "Spec Count"];
      const rows = specData.map(row => [row.date, row.specCount]);
      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `spec_count_trend_${lensTypeName.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (type === "pdf") {
      const headers = ["Date", "Spec Count"];
      const rows = specData.map(row => [fmtDate(row.date), row.specCount]);
      exportToPDF(title, headers, rows);
    }
  };

  const handleExportValueTrend = (type) => {
    const title = `Inward vs Outward Value Trend (${valueRange === "7d" ? "Last 7 Days" : "Last 30 Days"})`;
    
    if (type === "excel") {
      const headers = ["Date", "Inward Value (INR)", "Outward Value (INR)"];
      const rows = valueData.map(row => [row.date, row.inward, row.outward]);
      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `value_trend_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (type === "pdf") {
      const headers = ["Date", "Inward Value", "Outward Value"];
      const rows = valueData.map(row => [fmtDate(row.date), formatCurrency(row.inward), formatCurrency(row.outward)]);
      exportToPDF(title, headers, rows);
    }
  };

  useEffect(() => { loadSpecTrend(); }, [loadSpecTrend]);
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
      value: stats.reservedItems ?? 0,
      icon: Layers,
      colorClass: "text-yellow-600",
      iconColorClass: "text-yellow-500",
      subtitle: "Linked to pending Sale Orders",
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

  const activeSalesList = salesView === "top" ? topLowData.top10 : topLowData.low10;

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

      {/* ── Spec Count Trend (2b) ───────────────────────────────────────── */}
      <Section
        title="Product Spec Count Trend"
        icon={BarChart2}
        iconClass="text-blue-500"
        actions={
          <>
            <Select value={specLensType} onValueChange={setSpecLensType}>
              <SelectTrigger className="h-7 text-xs w-36">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {lensTypes.map((t) => (
                  <SelectItem key={t.id ?? t.value} value={String(t.id ?? t.value)}>
                    {t.name ?? t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={specRange} onValueChange={setSpecRange}>
              <SelectTrigger className="h-7 text-xs w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={loadSpecTrend}>
              <RefreshCw className={`h-3.5 w-3.5 ${specLoading ? "animate-spin" : ""}`} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={specData.length === 0}>
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExportSpecTrend("excel")}>
                  Export to Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportSpecTrend("pdf")}>
                  Export to PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      >
        {specLoading ? (
          <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
            Loading chart...
          </div>
        ) : specData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
            No inward transactions in this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={specData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip content={<CUSTOM_TOOLTIP />} />
              <Bar dataKey="specCount" name="Specs inwarded" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Section>

      {/* ── Inward / Outward Value Trend (2c) ─────────────────────────── */}
      <Section
        title="Inward / Outward Value Trend"
        icon={TrendingUp}
        iconClass="text-emerald-500"
        actions={
          <>
            {valueSummary.totalInwardValue != null && (
              <div className="flex gap-3 text-xs mr-2">
                <span className="flex items-center gap-1 text-green-600">
                  <ArrowUpRight className="h-3 w-3" />
                  {formatCurrency(valueSummary.totalInwardValue)}
                </span>
                <span className="flex items-center gap-1 text-red-600">
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
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CUSTOM_TOOLTIP />} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="inward" name="Inward ₹" stroke="#10b981" fill="url(#inGrad)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="outward" name="Outward ₹" stroke="#ef4444" fill="url(#outGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Section>

      {/* ── Top 10 / Low 10 Selling Products (2d) ──────────────────────── */}
      <Section
        title={salesView === "top" ? "Top 10 Selling Products" : "Low 10 Selling Products"}
        icon={salesView === "top" ? ArrowUpRight : ArrowDownRight}
        iconClass={salesView === "top" ? "text-green-500" : "text-red-500"}
        actions={
          <>
            <div className="flex border rounded-md overflow-hidden text-xs">
              <button
                className={`px-2 py-1 ${salesView === "top" ? "bg-primary text-primary-foreground" : "bg-muted/40"}`}
                onClick={() => setSalesView("top")}
              >
                Top 10
              </button>
              <button
                className={`px-2 py-1 ${salesView === "low" ? "bg-primary text-primary-foreground" : "bg-muted/40"}`}
                onClick={() => setSalesView("low")}
              >
                Low 10
              </button>
            </div>
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
          </>
        }
      >
        {topLowLoading ? (
          <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : activeSalesList.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            No sales data for this period
          </div>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {activeSalesList.map((prod, idx) => {
              const maxUnits = activeSalesList[0]?.unitsSold || 1;
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
                        className={`h-full rounded-full ${salesView === "top" ? "bg-green-500" : "bg-red-400"}`}
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
      />
    </div>
  );
}
