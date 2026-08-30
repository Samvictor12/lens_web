import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function fmtMoney(n) {
  const amount = Number.isFinite(Number(n)) ? Number(n) : 0;
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

const AGING_ROWS = [
  { key: "0_30", label: "0–30 days" },
  { key: "31_60", label: "31–60 days" },
  { key: "61_90_plus", label: "61–90+" },
];

/**
 * Section 3 — Top Lens horizontal bar + credit aging buckets.
 */
export default function Customer360Charts({ topLens = [], aging, loading }) {
  const chartData = (topLens || []).slice(0, 5).map((t) => {
    const fullLabel = t.label || t.name || `Lens #${t.lensId}`;
    return {
      name: fullLabel.length > 36 ? `${fullLabel.slice(0, 34)}…` : fullLabel,
      fullName: fullLabel,
      count: t.orderCount,
    };
  });

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground">Analytics</h2>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-medium">Top 5 lens orders</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            {loading ? (
              <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
                Loading…
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
                No lens order history
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 28)}>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={200}
                    tick={{ fontSize: 9 }}
                  />
                  <Tooltip
                    formatter={(v) => [v, "Orders"]}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ""}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-medium">Credit analysis (aging)</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {loading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
            ) : (
              <div className="space-y-2">
                {AGING_ROWS.map((row) => {
                  const bucket = aging?.[row.key] || { count: 0, amount: 0 };
                  return (
                    <div
                      key={row.key}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div>
                        <div className="text-sm font-medium">{row.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {bucket.count} invoice(s)
                        </div>
                      </div>
                      <div className="text-base font-bold">{fmtMoney(bucket.amount)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
