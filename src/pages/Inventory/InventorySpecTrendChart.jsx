import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, FileSpreadsheet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormSelect } from "@/components/ui/form-select";
import { getProductSpecTrend } from "@/services/inventory";
import { getLensTypesDropdown } from "@/services/saleOrder";
import {
  exportTableCsv,
  exportTablePdf,
  getPresetRange,
} from "./dashboardExportUtils";

export default function InventorySpecTrendChart() {
  const [preset, setPreset] = useState("7d");
  const [range, setRange] = useState(() => getPresetRange("7d"));
  const [lensTypeId, setLensTypeId] = useState("");

  useEffect(() => {
    if (preset !== "custom") {
      setRange(getPresetRange(preset));
    }
  }, [preset]);

  const { data: lensTypesRes } = useQuery({
    queryKey: ["lens-types-dropdown"],
    queryFn: getLensTypesDropdown,
  });

  const lensTypeOptions = useMemo(() => {
    const items = lensTypesRes?.data || lensTypesRes || [];
    return [
      { value: "", label: "All lens types" },
      ...items.map((t) => ({
        value: String(t.value ?? t.id),
        label: t.label ?? t.name,
      })),
    ];
  }, [lensTypesRes]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["inventory-spec-trend", range.from, range.to, lensTypeId],
    queryFn: () =>
      getProductSpecTrend({
        from: range.from,
        to: range.to,
        lensTypeId: lensTypeId || undefined,
      }),
    enabled: Boolean(range.from && range.to),
  });

  const chartData = data?.data || [];
  const totalSpecs = data?.summary?.totalSpecs ?? 0;

  const handleExportPdf = () => {
    exportTablePdf({
      title: "Product Spec Inward Trend",
      columns: ["Date", "Distinct Specs"],
      rows: chartData.map((row) => [row.date, row.count]),
      filename: `spec-trend-${range.from}-${range.to}.pdf`,
    });
  };

  const handleExportCsv = () => {
    exportTableCsv({
      columns: ["Date", "Distinct Specs"],
      rows: chartData.map((row) => [row.date, row.count]),
      filename: `spec-trend-${range.from}-${range.to}.csv`,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Product Spec Inward Trend</CardTitle>
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FormSelect
            label="Lens Type"
            value={lensTypeId ?? ""}
            onChange={setLensTypeId}
            options={lensTypeOptions}
          />
          {preset === "custom" && (
            <>
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
            </>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Daily distinct spec combinations inwarded
          {!isLoading && ` · ${totalSpecs} total in range`}
        </p>

        <div className="h-64">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Loading chart…
            </div>
          ) : isError ? (
            <div className="h-full flex items-center justify-center text-sm text-destructive">
              Failed to load spec trend
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              No inward activity in this range
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" name="Distinct specs" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
