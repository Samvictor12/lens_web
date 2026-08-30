import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function fmtMoney(n) {
  const amount = Number.isFinite(Number(n)) ? Number(n) : 0;
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export default function FyTrendChart({ fyTrend = [], financialYear, loading }) {
  const chartData = (fyTrend || []).map((p) => ({
    name: p.monthLabel?.replace(/\s\d{4}$/, "") || p.month,
    income: Number(p.income) || 0,
    expenses: Number(p.expenses) || 0,
  }));

  return (
    <Card className="shadow-none h-full">
      <CardHeader className="pb-1 pt-3 px-4">
        <CardTitle className="text-sm font-medium">
          FY Income vs Expenses
          {financialYear?.label && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">{financialYear.label}</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-3">
        {loading ? (
          <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
        ) : chartData.length === 0 ? (
          <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">No FY data</div>
        ) : (
          <ResponsiveContainer width="100%" height={224}>
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => fmtMoney(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} iconType="line" />
              <Line
                type="monotone"
                dataKey="income"
                name="Income"
                stroke="#16a34a"
                strokeWidth={2}
                dot={{ r: 3, fill: "#16a34a", strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="expenses"
                name="Expenses"
                stroke="#dc2626"
                strokeWidth={2}
                dot={{ r: 3, fill: "#dc2626", strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
