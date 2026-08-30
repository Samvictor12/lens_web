import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function fmtMoney(n) {
  const amount = Number.isFinite(Number(n)) ? Number(n) : 0;
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

function Line({ label, value, bold = false, accent = "" }) {
  return (
    <div className={`flex justify-between items-center py-1 text-sm ${bold ? "font-bold" : ""} ${accent}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default function EmbeddedPnLSnapshot({ snapshot, loading }) {
  const s = snapshot || {};

  return (
    <Card className="shadow-none h-full">
      <CardHeader className="pb-1 pt-3 px-4">
        <CardTitle className="text-sm font-medium">P&amp;L Snapshot (MTD)</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-1">
        {loading ? (
          <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <>
            <Line label="Income" value={fmtMoney(s.income)} />
            <Line label="Cost of Goods Sold" value={fmtMoney(s.costOfGoodsSold)} />
            <Line label="Gross Profit" value={fmtMoney(s.grossProfit)} bold accent="bg-blue-50 px-2 rounded" />
            <Line label="Operating Expenses" value={fmtMoney(s.operatingExpenses)} />
            <Line
              label={s.isProfit ? "Net Profit" : "Net Loss"}
              value={fmtMoney(s.netProfit)}
              bold
              accent={s.isProfit ? "bg-green-50 text-green-800 px-2 rounded" : "bg-red-50 text-red-800 px-2 rounded"}
            />
            <div className="border-t my-2 pt-2 space-y-1">
              <Line label="Inventory Value" value={fmtMoney(s.inventoryValue)} />
              <Line label="Total Assets" value={fmtMoney(s.totalAssets)} />
              <Line label="Liabilities + Capital" value={fmtMoney(s.totalLiabilitiesAndCapital)} bold />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
