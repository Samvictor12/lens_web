import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, FileSpreadsheet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getStockValueReport } from "@/services/inventory";
import { formatCurrency } from "./Inventory.constants";
import {
  exportTableCsv,
  exportTablePdf,
  getPresetRange,
} from "./dashboardExportUtils";

const formatAxisValue = (value) => {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`;
  return `₹${value}`;
};

export default function InventoryValueTrendChart() {
  const [preset, setPreset] = useState("30d");
  const [range, setRange] = useState(() => getPresetRange("30d"));

  useEffect(() => {
    if (preset !== "custom") {
      setRange(getPresetRange(preset));
    }
  }, [preset]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["inventory-value-trend", range.from, range.to],
    queryFn: () =>
      getStockValueReport({
        startDate: range.from,
        endDate: range.to,
        groupBy: "date",
      }),
    enabled: Boolean(range.from && range.to),
  });

  const chartData = data?.data || [];
  const summary = data?.summary || {};

  const handleExportPdf = () => {
    exportTablePdf({
      title: "Inward vs Outward Value Trend",
      columns: ["Date", "Inward Value", "Outward Value"],
      rows: chartData.map((row) => [
        row.date,
        row.inwardValue,
        row.outwardValue,
      ]),
      filename: `value-trend-${range.from}-${range.to}.pdf`,
    });
  };

  const handleExportCsv = () => {
    exportTableCsv({
      columns: ["Date", "Inward Value", "Outward Value"],
      rows: chartData.map((row) => [
        row.date,
        row.inwardValue,
        row.outwardValue,
      ]),
      filename: `value-trend-${range.from}-${range.to}.csv`,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Inward vs Outward Value</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={preset === "7d" ? "default" : "outline"}
              onClick={() => setPreset("7d")}
            >
              7 days
            </Button>
            <Button
              type="button"
              size="sm"
              variant={preset === "30d" ? "default" : "outline"}
              onClick={() => setPreset("30d")}
            >
              30 days
            </Button>
            <Button
              type="button"
              size="sm"
              variant={preset === "custom" ? "default" : "outline"}
              onClick={() => setPreset("custom")}
            >
              Custom
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={handleExportPdf}>
              <Download className="h-4 w-4 mr-1" />
              PDF
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={handleExportCsv}>
              <FileSpreadsheet className="h-4 w-4 mr-1" />
              CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {preset === "custom" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
            <div>
              <label className="text-xs font-medium text-muted-foreground">From</label>
              <Input
                type="date"
                value={range.from}
                onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">To</label>
              <Input
                type="date"
                value={range.to}
                onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>
        )}

        {!isLoading && chartData.length > 0 && (
          <div className="grid grid-cols-2 gap-3 max-w-lg">
            <div className="rounded-md border p-2">
              <p className="text-[10px] text-muted-foreground">Total inward</p>
              <p className="text-sm font-semibold text-green-600">
                {formatCurrency(summary.totalInwardValue || 0)}
              </p>
            </div>
            <div className="rounded-md border p-2">
              <p className="text-[10px] text-muted-foreground">Total outward</p>
              <p className="text-sm font-semibold text-red-600">
                {formatCurrency(summary.totalOutwardValue || 0)}
              </p>
            </div>
          </div>
        )}

        <div className="h-64">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Loading chart…
            </div>
          ) : isError ? (
            <div className="h-full flex items-center justify-center text-sm text-destructive">
              Failed to load value trend
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              No transactions in this range
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={formatAxisValue} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="inwardValue"
                  name="Inward"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="outwardValue"
                  name="Outward"
                  stroke="#dc2626"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
