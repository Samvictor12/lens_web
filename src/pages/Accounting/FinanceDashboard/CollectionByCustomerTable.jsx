import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function fmtMoney(n) {
  const amount = Number.isFinite(Number(n)) ? Number(n) : 0;
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

export default function CollectionByCustomerTable({ rows, loading }) {
  const list = Array.isArray(rows) ? rows : [];
  const totals = list.reduce(
    (acc, r) => ({
      target: acc.target + (Number(r.target) || 0),
      actual: acc.actual + (Number(r.actual) || 0),
      balance: acc.balance + (Number(r.balance) || 0),
    }),
    { target: 0, actual: 0, balance: 0 }
  );

  return (
    <Card className="shadow-none h-full">
      <CardHeader className="pb-1 pt-3 px-4">
        <CardTitle className="text-sm font-medium">Collection — Target vs Actual (current month)</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {loading ? (
          <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-xs">
                  <th className="p-2 text-left">Customer</th>
                  <th className="p-2 text-right">Target</th>
                  <th className="p-2 text-right">Actual</th>
                  <th className="p-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-muted-foreground text-xs">
                      No collection target or receipts this month
                    </td>
                  </tr>
                ) : (
                  list.map((r) => (
                    <tr key={r.customerId} className="border-b">
                      <td className="p-2">{r.customerName}</td>
                      <td className="p-2 text-right">{fmtMoney(r.target)}</td>
                      <td className="p-2 text-right">{fmtMoney(r.actual)}</td>
                      <td className="p-2 text-right font-medium">{fmtMoney(r.balance)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {list.length > 0 && (
                <tfoot>
                  <tr className="bg-muted font-semibold text-sm">
                    <td className="p-2">Total</td>
                    <td className="p-2 text-right">{fmtMoney(totals.target)}</td>
                    <td className="p-2 text-right">{fmtMoney(totals.actual)}</td>
                    <td className="p-2 text-right">{fmtMoney(totals.balance)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
