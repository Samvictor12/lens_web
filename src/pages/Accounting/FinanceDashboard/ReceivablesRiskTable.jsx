import { useNavigate } from "react-router-dom";
import { ExternalLink, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CUSTOMER_360_PATH, invoiceDetailPath } from "@/constants/accountingPaths";

function fmtMoney(n) {
  const amount = Number.isFinite(Number(n)) ? Number(n) : 0;
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

export default function ReceivablesRiskTable({ rows = [], loading }) {
  const navigate = useNavigate();

  return (
    <Card className="shadow-none h-full">
      <CardHeader className="pb-1 pt-3 px-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          Receivables &gt;90 days
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-3">
        {loading ? (
          <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
            No invoices overdue by more than 90 days
          </div>
        ) : (
          <div className="overflow-x-auto max-h-56 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-background">
                <tr className="bg-muted/80 text-left">
                  <th className="p-2">Customer</th>
                  <th className="p-2">Invoice</th>
                  <th className="p-2">Due</th>
                  <th className="p-2 text-right">Days</th>
                  <th className="p-2 text-right">Balance</th>
                  <th className="p-2 w-8" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.invoiceId}-${r.invoiceNo}`} className="border-b hover:bg-muted/40">
                    <td className="p-2">
                      <button
                        type="button"
                        className="text-primary hover:underline text-left"
                        onClick={() => navigate(`${CUSTOMER_360_PATH}?customerId=${r.customerId}`)}
                      >
                        {r.customerName}
                      </button>
                    </td>
                    <td className="p-2 font-mono">{r.invoiceNo}</td>
                    <td className="p-2">{r.dueDate || "—"}</td>
                    <td className="p-2 text-right text-orange-600 font-medium">{r.daysPastDue}</td>
                    <td className="p-2 text-right font-medium">{fmtMoney(r.balance)}</td>
                    <td className="p-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => navigate(invoiceDetailPath(r.invoiceId))}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
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
