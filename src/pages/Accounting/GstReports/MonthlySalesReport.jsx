import { useState, useEffect } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getMonthlySalesReport } from "@/services/gstReport";
import { fmt, firstDayOfMonth, todayInputDate, printReport } from "./gstReportUtils";

export default function MonthlySalesReport() {
  const { toast } = useToast();
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(todayInputDate());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getMonthlySalesReport({ from: from || undefined, to: to || undefined });
      setData(res.data);
    } catch {
      toast({ variant: "destructive", title: "Failed to load monthly sales report" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handlePrint = () => {
    if (!data) return;
    const rowsHtml = data.rows
      .map(
        (r) =>
          `<tr><td>${r.monthLabel}</td><td class="text-right">${r.invoiceCount}</td><td class="text-right">${fmt(r.taxableSales)}</td><td class="text-right">${fmt(r.gstAmount)}</td><td class="text-right">${fmt(r.totalSales)}</td></tr>`
      )
      .join("");
    printReport(
      "Monthly Sales Report",
      `<h1>Monthly Sales Report</h1><p>Period: ${from || "—"} to ${to || "—"}</p>
      <table><thead><tr><th>Month</th><th class="text-right">Invoices</th><th class="text-right">Taxable Sales</th><th class="text-right">GST</th><th class="text-right">Total Sales</th></tr></thead>
      <tbody>${rowsHtml}<tr style="font-weight:bold"><td>Total</td><td class="text-right">${data.totals.invoiceCount}</td><td class="text-right">${fmt(data.totals.taxableSales)}</td><td class="text-right">${fmt(data.totals.gstAmount)}</td><td class="text-right">${fmt(data.totals.totalSales)}</td></tr></tbody></table>`
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-end">
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input type="date" className="h-8 w-36 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input type="date" className="h-8 w-36 text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button size="sm" onClick={load} disabled={loading}>
          {loading ? "Loading..." : "Generate"}
        </Button>
        {data && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={handlePrint}>
            <Printer className="h-3.5 w-3.5" /> Print
          </Button>
        )}
      </div>

      {data && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted text-xs">
                <th className="p-2 text-left">Month</th>
                <th className="p-2 text-right">Invoices</th>
                <th className="p-2 text-right">Taxable Sales</th>
                <th className="p-2 text-right">GST</th>
                <th className="p-2 text-right">Total Sales</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-muted-foreground text-xs">
                    No invoices in this period
                  </td>
                </tr>
              ) : (
                data.rows.map((r) => (
                  <tr key={r.month} className="border-b hover:bg-muted/40">
                    <td className="p-2">{r.monthLabel}</td>
                    <td className="p-2 text-right">{r.invoiceCount}</td>
                    <td className="p-2 text-right">{fmt(r.taxableSales)}</td>
                    <td className="p-2 text-right">{fmt(r.gstAmount)}</td>
                    <td className="p-2 text-right font-medium">{fmt(r.totalSales)}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-muted font-bold text-sm">
                <td className="p-2">Total</td>
                <td className="p-2 text-right">{data.totals.invoiceCount}</td>
                <td className="p-2 text-right">{fmt(data.totals.taxableSales)}</td>
                <td className="p-2 text-right">{fmt(data.totals.gstAmount)}</td>
                <td className="p-2 text-right">{fmt(data.totals.totalSales)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
