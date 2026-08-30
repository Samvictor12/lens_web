import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function fmtMoney(n) {
  const amount = Number.isFinite(Number(n)) ? Number(n) : 0;
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function fmtPct(n) {
  if (!Number.isFinite(n)) return "0%";
  return `${n.toFixed(1)}%`;
}

export default function ExpenseBreakupChart({ expenseBreakup, loading }) {
  const rows = useMemo(() => {
    const items = expenseBreakup?.items || [];
    const total = Number(expenseBreakup?.total) || items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    let cumulative = 0;

    return items.map((item) => {
      const amount = Number(item.amount) || 0;
      const share = total > 0 ? (amount / total) * 100 : 0;
      cumulative += share;
      return {
        key: item.ledgerCode || item.ledgerName,
        ledgerName: item.ledgerName,
        category: item.category,
        amount,
        share,
        cumulative,
      };
    });
  }, [expenseBreakup]);

  return (
    <Card className="shadow-none h-full">
      <CardHeader className="pb-1 pt-3 px-4">
        <CardTitle className="text-sm font-medium">
          Expense Breakup (MTD)
          {expenseBreakup?.total != null && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {fmtMoney(expenseBreakup.total)}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-3">
        {loading ? (
          <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
            No expenses this month
          </div>
        ) : (
          <div className="overflow-x-auto max-h-56 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-background">
                <tr className="bg-muted/80 text-left">
                  <th className="p-2">Ledger</th>
                  <th className="p-2 text-right">Amount</th>
                  <th className="p-2 text-right">Share</th>
                  <th className="p-2 text-right">Cumulative</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="border-b hover:bg-muted/40">
                    <td className="p-2">
                      <div className="font-medium">{row.ledgerName}</div>
                      {row.category && (
                        <div className="text-[10px] text-muted-foreground capitalize">{row.category}</div>
                      )}
                    </td>
                    <td className="p-2 text-right font-medium whitespace-nowrap">{fmtMoney(row.amount)}</td>
                    <td className="p-2 text-right text-muted-foreground whitespace-nowrap">{fmtPct(row.share)}</td>
                    <td className="p-2 text-right whitespace-nowrap">
                      <span className="font-medium">{fmtPct(row.cumulative)}</span>
                      <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[hsl(var(--chart-3))]"
                          style={{ width: `${Math.min(row.cumulative, 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
