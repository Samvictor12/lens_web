import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileSpreadsheet, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getTopSellingProducts } from "@/services/inventory";
import { exportTableCsv, exportTablePdf } from "./dashboardExportUtils";

function RankingList({ title, icon: Icon, data, emptyMessage, accentClass }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${accentClass}`} />
        <h4 className="text-sm font-semibold">{title}</h4>
      </div>
      {data.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">{emptyMessage}</p>
      ) : (
        <div className="space-y-2 max-h-56 overflow-y-auto">
          {data.map((row, idx) => (
            <div
              key={`${row.lens_id}-${idx}`}
              className="flex items-center justify-between p-2 bg-muted/40 rounded text-xs border"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-muted-foreground w-5">{idx + 1}</span>
                <span className="font-medium truncate">{row.lensName}</span>
              </div>
              <Badge variant="secondary" className="shrink-0">
                {row.unitsSold} sold
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TopSellingWidget() {
  const [days, setDays] = useState(30);

  const { data: topRes, isLoading: topLoading } = useQuery({
    queryKey: ["inventory-top-selling", days, "top"],
    queryFn: () => getTopSellingProducts({ direction: "top", limit: 10, days }),
  });

  const { data: lowRes, isLoading: lowLoading } = useQuery({
    queryKey: ["inventory-top-selling", days, "low"],
    queryFn: () => getTopSellingProducts({ direction: "low", limit: 10, days }),
  });

  const topData = topRes?.data || [];
  const lowData = lowRes?.data || [];
  const isLoading = topLoading || lowLoading;

  const handleExport = (format) => {
    const columns = ["Rank", "Product", "Units Sold", "List"];
    const topRows = topData.map((row, i) => [i + 1, row.lensName, row.unitsSold, "Top"]);
    const lowRows = lowData.map((row, i) => [i + 1, row.lensName, row.unitsSold, "Low"]);
    const rows = [...topRows, ...lowRows];
    const filename = `top-selling-${days}d`;

    if (format === "pdf") {
      exportTablePdf({
        title: `Top & Low Selling Products (${days} days)`,
        columns,
        rows,
        filename: `${filename}.pdf`,
      });
    } else {
      exportTableCsv({ columns, rows, filename: `${filename}.csv` });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Top & Low Selling Products</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={days === 30 ? "default" : "outline"}
              onClick={() => setDays(30)}
            >
              30 days
            </Button>
            <Button
              type="button"
              size="sm"
              variant={days === 90 ? "default" : "outline"}
              onClick={() => setDays(90)}
            >
              90 days
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => handleExport("pdf")}>
              <Download className="h-4 w-4 mr-1" />
              PDF
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => handleExport("csv")}>
              <FileSpreadsheet className="h-4 w-4 mr-1" />
              CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Loading rankings…</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RankingList
              title="Top 10"
              icon={TrendingUp}
              data={topData}
              emptyMessage="No outward sales in this period"
              accentClass="text-green-600"
            />
            <RankingList
              title="Low 10"
              icon={TrendingDown}
              data={lowData}
              emptyMessage="No products with sales in this period"
              accentClass="text-amber-600"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
